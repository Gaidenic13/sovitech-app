"""XLSX: each sheet and its cells, with the cached value exactly as the file stores it.

A cell's ``raw`` is the text of its value in the sheet XML: a number cell's "800" or
"93.59999999999999", a shared or inline string's text, an error's "#DIV/0!". It is never a number
the extractor computed or reformatted (the contract's XlsxCell; prompt 3 section 6). openpyxl's
reader turns number cells into Python floats, which loses the text as stored, and loads whole
workbooks into memory; so the parts are read here with lxml, streaming, and openpyxl supplies the
table of built-in number formats and the date-format test (ADR 0024).

The number format is the format code as written (a custom code, or the built-in code its id
stands for). A formula is kept as written, never evaluated. Hidden cells are flagged (rule 14:
hidden and very hidden sheets, hidden rows and columns, a font colour that matches the fill) and
reported as ``hidden_text`` findings; string cells that address the reader are reported as
``embedded_instruction`` findings. Coverage is recorded by code (rule 12): a chart sheet, a
dialog or macro sheet, or a sheet over the cell limit is listed as not read, with the reason, and
none of its cells is emitted.

XML is parsed with entity resolution, DTD loading and network access off; a part that declares a
DOCTYPE is refused (no OOXML part has one).
"""

from __future__ import annotations

import posixpath
import zipfile
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import IO

from lxml import etree
from openpyxl.styles.numbers import BUILTIN_FORMATS, is_date_format
from openpyxl.utils.cell import column_index_from_string, coordinate_from_string

from . import instructions

__all__ = ["CellRead", "SheetRead", "XlsxFinding", "XlsxReading", "read_xlsx"]

_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
_PKG_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
_SHEET_TYPES = {
    "worksheet": None,
    "chartsheet": "chart_sheet",
    "dialogsheet": "unsupported_sheet",
    "macrosheet": "unsupported_sheet",
    "xlMacrosheet": "unsupported_sheet",
}
_VISIBILITY = {"visible": "visible", "hidden": "hidden", "veryHidden": "very_hidden"}
_BUILTIN = {str(key): value for key, value in BUILTIN_FORMATS.items()}
_VALUE_TYPES = {
    "n": "number",
    "s": "shared_string",
    "inlineStr": "inline_string",
    "str": "formula_string",
    "b": "boolean",
    "e": "error",
    "d": "date",
}
_HIDDEN_ORDER = (
    "hidden_sheet",
    "very_hidden_sheet",
    "hidden_row",
    "hidden_column",
    "font_matches_fill",
)
_MAX_STRING = 32767
_MAX_FORMULA = 8191


class _Unreadable(Exception):
    """A workbook part that cannot be read."""


@dataclass(frozen=True, slots=True)
class CellRead:
    ref: str
    value_type: str
    raw: str
    number_format: str
    hidden: tuple[str, ...]
    formula: str | None = None


@dataclass(slots=True)
class SheetRead:
    name: str
    visibility: str
    cells: list[CellRead] = field(default_factory=list)
    merged_ranges: list[str] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class XlsxFinding:
    kind: str
    code: str
    sheet: str
    cell: str | None


@dataclass(slots=True)
class XlsxReading:
    sheets: list[SheetRead] = field(default_factory=list)
    coverage: list[tuple[str, str, str | None]] = field(default_factory=list)
    findings: list[XlsxFinding] = field(default_factory=list)
    failed: str | None = None


def _parser() -> etree.XMLParser:
    return etree.XMLParser(
        resolve_entities=False,
        load_dtd=False,
        no_network=True,
        huge_tree=False,
        remove_comments=True,
    )


def _open(archive: zipfile.ZipFile, name: str) -> IO[bytes]:
    try:
        head = archive.open(name).read(4096)
    except KeyError as error:
        raise _Unreadable from error
    if b"<!DOCTYPE" in head or b"<!ENTITY" in head:
        raise _Unreadable
    return archive.open(name)


