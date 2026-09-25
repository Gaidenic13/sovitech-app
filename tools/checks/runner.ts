/**
 * The core of tools/checks/run-all.ts: discovery, running, self-test and the
 * report. Kept apart from the CLI so it can be unit-tested.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CheckResult } from './types';

/**
 * The checks phase 0 requires (prompt 3 section 10, "Phase 0"). A missing one
 * fails the run, so an absent check never reads as a passing one.
 */
export const EXPECTED_CHECKS: readonly string[] = [
  'index',
  'reserved-terms',
  'version-sync',
  'registry',
  'loosening',
  'fixture-manifest',
  'licences',
  'config-exclusion',
  'lint-bans',
  'render',
  'mockup-figures',
  'company-figures',
  'scan-roots',
];

export interface CheckEntry {
  /** Folder name under tools/checks/. */
  name: string;
  /** Absolute path of check.ts. */
  checkPath: string;
  /** Absolute path of selftest.ts, when the folder has one. */
  selfTestPath?: string;
}

/** Finds every tools/checks/<name>/check.ts under `checksDir`, sorted by name. */
export function discoverChecks(checksDir: string): CheckEntry[] {
  const entries: CheckEntry[] = [];
  for (const name of readdirSync(checksDir).sort()) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const dir = join(checksDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const checkPath = join(dir, 'check.ts');
    if (!existsSync(checkPath)) continue;
    const selfTestPath = join(dir, 'selftest.ts');
    entries.push(existsSync(selfTestPath) ? { name, checkPath, selfTestPath } : { name, checkPath });
  }
  return entries;
}

