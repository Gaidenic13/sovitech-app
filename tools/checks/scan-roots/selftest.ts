/**
 * Self-test of the scan-roots check. Each folder under seeded/bad/ is an overlay:
 * the good tree (seeded/good/) is copied to a temporary folder, the case's files
 * are laid over it, and the check runs on the copy with the repository's list,
 * patched by the case's scan-roots.patch.json when it has one. A `scope--` case
 * runs on its own files alone. Every case must fail with the problem id its name
 * gives (`<id>--<situation>` reads scan-roots/<id>), and the good tree must pass,
 * or the self-test throws. Nothing is written to the repository.
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fail, pass } from '../lib';
import type { CheckResult, SelfTest } from '../types';
import { loadScanRoots, type ScanRootsList } from './roots';
import { NAME, scanRootProblems, type ScanRootsOutcome } from './scan-roots';

export const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

/** A case's changes to the list, merged into each named group of a copy of the repository's list. */
export const PATCH_FILE = 'scan-roots.patch.json';

/** The seeded cases: one folder each under seeded/bad/. */
export function badCases(): string[] {
  return readdirSync(join(SEEDED, 'bad'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** The problem id a case must produce: `unlisted--scripts-folder` reads scan-roots/unlisted. */
export function seededId(name: string): string {
  return `${NAME}/${name.split('--')[0] ?? name}`;
}

/** The repository's list with a case's patch merged in, group by group. */
export function patchedList(caseDir: string): ScanRootsList {
  const list = structuredClone(loadScanRoots());
  const patchPath = join(caseDir, PATCH_FILE);
  if (!existsSync(patchPath)) return list;
  const patch = JSON.parse(readFileSync(patchPath, 'utf8')) as Record<string, Record<string, unknown>>;
  const target = list as unknown as Record<string, Record<string, unknown>>;
  for (const [group, entries] of Object.entries(patch)) target[group] = { ...(target[group] ?? {}), ...entries };
  return list;
}

/** Runs the check on a seeded case, laid over the good tree in a temporary folder. */
export function runSeeded(name: string): ScanRootsOutcome {
  const caseDir = join(SEEDED, 'bad', name);
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'sovitech-scan-roots-')));
  try {
    if (!name.startsWith('scope--')) cpSync(join(SEEDED, 'good'), root, { recursive: true });
    cpSync(caseDir, root, { recursive: true, force: true, filter: (source) => basename(source) !== PATCH_FILE });
    return scanRootProblems(root, patchedList(caseDir));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The good tree, checked where it is. */
export function runGood(): ScanRootsOutcome {
  return scanRootProblems(join(SEEDED, 'good'), loadScanRoots());
}

const selfTest: SelfTest = async () => {
  const good = runGood();
  if (good.problems.length > 0) throw new Error(`the good seeded tree must pass the scan-roots check, but got: ${good.problems.join('; ')}`);
  const results: CheckResult[] = [];
  for (const name of badCases()) {
    const id = seededId(name);
    const outcome = runSeeded(name);
    const byId = outcome.problems.filter((problem) => problem.includes(` ${id}: `));
    results.push(
      byId.length === 0
        ? pass(NAME, `seeded ${name}: ${id} found nothing`, outcome.problems)
        : fail(NAME, `seeded ${name}: ${byId.length} ${id} problems found`, outcome.problems),
    );
  }
  return results;
};

export default selfTest;