def _tree(archive: zipfile.ZipFile, name: str) -> etree._Element:
    try:
        with _open(archive, name) as stream:
            return etree.parse(stream, _parser()).getroot()
    except etree.XMLSyntaxError as error:
        raise _Unreadable from error


def _optional_tree(archive: zipfile.ZipFile, name: str) -> etree._Element | None:
    if name not in archive.namelist():
        return None
    return _tree(archive, name)


def _texts(element: etree._Element) -> str:
    """The text of a string item: its <t>, or its runs' <t>, never phonetic runs."""
    direct = element.find(f"{_MAIN}t")
    if direct is not None:
        return direct.text or ""
    return "".join(run.findtext(f"{_MAIN}t") or "" for run in element.iterfind(f"{_MAIN}r"))


def _colour(element: etree._Element | None) -> tuple[str, str] | None:
    if element is None:
        return None
    for key in ("rgb", "theme", "indexed"):
        value = element.get(key)
        if value is not None:
            if key == "rgb":
                return ("rgb", value.upper()[-6:])
            return (key, value)
    return None


type _Colour = tuple[str, str] | None
type _Xf = tuple[str | None, str | None, str | None]


@dataclass(slots=True)
class _Styles:
    """The workbook's number formats, font and fill colours, and cell formats, by index.

    A cell with no style uses the first cell format; a format with no font or fill uses the
    first one (SpreadsheetML's defaults), so no default index is written here as a number.
    """

    formats: dict[str, str]
    fonts: list[_Colour]
    fills: list[_Colour]
    cell_xfs: list[_Xf]
    _fonts_by_id: dict[str, _Colour] = field(default_factory=dict)
    _fills_by_id: dict[str, _Colour] = field(default_factory=dict)
    _xfs_by_id: dict[str, _Xf] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self._fonts_by_id = {str(position): value for position, value in enumerate(self.fonts)}
        self._fills_by_id = {str(position): value for position, value in enumerate(self.fills)}
        self._xfs_by_id = {str(position): value for position, value in enumerate(self.cell_xfs)}

    def _xf(self, style: str | None) -> _Xf | None:
        if style is None:
            return self.cell_xfs[0] if self.cell_xfs else None
        return self._xfs_by_id.get(style)

    def number_format(self, style: str | None) -> str:
        xf = self._xf(style)
        format_id = xf[0] if xf is not None else None
        if format_id is None:
            return "General"
        return self.formats.get(format_id) or _BUILTIN.get(format_id) or "General"

    def font_matches_fill(self, style: str | None) -> bool:
        xf = self._xf(style)
        if xf is None:
            return False
        font = self._fonts_by_id.get(xf[1]) if xf[1] is not None else self._first(self.fonts)
        fill = self._fills_by_id.get(xf[2]) if xf[2] is not None else self._first(self.fills)
        if font is None:
            return False
        if fill is None:
            return font == ("rgb", "FFFFFF")
        return font == fill

    @staticmethod
    def _first(items: list[_Colour]) -> _Colour:
        return items[0] if items else None


def _styles(archive: zipfile.ZipFile) -> _Styles:
    root = _optional_tree(archive, "xl/styles.xml")
    if root is None:
        return _Styles({}, [], [], [])
    formats = {
        fmt.get("numFmtId", ""): fmt.get("formatCode", "")
        for fmt in root.iterfind(f"{_MAIN}numFmts/{_MAIN}numFmt")
    }
    fonts = [
        _colour(font.find(f"{_MAIN}color")) for font in root.iterfind(f"{_MAIN}fonts/{_MAIN}font")
    ]
    fills: list[_Colour] = []
    for fill in root.iterfind(f"{_MAIN}fills/{_MAIN}fill"):
        pattern = fill.find(f"{_MAIN}patternFill")
        solid = pattern is not None and pattern.get("patternType") == "solid"
        fills.append(
            _colour(pattern.find(f"{_MAIN}fgColor")) if solid and pattern is not None else None
        )
    cell_xfs = [
        (xf.get("numFmtId"), xf.get("fontId"), xf.get("fillId"))
        for xf in root.iterfind(f"{_MAIN}cellXfs/{_MAIN}xf")
    ]
    return _Styles(formats, fonts, fills, cell_xfs)


