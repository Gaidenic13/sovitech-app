/**
 * The guardrail run guard: a Vitest reporter that reads the results of every
 * guardrail case file (tests/guardrails/<ID>.test.ts, docs/guardrails.md
 * section 7) after the run and fails the run when a case did not really run.
 *
 * The index check (tools/checks/index/) reads the case files' source; this guard
 * reads what Vitest actually did with them, so a case held out in a way the
 * source reading misses still fails (phase 0 review, finding "The index check
 * decides from file text alone that a T case is 'real'"). It fails the run when:
 * - a test is marked skip, todo or only (a modifier, an options object, a
 *   describe-level option, a `.only` elsewhere in the file, or a -t filter);
 * - a test runs in fails mode, which passes on any error;
 * - a test was skipped while running, unless the pending wrapper skipped it: the
 *   wrapper's record in the test's meta, its note word for word, and a case file that
 *   starts with the pending marker naming that feature and phase and imports the
 *   wrapper (tests/guardrails/_support/pending.ts; docs/adr/0004);
 * - a test did not finish;
 * - a test's full name does not name the file's case id;
 * - a case file ran no test at all;
 * - a test passed without the stub guard's record in its meta, so the stub guard
 *   (guardrail-stub-guard.ts, a setup file of the guardrails project) did not run
 *   ([unguarded]), or its record shows that the test reached an unbuilt domain stub
 *   ([stub]; the stub guard fails such a test itself, this is the second look);
 * - on a run with no file filter (no file arguments, --changed, --related,
 *   --shard or watch mode) that includes the guardrail cases, a case file on disk
 *   was not collected, for example because the config excludes it.
 * A pending skip is reported as "pending: no automated check yet", never as
 * passing. A file with a held-out test is listed under `heldOut`, never under
 * `real`, even when Vitest counts the test as passed (fails mode).
 *
 * It is registered in vitest.config.ts beside the default reporter. A command
 * line `--reporter` replaces the configured reporters, and the guard with them,
 * so `pnpm test` and CI run Vitest without one.
 *
 * Options: `outputFile` (or the environment variable SOVITECH_RUN_GUARD_OUTPUT)
 * writes the findings as JSON, for the guard's own seeded self-test.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Reporter, TestCase, TestModule, Vitest } from 'vitest/node';
import { parsePendingMarker } from '@sovitech/domain';
import { fileReader, importsPendingWrapper, namesId } from '../checks/index/wrapper-imports';
import { PENDING_META_KEY, PENDING_NOTE_PREFIX, pendingNote } from '../../tests/guardrails/_support/pending-note';
import { STUB_GUARD_META_KEY, STUB_GUARD_SETUP_FILE, isStubGuardRecord, stubGuardProblem } from './stub-guard';

/** A guardrail case file: tests/guardrails/<ID>.test.ts or .test.tsx, at the top level. */
const CASE_FILE = /^tests\/guardrails\/([^/]+)\.test\.tsx?$/;

/** The folder of the guardrail case files, relative to the root. */
const CASE_DIR = 'tests/guardrails';

/** The Vitest project that runs the guardrail cases (vitest.config.ts). */
const GUARDRAILS_PROJECT = 'guardrails';

/** The environment variable that names the JSON output file. */
export const RUN_GUARD_OUTPUT_ENV = 'SOVITECH_RUN_GUARD_OUTPUT';

/** One test of a guardrail case file, as the run left it. */
export interface GuardedTest {
  fullName: string;
  mode: 'run' | 'only' | 'skip' | 'todo';
  fails: boolean;
  state: 'passed' | 'failed' | 'skipped' | 'pending';
  note: string | undefined;
  /** The pending wrapper's record in the test's meta, if any. */
  record: unknown;
  /** The stub guard's record in the test's meta (tools/vitest/stub-guard.ts), if any. */
  stubGuard: unknown;
  /** The first line of each error of a failed test. */
  errors?: string[];
}

/** One guardrail case file, as the run left it. */
export interface GuardedModule {
  /** Root-relative path with forward slashes. */
  path: string;
  caseId: string;
  /** Errors outside any test, such as an import error. */
  loadErrors: number;
  tests: GuardedTest[];
  /** Whether the file starts with a well-formed pending marker, and which one. */
  marker: { phase: number; features: readonly string[] } | undefined;
  /** Whether the file imports the pending wrapper (directly or through _support). */
  importsWrapper: boolean;
}

