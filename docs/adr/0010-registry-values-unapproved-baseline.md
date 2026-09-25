# 0010. Registry values in "unapproved baseline v0"

- **Status:** Proposed
- **Date:** 2026-09-25 (exception lists added 2026-09-25, after round 2 of the phase 0 review; phase 1 fields and lists added 2026-09-25; the allow lists derive reads added 2026-09-25, round 3 of the phase 1 review)

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

## Phase 1 amendment (2026-09-25): the fields, and four more lists

Recorded with the writer on 2026-09-25 against guardrails v1.5 (1.6 changed no value). None is approved (D-05).

**Fields.** 32, all with estimation `forbidden`, no tolerance, no plausible range, no reference dataset and `minorForTotals` not set; identity only on `project.name`. Criticality, `confirmBy` (with its rule 3 basis) and `impactRank`:

| impactRank | Field | Kind | Criticality | confirmBy |
|---|---|---|---|---|
| 1 | `project.type` (new_construction, renovation, existing_building, bms_modernization) | enum | required (project_type) | owner, owner_choice |
| 2 | `project.country` (ISO 3166-1 code) | text | required (country) | owner, identity |
| 3 | `project.city` (as typed) | text | required (city) | owner, identity |
| 4 | `project.name` (identity: yes) | text | required (project_name) | owner, identity |
| 5 | `building.grossFloorArea` (m², area; qualifier `gross_total`) | quantity | first_estimate (gross_floor_area) | engineer |
| 6 | `building.type` (hotel, office, retail, hospital, residential, other) | enum | first_estimate (building_type) | owner, use_and_occupancy |
| 7-14 | `project.scope.hvac`, `lighting`, `energy`, `access_control`, `fire_safety`, `water`, `elevators`, `cctv` (include, exclude) | decision | first_estimate (systems_in_scope) | owner, owner_choice |
| 15 | `building.floors` (qualifiers below_ground, semi_basement, ground, mezzanine, upper, setback_or_technical, attic, roof_plant) | count | for_quotation | engineer |
| 16 | `building.rooms` (all_spaces, guest_rooms, keys) | count | for_quotation | engineer |
| 17 | `building.zones` (hvac_control, lighting, fire_compartment) | count | for_quotation | engineer |
| 18-23 | `project.automation.hvac`, `lighting`, `energy_management`, `water_management`, `security_access`, `predictive_maintenance` (selected, not_selected) | decision | optional | owner, owner_choice |
| 24 | `project.operatingSchedule` (24_7, business_hours, extended_hours, seasonal) | enum | optional | owner, use_and_occupancy |
| 25 | `project.occupancy` (mostly_occupied, mixed, low) | enum | optional | owner, use_and_occupancy |
| 26-32 | `project.goal.reduce_energy`, `lower_carbon`, `occupant_comfort`, `operational_efficiency`, `compliance`, `asset_lifespan`, `reduce_operating_costs` | decision | optional | owner, owner_choice |

