/**
 * The guardrail case counts after a run: the index check's static reading of the
 * case files, matched against what the Vitest run did (phase 0 review, round 2:
 * "the 'real' count is static"; run-evidence.ts). `pnpm check` (tools/check.ts)
 * prints these counts, and CI's checks:run-evidence job prints the same through
 * reconcile-run.ts, so neither reads "2 real" when no guardrail case ran.
 *
 * A code-test (T) id counts as real only when its file reads as real and the run
 * passed it as real. A static-real id the run did not pass is counted with the
 * ids that have no automated check yet, and it is a `[run]` problem, as are a
 * missing run guard report and a run that saw no guardrail case file. A run with
 * any `[run]` problem is never green.
 */
import { buildIndexReport, type IndexReport } from './index-check';
import { readGuardReport, reconcileWithRun } from './run-evidence';
import type { CaseCounts } from '../runner';
import type { GuardReport } from '../../vitest/guardrail-run-guard';

/** The counts after the run, and every `[run]` problem. */
export interface RunCaseCounts {
  counts: CaseCounts;
  /** Static-real ids the run also passed as real (and every static-real eval id). */
  real: string[];
  problems: string[];
}

/** The counts of one index report against one run guard report (undefined: the run wrote none). */
export function runCaseCounts(report: IndexReport, guard: GuardReport | undefined): RunCaseCounts {
  const reconciliation = reconcileWithRun(report, guard, (id) => report.index.byId.get(id)?.type);
  const ranAsReal = new Set(reconciliation.real);
  const notRunAsReal = report.present.filter((id) => !ranAsReal.has(id));
  return {
    counts: {
      real: ranAsReal.size,
      pending: report.pending.length,
      noAutomatedCheckYet: new Set([...report.missing, ...report.stubs, ...report.malformed, ...notRunAsReal]).size,
    },
    real: [...ranAsReal],
    problems: reconciliation.problems,
  };
}

/** Reads the index report under `root` and the run guard report at `guardReportPath`. */
export async function readRunCaseCounts(root: string, guardReportPath: string): Promise<RunCaseCounts> {
  return runCaseCounts(await buildIndexReport(root), readGuardReport(guardReportPath));
}
