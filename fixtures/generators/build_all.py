"""Runs every Python fixture generator and, on request, records their files in the manifest.

    <python> -I -B fixtures/generators/build_all.py --out <folder>
    <python> -I -B fixtures/generators/build_all.py --out . --write-manifest

The first form runs the four generators into <folder> (a scratch folder, to compare). The second,
from the repository root, rewrites the committed fixtures and records each file in
fixtures/manifest.json with its generator, SHA-256, case ids and ground truth. Entries made by
other generators (fixtures/datasets/generate.ts, and any other) are kept as they are, in their
order; this driver's entries follow them, in a fixed order. The fixture-manifest check then runs
each generator into a temporary folder and compares the bytes.
"""

from __future__ import annotations

import sys
from pathlib import Path

GENERATORS = Path(__file__).resolve().parent
if str(GENERATORS) not in sys.path:
    sys.path.insert(0, str(GENERATORS))

import argparse  # noqa: E402
import hashlib  # noqa: E402
import importlib.util  # noqa: E402
import json  # noqa: E402
from typing import Any  # noqa: E402

from fixturelib.common import GENERATOR_VERSION, REPO_ROOT, json_text  # noqa: E402

MANIFEST = "fixtures/manifest.json"
IFC_GENERATOR = "fixtures/generators/ifc/demo_hotel.py"
IDS_GENERATOR = "fixtures/generators/ids/sovitech_ids.py"
PDF_GENERATOR = "fixtures/generators/pdf/companions.py"
XLSX_GENERATOR = "fixtures/generators/xlsx/companions.py"
DRIVER = "fixtures/generators/build_all.py"
GENERATORS_IN_ORDER = (IFC_GENERATOR, IDS_GENERATOR, PDF_GENERATOR, XLSX_GENERATOR)

SPEC = "fixtures/generators/ifc/spec/test.yaml"
LIBRARY = {
    "fixtures/generators/fixturelib/__init__.py": GENERATORS_IN_ORDER,
    "fixtures/generators/fixturelib/common.py": GENERATORS_IN_ORDER,
    "fixtures/generators/fixturelib/spec.py": (IFC_GENERATOR, IDS_GENERATOR),
    "fixtures/generators/fixturelib/step.py": (IFC_GENERATOR, IDS_GENERATOR),
    "fixtures/generators/fixturelib/ifc_model.py": (IFC_GENERATOR, IDS_GENERATOR),
    "fixtures/generators/fixturelib/perf.py": (IFC_GENERATOR,),
    "fixtures/generators/fixturelib/ids_model.py": (IDS_GENERATOR,),
    "fixtures/generators/fixturelib/pdf_tools.py": (PDF_GENERATOR,),
    "fixtures/generators/fixturelib/zip_tools.py": (XLSX_GENERATOR,),
}
DOCUMENTATION = ("fixtures/README.md",)

TOOLS_IFC = {
    "python": "3.12",
    "writer": "fixtures/generators/fixturelib/step.py (no IfcOpenShell: docs/adr/0018)",
    "PyYAML": "6.0.3",
}
TOOLS_PDF = {"python": "3.12", "reportlab": "5.0.1", "pillow": "12.3.0", "PyYAML": "6.0.3"}
TOOLS_XLSX = {"python": "3.12", "openpyxl": "3.1.5", "PyYAML": "6.0.3"}

IFC_CASES = {
    "fixtures/ifc/demo-hotel-arh.ifc": [
        "G4-11",
        "G8-2",
        "G8-11",
        "G9-6",
        "G12-2",
        "G12-5",
        "G13-4",
        "IFC-2",
        "IFC-3",
        "IFC-4",
        "IFC-5",
        "IFC-12",
    ],
    "fixtures/ifc/demo-hotel-mep-rev-a.ifc": [
        "G1-1",
        "G1-6",
        "G1-13",
        "G3-1",
        "G3-8",
        "G4-3",
        "G4-4",
        "G4-16",
        "G8-3",
        "G8-5",
        "G11-3",
        "G11-4",
        "G12-2",
        "G12-5",
        "G12-6",
        "G14-1",
        "G14-3",
        "IFC-1",
        "IFC-6",
        "IFC-7",
        "IFC-8",
        "IFC-9",
        "IFC-10",
        "IFC-14",
    ],
    "fixtures/ifc/demo-hotel-mep-rev-b.ifc": ["G4-13", "G4-14", "G12-5", "IFC-13"],
    "fixtures/ifc/demo-hotel-mep-ifc2x3.ifc": ["G12-5", "IFC-11"],
}
PDF_CASES = {
    "fixtures/pdf/memoriu-tehnic.pdf": ["G4-11", "G8-1", "G8-9", "G11-4"],
    "fixtures/pdf/tabel-suprafete.pdf": ["G8-2", "G8-3"],
    "fixtures/pdf/lista-echipamente.pdf": [
        "G1-1",
        "G1-6",
        "G3-1",
        "G4-3",
        "G4-4",
        "G8-3",
        "G8-5",
        "G8-6",
        "G11-3",
    ],
    "fixtures/pdf/plan-subsol.pdf": ["G3-1", "G14-2"],
    "fixtures/pdf/nota-proiectant.pdf": ["G14-1"],
    "fixtures/pdf/caiet-de-sarcini.pdf": ["G12-3"],
}
XLSX_CASES = {
    "fixtures/xlsx/tabel-camere.xlsx": ["G4-9", "G9-6"],
    "fixtures/xlsx/lista-echipamente.xlsx": [
        "G1-1",
        "G1-6",
        "G3-8",
        "G4-3",
        "G4-4",
        "G8-3",
        "G8-5",
        "G11-3",
    ],
}


