"""PDF through pypdfium2: the native text layer, page by page, with no OCR (prompt 3 5.2).

Each line of a page's text layer becomes a text block (a line is split where part of it counts
as hidden and part does not), with an anchor id, its raw text, its box, the box of every
character the text layer places (by code point range), and the reasons it counts as hidden
(rule 14: invisible render mode, a fill that matches what is behind it, tiny text, text outside
the page), judged per text object. A hidden block is reported as a ``hidden_text`` finding and
is never part of the text evidence is checked against. A block whose text addresses the reader
is reported as an ``embedded_instruction`` finding (rule 14). The text is kept raw: the
extractor reads no number out of it (prompt 3 section 6).

Coverage is recorded by code (rule 12): a page with no text layer is not read (``no_text_layer``;
with no OCR, G12-3 is built from such pages), pages past the page limit or the time limit are not
read, with that reason, and a page PDFium cannot load is not read (``render_error``). A PDF with no
text layer on any page is stored as a scan ("Not analysed: PDF scan stored, not analysed").

Not detected, and listed for the engineer in ADR 0024: text hidden by a clipping path, and text on
an optional-content layer that is switched off (PDFium exposes neither to this reader).
"""

from __future__ import annotations

import ctypes
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import pypdfium2 as pdfium
import pypdfium2.raw as raw

from . import instructions

__all__ = ["BlockRead", "CharBoxRead", "PageRead", "PdfFinding", "PdfReading", "read_pdf"]

type Box = tuple[float, float, float, float]

# Text whose characters stand less than this tall (points, the loose character box: ascent to
# descent) counts as tiny text (rule 14, "white or tiny text"). A default of this build, listed
# for the approver in ADR 0024.
TINY_TEXT_POINTS = 2.0
# Two colours match when each channel differs by at most this much (of 255).
_COLOUR_TOLERANCE = 8
_WHITE = (255, 255, 255)
_REASON_ORDER = (
    "invisible_render_mode",
    "fill_matches_background",
    "tiny_text",
    "outside_page",
    "hidden_layer",
    "clipped",
)
_FILL_MODES = {0, 2, 4, 6}
_STROKE_MODES = {1, 5}
_INVISIBLE_MODES = {3, 7}


@dataclass(frozen=True, slots=True)
class CharBoxRead:
    start: int
    end: int
    box: Box


@dataclass(frozen=True, slots=True)
class BlockRead:
    anchor_id: str
    text: str
    bbox: Box
    char_boxes: tuple[CharBoxRead, ...]
    hidden: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class PageRead:
    page: int
    media_box: Box
    rotation: int
    blocks: tuple[BlockRead, ...]


@dataclass(frozen=True, slots=True)
class PdfFinding:
    kind: str
    code: str
    page: int
    anchor_id: str | None
    bbox: Box | None


@dataclass(slots=True)
class PdfReading:
    """What was read: pages, the pages not read with the reason, the status and the findings.

    ``analysis`` is ("analysed", None, None), ("partly_analysed", read, total),
    ("stored_only", None, None) for a PDF with no text layer, or ("failed", reason, None).
    """

    page_count: int = 0
    pages: list[PageRead] = field(default_factory=list)
    unread: list[tuple[int, int, str]] = field(default_factory=list)
    analysis: tuple[str, int | str | None, int | None] = ("failed", "unreadable_file", None)
    findings: list[PdfFinding] = field(default_factory=list)
    pdfium_version: str = str(pdfium.PDFIUM_INFO)
    pypdfium2_version: str = str(pdfium.PYPDFIUM_INFO)


def _address(pointer: object) -> int | None:
    return ctypes.cast(pointer, ctypes.c_void_p).value


def _round(box: Box) -> Box:
    left, bottom, right, top = box
    return (
        round(min(left, right), 2),
        round(min(bottom, top), 2),
        round(max(left, right), 2),
        round(max(bottom, top), 2),
    )


def _bounds(obj: object) -> Box | None:
    left, bottom, right, top = (ctypes.c_float() for _ in range(4))
    ok = raw.FPDFPageObj_GetBounds(
        obj, ctypes.byref(left), ctypes.byref(bottom), ctypes.byref(right), ctypes.byref(top)
    )
    if not ok:
        return None
    return (left.value, bottom.value, right.value, top.value)


def _colour(getter: Callable[..., int], obj: object) -> tuple[tuple[int, int, int], int] | None:
    red, green, blue, alpha = (ctypes.c_uint() for _ in range(4))
    if not getter(
        obj, ctypes.byref(red), ctypes.byref(green), ctypes.byref(blue), ctypes.byref(alpha)
    ):
        return None
    return (red.value, green.value, blue.value), alpha.value


def _near(first: tuple[int, int, int], second: tuple[int, int, int]) -> bool:
    return all(abs(a - b) <= _COLOUR_TOLERANCE for a, b in zip(first, second, strict=True))


def _covers(box: Box, point: tuple[float, float]) -> bool:
    left, bottom, right, top = _round(box)
    return left <= point[0] <= right and bottom <= point[1] <= top


