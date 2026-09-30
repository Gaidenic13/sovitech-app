# 0001. Toolchain and monorepo

- **Status:** Accepted: default, reversible
- **Date:** 2026-09-25

## Context

Prompt 3 section 5.2, row "Monorepo and tooling", sets the default for an open choice: a pnpm workspace, TypeScript strict, Vitest with fast-check, Playwright, ESLint and dependency-cruiser, with GitLab CI configuration written in the repo and mirrored by one local command, `pnpm check`. Its sources are `docs/build-readiness.md` section 3 "Now", items 1 (repository layout) and 2 (harness first).

The PRD records these tools as Proposed, not decided: section 13, "Build recommendations for prompt 3's ADRs", row "The harness tools", D id **D-33**. The checks themselves are required by R-156. D-33 also holds build-readiness decision 11 (creating the GitLab project and the loosening hook) and decision 12 (keeping `company/` out of the build). D-32 is the frontend row and is recorded in ADR 0002, not here.

The owner decided no D row as of 2026-09-25, so the 5.2 default applies with this ADR.

Toolchain found on the development machine (2026-09-25): Node 22.17.1, pnpm 12.6.0 (Homebrew), Python 3.12.14 (`/opt/homebrew/bin/python3.12`), Docker client 29.8.1 with server 29.5.2 through Colima 0.10.3 (4 CPUs, 8 GiB), macOS arm64.

## Decision

**Workspace.**
- pnpm workspace; `pnpm-workspace.yaml` lists `apps/*` and `packages/*` only, so `company/**` is never a workspace package (build-readiness decision 12).
- Root `package.json`: private, `"packageManager": "pnpm@12.6.0"`, engines Node `>=22.12.0 <23`; `.node-version` pins the major, `22`. `engineStrict: true`.
- Packages: `packages/domain`, `registry`, `engine`, `view-model` (entries `./server` and `./browser`), `db`, `ui`, `viewer`, `ai`; `apps/web`, `apps/api`; `services/extractor` (Python, outside the pnpm workspace). The layout is prompt 3 section 6.
- Workspace packages are consumed as TypeScript source through their `exports` maps. There is no build step for packages; Vite, Vitest and tsx transform the source.
- `packages/registry` exposes sub-entries (`./reserved-terms`, `./gates`, `./validation`, `./test-utils`) so parallel work on the registry touches separate folders.

**Versions.** Every npm dependency is pinned to a single version in `package.json` (no ranges), and `pnpm-lock.yaml` records the tree. Main pins: TypeScript 6.0.3, Vitest 5.0.1, fast-check 4.10.2, @playwright/test 1.63.0 (Chromium only), ESLint 10.11.0 with typescript-eslint 8.70.1, @eslint/css 2.0.0 and eslint-plugin-react-hooks 7.1.1, dependency-cruiser 18.4.0, tsx 4.23.15, Vite 8.3.0, React 19.3.0, Tailwind CSS 4.3.3, Fastify 5.12.5, decimal.js 10.6.0, yaml 2.9.1, zod 4.6.5, tinyglobby 0.2.17, @axe-core/playwright 4.13.0. The extractor's development tools are pinned in `services/extractor/requirements-dev.in`: ruff 0.16.9 and pytest 9.1.1, installed into `services/extractor/.venv` from Python 3.12.

**Python lock** (added 2026-09-25 after the phase 0 review, findings 7 and 21: only the two top-level tools were pinned, so their dependencies could change between installs and the licence check read whatever was installed).
- `services/extractor/requirements-dev.lock` pins the whole resolved set, each with the SHA-256 of every file PyPI publishes for that version: iniconfig 2.3.0, packaging 26.3, pluggy 1.6.0, Pygments 2.21.0, pytest 9.1.1 and ruff 0.16.9. It resolves for Python 3.12 on macOS and Linux; pytest's Windows-only and pre-3.11 dependencies are left out by their markers.
- Install only from the lock, with hash checking: `python3.12 -m venv services/extractor/.venv && services/extractor/.venv/bin/python -m pip install --disable-pip-version-check --require-hashes -r services/extractor/requirements-dev.lock`. The CI `.python` job and `pnpm setup:py` both do this. With `--require-hashes`, pip refuses a file whose hash differs and any dependency the lock does not list.
- **Regenerating it.** pip-tools is not a project dependency. Create a throwaway venv outside the repository, install pip-tools from PyPI into it (7.6.1 was used), and run from `services/extractor/`: `pip-compile --generate-hashes --strip-extras --no-emit-index-url --output-file=requirements-dev.lock requirements-dev.in`. Commit both files.
- **Checked on 2026-09-25.** A fresh venv installed from the lock with `--require-hashes` holds the same six distributions and versions as the existing `.venv`. With one hash changed, pip refused the install; with a transitive entry removed, pip refused it too.
- **Since phase 2 (2026-09-26)** there are three locks: `requirements.lock` (the extractor runtime), `requirements-fixtures.lock` (the fixture generators) and `requirements-dev.lock` (both, plus these tools), installed wheel-only into a recreated venv. [ADR 0018](0018-extractor-dependencies-and-sandbox-image.md) records them, the order to regenerate them in, and the sandbox image.