def _shared_strings(archive: zipfile.ZipFile) -> dict[str, str]:
    root = _optional_tree(archive, "xl/sharedStrings.xml")
    if root is None:
        return {}
    return {
        str(position): _texts(item) for position, item in enumerate(root.iterfind(f"{_MAIN}si"))
    }


def _sheet_parts(archive: zipfile.ZipFile) -> list[tuple[str, str, str | None, str | None]]:
    """Each sheet: its name, its state, its part in the ZIP, and why it is not read (or None)."""
    workbook = _tree(archive, "xl/workbook.xml")
    rels = _tree(archive, "xl/_rels/workbook.xml.rels")
    targets: dict[str, tuple[str, str]] = {}
    for rel in rels.iterfind(f"{_PKG_REL}Relationship"):
        rel_type = (rel.get("Type") or "").rsplit("/", 1)[-1]
        target = rel.get("Target") or ""
        part = target.lstrip("/") if target.startswith("/") else posixpath.normpath(f"xl/{target}")
        targets[rel.get("Id") or ""] = (rel_type, part)
    sheets = []
    for sheet in workbook.iterfind(f"{_MAIN}sheets/{_MAIN}sheet"):
        name = sheet.get("name") or ""
        state = _VISIBILITY.get(sheet.get("state") or "visible", "visible")
        rel_type, part = targets.get(sheet.get(f"{_REL}id") or "", ("", ""))
        reason = _SHEET_TYPES.get(rel_type, "unsupported_sheet")
        sheets.append((name, state, part if reason is None else None, reason))
    return sheets


def _column_hidden(ranges: list[tuple[str, str]], column: int) -> bool:
    """Whether a column falls in a hidden <col min max> range; the bounds are compared as the
    digit strings the file writes (shorter is smaller), never read as numbers."""
    key = (len(str(column)), str(column))
    return any((len(low), low) <= key <= (len(high), high) for low, high in ranges)


def _cells(
    stream: IO[bytes], styles: _Styles, shared: dict[str, str], state: str
) -> Iterator[tuple[str, CellRead | None, list[str]]]:
    """Stream a sheet part: ("cell", cell, []) per cell with a value, ("merge", None, [range])
    per merged range. Hidden rows and columns are known before the cells (they come first)."""
    hidden_columns: list[tuple[str, str]] = []
    sheet_reason = {"hidden": "hidden_sheet", "very_hidden": "very_hidden_sheet"}.get(state)
    context = etree.iterparse(
        stream,
        events=("end",),
        tag=(f"{_MAIN}col", f"{_MAIN}row", f"{_MAIN}c", f"{_MAIN}mergeCell"),
        resolve_entities=False,
        load_dtd=False,
        no_network=True,
        huge_tree=False,
    )
    for _, element in context:
        tag = element.tag
        if tag == f"{_MAIN}col":
            if element.get("hidden") in ("1", "true"):
                hidden_columns.append((element.get("min", ""), element.get("max", "")))
        elif tag == f"{_MAIN}mergeCell":
            ref = element.get("ref") or ""
            if ":" in ref:
                yield ("merge", None, [ref])
        elif tag == f"{_MAIN}row":
            element.clear()
        elif tag == f"{_MAIN}c":
            ref = element.get("r")
            if ref is None:
                raise _Unreadable
            letters, _ = coordinate_from_string(ref)
            parent = element.getparent()
            row_hidden = parent is not None and parent.get("hidden") in ("1", "true")
            cell = _cell(
                element, ref, letters, row_hidden, styles, shared, sheet_reason, hidden_columns
            )
            if cell is not None:
                yield ("cell", cell, [])


