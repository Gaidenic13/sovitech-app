"""Generator of the synthetic IFC fixtures (docs/ifc-input.md 5.2 and 5.3).

    <python> -I -B fixtures/generators/ifc/demo_hotel.py --out <folder>
    <python> -I -B fixtures/generators/ifc/demo_hotel.py --out <folder> --profile perf [--floors N]

The `test` profile (the default) writes the four models of ifc-input 5.2, each with its ground
truth, under <folder>/fixtures/ifc/. `--out .` from the repository root rewrites the committed
files; the fixture-manifest check runs it into a temporary folder and compares the bytes with
fixtures/manifest.json.

The `perf` profile scales the building up for the performance budgets (prompt 3 section 11) and
writes <folder>/fixtures/ifc/perf/demo-hotel-perf.ifc with a count summary. That folder is
git-ignored, never listed in the manifest and skipped by the fixture-manifest check.

Every model is TEST data: a fictitious hotel, fictitious people and organisations, invented
values. Nothing comes from a real building, the mockups, the specs' transcriptions of them or
company/ (guardrails rules 1 and 13).
"""

from __future__ import annotations

import sys
from pathlib import Path

GENERATORS = Path(__file__).resolve().parents[1]
if str(GENERATORS) not in sys.path:
    sys.path.insert(0, str(GENERATORS))

import argparse  # noqa: E402

from fixturelib.common import write_json, write_text  # noqa: E402
from fixturelib.ifc_model import build_all, ground_truth_path  # noqa: E402
from fixturelib.perf import PERF_DEFAULT_FLOORS, write_perf  # noqa: E402
from fixturelib.spec import load_spec  # noqa: E402


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True)
    parser.add_argument("--profile", choices=["test", "perf"], default="test")
    parser.add_argument("--floors", type=int, default=PERF_DEFAULT_FLOORS)
    args = parser.parse_args(argv)
    spec = load_spec()
    if args.profile == "perf":
        write_perf(spec, args.out, args.floors)
        return
    for built in build_all(spec):
        write_text(args.out, built.path, built.text)
        write_json(args.out, ground_truth_path(built.path), built.ground_truth)


if __name__ == "__main__":
    main()
