import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  DOMAIN_FEATURES,
  NotImplementedError,
  PENDING_MARKER_PREFIX,
  declareNotImplemented,
  declaredStubFeatures,
  notImplementedFeature,
  parsePendingMarker,
  verifyProposal,
} from './index';

/**
 * What a stub throws. Called with no arguments: verifyProposal's built part
 * (check 1) reads no evidence then, so the call reaches its stub.
 */
function thrownBy(stub: unknown): unknown {
  try {
    (stub as () => unknown)();
  } catch (error) {
    return error;
  }
  throw new Error('the stub did not throw');
}

describe('NotImplementedError', () => {
  test('a stub throws it, naming the feature it stands for', () => {
    const error = thrownBy(verifyProposal);
    expect(error).toBeInstanceOf(NotImplementedError);
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof NotImplementedError)) throw new Error('not a NotImplementedError');
    expect(error.name).toBe('NotImplementedError');
    expect(error.feature).toBe('verify-proposal');
    expect(error.message).toContain('verify-proposal');
  });

  test('phase 1 built derive: it is no longer a stub feature, and no code can declare one for it', () => {
    expect(DOMAIN_FEATURES).not.toContain('derive');
    expect(() => declareNotImplemented('derive' as never)).toThrow(TypeError);
  });

  test('every declared feature is a distinct lower-case name', () => {
    expect(new Set(DOMAIN_FEATURES).size).toBe(DOMAIN_FEATURES.length);
    for (const feature of DOMAIN_FEATURES) expect(feature).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  test('once the package has loaded, every feature has its stub declared, so no other code can declare one', () => {
    expect(declaredStubFeatures()).toEqual([...DOMAIN_FEATURES]);
    for (const feature of DOMAIN_FEATURES) {
      expect(() => declareNotImplemented(feature)).toThrow(/already declared/);
    }
    expect(() => declareNotImplemented('render' as never)).toThrow(TypeError);
  });

  test('code outside the stubs cannot create one: the constructor throws a TypeError', () => {
    expect(() => new NotImplementedError('verify-proposal')).toThrow(TypeError);
    expect(() => new NotImplementedError('verify-proposal', Symbol('NotImplementedError issue key'))).toThrow(TypeError);
  });
});

describe('notImplementedFeature', () => {
  test('finds the feature on an error a stub threw', () => {
    expect(notImplementedFeature(thrownBy(verifyProposal))).toBe('verify-proposal');
  });

  test('finds the feature through a cause chain, as fast-check reports property failures', () => {
    const inner = thrownBy(verifyProposal);
    const wrapped = new Error('Property failed after 1 tests', { cause: new Error('outer', { cause: inner }) });
    expect(notImplementedFeature(wrapped)).toBe('verify-proposal');
  });

  test('finds it when fast-check wraps it', () => {
    let caught: unknown;
    try {
      fc.assert(
        fc.property(fc.integer(), () => {
          (verifyProposal as unknown as () => never)();
        }),
      );
    } catch (error) {
      caught = error;
    }
    expect(notImplementedFeature(caught)).toBe('verify-proposal');
  });

  test('ignores every other error, including look-alikes of the real class', () => {
    const lookalike = new Error('verify-proposal is not implemented yet');
    lookalike.name = 'NotImplementedError';
    const shaped = { name: 'NotImplementedError', feature: 'verify-proposal' };
    class LookalikeNotImplementedError extends Error {
      override readonly name = 'NotImplementedError';
      readonly feature = 'verify-proposal';
    }
    const fromPrototype: unknown = Object.assign(Object.create(NotImplementedError.prototype) as object, {
      feature: 'verify-proposal',
      name: 'NotImplementedError',
    });
    expect(fromPrototype).toBeInstanceOf(NotImplementedError);
    for (const other of [
      new TypeError('x is not a function'),
      lookalike,
      shaped,
      new LookalikeNotImplementedError('verify-proposal is not implemented yet'),
      fromPrototype,
      new Error('wraps a look-alike', { cause: fromPrototype }),
      'verify-proposal',
      undefined,
      null,
    ]) {
      expect(notImplementedFeature(other)).toBeUndefined();
    }
  });

  test('stops on a cause cycle', () => {
    const a = new Error('a');
    const b = new Error('b', { cause: a });
    Object.defineProperty(a, 'cause', { value: b });
    expect(notImplementedFeature(a)).toBeUndefined();
  });
});

describe('parsePendingMarker', () => {
  test('reads the phase and the features from the first line', () => {
    expect(parsePendingMarker(`${PENDING_MARKER_PREFIX} phase 2 verify-proposal\nimport x from 'y';\n`)).toEqual({
      kind: 'marker',
      marker: { phase: 2, features: ['verify-proposal'] },
    });
  });

  test('a marker that names derive, built in phase 1, is malformed', () => {
    expect(parsePendingMarker(`${PENDING_MARKER_PREFIX} phase 1 derive\n`).kind).toBe('malformed');
    expect(parsePendingMarker(`${PENDING_MARKER_PREFIX} phase 2 verify-proposal, derive\n`).kind).toBe('malformed');
  });

  test('a file without the marker on its first line is not pending', () => {
    expect(parsePendingMarker("import { test } from 'vitest';\n")).toEqual({ kind: 'none' });
    expect(parsePendingMarker(`\n${PENDING_MARKER_PREFIX} phase 2 verify-proposal\n`)).toEqual({ kind: 'none' });
    expect(parsePendingMarker('')).toEqual({ kind: 'none' });
  });

  test('a malformed marker is reported, never read as pending', () => {
    const bad = [
      `${PENDING_MARKER_PREFIX} phase 2`,
      `${PENDING_MARKER_PREFIX} phase 9 verify-proposal`,
      `${PENDING_MARKER_PREFIX} phase 0 verify-proposal`,
      `${PENDING_MARKER_PREFIX} phase two verify-proposal`,
      `${PENDING_MARKER_PREFIX} phase 2 verify-proposal,verify-proposal`,
      `${PENDING_MARKER_PREFIX} phase 2 verify-proposal, verify-proposal`,
      `${PENDING_MARKER_PREFIX} phase 2 render`,
      `${PENDING_MARKER_PREFIX} phase 2 verify-proposal `,
      `${PENDING_MARKER_PREFIX}phase 2 verify-proposal`,
    ];
    for (const line of bad) expect(parsePendingMarker(`${line}\n`).kind, line).toBe('malformed');
  });

  test('accepts CRLF line endings', () => {
    expect(parsePendingMarker(`${PENDING_MARKER_PREFIX} phase 2 verify-proposal\r\nrest`)).toEqual({
      kind: 'marker',
      marker: { phase: 2, features: ['verify-proposal'] },
    });
  });
});