def _cell(
    element: etree._Element,
    ref: str,
    letters: str,
    row_hidden: bool,
    styles: _Styles,
    shared: dict[str, str],
    sheet_reason: str | None,
    hidden_columns: list[tuple[str, str]],
) -> CellRead | None:
    kind = element.get("t") or "n"  # SpreadsheetML: a cell with no type is a number
    style = element.get("s")
    value = element.findtext(f"{_MAIN}v")
    formula = element.findtext(f"{_MAIN}f")
    if kind == "inlineStr":
        inline = element.find(f"{_MAIN}is")
        raw = _texts(inline) if inline is not None else None
    elif kind == "s":
        raw = shared.get(value) if value is not None else None
    else:
        raw = value
    if raw is None or (raw == "" and kind != "inlineStr"):
        return None
    value_type = _VALUE_TYPES.get(kind, "number")
    number_format = styles.number_format(style)
    if value_type == "number" and is_date_format(number_format):
        value_type = "date"
    reasons: set[str] = set()
    if sheet_reason is not None:
        reasons.add(sheet_reason)
    if row_hidden:
        reasons.add("hidden_row")
    if hidden_columns and _column_hidden(hidden_columns, column_index_from_string(letters)):
        reasons.add("hidden_column")
    if styles.font_matches_fill(style):
        reasons.add("font_matches_fill")
    written = f"={formula}" if formula else None
    if len(raw) > _MAX_STRING or (written is not None and len(written) > _MAX_FORMULA):
        raise _Unreadable
    return CellRead(
        ref,
        value_type,
        raw,
        number_format[:255] or "General",
        tuple(reason for reason in _HIDDEN_ORDER if reason in reasons),
        written,
    )


def _read_sheet(
    archive: zipfile.ZipFile,
    reading: XlsxReading,
    sheet: SheetRead,
    part: str,
    styles: _Styles,
    shared: dict[str, str],
    max_cells: int,
) -> None:
    cells: list[CellRead] = []
    merged: list[str] = []
    try:
        with _open(archive, part) as stream:
            for kind, cell, extra in _cells(stream, styles, shared, sheet.visibility):
                if kind == "merge":
                    merged.extend(extra)
                elif cell is not None:
                    cells.append(cell)
                    if len(cells) > max_cells:
                        reading.coverage.append((sheet.name, "not_read", "cell_limit"))
                        return
    except (_Unreadable, etree.XMLSyntaxError, ValueError, KeyError):
        reading.coverage.append((sheet.name, "not_read", "read_error"))
        return
    sheet.cells = cells
    sheet.merged_ranges = merged
    reading.coverage.append((sheet.name, "read", None))
    if sheet.visibility != "visible":
        code = (
            "hidden_text.hidden_sheet"
            if sheet.visibility == "hidden"
            else "hidden_text.very_hidden_sheet"
        )
        reading.findings.append(XlsxFinding("hidden_text", code, sheet.name, None))
    for cell in cells:
        own = [
            reason for reason in cell.hidden if reason not in ("hidden_sheet", "very_hidden_sheet")
        ]
        if own:
            reading.findings.append(
                XlsxFinding("hidden_text", f"hidden_text.{own[0]}", sheet.name, cell.ref)
            )
        if cell.value_type in ("shared_string", "inline_string", "formula_string"):
            code = instructions.detect(cell.raw)
            if code is not None:
                reading.findings.append(
                    XlsxFinding("embedded_instruction", code, sheet.name, cell.ref)
                )


def read_xlsx(path: Path, *, max_cells_per_sheet: int) -> XlsxReading:
    """Read every sheet of a workbook, within the cell limit per sheet."""
    reading = XlsxReading()
    try:
        with zipfile.ZipFile(path) as archive:
            parts = _sheet_parts(archive)
            styles = _styles(archive)
            shared = _shared_strings(archive)
            for name, state, part, reason in parts:
                sheet = SheetRead(name, state)
                reading.sheets.append(sheet)
                if part is None:
                    reading.coverage.append((name, "not_read", reason))
                    continue
                _read_sheet(archive, reading, sheet, part, styles, shared, max_cells_per_sheet)
    except (_Unreadable, zipfile.BadZipFile, etree.XMLSyntaxError, OSError, KeyError):
        return XlsxReading(failed="unreadable_file")
    return reading
