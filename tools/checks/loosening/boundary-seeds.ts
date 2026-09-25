/**
 * The seeded boundary imports in seeded/boundary-imports/. The phase 0 review
 * opened a gate by importing packages/registry/src/gates/source.ts through a
 * relative path, which no rule refused; its second round reached the
 * test-utils entry through a tests/proposed/ helper, which the direct-import
 * rule let through. These seeds prove the dependency-cruiser rules added for
 * them (package-internals-only-through-exports; gate-test-utils-only-from-proposed
 * with `reachable`, proposed-tests-only-from-proposed and
 * no-tests-from-apps-or-packages).
 *
 * The seeded tree is laid over a temporary workspace shaped like the real one
 * (each package.json with its exports, entry stubs, node_modules/@sovitech
 * links), then cruised with the repository's .dependency-cruiser.cjs, or with
 * that configuration as it was before a fix (rules removed, `reachable`
 * switched off) to show what it let through. Nothing is written to the
 * repository.
 *
 * The seeds use the format of tools/eslint-rules/fixtures/seeded/depcruise/
 * (expectations.json), so the lint-bans self-test can pick them up as they are.
 */
import { execFile } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../lib';

export const BOUNDARY_SEEDS_DIR: string = join(dirname(fileURLToPath(import.meta.url)), 'seeded', 'boundary-imports');

const CONFIG = join(repoRoot, '.dependency-cruiser.cjs');
const BIN = join(repoRoot, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruiser.mjs');
const ROOTS = ['apps', 'packages', 'tests'];

/** The configuration as it was before a fix: rules removed, and rules whose `reachable` is switched off. */
export interface ConfigurationBefore {
  removeRules: string[];
  directOnly: string[];
}

export interface BoundaryExpectations {
  /** Each seeded file and the rule names it must violate; [] means it must pass. */
  files: Record<string, string[]>;
  /** For each earlier configuration, the seeded files it lets through (they violate nothing there). */
  before: Array<ConfigurationBefore & { letThrough: string[] }>;
}

export function loadBoundaryExpectations(): BoundaryExpectations {
  const raw = JSON.parse(readFileSync(join(BOUNDARY_SEEDS_DIR, 'expectations.json'), 'utf8')) as BoundaryExpectations;
  return {
    files: Object.fromEntries(Object.entries(raw.files).map(([file, rules]) => [file, [...rules].sort()])),
    before: raw.before.map((item) => ({ removeRules: item.removeRules, directOnly: item.directOnly, letThrough: item.letThrough })),
  };
}

export interface BoundaryCruise {
  /** Every module cruised, relative to the workspace root. */
  modules: string[];
  /** Seeded file -> sorted, distinct rule names it violates. */
  rulesByFile: Map<string, string[]>;
}

function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function exportTargets(exportsField: unknown): string[] {
  if (typeof exportsField === 'string') return [exportsField];
  if (typeof exportsField !== 'object' || exportsField === null) return [];
  return Object.values(exportsField as Record<string, unknown>).flatMap(exportTargets);
}

/** Package stubs and links shaped like the real workspace, then the seeded tree over them. */
function buildWorkspace(root: string): void {
  for (const group of ['apps', 'packages']) {
    const groupDir = join(repoRoot, group);
    if (!existsSync(groupDir)) continue;
    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      const manifestPath = join(groupDir, entry.name, 'package.json');
      if (!entry.isDirectory() || !existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string; exports?: unknown };
      if (manifest.name === undefined || manifest.exports === undefined) continue;
      const pkgDir = join(root, group, entry.name);
      writeFile(join(pkgDir, 'package.json'), `${JSON.stringify({ name: manifest.name, private: true, type: 'module', exports: manifest.exports }, null, 2)}\n`);
      for (const target of exportTargets(manifest.exports)) writeFile(join(pkgDir, target), target.endsWith('.css') ? '/* entry stub */\n' : 'export {};\n');
      const link = join(root, 'node_modules', ...manifest.name.split('/'));
      mkdirSync(dirname(link), { recursive: true });
      symlinkSync(relative(dirname(link), pkgDir), link, 'dir');
    }
  }
  cpSync(BOUNDARY_SEEDS_DIR, root, { recursive: true, force: true, filter: (source) => !source.endsWith('expectations.json') });
  writeFile(join(root, 'package.json'), `${JSON.stringify({ name: 'boundary-seeds', private: true, type: 'module' })}\n`);
  writeFile(
    join(root, 'tsconfig.json'),
    `${JSON.stringify({
      compilerOptions: { target: 'ES2023', module: 'ESNext', moduleResolution: 'bundler', strict: true, noEmit: true, types: [] },
      include: ['**/*.ts'],
    })}\n`,
  );
}

function runCruiser(cwd: string, config: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      process.execPath,
      [BIN, '--config', config, '--output-type', 'json', ...ROOTS.filter((folder) => existsSync(join(cwd, folder)))],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        // dependency-cruiser exits non-zero when it finds violations; the JSON is still complete.
        if (stdout.trim().startsWith('{')) resolvePromise(stdout);
        else reject(new Error(`dependency-cruiser failed in ${cwd}: ${error?.message ?? ''}\n${stderr}`));
      },
    );
  });
}

/**
 * Cruises the seeded tree with the repository's configuration, or, when
 * `before` is given, with that configuration as it was before a fix: the
 * named rules removed, and `reachable` switched off on the `directOnly` rules.
 */
export async function cruiseBoundarySeeds(options: { before?: ConfigurationBefore } = {}): Promise<BoundaryCruise> {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sovitech-boundary-seeds-')));
  try {
    buildWorkspace(root);
    let config = CONFIG;
    if (options.before !== undefined) {
      config = join(root, 'before-fix.dependency-cruiser.cjs');
      writeFile(
        config,
        [
          `const base = require(${JSON.stringify(CONFIG)});`,
          `const removed = new Set(${JSON.stringify(options.before.removeRules)});`,
          `const directOnly = new Set(${JSON.stringify(options.before.directOnly)});`,
          'module.exports = {',
          '  ...base,',
          '  forbidden: base.forbidden',
          '    .filter((rule) => !removed.has(rule.name))',
          '    .map((rule) => {',
          '      if (!directOnly.has(rule.name)) return rule;',
          '      const { reachable, ...to } = rule.to;',
          '      return { ...rule, to };',
          '    }),',
          '};',
          '',
        ].join('\n'),
      );
    }
    const result = JSON.parse(await runCruiser(root, config)) as {
      modules: Array<{ source: string }>;
      summary: { violations: Array<{ from: string; rule: { name: string } }> };
    };
    const byFile = new Map<string, Set<string>>();
    for (const violation of result.summary.violations) {
      const rules = byFile.get(violation.from) ?? new Set<string>();
      rules.add(violation.rule.name);
      byFile.set(violation.from, rules);
    }
    return {
      modules: result.modules.map((module) => module.source).sort(),
      rulesByFile: new Map([...byFile].map(([file, rules]) => [file, [...rules].sort()])),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
