"""Generator of the draft SOVITECH IDS v0.1 and the expected model-check results (ifc-input 5.5).

    <python> -I -B fixtures/generators/ids/sovitech_ids.py --out <folder>

writes <folder>/fixtures/ids/sovitech-ifc-minimum-v0.1.ids (draft reference data, labelled so in
its info block) and one expected-results file per IFC fixture under
<folder>/fixtures/ids/expected/. The expected results are derived from the building spec
(fixtures/generators/ifc/spec/test.yaml) through the same model builder that writes the IFC
fixtures; they are not a checker's report (IfcTester is not used: owner decision 2026-09-26,
docs/adr/0018).

Validation of the IDS itself (prompt 3 section 12): against the IDS 1.0 XSD with lxml, offline, in
services/extractor/tests/test_ids_schema.py (the XSD, its source and SHA-256, and the stand-in for
the W3C schema it imports: services/extractor/schemas/README.md). The buildingSMART IDS-Audit-tool
is not run (a binary from GitHub), and IfcTester is not used, so the IDS model check waits (D-36).
"""

from __future__ import annotations

import sys
from pathlib import Path

GENERATORS = Path(__file__).resolve().parents[1]
if str(GENERATORS) not in sys.path:
    sys.path.insert(0, str(GENERATORS))

from fixturelib.common import parse_out, write_json, write_text  # noqa: E402
from fixturelib.ids_model import IDS_PATH, expected_path, expected_results, ids_text  # noqa: E402
from fixturelib.ifc_model import build_all  # noqa: E402
from fixturelib.spec import load_spec  # noqa: E402


def main(argv: list[str] | None = None) -> None:
    args = parse_out(argv, __doc__ or "")
    write_text(args.out, IDS_PATH, ids_text())
    for built in build_all(load_spec()):
        write_json(
            args.out,
            expected_path(built.path),
            expected_results(built.path, built.schema, built.facts),
        )


if __name__ == "__main__":
    main()
