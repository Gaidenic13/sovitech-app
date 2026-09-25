/**
 * The CI index check (docs/guardrails.md section 7, "The CI index check"; R-156),
 * under the convention of docs/adr/0003-index-check-convention.md:
 *
 * - it fails for each section 7 id with no case file, and lists the id as
 *   "no automated check yet" (`noAutomatedCheckYet`);
 * - it fails for each case file whose id is not in the table, including a file
 *   in the folder of the other type (a T id as an eval, an E id as a test);
 * - a real case file held out by the pending wrapper counts as present and is
 *   listed in `pending` ("pending: no automated check yet"), never as passing;
 * - a stub never counts as a case file: its id is listed as "no automated check
 *   yet", like an id with no file at all;
 * - a malformed case file (a test held out without the wrapper, an empty test, a
 *   case naming NotImplementedError, an eval without its full body) never counts
 *   either: its id is listed as "no automated check yet", and the fault as a
 *   problem;
 * - no E case is real before the phase 2 eval runner exists: a full eval file
 *   counts as pending at most; once the runner exists, only with a current 5-of-5
 *   results record (eval-runs.ts);
 * - modules under tests/guardrails/_support/ are read like case files: one that
 *   swallows errors, asserts vacuously, uses an unreviewed test double or runs code
 *   in another process is a `[support]` problem, and a case file that imports it is
 *   malformed; only the modules on the reviewed list stub-aware-support.json, with
 *   their reviewed content, may catch the stub's error (support-pin.ts);
 * - the reviewed list of test doubles (reviewed-test-doubles.json) must be well
 *   formed, and an entry that matches no use is a problem, so the list never
 *   carries an allowance nobody needs;
 * - an empty scope fails: a section 7 table with no id, or no tests/guardrails/
 *   folder, is a `[scope]` problem, so the check can never pass on nothing.
 *
 * Every other fault (the table, file names, titles, held-out tests, eval files)
 * is listed first in `details` as "problem: ...", apart from the missing ids,
 * so a new fault is never hidden behind the expected ones.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { listFiles, repoRoot } from '../lib';
import type { CheckResult } from '../types';
import {
  REVIEWED_TEST_DOUBLES_FILE,
  T_SUPPORT_DIR,
  classifyEvalCase,
  classifyTestCase,
  fileReader,
  listCaseFiles,
  pathChecker,
  supportModuleFaults,
  testDoubleKey,
  type CaseStatus,
  type ReviewedTestDouble,
} from './case-files';
import { readEvalRunEvidence } from './eval-runs';
import { SUPPORT_PIN_FILE, loadSupportPin } from './support-pin';
import {
  CASE_DIRS,
  GUARDRAILS_PATH,
  caseFilePath,
  countByType,
  loadGuardrailIndex,
  type GuardrailIndex,
} from './guardrail-index';

export const CHECK_NAME = 'index';

/** What the index check found. Every id list is sorted in case-id order. */
export interface IndexReport {
  index: GuardrailIndex;
  /** Ids with a real case file in the folder of their type. */
  present: string[];
  /** Ids whose case file is held out by the pending wrapper. */
  pending: string[];
  /** Ids whose only case file is a stub. */
  stubs: string[];
  /** Ids whose case file breaks a rule that decides whether it runs (see the problems). */
  malformed: string[];
  /** Ids with no case file in the folder of their type. */
  missing: string[];
  /** Every other fault, as "<path>:<line>: [<kind>] <what>". */
  problems: string[];
}

/** Orders ids like G1-2 < G1-10 < G7-2a < GS-1 (the order run-all prints). */
export function compareIds(left: string, right: string): number {
  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
}

const sorted = (ids: Iterable<string>): string[] => [...new Set(ids)].sort(compareIds);

/**
 * Reads the reviewed list of test doubles under `root`. A missing file is an
 * empty list (the strictest reading); a malformed one is a problem, and its
 * entries count for nothing.
 */
export function loadReviewedTestDoubles(root: string): { entries: ReviewedTestDouble[]; problems: string[] } {
  const path = REVIEWED_TEST_DOUBLES_FILE;
  const absolute = join(root, path);
  if (!existsSync(absolute)) return { entries: [], problems: [] };
  const invalid = (what: string) => ({ entries: [], problems: [`${path}:1: [test double] the reviewed list ${what}`] });
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch {
    return invalid('is not JSON');
  }
  const entries = typeof value === 'object' && value !== null ? (value as Record<string, unknown>)['entries'] : undefined;
  if (!Array.isArray(entries)) return invalid('is a JSON object with an "entries" list');
  const text = (entry: unknown, key: string): string | undefined => {
    const field = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>)[key] : undefined;
    return typeof field === 'string' && field.trim() !== '' ? field : undefined;
  };
  const parsed: ReviewedTestDouble[] = [];
  for (const [index, entry] of entries.entries()) {
    const fields = { path: text(entry, 'path'), call: text(entry, 'call'), target: text(entry, 'target'), reason: text(entry, 'reason') };
    const { path: file, call, target, reason } = fields;
    if (file === undefined || call === undefined || target === undefined || reason === undefined) {
      return invalid(`entry ${index + 1} needs a non-empty "path", "call", "target" and "reason"`);
    }
    parsed.push({ path: file, call, target, reason });
  }
  return { entries: parsed, problems: [] };
}

