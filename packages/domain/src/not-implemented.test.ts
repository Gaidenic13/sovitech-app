import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  DOMAIN_FEATURES,
  NotImplementedError,
  PENDING_MARKER_PREFIX,
  declareNotImplemented,
  declaredStubFeatures,
  derive,
  notImplementedFeature,
  parsePendingMarker,
  verifyProposal,
} from './index';

/** What a stub throws. The stubs ignore their arguments, so none are built here. */
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
    const error = thrownBy(derive);
    expect(error).toBeInstanceOf(NotImplementedError);
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof NotImplementedError)) throw new Error('not a NotImplementedError');
    expect(error.name).toBe('NotImplementedError');
    expect(error.feature).toBe('derive');
    expect(error.message).toContain('derive');
    expect(notImplementedFeature(thrownBy(verifyProposal))).toBe('verify-proposal');
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
    expect(() => new NotImplementedError('derive')).toThrow(TypeError);
    expect(() => new NotImplementedError('derive', Symbol('NotImplementedError issue key'))).toThrow(TypeError);
  });
});

describe('notImplementedFeature', () => {
  test('finds the feature on an error a stub threw', () => {
    expect(notImplementedFeature(thrownBy(verifyProposal))).toBe('verify-proposal');
  });

  test('finds the feature through a cause chain, as fast-check reports property failures', () => {
    const inner = thrownBy(derive);
    const wrapped = new Error('Property failed after 1 tests', { cause: new Error('outer', { cause: inner }) });
    expect(notImplementedFeature(wrapped)).toBe('derive');
  });

  test('finds it when fast-check wraps it', () => {
    let caught: unknown;
    try {
      fc.assert(
        fc.property(fc.integer(), () => {
          (derive as unknown as () => never)();
        }),
      );
    } catch (error) {
      caught = error;
    }
    expect(notImplementedFeature(caught)).toBe('derive');
  });

  test('ignores every other error, including look-alikes of the real class', () => {
    const lookalike = new Error('derive is not implemented yet');
    lookalike.name = 'NotImplementedError';
    const shaped = { name: 'NotImplementedError', feature: 'derive' };
    class LookalikeNotImplementedError extends Error {
      override readonly name = 'NotImplementedError';
      readonly feature = 'derive';
    }
    const fromPrototype: unknown = Object.assign(Object.create(NotImplementedError.prototype) as object, {
      feature: 'derive',
      name: 'NotImplementedError',
    });
    expect(fromPrototype).toBeInstanceOf(NotImplementedError);
    for (const other of [
      new TypeError('x is not a function'),
      lookalike,
      shaped,
      new LookalikeNotImplementedError('derive is not implemented yet'),
      fromPrototype,
      new Error('wraps a look-alike', { cause: fromPrototype }),
      'derive',
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
    expect(parsePendingMarker(`${PENDING_MARKER_PREFIX} phase 1 derive\nimport x from 'y';\n`)).toEqual({
      kind: 'marker',
      marker: { phase: 1, features: ['derive'] },
    });
    expect(parsePendingMarker(`${PENDING_MARKER_PREFIX} phase 2 verify-proposal, derive\n`)).toEqual({
      kind: 'marker',
      marker: { phase: 2, features: ['verify-proposal', 'derive'] },
    });
  });

  test('a file without the marker on its first line is not pending', () => {
    expect(parsePendingMarker("import { test } from 'vitest';\n")).toEqual({ kind: 'none' });
    expect(parsePendingMarker(`\n${PENDING_MARKER_PREFIX} phase 1 derive\n`)).toEqual({ kind: 'none' });
    expect(parsePendingMarker('')).toEqual({ kind: 'none' });
  });

  test('a malformed marker is reported, never read as pending', () => {
    const bad = [
      `${PENDING_MARKER_PREFIX} phase 1`,
      `${PENDING_MARKER_PREFIX} phase 9 derive`,
      `${PENDING_MARKER_PREFIX} phase 0 derive`,
      `${PENDING_MARKER_PREFIX} phase one derive`,
      `${PENDING_MARKER_PREFIX} phase 1 derive,verify-proposal`,
      `${PENDING_MARKER_PREFIX} phase 1 derive, derive`,
      `${PENDING_MARKER_PREFIX} phase 1 render`,
      `${PENDING_MARKER_PREFIX} phase 1 derive `,
      `${PENDING_MARKER_PREFIX}phase 1 derive`,
    ];
    for (const line of bad) expect(parsePendingMarker(`${line}\n`).kind, line).toBe('malformed');
  });

  test('accepts CRLF line endings', () => {
    expect(parsePendingMarker(`${PENDING_MARKER_PREFIX} phase 1 derive\r\nrest`)).toEqual({
      kind: 'marker',
      marker: { phase: 1, features: ['derive'] },
    });
  });
});
