# Seeded inputs for the index check

Synthetic repository roots for `tools/checks/index/selftest.ts` and the unit tests. Each folder holds its own `docs/guardrails.md` (a section 7 table with seeded rows) and its own `tests/guardrails/` and `evals/guardrails/`. None of it is the project's rules or a real case. ESLint, TypeScript, Vitest and every scanning check skip `tools/**/seeded/**`.

**Control input, which must pass:** `good/` holds real T cases, including one using the forms that run every test (options without a hold-out key or with `skip: false`, `each`, `for`, `concurrent`, a destructured context), a T case named after other ids first (`G7-2a`), a `.test.tsx` case, a pending case importing `_support/pending` directly (`G1-2`), one importing it through a `_support` re-export (`G1-3`), each starting with the domain's `// @pending-until:` marker and calling a domain stub, two full evals (`G2-1` with no status, `G2-2` with `status: pending`), both counted as pending because no eval runs before the phase 2 runner, with their synthetic fixtures under `fixtures/evals/<ID>/`, READMEs and `.gitkeep` files.

Eval files that stand for a good case in the other folders hold the full body too (a fixture, a task, assertions, `samples: 5`), so each folder fails only for its own seeded reason. Fixture files are one line of visibly synthetic text marked TEST.

**Bad inputs, each of which must fail for its own reason:**

| Folder | Seeded fault |
|---|---|
| `missing-id/` | A T id with no case file |
| `extra-id/` | A case file whose id is not in the table |
| `wrong-type-test/` | An E id written as a T case file |
| `wrong-type-eval/` | A T id written as an eval file, beside its real T file |
| `duplicate-id/` | One id on two rows |
| `row-outside-table/` | A blank line splits the table, leaving a row outside it |
| `bad-row/` | A type other than T or E |
| `no-section-7/` | The table sits under another heading |
| `stub-not-counted/` | Every id has only a stub |
| `held-out-test/` | A case file holds its test out with `test.skip` |
| `id-not-named/` | No string in the case file names its id |
| `eval-id-mismatch/` | An eval file whose `id` key names another case |
| `eval-unknown-status/` | An eval file with a status other than pending or stub |
| `eval-malformed-yaml/` | An eval file that does not parse |
| `nested-case-file/` | The only case file sits in a nested folder |
| `unrecognised-file-name/` | A `.spec.ts` and a `.yml` beside the real case files |
| `pending-without-marker/` | A case file imports the pending wrapper, but its first line has no `// @pending-until:` marker |
| `marker-without-wrapper/` | A case file starts with the marker, but runs its test with plain `test` |
| `malformed-marker/` | A case file imports the wrapper, and its marker names phase 9 and an unknown feature |
| `held-out-options/` | A test held out by an options object, `{ skip: true }` |
| `held-out-describe-option/` | A describe held out by `{ todo: true }` |
| `held-out-fails-option/` | A test inverted by `{ fails: true }` |
| `held-out-computed/` | A test held out by a computed modifier, `test['skip']` |
| `held-out-destructured/` | A test held out by a destructured modifier, `const { skip } = test` |
| `empty-test/` | A test with an empty body |
| `pending-self-thrown/` | A pending case that throws `new NotImplementedError('derive')` itself instead of calling the domain |
| `eval-id-only/` | An eval file holding only its id |
| `eval-pending-id-only/` | An eval file holding only its id and `status: pending` |
| `eval-missing-fixture/` | A full eval whose fixture file does not exist |
| `eval-samples-not-5/` | A full eval sampled 3 times |
| `empty-table/` | Section 7 has a table header and no row |
| `no-tests-folder/` | Section 7 lists only an eval, and `tests/guardrails/` does not exist |
| `vacuous-no-matcher/` | `expect('TEST')` with no matcher, which `expect.requireAssertions` counts as an assertion |
| `vacuous-assertions-zero/` | `expect.assertions(0)` |
| `vacuous-to-throw/` | A "Rejected" case written as `.toThrow()` and `.rejects.toThrow()` naming no error, which pass on the unbuilt stub's error |
| `double-vi-mock/` | `vi.mock('@sovitech/domain', ...)`: the code under test replaced |
| `double-vi-domock/` | `vi.doMock` of a relative domain path |
| `double-spy-mock/` | `vi.spyOn` on a domain function, then `mockReturnValue` |
| `double-stub-global/` | `vi.stubGlobal` |
| `double-stub-env/` | `vi.stubEnv` |
| `double-reset-modules/` | `vi.resetModules()` and a fresh import of the domain, whose stubs the stub guard would not count |
| `support-swallows/` | A case that runs through a `_support/` helper that swallows the body's failure and asserts a constant |
| `reviewed-double-stale/` | A reviewed-list entry (`tools/checks/index/reviewed-test-doubles.json` in the seed) that matches no use |
| `eval-runner-no-results/` | The eval runner module exists (a seeded stand-in, with a seeded prompt, model id and schema), and a full eval has no results record: the old hand-set switch would have counted it real |
| `eval-runner-stale-results/` | The same, with a results record made against another prompt and schema |

Of the 13 folders from `held-out-options/` on, the code before the phase 0 review fix passed 12 (it failed `empty-table/` through its table parser). The 13 folders from `vacuous-no-matcher/` on come from the second review round: the code before it counted the case file of each of the first 10 as real, had no reviewed list, and had only a hand-set eval switch. The run-time forms are seeded in `tools/vitest/seeded/`.