def _overlaps(first: Box, second: Box) -> bool:
    a = _round(first)
    b = _round(second)
    return a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]


@dataclass(slots=True)
class _Backdrop:
    """The page's top-level objects that can sit behind text, in paint order."""

    items: list[tuple[int, Box, tuple[int, int, int] | None]]
    index_of: dict[int, int]

    def behind(self, obj_address: int | None, bbox: Box) -> tuple[int, int, int] | None:
        """The colour behind a text object: the topmost filled path under its centre that is
        painted before it, else the white page; None when an image or form is there instead."""
        centre = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
        limit = self.index_of.get(obj_address) if obj_address is not None else None
        colour: tuple[int, int, int] | None = _WHITE
        for index, box, fill in self.items:
            if limit is not None and index >= limit:
                break
            if _covers(box, centre):
                colour = fill
        return colour


def _backdrop(page: pdfium.PdfPage) -> _Backdrop:
    items: list[tuple[int, Box, tuple[int, int, int] | None]] = []
    index_of: dict[int, int] = {}
    for index in range(raw.FPDFPage_CountObjects(page.raw)):
        obj = raw.FPDFPage_GetObject(page.raw, index)
        address = _address(obj)
        if address is not None:
            index_of[address] = index
        kind = raw.FPDFPageObj_GetType(obj)
        box = _bounds(obj)
        if box is None:
            continue
        if kind == raw.FPDF_PAGEOBJ_PATH:
            fill_mode, stroke = ctypes.c_int(), ctypes.c_int()
            if not raw.FPDFPath_GetDrawMode(obj, ctypes.byref(fill_mode), ctypes.byref(stroke)):
                continue
            if fill_mode.value == raw.FPDF_FILLMODE_NONE:
                continue
            colour = _colour(raw.FPDFPageObj_GetFillColor, obj)
            if colour is not None and colour[1] > 0:
                items.append((index, box, colour[0]))
        elif kind in (raw.FPDF_PAGEOBJ_IMAGE, raw.FPDF_PAGEOBJ_FORM, raw.FPDF_PAGEOBJ_SHADING):
            items.append((index, box, None))
    return _Backdrop(items, index_of)


@dataclass(frozen=True, slots=True)
class _Char:
    text: str
    box: Box | None
    key: int | None
    obj: object | None
    generated: bool


def _chars(textpage: pdfium.PdfTextPage) -> list[_Char]:
    """The text layer's characters in order, each with its loose box and its text object;
    characters PDFium inserts (spaces, line breaks) are marked and have no box."""
    handle = textpage.raw
    count = raw.FPDFText_CountChars(handle)
    chars: list[_Char] = []
    rect = raw.FS_RECTF()
    high: int | None = None
    for index in range(count):
        code = raw.FPDFText_GetUnicode(handle, index)
        if 0xD800 <= code < 0xDC00:
            high = code
            continue
        if 0xDC00 <= code < 0xE000:
            if high is None:
                continue
            code = 0x10000 + ((high - 0xD800) << 10) + (code - 0xDC00)
        high = None
        obj = raw.FPDFText_GetTextObject(handle, index)
        key = _address(obj)
        generated = raw.FPDFText_IsGenerated(handle, index) == 1 or key is None
        box: Box | None = None
        if not generated and raw.FPDFText_GetLooseCharBox(handle, index, ctypes.byref(rect)):
            box = (rect.left, rect.bottom, rect.right, rect.top)
        chars.append(
            _Char(chr(code), box, None if generated else key, None if generated else obj, generated)
        )
    return chars


def _object_hidden(
    obj: object, key: int, heights: list[float], crop: Box, backdrop: _Backdrop
) -> tuple[str, ...]:
    """Why one text object's text counts as hidden (rule 14), or nothing."""
    reasons: set[str] = set()
    bounds = _bounds(obj)
    mode = raw.FPDFTextObj_GetTextRenderMode(obj)
    if mode in _INVISIBLE_MODES:
        reasons.add("invisible_render_mode")
    getter = (
        raw.FPDFPageObj_GetStrokeColor if mode in _STROKE_MODES else raw.FPDFPageObj_GetFillColor
    )
    colour = _colour(getter, obj) if mode in _FILL_MODES | _STROKE_MODES else None
    if colour is not None and bounds is not None:
        rgb, alpha = colour
        behind = backdrop.behind(key, bounds)
        if alpha == 0 or (behind is not None and _near(rgb, behind)):
            reasons.add("fill_matches_background")
    if heights and max(heights) < TINY_TEXT_POINTS:
        reasons.add("tiny_text")
    if bounds is not None and not _overlaps(bounds, crop):
        reasons.add("outside_page")
    return tuple(reason for reason in _REASON_ORDER if reason in reasons)


@dataclass(slots=True)
class _Block:
    hidden: tuple[str, ...]
    chars: list[tuple[str, Box | None]]


