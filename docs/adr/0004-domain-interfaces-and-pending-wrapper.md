# 0004. Domain interfaces for the first harness tests, and the pending wrapper

- **Status:** Accepted: default, reversible
- **Date:** 2026-09-25

## Context

`CLAUDE.md` and guardrails section 7 ("Until code exists") require the first change that touches data or AI to create the harness, starting with the field-state and evidence tests. R-156 names the first cases: field state G1-8, G4-1 and G4-15; evidence G1-4, G1-10 and G13-1. Prompt 3 phase 0 asks for these tests to be written against domain interfaces defined now. Each test stays out of the green run behind a pending wrapper that passes only while the code under test throws the domain's NotImplementedError. The wrapper fails on any other error, and it fails once the test passes. Sources: build-readiness 3 "Now" items 2 and 3; functions F-VALUE-02 to F-VALUE-04, F-EXTRACT-04 and F-EXTRACT-05. D id: D-33, the repository, the pending convention and CI. D-33 is open, so ADR 0003's no-stub interim applies. A pending case file is a real case file, and it is reported as "pending: no automated check yet", never as passing.

## Decision

1. **Types.** `@sovitech/domain` declares the types of guardrails 2.1, 2.3, 2.4, 2.6 and section 8 as readonly TypeScript types. Every closed list is a `const` array. `packages/domain/src/model.test.ts` checks each list against the text of `docs/guardrails.md`, so a guardrails change breaks the build until the domain follows it. `EvidenceLocator` holds `page`, `sheet`, `cell` and `bbox` only, and `DocumentRecord` has no model field, because ifc-input 6.2.1 and 6.2.2 are not approved.
   - **What the type test shows, and what it does not.** `packages/domain/src/model.test.ts` shows that a fresh object literal with an `ifc` key does not compile as an `EvidenceLocator`. It does not show that no IFC locator can be built. TypeScript checks excess properties only on fresh object literals: an object held in a variable, with an extra `ifc` key, still assigns to `EvidenceLocator`, and AI output parsed from JSON has no static type at all. (Corrected on 2026-09-25 after the phase 0 review, finding 25; the earlier wording said the test proves an IFC locator does not compile.)
   - **What will stop one.** Phase 2 validates every locator in `verifyProposal` with a strict runtime schema that rejects unknown keys, so a locator that names a GlobalId, STEP ids or a property path fails the locator check and is logged as `evidence_not_found`. The new case G1-13 (prompt 3, "New case ids"; indexed in phase 2) proves it. Until then no candidate is created from any locator: `verifyProposal` throws `NotImplementedError`.
2. **Derive.** The signature is `derive(field, candidates, events, context) -> FieldState`.
   - `events` is `{ candidate, field, document }`.
   - `context` supplies three things the field's own candidates and events cannot:
     - document records, for the stage order and `supersedes`;
     - the derived state of each input field, for provisional and stale (2.4);
     - dataset approval, for reference candidates (G1-12).
   - `FieldState` carries the state, the active candidate, each candidate's verification and status, the conflict with its route (rule 4), the provisional and stale flags, and status-line keys for 2.8. The wording of those lines lives in the status-line registry.
   - It also carries the review-step entry that the state alone decides: an open conflict (rule 4), or "Source document removed" (2.3).
3. **Evidence verifier.** `verifyProposal(proposal, context) -> ProposalVerdict` is one function for F-EXTRACT-04 and F-EXTRACT-05.
   - It runs rule 1's five checks, decides `document` or `ai_inference` (2.1), and applies the direct-count limit.
   - The rule 8 parser (`readQuantities`) and the extracted-text lookup (`textAt`) are injected, so the domain does not depend on the registry.
   - The document lookup may return another project's record: check 1 belongs to the verifier.
   - A rejection returns guardrail events: `evidence_not_found` for failed evidence checks, `ai_output_rejected` for inference limits.