/** Reads the index and the case files under `root` and sorts every id. */
export async function buildIndexReport(root: string, guardrailsPath: string = GUARDRAILS_PATH): Promise<IndexReport> {
  const index = loadGuardrailIndex(root, guardrailsPath);
  const problems = [...index.problems];
  // An empty scope never passes: nothing to hold the repository to, or nowhere
  // the code tests could be, is a fault, not a clean result.
  if (index.cases.length === 0) {
    problems.push(
      `${index.source}:1: [scope] section 7 lists no case id, so the index check has nothing to hold the repository to`,
    );
  }
  const testsDir = join(root, CASE_DIRS.T);
  if (!existsSync(testsDir) || !statSync(testsDir).isDirectory()) {
    problems.push(`${CASE_DIRS.T}/:1: [scope] the folder of the code-test cases does not exist`);
  }
  const listing = await listCaseFiles(root);
  problems.push(...listing.problems);
  const readFile = fileReader(root);
  const exists = pathChecker(root);
  const evalRuns = readEvalRunEvidence(root);

  // The reviewed test doubles, and the support modules read like case files.
  const reviewedList = loadReviewedTestDoubles(root);
  problems.push(...reviewedList.problems);
  const reviewed = reviewedList.entries;
  const reviewedUsed = new Set<string>();
  // The reviewed list of support modules that may catch the stub's error (support-pin.ts).
  const supportPin = loadSupportPin(root);
  problems.push(...supportPin.problems);
  const pin = supportPin.entries;
  const supportFaults = new Map<string, readonly string[]>();
  const supportPaths = await listFiles([`${T_SUPPORT_DIR}/**/*.ts`, `${T_SUPPORT_DIR}/**/*.tsx`], { cwd: root });
  for (const path of supportPaths) {
    const faults = supportModuleFaults(path, readFile(path) ?? '', reviewed, pin);
    supportFaults.set(path, faults.problems);
    problems.push(...faults.problems);
    for (const key of faults.reviewedUsed) reviewedUsed.add(key);
  }
  for (const entry of pin) {
    if (!supportPaths.includes(entry.path)) {
      problems.push(
        `${SUPPORT_PIN_FILE}:1: [support] the reviewed entry for ${entry.path} matches no support module; remove it, so the list never allows more than the modules that exist`,
      );
    }
  }
  const lowerCaseIds = new Map(index.cases.map((entry) => [entry.id.toLowerCase(), entry.id]));

  const statusById = new Map<string, { status: CaseStatus; path: string }>();
  for (const file of listing.files) {
    const entry = index.byId.get(file.id);
    if (entry === undefined) {
      const near = lowerCaseIds.get(file.id.toLowerCase());
      const hint = near === undefined ? '' : ` (the table has ${near})`;
      problems.push(`${file.path}:1: [unindexed] the case file's id ${file.id} is not in ${index.source} section 7${hint}`);
      continue;
    }
    if (entry.type !== file.type) {
      const kind = entry.type === 'T' ? 'a code test (T)' : 'an eval (E)';
      problems.push(
        `${file.path}:1: [wrong type] ${file.id} is ${kind} in ${index.source} section 7, so its case file is ` +
          `${caseFilePath(entry)}; a case file in the other type's folder does not count`,
      );
      continue;
    }
    const previous = statusById.get(file.id);
    if (previous !== undefined) {
      problems.push(`${file.path}:1: [layout] a second case file for ${file.id}, beside ${previous.path}; keep one`);
      continue;
    }
    const text = readFile(file.path) ?? '';
    const classified =
      file.type === 'T'
        ? classifyTestCase(file.id, file.path, text, readFile, { reviewed, supportFaults, pin })
        : classifyEvalCase(file.id, file.path, text, exists, evalRuns);
    problems.push(...classified.problems);
    for (const key of classified.reviewedUsed ?? []) reviewedUsed.add(key);
    statusById.set(file.id, { status: classified.status, path: file.path });
  }

  for (const entry of reviewed) {
    if (!reviewedUsed.has(testDoubleKey(entry))) {
      problems.push(
        `${REVIEWED_TEST_DOUBLES_FILE}:1: [test double] the reviewed entry for ${entry.call} ${JSON.stringify(entry.target)} ` +
          `in ${entry.path} matches no use; remove it, so the list never allows more than the cases use`,
      );
    }
  }

  const idsWith = (status: CaseStatus): string[] =>
    [...statusById].filter(([, value]) => value.status === status).map(([id]) => id);
  return {
    index,
    present: sorted(idsWith('real')),
    pending: sorted(idsWith('pending')),
    stubs: sorted(idsWith('stub')),
    malformed: sorted(idsWith('malformed')),
    missing: sorted(index.cases.filter((entry) => !statusById.has(entry.id)).map((entry) => entry.id)),
    problems: [...new Set(problems)].sort(compareProblems),
  };
}

