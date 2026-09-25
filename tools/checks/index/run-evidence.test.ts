/**
 * Reconciling the static reading with the run (run-evidence.ts): a code-test id
 * counts as real only when its file reads as real and the run passed it as real
 * (phase 0 review, round 2: "the 'real' count is static").
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GuardReport } from '../../vitest/guardrail-run-guard';
import { readGuardReport, reconcileWithRun } from './run-evidence';

const typeOf = (id: string): 'T' | 'E' | undefined => (id.startsWith('G1-1') || id === 'G2-1' ? 'E' : 'T');

const guard = (overrides: Partial<GuardReport> = {}): GuardReport => ({
  problems: [],
  real: ['G2-8'],
  pending: ['G4-1'],
  heldOut: [],
  notCounted: [],
  failed: [],
  failureMessages: {},
  counts: { files: 2, passed: 1, failed: 0, pendingSkips: 1 },
  ...overrides,
});

describe('run evidence', () => {
  it('keeps a static-real id the run passed as real, and every static-real eval', () => {
    expect(reconcileWithRun({ present: ['G2-8', 'G2-1'], pending: ['G4-1'] }, guard(), typeOf)).toEqual({
      real: ['G2-8', 'G2-1'],
      problems: [],
    });
  });

  it('refuses a static-real id the run failed, held out, did not count or did not collect', () => {
    const cases: Array<[Partial<GuardReport>, string]> = [
      [{ real: [], failed: ['G2-8'] }, 'it failed'],
      [{ real: [], heldOut: ['G2-8'] }, 'a test was held out other than by the pending wrapper'],
      [{ real: [], notCounted: ['G2-8'] }, 'the run guard did not count it (see its problems)'],
      [{ real: [] }, 'the run did not collect it'],
    ];
    for (const [overrides, reason] of cases) {
      const outcome = reconcileWithRun({ present: ['G2-8'], pending: [] }, guard(overrides), typeOf);
      expect(outcome.real).toEqual([]);
      expect(outcome.problems).toEqual([`[run] G2-8 reads as a real case in its file, but the run did not pass it as one: ${reason}`]);
    }
  });

  it('refuses a run with no report, and a run that saw no guardrail case file', () => {
    expect(reconcileWithRun({ present: ['G2-8'], pending: [] }, undefined, typeOf).problems[0]).toContain('wrote no run guard report');
    const empty = guard({ real: [], pending: [], counts: { files: 0, passed: 0, failed: 0, pendingSkips: 0 } });
    expect(reconcileWithRun({ present: [], pending: [] }, empty, typeOf).problems).toEqual([
      '[run] the run guard saw no guardrail case file: the guardrails project did not run',
    ]);
  });

  it('refuses a case the file holds out that ran as real', () => {
    const outcome = reconcileWithRun({ present: [], pending: ['G4-1'] }, guard({ real: ['G4-1'], pending: [] }), typeOf);
    expect(outcome.problems).toEqual(['[run] G4-1 is held out by the pending wrapper in its file, but ran as a real case']);
  });

  it('reads a report file, and nothing from a missing or malformed one', () => {
    const scratch = mkdtempSync(join(tmpdir(), 'sovitech-run-evidence-'));
    try {
      const path = join(scratch, 'report.json');
      expect(readGuardReport(path)).toBeUndefined();
      writeFileSync(path, 'TEST');
      expect(readGuardReport(path)).toBeUndefined();
      writeFileSync(path, JSON.stringify(guard()));
      expect(readGuardReport(path)?.real).toEqual(['G2-8']);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
