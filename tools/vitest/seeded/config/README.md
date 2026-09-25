# Seeded settings for the config-integrity check

Each folder holds one or more files that `tools/vitest/config-integrity.ts` reads, laid over the repository: a file found here is read instead of the repository's, and every other file comes from the repository. Each seeded setting loses a guard of the guardrail run, and the check must fail it with its own problem (`SEEDED_CONFIGS` in `config-integrity.ts`; the index check's self-test and `config-integrity.test.ts` run them). The `vitest.config.ts` seeds import the repository's own config and change one thing, so they never drift from it. Nothing here is the project's settings.

| Folder | What it seeds | Problem |
|---|---|---|
| `no-run-guard/` | The run guard taken out of the root reporters | the root reporters do not list the run guard |
| `no-stub-guard/` | The `guardrails` project without its setup files | the setupFiles do not list the stub guard |
| `no-require-assertions/` | The `guardrails` project without `expect.requireAssertions` | does not set expect.requireAssertions: true |
| `support-collected/` | The `guardrails` project without its `_support` exclude | does not exclude tests/guardrails/_support/** |
| `include-narrowed/` | An include that misses the `.ts` case files | includes only the `.tsx` pattern |
| `project-renamed/` | The `guardrails` project renamed | 0 inline projects named "guardrails" |
| `pass-with-no-tests/` | `passWithNoTests: true` on the `guardrails` project | sets passWithNoTests: true |
| `test-script-reporter/` | `vitest run --reporter=dot`, which replaces the run guard | the test script adds "--reporter=dot" |
| `test-script-project/` | `vitest run --project unit`, which drops the guardrail cases | the test script adds "--project" "unit" |
| `test-script-or-true/` | `vitest run \|\| true`, which hides every failure | the test script adds "\|\|" "true" |
| `check-without-tests/` | A `tools/check.ts` whose steps leave out the test script | pnpm check does not run the "test" script |
| `ci-test-reporter/` | A CI job that runs `pnpm run test --reporter=dot` | no CI job runs "pnpm run test" as written |

All TEST, synthetic. ESLint, TypeScript and the repository's Vitest projects skip `tools/**/seeded/**`.
