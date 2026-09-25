/**
 * The conflict test's arithmetic (docs/guardrails.md rule 4, "Conflict test"):
 * decimals with no binary rounding, so a spread equal to the tolerance is within
 * it and one just over it is not, whatever floating point would say. Every value is TEST data.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  compareDecimals,
  decimalOf,
  multiplyDecimals,
  spreadExceedsTolerance,
  subtractDecimals,
  toleranceOf,
  type FieldDefinition,
} from './index';

const field = (tolerance?: FieldDefinition['tolerance']): FieldDefinition => ({
  key: 'test.building.area',
  label: 'TEST area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
  ...(tolerance === undefined ? {} : { tolerance }),
});

describe('decimals without binary rounding', () => {
  test('read the decimal a number names, not its binary neighbour', () => {
    expect(decimalOf(0.01)).toEqual({ digits: 1n, exponent: -2n });
    expect(decimalOf(12345)).toEqual({ digits: 12345n, exponent: 0n });
    expect(decimalOf(-2.5)).toEqual({ digits: -25n, exponent: -1n });
    expect(decimalOf(1.5e-7)).toEqual({ digits: 15n, exponent: -8n });
    expect(decimalOf(1e21)).toEqual({ digits: 1n, exponent: 21n });
    // 0.1 + 0.2 is not 0.3 in binary; 0.3 reads as 3/10.
    expect(compareDecimals(decimalOf(0.3), { digits: 3n, exponent: -1n })).toBe(0);
  });

  test('refuse NaN and infinities', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => decimalOf(bad)).toThrow(RangeError);
    }
  });

  test('subtract and multiply without rounding, and order like the numbers they name', () => {
    fc.assert(
      // Small enough that the float results of a - b and a * b are integers below 2^53, with no rounding either.
      fc.property(fc.integer({ min: -1e7, max: 1e7 }), fc.integer({ min: -1e7, max: 1e7 }), (a, b) => {
        expect(compareDecimals(subtractDecimals(decimalOf(a), decimalOf(b)), decimalOf(a - b))).toBe(0);
        expect(compareDecimals(decimalOf(a), decimalOf(b))).toBe(a === b ? 0 : a < b ? -1 : 1);
        expect(compareDecimals(multiplyDecimals(decimalOf(a), decimalOf(b)), decimalOf(a * b))).toBe(0);
      }),
    );
  });
});

describe('the tolerance of a field', () => {
  test('no tolerance, or one without a reason or a usable bound, is none: any difference conflicts', () => {
    expect(toleranceOf(field())).toBeNull();
    expect(toleranceOf(field({ relative: 0.01, reason: '' }))).toBeNull();
    expect(toleranceOf(field({ reason: 'TEST: no bound' }))).toBeNull();
    expect(toleranceOf(field({ absolute: -1, reason: 'TEST: a negative bound' }))).toBeNull();
    expect(spreadExceedsTolerance(field(), [100, 100.0001])).toBe(true);
    expect(spreadExceedsTolerance(field({ absolute: Number.NaN, reason: 'TEST' }), [1, 2])).toBe(true);
  });

  test('the larger of the absolute bound and the relative bound times the larger value (rule 4)', () => {
    const both = field({ absolute: 50, relative: 0.001, reason: 'TEST: both bounds' });
    // 0.1% of 12,345 is 12.345; the absolute 50 is larger.
    expect(spreadExceedsTolerance(both, [12345, 12295])).toBe(false);
    expect(spreadExceedsTolerance(both, [12345, 12294])).toBe(true);
    // 0.1% of 100,000 is 100; larger than 50.
    expect(spreadExceedsTolerance(both, [100000, 99900])).toBe(false);
    expect(spreadExceedsTolerance(both, [100000, 99899.9])).toBe(true);
  });

  test('a spread exactly equal to a relative tolerance is within it; one hundredth more is not', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000_000 }), (hundredths) => {
        const largest = hundredths * 100;
        const onePercent = field({ relative: 0.01, reason: 'TEST: 1%' });
        expect(spreadExceedsTolerance(onePercent, [largest, largest - hundredths])).toBe(false);
        expect(spreadExceedsTolerance(onePercent, [largest, largest - hundredths - 0.01])).toBe(true);
      }),
    );
  });
});
