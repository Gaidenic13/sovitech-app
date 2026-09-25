/**
 * Runs the guardrail run guard on its seeded root (tools/vitest/seeded/run/)
 * in a child Vitest process, and checks that each seeded case file ends as its
 * seed says: the two controls clean, every other file with its own problem, or
 * failing. Used by the guard's unit test and by the index check's self-test
 * (`pnpm check:selftest`), so the run-time half of the index check is proven on
 * seeded bad inputs like the static half.
 *
 * A child process keeps the nested run apart: Vitest sets VITEST, TEST and
 * NODE_ENV in the process that starts it, and the guard sets the exit code.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_GUARD_OUTPUT_ENV, type GuardReport } from './guardrail-run-guard';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** The seeded Vitest root with one case file per fault. */
export const SEEDED_RUN_ROOT = join(HERE, 'seeded', 'run');

/** A seeded root on which Vitest alone passes and the guard must fail the run. */
export const SEEDED_HELD_OUT_ONLY_ROOT = join(HERE, 'seeded', 'held-out-only');

/** A seeded root whose config excludes a case file; Vitest alone passes it, the guard must not. */
export const SEEDED_NOT_COLLECTED_ROOT = join(HERE, 'seeded', 'not-collected');

/** A seeded root with no config, so the stub guard does not run; Vitest alone passes it, the guard must not. */
export const SEEDED_UNGUARDED_ROOT = join(HERE, 'seeded', 'unguarded');

/**
 * A seeded root with a guardrail test that asserts nothing. Its config reads the
 * guardrails project's expect settings from the repository's vitest.config.ts, so
 * Vitest itself fails the run; with NO_ASSERTION_OLD_CONFIG_ENV set it uses the
 * settings from before the phase 0 review (none), and the run passes.
 */
export const SEEDED_NO_ASSERTION_ROOT = join(HERE, 'seeded', 'no-assertion');

/** Set to '1' to run SEEDED_NO_ASSERTION_ROOT with the guardrails project's old expect settings. */
export const NO_ASSERTION_OLD_CONFIG_ENV = 'SOVITECH_SEED_WITHOUT_REQUIRE_ASSERTIONS';

/**
 * The seeded roots on which Vitest alone passes and the guard must fail the run,
 * each with the one problem it must report and the case ids it must count as real.
 */
export const SEEDED_GUARD_ONLY_ROOTS: ReadonlyArray<{ name: string; root: string; problem: string; real: readonly string[] }> = [
  { name: 'held-out-only', root: SEEDED_HELD_OUT_ONLY_ROOT, problem: 'tests/guardrails/G1-3.test.ts: [held out]', real: ['G1-1'] },
  { name: 'not-collected', root: SEEDED_NOT_COLLECTED_ROOT, problem: 'tests/guardrails/G1-2.test.ts: [not collected]', real: ['G1-1'] },
  // Phase 0 review, round 2: without the stub guard, a case that reaches an unbuilt stub passes.
  { name: 'unguarded', root: SEEDED_UNGUARDED_ROOT, problem: 'tests/guardrails/G1-1.test.ts: [unguarded]', real: [] },
];

/** What one seeded case file must end as, and how to tell. */
export interface SeededRunExpectation {
  caseId: string;
  seeds: string;
  /** True when the report shows the seeded outcome. */
  holds: (report: GuardReport) => boolean;
}

const problemOf =
  (caseId: string, ...parts: string[]) =>
  (report: GuardReport): boolean =>
    report.problems.some(
      (problem) => problem.startsWith(`tests/guardrails/${caseId}.test.ts: `) && parts.every((part) => problem.includes(part)),
    );

const clean =
  (caseId: string, kind: 'real' | 'pending') =>
  (report: GuardReport): boolean =>
    report[kind].includes(caseId) &&
    !report.failed.includes(caseId) &&
    !report.problems.some((problem) => problem.startsWith(`tests/guardrails/${caseId}.test.ts: `));

const failing =
  (caseId: string) =>
  (report: GuardReport): boolean =>
    report.failed.includes(caseId) && !report.pending.includes(caseId) && !report.real.includes(caseId);

