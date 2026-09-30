"""Deterministic PDF writing for the synthetic companions: reportlab in invariant mode, no zlib.

Byte-identical output on every platform: reportlab's invariant mode fixes the dates and the
document id; page compression is off, because deflate output can differ between zlib builds
(macOS, Debian, zlib-ng); the only fonts are the standard Type 1 fonts, which are not embedded.
Scanned pages (images with no text layer) are 1-bit images encoded with RunLengthDecode and
ASCIIHexDecode by this module, not by reportlab, whose image path always uses zlib.

The standard fonts use WinAnsiEncoding, which has no ă, ș or ț, so the PDF text is written
without Romanian diacritics, as many Romanian technical documents are. The IFC and XLSX
fixtures carry both diacritic forms.
"""

from __future__ import annotations

import io
import os
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase.pdfdoc import PDFImageXObject
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas

from fixturelib.common import AUTHOR, ORGANISATION_RO, TEST_MARK_RO

# reportlab reads SOURCE_DATE_EPOCH before its invariant date; pin it, so the caller's environment
# (the fixture-manifest check sets 0) never changes the bytes. 2026-01-15T09:00:00Z.
PDF_DATE_EPOCH = "1768467600"

FONT = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
MARGIN = 42


def run_length_encode(data: bytes) -> bytes:
    """PDF RunLengthDecode encoding (ISO 32000-1, 7.4.5), ending with the EOD byte 128."""
    out = bytearray()
    index = 0
    length = len(data)
    while index < length:
        run = 1
        while index + run < length and run < 128 and data[index + run] == data[index]:
            run += 1
        if run > 1:
            out.append(257 - run)
            out.append(data[index])
            index += run
            continue
        start = index
        index += 1
        while index < length and index - start < 128:
            if index + 1 < length and data[index] == data[index + 1]:
                break
            index += 1
        out.append(index - start - 1)
        out.extend(data[start:index])
    out.append(128)
    return bytes(out)


def ascii_hex(data: bytes) -> str:
    text = data.hex().upper()
    lines = [text[i : i + 128] for i in range(0, len(text), 128)]
    return "\n".join(lines) + ">"


@dataclass
class PageRecord:
    """What the ground truth says about one page."""

    number: int
    text_layer: bool
    values: list[dict[str, object]] = field(default_factory=list)


