# 0025. Document storage, the document list and the erasure job

- **Status:** Accepted: default, reversible
- **Date:** 2026-09-26; amended 2026-09-30 (the phase 2 review: decisions 4, 5 and 7)

## Context

- **Prompt 3 section 10, phase 2, "Uploads" and "Documents":** the storage root outside the repository (`SOVITECH_DATA_DIR`, by default the application-support folder); every file and derived file under `<projectId>/<contentHash>/`; `DocumentRecord` with kind, stage, revision and supersedes; declared revisions, withdrawal and deletion (G4-13 to G4-15); the erasure job, derived files included.
- **Guardrails v1.6:** 2.3 (DocumentRecord and DocumentEvent), 2.8 (status lines; the G12-1 wording), rule 12 (coverage by code; "not analysed" is never "not found"), rule 13 (documents stay with their project; erasure; logs never hold document text).
- **ifc-input 6.2.14** (IDS results on the engineer's view only) and **6.2.16** (derived files erased with their document): proposals, not applied. Prompt 3 asks for the stricter reading of both, each with a blocking test named after its proposal.
- **ADR 0015:** the one audited erasure, `sovitech.erase_document`, removes a document's text and excerpts and withdraws what only it supported. It knows nothing of files on disk.
- **ADR 0019:** the chunk protocol; **ADR 0022:** the extraction contract (coverage, findings, the IFC model record); **ADR 0026:** the analysis queue.

## Decision

1. **The storage root** is `SOVITECH_DATA_DIR` when set, else `~/Library/Application Support/SOVITECH App/data` (macOS), `$XDG_DATA_HOME/sovitech-app/data` or `~/.local/share/sovitech-app/data` (Linux). A relative path, or a path inside the repository, is refused at start (`DataDirectoryError`). The folder is created owner-only.
2. **The layout** (`apps/api/src/storage/file-store.ts`), every name checked against a pattern before a path is built:
   - `<root>/<projectId>/<contentHash>/original`: the stored bytes;
   - `<root>/<projectId>/<contentHash>/derived/<name>`: derived files (none written yet; the phase 4 conversion writes here);
   - `<root>/<projectId>/<contentHash>/work/<jobId>/`: one analysis job's request and output, removed when the job ends;
   - `<root>/<projectId>/staging/<uploadId>`: an upload in flight.
   The same bytes in two projects are two copies (rule 13, G13-4); nothing is shared across projects.
3. **What the store keeps about a file** (migration 0010, append-only and guarded like every table of schema `sovitech`):
   - `document_files`: the format the upload was accepted as and its size. **No file name:** the name is owner text, stored as the document text part `file:name:<documentId>`, so the one erasure removes it.
   - `document_findings`: rule 14 findings (embedded instruction, hidden text, schema error, hidden content), each a kind, a code and a locator, never text.
   - `document_model_records`: the engineer-only record of an IFC model (declared schema, IfcProject GlobalId, classes present, processing outcome, schema check, IDS results as spec ids, counts and failing GlobalIds). The authoring tool is header text, stored as the part `ifc:header:authoring_tool`.
   - A guard trigger (`sovitech_guard.ingestion_record_written`) allows each table only its writer: the document's creator for its file row, the project's system member for findings and model records, and none of them for an erased document (SVE11).
4. **A new document** is registered with kind `other` and stage `unknown`: the upload does not say what the document is, and the stage stays unknown until a document states it (rule 1; ifc-input 6.2.2). PDF and XLSX are queued for analysis (`queued`, coverage `pending`); an IFC model is `stored_only` with "IFC model" and, until the owner decides D-01, never queued (below); RVT, DWG, DOCX, JPG, PNG and ZIP are `stored_only` with their G12-1 word and never queued. **Amended in the phase 2 review (the orchestrator's ruling):** PRD R-023 and R-024 read, "Until decided", "Not built: no model is read", stricter than prompt 3 5.2's parsing default, and prompt 3 section 4 follows the stricter line. So the live app reads no model, not even for the engineer's record or its rule 14 findings: no reader job is queued for a model, and the worker ends a model's job that reaches it anyway with the code `model_reading_not_decided`, reading nothing (`apps/api/src/documents/model-reading.ts`; `tests/api/ifc-models-stored-only-until-d01.test.ts`). The IFC reader and the dispatch stay built, proven in tests through a switch only a test can make (`readModelsForTests()`, issued inside the Vitest runner alone; no setting or environment variable makes it). When the owner decides D-01, the switch becomes the decision's.
5. **Coverage is stored as a short text the code writes and reads** (`apps/api/src/documents/coverage.ts`): `pending`, `pages <ranges> of <n>`, `sheets <ranges> of <n>`, `stored: <word>` or `none`. The status line is chosen from it by code (2.8): "Partly analysed (x of n pages)", "Not analysed: <file type> stored, not analysed", "Analysis failed". Only read ranges of active, analysed or partly analysed documents can count as searched (`readCoverage`, the upper bound; G12-4, G12-5), and a "not found" statement about a field counts only what a completed AI run searched for it there (`searchedCoverage`, amended 2026-09-30; ADR 0027 decision 10; G12-8): with no AI run, nothing. A workbook with a sheet not read is stored `partly_analysed` in sheets (the extraction contract's `partlyAnalysedUnit`, ADR 0022; G12-9); its owner-facing line waits for P-2-XLSX-SHEETS, so its row shows its coverage.
6. **The owner's list** shows each document not withdrawn or erased with its file name, format, stage, revision when recorded, and its status line. It never shows a model-check line, a schema line, a finding, an IDS result or a count (ifc-input 6.2.14, stricter reading; `tests/api/ifc-input-6.2.14-ids-results-engineer-view-only.test.ts`). The engineer's record of a model is a separate route that requires the engineer role.
7. **Deletion is the erasure job** (`deleteDocument`): in one request, the owner's `withdrawn` event (`owner_deleted_document`) and `sovitech.erase_document` (role owner); a queued analysis of the document is cancelled. After the commit, the whole `<projectId>/<contentHash>/` folder is removed, derived files included (ifc-input 6.2.16, stricter reading; `tests/api/ifc-input-6.2.16-derived-files-erased.test.ts`), and the API checks that no file keyed to that hash is left; if one is, it logs `erasure_files_left` (a code) and answers 409. **One exception:** when another document of the same project, not erased, holds the same bytes, the folder stays, because that document still cites it; so does the text of those bytes, but the erased document's own file name (`file:name:<documentId>`, owner text) always goes (migration 0011, phase 2 review; `packages/db/src/erasure-names.test.ts`).
8. **Declared revisions** (G4-13 to G4-15): the owner or the engineer declares that one document is a revision of another; the domain's `documentStatuses` derives superseded and withdrawn states from the events. Nothing is inferred from file names.
9. **Every route is scoped to the project** by the requesting user's own request (row-level security); a project the user cannot see answers 404, never 403, so its existence is not disclosed.

## Consequences

- An interrupted erasure (a crash between the commit and the file removal) leaves a folder no active document holds. `removeUnheldFiles` removes such folders; the worker's sweep does not call it yet (listed for the integrator).
- The kind `other` placeholder means no document kind is shown until classification exists; the PRD's document kinds are not set by the upload.
- The coverage text is a small grammar of its own; a change to it changes `coverage.ts` and its tests only.

## How to reverse

- **To object storage:** replace `FileStore` behind the same method names; the keys stay `<projectId>/<contentHash>/...`.
- **To the looser readings of 6.2.14 and 6.2.16**, if the approver declines the proposals: that is a loosening (guardrails section 10) and needs the approver's approval; the two blocking tests name the proposals so the change is visible.