/**
 * What the guard found. Each case file ran is in exactly one list, checked in
 * this order: `failed`, `heldOut`, `notCounted`, `pending`, `real`.
 */
export interface GuardReport {
  problems: string[];
  /** Case ids whose file ran cleanly: at least one test passed, none failed or was held out, and the file has no problem. */
  real: string[];
  /** Case ids with at least one test held out by the pending wrapper, none failed, and no problem. */
  pending: string[];
  /** Case ids with a test held out other than by the pending wrapper (a [held out] problem), none failed; never real. */
  heldOut: string[];
  /** Case ids whose file has another problem ([no tests], [not run], [title], [unguarded], [stub]) and no failed test. */
  notCounted: string[];
  /** Case files with at least one failed test (Vitest fails the run for these on its own). */
  failed: string[];
  /** The first line of each error of each failed test, by case id, so a seeded failure can be told from another. */
  failureMessages: Record<string, string[]>;
  counts: { files: number; passed: number; failed: number; pendingSkips: number };
}

/** Why a skipped test is not the pending wrapper's skip, or undefined when it is. */
function notWrapperSkip(module: GuardedModule, test: GuardedTest): string | undefined {
  const record = test.record;
  if (typeof record !== 'object' || record === null) return 'it carries no pending record from the wrapper';
  const { caseId, feature, phase } = record as Record<string, unknown>;
  if (caseId !== module.caseId || typeof feature !== 'string' || typeof phase !== 'number') {
    return 'its pending record does not name this case file';
  }
  if (module.marker === undefined) return 'the file does not start with a well-formed @pending-until marker';
  if (!module.importsWrapper) return 'the file does not import the pending wrapper';
  if (!module.marker.features.includes(feature) || module.marker.phase !== phase) {
    return `its record names ${feature}, phase ${String(phase)}, which the file's marker does not`;
  }
  if (test.note !== pendingNote({ feature: feature as never, phase })) {
    return `its note is not the wrapper's ("${PENDING_NOTE_PREFIX} (...)")`;
  }
  return undefined;
}

/**
 * Why a passing guardrail test is not proven to have run under the stub guard,
 * or undefined. The stub guard writes its record on every test it sees finish
 * and fails a test that reached an unbuilt stub, so a passing test with no
 * record ran without it, and one whose record shows a stub error should not
 * have passed (a test in fails mode, say).
 */
function stubGuardOnPass(test: GuardedTest): string | undefined {
  const name = `"${test.fullName}"`;
  if (!isStubGuardRecord(test.stubGuard)) {
    return (
      `[unguarded] ${name} passed without the stub guard's record, so the stub guard did not run: the guardrails ` +
      `project's setupFiles must list ${STUB_GUARD_SETUP_FILE}, which fails a case that exercises an unbuilt stub`
    );
  }
  const problem = stubGuardProblem(test.stubGuard, false);
  return problem === undefined ? undefined : `${problem.replace(/^\[stub\] /, `[stub] ${name} passed, but the `)}`;
}

/** The guardrail case files on disk under `root`, as root-relative paths. */
export function caseFilesOnDisk(root: string): string[] {
  const dir = join(root, CASE_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => `${CASE_DIR}/${name}`)
    .filter((path) => CASE_FILE.test(path))
    .sort();
}

/**
 * Audits the guardrail case files of one run. Pure; the reporter feeds it.
 * `notCollected` lists case files on disk that an unfiltered run did not collect.
 */
