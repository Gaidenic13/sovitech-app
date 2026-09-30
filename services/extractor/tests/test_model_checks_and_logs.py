"""Nothing else prints while a job runs: the extractor's own log lines are its only output.

While a job runs, text a native library writes to the process's standard output or standard error
never leaves it: the extractor's own log lines are the only output, and they carry codes
(guardrails rule 13; prompt 3 section 8).

The model checks this file held for IFC (ifcopenshell.validate and IfcTester, withheld) are gone
with the IFC data pass: the owner's decision of 2026-09-26 ("web-ifc instead"; ADR 0018, ADR 0031)
moved IFC to the IFC reader, which uses neither; the IDS model check waits (D-36).

Ids: rule 13.
"""

from __future__ import annotations

import io
import json
import logging
import os
import warnings

import pytest

from sovitech_extractor.logs import silenced


def test_nothing_a_library_prints_leaves_a_running_job(capfd: pytest.CaptureFixture[str]) -> None:
    stream = io.StringIO()
    with silenced(stream) as log:
        os.write(1, b"TEST secret text a native library printed\n")
        os.write(2, b"TEST secret text on standard error\n")
        print("TEST secret text from print")
        logging.getLogger("some.library").warning("TEST secret text in a log message")
        warnings.warn("TEST secret text in a warning", UserWarning, stacklevel=1)
        log.emit("job.started")
    captured = capfd.readouterr()
    assert "secret" not in captured.out + captured.err
    lines = [json.loads(line) for line in stream.getvalue().splitlines()]
    assert lines == [
        {"level": "warning", "code": "library.log", "name": "some.library"},
        {"level": "warning", "code": "library.warning", "name": "UserWarning"},
        {"level": "info", "code": "job.started"},
    ]
    print("after the job")
    assert "after the job" in capfd.readouterr().out
