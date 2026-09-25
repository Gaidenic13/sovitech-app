/**
 * `pnpm check`: the one local command that mirrors CI (.gitlab-ci.yml).
 *
 * Order: lint, typecheck, unit and guardrail tests, the extractor's tests, the
 * render test, then every check in tools/checks/ and their self-tests. Each step
 * runs even when an earlier one failed; the summary lists every step, and the
 * command exits non-zero when any step failed.
 *
 * The summary also prints the guardrail case counts (real, pending, no automated
 * check yet), and a green run is labelled "passed with N pending (no automated
 * check yet)" while any case is held out, so a green run never reads as if every
 * case were checked (PRD D-33 interim; CLAUDE.md definition of done items 1 and
 * 5). A run whose counts cannot be read is not green.
 *
 * "Real" comes from the case files and the run together (phase 0 review, round 2:
 * "the 'real' count is static"): the Vitest step writes the run guard's report
 * to a scratch file (SOVITECH_RUN_GUARD_OUTPUT), and a code-test case counts as
 * real only when the index check reads its file as real and the run passed it as
 * one (tools/checks/index/run-counts.ts). A missing report, a run that saw no
 * guardrail case file, and a case that reads as real but did not run and pass
 * are `[run]` problems, and the run is not green.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRunCaseCounts, type RunCaseCounts } from './checks/index/run-counts';
import { formatCaseCounts, passedLabel } from './checks/runner';
import { RUN_GUARD_OUTPUT_ENV } from './vitest/guardrail-run-guard';

interface Step {
  name: string;
  script: string;
  /** Extra environment variables for this step only. */
  env?: Readonly<Record<string, string>>;
}

/** The run guard's JSON report of this run's Vitest step, in a scratch folder outside the repository. */
const scratch = mkdtempSync(join(tmpdir(), 'sovitech-check-'));
const runGuardReport = join(scratch, 'guardrail-run-guard.json');

const STEPS: readonly Step[] = [
  { name: 'lint: ESLint', script: 'lint:eslint' },
  { name: 'lint: dependency-cruiser', script: 'lint:deps' },
  { name: 'typecheck: packages', script: 'typecheck:packages' },
  { name: 'typecheck: root (tools, tests, configs)', script: 'typecheck:root' },
  { name: 'tests: unit and guardrails (Vitest)', script: 'test', env: { [RUN_GUARD_OUTPUT_ENV]: runGuardReport } },
  { name: 'tests: extractor (ruff, pytest)', script: 'test:py' },
  { name: 'render test (Playwright)', script: 'test:render' },
  { name: 'checks (tools/checks)', script: 'checks' },
  { name: 'checks self-test (seeded bad inputs must fail)', script: 'check:selftest' },
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A step that runs longer than this is stopped and counted as failed. */
const STEP_TIMEOUT_MS = 30 * 60 * 1000;

interface Outcome {
  step: Step;
  ok: boolean;
  seconds: number;
  note: string;
}

const outcomes: Outcome[] = [];
for (const step of STEPS) {
  process.stdout.write(`\n=== ${step.name} (pnpm run ${step.script}) ===\n`);
  const started = Date.now();
  const result = spawnSync('pnpm', ['run', step.script], {
    cwd: repoRoot,
    env: { ...process.env, ...step.env },
    stdio: 'inherit',
    timeout: STEP_TIMEOUT_MS,
    killSignal: 'SIGTERM',
  });
  const timedOut = result.error !== undefined && 'code' in result.error && result.error.code === 'ETIMEDOUT';
  const ok = result.status === 0 && result.error === undefined;
  const note = timedOut ? 'timed out' : result.error !== undefined ? result.error.message : '';
  outcomes.push({ step, ok, seconds: Math.round((Date.now() - started) / 100) / 10, note });
}

const width = Math.max(...STEPS.map((step) => step.name.length));
process.stdout.write('\n=== pnpm check: summary ===\n');
for (const outcome of outcomes) {
  const line = `${outcome.step.name.padEnd(width)}  ${outcome.ok ? 'PASS' : 'FAIL'}  ${outcome.seconds}s`;
  process.stdout.write(`${outcome.note === '' ? line : `${line}  (${outcome.note})`}\n`);
}

/** The guardrail case counts, read by the index check and checked against the run; an error when they cannot be read. */
async function readCaseCounts(): Promise<RunCaseCounts | Error> {
  try {
    return await readRunCaseCounts(repoRoot, runGuardReport);
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const outcome = await readCaseCounts();
if (outcome instanceof Error) {
  process.stdout.write(`\nGuardrail case counts could not be read: ${outcome.message}\n`);
} else {
  process.stdout.write(`\n${formatCaseCounts(outcome.counts)} Real: read from the case files and matched against this run's Vitest step.\n`);
  if (outcome.problems.length > 0) {
    process.stdout.write(`\nThe run does not match the case files (${outcome.problems.length}):\n`);
    for (const problem of outcome.problems) process.stdout.write(`  ${problem}\n`);
  }
}
const failed = outcomes.filter((item) => !item.ok);
const matched = !(outcome instanceof Error) && outcome.problems.length === 0;
const green = failed.length === 0 && matched;
process.stdout.write(
  green && !(outcome instanceof Error)
    ? `\n${passedLabel(`All ${outcomes.length} steps`, outcome.counts)}\n`
    : failed.length === 0
      ? `\nAll ${outcomes.length} steps passed, but the run is not green: ${
          outcome instanceof Error ? 'the guardrail case counts could not be read' : 'the Vitest run does not match the case files'
        }.\n`
      : `\n${failed.length} of ${outcomes.length} steps failed${matched ? '' : ', and the Vitest run does not match the case files'}.\n`,
);
process.exitCode = green ? 0 : 1;
