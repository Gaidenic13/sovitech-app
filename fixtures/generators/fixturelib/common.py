"""Shared helpers for the fixture generators: paths, the TEST marking, deterministic output.

Every generator runs as ``<python> -I -B <generator> --out <folder>`` from the repository root
(tools/checks/fixture-manifest/manifest.ts, GENERATOR_RUNNERS) and writes each file to
``<folder>/<path in fixtures/manifest.json>``; ``--out .`` rewrites the committed files. Nothing
depends on the clock, the locale, the hash seed or the platform: ``-I`` ignores PYTHONHASHSEED,
so no output iterates over a set.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

GENERATORS_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = GENERATORS_DIR.parents[1]

GENERATOR_VERSION = "1"

# The TEST marking every fixture carries (build-readiness 2 "synthetic-fixtures"; prompt 3 5.4).
TEST_MARK_EN = "TEST FIXTURE: synthetic document of a fictitious building. Not a real project."
TEST_MARK_RO = "DOCUMENT DE TEST: document sintetic, cladire fictiva. Nu este un proiect real."
# The fictitious author and organisation (ifc-input 5.2).
AUTHOR = "SOVITECH fixture generator"
ORGANISATION = "Studio Exemplu SRL (fictitious)"
ORGANISATION_RO = "Studio Exemplu SRL (fictiv)"
PROJECT_NAME = "Demo Hotel Bucharest"


def parse_out(argv: list[str] | None, description: str) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--out", required=True, help="folder that receives fixtures/<path>")
    return parser.parse_args(argv)


def target(out: str | Path, relative: str) -> Path:
    """The file for a manifest path under the --out folder, with its folder created."""
    if not relative.startswith("fixtures/"):
        raise ValueError(f"{relative} is not under fixtures/")
    path = Path(out) / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def write_text(out: str | Path, relative: str, text: str) -> None:
    target(out, relative).write_bytes(text.encode("utf-8"))


def write_bytes(out: str | Path, relative: str, data: bytes) -> None:
    target(out, relative).write_bytes(data)


def json_text(data: Any) -> str:
    """JSON as the fixtures write it: two-space indent, UTF-8 kept, key order as built."""
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def write_json(out: str | Path, relative: str, data: Any) -> None:
    write_text(out, relative, json_text(data))
