/**
 * G9-12 (proposed for docs/guardrails.md section 7 in phase 5; rule 9 "Ranges come from the method": "An estimate's
 * range comes from its method ... It must satisfy low < value < high"; "The engine. It requires method and range").
 * Situation: a formula body answers an estimate whose value is not strictly inside its range, or whose bounds are equal.
 * Expected: refused; no candidate is created.
 *
 * Engine case (the engine builder): a TEST body (written here, test runner only) answers estimates of every shape;
 * every one outside low < value < high is refused with no candidate, the refusal recorded for the API's guardrail
 * event, and the output reads "Not available yet", naming the method; every one inside is a candidate with its range.
 * Beside the case (rule 9 "Ranges round outward"; the formatting module's half, reached through the view-model): the
 * displayed range of any engine estimate holds the exact range it was produced with.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { exact, interval, point, runEngine, type BodyOutput, type FormulaCatalogue } from '@sovitech/engine';
import { rangeSignificantFigures, roundRangeOutward } from '@sovitech/view-model/server';
import { testFieldEntry } from '../../packages/engine/test-formulas/fields';
import { testEngineInput } from '../../packages/engine/test-formulas/inputs';

const PROJECT = 'test-project-g9-12';
const output = testFieldEntry('project.TEST_g912Estimate', { kind: 'quantity', subject: 'project', unit: 'EUR', estimation: 'allowed' });
const input = testFieldEntry('project.TEST_g912Input', { kind: 'enum', subject: 'project', options: ['TEST_a', 'TEST_b'] });

/** A TEST catalogue whose one body answers `answer` (inside the test runner only). */
function answering(answer: BodyOutput): FormulaCatalogue {
  return {
    kind: 'test',
    formulas: [
      {
        signature: { id: 'TEST-g912Estimate', version: '1.0.0', inputs: [input.key], outputs: ['TEST.g912'], unknownPolicy: 'range_over_options', estimated: true },
        requires: [],
        outputFields: { 'TEST.g912': output.key },
        body: () => ({ 'TEST.g912': answer }),
      },
    ],
  };
}

let ids = 0;
function run(answer: BodyOutput) {
  const engineInput = testEngineInput({
    projectId: PROJECT,
    entries: [{ definition: input, subjectId: PROJECT, candidates: [] }],
    subjects: { project: PROJECT },
    fieldDefinition: (key) => (key === output.key ? output : key === input.key ? input : undefined),
  });
  return runEngine(answering(answer), engineInput, { newId: () => `test-cand-g9-12-out-${String((ids += 1))}`, at: '2026-10-05T09:00:00Z' });
}

const estimateOf = (value: number, low: number, high: number): BodyOutput => ({
  kind: 'estimate',
  value: point(exact(value)),
  range: interval(exact(Math.min(low, high)), exact(Math.max(low, high))),
  unit: 'EUR',
  assumptions: [],
});

describe('G9-12 · an estimate not strictly inside its range, or with equal bounds, is refused; no candidate is created', () => {
  test('G9-12 · a value on a bound, outside the range, or a range with equal bounds: each refused, the refusal recorded', () => {
    for (const [value, low, high] of [
      [100, 100, 200],
      [200, 100, 200],
      [250, 100, 200],
      [50, 100, 200],
      [100, 100, 100],
    ] as const) {
      const result = run(estimateOf(value, low, high));
      expect(result.outputs, `${String(value)} in ${String(low)}..${String(high)}`).toEqual([
        { kind: 'not_available', output: 'TEST.g912', formula: 'TEST-g912Estimate@1.0.0', missing: [{ kind: 'method', name: 'TEST-g912Estimate' }] },
      ]);
      expect(result.refusals.map((refusal) => refusal.reason)).toEqual(['estimate_not_inside_range']);
    }
  });

  test('G9-12 · whatever the answer, a candidate exists only when low < value < high, and then carries that range', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: -1000, max: 1000 }), (value, a, b) => {
        const low = Math.min(a, b);
        const high = Math.max(a, b);
        const [result] = run(estimateOf(value, low, high)).outputs;
        if (low < value && value < high) {
          expect(result?.kind).toBe('figure');
          if (result?.kind === 'figure') expect(result.candidate.range).toEqual({ low, high });
        } else {
          expect(result?.kind).toBe('not_available');
        }
      }),
      { numRuns: 300 },
    );
  });

  test('G9-12 (beside the case) · rule 9 "Ranges round outward": the displayed range of an engine estimate holds its exact range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000_000 }), fc.integer({ min: 1, max: 10_000_000 }), fc.integer({ min: 0, max: 4 }), (a, b, decimals) => {
        fc.pre(a !== b);
        const scale = exact([1, 0.1, 0.01, 0.001, 0.0001][decimals] ?? Number.NaN);
        const low = exact(Math.min(a, b)).times(scale);
        const high = exact(Math.max(a, b)).times(scale);
        const value = low.plus(high).times(exact(0.5));
        const [result] = run({ kind: 'estimate', value: point(value), range: interval(low, high), unit: 'EUR', assumptions: [] }).outputs;
        if (result?.kind !== 'figure' || result.candidate.range === undefined) throw new Error('no figure');
        const stored = result.candidate.range;
        const shown = roundRangeOutward(stored, rangeSignificantFigures(stored));
        expect(exact(stored.low).greaterThanOrEqualTo(shown.low)).toBe(true);
        expect(exact(stored.high).lessThanOrEqualTo(shown.high)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
