"""The file format is set by code from the file's content, never from its name alone.

The contract's ``format`` is "set by code from the file content" (packages/extraction-contract).
A declared format tells the extractor what the owner or the API expected; the content decides
what the file is. The bytes below are synthetic TEST data made in the test (no document-type file
is committed outside fixtures/).

Ids: F-INGEST-02, F-INGEST-03, R-014, R-022, G12-1 (extractor half).
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

import pytest

from sovitech_extractor.formats import detect_format

CFB = bytes.fromhex("D0CF11E0A1B11AE1") + b"\x00" * 504


def _zip(names: list[str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name in names:
            archive.writestr(name, "TEST")
    return buffer.getvalue()


@pytest.mark.parametrize(
    ("content", "declared", "expected"),
    [
        (b"%PDF-1.7\n%TEST\n", "pdf", "pdf"),
        (b"\n  %PDF-1.4 TEST", "pdf", "pdf"),
        (b"ISO-10303-21;\nHEADER;\n", "ifc", "ifc"),
        (b"\xef\xbb\xbfISO-10303-21;\n", "ifc", "ifc"),
        (_zip(["[Content_Types].xml", "xl/workbook.xml"]), "xlsx", "xlsx"),
        (_zip(["[Content_Types].xml", "word/document.xml"]), "docx", "docx"),
        (_zip(["TEST.txt"]), "zip", "zip"),
        (_zip(["[Content_Types].xml", "xl/workbook.xml"]), "zip", "xlsx"),
        (CFB, "rvt", "rvt"),
        (b"AC1032" + b"\x00" * 64, "dwg", "dwg"),
        (b"\xff\xd8\xff\xe0" + b"\x00" * 32, "jpg", "jpg"),
        (b"\x89PNG\r\n\x1a\n" + b"\x00" * 32, "png", "png"),
        (b"%PDF-1.7\n", "ifc", "pdf"),
    ],
)
def test_the_content_decides_the_format(
    tmp_path: Path, content: bytes, declared: str, expected: str
) -> None:
    path = tmp_path / "file"
    path.write_bytes(content)
    assert detect_format(path, declared).format == expected


@pytest.mark.parametrize(
    ("content", "declared", "reason"),
    [
        (b"just some text", "other", "unrecognised_format"),
        (b"just some text", "pdf", "format_mismatch"),
        (CFB, "docx", "format_mismatch"),
        (CFB, "other", "unrecognised_format"),
        (b"", "pdf", "format_mismatch"),
        (b"PK\x03\x04 broken zip", "xlsx", "format_mismatch"),
    ],
)
def test_content_the_extractor_cannot_place_is_other_with_a_reason(
    tmp_path: Path, content: bytes, declared: str, reason: str
) -> None:
    path = tmp_path / "file"
    path.write_bytes(content)
    detected = detect_format(path, declared)
    assert (detected.format, detected.reason) == ("other", reason)
