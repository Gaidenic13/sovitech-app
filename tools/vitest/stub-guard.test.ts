/**
 * The stub guard's pieces (stub-guard.ts) and the domain's count of stub errors
 * (stubErrorCounts in @sovitech/domain). The end-to-end proof is the seeded run
 * (seeded/run/, G2-11 to G2-14), in guardrail-run-guard.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { derive, stubErrorCounts, verifyProposal } from '@sovitech/domain';
import { addTallies, countsSince, isStubGuardRecord, stubGuardProblem, tallyTotal } from './stub-guard';

describe('the domain counts every error its stubs throw', () => {
  it('raises the count of the stub that threw, caught or not, and hands out copies only', () => {
    const before = stubErrorCounts();
    expect(() => (derive as unknown as () => unknown)()).toThrow(/derive is not implemented/);
    expect(() => (verifyProposal as unknown as () => unknown)()).toThrow(/verify-proposal is not implemented/);
    expect(() => (derive as unknown as () => unknown)()).toThrow(/derive is not implemented/);
    const after = stubErrorCounts();
    expect(countsSince(before, after)).toEqual({ derive: 2, 'verify-proposal': 1 });
    expect(Object.isFrozen(after)).toBe(true);
    expect(() => {
      (after as Record<string, number>)['derive'] = 0;
    }).toThrow(TypeError);
    expect(stubErrorCounts().derive).toBe(after.derive);
  });
});

describe('the stub guard verdict', () => {
  it('passes a test that reached no stub', () => {
    expect(stubGuardProblem({ inTest: {}, outsideTests: {} }, false)).toBeUndefined();
  });

  it('fails a test that reached a stub, during the test or outside any test, unless the pending wrapper held it out', () => {
    const during = stubGuardProblem({ inTest: { derive: 1 }, outsideTests: {} }, false);
    expect(during).toContain('[stub] case exercises an unbuilt stub');
    expect(during).toContain('during the test: derive (1×)');
    const outside = stubGuardProblem({ inTest: {}, outsideTests: { 'verify-proposal': 2 } }, false);
    expect(outside).toContain('outside any test of this file');
    expect(outside).toContain('verify-proposal (2×)');
    expect(stubGuardProblem({ inTest: { derive: 1 }, outsideTests: {} }, true)).toBeUndefined();
  });

  it('adds and totals tallies, and reads only well-formed records', () => {
    expect(addTallies({ derive: 1 }, { derive: 2, 'verify-proposal': 1 })).toEqual({ derive: 3, 'verify-proposal': 1 });
    expect(tallyTotal({ derive: 3, 'verify-proposal': 1 })).toBe(4);
    expect(isStubGuardRecord({ inTest: {}, outsideTests: { derive: 1 } })).toBe(true);
    for (const value of [undefined, {}, { inTest: {} }, { inTest: { render: 1 }, outsideTests: {} }, { inTest: { derive: 0 }, outsideTests: {} }]) {
      expect(isStubGuardRecord(value), JSON.stringify(value)).toBe(false);
    }
  });
});