4. **NotImplementedError** carries a feature name (`derive`, `verify-proposal`). `notImplementedFeature()` follows the `cause` chain, because fast-check reports property failures with the original error as its cause. Since the phase 0 review (finding 2) the errors are branded, so only a domain stub can throw one the wrapper accepts:
   - each stub claims its feature once, when the package loads, through `declareNotImplemented(feature)`, which returns the one function that throws for it (`field-state.ts` for `derive`, `evidence.ts` for `verify-proposal`); a second claim of the same feature throws, so nothing loaded after the domain can obtain a thrower;
   - the constructor refuses any caller without a module-private key, so `new NotImplementedError('derive')` in a case file throws a `TypeError`;
   - `notImplementedFeature()` accepts only instances recorded in a module-private `WeakMap` by that thrower, so a look-alike class, an object built from the prototype, or a copied `feature` property is never read as pending;
   - `DOMAIN_FEATURES` lists the features with a declared stub, and a unit test pins it to `declaredStubFeatures()`. When phase 1 builds `derive`, its `declareNotImplemented` call and `'derive'` in `DOMAIN_FEATURES` go together.
   - Since the phase 0 review round 2, the domain also counts every NotImplementedError each stub throws, caught or not, in a module-private record next to the `WeakMap`. Only the throwers raise it; `stubErrorCounts()` returns a frozen copy. It exists for the stub guard (decision 7).
5. **The pending marker and wrapper.**
   - The wrapper is `tests/guardrails/_support/pending.ts`, in the one support folder the index check and Vitest's `guardrails` project know (ADR 0003). The domain builder first placed it at `tests/support/pending.ts`; the integrator moved it there on 2026-09-25 and rewrote the 13 imports, because at the first path the index check classified the 13 files as real.
   - A pending case file's first line is `// @pending-until: phase <1-7> <feature>[, <feature>]`. `parsePendingMarker` in the domain is the one grammar, for the wrapper and for the index check. The index check counts a file as pending only when it imports the wrapper and carries a well-formed marker; either one alone, or a malformed marker, is a `[pending]` problem that fails the check, and the file still counts as pending, never as real (ADR 0003, "Conventions the index check enforces").
   - `pendingCase(import.meta.url)` reads the marker from the case file itself, so the marker and the behaviour cannot drift apart.
   - Each outcome maps to one result:
     - a NotImplementedError a domain stub threw, for a feature the marker names: skipped, with the note `pending: no automated check yet (<feature> is not implemented; phase <n>)`, and the wrapper's record (`sovitechPending`: case id, feature, phase) written into the test's meta (`tests/guardrails/_support/pending-note.ts`);
     - any other error, a self-created or look-alike error included: fails with that error;
     - a passing body: fails, naming the wrapper to remove.
   - A missing or malformed marker, a marker naming a feature no domain stub declares (`readPendingMarker`), or a title that does not name the file's id, fails the file at load. Bare `test.fails` is not used.
   - The guardrail run guard (`tools/vitest/guardrail-run-guard.ts`; ADR 0003) accepts a skipped guardrail test only with that meta record, that note word for word, and the marker and wrapper import in the file. Any other skip fails the run.
6. **Cases.** R-156's six cases, plus the derive and verifier cases whose Expected cell the phase 0 interfaces can state: G4-2, G4-9, G4-10, G4-14, G4-18, G9-2 and G2-2. That makes 13. The derive cases use fast-check properties where the case allows.
7. **The stub guard** (phase 0 review, round 2). A case written without the wrapper passed against the unbuilt stubs when it only asserted that the call throws (`expect(() => derive(...)).toThrow()`, or `.rejects.toThrow()` for `verifyProposal`), and counted as real; every case whose Expected cell is "Rejected" is naturally written that way. `tools/vitest/guardrail-stub-guard.ts`, a setup file of the `guardrails` Vitest project, reads the domain's stub count before and after each test. A test that reached a stub fails with `[stub] case exercises an unbuilt stub`, unless the pending wrapper held it out (its skip, with its record and note word for word). Stub errors thrown outside any test (at load, in a describe body, in `beforeAll`) count against every later test of the file. The guard writes its own record into each test's meta, and the run guard fails a passing test without it (`[unguarded]`) or whose record shows a stub error (`[stub]`). The index check also refuses `.toThrow()` and `.toThrowError()` naming no error (`[vacuous]`; ADR 0003). Limits: concurrent tests share one count and fail closed; a mocked domain throws nothing, so the index check's `[test double]` rule is the only line against `vi.mock` (ADR 0003); once a stub is built, a case that catches its own failures would pass, and review is the last line (`tools/vitest/README.md`).

## Consequences

- The 13 case files exist and hold real assertions. Vitest shows them as skipped, and the index check lists them as pending. None counts as a working check until its wrapper comes off.
- **When each wrapper comes off.** The wrapper fails as soon as the code under test passes, so a wrapper comes off in the phase that builds that code. The marker's phase is informational; the test's result is what enforces it.
  - G1-8, G4-14 and G4-15 test only the derive part, so they come off in phase 1, although prompt 3 lists them under phase 2.
  - G13-1 needs only check 1, so it comes off when check 1 is built (phase 1).
