"""From what a reader read to the contract's ExtractionOutput.

Status lines follow the 2.8 terms (the contract's AnalysisStatus): a PDF read in full is
"analysed", one with pages not read is "Partly analysed (<read> of <total> pages)", one with no
text layer at all is stored as a scan; an XLSX with every sheet read is "analysed", one with a
sheet not read (a chart sheet, a sheet over the cell limit, a sheet that could not be read) is
partly analysed, counted in sheets (rule 12; the owner-facing line for sheets waits for the
approver, P-2-XLSX-SHEETS), and one with no sheet read failed, with its sheet coverage kept for
the engineer; the other formats are stored "Not analysed" with their word (G12-1). An IFC
model's output is the IFC reader's (packages/ifc-reader; ADR 0031). Findings carry codes and
locations, never text (rule 13).
"""

from __future__ import annotations

import lxml
import openpyxl

from . import __version__
from .contract import _generated as c
from .pdf_reader import PdfReading
from .xlsx_reader import XlsxReading

__all__ = [
    "failed_output",
    "pdf_output",
    "stored_output",
    "xlsx_output",
]

STORED_WORDS = {
    "rvt": "RVT model",
    "dwg": "DWG drawing",
    "docx": "DOCX file",
    "jpg": "JPG image",
    "png": "PNG image",
    "zip": "ZIP archive",
}


def _producer(*libraries: tuple[str, str]) -> c.Producer:
    return c.Producer(
        "sovitech-extractor",
        __version__,
        tuple(c.ToolVersion(name, version) for name, version in libraries),
    )


def _base(
    job: c.Job, file_format: str, analysis: c.AnalysisStatus, **parts: object
) -> c.ExtractionOutput:
    producer = parts.pop("producer", _producer())
    return c.ExtractionOutput(
        "1.0.0",
        producer,  # type: ignore[arg-type]
        job,
        file_format,  # type: ignore[arg-type]
        analysis,
        parts.pop("coverage", c.Coverage()),  # type: ignore[arg-type]
        tuple(parts.pop("findings", ())),  # type: ignore[arg-type]
        (),
        **parts,  # type: ignore[arg-type]
    )


def failed_output(job: c.Job, file_format: str, reason: str) -> c.ExtractionOutput:
    """ "Analysis failed": the reason is a code for the engineer and the logs."""
    return _base(job, file_format, c.AnalysisFailedStatus("failed", reason))  # type: ignore[arg-type]


def stored_output(job: c.Job, file_format: str) -> c.ExtractionOutput:
    """ "Not analysed: <format> stored, not analysed" (G12-1): nothing is extracted."""
    return _base(job, file_format, c.StoredOnlyStatus("stored_only", STORED_WORDS[file_format]))  # type: ignore[arg-type]


def _ranges(pages: list[int]) -> tuple[c.PageRange, ...]:
    ranges: list[c.PageRange] = []
    for page in pages:
        if ranges and ranges[-1].last == page - 1:
            ranges[-1] = c.PageRange(ranges[-1].first, page)
        else:
            ranges.append(c.PageRange(page, page))
    return tuple(ranges)


def pdf_output(job: c.Job, reading: PdfReading) -> c.ExtractionOutput:
    producer = _producer(
        ("pypdfium2", reading.pypdfium2_version), ("pdfium", reading.pdfium_version)
    )
    status, first, second = reading.analysis
    if status == "failed":
        coverage = c.Coverage()
        if reading.page_count and not reading.pages and reading.unread:
            coverage = c.Coverage(pages=_page_coverage(reading))
        return _base(
            job,
            "pdf",
            c.AnalysisFailedStatus("failed", str(first)),
            producer=producer,
            coverage=coverage,
        )  # type: ignore[arg-type]
    coverage = c.Coverage(pages=_page_coverage(reading))
    if status == "stored_only":
        return _base(
            job,
            "pdf",
            c.StoredOnlyStatus("stored_only", "PDF scan"),
            producer=producer,
            coverage=coverage,
        )
    analysis: c.AnalysisStatus = (
        c.AnalysedStatus("analysed")
        if status == "analysed"
        else c.PartlyAnalysedStatus("partly_analysed", "pages", first, second)  # type: ignore[arg-type]
    )
    pages = tuple(
        c.PdfPage(
            page.page,
            page.media_box,
            page.rotation,  # type: ignore[arg-type]
            tuple(
                c.TextBlock(
                    block.anchor_id,
                    block.text,
                    block.bbox,
                    tuple(c.CharBox(box.start, box.end, box.box) for box in block.char_boxes),
                    block.hidden,  # type: ignore[arg-type]
                )
                for block in page.blocks
            ),
        )
        for page in reading.pages
    )
    findings = tuple(
        c.Finding(
            finding.kind,  # type: ignore[arg-type]
            finding.code,
            c.PdfFindingLocator("pdf", finding.page, finding.anchor_id, finding.bbox),
        )
        for finding in reading.findings
    )
    return _base(
        job,
        "pdf",
        analysis,
        producer=producer,
        coverage=coverage,
        findings=findings,
        pdf=c.PdfContent(pages),
    )


def _page_coverage(reading: PdfReading) -> c.PageCoverage:
    return c.PageCoverage(
        reading.page_count,
        _ranges([page.page for page in reading.pages]),
        tuple(c.UnreadPageRange(first, last, reason) for first, last, reason in reading.unread),  # type: ignore[arg-type]
    )


def xlsx_output(job: c.Job, reading: XlsxReading) -> c.ExtractionOutput:
    producer = _producer(("lxml", lxml.__version__), ("openpyxl", openpyxl.__version__))
    if reading.failed is not None:
        return _base(
            job, "xlsx", c.AnalysisFailedStatus("failed", reading.failed), producer=producer
        )  # type: ignore[arg-type]
    coverage = c.Coverage(
        sheets=tuple(
            c.SheetCoverage(sheet, status, reason)  # type: ignore[arg-type]
            for sheet, status, reason in reading.coverage
        )
    )
    sheets = tuple(
        c.XlsxSheet(
            sheet.name,
            sheet.visibility,  # type: ignore[arg-type]
            tuple(
                c.XlsxCell(
                    cell.ref,
                    cell.value_type,
                    cell.raw,
                    cell.number_format,
                    cell.hidden,
                    cell.formula,
                )  # type: ignore[arg-type]
                for cell in sheet.cells
            ),
            tuple(dict.fromkeys(sheet.merged_ranges)),
        )
        for sheet in reading.sheets
    )
    findings = tuple(
        c.Finding(
            finding.kind, finding.code, c.XlsxFindingLocator("xlsx", finding.sheet, finding.cell)
        )  # type: ignore[arg-type]
        for finding in reading.findings
    )
    total = len(reading.coverage)
    read = len([entry for entry in reading.coverage if entry[1] == "read"])
    if total > 0 and read == 0:
        # Nothing was read: "Analysis failed". Each sheet's own reason (a chart sheet, the cell
        # limit, a read error) stays in the coverage, for the engineer.
        return _base(
            job,
            "xlsx",
            c.AnalysisFailedStatus("failed", "unreadable_file"),
            producer=producer,
            coverage=coverage,
        )
    analysis: c.AnalysisStatus = (
        c.AnalysedStatus("analysed")
        if read == total
        else c.PartlyAnalysedStatus("partly_analysed", "sheets", read, total)  # type: ignore[arg-type]
    )
    return _base(
        job,
        "xlsx",
        analysis,
        producer=producer,
        coverage=coverage,
        findings=findings,
        xlsx=c.XlsxContent(sheets),
    )