export function auditGuardrailRun(
  modules: readonly GuardedModule[],
  options: { filtered: boolean; notCollected?: readonly string[] },
): GuardReport {
  const problems: string[] = [];
  for (const path of options.notCollected ?? []) {
    problems.push(
      `${path}: [not collected] the case file exists, but the run did not collect it (an exclude in the Vitest config, ` +
        'or an include that misses it); a case that never runs is no check',
    );
  }
  const real: string[] = [];
  const pending: string[] = [];
  const heldOut: string[] = [];
  const notCounted: string[] = [];
  const failed: string[] = [];
  const failureMessages: Record<string, string[]> = {};
  const counts = { files: modules.length + (options.notCollected ?? []).length, passed: 0, failed: 0, pendingSkips: 0 };
  const filterHint = options.filtered ? '; a -t filter was set, which skips tests: run the guardrail cases without one' : '';

  for (const module of modules) {
    const at = `${module.path}: `;
    if (module.tests.length === 0) {
      problems.push(
        `${at}[no tests] the case file ran no test${module.loadErrors > 0 ? ' (it failed to load)' : ''}; a case file proves its case with at least one test`,
      );
      notCounted.push(module.caseId);
      continue;
    }
    let passed = 0;
    let pendingSkips = 0;
    let failures = 0;
    let heldOutTests = 0;
    let otherProblems = 0;
    for (const test of module.tests) {
      const name = `"${test.fullName}"`;
      if (test.mode !== 'run') {
        problems.push(
          `${at}[held out] ${name} is marked ${test.mode}; only the pending wrapper may hold a case out${filterHint}`,
        );
        heldOutTests += 1;
      }
      if (test.fails) {
        problems.push(`${at}[held out] ${name} runs in fails mode, which passes on any error`);
        heldOutTests += 1;
      }
      if (test.state === 'skipped' && test.mode === 'run') {
        const reason = notWrapperSkip(module, test);
        if (reason === undefined) pendingSkips += 1;
        else {
          problems.push(`${at}[held out] ${name} was skipped while running, but not by the pending wrapper: ${reason}`);
          heldOutTests += 1;
        }
      }
      if (test.state === 'pending') {
        problems.push(`${at}[not run] ${name} did not finish`);
        otherProblems += 1;
      }
      if (test.state === 'passed') {
        passed += 1;
        const stubProblem = stubGuardOnPass(test);
        if (stubProblem !== undefined) {
          problems.push(`${at}${stubProblem}`);
          otherProblems += 1;
        }
      }
      if (test.state === 'failed') {
        failures += 1;
        (failureMessages[module.caseId] ??= []).push(...(test.errors ?? []));
      }
      if (!namesId(test.fullName, module.caseId)) {
        problems.push(`${at}[title] ${name} does not name ${module.caseId}; case titles start with the ids they prove`);
        otherProblems += 1;
      }
    }
    counts.passed += passed;
    counts.pendingSkips += pendingSkips;
    counts.failed += failures;
    if (failures > 0) failed.push(module.caseId);
    else if (heldOutTests > 0) heldOut.push(module.caseId);
    else if (otherProblems > 0) notCounted.push(module.caseId);
    else if (pendingSkips > 0) pending.push(module.caseId);
    else if (passed > 0) real.push(module.caseId);
    else notCounted.push(module.caseId);
  }
  return { problems, real, pending, heldOut, notCounted, failed, failureMessages, counts };
}

/** The report the guard prints. */
export function formatGuardReport(report: GuardReport): string {
  const { counts } = report;
  const head =
    `Guardrail run guard: ${counts.files} case file${counts.files === 1 ? '' : 's'}: ` +
    `${report.real.length} ran as real cases, ${report.pending.length} pending (${PENDING_NOTE_PREFIX}), ` +
    `${report.heldOut.length} held out other than by the wrapper, ${report.notCounted.length} not counted, ` +
    `${report.failed.length} failed; ` +
    `${counts.passed} tests passed, ${counts.pendingSkips} held out by the pending wrapper, ${counts.failed} failed`;
  if (report.problems.length === 0) return head;
  return [
    `${head}.`,
    `Guardrail run guard FAILED the run: ${report.problems.length} problem${report.problems.length === 1 ? '' : 's'}:`,
    ...report.problems.map((problem) => `  ${problem}`),
  ].join('\n');
}

/** The first line of an error message, at most 400 characters. */
function firstLine(message: string): string {
  const line = message.split('\n', 1)[0] ?? '';
  return line.length > 400 ? `${line.slice(0, 397)}...` : line;
}

