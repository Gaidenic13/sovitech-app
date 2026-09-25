/**
 * Reconciles the index check's static reading with what the Vitest run did
 * (phase 0 review, round 2: "the 'real' count is static"). The index check reads
 * case files; the run guard (tools/vitest/guardrail-run-guard.ts) reads the run.
 * A code-test (T) id counts as real only when both agree: its file reads as a real
 * case, and the run passed it as one. Eval (E) ids keep their own evidence
 * (eval-runs.ts).
 *
 * Use: run the Vitest step with SOVITECH_RUN_GUARD_OUTPUT set to a file, then
 * `reconcileWithRun(report, readGuardReport(file))`. A missing report, a run that
 * saw no guardrail case file, and every static-real id the run did not pass are
 * `[run]` problems. `pnpm check` (tools/check.ts) is where this is wired.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { GuardReport } from '../../vitest/guardrail-run-guard';

/** The static lists the reconciliation reads (an IndexReport has them). */
export interface StaticCaseLists {
  present: readonly string[];
  pending: readonly string[];
}

/** The ids that count as real after the run, and every disagreement. */
export interface RunReconciliation {
  real: string[];
  problems: string[];
}

/** Reads the run guard's JSON report, or undefined when it is missing or unreadable. */
export function readGuardReport(path: string): GuardReport | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const value = JSON.parse(readFileSync(path, 'utf8')) as Partial<GuardReport>;
    const lists = [value.real, value.pending, value.failed];
    return lists.every(Array.isArray) && typeof value.counts === 'object' ? (value as GuardReport) : undefined;
  } catch {
    return undefined;
  }
}

/** How the run left one case id, in the run guard's words. */
function runStateOf(id: string, guard: GuardReport): string {
  if (guard.failed.includes(id)) return 'it failed';
  if ((guard.heldOut ?? []).includes(id)) return 'a test was held out other than by the pending wrapper';
  if ((guard.notCounted ?? []).includes(id)) return 'the run guard did not count it (see its problems)';
  if (guard.pending.includes(id)) return 'the pending wrapper held it out';
  return 'the run did not collect it';
}

/**
 * The real ids after the run: each static-real T id that the run also passed as
 * real, and every static-real E id. `typeOf` says whether an id is T or E.
 */
export function reconcileWithRun(
  lists: StaticCaseLists,
  guard: GuardReport | undefined,
  typeOf: (id: string) => 'T' | 'E' | undefined,
): RunReconciliation {
  const staticT = lists.present.filter((id) => typeOf(id) === 'T');
  const staticE = lists.present.filter((id) => typeOf(id) === 'E');
  if (guard === undefined) {
    return {
      real: staticE,
      problems: [
        '[run] the Vitest run wrote no run guard report (SOVITECH_RUN_GUARD_OUTPUT), so no code-test case can be ' +
          'read as having run; its static reading alone never counts it',
      ],
    };
  }
  const problems: string[] = [];
  if (guard.counts.files === 0) {
    problems.push('[run] the run guard saw no guardrail case file: the guardrails project did not run');
  }
  const real: string[] = [];
  for (const id of staticT) {
    if (guard.real.includes(id)) real.push(id);
    else problems.push(`[run] ${id} reads as a real case in its file, but the run did not pass it as one: ${runStateOf(id, guard)}`);
  }
  for (const id of lists.pending) {
    if (typeOf(id) === 'T' && guard.real.includes(id)) {
      problems.push(`[run] ${id} is held out by the pending wrapper in its file, but ran as a real case`);
    }
  }
  return { real: [...real, ...staticE], problems };
}