/** A row of the report. */
export interface Row {
  name: string;
  ok: boolean;
  summary: string;
  details: string[];
  noAutomatedCheckYet: string[];
  pending: string[];
  /** Ids with a real case file (the index check's row). Optional, so rows built elsewhere need not name it. */
  real?: string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Checks the shape of a value a check returned. Returns the problems found. */
export function shapeProblems(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return ['the result is not an object'];
  const record = value as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof record['name'] !== 'string') problems.push('`name` is not a string');
  if (typeof record['ok'] !== 'boolean') problems.push('`ok` is not a boolean');
  if (typeof record['summary'] !== 'string') problems.push('`summary` is not a string');
  if (!isStringArray(record['details'])) problems.push('`details` is not an array of strings');
  if (record['noAutomatedCheckYet'] !== undefined && !isStringArray(record['noAutomatedCheckYet'])) {
    problems.push('`noAutomatedCheckYet` is not an array of strings');
  }
  if (record['pending'] !== undefined && !isStringArray(record['pending'])) {
    problems.push('`pending` is not an array of strings');
  }
  if (record['real'] !== undefined && !isStringArray(record['real'])) {
    problems.push('`real` is not an array of strings');
  }
  return problems;
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

async function loadDefault(path: string): Promise<unknown> {
  const module = (await import(pathToFileURL(path).href)) as { default?: unknown };
  return module.default;
}

/** Runs one check function and turns anything it does wrong into a failing row. */
export async function runOne(name: string, run: unknown): Promise<Row> {
  if (typeof run !== 'function') {
    return failingRow(name, 'check.ts has no default export function', []);
  }
  let value: unknown;
  try {
    value = await (run as () => Promise<unknown>)();
  } catch (error) {
    return failingRow(name, 'the check threw', errorText(error).split('\n'));
  }
  const problems = shapeProblems(value);
  if (problems.length > 0) return failingRow(name, 'the check returned a malformed result', problems);
  const result = value as CheckResult;
  const noAutomatedCheckYet = result.noAutomatedCheckYet ?? [];
  // Index-check convention (docs/adr/0003-index-check-convention.md): an id with
  // no case file never counts as passing, whatever the check itself returned.
  const ok = result.ok && noAutomatedCheckYet.length === 0;
  const summary =
    result.ok && !ok
      ? `${result.summary} (failed by run-all: ${noAutomatedCheckYet.length} ids have no automated check yet)`
      : result.summary;
  return {
    name,
    ok,
    summary,
    details: result.details,
    noAutomatedCheckYet,
    pending: result.pending ?? [],
    real: result.real ?? [],
  };
}

function failingRow(name: string, summary: string, details: string[]): Row {
  return { name, ok: false, summary, details, noAutomatedCheckYet: [], pending: [], real: [] };
}

/** Rows for expected checks that have no check.ts. */
export function missingRows(found: readonly string[], expected: readonly string[]): Row[] {
  return expected
    .filter((name) => !found.includes(name))
    .map((name) => failingRow(name, `missing: tools/checks/${name}/check.ts does not exist`, []));
}

/** Runs every check in order. */
export async function runChecks(entries: readonly CheckEntry[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (const entry of entries) {
    let run: unknown;
    try {
      run = await loadDefault(entry.checkPath);
    } catch (error) {
      rows.push(failingRow(entry.name, 'check.ts could not be loaded', errorText(error).split('\n')));
      continue;
    }
    rows.push(await runOne(entry.name, run));
  }
  return rows;
}

/**
 * Self-test for one check: its selftest must return at least one result, and
 * every result must fail, because each one runs on a seeded bad input.
 */
export async function selfTestOne(name: string, run: unknown): Promise<Row> {
  if (typeof run !== 'function') return failingRow(name, 'selftest.ts has no default export function', []);
  let value: unknown;
  try {
    value = await (run as () => Promise<unknown>)();
  } catch (error) {
    return failingRow(name, 'the self-test threw', errorText(error).split('\n'));
  }
  const results = Array.isArray(value) ? value : [value];
  if (results.length === 0) return failingRow(name, 'the self-test ran no seeded bad input', []);
  const details: string[] = [];
  let passedWrongly = 0;
  results.forEach((result, position) => {
    const problems = shapeProblems(result);
    if (problems.length > 0) {
      passedWrongly += 1;
      details.push(`seeded input ${position + 1}: malformed result: ${problems.join('; ')}`);
      return;
    }
    const typed = result as CheckResult;
    if (typed.ok) {
      passedWrongly += 1;
      details.push(`seeded input ${position + 1} passed, but it must fail: ${typed.summary}`);
    } else {
      details.push(`seeded input ${position + 1} failed as it must: ${typed.summary}`);
    }
  });
  if (passedWrongly > 0) {
    return failingRow(name, `${passedWrongly} of ${results.length} seeded bad inputs did not fail`, details);
  }
  return {
    name,
    ok: true,
    summary: `all ${results.length} seeded bad inputs failed, as they must`,
    details,
    noAutomatedCheckYet: [],
    pending: [],
    real: [],
  };
}

/** Runs every check's self-test. A check without selftest.ts fails. */
export async function runSelfTests(entries: readonly CheckEntry[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (const entry of entries) {
    if (entry.selfTestPath === undefined) {
      rows.push(failingRow(entry.name, `no self-test: tools/checks/${entry.name}/selftest.ts does not exist`, []));
      continue;
    }
    let run: unknown;
    try {
      run = await loadDefault(entry.selfTestPath);
    } catch (error) {
      rows.push(failingRow(entry.name, 'selftest.ts could not be loaded', errorText(error).split('\n')));
      continue;
    }
    rows.push(await selfTestOne(entry.name, run));
  }
  return rows;
}

/** The report printed by run-all. */
export function formatReport(rows: readonly Row[], options: { verbose: boolean; title: string }): string {
  const lines: string[] = [];
  const nameWidth = Math.max(5, ...rows.map((row) => row.name.length));
  lines.push(options.title);
  lines.push('');
  lines.push(`${'Check'.padEnd(nameWidth)}  Result  Summary`);
  lines.push(`${'-'.repeat(nameWidth)}  ------  ${'-'.repeat(40)}`);
  for (const row of rows) {
    lines.push(`${row.name.padEnd(nameWidth)}  ${row.ok ? 'PASS  ' : 'FAIL  '}  ${row.summary}`);
  }
  for (const row of rows) {
    if ((row.ok && !options.verbose) || row.details.length === 0) continue;
    lines.push('');
    lines.push(`${row.name}: ${row.ok ? 'details' : 'what failed'}`);
    for (const detail of row.details) lines.push(`  ${detail}`);
  }
  const missingCases = [...new Set(rows.flatMap((row) => row.noAutomatedCheckYet))].sort(compareCaseIds);
  if (missingCases.length > 0) {
    lines.push('');
    lines.push(`No automated check yet (${missingCases.length} case ids with no case file, or only a stub or a malformed one):`);
    lines.push(...wrap(missingCases));
  }
  const pendingCases = [...new Set(rows.flatMap((row) => row.pending))].sort(compareCaseIds);
  if (pendingCases.length > 0) {
    lines.push('');
    lines.push(`Pending: no automated check yet (${pendingCases.length} case files held out of the green run):`);
    lines.push(...wrap(pendingCases));
  }
  const counts = caseCounts(rows);
  if (counts !== undefined) {
    lines.push('');
    lines.push(formatCaseCounts(counts));
    // run-all reads the case files only; pnpm check also confirms each real case against its Vitest run (index/run-counts.ts).
    lines.push('Real: read from the case files; pnpm check also confirms each one against its own Vitest run.');
  }
  const failed = rows.filter((row) => !row.ok).length;
  lines.push('');
  lines.push(failed === 0 ? passedLabel(`All ${rows.length}`, counts) : `${failed} of ${rows.length} failed.`);
  return lines.join('\n');
}

/** The guardrail case counts of a run (docs/guardrails.md section 7). */
export interface CaseCounts {
  real: number;
  pending: number;
  noAutomatedCheckYet: number;
}

/** The case counts the rows report, or undefined when no row reports cases (the index check did not run). */
export function caseCounts(rows: readonly Pick<Row, 'real' | 'pending' | 'noAutomatedCheckYet'>[]): CaseCounts | undefined {
  const real = new Set(rows.flatMap((row) => row.real ?? []));
  const pending = new Set(rows.flatMap((row) => row.pending));
  const missing = new Set(rows.flatMap((row) => row.noAutomatedCheckYet));
  if (real.size + pending.size + missing.size === 0) return undefined;
  return { real: real.size, pending: pending.size, noAutomatedCheckYet: missing.size };
}

/** One line with the three counts, for run-all and `pnpm check`. */
export function formatCaseCounts(counts: CaseCounts): string {
  return (
    `Guardrail cases (docs/guardrails.md section 7): ${counts.real} real, ${counts.pending} pending (no automated check yet), ` +
    `${counts.noAutomatedCheckYet} no automated check yet (no case file, or only a stub or a malformed one).`
  );
}

/**
 * The label of a green run: "<subject> passed.", or, while any case is held out,
 * "<subject> passed with N pending (no automated check yet)." A green run never
 * reads as if every case were checked (PRD D-33 interim; CLAUDE.md definition of
 * done items 1 and 5).
 */
export function passedLabel(subject: string, counts: CaseCounts | undefined): string {
  if (counts === undefined) return `${subject} passed.`;
  const held = [
    counts.pending > 0 ? `${counts.pending} pending` : undefined,
    counts.noAutomatedCheckYet > 0 ? `${counts.noAutomatedCheckYet} with no case file that runs` : undefined,
  ].filter((part) => part !== undefined);
  return held.length === 0 ? `${subject} passed.` : `${subject} passed with ${held.join(' and ')} (no automated check yet).`;
}

/** Orders ids like G1-2 < G1-10 < G2-1 < GS-1, and G7-2a after G7-2. */
export function compareCaseIds(left: string, right: string): number {
  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
}

function wrap(ids: readonly string[]): string[] {
  const lines: string[] = [];
  let current = ' ';
  for (const id of ids) {
    if (current.length + id.length + 1 > 100) {
      lines.push(current);
      current = ' ';
    }
    current += ` ${id}`;
  }
  if (current.trim() !== '') lines.push(current);
  return lines;
}
