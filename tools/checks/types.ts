/**
 * The contract between tools/checks/run-all.ts and every check under
 * tools/checks/<name>/. See tools/checks/README.md.
 */

/** What a check returns. `run-all` prints one table row per result. */
export interface CheckResult {
  /** The check's folder name under tools/checks/, for example 'index'. */
  name: string;
  /** true only when every rule of the check holds. */
  ok: boolean;
  /** One line for the table, with counts where they help. */
  summary: string;
  /** Lines printed under the table when the check fails (always with --verbose). */
  details: string[];
  /**
   * Ids of docs/guardrails.md section 7 cases with no case file. The index check
   * fills it (docs/adr/0003-index-check-convention.md). `run-all` prints the list
   * under the heading "No automated check yet". An id listed here is never counted
   * as passing: `run-all` fails any result whose list is not empty, even if the
   * check returned `ok: true`.
   */
  noAutomatedCheckYet?: string[];
  /**
   * Ids whose case file exists, but whose test is held out of the green run by
   * the pending wrapper (the field-state and evidence tests until phases 1 and 2).
   * `run-all` prints them as "pending: no automated check yet", never as passing.
   */
  pending?: string[];
  /**
   * Ids with a real case file that runs (the index check fills it). `run-all`
   * and `pnpm check` print the count beside the pending and no-automated-check-yet
   * counts, so a green run never hides how many cases are held out.
   */
  real?: string[];
}

/** The default export of tools/checks/<name>/check.ts. */
export type Check = () => Promise<CheckResult>;

/**
 * The default export of tools/checks/<name>/selftest.ts. It runs the check's own
 * logic against its seeded bad inputs (kept in tools/checks/<name>/seeded/) and
 * returns one result per seeded input. `run-all --self-test` passes a check only
 * when there is at least one result and every result has `ok: false`.
 */
export type SelfTest = () => Promise<CheckResult | CheckResult[]>;
