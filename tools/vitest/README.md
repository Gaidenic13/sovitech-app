# tools/vitest

Vitest extensions for the blocking run (`pnpm test`, `pnpm check`, CI): the run guard (a reporter), the stub guard (a setup file of the `guardrails` project), and the config-integrity check that keeps both registered.

## The guardrail run guard

`guardrail-run-guard.ts` is a Vitest reporter, registered in `vitest.config.ts` beside the default reporter. After the run it reads the results of every guardrail case file (`tests/guardrails/<ID>.test.ts`, `docs/guardrails.md` section 7) and fails the run (exit code 1) when a case did not really run:

| Problem | When |
|---|---|
| `[held out]` | A test is marked skip, todo or only (a modifier, an options object such as `{ skip: true }`, a describe-level option, a `.only` elsewhere in the file, or a `-t` filter); a test runs in fails mode; or a test was skipped while running by anything but the pending wrapper |
| `[no tests]` | A case file ran no test (it registered none, or failed to load) |
| `[not run]` | A test did not finish |
| `[title]` | A test's full name does not name the file's case id |
| `[unguarded]` | A test passed without the stub guard's record in its meta, so the stub guard did not run for it |
| `[stub]` | A test passed although the stub guard's record shows it reached an unbuilt domain stub (the stub guard fails such a test itself; this is the second look, for example at a test in fails mode) |
| `[not collected]` | On a run with no file filter, a case file on disk was not collected |

A skip counts as the pending wrapper's only when all of these hold: the wrapper's record is in the test's meta (`sovitechPending`), the note is exactly the wrapper's (`pending: no automated check yet (<feature> is not implemented; phase <n>)`), and the case file starts with the pending marker naming that feature and phase and imports the wrapper (`tests/guardrails/_support/pending.ts`; ADR 0004). Such a case is printed as pending, never as passing.

**The report.** Each case file that ran is in exactly one list of the JSON report (`SOVITECH_RUN_GUARD_OUTPUT`), checked in this order: `failed` (a test failed), `heldOut` (a `[held out]` problem), `notCounted` (any other problem), `pending` (held out by the wrapper only), `real` (at least one test passed, and the file has no problem). A file with a test in fails mode is under `heldOut`, never under `real`, although Vitest counts the test as passed (phase 0 review, round 2). `failureMessages` holds the first line of each error of each failed test, by case id.

The index check (`tools/checks/index/`) reads the case files' source; the guard reads what Vitest did with them. Each covers what the other cannot see. `tools/checks/index/run-evidence.ts` reconciles the two: a code-test id counts as real only when its file reads as real and the run passed it as real. `pnpm check` (`tools/check.ts`) runs its Vitest step with `SOVITECH_RUN_GUARD_OUTPUT` pointing at a scratch file outside the repository, and prints the case counts from `tools/checks/index/run-counts.ts`: a missing report, a run that saw no guardrail case file, and a case that reads as real but did not run and pass are `[run]` problems, and the run is not green. CI does the same across two jobs: `test:vitest` keeps the report as an artifact, and `checks:run-evidence` reads it with `tools/checks/index/reconcile-run.ts`. A seeded Vitest run started by a unit test writes only its own report (`run-seeded.ts` drops the variable when it runs without the guard).

## The stub guard

`guardrail-stub-guard.ts` is a setup file of the `guardrails` project (`setupFiles` in `vitest.config.ts`); `stub-guard.ts` holds its record and verdict. It exists because a case written without the pending wrapper passed against the unbuilt domain stubs when it only asserted that the call throws, `expect(() => derive(...)).toThrow()` or `await expect(...verifyProposal(...)).rejects.toThrow()`, and counted as real (phase 0 review, round 2). Every case whose Expected cell is "Rejected" is naturally written that way.

- The domain counts every NotImplementedError its stubs throw, caught or not (`stubErrorCounts` in `packages/domain/src/not-implemented.ts`, a module-private record next to the branded-error WeakMap; only the throwers raise it). Since phase 1 `countsSince` reads a feature with no count as one that threw nothing, so the domain may keep its counts sparse (`sovitech/no-zero-tally` bans a tally started at zero for every key in `packages/`).
- Around each test the guard reads the count. A test that reached a stub fails with `[stub] case exercises an unbuilt stub`, unless the pending wrapper held it out (its skip, with its record and note word for word). Stub errors thrown in the file outside any test (at load, in a describe body, in a beforeAll hook) count against every later test of the file.
- It writes its record (`sovitechStubGuard`) into every test's meta, so the run guard can tell that it ran (`[unguarded]`).

