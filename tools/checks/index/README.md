# The index check

`docs/guardrails.md` section 7, "The CI index check": it fails when a section 7 id has no case file, or when a case file's id is missing from the table (R-156). This build follows `docs/adr/0003-index-check-convention.md`: no pending stubs while D-33 is open.

## What it reports

| List | Meaning | Fails the check? |
|---|---|---|
| Real cases present | A T case file that runs. An E case only with the eval runner present and a current 5-of-5 results record (`eval-runs.ts`), so none before phase 2 | No |
| `pending` | A case file held out of the green run: a T file importing `tests/guardrails/_support/pending.ts` (directly or through another `_support/` module) whose first line is the domain's marker `// @pending-until: phase <n> <feature>[, <feature>]` (`parsePendingMarker` in `@sovitech/domain`; ADR 0004); every E file that holds the full eval body, until the eval runner exists; and, once it exists, an E file marked `status: pending`, or one without a current 5-of-5 result (which is also a problem). Printed as "pending: no automated check yet" | No |
| `noAutomatedCheckYet` | An id with no case file in the folder of its type, with only a stub (`@guardrail-stub`, `status: stub`), or with a malformed case file (below) | Yes |
| Other problems | Listed first in the details as `problem: <file>:<line>: [<kind>] …` | Yes |

The problem kinds:

