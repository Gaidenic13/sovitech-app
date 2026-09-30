"""The extractor end to end: a request and a file in, one strict extraction output out.

Each fixture companion and model goes through the entry point in a separate process, as the
sandbox runs it, and the output is read back with the contract's strict parser (the same schema
and invariants the API applies). The logs are JSON lines of codes; no document text is in them.
Other formats are stored "Not analysed" with their word and nothing extracted from them.

IFC models are the IFC reader's (packages/ifc-reader, on web-ifc; the owner's decision of
2026-09-26; ADR 0031): the reader halves of G12-5 and G14-3 are in its tests
(packages/ifc-reader/src/job.test.ts), and a model sent here is refused as a job.

Ids: F-INGEST-02, F-INGEST-03, F-INGEST-04, F-INGEST-05, F-EXTRACT-01, R-014, R-015, G12-1
(extractor half), G12-3 (extractor half), guardrails rule 13 (logs never contain document text).
"""

from __future__ import annotations

import io
import json
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any

import pytest

from sovitech_extractor import contract
from sovitech_extractor.extract import file_hash
from sovitech_extractor.logs import CodeLog

REPO = Path(__file__).resolve().parents[3]
SRC = REPO / "services" / "extractor" / "src"
PROJECT = "0192f0a0-0000-7000-8000-00000000e101"
DOCUMENT = "0192f0a0-0000-7000-8000-00000000e102"
CFB = bytes.fromhex("D0CF11E0A1B11AE1") + b"\x00" * 504


def request_for(path: Path, declared: str, **extra: Any) -> dict[str, Any]:
    value: dict[str, Any] = {
        "contractVersion": "1.0.0",
        "job": {"projectId": PROJECT, "documentId": DOCUMENT, "contentHash": file_hash(path)},
        "declaredFormat": declared,
        "ifcValues": False,
        "datasets": [],
        "derivatives": [],
        "limits": {"maxPages": 100000, "maxCellsPerSheet": 1000000, "wallClockSeconds": 600},
    }
    value.update(extra)
    return value


