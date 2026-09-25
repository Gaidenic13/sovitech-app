/**
 * The counts `pnpm check` prints come from the case files and the run together
 * (run-counts.ts; phase 0 review, round 2: "the 'real' count is static"): a case
 * file that reads as real but did not run and pass as one is not counted real.
 */
import { describe, expect, it } from 'vitest';
import type { GuardReport } from '../../vitest/guardrail-run-guard';
import type { GuardrailIndex, IndexedCase } from './guardrail-index';
import type { IndexReport } from './index-check';
import { runCaseCounts } from './run-counts';

const indexed = (id: string, type: 'T' | 'E'): IndexedCase => ({ id, type, situation: 'TEST', expected: 'TEST', line: 1 });

const index: GuardrailIndex = {
  source: 'docs/guardrails.md',
  version: '1.5',
  versionDate: '2026-09-24',
  cases: [indexed('G2-1', 'T'), indexed('G2-8', 'T'), indexed('G4-1', 'T'), indexed('G1-1', 'T'), indexed('G1-11', 'E')],
  byId: new Map([
    ['G2-1', indexed('G2-1', 'T')],
    ['G2-8', indexed('G2-8', 'T')],
    ['G4-1', indexed('G4-1', 'T')],
    ['G1-1', indexed('G1-1', 'T')],
    ['G1-11', indexed('G1-11', 'E')],
  ]),
  problems: [],
};

const report: IndexReport = {
  index,
  present: ['G2-1', 'G2-8'],
  pending: ['G4-1'],
  stubs: [],
  malformed: [],
  missing: ['G1-1', 'G1-11'],
  problems: [],
};

const guard = (overrides: Partial<GuardReport> = {}): GuardReport => ({
  problems: [],
  real: ['G2-1', 'G2-8'],
  pending: ['G4-1'],
  heldOut: [],
  notCounted: [],
  failed: [],
  failureMessages: {},
  counts: { files: 3, passed: 2, failed: 0, pendingSkips: 1 },
  ...overrides,
});

describe('run counts: pnpm check counts a case real only when the run passed it', () => {
  it('counts the static-real ids the run passed', () => {
    expect(runCaseCounts(report, guard())).toEqual({
      counts: { real: 2, pending: 1, noAutomatedCheckYet: 2 },
      real: ['G2-1', 'G2-8'],
      problems: [],
    });
  });

  it('moves a static-real id the run did not pass to "no automated check yet", with a [run] problem', () => {
    const outcome = runCaseCounts(report, guard({ real: ['G2-1'], failed: ['G2-8'] }));
    expect(outcome.counts).toEqual({ real: 1, pending: 1, noAutomatedCheckYet: 3 });
    expect(outcome.problems).toEqual(['[run] G2-8 reads as a real case in its file, but the run did not pass it as one: it failed']);
  });

  it('counts nothing real when the run wrote no report', () => {
    const outcome = runCaseCounts(report, undefined);
    expect(outcome.counts).toEqual({ real: 0, pending: 1, noAutomatedCheckYet: 4 });
    expect(outcome.problems).toHaveLength(1);
    expect(outcome.problems[0]).toContain('wrote no run guard report');
  });

  it('counts nothing real when the guardrails project did not run', () => {
    const outcome = runCaseCounts(report, guard({ real: [], pending: [], counts: { files: 0, passed: 0, failed: 0, pendingSkips: 0 } }));
    expect(outcome.counts.real).toBe(0);
    expect(outcome.problems[0]).toBe('[run] the run guard saw no guardrail case file: the guardrails project did not run');
  });
});