function toGuardedTest(test: TestCase): GuardedTest {
  const result = test.result();
  const meta = test.meta() as Record<string, unknown>;
  return {
    fullName: test.fullName,
    mode: test.options.mode,
    fails: test.options.fails === true,
    state: result.state,
    note: result.state === 'skipped' ? result.note : undefined,
    record: meta[PENDING_META_KEY],
    stubGuard: meta[STUB_GUARD_META_KEY],
    errors: result.state === 'failed' ? (result.errors ?? []).map((error) => firstLine(error.message)) : undefined,
  };
}

/** Reads a test module into the guard's shape, or undefined when it is not a guardrail case file. */
export function toGuardedModule(root: string, module: TestModule): GuardedModule | undefined {
  const path = relative(root, module.moduleId).split(sep).join('/');
  const caseId = CASE_FILE.exec(path)?.[1];
  if (caseId === undefined) return undefined;
  let source: string;
  try {
    source = readFileSync(module.moduleId, 'utf8');
  } catch {
    source = '';
  }
  const parsed = parsePendingMarker(source);
  return {
    path,
    caseId,
    loadErrors: module.errors().length,
    tests: [...module.children.allTests()].map(toGuardedTest),
    marker: parsed.kind === 'marker' ? parsed.marker : undefined,
    importsWrapper: importsPendingWrapper(path, source, fileReader(root)),
  };
}

export interface GuardrailRunGuardOptions {
  /** Where to write the findings as JSON. Defaults to $SOVITECH_RUN_GUARD_OUTPUT, if set. */
  outputFile?: string;
  /** How the guard fails the run. Defaults to setting process.exitCode to 1. */
  fail?: () => void;
  /** Where the report goes. Defaults to Vitest's logger. */
  write?: (text: string) => void;
}

export default class GuardrailRunGuard implements Reporter {
  private vitest: Vitest | undefined;
  private readonly options: GuardrailRunGuardOptions;

  constructor(options: GuardrailRunGuardOptions = {}) {
    this.options = options;
  }

  onInit(vitest: Vitest): void {
    this.vitest = vitest;
  }

  /**
   * True when the run selects files some other way than the config: file
   * arguments, --changed, --related, --shard, or watch mode. The file arguments
   * sit in a field Vitest marks internal; if it is ever missing, the run counts as
   * unfiltered, so the collection check fails closed.
   */
  private filesFiltered(): boolean {
    const vitest = this.vitest as unknown as
      | { filenamePattern?: unknown; config: Record<string, unknown> }
      | undefined;
    if (vitest === undefined) return true;
    const { changed, related, shard, watch } = vitest.config;
    const filters = vitest.filenamePattern;
    return (
      (Array.isArray(filters) && filters.length > 0) ||
      (changed !== undefined && changed !== false) ||
      (Array.isArray(related) && related.length > 0) ||
      shard !== undefined ||
      watch === true
    );
  }

  onTestRunEnd(testModules: ReadonlyArray<TestModule>): void {
    const root = this.vitest?.config.root ?? process.cwd();
    const modules = testModules
      .map((module) => toGuardedModule(root, module))
      .filter((module): module is GuardedModule => module !== undefined);
    const guardrailsSelected = this.vitest?.projects.some((project) => project.name === GUARDRAILS_PROJECT) ?? false;
    const collected = new Set(modules.map((module) => module.path));
    const notCollected =
      !this.filesFiltered() && (modules.length > 0 || guardrailsSelected)
        ? caseFilesOnDisk(root).filter((path) => !collected.has(path))
        : [];
    if (modules.length === 0 && notCollected.length === 0) return;
    const pattern = this.vitest?.config.testNamePattern;
    const report = auditGuardrailRun(modules, {
      filtered: pattern !== undefined && String(pattern) !== '',
      notCollected,
    });

    const outputFile = this.options.outputFile ?? process.env[RUN_GUARD_OUTPUT_ENV];
    if (outputFile !== undefined && outputFile !== '') writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);

    const text = formatGuardReport(report);
    const write =
      this.options.write ??
      ((line: string) => (report.problems.length > 0 ? this.vitest?.logger.error(line) : this.vitest?.logger.log(line)));
    write(`\n${text}\n`);
    if (report.problems.length > 0) {
      (this.options.fail ??
        (() => {
          process.exitCode = 1;
        }))();
    }
  }
}
