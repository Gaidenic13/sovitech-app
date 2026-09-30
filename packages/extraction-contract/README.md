# @sovitech/extraction-contract

The JSON contract between the Python extractor (`services/extractor`) and the API (`apps/api`), and the strict runtime shape of `Evidence.locator` that the evidence verifier reads. Prompt 3 sections 6 ("services/extractor") and 8 ("Output per file"); ADR 0022.

## One source, two languages

| File | What it is |
|---|---|
| `src/extraction-contract.schema.json` | **The source.** JSON Schema 2020-12, in the subset `src/generator/subset.ts` accepts |
| `src/generated/zod.ts`, `src/generated/annotations.ts` | Generated: one strict zod schema and one type per def; the version, the invariant ids and the rule tables |
| `services/extractor/src/sovitech_extractor/contract/_generated.py` | Generated: a frozen dataclass per object def, a type alias per scalar, enum and union def |
| `services/extractor/src/sovitech_extractor/contract/schema.json` | Generated: a byte copy of the source, which the Python validator reads (the extractor image copies only `services/extractor/src`) |

Change the schema, then run `pnpm --filter @sovitech/extraction-contract generate`, `pnpm test:py` and `pnpm test`. `src/generator/generate.test.ts` fails when a generated file differs from what the generator writes now.

The loader refuses every keyword outside the subset (open objects, `format`, `allOf`, unanchored patterns, `\d`-style classes, inline unions, and so on), so neither language can silently ignore a rule the other applies. Rules JSON Schema cannot state are **invariants**, named in the schema (`x-invariants`) and implemented once per language (`src/invariants.ts`, `contract/_invariants.py`); each side's tests fail when an id has no implementation. The rule tables the invariants read (`x-format-rules`, `x-mechanism-rules`, `x-ifc-locator-keys`) are schema data, read by both.

**Parity.** `src/samples/corpus.json` holds valid values of the three entry points and invalid ones (a valid value plus a patch), each with its expected verdict: `valid`, `schema`, or the invariant ids it breaks. `src/contract.test.ts` and `services/extractor/tests/test_contract.py` read the same file and must reach the same verdicts; both check that every valid value survives the round trip unchanged (Python also through JSON text).

## Entry points

| Def | Direction | Parsed by |
|---|---|---|
| `ExtractionRequest` | API to extractor | `parseExtractionRequest` / `parse_request`, `dump_request` |
| `ExtractionOutput` | extractor to API | `parseExtractionOutput` / `parse_output`, `dump_output` |
| `EvidenceLocator` | the AI and the verifier | `parseEvidenceLocator` / `parse_evidence_locator` |

Strict is the only mode: an unknown key is refused at every level. A problem is a JSON Pointer and a code (`unknown_key`, `ifc_field`, `type`, `value`, `pattern`, `length`, `range`, `items`, `unique`, `union`, `invariant:<id>`), never a value or a key the input chose (rule 13). `outputAnswersRequest` / `output_answers_request` check that an output answers its request.

## What the output carries

| Part | Content | Rules |
|---|---|---|
| `job`, `format` | project id, document id, the content hash of the bytes read; the format by content | the IFC schema is in `ifcModel.header.schema` |
| `analysis` | `analysed`; `partly_analysed` with pages read and total; `stored_only` with the word for the G12-1 slot; `failed` with a code | 2.8 lines only. An IFC file is always `stored_only`, "IFC model" (G12-5) |
| `coverage` | pages read and not read (with why), sheets read or not (with why), IFC classes read and parts not read (engineer only) | rule 12; F-INGEST-05 |
| `pdf` | per read page: media box, rotation, text blocks with anchor ids, bboxes, character boxes (code-point offsets), hidden-text reasons, layer | raw text; a hidden block needs a `hidden_text` finding and is left out of `evidenceTexts` (rule 14) |
| `xlsx` | per sheet: visibility, cells with the cached value as stored (`raw`), its type, the number format, the formula as written, hidden reasons; merged ranges | no number is read out of a cell; hidden cells as for PDF |
| `ifcModel` | engineer-only record (R-023, F-IFC-01, F-IFC-09): header as written, classes present, processing outcome, schema-check outcome, IDS results (spec ids, counts, failing GlobalIds; never report text) | never a value, evidence, owner line, count or task; readable while `ifc-values` is closed |
| `ifcValues` | **sealed**: IFC facts (IFC locator: content hash, schema, GlobalId, STEP ids, path; the typed STEP literal as its token; the declared unit as written; the verbatim STEP excerpt) and table-driven candidate proposals, each with its mechanism, datasets and the gates it waits for | read only through `openIfcValues` |
| `findings` | `embedded_instruction`, `hidden_text`, `schema_error`, `hidden_content`: a code and a location, never text | engineer items; create no state (rule 14; G14-3) |
| `derivatives` | viewing files: kind, `<projectId>/<contentHash>/derived/<name>`, SHA-256, media type, producer, storey or page | keyed by project id plus content hash (G13-4); never evidence |

