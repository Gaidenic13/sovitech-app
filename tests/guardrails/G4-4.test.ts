/**
 * G4-4 (docs/guardrails.md section 7; 2.5 "Counting": "Points are derived per motor or drive and per configuration.
 * '1+1R' is two pumps. A twin-head pump is one asset with two motors"; rule 4 "Same-tag appearances are one asset").
 * Situation: schedule line "P1 pompă circulație 1+1R".
 * Expected: one pump group of two pumps. Points derived for both motors.
 *
 * Engine half (this file; the engine builder; moved here from phase 2, where the reading of the line is the
 * extractor's and the verifier's): the pump group is one asset (one subject, tag P1) whose configuration the schedule
 * line gives as duty and standby; `TEST-pumpPoints@1.0.0` (a TEST method over TEST points per motor) derives its points
 * for both motors, exactly twice a single pump's, and the same as a twin-head pump's.
 */
import { describe, expect, test } from 'vitest';
import { exact, interval, multiply, point, runEngine, type EngineCandidate } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { TEST_FIELDS } from '../../packages/engine/test-formulas/fields';
import { testEngineInput } from '../../packages/engine/test-formulas/inputs';
import { documentReading, testDocument } from './_support/builders';

const PROJECT = 'test-project-g4-4';
const P1 = 'test-asset-g4-4-p1';
const schedule = testDocument('test-doc-g4-4', PROJECT, 'technical_design');

let ids = 0;
function pointsFor(configuration: string): EngineCandidate {
  const reading = {
    ...documentReading({ id: `test-cand-g4-4-${configuration}`, subjectId: P1, field: TEST_FIELDS.pumpConfiguration, document: schedule, value: { choice: configuration }, minute: 1 }),
    original: { text: 'P1 pompă circulație 1+1R', locale: 'ro' },
  };
  const input = testEngineInput({ projectId: PROJECT, entries: [{ definition: TEST_FIELDS.pumpConfiguration, subjectId: P1, candidates: [reading] }], subjects: { asset: P1 } });
  const run = runEngine(testCatalogue({ mirrored: false, extra: ['TEST-pumpPoints'] }), input, { newId: () => `test-cand-g4-4-out-${String((ids += 1))}`, at: '2026-10-05T09:00:00Z' });
  const [output] = run.outputs;
  if (output?.kind !== 'figure') throw new Error(`no TEST pump points: ${JSON.stringify(output)}`);
  return output.candidate;
}

describe('G4-4 · "P1 pompă circulație 1+1R": one pump group of two pumps, points for both motors', () => {
  test('G4-4 · the group is one asset, and its points are derived for both motors', () => {
    const points = pointsFor('duty_standby');
    expect(points.subjectId).toBe(P1);
    expect(points.source).toBe('estimated');
    expect(points.quantity).toMatchObject({ unit: 'count', qualifier: 'hardware_io' });
    // TEST points per motor: 9018 to 9019; two motors.
    const both = multiply(point(exact(2)), interval(exact(9018), exact(9019)));
    expect(points.range).toEqual({ low: both.low.toNumber(), high: both.high.toNumber() });
  });

  test('G4-4 · exactly twice a single pump, and the same as a twin-head pump (one asset, two motors)', () => {
    const single = pointsFor('single');
    const pair = pointsFor('duty_standby');
    const twin = pointsFor('twin_head');
    expect(pair.range?.low).toBe((single.range?.low ?? Number.NaN) * 2);
    expect(pair.range?.high).toBe((single.range?.high ?? Number.NaN) * 2);
    expect(twin.range).toEqual(pair.range);
  });
});