**Readings for the approver** (the registry builder's; each listed in the build log): gross floor area, floors, rooms and zones are technical facts rule 3 does not give the owner, so an engineer checks them, and rule 5's area confirmation and 2.8's "Two values" floors example go to the engineer queue (a Speed cost); `for_quotation` for the engineer's facts and `optional` for the owner's own choices; country and city are text until the ISO 3166 and SIRUTA datasets are approved (D-94), so under rule 4 they never conflict; the "Other" goal is not registered (it has no text field, so it changes no output); Fire Safety, Access Control and Elevators are never preselected (D-64 for the last two, the safe side). The `impactRank` order above (required, then the first-estimate set, then the engineer's facts, then the owner's choices by the outputs they reach) is proposed for the approver.

**Formula signatures and the template slot** (declared, no bodies): `capexIndicativeRange@1` and `measurePriority@1` (`refuse`); `pointsEstimate@1`, `capexPreliminaryEstimate@1`, `operatingEnergyEstimate@1` and `savingsEstimate@1` (`range_over_options`); `template:proposal.title`. Each waits for its SOVITECH dataset and gate; until then each output reads "Not available yet", naming what is missing.

**Datasets:** none declared in the production registry, and none has an approval record. TEST datasets live in `fixtures/datasets/` and load only in the sensitivity suite and case files (ADR 0017, decision 7).

**Exception lists added in phase 1** (29 lists in all), each entry listed in the build log:

| List | Direction | Where it lives | Entries recorded |
|---|---|---|---|
| `lint-bans.decimal-from-text-exempt` | allow | `tools/eslint-rules/index.js`, `NUMBER_PARSER` | `packages/registry/src/number-parser/**` |
| `lint-bans.rounding-exempt` | allow | `tools/eslint-rules/index.js`, `FORMATTING_MODULE` | `packages/view-model/src/formatting/**` |
| `lint-bans.json-parse-reviewed` | allow | `tools/eslint-rules/index.js`, `JSON_PARSE_REVIEWED` | `packages/registry/src/validation/snapshot.ts`, `packages/registry/src/test-utils/test-utils.test.ts` |
| `index.stub-aware-support-modules` | allow | `tools/checks/index/stub-aware-support.json` | `tests/guardrails/_support/pending.ts` (pending-wrapper), `tests/guardrails/_support/property.ts` (stub-aware), each with its SHA-256 |

`reserved-terms.allowances` holds five entries that the check accepts as 2.8 itself and never records ([ADR 0011](0011-verbatim-2-8-allowances.md)).

**Speed cost, for the approver** (rule 6): the sensitivity test proves that each step 5 to 7 answer reaches a declared output on the synthetic fixture project, with TEST datasets and TEST formulas. In the app, every output those answers reach (points, the investment stages, operating energy, savings, measure priority) reads "Not available yet" until the SOVITECH datasets and the financial method exist, so the owner answers questions whose effect they cannot see yet. The approved questions are kept.

## Phase 1 review amendment (2026-09-25): new allow lists, the roster of checks, and one widening

**The failure** (verifier finding 3): `compareExceptionLists` read every list missing from the snapshot as a tightening, whatever its direction and entries, so the writer recorded a brand-new allow list without the approver. Phase 1's `index.stub-aware-support-modules` came in that way. At 135d74d only the pending wrapper could catch the stub's error, so its entry `tests/guardrails/_support/property.ts` widens the index check's `[support]` rule, a check the phase 0 baseline already had. Any later phase could have widened a check the same way by opening a new list.

**The change** (`tools/checks/loosening/exception-lists.ts`):
- Every list names the check it lets things past (`ExceptionListSpec.check`), an entry of a new deny list, `checks.roster` (the check names of `tools/checks/runner.ts` `EXPECTED_CHECKS`, the tools `eslint`, `depcruise`, `vitest` and `checks`, and each ESLint rule as `eslint:<rule>`). A list naming a check outside the roster fails. Removing a check from the roster is a loosening (a deny-list removal).
- A new allow list is a tightening only when its check is absent from the base's roster too (a new check with its own exemptions); its entries are then reported apart for the owner ("new allow entry of a new check"). Otherwise each of its entries is an added allow entry, a loosening that fails the check and that the writer refuses. A base with no roster cannot tell, so there too each entry is a loosening.
- A snapshot entry may carry a `widening` note: an allow entry a review found to widen a check the earlier baseline had, recorded as waiting for the approver. The writer keeps the note while the entry is unchanged and never adds one; the check reports the entry apart ("widening waiting for the approver"). The note approves nothing.

**Recorded with the writer, 2026-09-25:** the list `checks.roster` (deny, 30 entries; a tightening), so the baseline now holds 30 lists. **Re-recorded by hand:** `index.stub-aware-support-modules` `tests/guardrails/_support/property.ts`, with its `widening` note; it is the only widening in the baseline (a unit test pins that). It stays in the unapproved baseline, like every value there, waiting for the approver (D-05), and is listed for the build log's "Waiting for approval, datasets or decisions". `pending.ts` in the same list moved an exemption the index check already held in code into the list, so it is not a widening.

**Proof.** Loosening self-test: `exception-list-new-allow-list-widens-existing-check/` (the baseline as 135d74d held it, without the list: both entries are added allow entries, loosenings) and `exception-list-check-removed-from-roster/`. Unit tests in `tools/checks/loosening/exception-lists.test.ts`, "a brand-new allow list" (an existing check's new list is a loosening per entry; no roster is a loosening; a new check's list is a tightening reported apart; the writer refuses the first and records the second; the widening note is kept and reported; property.ts is the one widening; every list names a roster check).

**How to reverse.** Reading a new allow list as a tightening whatever its check, dropping the roster, or dropping a widening note hides a widening from the owner: each is a loosening that needs the approver. Approving property.ts's exemption is the approver's, through an approved exception-list snapshot (ADR 0005, decision 6).

## Phase 1 review, round 3 amendment (2026-09-25): the allow lists derive reads

**The failure** (adversarial finding 4, reproduced in the scratchpad before the fix). The phase 1 fixes turned several registry properties into allow lists that derive and the verifier enforce: the qualifiers a field registers (G8-14), the kind `decision` (G3-9), and a field's unit and dimension (G8-4). Neither the snapshot nor registry validation read them. Against the repository's own baseline, each of these edits kept the loosening check green and validation clean: "Gross_Total" and "usable" added to the gross floor area's qualifiers; Fire Safety in scope turned from a decision into an enum; the area's unit moved to kW; a decision's options widened; kVA merged into power in the bundle; a formula that writes `building.rooms`; an existing formula signature changed under its version; a count with no whole-number shape. The unit registry's written forms and factors, and the floor-notation letters, were in no snapshot at all. Moving project type (the owner's own choice) to an engineer read as a tightening the writer would record.

**The change** (`packages/registry/src/validation/{schema,snapshot,validate,loosening}.ts`, `tools/checks/loosening/{core,write-baseline}.ts`):

- **Per field**, the snapshot also records `kind`, `unit`, `dimension`, `qualifiers` (sorted), `options` (sorted), `valueShape`, and `formulas`: the declared formulas whose outputs name the field (`formulasWritingField`), the formulas a `calculated` or `estimated` value of the field comes from (2.1). Each is in `SENSITIVE_FIELD_PROPERTIES`, so a field's `approvals` can name it.
- **Beside the fields**: `formulas` (every declared signature: inputs and outputs sorted, the `unknownPolicy` as it applies, `refuse` when none is declared (G1-9), and whether it is estimated); `datasets` (every declared `id@version`); `units` (the closed unit registry of ADR 0017: symbol, dimension, written forms, factor); `floorNotationLetters` (each letter the parser reads, with its level type). The unit registry and the letters are read from their modules (`currentRegistryLists()`), not from the bundle, because derive, the parser and the plausibility check read the modules.
- **Directions** (section 10: "Any change that lets more values through, shows fewer labels, or involves fewer people"; "When unsure, treat the change as loosening"):

| Change | Counts as |
|---|---|
| A field's kind changed (the message names rule 3 when it leaves `decision`) | loosening, whatever the kinds |
| A unit set or changed | loosening; removed: tightening |
| A dimension changed or removed | loosening; first declared: tightening |
| A qualifier or an option added | loosening; only removed: tightening |
| A value shape dropped or changed | loosening; declared: tightening |
| A declared formula starts writing a field | loosening for that field; stops: tightening |
| `confirmByBasis` moved away from `owner_choice` | loosening, even when `confirmBy` moves to engineer |
| Another basis change with `confirmBy` unchanged | loosening on an owner or either field; tightening on an engineer field |
| A formula signature changed under the same version | loosening (2.4: "Formula versions are immutable") |
| A new formula signature, a newly declared dataset | added: recorded by the writer after validation, as a new field is |
| A formula or a dataset removed | tightening |
| A unit added; a written form added; a dimension, symbol or factor changed; a factor where none was | loosening; a unit, a form or a factor removed: tightening |
| A floor-notation letter added, or naming another level type | loosening; removed: tightening |

- **Registry validation** gains four problems: `owner-choice-not-owner` (a `decision` field, or a field whose basis is `owner_choice`, has `confirmBy` owner, and a decision rests on `owner_choice`: 2.6 "decision: an owner choice (rule 3)"; rule 3, "Choices belong to the owner"); `value-shape-missing` (every count declares `valueShape: non_negative_integer`, in every scope: 2.6 kind `count`, rule 8 "Counts state what they count", rule 1 "Zero is a value"); `value-shape-invalid` (only a count declares one); and, in the production scope, `unit-not-in-closed-registry` (every unit the bundle carries is the closed registry's entry, so the bundle cannot merge a dimension the modules keep apart). The baseline policy refuses a count without its shape and an owner choice that anyone but the owner settles.
- **Production registry**: floors, rooms and zones declare `valueShape: non_negative_integer`. Nothing else changed.

**Recorded on 2026-09-25, by hand.** The writer's strict schema cannot read a baseline without the new properties, so a one-off script in the scratchpad projected the registry as the writer does and wrote the file only after checking that every value the baseline already held (settings, the impactRank order, gates, and the 14 earlier properties of every field) was unchanged; none changed. `tsx tools/checks/loosening/write-baseline.ts --check` then found both parts up to date. As the writer does whenever values change, the baseline's `guardrailsVersion` now reads 1.6. The values recorded, none approved (D-05):

- kinds as in the phase 1 table above; units and dimensions: gross floor area `m2` (area); floors, rooms and zones `count` (count); every other field none;
- qualifiers: gross floor area `gross_total`; floors `attic`, `below_ground`, `ground`, `mezzanine`, `roof_plant`, `semi_basement`, `setback_or_technical`, `upper`; rooms `all_spaces`, `guest_rooms`, `keys`; zones `fire_compartment`, `hvac_control`, `lighting`;
- options: project type `bms_modernization`, `existing_building`, `new_construction`, `renovation`; building type `hospital`, `hotel`, `office`, `other`, `residential`, `retail`; operating schedule `24_7`, `business_hours`, `extended_hours`, `seasonal`; occupancy `low`, `mixed`, `mostly_occupied`; the eight systems in scope `exclude`, `include`; the six automation areas and seven goals `not_selected`, `selected`;
- value shape `non_negative_integer` on floors, rooms and zones; no formula writes any field;
- the six formula signatures of the phase 1 amendment, as declared (`measurePriority@1` calculated, the other five estimated; `refuse` for `capexIndicativeRange@1` and `measurePriority@1`, `range_over_options` for the rest); no dataset;
- the unit registry: 48 units in 30 dimensions, 62 written forms, 36 factors (ADR 0017, decision 1);
- the floor-notation letters: S below ground, P ground, Mz mezzanine, E upper, Er setback or technical (ADR 0017, decision 5).

**Consequences.**
- Every probed edit now fails the loosening check, registry validation, or both. No owner question, gate, confirmation, badge or status wording is added: each rule constrains what the registry may say.
- A Speed cost on later phases, listed for the approver: a formula that writes an existing field, a changed formula signature (a new version is recorded instead), a new unit or written form, a merged dimension, a new floor-notation letter, and a field's kind, unit, qualifier or option change each wait for the approver, as a new render allowlist entry does. A new field, with the formulas that write it, and a new formula signature are still recorded by the writer after validation.
- The loosening check's list of values waiting for approval gains a line per formula signature, one for the unit registry and one for the letters (150 lines today, from 142).
- The registry holds the declared shape; the refusal of a fractional or negative count, and of a choice outside `options`, is derive's (packages/domain, adversarial finding 10), which can read `valueShape` and `options` from the registry's field entries.

**Proof.** Loosening self-test seeds, each an edit of the probe made in place with `registry-edits.json`: `field-qualifier-added`, `field-kind-away-from-decision`, `field-option-added`, `field-unit-other-dimension`, `field-basis-away-from-owner-choice`, `field-count-shape-dropped`, `field-formula-writes-field`, `formula-signature-changed`, `unit-written-form-added`, `unit-dimensions-merged`, `unit-added`, `floor-letter-added` (75 seeds in all). Registry self-test seeds: `decision-not-owner`, `owner-choice-not-owner`, `count-without-integer-shape`, `unit-not-in-closed-registry` (20 in all). Unit tests: `snapshot.test.ts` (each direction above), `loosening.test.ts` ("the allow lists derive reads, against the repository baseline": the probe's edits against the repository's baseline), `validate.test.ts` (the four problems), and the writer tests in `tools/checks/loosening/check.test.ts` (it refuses an added qualifier, a kind leaving `decision`, a written form and a letter; it records removed ones with the day they were recorded). Indexed at integration (guardrails 1.6, section 7): G3-14 (a decision turned into another kind), G3-15 (a decision that anyone but the owner confirms), G8-16 (a qualifier added) and G8-17 (a written form added, or two dimensions merged), each run on the repository's own inputs and on its seed. The owner-choice basis of the project type is not indexed: it is a reading for the approver (build log, phase 1, P-1-OWNER-CHOICE-BASIS).

**How to reverse.** Dropping any of these properties from the snapshot, reading an added qualifier, option, formula, written form, unit or letter as a tightening, or dropping one of the four validation problems, hides a widening from the approver: each is a loosening under section 10 that needs the approver's own words. A stricter reading is a tightening recorded here and listed for the approver.