No engineering value is a JSON number. The JSON numbers are page numbers, character offsets, STEP instance ids, IDS counts, PDF coordinates and job limits; a test pins that list.

## The seal (`ifc-values`)

Under guardrails v1.6 `Evidence.locator` has no IFC field (ifc-input 6.2.1 is a proposal), so no value read from a model can be stored (G1-13, G12-5). `parseExtractionOutput` returns the IFC section as an opaque handle whose JSON is `{"sealed":"ifc-values"}`. `openIfcValues(handle, gateSource)` reads `ifc-values` through the registry's one gate function and returns nothing while it reads closed; while it reads open, it returns the facts and only the proposals whose own gates all read open (the mechanism's gates from `x-mechanism-rules`, plus those the proposal declares), listing the rest with the gates that hold them. In production every gate is closed; the open path is exercised only in `tests/proposed/extraction-contract-ifc-values.test.ts`, through the test-utils override.

The request mirrors it: `ifcValues` is false while the gate is closed, and then `datasets` must be empty, so no mapping table is consulted (PRD R-027, "Until decided").

## The per-line IFC section (TypeScript only; ADR 0034)

A large model's IFC section does not fit one JSON text (the `perf` model's gave `output.too_large`). So when a request asks for IFC values of a model (`ifcValuesStreamExpected`), the IFC reader writes `output.json` as lines: the output without its section (an ordinary `ExtractionOutput`), the stream header (`ifcValuesStream`: `section` `present` or `absent`, and how many statements, facts and proposals follow), each quoted STEP statement once, the facts without their locator's content hash and schema and without their excerpt (rebuilt from their statements), and the proposals. `ifcValuesStreamLines` writes them one at a time; `readIfcValuesStream` reads them one at a time from the parsed lines the API hands it, checks each (its kind in order, its schema from the generated defs, the invariants for its part, and the form's own `stream:*` checks and counts), and returns the output with the section sealed as above. It takes no line while `ifc-values` reads closed or while the request asked for no IFC values. No line is longer than `IFC_VALUES_LINE_MAX_BYTES` (1 MiB). The Python extractor has no IFC role (ADR 0031), so neither the shared schema nor the Python side knows the form; its numbers are STEP instance ids and the header's line counts.

## Evidence.locator (G1-13)

`parseEvidenceLocator` accepts `{ page, bbox? }` or `{ sheet, cell? }` and nothing else. A key that would carry an IFC locator (`x-ifc-locator-keys`: `ifc`, `globalId`, `globalIds`, `guid`, `stepId`, `stepIds`, `step`, `path`) is refused with `ifc_field` at that key, so the verifier can log `evidence_not_found` with the reason; any other unknown key with `unknown_key`. A PDF bbox is `[left, bottom, right, top]` in the PDF page space PDFium reports. Whether the locator exists in the stored document is the verifier's next check: a sheet or page that encodes a GlobalId or a property path names nothing the extracted text holds, and an IFC file has no extracted text (`evidenceTexts`).

## Versioning

`x-contract-version` (1.0.0) is a `const` in both entry points' `contractVersion`, so a producer and a consumer of different versions refuse each other's JSON. Bump it with any change to what a valid value may hold.