def _load(relative: str) -> Any:
    path = REPO_ROOT / relative
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if spec is None or spec.loader is None:
        raise ImportError(relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _entries(out: Path) -> list[dict[str, Any]]:
    """Manifest file entries for everything the four generators write, in a fixed order."""
    from fixturelib.ids_model import IDS_PATH, expected_path
    from fixturelib.ifc_model import ground_truth_path

    entries: list[dict[str, Any]] = []

    def add(
        path: str, generator: str, cases: list[str], tools: dict[str, str], **extra: Any
    ) -> None:
        entry: dict[str, Any] = {
            "path": path,
            "sha256": _sha256(out / path),
            "generator": generator,
            "generatorVersion": GENERATOR_VERSION,
            "cases": cases,
        }
        entry.update(extra)
        entry["toolVersions"] = tools
        entries.append(entry)

    for model, cases in IFC_CASES.items():
        schema = "IFC2X3" if model.endswith("ifc2x3.ifc") else "IFC4"
        truth = ground_truth_path(model)
        add(
            model, IFC_GENERATOR, cases, TOOLS_IFC, groundTruth=truth, profile="test", schema=schema
        )
        add(truth, IFC_GENERATOR, cases, TOOLS_IFC, profile="test")
    add(
        IDS_PATH,
        IDS_GENERATOR,
        ["G12-6", "IFC-14"],
        TOOLS_IFC,
        profile="draft-reference-data",
        schema="IDS 1.0",
    )
    for model in IFC_CASES:
        add(
            expected_path(model),
            IDS_GENERATOR,
            ["G12-6"],
            TOOLS_IFC,
            profile="test",
            groundTruth=ground_truth_path(model),
        )
    for document, cases in PDF_CASES.items():
        truth = f"fixtures/pdf/ground-truth/{Path(document).stem}.json"
        add(document, PDF_GENERATOR, cases, TOOLS_PDF, groundTruth=truth, profile="test")
        add(truth, PDF_GENERATOR, cases, TOOLS_PDF, profile="test")
    for workbook, cases in XLSX_CASES.items():
        truth = f"fixtures/xlsx/ground-truth/{Path(workbook).stem}.json"
        add(workbook, XLSX_GENERATOR, cases, TOOLS_XLSX, groundTruth=truth, profile="test")
        add(truth, XLSX_GENERATOR, cases, TOOLS_XLSX, profile="test")
    return entries


def _sources() -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = [
        {"path": generator, "role": "generator"} for generator in (*GENERATORS_IN_ORDER, DRIVER)
    ]
    sources.append({"path": SPEC, "role": "generator-input", "usedBy": list(GENERATORS_IN_ORDER)})
    for path, users in LIBRARY.items():
        sources.append({"path": path, "role": "generator-input", "usedBy": list(users)})
    for path in DOCUMENTATION:
        sources.append({"path": path, "role": "documentation"})
    return sources


def write_manifest(out: Path) -> None:
    manifest_path = REPO_ROOT / MANIFEST
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    ours_generators = {*GENERATORS_IN_ORDER, DRIVER}
    ours_sources = {source["path"] for source in _sources()}
    kept_sources = [s for s in manifest["sources"] if s["path"] not in ours_sources]
    kept_files = [f for f in manifest["files"] if f["generator"] not in ours_generators]
    manifest["sources"] = [*kept_sources, *_sources()]
    manifest["files"] = [*kept_files, *_entries(out)]
    manifest_path.write_text(json_text(manifest), encoding="utf-8")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True)
    parser.add_argument("--write-manifest", action="store_true")
    args = parser.parse_args(argv)
    out = Path(args.out).resolve()
    for generator in GENERATORS_IN_ORDER:
        _load(generator).main(["--out", str(out)])
    if args.write_manifest:
        if out != REPO_ROOT.resolve():
            raise SystemExit(
                "--write-manifest records the committed files: "
                "run it with --out . from the repository root"
            )
        write_manifest(out)


if __name__ == "__main__":
    main()
