/**
 * Runs dependency-cruiser with the repository's .dependency-cruiser.cjs, on the
 * real repository or on the seeded fixture under fixtures/seeded/depcruise/.
 *
 * The fixture is copied to a fresh temporary directory, next to package.json
 * files, entry stubs and node_modules/@sovitech links shaped like the real
 * workspace, so a seeded `import '@sovitech/db'` resolves the way pnpm resolves
 * it. Nothing is written to the repository.
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
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { topLevelRoots } from '../checks/scan-roots/roots';

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path of the repository root. */
export const repoRoot: string = resolve(here, '..', '..');

/** The seeded fixture: a small workspace whose files import across the boundaries. */
export const FIXTURE_DIR: string = join(here, 'fixtures', 'seeded', 'depcruise');

const CONFIG = join(repoRoot, '.dependency-cruiser.cjs');
const BIN = join(repoRoot, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruiser.mjs');

export interface BoundaryViolation {
  rule: string;
  severity: string;
  from: string;
  to: string;
}

export interface CruiseOutcome {
  /** Every module cruised, as paths relative to the cruise root. */
  modules: string[];
  violations: BoundaryViolation[];
}

interface RawCruiseResult {
  modules: Array<{ source: string }>;
  summary: {
    violations: Array<{ from: string; to: string; rule: { name: string; severity: string } }>;
  };
}

/**
 * The "lint:deps" roots of the shared scan-roots list (tools/checks/scan-roots/roots.json),
 * which `pnpm lint:deps` cruises too (tools/checks/scan-roots/lint-deps.ts), so the check
 * and the script read one list. Until the phase 0 review round 2 (adversarial finding 13)
 * this parsed the roots out of the script, with a fixed fallback.
 */
export function depcruiseTargets(): string[] {
  return topLevelRoots('lint:deps');
}

function run(cwd: string, args: readonly string[]): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(process.execPath, [BIN, ...args], { cwd, maxBuffer: 256 * 1024 * 1024 }, (error, stdout, stderr) => {
      // dependency-cruiser exits non-zero when it finds violations; the JSON is still complete.
      if (stdout.trim().startsWith('{')) {
        resolvePromise(stdout);
        return;
      }
      reject(new Error(`dependency-cruiser failed in ${cwd}: ${error?.message ?? ''}\n${stderr}`));
    });
  });
}

/** Cruises `targets` (relative to `cwd`) with the repository's configuration. */
export async function cruise(cwd: string, targets: readonly string[]): Promise<CruiseOutcome> {
  const present = targets.filter((target) => existsSync(join(cwd, target)));
  if (present.length === 0) return { modules: [], violations: [] };
  const stdout = await run(cwd, ['--config', CONFIG, '--output-type', 'json', ...present]);
  const result = JSON.parse(stdout) as RawCruiseResult;
  return {
    modules: result.modules.map((module) => module.source).sort(),
    violations: result.summary.violations.map((violation) => ({
      rule: violation.rule.name,
      severity: violation.rule.severity,
      from: violation.from,
      to: violation.to,
    })),
  };
}

/** The rule names each seeded file must violate, from expectations.json. */
export function loadExpectations(): Record<string, string[]> {
  const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, 'expectations.json'), 'utf8')) as {
    files: Record<string, string[]>;
  };
  return Object.fromEntries(Object.entries(raw.files).map(([file, rules]) => [file, [...rules].sort()]));
}

/** Groups violations by the module they start from: file -> sorted, distinct rule names. */
export function rulesByFile(violations: readonly BoundaryViolation[]): Map<string, string[]> {
  const byFile = new Map<string, Set<string>>();
  for (const violation of violations) {
    const rules = byFile.get(violation.from) ?? new Set<string>();
    rules.add(violation.rule);
    byFile.set(violation.from, rules);
  }
  return new Map([...byFile].map(([file, rules]) => [file, [...rules].sort()]));
}

interface WorkspacePackage {
  dir: string;
  name: string;
  exports: unknown;
}

/** The real workspace packages that have a name and an exports map. */
function workspacePackages(): WorkspacePackage[] {
  const packages: WorkspacePackage[] = [];
  for (const group of ['apps', 'packages']) {
    const groupDir = join(repoRoot, group);
    if (!existsSync(groupDir)) continue;
    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(groupDir, entry.name, 'package.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string; exports?: unknown };
      if (manifest.name === undefined || manifest.exports === undefined) continue;
      packages.push({ dir: `${group}/${entry.name}`, name: manifest.name, exports: manifest.exports });
    }
  }
  return packages;
}

function exportTargets(exportsField: unknown): string[] {
  if (typeof exportsField === 'string') return [exportsField];
  if (typeof exportsField !== 'object' || exportsField === null) return [];
  return Object.values(exportsField as Record<string, unknown>).flatMap(exportTargets);
}

function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Builds the fixture workspace in `root`: package stubs, the seeded files, links and a tsconfig. */
function buildFixture(root: string): void {
  for (const pkg of workspacePackages()) {
    const pkgDir = join(root, pkg.dir);
    writeFile(
      join(pkgDir, 'package.json'),
      `${JSON.stringify({ name: pkg.name, private: true, type: 'module', exports: pkg.exports }, null, 2)}\n`,
    );
    for (const target of exportTargets(pkg.exports)) {
      const stub = target.endsWith('.css') ? '/* entry stub */\n' : 'export {};\n';
      writeFile(join(pkgDir, target), stub);
    }
    const scoped = pkg.name.split('/');
    const linkPath = join(root, 'node_modules', ...scoped);
    mkdirSync(dirname(linkPath), { recursive: true });
    symlinkSync(relative(dirname(linkPath), pkgDir), linkPath, 'dir');
  }
  cpSync(FIXTURE_DIR, root, { recursive: true, force: true });
  writeFile(join(root, 'package.json'), `${JSON.stringify({ name: 'boundary-fixture', private: true, type: 'module' })}\n`);
  writeFile(
    join(root, 'tsconfig.json'),
    `${JSON.stringify({
      compilerOptions: {
        target: 'ES2023',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        noEmit: true,
        types: [],
      },
      include: ['**/*.ts'],
    })}\n`,
  );
}

/** Cruises the seeded fixture in a temporary copy of it, then removes the copy. */
export async function cruiseFixture(): Promise<CruiseOutcome> {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sovitech-boundaries-')));
  try {
    buildFixture(root);
    return await cruise(root, ['apps', 'packages', 'tests']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
