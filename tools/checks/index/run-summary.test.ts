/**
 * The summaries of `pnpm checks` (tools/checks/runner.ts) and `pnpm check`
 * (tools/check.ts) print the guardrail case counts, and a green run is labelled
 * "passed with N pending (no automated check yet)" while any case is held out
 * (phase 0 review, finding "The pending list never affects ok, and the `pnpm
 * check` summary prints only PASS or FAIL per step"). Kept beside the index
 * check, whose lists the counts come from.
 */
import { describe, expect, it } from 'vitest';
import { EXPECTED_CHECKS, caseCounts, formatCaseCounts, formatReport, passedLabel, runOne } from '../runner';

describe('run summary: the guardrail case counts', () => {
  it('counts real, pending and no-automated-check-yet ids across rows', () => {
    const counts = caseCounts([
      { real: ['G2-1', 'G2-8'], pending: ['G1-4', 'G4-2'], noAutomatedCheckYet: ['G1-1'] },
      { pending: [], noAutomatedCheckYet: [] },
    ]);
    expect(counts).toEqual({ real: 2, pending: 2, noAutomatedCheckYet: 1 });
    expect(formatCaseCounts({ real: 2, pending: 13, noAutomatedCheckYet: 89 })).toBe(
      'Guardrail cases (docs/guardrails.md section 7): 2 real, 13 pending (no automated check yet), ' +
        '89 no automated check yet (no case file, or only a stub or a malformed one).',
    );
  });

  it('has no counts when no row reports cases', () => {
    expect(caseCounts([{ pending: [], noAutomatedCheckYet: [] }])).toBeUndefined();
  });

  it('labels a green run with its pending cases, never as a plain pass', () => {
    expect(passedLabel('All 9 steps', { real: 15, pending: 13, noAutomatedCheckYet: 0 })).toBe(
      'All 9 steps passed with 13 pending (no automated check yet).',
    );
    expect(passedLabel('All 9 steps', { real: 104, pending: 0, noAutomatedCheckYet: 0 })).toBe('All 9 steps passed.');
    expect(passedLabel('All 9 steps', undefined)).toBe('All 9 steps passed.');
    expect(passedLabel('All 9 steps', { real: 1, pending: 2, noAutomatedCheckYet: 3 })).toBe(
      'All 9 steps passed with 2 pending and 3 with no case file that runs (no automated check yet).',
    );
  });

  it('prints the counts and the pending label in the run-all report', async () => {
    const row = await runOne('index', async () => ({
      name: 'index',
      ok: true,
      summary: 'every id has a case file',
      details: [],
      real: ['G2-1'],
      pending: ['G1-4', 'G4-2'],
      noAutomatedCheckYet: [],
    }));
    expect(row.ok).toBe(true);
    expect(row.real).toEqual(['G2-1']);
    const report = formatReport([row], { verbose: false, title: 'Checks' });
    expect(report).toContain('Guardrail cases (docs/guardrails.md section 7): 1 real, 2 pending');
    expect(report.trimEnd().endsWith('All 1 passed with 2 pending (no automated check yet).')).toBe(true);
    const failing = formatReport([{ ...row, ok: false }], { verbose: false, title: 'Checks' });
    expect(failing.trimEnd().endsWith('1 of 1 failed.')).toBe(true);
  });

  it('refuses a malformed real list', async () => {
    const row = await runOne('index', async () => ({ name: 'index', ok: true, summary: 's', details: [], real: 'G2-1' }));
    expect(row.ok).toBe(false);
    expect(row.summary).toBe('the check returned a malformed result');
  });
});

describe('run summary: the expected checks', () => {
  it('names every check phase 0 requires, the figure and scan-root checks included, so a missing folder fails run-all', () => {
    expect(EXPECTED_CHECKS).toEqual([
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
    ]);
  });
});
