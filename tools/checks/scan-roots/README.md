# tools/checks/scan-roots: one list of scan roots

`roots.json` is the one list of the folders each scan reads, and of the folders no scan reads, with the reason. It was added after the phase 0 review round 2 (adversarial finding 13): every scan named its own fixed roots, so a top-level folder added later (`scripts/`, `seeds/`, `db/`) escaped dependency-cruiser, the lint bans, the reserved-term check and the CI path filter, and a `packages/<pkg>/seeds/`, `migrations/` or `templates/` folder escaped the reserved-term and mockup-figure checks, which read `packages/*/src` only. Prompt 3 does not fix where the demo seed lives, so that was a live gap (guardrails rule 10, "Demo data"; 2.8 names seeds and templates as scan targets).

## The list

| Group | Classifies |
|---|---|
| `topLevel` | every folder at the top of the repository, dot folders included, with `"ci"`: whether the path filter of `.gitlab-ci.yml` names it |
| `packageSubfolders` | every folder directly under `packages/<pkg>/` (`src`, `gates`, `test-formulas`, `seeds`, `migrations`, `templates`, ...) |
| `serviceSubfolders` | every folder directly under `services/<service>/` (`src`, `tests`, the virtual environment, caches) |

Each entry is either `{ "scans": [...] }`, naming the scans that read the folder, or `{ "excluded": "<reason>" }`. The scans are `lint:deps`, `lint-bans`, `reserved-terms`, `mockup-figures`, `python-bans` and `ruff-pytest`, each described in the list's `scans`. A subfolder names only scans its top-level folder names. `company/` is excluded with `"ci": false` (build-readiness decision 12). The reviewed exclusions are the ones the finding named: `company/`, `design/`, `docs/`, `prompts/`, `.claude/`, installed folders (`node_modules/`, `.pnpm-store/`, `.cache/`, virtual environments), `.git/`, generated output (`test-results/`, `playwright-report/`, `coverage/`, `dist/`, caches) and editor folders.

## Readers

| Reader | What it reads |
|---|---|
| `pnpm lint:deps` (`lint-deps.ts`) | the `lint:deps` top-level roots, passed to dependency-cruiser with `.dependency-cruiser.cjs` |
| the `lint-bans` check | its ban roots (`lint-bans`) and, through `tools/eslint-rules/depcruise-harness.ts`, the `lint:deps` roots for its boundary run |
| `services/extractor/tests/test_bans.py` (`pnpm test:py`) | the `python-bans` subfolders of every service |
| the reserved-term check (`PHASE_0_SCOPE` in `tools/checks/reserved-terms/scan.ts`) | `scanGlobs('reserved-terms')`, added to its optional roots; its required roots (`apps/**`, `packages/**`) are wider still |
| the mockup-figure and company-figure checks (`SCOPE` in `tools/checks/mockup-figures/figures.ts`) | `scanGlobs('mockup-figures')`, added to their optional roots |
| the config-exclusion check (`tools/checks/config-exclusion/discover.ts`) | the `lint:deps` top-level roots, inspected as the dependency-cruiser command `lint-deps.ts` runs, so a list that would have it cruise `company/` fails there too |
| the loosening check (`tools/checks/loosening/exception-lists.ts`) | every exclusion (`scan-roots.excluded`, an allow list) and every folder-and-scan pair and CI mark (`scan-roots.scanned`, a deny list), in the exception-list snapshot: an added exclusion or a removed scan fails until the approver approves it |
| the `scan-roots` check | the whole list |

`scanGlobs(scan)` in `roots.ts` turns the list into globs (`apps/**`, `packages/*/src/**`, `packages/*/seeds/**`, ...) for checks that take globs. `wiring.test.ts` pins that the reserved-term and figure scopes hold every glob the list names for them, that the lint bans read the list's `lint-bans` roots, and that the config-exclusion check inspects the `lint:deps` roots. The CI path filter is compared with the list by the `scan-roots` check.

## The check

`pnpm checks` (`scan-roots` row) fails when:

| Id | When |
|---|---|
| `scan-roots/unlisted` | a folder at the top, under `packages/<pkg>/` or under `services/<service>/` is neither scanned nor excluded. A symbolic link counts as a folder and is never followed |
| `scan-roots/list` | the list is malformed: an unknown scan, an entry with both or neither of `scans` and `excluded`, an exclusion with no reason, a subfolder scan its top-level folder does not name, or `company/` not excluded |
| `scan-roots/lint-deps` | the `lint:deps` script is not `tsx tools/checks/scan-roots/lint-deps.ts` |
| `scan-roots/ci-paths` | the path filter of `.gitlab-ci.yml` does not name a folder marked `"ci": true` that exists, names a folder the list does not mark, has no `"*"` entry, or names something other than a whole top-level folder (`<folder>/**/*`) |
| `scan-roots/scope` | no folder was read, or none of the `lint:deps` roots exists (phase 0 review, finding 17) |

To add a folder: add it to the list, with the scans that must read it or the reason no scan does, and, for a top-level folder, `"ci"` and the matching line in `.gitlab-ci.yml`; then record the change with `tsx tools/checks/loosening/write-baseline.ts`. A new exclusion lets a folder go unread, so the writer refuses it and the loosening check fails it until the approver approves an exception-list snapshot that holds it; a new scanned folder is a tightening the writer records.

## Self-test

`selftest.ts` copies `seeded/good/` to a temporary folder, lays each case of `seeded/bad/<id>--<situation>/` over it, applies the case's `scan-roots.patch.json` to a copy of the list when it has one, and runs the check; a `scope--` case runs on its own files alone. Every case must fail with `scan-roots/<id>`, and the good tree must pass. The cases:

- `unlisted--scripts-folder-for-a-demo-seed` (`scripts/seed.ts`, the finding's own example), `unlisted--scripts-folder-in-a-package`, `unlisted--scripts-folder-in-a-service`;
- `lint-deps--fixed-roots-in-the-script` (the script as it was before the fix);
- `ci-paths--listed-folder-missing-from-the-filter`, `ci-paths--filter-names-an-unlisted-folder`;
- `list--company-scanned`, `list--exclusion-without-a-reason`, `list--unknown-scan`;
- `scope--nothing-to-read`.

## How to reverse

Set `lint:deps` back to `depcruise --config .dependency-cruiser.cjs <roots>` and give the lint-bans check and the depcruise harness fixed roots again; drop this folder. That lets new folders go unread again, so it is listed in the build log for review before it is made.
