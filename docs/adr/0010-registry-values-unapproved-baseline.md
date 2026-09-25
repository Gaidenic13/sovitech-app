# 0010. Registry values in "unapproved baseline v0"

- **Status:** Proposed
- **Date:** 2026-09-25 (exception lists added 2026-09-25, after round 2 of the phase 0 review)

## Context

- **Prompt 3 section 5.2, row "Registry values the guardrails leave to the approver or to SOVITECH engineers"** (source ids: guardrails rules 3, 4, 5, 7 and 8; section 10). Its default: the strictest value, never an invented one. No tolerance on any field, so any difference is a conflict. No `plausible` range in the production registry: the plausibility check waits for SOVITECH ranges (cases use TEST entries). Estimation `allowed` only where the guardrails name an estimated method (points, CAPEX and consumption in 2.1; savings, payback and ROI in rule 10), `forbidden` elsewhere. `confirmBy` engineer unless rule 3 names the owner. Criticality `required` only for the four step 1 fields and `first_estimate` only for the proposed set. The confirmation budget N = 7, the calibration threshold of 10% over 50 decisions and the first-estimate set, each labelled "proposed" as the guardrails label them. The first snapshot is "unapproved baseline v0", and this ADR's status is "Proposed".
- **The rules behind each value** (`docs/guardrails.md` v1.5):
  - rule 3: who confirms (`confirmBy`: the owner for identity, use and occupancy, whether the building has something, and their own choices; an engineer for technical facts), and the calibration threshold "set by the approver (proposed: 10% over the last 50 decisions)";
  - rule 4: tolerances ("Counts … have zero tolerance unless the registry states a reason"; "Widening a tolerance is a loosening") and the order of document stages ("The approver confirms this order");
  - rule 5: the confirmation budget ("The approver sets N (proposed: 7)");
  - rule 7: the closed list of required fields (project name, project type, city, country; "Adding to the list needs approval") and the first-estimate set ("The approver confirms the set");
  - rule 8: plausible ranges ("A value outside its field's plausible range … becomes Please check");
  - rule 6: the identity list ("Today the list holds only the project name. Adding to it is a loosening");
  - section 10: what counts as loosening (a wider tolerance, estimation from forbidden to allowed, a lower criticality, `confirmBy` moved from engineer, an identity field, a reference dataset, a raised budget, a lower calibration threshold), who approves, and "Versioning" (CI compares these properties with the last approved snapshot).
- **PRD section 15, D rows** (none decided as of 2026-09-25):
  - **D-05**, name the approver and accept v1.5 as the baseline: until it is decided, no value here can be approved;
  - **D-53**, the approver settings (approver settings 1 to 4: the confirmation budget, the calibration threshold, the first-estimate set, the stage order). Its "Until decided" line: "Code reads each setting from the registry and never hard-codes it; the registry carries each rule's proposed value, marked as not approved";
  - **D-93**, tolerances, plausible ranges and area-basis factors (approver setting 5, with SOVITECH engineering): a field with no registered tolerance has none, and a field with no plausible range gets no plausibility check;
  - **D-47**, how approval records for registry snapshots reach the app.
- **Phase 0 review, round 2.** Every exception list the checks use was a code constant that `pnpm check` accepted at any size; prompt 3 section 13 names widening the render allowlist and adding a reserved-term exception as loosenings, and section 7 asks for each render allowlist entry to be listed for the owner. The exception lists are now part of "unapproved baseline v0" (ADR 0005, decision 6); their values are recorded here.
- **Why a separate ADR.** Until the phase 0 review, these values sat in a section of ADR 0005, whose status is "Accepted: default, reversible". Prompt 3 5.2 asks for status "Proposed", and prompt 3 section 15 allows one status per ADR. The mechanism (gates, validation, the snapshot, the check, the writer) stays in [ADR 0005](0005-gates-mechanism.md); the values are here.

## Decision

The production registry, and "unapproved baseline v0" (`packages/registry/src/snapshots/unapproved-baseline-v0.json`, written by `tools/checks/loosening/write-baseline.ts`), hold only the values below. None is approved: no approver is named (D-05). Registry validation (ADR 0005, decision 4) refuses anything looser in the production scope, and the loosening check refuses any value the baseline does not hold, tightenings included.

**Settings,** recorded 2026-09-25 against guardrails v1.5:

