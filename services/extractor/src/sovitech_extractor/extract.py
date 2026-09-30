"""One extraction job: check the file is the one the request names, read it, build the output.

The request comes from the API (the contract's ExtractionRequest; ADR 0020 job payloads carry ids
only, and the worker mounts the file read-only). The extractor refuses a file whose SHA-256 is not
the request's content hash: it never writes an output about bytes it did not read (rule 1, "The
content hash matches"; rule 13). The format is set from the content (formats.py). What it reads
depends on the format; the other formats are stored "Not analysed" (G12-1). A file whose content is
not the format it was uploaded as is not read at all: its analysis fails with ``format_mismatch``.

IFC models are not read here. The owner's decision of 2026-09-26 ("web-ifc instead"; ADR 0018,
ADR 0031) moved the IFC data pass to the IFC reader (packages/ifc-reader, its own sandbox image),
and the API's worker sends it every IFC job. A model that reaches this extractor is refused as a
job (``job.ifc_read_by_ifc_reader``), so it is never half-read by the wrong reader. What stays of
IFC here is the STEP text reader of ifc/step.py, the in-house reader of word-for-word excerpts,
which the IFC reader's TypeScript copy is checked against (tests/test_step_text_parity.py).
"""

from __future__ import annotations

import hashlib
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from .contract import _generated as c
from .formats import detect_format
from .output import STORED_WORDS, failed_output, pdf_output, stored_output, xlsx_output
from .pdf_reader import read_pdf
from .xlsx_reader import read_xlsx

__all__ = ["JobError", "file_hash", "run_job"]

# Part of the wall clock kept back to write the output before the sandbox's own kill.
_OUTPUT_SHARE = 0.9


class JobError(Exception):
    """A job the extractor refuses to run. The message is a code, never document text."""


@dataclass(frozen=True, slots=True)
class Mounts:
    """What the sandbox mounts beside the file: the datasets folder and the IDS file, if any.

    Both concern IFC models, which the IFC reader reads; the command line keeps them so both
    readers take the same arguments, and this extractor reads neither."""

    datasets: Path | None = None
    ids: Path | None = None


def file_hash(path: Path) -> str:
    """The file's SHA-256 in the store's form, ``sha256:<64 hex>``."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def _declared_as(detected: str, declared: str) -> bool:
    """Whether the content is the format the upload declared. A ZIP container holds workbooks and
    documents too, so a file declared as a ZIP archive is one whatever it holds."""
    return detected == declared or (declared == "zip" and detected in ("xlsx", "docx"))


def run_job(
    request: c.ExtractionRequest,
    path: Path,
    mounts: Mounts = Mounts(),  # noqa: B008
    *,
    clock: Callable[[], float] = time.monotonic,
) -> c.ExtractionOutput:
    """Read the file the request names and return its extraction output; raises JobError."""
    if file_hash(path) != request.job.content_hash:
        raise JobError("job.content_hash_mismatch")
    deadline = clock() + request.limits.wall_clock_seconds * _OUTPUT_SHARE
    detected = detect_format(path, request.declared_format)
    job = request.job
    if detected.format != "other" and not _declared_as(detected.format, request.declared_format):
        # The file is not what it was uploaded as (a workbook named ".pdf"): nothing is read, so
        # no status or coverage describes it as a format its record does not have (rule 12, 2.3).
        return failed_output(job, "other", "format_mismatch")
    if request.declared_format == "zip":
        # A ZIP archive is stored whole, whatever it holds (R-014): nothing inside is read.
        return stored_output(job, "zip")
    try:
        if detected.format == "pdf":
            return pdf_output(
                job,
                read_pdf(path, max_pages=request.limits.max_pages, deadline=deadline, clock=clock),
            )
        if detected.format == "xlsx":
            return xlsx_output(
                job, read_xlsx(path, max_cells_per_sheet=request.limits.max_cells_per_sheet)
            )
        if detected.format == "ifc":
            raise JobError("job.ifc_read_by_ifc_reader")
        if detected.format in STORED_WORDS:
            return stored_output(job, detected.format)
    except MemoryError:
        return failed_output(job, detected.format, "memory_limit")
    return failed_output(job, "other", detected.reason or "unrecognised_format")
