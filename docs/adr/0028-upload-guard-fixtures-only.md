# 0028. The upload guard: this development build stores fixtures only

- **Status:** Accepted: owner decision 2026-09-25
- **Date:** 2026-09-26

## Context

- **Prompt 3 section 13 item 2:** no malware scanning exists yet, and the local development app must not become a place where real owner documents are stored before one does (rule 13: owner documents never enter the repository, tests, evals or prompts).
- **The owner's answer, 2026-09-25:** "Yes, fixtures only (Recommended)". The local development app accepts only uploads whose content hash is in `fixtures/manifest.json`, the generated synthetic fixtures, and refuses any other file with a clear message.
- **ADR 0019** fixes where the guard sits in the chunk protocol: on the completed file's hash, before anything is stored or registered.

## Decision

1. **`fixtureUploadGuard(repositoryRoot)`** (`apps/api/src/uploads/fixture-guard.ts`) reads `fixtures/manifest.json` once, through `packages/ai`'s `loadFixtureManifest`. A missing or unreadable manifest accepts nothing (it fails closed).
2. **On completion** (`completeUpload`) the staged file is hashed; a hash not in the manifest is refused with HTTP 422, code `not_a_fixture` and the message "This development build stores only the synthetic test files listed in fixtures/manifest.json. This file was not stored." The staged bytes and the upload session are deleted, no document is registered, and the refusal is logged as `upload_refused` with the project id and upload id only, never the file name or any content.
3. **The guard is the owner's decision, not a guardrail.** It blocks a person, which rule 7 does not allow for a guardrail; the owner chose it for the development build. The Continue button is not blocked by it: the refused file is simply not stored.
4. **Tests** use the real guard (`tests/api/uploads.test.ts`: a fixture is stored, a non-fixture is refused with the message and leaves no file, row or session). Cases that need other bytes pass their own guard to `startTestApi`.

## Consequences

- A person trying the local app with a real document sees the message, and the refused file, its staged bytes and its upload session are deleted at once.
- An upload abandoned before its completion never reaches the guard: its staged bytes (whatever they are) and its file name stay in the project's staging folder and its upload session until the sweep removes them, 30 minutes after its last chunk, when the API next opens an upload, and in any case at the worker's own sweep (ADR 0019, ADR 0026 decision 5; corrected in the phase 2 review, which found "nothing is kept" untrue for abandoned uploads).
- The stored original is exactly the bytes whose hash the guard checked: the completion stores a sealed copy of the declared bytes, made while they are hashed, and no second append can run while it does (ADR 0019, "One writer at a time"; the phase 2 review's upload hash race).
- The guard runs after the transfer, so a refused upload has spent its transfer.

## How to reverse

- Only the owner can lift it, and only once malware scanning (or another control the owner accepts) exists. Replace `fixtureUploadGuard` in `apps/api/src/index.ts` with the new guard; the `UploadGuard` interface stays.
