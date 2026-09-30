"""The file format, set by code from the file's content (the contract's ``Format``).

Signatures at the start of the file decide: PDF, an ISO 10303-21 exchange file (IFC), a ZIP
container (an XLSX workbook, a DOCX document, or any other archive), an OLE compound file (RVT,
when that is what was declared: the container alone does not say RVT), DWG, JPEG and PNG. What the
extractor cannot place is ``other`` with a reason, and its analysis fails with that reason.
"""

from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

__all__ = ["Detected", "detect_format"]

type FileFormat = Literal["pdf", "xlsx", "ifc", "rvt", "dwg", "docx", "jpg", "png", "zip", "other"]
type Reason = Literal["unrecognised_format", "format_mismatch"]

_HEAD = 2048
_PDF = re.compile(rb"\s*%PDF-")
_STEP = re.compile(rb"(?:\xef\xbb\xbf)?\s*ISO-10303-21\s*;")
_DWG = re.compile(rb"AC10[0-9][0-9]")
_CFB = bytes.fromhex("D0CF11E0A1B11AE1")
_PNG = b"\x89PNG\r\n\x1a\n"
_JPEG = b"\xff\xd8\xff"
_ZIP = (b"PK\x03\x04", b"PK\x05\x06")


@dataclass(frozen=True, slots=True)
class Detected:
    format: FileFormat
    reason: Reason | None = None


def _zip_kind(path: Path) -> FileFormat | None:
    try:
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
    except (zipfile.BadZipFile, OSError, ValueError):
        return None
    if "[Content_Types].xml" in names and "xl/workbook.xml" in names:
        return "xlsx"
    if "[Content_Types].xml" in names and "word/document.xml" in names:
        return "docx"
    return "zip"


def detect_format(path: Path, declared: str) -> Detected:
    """The format of the file at ``path``; ``other`` with a reason when it cannot be placed."""
    with path.open("rb") as handle:
        head = handle.read(_HEAD)
    found: FileFormat | None = None
    if _PDF.match(head):
        found = "pdf"
    elif _STEP.match(head):
        found = "ifc"
    elif head.startswith(_ZIP):
        found = _zip_kind(path)
    elif head.startswith(_CFB):
        found = "rvt" if declared == "rvt" else None
    elif _DWG.match(head):
        found = "dwg"
    elif head.startswith(_PNG):
        found = "png"
    elif head.startswith(_JPEG):
        found = "jpg"
    if found is not None:
        return Detected(found)
    return Detected("other", "unrecognised_format" if declared == "other" else "format_mismatch")