class Document:
    """A reportlab canvas with the fixtures' page frame, title block and tables."""

    def __init__(
        self, *, title: str, subject: str, code: str, pagesize: tuple[float, float] = A4
    ) -> None:
        self.buffer = io.BytesIO()
        os.environ["SOURCE_DATE_EPOCH"] = PDF_DATE_EPOCH
        self.canvas = Canvas(self.buffer, pagesize=pagesize, invariant=1, pageCompression=0)
        self.canvas.setTitle(title)
        self.canvas.setAuthor(ORGANISATION_RO)
        self.canvas.setSubject(subject)
        self.canvas.setCreator(AUTHOR)
        self.canvas.setKeywords("TEST FIXTURE, synthetic, fictitious building")
        self.width, self.height = pagesize
        self.title = title
        self.code = code
        self.pages: list[PageRecord] = []
        self._scan_count = 0

    # -- page frame --------------------------------------------------------------------------

    def start_page(self, number: int, total: int) -> PageRecord:
        c = self.canvas
        c.setFont(FONT_BOLD, 8)
        c.drawString(MARGIN, self.height - 24, TEST_MARK_RO)
        c.setFont(FONT, 7)
        footer = self.footer(number, total)
        c.drawString(MARGIN, 20, footer)
        record = PageRecord(number=number, text_layer=True)
        self.pages.append(record)
        return record

    def footer(self, number: int, total: int) -> str:
        page = f"Pagina {number} din {total}"
        return f"Demo Hotel Bucharest (fictiv) - {self.title} - {self.code} - {page}"

    def end_page(self) -> None:
        self.canvas.showPage()

    def text(self, x: float, y: float, value: str, *, size: float = 10, bold: bool = False) -> None:
        self.canvas.setFont(FONT_BOLD if bold else FONT, size)
        self.canvas.drawString(x, y, value)

    def paragraph(
        self, x: float, y: float, text: str, width: float, *, size: float = 10, leading: float = 13
    ) -> float:
        """Draws wrapped text; returns the y below it."""
        words = text.split()
        line: list[str] = []
        for word in words:
            candidate = " ".join([*line, word])
            if line and stringWidth(candidate, FONT, size) > width:
                self.text(x, y, " ".join(line), size=size)
                y -= leading
                line = [word]
            else:
                line.append(word)
        if line:
            self.text(x, y, " ".join(line), size=size)
            y -= leading
        return y

    def title_block(
        self, x: float, y: float, rows: Sequence[tuple[str, str]], *, width: float = 250
    ) -> None:
        """The cartus: a boxed two-column title block, top-left corner at (x, y)."""
        c = self.canvas
        row_height = 14
        c.setLineWidth(0.8)
        c.rect(x, y - row_height * len(rows), width, row_height * len(rows))
        for index, (label, value) in enumerate(rows):
            top = y - row_height * index
            if index:
                c.line(x, top, x + width, top)
            self.text(x + 4, top - 10, label, size=7)
            self.text(x + 78, top - 10, value, size=8, bold=True)
        c.line(x + 74, y, x + 74, y - row_height * len(rows))

    def table(
        self,
        x: float,
        y: float,
        widths: Sequence[float],
        rows: Iterable[Sequence[str]],
        *,
        size: float = 8,
        header: bool = True,
    ) -> float:
        """A ruled table, one line per row; returns the y below it."""
        c = self.canvas
        row_height = size + 6
        total = sum(widths)
        c.setLineWidth(0.5)
        for index, row in enumerate(rows):
            top = y - row_height * index
            c.line(x, top, x + total, top)
            offset = x
            for width, cell in zip(widths, row, strict=True):
                self.text(offset + 3, top - size - 1, cell, size=size, bold=header and index == 0)
                offset += width
            y_bottom = top - row_height
        c.line(x, y_bottom, x + total, y_bottom)
        offset = x
        for width in [0, *widths]:
            offset += width
            c.line(offset, y, offset, y_bottom)
        return y_bottom - 10

    # -- scanned pages: an image, no text layer ----------------------------------------------

    def scanned_page(self, number: int, total: int, lines: Sequence[str]) -> PageRecord:
        """A page that holds only an image: people can read it, a text layer does not exist."""
        dpi = 100
        width_px = round(self.width / 72 * dpi)
        height_px = round(self.height / 72 * dpi)
        image = Image.new("L", (width_px, height_px), 255)
        draw = ImageDraw.Draw(image)
        font = ImageFont.load_default(size=20)
        small = ImageFont.load_default(size=14)
        draw.text((60, 30), TEST_MARK_RO, fill=0, font=small)
        y = 120
        for line in lines:
            draw.text((80, y), line, fill=0, font=font)
            y += 40
        draw.rectangle((60, 100, width_px - 60, y + 20), outline=0, width=2)
        footer = self.footer(number, total)
        draw.text((60, height_px - 50), footer, fill=0, font=small)
        bitmap = image.point(lambda value: 255 if value >= 128 else 0).convert("1")
        raw = bitmap.tobytes()
        self._scan_count += 1
        name = f"scan{self._scan_count}"
        xobject = PDFImageXObject(name)
        xobject.width = width_px
        xobject.height = height_px
        xobject.bitsPerComponent = 1
        xobject.colorSpace = "DeviceGray"
        xobject.streamContent = ascii_hex(run_length_encode(raw))
        xobject._filters = ("ASCIIHexDecode", "RunLengthDecode")
        xobject.mask = None
        c = self.canvas
        registered = c._doc.getXObjectName(name)
        c._setXObjects(xobject)
        c._doc.Reference(xobject, registered)
        c._doc.addForm(name, xobject)
        c._currentPageHasImages = 1
        c.saveState()
        c.scale(self.width, self.height)
        c._code.append(f"/{registered} Do")
        c.restoreState()
        c._formsinuse.append(name)
        record = PageRecord(number=number, text_layer=False)
        self.pages.append(record)
        c.showPage()
        return record

    def bytes(self) -> bytes:
        self.canvas.save()
        return self.buffer.getvalue()


LANDSCAPE_A4 = landscape(A4)
