/**
 * The property helper for guardrail cases (tests/guardrails/_support/property.ts;
 * phase 0 review, round 1, finding 16): an unbuilt stub reached for some inputs
 * never hides a failed assertion for another, and a stub error is never dropped.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { notImplementedFeature } from '@sovitech/domain';
import { assertAsyncProperty, assertProperty } from '../../../tests/guardrails/_support/property';
import { probeStub } from '../../vitest/stub-probe';

const stub = probeStub();
const needsStub = stub === undefined ? 'no domain stub is unbuilt any more, so there is no stub error to hold back' : false;

/** The messages along an error's cause chain: fast-check reports the predicate's error as the cause. */
function messages(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== undefined && current !== null; depth += 1) {
    parts.push(current instanceof Error ? current.message : String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return parts.join(' <- ');
}

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

async function rejected(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('assertProperty', () => {
  it('passes a property that holds for every input', () => {
    expect(thrown(() => assertProperty([fc.integer({ min: 1, max: 9 })], (value) => value > 0))).toBeUndefined();
  });

  it('fails with the counterexample when a predicate returns false or an assertion fails', () => {
    const falseResult = thrown(() => assertProperty([fc.integer({ min: 0, max: 9 })], (value) => value < 5));
    expect(messages(falseResult)).toMatch(/Property failed/);
    const failedAssertion = thrown(() =>
      assertProperty([fc.integer({ min: 0, max: 9 })], (value) => {
        expect(value).toBeLessThan(5);
      }),
    );
    expect(messages(failedAssertion)).toMatch(/expected \d+ to be less than 5/);
    expect(notImplementedFeature(failedAssertion)).toBeUndefined();
  });

  it('keeps fc.pre working: a precondition is not a failure', () => {
    expect(
      thrown(() =>
        assertProperty([fc.integer({ min: 0, max: 9 }), fc.integer({ min: 0, max: 9 })], (left, right) => {
          fc.pre(left !== right);
          expect(left).not.toBe(right);
        }),
      ),
    ).toBeUndefined();
  });

  it.skipIf(needsStub)('reports a failed assertion even when other inputs reach an unbuilt stub (the fast-check edge)', () => {
    // Odd inputs reach the stub; even inputs above 4 fail an assertion. Without the helper,
    // fast-check may report the stub's error, and the pending wrapper would skip the case.
    const error = thrown(() =>
      assertProperty([fc.integer({ min: 0, max: 40 })], (value) => {
        if (value % 2 === 1) stub?.call();
        expect(value).toBeLessThan(4);
      }),
    );
    expect(notImplementedFeature(error)).toBeUndefined();
    expect(messages(error)).toMatch(/expected \d+ to be less than 4/);
  });

  it.skipIf(needsStub)('rethrows the stub error when every other input passes, so the pending wrapper can hold the case out', () => {
    const error = thrown(() =>
      assertProperty([fc.integer({ min: 0, max: 40 })], (value) => {
        if (value % 2 === 1) stub?.call();
        expect(value).toBeGreaterThanOrEqual(0);
      }),
    );
    expect(notImplementedFeature(error)).toBe(stub?.feature);
  });

  it.skipIf(needsStub)('rethrows the stub error when every input reaches the stub', () => {
    const error = thrown(() => assertProperty([fc.integer()], () => stub?.call()));
    expect(notImplementedFeature(error)).toBe(stub?.feature);
  });

  it('rethrows any other error at once, a TypeError included', () => {
    const error = thrown(() =>
      assertProperty([fc.integer()], () => {
        throw new TypeError('TEST not a stub');
      }),
    );
    expect(messages(error)).toMatch(/TEST not a stub/);
    expect(notImplementedFeature(error)).toBeUndefined();
  });
});

describe('assertAsyncProperty', () => {
  it.skipIf(needsStub)('reports a failed assertion even when other inputs reach an unbuilt stub', async () => {
    const error = await rejected(() =>
      assertAsyncProperty([fc.integer({ min: 0, max: 40 })], async (value) => {
        await Promise.resolve();
        if (value % 2 === 1) stub?.call();
        expect(value).toBeLessThan(4);
      }),
    );
    expect(notImplementedFeature(error)).toBeUndefined();
    expect(messages(error)).toMatch(/expected \d+ to be less than 4/);
  });

  it.skipIf(needsStub)('rethrows the stub error when every other input passes', async () => {
    const error = await rejected(() =>
      assertAsyncProperty([fc.integer({ min: 0, max: 40 })], async (value) => {
        if (value % 2 === 1) stub?.call();
        expect(value).toBeGreaterThanOrEqual(0);
      }),
    );
    expect(notImplementedFeature(error)).toBe(stub?.feature);
  });

  it('passes a property that holds', async () => {
    expect(await rejected(() => assertAsyncProperty([fc.boolean()], async (value) => typeof value === 'boolean'))).toBeUndefined();
  });
});