/** Failing, and for the seeded reason: one of its errors holds every part. */
const failingWith =
  (caseId: string, ...parts: string[]) =>
  (report: GuardReport): boolean =>
    failing(caseId)(report) &&
    (report.failureMessages[caseId] ?? []).some((message) => parts.every((part) => message.includes(part)));

/** A [held out] problem, and the file listed under held out, never under real (phase 0 review, round 2). */
const heldOutOf =
  (caseId: string, ...parts: string[]) =>
  (report: GuardReport): boolean =>
    problemOf(caseId, '[held out]', ...parts)(report) && report.heldOut.includes(caseId) && !report.real.includes(caseId);

/** The stub guard's failure (tools/vitest/guardrail-stub-guard.ts). */
const STUB_FAILURE = '[stub] case exercises an unbuilt stub';

/** The seeded outcome of every file in tests/guardrails/ of the seeded root (its README lists them). */
export const SEEDED_RUN_EXPECTATIONS: readonly SeededRunExpectation[] = [
  { caseId: 'G1-1', seeds: 'control: a real case that passes', holds: clean('G1-1', 'real') },
  { caseId: 'G1-2', seeds: 'control: a pending case held out by the wrapper', holds: clean('G1-2', 'pending') },
  { caseId: 'G1-3', seeds: 'an options object { skip: true }', holds: heldOutOf('G1-3', 'marked skip') },
  { caseId: 'G1-4', seeds: 'an options object { todo: true }', holds: heldOutOf('G1-4', 'marked todo') },
  { caseId: 'G1-5', seeds: 'an options object { fails: true }', holds: heldOutOf('G1-5', 'fails mode') },
  { caseId: 'G1-6', seeds: 'a describe-level { skip: true }', holds: heldOutOf('G1-6', 'marked skip') },
  { caseId: 'G1-7', seeds: "a computed modifier test['skip']", holds: heldOutOf('G1-7', 'marked skip') },
  { caseId: 'G1-8', seeds: 'a destructured modifier', holds: heldOutOf('G1-8', 'marked skip') },
  {
    caseId: 'G1-9',
    seeds: "context.skip() with the wrapper's note, outside the wrapper",
    holds: heldOutOf('G1-9', 'no pending record'),
  },
  {
    caseId: 'G1-10',
    seeds: "the wrapper's record and note forged in a file with no marker",
    holds: heldOutOf('G1-10', '@pending-until marker'),
  },
  { caseId: 'G1-11', seeds: 'a case file that registers no test', holds: problemOf('G1-11', '[no tests]') },
  // Vitest reads the .only test itself back as mode "run"; the test it leaves out is marked skip.
  { caseId: 'G1-12', seeds: 'test.only beside another test', holds: heldOutOf('G1-12', 'seeded case that only leaves out', 'marked skip') },
  { caseId: 'G2-1', seeds: 'a pending case that throws new NotImplementedError itself', holds: failing('G2-1') },
  { caseId: 'G2-2', seeds: 'a pending case that throws a look-alike error class', holds: failing('G2-2') },
  { caseId: 'G2-3', seeds: 'a title that names no case id', holds: problemOf('G2-3', '[title]') },
  { caseId: 'G2-4', seeds: 'test.todo', holds: heldOutOf('G2-4', 'marked todo') },
  { caseId: 'G2-5', seeds: 'test.skipIf(true)', holds: heldOutOf('G2-5', 'marked skip') },
  { caseId: 'G2-6', seeds: 'a pending case whose body fails to import a module', holds: failing('G2-6') },
  { caseId: 'G2-7', seeds: 'a pending case held for derive whose body reaches verify-proposal', holds: failing('G2-7') },
  { caseId: 'G2-8', seeds: 'a pending case whose body passes', holds: failing('G2-8') },
  { caseId: 'G2-9', seeds: 'the wrapper with no marker on the first line', holds: problemOf('G2-9', '[no tests]', 'failed to load') },
  { caseId: 'G2-10', seeds: 'a case file whose import fails', holds: problemOf('G2-10', '[no tests]', 'failed to load') },
  // Phase 0 review, round 2: a case that passes because an unbuilt stub throws, or that catches its error.
  {
    caseId: 'G2-11',
    seeds: 'expect(() => derive(...)).toThrow() without the pending wrapper',
    holds: failingWith('G2-11', STUB_FAILURE, 'during the test: derive'),
  },
  {
    caseId: 'G2-12',
    seeds: 'await expect(...verifyProposal(...)).rejects.toThrow() without the pending wrapper',
    holds: failingWith('G2-12', STUB_FAILURE, 'during the test: verify-proposal'),
  },
  {
    caseId: 'G2-13',
    seeds: 'the derive stub reached while the file loads, its error swallowed',
    holds: failingWith('G2-13', STUB_FAILURE, 'outside any test of this file'),
  },
  {
    caseId: 'G2-14',
    seeds: 'a support helper that swallows the body failure and asserts a constant',
    holds: failingWith('G2-14', STUB_FAILURE, 'during the test: derive'),
  },
];

