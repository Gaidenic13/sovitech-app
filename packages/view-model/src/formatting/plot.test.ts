/**
 * Unit and property tests of `plotPositions` (phase 6; ./plot.ts; docs/adr/0052 decisions 4 and 5): positions in
 * thousandths of the plot on an axis generated from the series (R-103 AC3), ranges never narrowed (rule 9, "Ranges round
 * outward"), a gap with no position (rule 1, "A chart shows an unknown as a labelled gap"; G1-5), zero where the axis
 * holds it (a breakdown's bars start at zero; a sequence crossing zero: G9-9), and refusals (an estimate outside its
 * range, a value that is no finite number, a series of gaps only).
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { plotPositions, type PlotInput } from './plot';

describe('ADR 0052 decision 4 · plotPositions', () => {
  test('ADR 0052 · a breakdown of positive amounts: the axis runs from zero to the highest bound; each range drawn outward', () => {
    const positions = plotPositions('breakdown', [
      { kind: 'estimate', value: 9001.5, low: 9001, high: 9002 },
      { kind: 'gap' },
      { kind: 'estimate', value: 18004, low: 18003, high: 18005 },
    ]);
    expect(positions.zero).toBe(0);
    expect(positions.points[1]).toBeNull();
    // 9001 / 18005 = 0.49992 → 499 (down); 9002 / 18005 = 0.49997 → 500 (up); the mark 9001.5 → 500 (nearest).
    expect(positions.points[0]).toEqual({ low: 499, high: 500, mark: 500 });
    expect(positions.points[2]).toEqual({ low: 999, high: 1000, mark: 1000 });
  });

  test('ADR 0052 · G9-9 · a sequence crossing zero: the axis spans its values, zero sits inside it; an exact value has no mark', () => {
    const positions = plotPositions('sequence', [
      { kind: 'estimate', value: -300, low: -400, high: -200 },
      { kind: 'value', value: 100 },
      { kind: 'estimate', value: 500, low: 400, high: 600 },
    ]);
    expect(positions.zero).toBe(400);
    expect(positions.points[0]).toEqual({ low: 0, high: 200, mark: 100 });
    expect(positions.points[1]).toEqual({ low: 500, high: 500, mark: null });
    expect(positions.points[2]).toEqual({ low: 800, high: 1000, mark: 900 });
  });

  test('ADR 0052 · a sequence of one sign does not start at zero; a breakdown of negative amounts ends at zero', () => {
    expect(plotPositions('sequence', [{ kind: 'value', value: 10 }, { kind: 'value', value: 20 }])).toEqual({ points: [{ low: 0, high: 0, mark: null }, { low: 1000, high: 1000, mark: null }], zero: null });
    expect(plotPositions('breakdown', [{ kind: 'value', value: -10 }, { kind: 'value', value: -20 }])).toEqual({ points: [{ low: 500, high: 500, mark: null }, { low: 0, high: 0, mark: null }], zero: 1000 });
  });

  test('ADR 0052 · rule 9 · A-5 (phase 6 part B) · refused: an estimate whose shown range has no width or leaves its value out, a value that is no finite number, a series of gaps only, nothing; a shown value on its rounded bound is drawn', () => {
    expect(() => plotPositions('sequence', [{ kind: 'estimate', value: 9, low: 10, high: 20 }])).toThrow(RangeError);
    expect(() => plotPositions('sequence', [{ kind: 'estimate', value: 10, low: 10, high: 10 }])).toThrow(RangeError);
    // Rounded as the label shows it ("about -1,200 (-1,300 to -1,200)"), the central value may sit on a bound.
    expect(plotPositions('sequence', [{ kind: 'estimate', value: -1200, low: -1300, high: -1200 }, { kind: 'value', value: -1100 }]).points[0]).toEqual({ low: 0, high: 500, mark: 500 });
    expect(() => plotPositions('sequence', [{ kind: 'value', value: Number.NaN }])).toThrow(RangeError);
    expect(() => plotPositions('sequence', [{ kind: 'value', value: Number.POSITIVE_INFINITY }])).toThrow(RangeError);
    expect(() => plotPositions('breakdown', [{ kind: 'gap' }, { kind: 'gap' }])).toThrow(RangeError);
    expect(() => plotPositions('breakdown', [])).toThrow(RangeError);
  });

  test('ADR 0052 · rule 9 · property: every position is a whole thousandth, a range is never narrowed, its mark inside it, and a gap stays a gap', () => {
    const value = fc.integer({ min: -1_000_000, max: 1_000_000 });
    const entry: fc.Arbitrary<PlotInput> = fc.oneof(
      value.map((v): PlotInput => ({ kind: 'value', value: v })),
      fc.tuple(value, fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 })).map(([v, below, above]): PlotInput => ({ kind: 'estimate', value: v, low: v - below, high: v + above })),
      fc.constant<PlotInput>({ kind: 'gap' }),
    );
    fc.assert(
      fc.property(fc.constantFrom('breakdown' as const, 'sequence' as const), fc.array(entry, { minLength: 1, maxLength: 12 }), (kind, inputs) => {
        fc.pre(inputs.some((input) => input.kind !== 'gap'));
        const bounds = inputs.flatMap((input) => (input.kind === 'gap' ? [] : input.kind === 'value' ? [input.value] : [input.low, input.high]));
        const lowest = Math.min(...bounds, ...(kind === 'breakdown' ? [0] : []));
        const highest = Math.max(...bounds, ...(kind === 'breakdown' ? [0] : []));
        const { points, zero } = plotPositions(kind, inputs);
        expect(points).toHaveLength(inputs.length);
        inputs.forEach((input, index) => {
          const position = points[index];
          if (input.kind === 'gap') {
            expect(position).toBeNull();
            return;
          }
          if (position === null || position === undefined) throw new Error('a figure has a position');
          for (const at of [position.low, position.high, ...(position.mark === null ? [] : [position.mark])]) {
            expect(Number.isInteger(at)).toBe(true);
            expect(at).toBeGreaterThanOrEqual(0);
            expect(at).toBeLessThanOrEqual(1000);
          }
          if (highest === lowest) return;
          const scale = (x: number): number => ((x - lowest) / (highest - lowest)) * 1000;
          const low = input.kind === 'value' ? input.value : input.low;
          const high = input.kind === 'value' ? input.value : input.high;
          if (input.kind === 'estimate') {
            // Never narrowed: the drawn range holds the stored one (outward to the thousandth).
            expect(position.low).toBeLessThanOrEqual(scale(low) + 1e-9);
            expect(position.high).toBeGreaterThanOrEqual(scale(high) - 1e-9);
            expect(position.mark).not.toBeNull();
            expect(position.mark ?? -1).toBeGreaterThanOrEqual(position.low);
            expect(position.mark ?? 2000).toBeLessThanOrEqual(position.high);
          } else {
            expect(position.mark).toBeNull();
            expect(position.low).toBe(position.high);
            expect(Math.abs(position.low - scale(input.value))).toBeLessThanOrEqual(0.5 + 1e-9);
          }
        });
        if (lowest <= 0 && highest >= 0 && highest > lowest) expect(zero).not.toBeNull();
        else expect(zero).toBeNull();
      }),
    );
  });
});