- **Verification on 2026-09-25**, run in the scratchpad, not in the repository:
  - **Reference implementation.** A throwaway implementation of `derive` and `verifyProposal` met all 13 cases, so the wrapper failed each one with "passes now".
  - **Mutants.** Twelve mutants were each caught by an assertion in their target case:
    - no conflict test: G4-1, G4-9, G4-10, G4-14, G4-18 and G9-2;
    - an adjacent-only comparison: G4-10;
    - tolerance ignored: G4-2;
    - absence read as not applicable: G1-8;
    - owner routing despite an `engineer_verified` candidate: G4-18;
    - a checked value superseded silently: G4-14;
    - provisional read from the candidate itself: G9-2;
    - no "Source document removed" line: G4-15;
    - no ownership check: G13-1;
    - no excerpt check: G1-4;
    - the proposed source trusted: G2-2;
    - an inferred quantity allowed: G1-10.
  - **Seeded misuse.** Thirteen seeded case files each gave the expected wrapper outcome: import error, missing export, wrong feature, lookalike error, passing body, missing or malformed marker, and wrong title. That first run was in the scratchpad. Since the phase 0 review (finding 16) the seeded misuse lives in the repository:
    - `tools/checks/index/pending-wrapper.test.ts` (unit project, 16 tests) covers every outcome of `runPendingBody` and `settlePending`, and loading a case file: a branded stub error is skipped with its note and record, also async and through fast-check; a wrong feature, a look-alike class, a self-created error, a prototype-forged object, another error, an import error and a passing body fail; a missing or malformed marker, a bad file name or title, and an undeclared feature fail at load. A mutation that makes the catch swallow every error fails 7 of the 16;
    - the real wrapper runs end to end in a child Vitest on seeded case files in `tools/vitest/seeded/run/` (self-thrown error, look-alike class, import error, wrong feature, passing body, missing marker), run by the unit tests and by `pnpm check:selftest`;
    - `packages/domain/src/not-implemented.test.ts` covers the brand, and the index check's self-test covers the import and marker pairing and a case file that throws the error itself (`tools/checks/index/seeded/{pending-without-marker,marker-without-wrapper,malformed-marker,pending-self-thrown}`).
  - **The stub guard** (decision 7) is proven by `tools/vitest/stub-guard.test.ts` and by four run seeds in `tools/vitest/seeded/run/`, each of which must fail with the stub guard's message: G2-11 (`toThrow()` on a stub), G2-12 (`rejects.toThrow()`), G2-13 (a stub reached at load and the error swallowed), G2-14 (a `_support/` helper that swallows the error). Without the stub guard each passes Vitest. The adversarial probes (G8-4 with both forms, G4-9 through a lenient helper) passed before and fail now.
  - **Not covered yet: a fast-check edge** (finding 16). When a property throws the stub's error for one input and fails an assertion for another, fast-check keeps one error, which may be the stub's, and the wrapper then skips the case. All 13 pending cases call the stub before any assertion, so every input throws the branded error. Phase 1 adds a `tests/guardrails/_support/` helper that wraps property predicates and rethrows any error that is not the stub's.
- Test-only field definitions and records are written inline in each case file. Phase 1 can move them into one builder file in `tests/guardrails/_support/`. That includes the in-memory `engineer_verified` events of G4-14 and G4-18 (prompt 3 section 14, item 3).

## How to reverse

- **One case.** When the code under test passes, delete the marker line, import `test` from `vitest` in place of `pendingCase`, and leave the assertions unchanged.
- **The whole mechanism.** Delete `tests/guardrails/_support/pending.ts` and `pending-note.ts`, `PENDING_MARKER_*`, `parsePendingMarker`, `declareNotImplemented` and `DOMAIN_FEATURES` in `packages/domain/src/not-implemented.ts`, the pending detection in `tools/checks/index/case-files.ts`, and the wrapper-skip acceptance in `tools/vitest/guardrail-run-guard.ts`. Only do this once no case file carries a marker.
- **Interfaces.** They are phase 0 declarations. Phase 1 and phase 2 may change a signature, and update the case files in the same change. An Expected cell's meaning never changes (guardrails section 10).
