/**
 * CI's half of `pnpm check`'s run reconciliation (run-counts.ts): reads the run
 * guard report the `test:vitest` job wrote (SOVITECH_RUN_GUARD_OUTPUT, passed on
 * as an artifact), prints the guardrail case counts matched against that run,
 * and exits 1 on a `[run]` problem: a missing or unreadable report, a run that
 * saw no guardrail case file, or a case file that reads as real but did not run
 * and pass as one.
 *
 *   tsx tools/checks/index/reconcile-run.ts <run-guard-report.json>
 */
import { resolve } from 'node:path';
import { repoRoot } from '../lib';
import { formatCaseCounts } from '../runner';
import { readRunCaseCounts } from './run-counts';

const [path] = process.argv.slice(2).filter((argument) => argument !== '--');
if (path === undefined || path === '') {
  process.stderr.write('usage: tsx tools/checks/index/reconcile-run.ts <run-guard-report.json>\n');
  process.exitCode = 1;
} else {
  const outcome = await readRunCaseCounts(repoRoot, resolve(process.cwd(), path));
  process.stdout.write(`${formatCaseCounts(outcome.counts)} (real: matched against the Vitest run)\n`);
  for (const problem of outcome.problems) process.stderr.write(`${problem}\n`);
  process.exitCode = outcome.problems.length === 0 ? 0 : 1;
}
