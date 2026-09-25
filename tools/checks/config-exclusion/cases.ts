/**
 * The seeded inputs of the config-exclusion check, shared by selftest.ts and
 * the unit tests. Each case is a small tree under seeded/<id>/ whose configs
 * carry neutral names (workspace.yaml, eslint-config.mjs, ...), so no tool
 * picks a seeded config up as a real one. The paths of company/ are probes:
 * no seeded tree holds a company/ folder.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult } from '../types';
import { inspectAll, toCheckResult, type Targets } from './inspect';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

export interface SeededCase {
  readonly id: string;
  /** Text the findings of a bad case must contain, so it fails for the reason it was seeded for. */
  readonly expect: readonly string[];
  readonly targets: Omit<Targets, 'root'>;
}

export const GOOD_CASE: SeededCase = {
  id: 'good',
  expect: [],
  targets: {
    workspaceFiles: ['workspace.yaml'],
    packageJsons: ['root-package.json'],
    tsconfigs: ['tsconfig.json', 'apps/web/tsconfig.json'],
    eslintConfigs: ['eslint-config.mjs'],
    vitestConfigs: ['vitest-config.mjs'],
    playwrightConfigs: ['playwright-config.mjs'],
    prettier: { configs: ['prettierrc.json'], ignoreFile: 'prettierignore.txt', dependency: false },
    depcruise: { config: 'depcruise.cjs', scripts: { 'lint:deps': 'depcruise --config depcruise.cjs apps packages tools' } },
    pythonConfigs: [
      { path: 'root-pyproject.toml', kind: 'pyproject' },
      { path: 'services/extractor/pyproject.seeded.toml', kind: 'pyproject' },
    ],
    scripts: {
      'test:py': 'cd services/extractor && .venv/bin/ruff check . && .venv/bin/pytest -q',
      'lint:py:root': 'ruff check . --exclude company',
    },
    cssFiles: ['apps/web/src/styles.css'],
    viteConfigs: ['vite-config.mjs'],
    ciFiles: ['gitlab-ci.yml'],
    checkScanRoots: { lib: 'checks/lib.ts', sources: ['checks/walker/check.ts'] },
  },
};

export const BAD_CASES: readonly SeededCase[] = [
  { id: 'workspace-broad', expect: ['workspace pattern "*" reaches company/'], targets: { workspaceFiles: ['workspace.yaml'] } },
  { id: 'package-workspaces', expect: ['"workspaces": workspace pattern "**" reaches company/'], targets: { packageJsons: ['root-package.json'] } },
  { id: 'tsconfig-default-include', expect: ['tsconfig.json: includes company/'], targets: { tsconfigs: ['tsconfig.json'] } },
  { id: 'tsconfig-parent-include', expect: ['apps/web/tsconfig.json: includes company/'], targets: { tsconfigs: ['apps/web/tsconfig.json'] } },
  { id: 'tsconfig-paths-into-company', expect: ['compilerOptions.paths maps an import to "company/website/src/*"'], targets: { tsconfigs: ['tsconfig.json'] } },
  { id: 'eslint-no-ignores', expect: ['ESLint would lint company/'], targets: { eslintConfigs: ['eslint-config.mjs'] } },
  { id: 'vitest-no-exclude', expect: ['vitest-config.mjs: would collect company/'], targets: { vitestConfigs: ['vitest-config.mjs'] } },
  { id: 'vitest-project-without-extends', expect: ['project unit: would collect company/'], targets: { vitestConfigs: ['vitest-config.mjs'] } },
  { id: 'playwright-root-testdir', expect: ['testDir holds company/ and would run company/'], targets: { playwrightConfigs: ['playwright-config.mjs'] } },
  {
    id: 'prettier-without-ignore',
    expect: ['prettierignore.txt: Prettier is used'],
    targets: { prettier: { configs: ['prettierrc.json'], ignoreFile: 'prettierignore.txt', dependency: false } },
  },
  {
    id: 'depcruise-root-scan',
    expect: ['no rule of severity error forbids', 'dependency-cruiser scans ., which holds company/'],
    targets: { depcruise: { config: 'depcruise.cjs', scripts: { 'lint:deps': 'depcruise --config depcruise.cjs .' } } },
  },
  {
    id: 'ruff-root-without-exclude',
    expect: ['a ruff config at the repository root that does not exclude company'],
    targets: { pythonConfigs: [{ path: 'root-pyproject.toml', kind: 'pyproject' }] },
  },
  {
    id: 'pytest-root-testpaths',
    expect: ['pytest collects from "."'],
    targets: { pythonConfigs: [{ path: 'pytest-config.ini', kind: 'pytest-ini' }] },
  },
  {
    id: 'script-ruff-over-root',
    expect: ['runs ruff over the repository root'],
    targets: { pythonConfigs: [], scripts: { 'lint:py': 'ruff check .' } },
  },
  { id: 'script-names-company', expect: ['names company/website'], targets: { scripts: { 'lint:site': 'eslint company/website' } } },
  { id: 'tailwind-automatic-sources', expect: ['detects sources automatically'], targets: { cssFiles: ['styles.css'] } },
  { id: 'tailwind-source-at-root', expect: ['Tailwind source "../../.." reaches company/'], targets: { cssFiles: ['apps/web/src/styles.css'] } },
  { id: 'vite-without-deny', expect: ['the dev server can serve files under company/'], targets: { viteConfigs: ['vite-config.mjs'] } },
  { id: 'ci-broad-changes', expect: ['pattern "**/*" matches company/'], targets: { ciFiles: ['gitlab-ci.yml'] } },
  { id: 'ci-script-names-company', expect: ['names company, inside company/'], targets: { ciFiles: ['gitlab-ci.yml'] } },
  {
    id: 'check-scan-roots',
    expect: ['DEFAULT_IGNORES does not ignore company/', 'checks/walker/check.ts: scans files without the shared DEFAULT_IGNORES'],
    targets: { checkScanRoots: { lib: 'checks/lib.ts', sources: ['checks/walker/check.ts'] } },
  },
];

export async function runCase(seededCase: SeededCase): Promise<CheckResult> {
  return toCheckResult(await inspectAll({ root: join(SEEDED, seededCase.id), ...seededCase.targets }), seededCase.id);
}

/**
 * A bad case that fails without its expected finding failed for another
 * reason; it is returned as passing so the self-test run flags it.
 */
export function asSeededResult(seededCase: SeededCase, result: CheckResult): CheckResult {
  const details = result.details.join('\n');
  const missing = seededCase.expect.filter((text) => !details.includes(text));
  if (result.ok || missing.length === 0) return result;
  return { ...result, ok: true, summary: `${result.summary}; but not for the seeded reason (no finding with ${missing.join(', ')})` };
}
