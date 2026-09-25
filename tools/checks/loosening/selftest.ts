/**
 * Self-test of the loosening check (`pnpm check:selftest`).
 *
 * 1. The control inputs must pass: seeded/good/,
 *    seeded/good-git-approval-on-main/ (a synthetic approver and an approving
 *    row committed on main, read from git, so the git reading is shown to
 *    resolve a real approval and not merely to refuse everything), and
 *    seeded/good-2-8-badge-allowance/ (reserved-term allowances that are word
 *    for word texts of docs/guardrails.md 2.8, of their kinds: 2.8 itself, ADR
 *    0011). If one does not pass, the self-test throws: a check that fails on
 *    good input proves nothing.
 * 2. Each seeded bad input must fail, and for its own seeded reason: every
 *    line of its `expected.txt` must appear in the details. A seed that fails
 *    for another reason throws too.
 * 3. A seed holding `probe.mts` is a runtime probe of the gate source, run
 *    with tsx in a plain Node process (a production context, VITEST set to
 *    show that no environment variable opens a gate). It reports what the
 *    process managed to do; any gate read open is a failure of the fix.
 *
 * Returns one CheckResult per bad input; run-all passes the self-test only
 * when every one of them has ok: false.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../lib';
import type { CheckResult, SelfTest } from '../types';
import { NAME, runLoosening, seededInputs } from './core';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

/** Control inputs: each must pass. */
export const CONTROL_SEEDS: readonly string[] = ['good', 'good-git-approval-on-main', 'good-2-8-badge-allowance'];

/**
 * Folders under seeded/ that are not bad inputs of this check: the controls,
 * and boundary-imports/, which holds seeded imports for dependency-cruiser
 * (boundary-seeds.ts), proven by boundary-seeds.test.ts and the lint-bans self-test.
 */
const NOT_BAD_SEEDS = new Set([...CONTROL_SEEDS, 'boundary-imports']);

export function badSeeds(): string[] {
  return readdirSync(SEEDED, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NOT_BAD_SEEDS.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export function expectedReasons(name: string): string[] {
  const path = join(SEEDED, name, 'expected.txt');
  if (!existsSync(path)) throw new Error(`seeded/${name}/expected.txt is missing: every seed states the reason it must fail for`);
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

/** What a runtime probe reports: one line per attempt, "refused: <message>" or what it got. */
interface ProbeReport {
  attempts: Array<{ attempt: string; outcome: string }>;
}

/**
 * Runs seeded/<name>/probe.mts with tsx in a child Node process (never a
 * Vitest worker), with VITEST=true in its environment. The result fails (as a
 * bad seed must) only when every attempt was refused; a gate read open, or an
 * override issued, passes, and so fails the self-test.
 */
function runProbe(name: string): CheckResult {
  const probe = join(SEEDED, name, 'probe.mts');
  const child = spawnSync(process.execPath, ['--import', 'tsx', probe], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, VITEST: 'true' },
    timeout: 60_000,
  });
  const last = child.stdout.trim().split('\n').at(-1) ?? '';
  let report: ProbeReport;
  try {
    report = JSON.parse(last) as ProbeReport;
  } catch {
    throw new Error(`seeded/${name}/probe.mts printed no report (exit ${String(child.status)}):\n${child.stdout}\n${child.stderr}`);
  }
  const allRefused = report.attempts.length > 0 && report.attempts.every((item) => item.outcome.startsWith('refused: '));
  const details = report.attempts.map((item) => `${allRefused ? 'problem' : 'got through'}: ${item.attempt}: ${item.outcome}`);
  return {
    name: NAME,
    ok: !allRefused,
    summary: `seeded/${name}: ${allRefused ? 'every attempt to open or read a gate override outside the tests/proposed runner was refused' : 'an attempt got through'}`,
    details,
  };
}

export async function runSeed(name: string): Promise<CheckResult> {
  if (existsSync(join(SEEDED, name, 'probe.mts'))) return runProbe(name);
  const result = runLoosening(await seededInputs(join(SEEDED, name)));
  return { ...result, summary: `seeded/${name}: ${result.summary}` };
}

const selfTest: SelfTest = async () => {
  for (const control of CONTROL_SEEDS) {
    const result = await runSeed(control);
    if (!result.ok) {
      throw new Error(`The loosening check did not pass its control input seeded/${control}/:\n${result.details.join('\n')}`);
    }
  }
  const results: CheckResult[] = [];
  for (const name of badSeeds()) {
    const result = await runSeed(name);
    const text = result.details.join('\n');
    const missing = expectedReasons(name).filter((reason) => !text.includes(reason));
    if (!result.ok && missing.length > 0) {
      throw new Error(
        `seeded/${name}/ failed, but not for its seeded reason (missing: ${missing.join(' | ')}), so it proves nothing:\n${text}`,
      );
    }
    results.push(result);
  }
  return results;
};

export default selfTest;
