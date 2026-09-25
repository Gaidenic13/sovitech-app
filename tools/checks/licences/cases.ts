/**
 * The seeded inputs of the licence check, shared by selftest.ts and the unit
 * tests. Package reports and site-packages folders sit under seeded/<id>/.
 * An installed npm tree is built in a temporary folder at run time, because a
 * folder named node_modules is never committed.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../lib';
import type { CheckResult } from '../types';
import { evaluateLicences, loadNpmFromTree, loadPython, parsePnpmLicences, type NpmSource, type PythonSource } from './licences';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

type NpmInput = { readonly report: string } | { readonly tree: Readonly<Record<string, string>> } | { readonly noTree: true };
type PythonInput = { readonly sitePackages: string } | { readonly noEnvironment: true };

export interface SeededCase {
  readonly id: string;
  /** Text the findings (bad cases) or the summary and details (good cases) must contain. */
  readonly expect: readonly string[];
  readonly npm?: NpmInput;
  readonly python?: PythonInput;
}

const GOOD_NPM: NpmInput = { report: 'good' };
const GOOD_PYTHON: PythonInput = { sitePackages: 'good' };

const manifest = (fields: Record<string, unknown>): string => `${JSON.stringify(fields, null, 2)}\n`;

export const GOOD_CASES: readonly SeededCase[] = [
  {
    id: 'good',
    expect: ['no AGPL or GPL dependency', 'LGPL 2', 'MPL 1', 'other copyleft 1', 'offers a choice that includes a GPL licence', 'GPL text beside LGPL text'],
  },
  {
    id: 'good-installed-tree',
    expect: ['no AGPL or GPL dependency', '2 npm packages from package.json files'],
    npm: {
      tree: {
        'node_modules/.pnpm/seeded-a@1.0.0/node_modules/seeded-a/package.json': manifest({ name: 'seeded-a', version: '1.0.0', license: 'MIT' }),
        'node_modules/.pnpm/@seeded+b@2.0.0/node_modules/@seeded/b/package.json': manifest({
          name: '@seeded/b',
          version: '2.0.0',
          licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }],
        }),
      },
    },
  },
];

export const BAD_CASES: readonly SeededCase[] = [
  { id: 'npm-gpl', expect: ['npm seeded-copyleft 1.0.0: GPL'], npm: { report: 'npm-gpl' } },
  { id: 'npm-agpl', expect: ['npm seeded-network-copyleft 1.0.0: AGPL'], npm: { report: 'npm-agpl' } },
  { id: 'npm-gpl-in-and', expect: ['npm seeded-combined 1.0.0: GPL'], npm: { report: 'npm-gpl-in-and' } },
  { id: 'npm-unknown', expect: ['npm seeded-unstated 0.1.0: licence not stated'], npm: { report: 'npm-unknown' } },
  {
    id: 'npm-installed-tree-gpl',
    expect: ['npm seeded-tree-copyleft 1.0.0: GPL'],
    npm: {
      tree: {
        'node_modules/.pnpm/seeded-tree-copyleft@1.0.0/node_modules/seeded-tree-copyleft/package.json': manifest({
          name: 'seeded-tree-copyleft',
          version: '1.0.0',
          license: 'GPL-2.0-or-later',
        }),
      },
    },
  },
  { id: 'npm-not-installed', expect: ['npm: licences could not be read'], npm: { noTree: true } },
  { id: 'python-gpl-expression', expect: ['python copyleftlib 2.0: GPL'], python: { sitePackages: 'python-gpl-expression' } },
  { id: 'python-gpl-classifier', expect: ['python classifiedlib 1.1: GPL'], python: { sitePackages: 'python-gpl-classifier' } },
  { id: 'python-agpl-free-text', expect: ['python networklib 0.9: AGPL'], python: { sitePackages: 'python-agpl-free-text' } },
  {
    id: 'python-gpl-inside-lgpl',
    expect: ['GPL licence text inside an LGPL wheel', 'geomkit/bundled/kernel/LICENSE'],
    python: { sitePackages: 'python-gpl-inside-lgpl' },
  },
  { id: 'python-no-environment', expect: ['python: licences could not be read: no Python environment'], python: { noEnvironment: true } },
];

function buildTree(files: Readonly<Record<string, string>>): string {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-licences-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function npmSource(input: NpmInput, temporary: string[]): NpmSource {
  if ('report' in input) {
    const json: unknown = JSON.parse(readFileSync(join(SEEDED, input.report, 'pnpm-licenses.json'), 'utf8'));
    return { kind: 'packages', packages: parsePnpmLicences(json), from: `seeded/${input.report}/pnpm-licenses.json` };
  }
  if ('tree' in input) {
    const root = buildTree(input.tree);
    temporary.push(root);
    return loadNpmFromTree(join(root, 'node_modules'));
  }
  return loadNpmFromTree(join(tmpdir(), 'sovitech-licences-absent', 'node_modules'));
}

function pythonSource(input: PythonInput): PythonSource {
  if ('noEnvironment' in input) return loadPython(repoRoot, [], 'seeded (no environment)');
  return loadPython(repoRoot, [join(SEEDED, input.sitePackages, 'site-packages')], `seeded/${input.sitePackages}/site-packages`);
}

export function runCase(seededCase: SeededCase): Promise<CheckResult> {
  const temporary: string[] = [];
  try {
    const npm = npmSource(seededCase.npm ?? GOOD_NPM, temporary);
    const python = pythonSource(seededCase.python ?? GOOD_PYTHON);
    return Promise.resolve(evaluateLicences({ npm, python, root: SEEDED, label: seededCase.id }));
  } finally {
    for (const path of temporary) rmSync(path, { recursive: true, force: true });
  }
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
