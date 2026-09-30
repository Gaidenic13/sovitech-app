"""Logs that carry codes, never document text (guardrails rule 13; prompt 3 section 8).

The extractor's own log lines are JSON objects with a level and a code, and at most counts, STEP
ids and GlobalIds. Everything else that could print is silenced or reduced to a code while a job
runs:

- the process's standard output and standard error point at /dev/null, as file descriptors and
  as Python streams, so text a native library (PDFium, an XML parser) or Python code prints never
  leaves the sandbox; the log lines go to the original standard error, kept aside;
- Python logging from any library becomes ``library.log`` with the logger's name and level only;
- warnings become ``library.warning`` with the warning's category only;
- an exception becomes ``job.internal_error`` with the exception's class name only.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import warnings
from collections.abc import Iterator
from contextlib import contextmanager
from typing import IO, Any

__all__ = ["CodeLog", "silenced"]

_CODE = re.compile(r"[a-z][a-z0-9_]*(\.[a-z0-9_]+)*")
_NAME = re.compile(r"[A-Za-z_][A-Za-z0-9_.]{0,79}")
_GLOBAL_ID = re.compile(r"[0-9A-Za-z_$]{22}")
_STEP_ID = re.compile(r"[1-9][0-9]{0,11}")


class CodeLog:
    """Writes one JSON object per line: a level, a code and ids; never free text."""

    def __init__(self, stream: IO[str]) -> None:
        self._stream = stream

    def emit(
        self,
        code: str,
        *,
        level: str = "info",
        name: str | None = None,
        count: int | None = None,
        step_ids: tuple[str, ...] = (),
        global_ids: tuple[str, ...] = (),
    ) -> None:
        if _CODE.fullmatch(code) is None:
            code = "log.invalid_code"
        line: dict[str, Any] = {
            "level": level if level in ("info", "warning", "error") else "info",
            "code": code,
        }
        if name is not None and _NAME.fullmatch(name):
            line["name"] = name
        if count is not None:
            line["count"] = count
        ids = [step_id for step_id in step_ids if _STEP_ID.fullmatch(step_id)][:64]
        if ids:
            line["stepIds"] = ids
        gids = [gid for gid in global_ids if _GLOBAL_ID.fullmatch(gid)][:64]
        if gids:
            line["globalIds"] = gids
        self._stream.write(json.dumps(line, separators=(",", ":")) + "\n")
        self._stream.flush()


class _ToCodes(logging.Handler):
    def __init__(self, log: CodeLog) -> None:
        super().__init__()
        self._log = log

    def emit(self, record: logging.LogRecord) -> None:
        level = (
            "error"
            if record.levelno >= logging.ERROR
            else "warning"
            if record.levelno >= logging.WARNING
            else "info"
        )
        self._log.emit("library.log", level=level, name=record.name)


@contextmanager
def silenced(log_stream: IO[str] | None = None) -> Iterator[CodeLog]:
    """Run a job with every other output reduced to codes; yields the job's CodeLog."""
    sys.stdout.flush()
    sys.stderr.flush()
    saved_out, saved_err = os.dup(1), os.dup(2)
    stream = (
        log_stream
        if log_stream is not None
        else os.fdopen(os.dup(saved_err), "w", encoding="utf-8")
    )
    log = CodeLog(stream)
    devnull = os.open(os.devnull, os.O_WRONLY)
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    handler = _ToCodes(log)
    previous_showwarning = warnings.showwarning

    def showwarning(message: Any, category: type[Warning], *args: Any, **kwargs: Any) -> None:
        log.emit("library.warning", level="warning", name=category.__name__)

    previous_streams = sys.stdout, sys.stderr
    quiet = open(os.devnull, "w", encoding="utf-8")
    try:
        os.dup2(devnull, 1)
        os.dup2(devnull, 2)
        sys.stdout, sys.stderr = quiet, quiet
        root.handlers = [handler]
        root.setLevel(logging.INFO)
        warnings.showwarning = showwarning  # type: ignore[assignment]
        yield log
    finally:
        warnings.showwarning = previous_showwarning
        root.handlers, root.level = handlers, level
        quiet.flush()
        sys.stdout, sys.stderr = previous_streams
        quiet.close()
        os.dup2(saved_out, 1)
        os.dup2(saved_err, 2)
        os.close(devnull)
        os.close(saved_out)
        os.close(saved_err)
        if log_stream is None:
            stream.close()
