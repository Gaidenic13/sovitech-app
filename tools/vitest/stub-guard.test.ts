/**
 * The stub guard's pieces (stub-guard.ts) and the domain's count of stub errors
 * (stubErrorCounts in @sovitech/domain). The end-to-end proof is the seeded run
 * (seeded/run/, G2-11 to G2-14), in guardrail-run-guard.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { stubErrorCounts, verifyProposal } from '@sovitech/domain';
import { addTallies, countsSince, isStubGuardRecord, stubGuardProblem, tallyTotal } from './stub-guard';

describe('the domain counts every error its stubs throw', () => {
  it('raises the count of the stub that threw, caught or not, and hands out copies only', () => {
    // verify-proposal is the stub left after phase 1 built derive (ADR 0004).
    const before = stubErrorCounts();
    expect(() => (verifyProposal as unknown as () => unknown)()).toThrow(/verify-proposal is not implemented/);
    let caught = false;
    try {
      (verifyProposal as unknown as () => unknown)();
    } catch {
      caught = true;
    }
    expect(caught).toBe(true);
    const after = stubErrorCounts();
    expect(countsSince(before, after)).toEqual({ 'verify-proposal': 2 });
    expect(Object.isFrozen(after)).toBe(true);
    expect(() => {
      (after as Record<string, number>)['verify-proposal'] = 0;
    }).toThrow(TypeError);
    expect(stubErrorCounts()['verify-proposal']).toBe(after['verify-proposal']);
  });
});

describe('the stub guard verdict', () => {
  it('passes a test that reached no stub', () => {
    expect(stubGuardProblem({ inTest: {}, outsideTests: {} }, false)).toBeUndefined();
  });

  it('fails a test that reached a stub, during the test or outside any test, unless the pending wrapper held it out', () => {
    const during = stubGuardProblem({ inTest: { 'verify-proposal': 1 }, outsideTests: {} }, false);
    expect(during).toContain('[stub] case exercises an unbuilt stub');
    expect(during).toContain('during the test: verify-proposal (1×)');
    const outside = stubGuardProblem({ inTest: {}, outsideTests: { 'verify-proposal': 2 } }, false);
    expect(outside).toContain('outside any test of this file');
    expect(outside).toContain('verify-proposal (2×)');
    expect(stubGuardProblem({ inTest: { 'verify-proposal': 1 }, outsideTests: {} }, true)).toBeUndefined();
  });

  it('adds and totals tallies, and reads only well-formed records', () => {
    expect(addTallies({ 'verify-proposal': 1 }, { 'verify-proposal': 2 })).toEqual({ 'verify-proposal': 3 });
    expect(tallyTotal({ 'verify-proposal': 3 })).toBe(3);
    expect(isStubGuardRecord({ inTest: {}, outsideTests: { 'verify-proposal': 1 } })).toBe(true);
    // derive is built (phase 1), so a tally naming it is no stub guard record.
    for (const value of [undefined, {}, { inTest: {} }, { inTest: { render: 1 }, outsideTests: {} }, { inTest: { derive: 1 }, outsideTests: {} }, { inTest: { 'verify-proposal': 0 }, outsideTests: {} }]) {
      expect(isStubGuardRecord(value), JSON.stringify(value)).toBe(false);
    }
  });
});