def _segments(chars: list[_Char], crop: Box, backdrop: _Backdrop) -> list[_Block]:
    """Blocks: runs of the text layer between its line breaks, split where the hidden status
    changes. A document that places each glyph as its own object still reads as lines, so an
    excerpt is found in the text; a hidden run on a visible line is its own block."""
    heights: dict[int, list[float]] = {}
    objects: dict[int, object] = {}
    for char in chars:
        if char.key is not None:
            objects[char.key] = char.obj
            if char.box is not None:
                heights.setdefault(char.key, []).append(char.box[3] - char.box[1])
    reasons = {
        key: _object_hidden(obj, key, heights.get(key, []), crop, backdrop)
        for key, obj in objects.items()
    }
    blocks: list[_Block] = []
    current: _Block | None = None
    inserted: list[str] = []
    for char in chars:
        if char.generated:
            if char.text in "\r\n":
                current, inserted = None, []
            elif current is not None:
                inserted.append(char.text)
            continue
        hidden = reasons[char.key] if char.key is not None else ()
        if current is None or current.hidden != hidden:
            current = _Block(hidden, [])
            blocks.append(current)
        else:
            current.chars.extend((text, None) for text in inserted)
        inserted = []
        current.chars.append((char.text, char.box))
    return blocks


def _read_page(reading: PdfReading, document: pdfium.PdfDocument, number: int) -> bool:
    """Read one page into ``reading``; False when it has no text layer to read."""
    page = document[number - 1]
    try:
        textpage = page.get_textpage()
        try:
            chars = _chars(textpage)
            if not any(char.text.strip() for char in chars if not char.generated):
                return False
            crop = tuple(page.get_cropbox())
            segments = _segments(chars, crop, _backdrop(page))  # type: ignore[arg-type]
        finally:
            textpage.close()
        blocks: list[BlockRead] = []
        for segment in segments:
            text = "".join(ch for ch, _ in segment.chars)
            placed = [box for _, box in segment.chars if box is not None]
            if not text.strip() or not placed:
                continue
            bounds = (
                min(b[0] for b in placed),
                min(b[1] for b in placed),
                max(b[2] for b in placed),
                max(b[3] for b in placed),
            )
            anchor = f"p{number}-b{len(blocks)}"
            char_boxes = tuple(
                CharBoxRead(offset, offset + 1, _round(box))
                for offset, (_, box) in enumerate(segment.chars)
                if box is not None
            )
            block = BlockRead(anchor, text, _round(bounds), char_boxes, segment.hidden)
            blocks.append(block)
            if segment.hidden:
                code = f"hidden_text.{segment.hidden[0]}"
                reading.findings.append(PdfFinding("hidden_text", code, number, anchor, block.bbox))
            instruction = instructions.detect(text)
            if instruction is not None:
                reading.findings.append(
                    PdfFinding("embedded_instruction", instruction, number, anchor, block.bbox)
                )
        media = _round(tuple(page.get_mediabox()))  # type: ignore[arg-type]
        reading.pages.append(PageRead(number, media, page.get_rotation(), tuple(blocks)))
        return True
    finally:
        page.close()


def _add_unread(reading: PdfReading, number: int, reason: str) -> None:
    if reading.unread and reading.unread[-1][1] == number - 1 and reading.unread[-1][2] == reason:
        first, _, _ = reading.unread[-1]
        reading.unread[-1] = (first, number, reason)
    else:
        reading.unread.append((number, number, reason))


def read_pdf(
    path: Path,
    *,
    max_pages: int,
    deadline: float | None = None,
    clock: Callable[[], float] = time.monotonic,
) -> PdfReading:
    """Read a PDF's text layer, within the page limit and the time limit."""
    reading = PdfReading()
    try:
        document = pdfium.PdfDocument(str(path))
    except pdfium.PdfiumError:
        encrypted = raw.FPDF_GetLastError() == raw.FPDF_ERR_PASSWORD
        reading.analysis = ("failed", "encrypted" if encrypted else "unreadable_file", None)
        return reading
    try:
        reading.page_count = len(document)
        if reading.page_count == 0:
            return reading
        read = 0
        for number in range(1, reading.page_count + 1):
            if number > max_pages:
                _add_unread(reading, number, "page_limit")
                continue
            if deadline is not None and clock() > deadline:
                _add_unread(reading, number, "time_limit")
                continue
            try:
                had_text = _read_page(reading, document, number)
            except pdfium.PdfiumError:
                _add_unread(reading, number, "render_error")
                continue
            if had_text:
                read += 1
            else:
                _add_unread(reading, number, "no_text_layer")
    finally:
        document.close()
    if read == 0:
        reasons = {reason for _, _, reason in reading.unread}
        if reasons == {"no_text_layer"}:
            reading.analysis = ("stored_only", None, None)
        elif "time_limit" in reasons:
            reading.analysis = ("failed", "time_limit", None)
        else:
            reading.analysis = ("failed", "unreadable_file", None)
    elif read == reading.page_count:
        reading.analysis = ("analysed", None, None)
    else:
        reading.analysis = ("partly_analysed", read, reading.page_count)
    return reading
