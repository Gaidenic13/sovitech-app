# Seeded run for the guardrail run guard

A synthetic Vitest root for `tools/vitest/run-seeded.ts`. Each file under `tests/guardrails/` is one seeded case file; none is a real guardrail case, and nothing here is the project's rules. `_support/pending.ts` re-exports the real pending wrapper, so the pending cases run as the repository's do. `vitest.config.ts` takes the `guardrails` project's setup files (the stub guard) from the repository's own `vitest.config.ts`, so these seeds prove that config, not a copy of it. `_support/lenient.ts` is a seeded helper that swallows a body's failures (G2-14).

A file listed "held out" must also be under `heldOut` in the guard's report, never under `real` (phase 0 review, round 2).

| File | What it seeds | Expected |
|---|---|---|
| `G1-1.test.ts` | A real case that passes | control: no problem, counted real |
| `G1-2.test.ts` | A pending case: the wrapper holds it out while the `verify-proposal` stub throws | control: no problem, counted pending |
| `G1-3.test.ts` | `test(name, { skip: true }, fn)` | `[held out]`, marked skip |
| `G1-4.test.ts` | `test(name, { todo: true }, fn)` | `[held out]`, marked todo |
| `G1-5.test.ts` | `test(name, { fails: true }, fn)` whose body throws | `[held out]`, fails mode |
| `G1-6.test.ts` | `describe(name, { skip: true }, ...)` | `[held out]`, marked skip |
| `G1-7.test.ts` | `test['skip'](...)` | `[held out]`, marked skip |
| `G1-8.test.ts` | `const { skip } = test; skip(...)` | `[held out]`, marked skip |
| `G1-9.test.ts` | `context.skip()` with the wrapper's note, outside the wrapper | `[held out]`, no pending record |
| `G1-10.test.ts` | The wrapper's record and note forged in a file without the marker | `[held out]`, no marker |
| `G1-11.test.ts` | A case file that registers no test | `[no tests]` |
| `G1-12.test.ts` | `test.only` beside another test | `[held out]` for the test it leaves out, marked skip (Vitest reads the `.only` test itself back as mode `run`; the index check flags `.only` in the source) |
| `G2-1.test.ts` | A pending case whose body throws `new NotImplementedError('verify-proposal')` itself | the test fails (the constructor refuses it) |
| `G2-2.test.ts` | A pending case whose body throws a look-alike error class | the test fails |
| `G2-3.test.ts` | A passing test whose title does not name the case id | `[title]` |
| `G2-4.test.ts` | `test.todo(name)` | `[held out]`, marked todo |
| `G2-5.test.ts` | `test.skipIf(true)(...)` | `[held out]`, marked skip |
| `G2-6.test.ts` | A pending case whose body fails to import a module | the test fails |
| `G2-7.test.ts` | A stale marker: a pending case whose marker still names `derive`, which phase 1 built (no domain stub declares it) | the file fails to load (`[no tests]`) |
| `G2-8.test.ts` | A pending case whose body passes | the test fails, asking for the wrapper to come off |
| `G2-9.test.ts` | The wrapper with no marker on the first line | the file fails to load: `[no tests]` |
| `G2-10.test.ts` | A case file whose import fails | the file fails to load: `[no tests]` |
| `G2-11.test.ts` | `expect(() => verifyProposal(...)).toThrow()` without the pending wrapper: it passes because the stub throws | the test fails: `[stub] case exercises an unbuilt stub` (during the test: verify-proposal) |
| `G2-12.test.ts` | `await expect(...verifyProposal(...)).rejects.toThrow()` without the pending wrapper | the test fails: `[stub] ...` (during the test: verify-proposal) |
| `G2-13.test.ts` | The verify-proposal stub reached while the file loads, its error swallowed, and a test asserting on the outcome | the test fails: `[stub] ...` (outside any test of this file) |
| `G2-14.test.ts` | A support helper (`_support/lenient.ts`) that swallows the body's failure and asserts a constant | the test fails: `[stub] ...` (during the test: verify-proposal) |

ESLint, TypeScript and the repository's Vitest projects skip `tools/**/seeded/**`.

Since phase 1 built `derive` (its stub and its place in `DOMAIN_FEATURES` went together, ADR 0004), the seeds that need an unbuilt stub reach `verify-proposal`: `verifyProposal()` with no proposal reaches its stub, past check 1, which phase 1 built.