def run_cli(
    tmp_path: Path, document: Path, request: dict[str, Any], *more: str
) -> tuple[int, dict[str, Any] | None, str]:
    request_path = tmp_path / "request.json"
    request_path.write_text(json.dumps(request))
    out = tmp_path / "out"
    out.mkdir(exist_ok=True)
    code = (
        "import sys; sys.path.insert(0, sys.argv[1]); from sovitech_extractor.cli import main; "
        "sys.exit(main(sys.argv[2:]))"
    )
    completed = subprocess.run(  # noqa: S603
        [
            sys.executable,
            "-c",
            code,
            str(SRC),
            "--request",
            str(request_path),
            "--document",
            str(document),
            "--out",
            str(out),
            *more,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    output_path = out / "output.json"
    output = json.loads(output_path.read_text()) if output_path.exists() else None
    return completed.returncode, output, completed.stdout + completed.stderr


def _parsed(output: dict[str, Any] | None) -> contract.ExtractionOutput:
    assert output is not None
    return contract.parse_output(output)


def _log_codes(logs: str) -> list[str]:
    lines = [json.loads(line) for line in logs.splitlines() if line.strip()]
    for line in lines:
        assert set(line) <= {"level", "code", "name", "count", "stepIds", "globalIds"}
    return [line["code"] for line in lines]


def _texts(output: dict[str, Any]) -> list[str]:
    """Every piece of document text in an output, to look for in the logs."""
    texts: list[str] = []
    for page in output.get("pdf", {}).get("pages", []):
        texts.extend(block["text"].strip() for block in page["blocks"])
    for sheet in output.get("xlsx", {}).get("sheets", []):
        texts.extend(cell["raw"] for cell in sheet["cells"])
    tool = output.get("ifcModel", {}).get("header", {}).get("authoringTool")
    if tool:
        texts.append(tool)
    return [text for text in texts if len(text) >= 6]


PDFS = {
    "memoriu-tehnic": ("analysed",),
    "tabel-suprafete": ("analysed",),
    "lista-echipamente": ("analysed",),
    "plan-subsol": ("analysed",),
    "nota-proiectant": ("analysed",),
    "caiet-de-sarcini": ("partly_analysed", 37, 40),
}


@pytest.mark.parametrize("name", sorted(PDFS))
def test_each_pdf_companion_gives_a_strict_output_and_a_log_with_no_text(
    tmp_path: Path, name: str
) -> None:
    document = REPO / "fixtures" / "pdf" / f"{name}.pdf"
    status, output, logs = run_cli(tmp_path, document, request_for(document, "pdf"))
    assert status == 0, logs
    parsed = _parsed(output)
    assert parsed.format == "pdf"
    expected = PDFS[name]
    assert parsed.analysis.status == expected[0]
    if expected[0] == "partly_analysed":
        assert (parsed.analysis.read, parsed.analysis.total) == expected[1:]  # type: ignore[union-attr]
    assert _log_codes(logs) == ["job.started", "job.finished"]
    assert output is not None
    for text in _texts(output):
        assert text not in logs


@pytest.mark.parametrize("name", ["tabel-camere", "lista-echipamente"])
def test_each_xlsx_companion_gives_a_strict_output(tmp_path: Path, name: str) -> None:
    document = REPO / "fixtures" / "xlsx" / f"{name}.xlsx"
    status, output, logs = run_cli(tmp_path, document, request_for(document, "xlsx"))
    assert status == 0, logs
    parsed = _parsed(output)
    assert parsed.analysis.status == "analysed"
    assert parsed.xlsx is not None and parsed.coverage.sheets is not None
    assert [s.status for s in parsed.coverage.sheets] == ["read", "read"]
    assert output is not None
    for text in _texts(output):
        assert text not in logs


@pytest.mark.parametrize(
    "name",
    ["demo-hotel-arh", "demo-hotel-mep-rev-a", "demo-hotel-mep-rev-b", "demo-hotel-mep-ifc2x3"],
)
def test_an_ifc_model_is_the_ifc_readers_and_is_refused_here(tmp_path: Path, name: str) -> None:
    """F-INGEST-04 (ADR 0031): the worker sends IFC models to the IFC reader; a model that reaches
    this extractor is refused as a job (exit 3, a code), so no output about it is written here and
    nothing of it is half-read by the wrong reader. The log names the code only."""
    document = REPO / "fixtures" / "ifc" / f"{name}.ifc"
    status, output, logs = run_cli(tmp_path, document, request_for(document, "ifc"))
    assert status == 3, logs
    assert output is None
    assert '"code":"job.ifc_read_by_ifc_reader"' in logs
    assert "Demo Hotel" not in logs


def _zip_bytes(names: list[str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name in names:
            archive.writestr(name, "TEST")
    return buffer.getvalue()


STORED = {
    "rvt": (CFB, "RVT model"),
    "dwg": (b"AC1032" + b"\x00" * 128, "DWG drawing"),
    "docx": (_zip_bytes(["[Content_Types].xml", "word/document.xml"]), "DOCX file"),
    "jpg": (b"\xff\xd8\xff\xe0" + b"\x00" * 64, "JPG image"),
    "png": (b"\x89PNG\r\n\x1a\n" + b"\x00" * 64, "PNG image"),
    "zip": (_zip_bytes(["TEST/a.txt", "TEST/b.pdf"]), "ZIP archive"),
}


@pytest.mark.parametrize("fmt", sorted(STORED))
def test_G12_1_a_format_the_app_does_not_read_is_stored_and_nothing_is_extracted(
    tmp_path: Path, fmt: str
) -> None:
    """G12-1 (extractor half): an RVT file, and each other format the app does not read, is
    stored "Not analysed: <format> stored, not analysed"; nothing is extracted from it, nothing
    inside an archive is read, and it counts as no coverage."""
    content, word = STORED[fmt]
    document = tmp_path / "document"
    document.write_bytes(content)
    status, output, logs = run_cli(tmp_path, document, request_for(document, fmt))
    assert status == 0, logs
    parsed = _parsed(output)
    assert (parsed.format, parsed.analysis.status, parsed.analysis.format_word) == (
        fmt,
        "stored_only",
        word,
    )  # type: ignore[union-attr]
    assert parsed.coverage == contract.Coverage()
    assert (parsed.pdf, parsed.xlsx, parsed.ifc_model, parsed.ifc_values) == (
        None,
        None,
        None,
        None,
    )
    assert parsed.findings == () and parsed.derivatives == ()


def test_content_that_cannot_be_placed_fails_with_its_reason(tmp_path: Path) -> None:
    document = tmp_path / "document"
    document.write_bytes(b"TEST plain text, not a document format")
    status, output, logs = run_cli(tmp_path, document, request_for(document, "pdf"))
    assert status == 0, logs
    parsed = _parsed(output)
    assert (parsed.format, parsed.analysis.status, parsed.analysis.reason) == (
        "other",
        "failed",
        "format_mismatch",
    )  # type: ignore[union-attr]


def test_a_file_that_is_not_the_one_the_request_names_is_refused(tmp_path: Path) -> None:
    document = REPO / "fixtures" / "pdf" / "memoriu-tehnic.pdf"
    request = request_for(document, "pdf")
    request["job"]["contentHash"] = "sha256:" + "0" * 64
    status, output, logs = run_cli(tmp_path, document, request)
    assert (status, output) == (3, None)
    assert _log_codes(logs) == ["job.started", "job.content_hash_mismatch"]


def test_a_request_the_contract_refuses_is_refused(tmp_path: Path) -> None:
    document = REPO / "fixtures" / "pdf" / "memoriu-tehnic.pdf"
    request = request_for(document, "pdf", unknownKey="TEST")
    status, output, logs = run_cli(tmp_path, document, request)
    assert (status, output) == (2, None)
    assert _log_codes(logs) == ["request.refused"]


def test_an_exception_leaves_only_its_class_name(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from sovitech_extractor import cli

    def explode(*_: object, **__: object) -> None:
        raise ValueError("TEST secret document text that must not be logged")

    monkeypatch.setattr(cli, "run_job", explode)
    document = REPO / "fixtures" / "pdf" / "memoriu-tehnic.pdf"
    request_path = tmp_path / "request.json"
    request_path.write_text(json.dumps(request_for(document, "pdf")))
    stream = io.StringIO()
    argv = ["--request", str(request_path), "--document", str(document), "--out", str(tmp_path)]
    assert cli.main(argv, log_stream=stream) == cli.EXIT_INTERNAL
    assert "secret" not in stream.getvalue()
    assert _log_codes(stream.getvalue()) == ["job.started", "job.internal_error"]
    assert '"name":"ValueError"' in stream.getvalue()
    assert not (tmp_path / "output.json").exists()


def test_the_log_refuses_free_text_in_its_fields() -> None:
    stream = io.StringIO()
    log = CodeLog(stream)
    log.emit(
        "Not a code: TEST secret",
        name="TEST secret text with spaces",
        step_ids=("12", "x"),
        global_ids=("bad",),
    )
    line = json.loads(stream.getvalue())
    assert line == {"level": "info", "code": "log.invalid_code", "stepIds": ["12"]}