| Value | Setting | Status | Source |
|---|---|---|---|
| Confirmation budget, steps 3 to 7 | 7 | proposed | rule 5; approver setting 1; D-53 |
| Calibration threshold | 10% over the last 50 decisions | proposed; recorded, not applied (D-53's interim) | rule 3; approver setting 2; D-53 |
| First-estimate set | building type, gross floor area, systems in scope | proposed | rule 7; approver setting 3; D-53 |
| Required fields | project name, project type, city, country | rule (closed list) | rule 7 |
| Identity list | project name | rule (closed list) | rule 6 |
| Document-stage order | site survey / as-built / nameplate photo; shop drawing; execution; tender; technical design; permit; feasibility; unknown | proposed | rule 4; approver setting 4; D-53 |

**Per-field policy,** for every field phase 1 and later add:

| Property | Value in the production registry | Source |
|---|---|---|
| Tolerance | none on any field, so any difference is a conflict | rule 4; D-93 |
| Plausible range | none; the plausibility check waits for SOVITECH ranges (cases use TEST entries) | rule 8; D-93 |
| Estimation | `allowed` only for a field that names a method from the guardrails' list (points, CAPEX, consumption, savings, payback, ROI); `forbidden` elsewhere | 2.1; rule 10 |
| `confirmBy` | `engineer`, unless the field names the rule 3 owner fact it rests on | rule 3 |
| Criticality | `required` only for the four rule 7 slots; `first_estimate` only for the proposed set; nothing else above `for_quotation` | rule 7 |
| Identity | only the project name | rule 6 |
| Reference datasets | none: no dataset has an approval record (G1-12) | 2.1; section 10; D-92 |
| `minorForTotals` | not set on any field | rule 1 |

**Fields, criticalities and the `impactRank` order:** none registered in phase 0. Phase 1 records each field with the writer, and adds its criticality and its place in the `impactRank` order to this table and to the build log's "Waiting for approval, datasets or decisions" (prompt 3 5.2 asks for every value to be listed there).

**Gates:** all 18 of prompt 3 section 5.4 closed, every approval reference empty. The snapshot records each gate with what it waits for and its closed behaviour; the gates themselves are ADR 0005's.

**Exception lists** (`packages/registry/src/snapshots/exception-lists/unapproved-baseline-v0.json`), recorded on 2026-09-25 from the integrated tree after round 2 of the phase 0 review (the file was deleted and written again from scratch by `tools/checks/loosening/write-baseline.ts`, which is allowed only while the file is not in `HEAD`; `--check` then reported both parts up to date). 25 lists. None is approved. An allow list's entries are each listed for the owner in the build log; a deny list is recorded whole, and removing one of its entries is a loosening.

| List | Direction | Where it lives | Entries recorded |
|---|---|---|---|
| `render.entries` | allow | `tests/e2e/render/allowlist.ts`, `RENDER_ALLOWLIST.entries` | `date-day-month-year`, `wizard-step-number`, `character-counter`, `max-file-size` |
| `render.unreadable` | allow | the same file, `RENDER_ALLOWLIST.unreadable` | `brand-logo` |
| `eslint.allowlist` | allow | `tools/eslint-rules/allowlist.js` | `no-number-coercion` on `packages/registry/src/number-parser/**`, `packages/view-model/src/formatting/**` and `apps/api/src/port.ts`; `css-no-colour-literals` on `packages/ui/src/tokens.css` |
| `lint-bans.shadow-free-values` | allow | `tools/eslint-rules/lib/patterns.js` | `none`, `initial`, `unset`, `0` |
| `lint-bans.theme-files` | allow | `tools/eslint-rules/lib/theme.js` | `packages/ui/src/tokens.css`, `apps/web/src/styles.css` |
| `reserved-terms.allowances` | allow | `packages/registry/src/reserved-terms.ts`, `REGISTERED_ALLOWANCE_ENTRIES` | none |
| `reserved-terms.machine-keys` | allow | `tools/checks/reserved-terms/machine-keys.ts` | none |
| `fixture-manifest.document-homes` | allow | `tools/checks/fixture-manifest/manifest.ts` | `fixtures/`, `packages/ui/src/brand/`, `design/reference/` |
| `fixture-manifest.never-read` | allow | the same file | `company/` |
| `fixture-manifest.document-home-types` | allow | the same file, `DOCUMENT_HOME_TYPES` | `fixtures/` any; `design/reference/` png, jpg, webp; `packages/ui/src/brand/` svg, woff2, woff |
| `fixture-manifest.document-extensions` | deny | the same file | the document extensions as recorded (60) |
| `fixture-manifest.content-signatures` | deny | the same file | the content signatures as recorded (24) |
| `checks.default-ignores` | allow | `tools/checks/lib.ts`, `DEFAULT_IGNORES` | `company/**`, `**/node_modules/**`, `.git/**`, `services/extractor/.venv/**`, `**/__pycache__/**`, `**/dist/**`, `coverage/**`, `test-results/**`, `playwright-report/**`, `fixtures/ifc/perf/**`, `tools/**/seeded/**` |
| `depcruise.exclude` | allow | `.dependency-cruiser.cjs`, `options.exclude.path` | third-party `node_modules`, the extractor's `.venv`, `dist`, `tools/**/seeded/`, `tools/eslint-rules/fixtures/` |
| `version-sync.third-party-skills` | allow | `skills-lock.json` | `frontend-design` |
| `mockup-figures` | deny | `tools/checks/mockup-figures.txt` (by hash) | the list as recorded (127 entries) |
| `company-figures` | deny | `tools/checks/company-figures.txt` (by hash; required since integration: a missing file cannot be read and fails) | the list as recorded (947 entries) |
| `index.reviewed-test-doubles` | allow | `tools/checks/index/reviewed-test-doubles.json` | none |
| `vitest.allowed-test-script-flags` | allow | `tools/vitest/config-integrity.ts`, `ALLOWED_TEST_SCRIPT_FLAGS` | none |
| `reserved-terms.non-copy-files` | allow | `tools/checks/reserved-terms/non-copy.ts`, `NON_COPY_FILES` | `**/README.md` |
| `scan-roots.excluded` | allow | `tools/checks/scan-roots/roots.json`, every `excluded` entry | 21 folders: at the top `company`, `design`, `docs`, `prompts`, `.claude`, `node_modules`, `.git`, `.venv`, `.pnpm-store`, `.cache`, `test-results`, `playwright-report`, `coverage`, `.vscode`, `.idea`; under a package `node_modules`, `dist`; under a service `.venv`, `.pytest_cache`, `.ruff_cache`, `__pycache__` |
| `scan-roots.scanned` | deny | the same file, every folder-and-scan pair and every `"ci": true` mark | as recorded (56) |
| `lint-bans.total-outside-engine-exempt` | allow | `tools/eslint-rules/index.js`, `ENGINE` | `packages/engine/**` |
| `eslint.script-extensions` | deny | `tools/eslint-rules/index.js`, `SCRIPT_EXTENSIONS` | as recorded (8: js, jsx, mjs, cjs, ts, tsx, mts, cts) |
| `lint-bans.extensions-a-ban-must-read` | deny | `tools/checks/lint-bans/lint-bans.ts`, `EXTENSIONS_A_BAN_MUST_READ` | as recorded (35) |

The last nine lists were added at integration of round 2, from the other areas' fixes (the index check's reviewed test doubles, the config-integrity flags, the reserved-term non-copy list, the document-home types, the scan-roots list, the engine scope of `no-total-outside-engine`, and the two extension lists). Each has a seed in `tools/checks/loosening/seeded/` (`exception-list-reviewed-test-double-added`, `-test-script-flag-added`, `-non-copy-file-added`, `-home-type-added`, `-scan-root-excluded-added`, `-scan-removed`, `-engine-exemption-added`, `-script-extension-removed`, `-ban-extension-removed`, and `-company-figure-removed` for the company list), and the loosening self-test runs 53 seeds. `GENERATOR_RUNNERS` in the fixture manifest is not tracked: it names how a generator runs, and a generator it cannot run fails the check.