Two pins differ from the newest release:
- **TypeScript 6.0.3, not 7.0.2.** typescript-eslint 8.70.1 declares `typescript >=4.8.4 <6.1.0`, and type-aware lint rules are needed for the bans on engineering values (prompt 3 section 7).
- **Vite 8.3.0, not 8.3.1.** pnpm 12's supply-chain policy flagged 8.3.1, published on 2026-09-24, as too recent, and wrote an exclusion for it into `pnpm-workspace.yaml` during the first install. The exclusion was removed and the previous release pinned instead, so no exclusion weakens the policy.

esbuild's install script is allowed to run (`allowBuilds` in `pnpm-workspace.yaml`); it checks its platform binary, which tsx and Vite use. No other dependency runs a build script.

**TypeScript.** `tsconfig.base.json`: target and lib ES2023, `module: ESNext`, `moduleResolution: bundler`, `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`, `noEmit`, and `types: []` (each tsconfig names its own). Each package has its own `tsconfig.json`; the root `tsconfig.json` covers `tools/`, `tests/`, `evals/`, `fixtures/` and the root config files, in `.ts`, `.mts` and `.cts` (the last two since the phase 0 review round 2, when a `.mts` or `.cts` file there would have gone untypechecked). Every tsconfig excludes `company/**`.

**Tests.** Vitest projects in `vitest.config.ts`: `unit` (`packages/*/src/**/*.test.ts`, `apps/*/src/**/*.test.ts`, `tools/**/*.test.ts`) and `guardrails` (`tests/guardrails/**/*.test.ts`). `tests/proposed/` has its own config, `vitest.proposed.config.ts`, and a non-blocking script. Playwright (`playwright.config.ts`) has a `render` project for `tests/e2e/render/` and an `e2e` project for the rest, served by `vite preview` on port 4173 at a 1440×900 viewport.

**Lint.** ESLint flat config (`eslint.config.js`) with type information from the TypeScript project service. The SOVITECH bans live in a local plugin, `tools/eslint-rules/index.js`, spread last. Package boundaries live in `.dependency-cruiser.cjs`, which already fails any import that reaches into `company/`.

**One command.** `pnpm check` (`tools/check.ts`) runs, in order and without stopping at a failure: ESLint, dependency-cruiser, the package typechecks, the root typecheck, Vitest (unit and guardrails), the extractor's ruff and pytest, the Playwright render project, every check in `tools/checks/`, and their self-tests. It prints a summary and exits non-zero if any step failed. Since the phase 0 review round 2 its guardrail case counts are matched against its own Vitest run (the run guard's report, `SOVITECH_RUN_GUARD_OUTPUT`; ADR 0003), and a case that reads as real but did not run and pass keeps the run from being green. `.gitlab-ci.yml` runs the same scripts as jobs, with Docker Hub base images pinned by digest, a non-blocking `test:proposed` job, path filters that leave out `company/**`, and no deploy stage. The checks, their self-tests and the run reconciliation are separate jobs (`checks`, `checks:selftest`, `checks:run-evidence`), as they are separate steps of `pnpm check`: until round 2 one job ran `pnpm run checks` and then `pnpm run check:selftest`, so the index check's expected failure (ADR 0003) would have kept the self-tests from ever running in CI. The checks jobs fetch the full history and a local `main`, which the loosening check reads approvals from (ADR 0005), and the self-test job installs Chromium for the render harness pages.

**Checks.** Each repository check is a folder `tools/checks/<name>/` with `check.ts` and `selftest.ts`, discovered by `tools/checks/run-all.ts` (contract in `tools/checks/README.md` and `tools/checks/types.ts`).

## Consequences

- Builders add code, tests and checks in their own folders; no one needs to edit the shared configs to add a check, a lint rule or a test file.
- `company/**` is excluded from the workspace, every tsconfig, ESLint, Vitest, Playwright, dependency-cruiser, ruff, pytest, the Tailwind sources, the checks' default ignores and the CI path filters. Prettier is not used.
- Vitest 5, ESLint 10, Vite 8 and TypeScript 6 are recent majors. A tool defect found later is handled by pinning another version, recorded here.
- Playwright's web server runs Vite directly from `apps/web` (not through pnpm): with pnpm in between, Playwright's shutdown did not reach the Vite process and runs hung after the tests ended. `pnpm test:render` runs through `tools/run-render.ts`, which fails at once, with a message, while `tests/e2e/render/` holds no spec.
- No GitLab project exists (build-readiness decision 11, D-33), so the CI file is not run anywhere yet. `pnpm check` is the only running mirror.

## How to reverse

- **Another package manager or tool version:** change the pin in `package.json`, run `pnpm install`, commit the lockfile, and record the change here. Tests are plain Vitest and Playwright files and do not depend on the workspace tool.
- **Another test runner or linter:** the checks in `tools/checks/` are plain TypeScript modules run by tsx and do not depend on Vitest or ESLint; only the test files and `eslint.config.js` would change.
- **Another CI system:** `.gitlab-ci.yml` only calls `pnpm run <script>`; the same scripts serve any CI.