function compareProblems(left: string, right: string): number {
  const parse = (problem: string): [string, number] => {
    const match = /^(.*?):(\d+):/.exec(problem);
    return [match?.[1] ?? problem, match?.[2] === undefined ? 1 : parseInt(match[2], 10)];
  };
  const [leftPath, leftLine] = parse(left);
  const [rightPath, rightLine] = parse(right);
  return leftPath === rightPath ? leftLine - rightLine : leftPath.localeCompare(rightPath);
}

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Turns a report into the CheckResult that tools/checks/run-all.ts prints. */
export function reportToResult(report: IndexReport): CheckResult {
  const counts = countByType(report.index.cases);
  const noAutomatedCheckYet = sorted([...report.missing, ...report.stubs, ...report.malformed]);
  const version = report.index.version === undefined ? 'an unknown version' : `v${report.index.version}`;
  const ok = report.problems.length === 0 && noAutomatedCheckYet.length === 0 && counts.total > 0;

  const summary =
    `${plural(counts.total, 'section 7 id')} (${counts.T} T, ${counts.E} E) at ${version} in ${report.index.source}: ` +
    `${report.present.length} real, ${report.pending.length} pending, ` +
    `${noAutomatedCheckYet.length} no automated check yet; ${plural(report.problems.length, 'other problem')}`;

  const details: string[] = [];
  if (report.problems.length > 0) {
    details.push(`Other problems (${report.problems.length}), each failing the check on its own:`);
    details.push(...report.problems.map((problem) => `problem: ${problem}`));
  }
  details.push(`Real cases present (${report.present.length}): ${report.present.join(' ') || 'none'}`);
  details.push(
    `Pending (${report.pending.length}): held out of the green run (code tests by the pending wrapper; evals until the eval runner exists), ` +
      'reported as "pending: no automated check yet", never as passing' +
      (report.pending.length > 0 ? `: ${report.pending.join(' ')}` : ''),
  );
  const pendingEvals = report.pending.filter((id) => report.index.byId.get(id)?.type === 'E');
  if (pendingEvals.length > 0) {
    details.push(
      `Of these, ${plural(pendingEvals.length, 'eval')}: no eval runs before the phase 2 eval runner exists, so an eval counts as pending at most`,
    );
  }
  if (report.stubs.length > 0) {
    details.push(
      `Stubs (${report.stubs.length}): a stub is not a case file (docs/adr/0003-index-check-convention.md), ` +
        `so these ids count as no automated check yet: ${report.stubs.join(' ')}`,
    );
  }
  if (report.malformed.length > 0) {
    details.push(
      `Malformed case files (${report.malformed.length}): each breaks a rule that decides whether it runs (see the problems), ` +
        `so these ids count as no automated check yet: ${report.malformed.join(' ')}`,
    );
  }
  details.push(
    `No automated check yet (${noAutomatedCheckYet.length}): ids with no case file` +
      (report.stubs.length > 0 ? ', only a stub' : '') +
      (report.malformed.length > 0 ? ', or a malformed case file' : '') +
      '; run-all lists them under "No automated check yet"',
  );

  return {
    name: CHECK_NAME,
    ok,
    summary,
    details,
    noAutomatedCheckYet,
    pending: report.pending,
    real: report.present,
  };
}

/** Runs the index check against `root` (the repository root by default). */
export async function runIndexCheck(root: string = repoRoot): Promise<CheckResult> {
  return reportToResult(await buildIndexReport(root));
}

/**
 * Adds the config-integrity problems (tools/vitest/config-integrity.ts) to an
 * index check result: listed first among the other problems, counted in the
 * summary, and failing the check.
 */
export function withRunConfigProblems(result: CheckResult, problems: readonly string[]): CheckResult {
  if (problems.length === 0) return result;
  const lines = problems.map((problem) => `problem: ${problem}`);
  const headIndex = result.details.findIndex((line) => line.startsWith('Other problems ('));
  const total = result.details.filter((line) => line.startsWith('problem: ')).length + problems.length;
  const head = `Other problems (${total}), each failing the check on its own:`;
  const details =
    headIndex === -1
      ? [head, ...lines, ...result.details]
      : [...result.details.slice(0, headIndex), head, ...lines, ...result.details.slice(headIndex + 1)];
  const summary = result.summary.replace(/\d+ other problems?$/, plural(total, 'other problem'));
  return { ...result, ok: false, summary, details };
}