## Consequences

- Nothing in the registry is approved, and nothing can be until the approver is named (D-05); then each value is approved in its own change-log row of `docs/guardrails.md`, whose "Approved by" cell holds the approver's name alone or with a date (ADR 0005, decision 3).
- The strict values have visible effects, none of which blocks the owner: with no tolerance, any difference between documents reads "Two values" (a Speed cost); with no plausible range, the plausibility check does not run, so an out-of-range value is not flagged "Please check" until SOVITECH ranges are approved (the guardrails prefer that gap to an invented range; D-93); with estimation forbidden outside the named methods, outputs read "Not available yet" rather than an estimate. Each is listed for the approver.
- D-53's interim records the calibration threshold "but not applied"; prompt 3 5.2 applies it. This ADR records the value only; phase 7, which builds G3-6, follows the stricter reading unless the owner decides otherwise.
- A tightening against the unapproved baseline also fails the loosening check until the writer records it: nothing approves it either.
- Exception lists: until the approver is named, no entry can be added to an allow list, or removed from a deny list, without the loosening check failing. A later phase that needs a new render allowlist entry within rule 2's categories (prompt 3 section 7), or a reviewed unreadable element such as the viewer's canvas, lists it under "Waiting for approval, datasets or decisions" and the check stays red until an approved exception-list snapshot holds it. The same holds for a new excluded folder in `tools/checks/scan-roots/roots.json` (a new generated-output folder, say), a reviewed test double, a non-copy file and a document-home type; a new scanned folder or document type is a tightening the writer records.

## How to reverse

- **Approve a value:** the approver approves it in a change-log row; an approved snapshot file (`status: "approved"`, `approvalRef` to that row) then becomes the base, and the unapproved baseline stays as the record of phase 0. This ADR's status then changes value by value, as the approver decides.
- **Approve an exception-list entry:** the approver approves it in a change-log row on main naming "exception lists v<n>"; an approved exception-list snapshot at version n, holding the entry and that reference, then becomes the base for the lists.
- **Change a value:** any change looser than the table (a tolerance, a plausible range, estimation for a field without a named method, `confirmBy` moved from engineer, a lower criticality, a raised budget, a lower calibration threshold, a new identity field, a reference dataset) is a loosening under section 10 and needs the approver. A stricter value is recorded with the writer and listed for the approver, because a new question, gate or blocked state costs owners time.
