"""The extractor's entry point: ``python -I -m sovitech_extractor`` (the sandbox image's).

    --request <file>    the ExtractionRequest (JSON), read strictly (contract.parse_request)
    --document <file>   the stored file, mounted read-only
    --out <folder>      where output.json is written (the job's only writable mount)
    --datasets <folder> the mapping datasets the request names (only with ifcValues)
    --ids <file>        the IDS file the request names (only for an IFC model)

It writes output.json only through contract.dump_output, which refuses what the API would refuse,
and checks the output answers the request. Standard output and standard error carry JSON log
lines with codes only (rule 13). Exit status: 0 output written; 2 request refused; 3 job refused
(for example a content hash that does not match); 4 internal error.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import IO

from . import contract
from .extract import JobError, Mounts, run_job
from .logs import CodeLog, silenced

__all__ = ["main"]

EXIT_OK, EXIT_REQUEST, EXIT_JOB, EXIT_INTERNAL = 0, 2, 3, 4


def _arguments(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="sovitech_extractor", add_help=True)
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--document", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--datasets", type=Path)
    parser.add_argument("--ids", type=Path)
    return parser.parse_args(argv)


def _write(out: Path, value: object) -> None:
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    handle, temporary = tempfile.mkstemp(prefix=".output-", suffix=".json", dir=out)
    with os.fdopen(handle, "w", encoding="utf-8") as stream:
        stream.write(text)
    os.replace(temporary, out / "output.json")


def _run(arguments: argparse.Namespace, log: CodeLog) -> int:
    try:
        request = contract.parse_request(json.loads(arguments.request.read_text("utf-8")))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        log.emit("request.unreadable", level="error")
        return EXIT_REQUEST
    except contract.ContractError as error:
        log.emit("request.refused", level="error", count=len(error.problems))
        return EXIT_REQUEST
    log.emit("job.started")
    try:
        output = run_job(request, arguments.document, Mounts(arguments.datasets, arguments.ids))
    except JobError as error:
        log.emit(str(error), level="error")
        return EXIT_JOB
    try:
        value = contract.dump_output(output)
    except contract.ContractError as error:
        log.emit("output.refused_by_contract", level="error", count=len(error.problems))
        return EXIT_INTERNAL
    if contract.output_answers_request(request, output):
        log.emit("output.does_not_answer_request", level="error")
        return EXIT_INTERNAL
    _write(arguments.out, value)
    log.emit("job.finished", count=len(output.findings))
    return EXIT_OK


def main(argv: list[str] | None = None, log_stream: IO[str] | None = None) -> int:
    arguments = _arguments(argv)
    with silenced(log_stream) as log:
        try:
            return _run(arguments, log)
        except Exception as error:  # only the class name leaves the process
            log.emit("job.internal_error", level="error", name=type(error).__name__)
            return EXIT_INTERNAL


if __name__ == "__main__":
    sys.exit(main())