**Limits.** Tests that run concurrently share one count, so a stub error in one counts against every test whose run overlaps it (the guard fails closed). A case file that loads a second copy of the domain would count in that copy, and a mocked domain throws nothing: the index check refuses `vi.mock`, `vi.doMock`, `vi.resetModules`, `vi.importActual` and `vi.importMock` in case files and support modules (`[test double]`). After a stub is built, a case that catches its own failures would pass; the index check refuses error-swallowing support helpers (`[support]`), and review is the last line for a case file.

## Tests that assert nothing

The `guardrails` project sets `expect: { requireAssertions: true }` (phase 0 review, finding 9), so a guardrail test whose body makes no assertion fails, even when its body is not empty. A test the pending wrapper skips is not affected. `seeded/no-assertion/` proves it: its config reads the `guardrails` project's `expect` settings from the repository's `vitest.config.ts`, and its `G1-3` asserts nothing. With the repository's settings Vitest fails the run; with `SOVITECH_SEED_WITHOUT_REQUIRE_ASSERTIONS=1`, the settings from before the fix (none), the run passes. Vitest counts `expect(x)` with no matcher as an assertion; the index check refuses it (`[vacuous]`).

## Config integrity

`config-integrity.ts` reads the repository's own settings and names every way the blocking run would lose a guard (phase 0 review, round 2: the seeded runs pass the guard on the command line, so they stayed green when the repository stopped registering it):

- `vitest.config.ts`: the run guard among the root reporters; exactly one inline project named `guardrails`, whose include is `tests/guardrails/**/*.test.ts` and `.test.tsx`, whose exclude holds `tests/guardrails/_support/**`, which sets `expect.requireAssertions: true` and whose `setupFiles` list the stub guard; no `passWithNoTests` or `allowOnly` at the root or in that project;
- `package.json`: the `test` script is `vitest run` with no flag outside `ALLOWED_TEST_SCRIPT_FLAGS` (none), so no `--reporter`, `--project`, `-t` or `|| true`;
- `tools/check.ts` runs the `test` script, and a job in `.gitlab-ci.yml` runs `pnpm run test` as written.

It runs three ways: `config-integrity.test.ts` in the unit project; the index check on the repository (`tools/checks/index/check.ts`, `[run config]` problems), which holds even when a broken config would keep the unit tests from running; and the index check's self-test, where each seed under `seeded/config/` must fail it. `repo-config.ts` reads the guardrails project out of a config; the seeded roots' configs use it, so each seed runs with the repository's own settings.

## Limits

- A `--reporter` flag on the command line replaces the configured reporters, the guard included. The config-integrity check refuses one in the `test` script, in `pnpm check` and in CI; a developer's own command line is out of reach.
- The guard runs in Vitest's main process and reads what the test workers report. A case file written to forge the wrapper's record and note, in a file that also carries the marker and imports the wrapper, would pass it; the index check fails such a file on its `.skip` call, and review is the last line.
- Vitest reads a `.only` test itself back as mode `run`. The tests it leaves out in the same file are marked skip and fail the run; a lone `.only` holds nothing out. The index check flags `.only` in the source.

## Which stub the harness's own tests reach

Phase 1 built `derive`, so its stub and its place in `DOMAIN_FEATURES` went (ADR 0004). The seeded runs (`seeded/run/`), the pending-wrapper and stub-guard unit tests and the index check's seeds that need an unbuilt stub now reach `verify-proposal`: `verifyProposal()` with no proposal reaches its stub past check 1, which phase 1 built. `G2-7` is now a stale marker (a pending case still naming `derive`), which must fail to load. `stub-probe.ts` finds whichever stub still throws for tests that need one and do not care which; when phase 2 builds the last one, those tests say so and skip, and the pending wrapper can go.

## Proof

- `guardrail-run-guard.test.ts` (unit project): the audit on hand-built results, the reporter's wiring, and real Vitest runs in a child process on the seeded roots.
- `stub-guard.test.ts`: the domain's count, the verdict, and the record's shape. `config-integrity.test.ts`: the repository's settings, settings built in memory that lose a guard, and every seed under `seeded/config/`.
- `run-seeded.ts` runs the seeded roots and holds the expected outcome of each seeded file. The index check's self-test (`pnpm check:selftest -- --only index`) runs them too.
- `seeded/run/`: one case file per fault, two controls, run with the repository's stub guard; its README lists them. `seeded/held-out-only/`, `seeded/not-collected/` and `seeded/unguarded/`: Vitest alone passes each; the guard must fail it. `seeded/no-assertion/`: the repository's `guardrails` settings must fail it, and the settings before the fix pass it. `seeded/config/`: settings that lose a guard; the config-integrity check must fail each.

Seeded inputs live under `tools/**/seeded/`, which ESLint, TypeScript and the repository's Vitest projects skip.
