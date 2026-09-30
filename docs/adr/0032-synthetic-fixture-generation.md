# 0032. Synthetic fixture generation: a STEP writer instead of ifcopenshell.api, no zlib, a pinned environment

- **Status:** Accepted: default, reversible
- **Date:** 2026-09-26

## Context

- **Prompt 3 section 8, "Fixtures"** (ifc-input 5.2 to 5.5): a deterministic generator; the four IFC files (ARH, MEP rev A, MEP rev B, an IFC2X3 copy), the draft IDS v0.1 and its expected results, the companion PDF and XLSX files, and `fixtures/manifest.json` with hashes; CI regenerates and compares. For byte-identical output: reportlab's invariant mode, fixed `created` and `modified` document properties in openpyxl, and zip entries rewritten with a fixed `date_time`. A `perf` profile, git-ignored (`fixtures/ifc/perf/`), skipped by the fixture-manifest check.
- **ifc-input 5.2** names `ifcopenshell.api` as the IFC authoring tool. IfcOpenShell 0.8.5's PyPI wheels bundle CGAL packages under the GPL (ADR 0018, "The stop"), and the owner decided on 2026-09-26 that IFC is read with web-ifc instead ("web-ifc instead (Recommended)"): IfcOpenShell is not used anywhere, generators included.
- **Build-readiness 2**, the `synthetic-fixtures` skill; **rule 13** ("Fixtures are synthetic"); prompt 3 section 14, item 3 (no mockup or company figure in fixtures). No PRD D row decides the fixture method; the 5.2 defaults apply.
- Written by the phase 2 integrator from the fixtures builder's draft, which named no ADR number because parallel builders held 0022 and 0023.

## Decision

1. **Where the generators live:** `fixtures/generators/` (ifc-input 5.2's layout): `ifc/demo_hotel.py` (the four models and their ground truth, and `--profile perf`), `ids/sovitech_ids.py` (the draft IDS v0.1 and the expected results), `pdf/companions.py`, `xlsx/companions.py`, and `build_all.py`, which runs the four and, with `--write-manifest`, records them in `fixtures/manifest.json`, keeping every entry another generator made. Shared code is `fixtures/generators/fixturelib/`. They run with the extractor venv's Python (`requirements-fixtures.lock`, ADR 0018), or in the `fixtures` target of the extractor image.
2. **One building spec** (`fixtures/generators/ifc/spec/test.yaml`) is the single source every generator reads, and each generator writes its ground truth from it.
3. **IFC is written by `fixturelib/step.py`,** a small ISO 10303-21 writer with per-schema attribute tables for the IFC4 and IFC2X3 entities the fixtures use; it checks each entity's attribute count as it writes. GlobalIds are uuid5 over a fixed namespace and a stable key, so rev A, rev B and the IFC2X3 copy share them. Strings use the `\X2\` escape; reals are written from decimal text. Instance ids start at 100001, so no STEP reference reads as a figure the mockup and company figure checks list.
4. **PDFs:** reportlab in invariant mode, page compression off, the standard fonts only, and `SOURCE_DATE_EPOCH` pinned inside the generator (reportlab reads it before its invariant date: a near miss, now a seeded bad input of the fixture-manifest check). Scanned pages are 1-bit images written with RunLengthDecode and ASCIIHexDecode, so no zlib output enters any fixture.
5. **XLSX:** openpyxl written through its `ExcelWriter`, so `modified` stays fixed; the zip is repacked with stored entries, a fixed `date_time` and fixed attributes; formula cells carry their cached value.
6. **Perf output** (`fixtures/ifc/perf/`, 101 MB at the default 184 floors by 120 rooms) is git-ignored and never listed in the manifest.
7. **Regeneration:** the fixture-manifest check (in `pnpm check` and CI's checks job) runs every generator into a temporary folder with a restricted environment and compares each listed file with its SHA-256; CI's `fixtures:regenerate` job runs the Python generators twice and compares both runs with each other and with the committed files; locally, `pnpm fixtures:regenerate` does the same with the venv and `pnpm fixtures:sandbox` in the fixtures image with no network, a read-only root and every capability dropped (`tools/regenerate-fixtures.ts`).

## Consequences

- No fixture depends on zlib's output, so the bytes are the same on every platform. Checked: macOS arm64 and Linux aarch64 (the no-network fixtures image) give byte-identical files, twice each (phase 2 integrator, 2026-09-26). linux/amd64 has not been run.
- **The IFC files are not schema-validated by a schema validator.** Their attribute counts, references and GlobalIds are checked against hand-written tables (the generator's own, and independently by `services/extractor/tests/test_fixture_generators.py`), and the IFC reader reads each instance with web-ifc and with its STEP text reader and takes it only when both agree (ADR 0031). An attribute-order mistake that both tables share would not be caught. No IfcOpenShell validator runs (the owner's decision).
- The expected IDS results are derived from the spec with IDS 1.0 semantics, not recorded from IfcTester, which is not used; the IDS model check waits (D-36).
- The PDFs carry no Romanian diacritics: the standard fonts' WinAnsiEncoding lacks ă, ș and ț, and the one bundled TrueType font lacks them too. The IFC and XLSX files carry both the comma-below and cedilla forms.
- `docs/ifc-input.md` 5.3 gives a figure from the mockups for CH-01's capacity, and G8-1's and G8-2's case texts use a listed figure; the fixtures use other synthetic figures (a product doc issue in the build log).

## How to reverse

- **Author IFC with `ifcopenshell.api`** only if the owner reverses the decision on IfcOpenShell (ADR 0018, "How to reverse"): write from the same spec, keep the uuid5 keys so the GlobalIds survive, and diff the ground truth.
- **Diacritics in PDFs:** embed a TrueType font with Romanian glyphs, once one is approved.
- **Compression:** re-enable it only with a zlib pinned identically on every platform, and re-check the two platforms.