/** The outcome of the seeded run. */
export interface SeededRun {
  report: GuardReport;
  exitCode: number | null;
  output: string;
}

/**
 * Runs Vitest in a child process on a seeded root. With the guard, it is the only
 * reporter and its findings are read back; without it, Vitest's default reporter
 * runs alone, to show what Vitest decides by itself.
 */
export function runSeededVitest(
  root: string,
  withGuard: boolean,
  extraEnv: Readonly<Record<string, string>> = {},
): { exitCode: number | null; output: string; report: GuardReport | undefined } {
  const scratch = mkdtempSync(join(tmpdir(), 'sovitech-run-guard-'));
  const outputFile = join(scratch, 'report.json');
  try {
    const env: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (!/^(?:VITEST|TEST$|NODE_ENV$|TINYPOOL)/.test(key) && key !== NO_ASSERTION_OLD_CONFIG_ENV) env[key] = value;
    }
    Object.assign(env, extraEnv);
    // The seeded run writes only its own report: never the report file of the run
    // that started it (pnpm check sets the variable for its Vitest step).
    if (withGuard) env[RUN_GUARD_OUTPUT_ENV] = outputFile;
    else delete env[RUN_GUARD_OUTPUT_ENV];
    const child = spawnSync(
      process.execPath,
      [
        join(REPO_ROOT, 'node_modules', 'vitest', 'vitest.mjs'),
        'run',
        '--root',
        root,
        '--reporter',
        withGuard ? join(HERE, 'guardrail-run-guard.ts') : 'default',
        '--allowOnly',
        '--no-color',
        // No results cache: a check never writes into the repository.
        '--no-cache',
      ],
      { cwd: root, env, encoding: 'utf8', timeout: 120_000 },
    );
    const output = `${child.stdout}${child.stderr}`;
    let report: GuardReport | undefined;
    if (withGuard) {
      try {
        report = JSON.parse(readFileSync(outputFile, 'utf8')) as GuardReport;
      } catch {
        throw new Error(`The seeded run wrote no guard report (exit ${String(child.status)}):\n${output}`);
      }
    }
    return { exitCode: child.status, output, report };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Runs Vitest on the seeded root with the guard as its only reporter. */
export function runSeededGuard(root: string = SEEDED_RUN_ROOT): SeededRun {
  const run = runSeededVitest(root, true);
  if (run.report === undefined) throw new Error('The seeded run returned no guard report.');
  return { report: run.report, exitCode: run.exitCode, output: run.output };
}

/** The expectations that do not hold on a run, each with why. */
export function unmetExpectations(run: SeededRun): string[] {
  const unmet = SEEDED_RUN_EXPECTATIONS.filter((expectation) => !expectation.holds(run.report)).map(
    (expectation) => `${expectation.caseId} (${expectation.seeds}) did not end as seeded`,
  );
  const listed = new Set(SEEDED_RUN_EXPECTATIONS.map((expectation) => expectation.caseId));
  const seen = [...run.report.real, ...run.report.pending, ...run.report.heldOut, ...run.report.notCounted, ...run.report.failed];
  for (const caseId of seen) if (!listed.has(caseId)) unmet.push(`${caseId} ran but has no expectation`);
  if (run.report.counts.files !== SEEDED_RUN_EXPECTATIONS.length) {
    unmet.push(`the run saw ${run.report.counts.files} case files; ${SEEDED_RUN_EXPECTATIONS.length} are seeded`);
  }
  if (run.exitCode !== 1) unmet.push(`the seeded run exited with ${String(run.exitCode)}; it must fail (1)`);
  return unmet;
}