| Kind | What it means |
|---|---|
| `[table]` | The section 7 table cannot be read |
| `[scope]` | An empty scope: section 7 lists no id, or `tests/guardrails/` does not exist. The check never passes on nothing |
| `[unindexed]`, `[wrong type]`, `[layout]` | A case file whose id is not in the table, sits in the other type's folder, or is misnamed or nested |
| `[title]` | No string in a T case file names its id |
| `[held out]` | A T case file keeps a test out of the run, or inverts it, without the pending wrapper. Read with the TypeScript parser: `.skip`, `.todo`, `.only`, `.fails`, `.skipIf`, `.runIf` (on `test`, `it`, `describe`, a context, an alias), an options object with `skip`, `todo`, `fails` or `only` (on a test or a describe; a literal `false` is allowed), a computed modifier (`test['skip']`, `test[name]`), and a destructured one (`const { skip } = test`, `({ skip }) => …`). The file is malformed |
| `[empty]` | A test registered (through `test`, `it`, an alias or the wrapper's `pendingCase`) with a body that does nothing. The file is malformed |
| `[pending]` | The wrapper import without the marker, the marker without the import, or a malformed marker (the file still counts as pending); or a case file that names `NotImplementedError` or `declareNotImplemented`: only a domain stub throws that error, so such a file is malformed |
| `[eval]` | An eval file that does not parse, is not a mapping, names another id, carries a status other than `pending` or `stub`, or lacks the full body: `fixture` (a path, or list of paths, under `fixtures/evals/<ID>/` that exists), `task` (text or mapping), `assertions` (a list, not empty) and `samples: 5` (guardrails section 7: sampled 5 times, passes at 5 of 5). A file with less is a stub, which ADR 0003 forbids. The file is malformed. Once the eval runner exists, also a full eval without `status: pending` and without a current 5-of-5 results record ("no current 5 of 5 result"); that file stays pending |
| `[vacuous]` | An assertion that proves nothing: `expect(x)` (or `expect.soft`, `expect.poll`, a context's `expect`, an alias) with no matcher called after it, which Vitest counts as an assertion so `expect.requireAssertions` lets it through; `expect.assertions(0)` or a count computed from code; `.toThrow()` or `.toThrowError()` naming no error, which passes on any error, an unbuilt stub's included. The file is malformed |
| `[test double]` | A test double outside the reviewed list: `vi.mock`, `vi.doMock`, `vi.stubGlobal`, `vi.stubEnv`, `vi.resetModules`, `vi.importActual`, `vi.importMock`, a member of `vi` computed from code or taken out of it, a `vi.spyOn` given an implementation of its own (`mockImplementation`, `mockReturnValue`, ...) or placed on project code (`@sovitech/*` or a relative import). A case that mocks the code under test proves nothing about it, and a second copy of the domain hides its stubs from the stub guard. The file is malformed. A `vi.fn()` passed in as a dependency is not a test double here. Also an entry of the reviewed list that matches no use, or a malformed list |
| `[support]` | A module under `tests/guardrails/_support/` that swallows errors (a catch clause, `.catch`, a two-argument `.then`, `Promise.allSettled`, and since phase 1 a `finally` block that leaves by `return`, `throw`, `break` or `continue`), holds a test out, registers an empty test, asserts vacuously, uses an unreviewed test double, runs code in another process, thread or context (as `[process]`), or names NotImplementedError. Only the modules on the reviewed list `stub-aware-support.json`, with the content that was reviewed, may catch the stub's error (below); a listed module whose content changed is held to the full rule, with a problem, and a list entry that matches no module is a problem. A case file that imports a faulty module, directly or through another, is malformed |
| `[process]` | Phase 1 (round 2 residual: a stub reached from a child process, which the stub guard cannot count, and a case asserting only on the exit status). A case file that imports or loads `child_process`, `worker_threads`, `cluster` or `vm` (with or without `node:`, statically, by `import()`, `require()` or a re-export), `execa`, `tinyexec`, `cross-spawn`, `tinypool` or `piscina`, uses `new Worker(...)`, loads a module by a path computed from code, or uses `createRequire`. The file is malformed. A module the case reaches outside `_support/` is not read (the render cases reach Playwright, which starts the browser) |
| `[swallow]` | Phase 1 (round 2 residual). A case file whose `finally` block leaves by `return`, `throw`, `break` or `continue`, which replaces whatever the `try` block threw, a failed assertion included. The file is malformed |
| `[run config]` | Only on the repository (`check.ts`): a setting that loses a guard of the guardrail run (`tools/vitest/config-integrity.ts`): the run guard missing from the reporters; the `guardrails` project missing, renamed or doubled, or its include, `_support` exclude, `expect.requireAssertions` or stub guard setup file changed; `passWithNoTests` or `allowOnly`; a test script other than `vitest run` with no flag; `pnpm check` or CI not running it as written |

A case file in the other type's folder counts as missing for its id and as a problem for the file. Detection errs toward "not running": text that only looks like a pending import or a stub marker still makes a file pending or a stub, and a malformed file never counts, as real or as pending.

**The run-time half.** The source reading cannot see everything a test run does. The guardrail run guard (`tools/vitest/guardrail-run-guard.ts`, a Vitest reporter) reads the results of the run and fails it when a guardrail test is skipped, todo or in fails mode other than by the pending wrapper, when a case file ran no test, or when a passing test ran without the stub guard. The stub guard (`tools/vitest/guardrail-stub-guard.ts`, a setup file of the `guardrails` project) fails a test that reached an unbuilt domain stub, unless the pending wrapper held it out, so a "Rejected" case written as `expect(() => verifyProposal(...)).toThrow()` does not pass against the stub. The `guardrails` project also sets `expect.requireAssertions`, so a guardrail test that asserts nothing fails. See `tools/vitest/README.md`.

**Modules that may catch the stub's error** (`stub-aware-support.json`, `support-pin.ts`; phase 1). Two support modules must catch an error to tell the domain stub's `NotImplementedError` from every other: the pending wrapper (`pending.ts`, role `pending-wrapper`: it may catch and skip, and only at its own path) and the property helper (`property.ts`, role `stub-aware`: it may catch). They pass the `[support]` rule only through this list, the reviewed route of the build log's phase 1 item: each entry names the module's path, its role, the SHA-256 of its reviewed content and why it catches, and each must read the stub's error the way the domain gives it, through `notImplementedFeature`. A module whose content no longer has its recorded hash is held to the full rule again until the change is reviewed and the new hash recorded. The list is an allow list of the loosening check's exception-list snapshot (`index.stub-aware-support-modules`), so an added entry or a changed hash also waits for the approver, and each entry is listed in `docs/build-log.md`, "For the owner's review". The other support modules (builders, fixtures) are not pinned: the `[support]` rule reads each of them on every run, and pinning them would make each new helper wait for the approver.

**The property helper** (`tests/guardrails/_support/property.ts`; phase 0 review round 1, finding 16). `assertProperty(arbitraries, predicate, parameters?)` and `assertAsyncProperty(...)` run a fast-check property whose predicate may reach an unbuilt stub for some inputs: an input whose run ends in the stub's error is held back, so fast-check keeps looking for, and shrinks, a real counterexample; every other error is rethrown at once (`fc.pre` included); when the run ends, a counterexample fails the case whatever the stub did for other inputs, and otherwise the first stub error held back is rethrown, so the pending wrapper holds the case out. Plain `fc.assert` can report the stub's error where an assertion failed for another input, and the wrapper would then skip the case. `property-helper.test.ts` proves both endings with whichever domain stub is still unbuilt (`tools/vitest/stub-probe.ts`).

**The reviewed list of test doubles** (`reviewed-test-doubles.json`) names each test double a case file or support module may use: its `path`, `call` (for example `vi.stubEnv`), `target` as the check reports it, and `reason`. It is empty. Each entry added is listed in `docs/build-log.md` for the owner's review. An entry that matches no use fails the check, so the list never allows more than the cases use.

**Eval runs** (`eval-runs.ts`) replace the hand-set `EVAL_RUNNER_EXISTS` switch (phase 0 review, round 2). An E case counts as real only when the runner module exists (`packages/ai/src/evals/runner.ts`, phase 2) and a results record `evals/guardrails/_results/<ID>.json` names its id, `samples: 5`, `passed: 5`, and the prompt hash, model id and schema hash it ran against, each equal to the current one: the hash of every file under `prompts/`, `MODEL_ID` in `packages/ai/src/model.ts`, and the hash of every file under `packages/ai/src/schema/`. So a change to the prompt, the model id or the schema after the run turns the case back to pending, with a problem (`CLAUDE.md` definition of done item 2). The paths are the phase 2 contract; phase 2 may move them, with the seeds and tests, in the same change as the runner.

**Run evidence** (`run-evidence.ts`): `reconcileWithRun` counts a T id as real only when its file reads as real and the run guard's report (`SOVITECH_RUN_GUARD_OUTPUT`) lists it as real, and names a missing report, a run with no guardrail case file, and every disagreement as `[run]` problems. `pnpm check` (`tools/check.ts`) is where it is wired.

## Files

| File | What it is |
|---|---|
| `guardrail-index.ts` | The parsed section 7 table: `loadGuardrailIndex()` returns `cases` (id, type, situation, expected, line), `byId`, `version` and `problems`. Other checks import it rather than parse the table again. `caseFilePath()` names a case's file |
| `case-files.ts` | Lists and classifies the case files: `classifyCasePath`, `analyseCaseSource` (the TypeScript reading), `classifyTestCase`, `classifyEvalCase`, `supportModuleFaults` |
| `wrapper-imports.ts` | `importsPendingWrapper`, `supportModulesReached`, `namesId` and the file reader, apart from the TypeScript parser so the run guard can load them cheaply |
| `eval-runs.ts` | The evidence of eval runs: when an E case may count as real |
| `run-evidence.ts` | `reconcileWithRun`: the static reading against the run guard's report |
| `reviewed-test-doubles.json` | The reviewed list of test doubles; empty |
| `stub-aware-support.json`, `support-pin.ts` | The reviewed list of support modules that may catch the stub's error, pinned by the SHA-256 of their reviewed content, and its reader (phase 1) |
| `property-helper.test.ts` | The property helper's contract: a failed assertion is never hidden behind a stub error, and a stub error is never dropped |
| `index-check.ts` | `buildIndexReport(root)` and `reportToResult(report)`; `runIndexCheck(root)`; `withRunConfigProblems` |
| `check.ts` | The check on the repository (`pnpm checks -- --only index`), with the config-integrity check (`tools/vitest/config-integrity.ts`) |
| `selftest.ts` | The control input `seeded/good/` must pass; each of the 45 bad inputs in `seeded/` must fail for its seeded reason; the run guard's seeded runs (`tools/vitest/seeded/`, including `no-assertion/` and `unguarded/`) must end as seeded; the repository's run settings must pass the config-integrity check, and each of the 12 seeded settings in `tools/vitest/seeded/config/` must fail it (`pnpm check:selftest -- --only index`) |
| `generate-stubs.ts` | Writes one pending stub per id with no case file. **Not run** while D-33 is open. Dry run by default; `--write` writes, never overwriting a file |
| `pending-wrapper.test.ts` | The pending wrapper's contract, every outcome of `runPendingBody` and `settlePending`, and loading a case file |
| `*.test.ts` | Unit tests (Vitest `unit` project) |

## Counts in the summaries

`run-all` (`pnpm checks`) and `pnpm check` print the counts of real, pending and no-automated-check-yet cases. A green run is labelled "passed with N pending (no automated check yet)" while any case is held out, so it never reads as if every case were checked.

## Reversing the no-stub convention

Only after the owner decides D-33 and the approver rules that a stub counts as a case file (ADR 0003, "How to reverse"):
1. Run `tsx tools/checks/index/generate-stubs.ts --write` once. Its eval stubs carry `status: stub`, which the check reads as a stub whatever the body.
2. In `index-check.ts`, `reportToResult` puts `report.stubs` into `noAutomatedCheckYet`, which fails the run. Move them to a list that does not fail (a new field in `tools/checks/types.ts`, printed by `tools/checks/runner.ts`), keeping the rule that an id with no file at all fails, and that a malformed file fails.
3. Update ADR 0003's status.

When the phase 2 eval runner exists, it writes `packages/ai/src/evals/runner.ts`, `MODEL_ID` in `packages/ai/src/model.ts`, the schema under `packages/ai/src/schema/`, and one results record per eval under `evals/guardrails/_results/` (`eval-runs.ts`). A full eval without `status: pending` then counts as real only with a current 5-of-5 record. If the runner's own schema check replaces the body check here, keep the results-record rule.
