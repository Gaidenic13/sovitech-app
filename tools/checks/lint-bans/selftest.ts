/**
 * Self-test of the lint-bans check. Every seeded bad input must fail:
 * - each folder under seeded/bad/ is a small tree with one ban broken, linted as the check lints the repository;
 * - each file tools/eslint-rules/fixtures/seeded/depcruise/expectations.json expects to violate a boundary;
 * - each file tools/checks/loosening/seeded/boundary-imports/expectations.json expects to violate a
 *   boundary: the gate-boundary seeds added after the phase 0 review (a gate opened by a relative
 *   import of packages/registry/src/gates/source.ts), which prove package-internals-only-through-exports.
 * The good inputs (seeded/good/, and the seeded files expected to pass) must pass,
 * or the self-test throws: a check that fails on everything proves nothing.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruiseFixture, loadExpectations, rulesByFile } from '../../eslint-rules/depcruise-harness';
import { fail, pass } from '../lib';
import { cruiseBoundarySeeds, loadBoundaryExpectations } from '../loosening/boundary-seeds';
import type { CheckResult, SelfTest } from '../types';
import { lintBans, NAME, SCOPE_ID, scopeProblems, UNREAD_ID, type BanOutcome } from './lint-bans';

export const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

/** The seeded lint-ban cases: one folder each under seeded/bad/. */
export function badCases(): string[] {
  return readdirSync(join(SEEDED, 'bad'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * The problem id a seeded folder must produce. Folder names read <rule>--<situation>:
 * ESLint rules carry the sovitech/ prefix; the HTML scan's ids, the empty-scope id
 * (`scope--...`) and the unread-file id (`unread-extension--...`) carry lint-bans/.
 */
export function seededRule(name: string): string {
  const prefix = name.split('--')[0] ?? name;
  const own = prefix.startsWith('html-') || prefix === 'scope' || prefix === 'unread-extension';
  return `${own ? 'lint-bans' : 'sovitech'}/${prefix}`;
}

/** Runs the bans on a seeded folder as the check runs them: scope seeds also get the empty-scope reading. */
export async function lintSeeded(name: string): Promise<BanOutcome> {
  const outcome = await lintBans(join(SEEDED, 'bad', name));
  return seededRule(name) === SCOPE_ID ? { ...outcome, problems: [...scopeProblems(outcome), ...outcome.problems] } : outcome;
}

async function lintBanResults(): Promise<CheckResult[]> {
  const good = await lintBans(join(SEEDED, 'good'));
  const goodProblems = [...scopeProblems(good), ...good.problems];
  if (goodProblems.length > 0) {
    throw new Error(`the good seeded input must pass the lint bans, but got: ${goodProblems.join('; ')}`);
  }
  const results: CheckResult[] = [];
  for (const name of badCases()) {
    // The rule the folder name gives must be among the problems found.
    const rule = seededRule(name);
    const outcome = await lintSeeded(name);
    // A scope seed reads nothing, and an unread-extension seed holds only files no ban reads.
    if (outcome.files === 0 && rule !== SCOPE_ID && rule !== UNREAD_ID) throw new Error(`seeded/bad/${name} holds no file the bans cover`);
    const byRule = outcome.problems.filter((problem) => problem.includes(` ${rule}: `));
    results.push(
      byRule.length === 0
        ? pass(NAME, `seeded ${name}: ${rule} found nothing`, outcome.problems)
        : fail(NAME, `seeded ${name}: ${byRule.length} ${rule} problems found`, outcome.problems),
    );
  }
  return results;
}

/**
 * One result per seeded bad import of a seed set: the allowed imports must pass
 * (else the self-test throws), and each bad import must fire every rule it names.
 */
function seededImportResults(
  label: string,
  expectations: Record<string, string[]>,
  actual: ReadonlyMap<string, readonly string[]>,
  modules: readonly string[],
): CheckResult[] {
  const notCruised = Object.keys(expectations).filter((file) => !modules.includes(file));
  if (notCruised.length > 0) throw new Error(`${label}: seeded files were not cruised: ${notCruised.join('; ')}`);
  const wronglyFlagged = Object.entries(expectations)
    .filter(([file, rules]) => rules.length === 0 && (actual.get(file) ?? []).length > 0)
    .map(([file]) => `${file}: ${(actual.get(file) ?? []).join(', ')}`);
  if (wronglyFlagged.length > 0) {
    throw new Error(`${label}: allowed imports were flagged: ${wronglyFlagged.join('; ')}`);
  }
  return Object.entries(expectations)
    .filter(([, rules]) => rules.length > 0)
    .map(([file, rules]) => {
      const found = actual.get(file) ?? [];
      const missing = rules.filter((rule) => !found.includes(rule));
      // A seeded import proves its rules only if every rule it names fires; a rule
      // that stays silent reads as the check passing on a bad input.
      return missing.length > 0
        ? pass(NAME, `seeded import (${label}) ${file}: expected rules not reported: ${missing.join(', ')}`)
        : fail(NAME, `seeded import (${label}) ${file}: ${found.join(', ')}`);
    });
}

async function boundaryResults(): Promise<CheckResult[]> {
  const outcome = await cruiseFixture();
  return seededImportResults('boundary fixture', loadExpectations(), rulesByFile(outcome.violations), outcome.modules);
}

async function gateBoundaryResults(): Promise<CheckResult[]> {
  const outcome = await cruiseBoundarySeeds();
  return seededImportResults('gate boundary seeds', loadBoundaryExpectations().files, outcome.rulesByFile, outcome.modules);
}

const selfTest: SelfTest = async () => [
  ...(await lintBanResults()),
  ...(await boundaryResults()),
  ...(await gateBoundaryResults()),
];

export default selfTest;
