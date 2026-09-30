# services/extractor

The SOVITECH extractor: one stored document per job, read inside the sandbox, one extraction output
out (the contract in `src/sovitech_extractor/contract/`, generated from
`packages/extraction-contract/src/extraction-contract.schema.json`; ADR 0022). Decisions and
measurements: `docs/adr/0024-extractor-pipeline.md`; dependencies and the image:
`docs/adr/0018-extractor-dependencies-and-sandbox-image.md`.

What it never does (prompt 3 section 6): parse a number out of text (the one rule 8 parser is in
`packages/registry`), map PDF or XLSX content to fields (the AI proposes, the API verifies), or
write the database. Its logs carry codes, GlobalIds and STEP ids only (guardrails rule 13).

## Run it

```sh
pnpm setup:py                                   # the venv, from the hashed lock
services/extractor/.venv/bin/pytest -q services/extractor/tests   # the tests
docker build --target extractor -t sovitech-extractor:dev services/extractor   # the sandbox image
```

One job, outside the sandbox (development only):

```sh
python -I -m sovitech_extractor --request request.json --document <file> --out <folder>
```

In the sandbox, the worker runs the command `sovitech_extractor.sandbox.docker_argv` builds: no
network, read-only root and input, dropped capabilities, 4 GB, 256 processes, a no-exec /tmp, one
writable output folder, killed at the wall clock. Shared folders must be where the Docker machine
mounts them (with Colima, under the home folder); the output folder must be writable by uid 10001.

Exit status: 0 `output.json` written; 2 request refused; 3 job refused (a content hash that does
not match the file, a dataset or IDS the request names but nobody mounted); 4 internal error.

## What it reads

| Format (from the content) | Output |
|---|---|
| PDF with a text layer | Text blocks per line, with anchor ids, character boxes and hidden-text flags; pages with no text layer, or past the limits, listed as not read; "Partly analysed" when any page was not read |
| PDF with no text layer anywhere | Stored: "Not analysed: PDF scan stored, not analysed" |
| XLSX | Every sheet and cell: the value as stored, the number format as written, the formula as written; hidden cells flagged; sheets not read listed with the reason |
| IFC | Not read here: the IFC reader's (`packages/ifc-reader`, web-ifc; ADR 0031). The worker sends it every IFC job; an IFC job sent here is refused (`job.ifc_read_by_ifc_reader`, exit 3) |
| RVT, DWG, DOCX, JPG, PNG, ZIP | Stored with their word (G12-1); nothing extracted, nothing inside an archive read |
| Anything else | `other`, failed with its reason |

IFC models are read by the IFC reader on web-ifc since the owner's decision of 2026-09-26 ("web-ifc
instead"; ADR 0018, ADR 0031): IfcOpenShell and IfcTester are not used. What stays here of IFC is
the in-house STEP text reader, `src/sovitech_extractor/ifc/step.py`, the reader of word-for-word
excerpts that the IFC reader's TypeScript copy is checked against (`tests/test_step_text_parity.py`,
over `packages/ifc-reader/src/step-text-corpus.json`).

## Layout

| Path | What |
|---|---|
| `src/sovitech_extractor/cli.py`, `__main__.py` | The entry point |
| `src/sovitech_extractor/extract.py` | One job: the hash check, the format, the reader, the output |
| `src/sovitech_extractor/formats.py` | The format from the content |
| `src/sovitech_extractor/pdf_reader.py`, `xlsx_reader.py` | The PDF and XLSX readers |
| `src/sovitech_extractor/ifc/step.py` | The in-house STEP text reader (word-for-word excerpts; the IFC reader's is its TypeScript copy) |
| `src/sovitech_extractor/instructions.py` | Text that addresses the reader (rule 14) |
| `src/sovitech_extractor/output.py` | Readings to the contract's output |
| `src/sovitech_extractor/logs.py` | Codes-only logging |
| `src/sovitech_extractor/sandbox.py` | The sandbox command and runner, for this image and the IFC reader's (`IFC_READER`) |
| `src/sovitech_extractor/contract/` | The generated contract (not edited here) |
| `tests/` | Unit and fixture tests; extractor-level guardrail halves are titled with their case ids |
