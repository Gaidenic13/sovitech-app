# tools/checks

Every repository check lives here, one folder per check. Two of them wrap tools that also run on their own: `lint-bans` runs the project's ESLint bans and dependency-cruiser boundaries with inline disables switched off, and `render` validates the render-test allowlist (`tests/e2e/render/allowlist.ts`), the screen list (`tests/e2e/render/screens.ts`) and the harness pages that the Playwright render test uses. `mockup-figures` reads the check list `mockup-figures.txt` (prompt 3 section 14, item 3), and `company-figures` the check list `company-figures.txt` (company figures and SAUTER product names, each tied to its `company/` source line; the check never reads `company/`). `scan-roots` holds the one list of scan roots, `scan-roots/roots.json`, and fails on a folder it does not classify; `pnpm lint:deps`, the lint bans, the reserved-term and figure checks, the config-exclusion check and the extractor's Python bans read their roots from it. `tools/checks/run-all.ts` finds and runs them.

## Adding a check

1. Create `tools/checks/<name>/check.ts`. Its default export is an async function returning a `CheckResult` (see `types.ts`):
   ```ts
   import { fail, pass } from '../lib';
   import type { Check } from '../types';

   const check: Check = async () => {
     // ...
     return problems.length === 0 ? pass('<name>', 'summary') : fail('<name>', 'summary', problems);
   };
   export default check;
   ```
   `details` names each file and line at fault. The index check also fills `noAutomatedCheckYet` (ids with no case file, or only a stub or a malformed one), `pending` (case files held out by the pending wrapper) and `real` (case files that read as real cases). `run-all` and `pnpm check` print the three counts on one line, "Guardrail cases (docs/guardrails.md section 7): N real, N pending (no automated check yet), N no automated check yet", and label a green run "passed with N pending ... (no automated check yet)" while any case is held out. A run whose counts cannot be read is not green. `run-all` reads the case files only; `pnpm check` also confirms each real case against its own Vitest run (`index/run-counts.ts`), so there a case that reads as real but did not run and pass is not counted real, and the run is not green.
2. Create `tools/checks/<name>/selftest.ts`. Its default export runs the same logic against the check's seeded bad inputs, kept in `tools/checks/<name>/seeded/`, and returns one `CheckResult` per input. `pnpm check:selftest` passes the check only when every result has `ok: false`. A check without a self-test fails the self-test run.
3. Put unit tests next to the code as `*.test.ts`; the unit Vitest project collects `tools/**/*.test.ts`.

Write the check so it can run against another root (for example a function taking a root directory, with the default export calling it on `repoRoot`). The self-test then reuses the same function on `seeded/`.

## Rules for every check

- Never scan `company/**` (build-readiness decision 12). Use `listFiles` from `lib.ts`, whose default ignores cover it, the seeded inputs, installed and generated files.
- Seeded bad inputs live only under `tools/**/seeded/`. ESLint, TypeScript, Vitest and every scanning check ignore that path.
- A check never writes to the repository.
- A check never counts a missing case, a stub or a pending test as passing.
- A check never passes on an empty scope: when a scan root matches no file, or nothing was read, it fails (phase 0 review, finding 17).
- A check that scans folders takes its roots from `scan-roots/roots.json` (phase 0 review, round 2), so a folder added there for its scan is read without a change in the check; `scan-roots/wiring.test.ts` pins that for the checks that take globs.
- A list that lets something past a check, or names what a check must catch, is recorded in the loosening check's exception-list snapshot (`loosening/exception-lists.ts`; phase 0 review, round 2): add one entry there, then run `tsx tools/checks/loosening/write-baseline.ts`.
- Every entry of an allow list is listed for the owner in `docs/build-log.md`, under "For the owner's review" (phase 1): the loosening check reads that list (`loosening/owner-review.ts`) and fails on an entry missing there or a line naming an entry that is not there. The integrator keeps it.
- A reserved-term allowance that is word for word a text of `docs/guardrails.md` 2.8, of the kind 2.8 gives it, is 2.8 itself and passes the loosening check without an approval reference (`loosening/guardrails-2-8.ts`; ADR 0011). Every other allowance waits for the approver.

## Expected checks

`run-all` fails when one of these folders is missing (`EXPECTED_CHECKS` in `runner.ts`): `index`, `reserved-terms`, `version-sync`, `registry`, `loosening`, `fixture-manifest`, `licences`, `config-exclusion`, `lint-bans`, `render`, `mockup-figures`, `company-figures`, `scan-roots`.

## Commands

| Command | What it runs |
|---|---|
| `pnpm checks` | every check, one table |
| `pnpm checks -- --only index,licences` | the named checks |
| `pnpm checks -- --verbose` | details for passing checks too |
| `pnpm check:selftest` | every self-test |
| `pnpm check` | lint, typecheck, Vitest, extractor, render test, then these checks and their self-tests |
