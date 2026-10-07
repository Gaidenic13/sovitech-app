# packages/engine/test-formulas

TEST formulas for the formula signatures the production registry declares (`packages/registry/src/production/formulas.ts`), for its proposal template slot, and for the engine's guardrail cases. Prompt 3 section 5.4 and phase 5: TEST formulas are excluded from the production registry and loadable only inside the test runner.

- **Who loads them:** the sensitivity suite (`tools/checks/registry/sensitivity-suite.ts`, run by the registry check and by case G6-1) loads `formulas.ts`; from phase 5, the engine's guardrail cases (`tests/guardrails/`) and the API and view-model tests that need a TEST figure load `engine.ts` (`testCatalogue`), `inputs.ts` (`testEngineInput`, `testCurrentInputs`), `fields.ts` and `datasets.ts`. Nothing in `apps/` or `packages/*/src` imports this folder (dependency-cruiser `test-formulas-and-fixtures-only-from-tests`), and `runEngine` refuses a `test` catalogue outside the test runner.
- **What they read:** only the inputs their signature declares, as the engine hands them (`BodyInputs.readings` and `over`), and only TEST datasets (`fixtures/datasets/`, from `fixtures/datasets/generate.ts`), handed by `testDatasetAccess`, never through the registry's loader or a production gate.
- **What they are not:** SOVITECH's methods. No production body exists for any declared signature; the app shows "Not available yet", naming the missing dataset or method.
- **How they compute:** `formulas.ts` exactly on whole numbers (`lib.ts`); the engine's TEST bodies (`bodies/`) with the engine's exact intervals (`engine-lib.ts`, `points.ts`). A TEST table with no entry for an answer gives a "not available" output naming it, never a zero or a stand-in value (guardrails rule 1). TEST arithmetic is chosen so every figure stays exact in a JavaScript number (a candidate's `Quantity.value`); where a mirrored body reads an input it does not use, its header says so.

## The engine's TEST catalogue (`engine.ts`)

| Formula (`TEST-…@1.0.0`) | What it is for | Policy | Source |
|---|---|---|---|
| `TEST-capexIndicativeRange` | mirror of `capexIndicativeRange@1`; reads no area, so it can be rule 7's stage 1 fallback (G7-2a) | refuse | estimated |
| `TEST-pointsEstimate` | mirror of `pointsEstimate@1`: points by type (G9-1, G9-3) | range_over_options | estimated |
| `TEST-capexPreliminaryEstimate` | mirror of `capexPreliminaryEstimate@1`: stage 2 (G10-1, G10-2) | range_over_options | estimated |
| `TEST-operatingEnergyEstimate` | mirror of `operatingEnergyEstimate@1` (G7-1) | range_over_options | estimated |
| `TEST-savingsEstimate` | mirror of `savingsEstimate@1` (G10-7) | range_over_options | estimated |
| `TEST-measurePriority` | mirror of `measurePriority@1`, no body (its output is an order, not a quantity; G1-28) | refuse | — |
| `TEST-capexLineItems` | a total over 40 line items (G1-2, G8-10) | exclude_and_count | estimated |
| `TEST-annualReturn` | a return computed from that total (G1-2: none from an incomplete total) | refuse | estimated |
| `TEST-capexFieldDevices` | reuse against replacement until a site survey (G1-7, G9-10) | range_over_options | estimated |
| `TEST-levelsTotal` | a total of levels that takes no range (G4-12) | refuse | calculated |
| `TEST-pumpPoints` | points per motor of a pump group (G4-4) | refuse | estimated |
| `TEST-annualConsumptionFromBills` | twelve bills and a regularisation (G8-7) | exclude_and_count | calculated |
| `TEST-siteConsumption` | a utility meter and a sub-meter (G8-8) | refuse | calculated |
| `TEST-operatingEnergyFromRegister` | register, climate reference value, owner schedule (G9-7) | refuse | estimated |
| `TEST-pointsByType` | points by I/O type, protocol and virtual (G9-3, G10-7) | refuse | estimated |
| `TEST-roomControlPoints` | the room-control supply split (G10-6, G9-4) | range_over_options | estimated |
| `TEST-fireInterfacePoints` | a fire-alarm input and a fire-mode status per AHU panel (G11-3, G10-7) | refuse | calculated |
| `TEST-capexBySystem` | a line per system and their total, the TEST breakdown series `capex.TEST_bySystem` (phase 6: G1-5, G9-8, G10-7) | range_over_options | estimated |
| `TEST-cashFlow` | a TEST payback and the cumulative cash flow of TEST years 0 to 10, the TEST sequence `cashFlow.TEST_cumulative` (phase 6: G9-9) | refuse | estimated |

`testCatalogue()` holds the six mirrors; `testCatalogue({ extra: [...] })` adds extra formulas by id, and the TEST chart series of those it adds (`series.ts`; phase 6); `{ mirrored: false }` leaves the mirrors out. Every formula writes on a TEST output field of `fields.ts`, or, for the two series formulas, of `series.ts` (so no existing body's hash input changed when they were added); `inputs.ts` reads both. `testFormulaLookup(catalogue)` (or `testFormulaVersionDeclared`) is the `formulaDeclared` lookup of a derive context that reads its candidates.

## The TEST bodies and their manifest

Each body is its own file, `bodies/<id>@<version>.ts`, and `test-manifest.json` holds, for each, the SHA-256 of the body with everything it loads, transitively (the engine's `bodyHashInputOf` from `@sovitech/engine/manifest`, under `TEST_IMPORT_POLICY`; `testBodyFiles` reads them from the repository through `testSourceReader`), checked by case G9-11 with the engine's `checkManifest`, as the production bodies (`src/bodies/`, `src/manifest.json`, empty) are by `src/manifest.test.ts`. The imports are found by the TypeScript parser, and the closure fails closed: a computed `import()` or `require()`, an import naming no file, or an import by name the policy does not name fails the check. A TEST body's closure today: the body, `lib.ts`, `engine-lib.ts` and, for most, `datasets.ts` (with `fixtures/datasets/generate.ts` behind it), `fields.ts` or `points.ts`, and the engine's `src/interval.ts` and `src/errors.ts`; `decimal.js` by its version locked in `pnpm-lock.yaml`; and, by name only, the imports `TEST_IMPORT_POLICY` lets stand unhashed, each with its reason (`@sovitech/registry`, a workspace package no locked version pins; `node:fs`, `node:path` and `node:url`, which the dataset generator uses for its script run): a change inside those is not covered, and a production body may import none of them. Changing a body, or a helper in its closure, means a new version: a new file, a new entry. To record the entry of a new body, hash its input (`bodyHashOf(bodyHashInputOf('packages/engine/test-formulas/bodies/<id>@<version>.ts', testSourceReader(), TEST_IMPORT_POLICY))`) and add it; never edit an entry to match a changed body or helper. (The manifest was re-recorded twice, each time because the hash input grew and no body or helper changed: in phase 5 part B, from the body file to its closure, V-7; and when phase 5 closed, with the locked `decimal.js` version and the unhashed names, after the final verification found the reader missed imports.)
