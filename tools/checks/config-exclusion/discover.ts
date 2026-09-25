/**
 * Finds this repository's tool configs for the config-exclusion check. Every
 * listing goes through listFiles, whose shared ignores keep company/,
 * installed and generated files, and seeded inputs out.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { listFiles } from '../lib';
import { LIST_PATH, loadScanRoots, topLevelRoots } from '../scan-roots/roots';
import type { PythonConfigKind, Targets } from './inspect';
import { record } from './paths';

/**
 * The name under which the dependency-cruiser roots of the shared scan-roots list
 * are inspected. `pnpm lint:deps` runs tools/checks/scan-roots/lint-deps.ts, which
 * cruises the "lint:deps" roots of tools/checks/scan-roots/roots.json, so the
 * script itself names no root; the roots are read from the list and inspected as
 * the command the wrapper runs (phase 0 review, round 2).
 */
export const LISTED_DEPCRUISE_SCRIPT = `lint:deps (${LIST_PATH})`;

/** The command lint-deps.ts runs, with the list's lint:deps roots; undefined when the root has no list. */
function listedDepcruiseCommand(root: string, config: string): string | undefined {
  const path = join(root, LIST_PATH);
  if (!existsSync(path)) return undefined;
  return ['depcruise', '--config', config, ...topLevelRoots('lint:deps', loadScanRoots(path))].join(' ');
}

function pythonKind(path: string): PythonConfigKind {
  const name = basename(path);
  if (name === 'pyproject.toml') return 'pyproject';
  if (name === 'ruff.toml' || name === '.ruff.toml') return 'ruff';
  if (name === 'pytest.ini') return 'pytest-ini';
  if (name === 'tox.ini') return 'tox';
  return 'setup-cfg';
}

export async function repositoryTargets(root: string): Promise<Targets> {
  const exists = (path: string): boolean => existsSync(join(root, path));
  const json = (path: string): Record<string, unknown> => record(JSON.parse(readFileSync(join(root, path), 'utf8'))) ?? {};

  const packageJsons = await listFiles(['package.json', 'apps/*/package.json', 'packages/*/package.json', 'services/*/package.json'], { cwd: root });
  const rootPackage = exists('package.json') ? json('package.json') : {};
  const scripts = Object.fromEntries(
    Object.entries(record(rootPackage['scripts']) ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
  const manifests = packageJsons.map(json);
  const prettierInManifest = manifests.some((manifest) => manifest['prettier'] !== undefined);
  const prettierDependency = manifests.some((manifest) =>
    ['dependencies', 'devDependencies', 'optionalDependencies'].some((field) => record(manifest[field])?.['prettier'] !== undefined),
  );
  const prettierConfigs = await listFiles(['**/.prettierrc', '**/.prettierrc.*', '**/prettier.config.*'], { cwd: root });
  const depcruiseConfig = ['.dependency-cruiser.cjs', '.dependency-cruiser.js', '.dependency-cruiser.mjs', '.dependency-cruiser.json'].find(exists);
  const listedDepcruise = depcruiseConfig === undefined ? undefined : listedDepcruiseCommand(root, depcruiseConfig);
  const depcruiseScripts = listedDepcruise === undefined ? scripts : { ...scripts, [LISTED_DEPCRUISE_SCRIPT]: listedDepcruise };
  const cssFiles = (await listFiles(['**/*.css'], { cwd: root })).filter((path) => {
    const text = readFileSync(join(root, path), 'utf8');
    return text.includes('tailwindcss') || text.includes('@tailwind');
  });

  return {
    root,
    workspaceFiles: ['pnpm-workspace.yaml'].filter(exists),
    packageJsons,
    tsconfigs: await listFiles(['**/tsconfig*.json'], { cwd: root }),
    eslintConfigs: ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts']
      .filter(exists)
      .slice(0, 1),
    vitestConfigs: await listFiles(['**/vitest*.config.{ts,mts,cts,js,mjs,cjs}'], { cwd: root }),
    playwrightConfigs: await listFiles(['**/playwright*.config.{ts,mts,cts,js,mjs,cjs}'], { cwd: root }),
    prettier: {
      configs: [...prettierConfigs, ...(prettierInManifest ? ['a "prettier" key in package.json'] : [])],
      ignoreFile: '.prettierignore',
      dependency: prettierDependency,
    },
    ...(depcruiseConfig === undefined ? {} : { depcruise: { config: depcruiseConfig, scripts: depcruiseScripts } }),
    pythonConfigs: (
      await listFiles(['**/pyproject.toml', '**/ruff.toml', '**/.ruff.toml', '**/pytest.ini', '**/tox.ini', '**/setup.cfg'], { cwd: root })
    ).map((path) => ({ path, kind: pythonKind(path) })),
    scripts,
    cssFiles,
    viteConfigs: await listFiles(['**/vite.config.{ts,mts,cts,js,mjs,cjs}'], { cwd: root }),
    ciFiles: ['.gitlab-ci.yml'].filter(exists),
    checkScanRoots: {
      lib: 'tools/checks/lib.ts',
      sources: await listFiles(['tools/checks/**/*.ts'], { cwd: root, ignore: ['tools/checks/lib.ts', '**/*.test.ts'] }),
    },
  };
}
