/**
 * G8-8 (docs/guardrails.md section 7; rule 8 "Energy data": "Meters form a hierarchy. A sub-meter is never added to its
 * parent. When the hierarchy is unknown, only utility meters are summed"; F-CALC-07).
 * Situation: a utility meter plus a BMS sub-meter export.
 * Expected: the sub-meter is not added.
 *
 * Engine case (the engine builder; moved here from phase 1: totals are the engine's), with
 * `TEST-siteConsumption@1.0.0`, a calculated total that reads both meters and adds only the utility meter.
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { runEngine } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { TEST_FIELDS } from '../../packages/engine/test-formulas/fields';
import { testEngineInput } from '../../packages/engine/test-formulas/inputs';
import { documentReading, testDocument } from './_support/builders';

const PROJECT = 'test-project-g8-8';
const UTILITY = 'test-meter-g8-8-utility';
const SUB = 'test-meter-g8-8-sub';
const bill = testDocument('test-doc-g8-8-bill', PROJECT, 'bill');
const bmsExport = testDocument('test-doc-g8-8-bms', PROJECT, 'unknown');

let ids = 0;
function site(utility: number, sub: number) {
  const input = testEngineInput({
    projectId: PROJECT,
    entries: [
      {
        definition: TEST_FIELDS.utilityMeterTotal,
        subjectId: UTILITY,
        candidates: [documentReading({ id: 'test-cand-g8-8-utility', subjectId: UTILITY, field: TEST_FIELDS.utilityMeterTotal, document: bill, value: { quantity: { value: utility, unit: 'kWh' } }, minute: 1 })],
      },
      {
        definition: TEST_FIELDS.subMeterTotal,
        subjectId: SUB,
        candidates: [documentReading({ id: 'test-cand-g8-8-sub', subjectId: SUB, field: TEST_FIELDS.subMeterTotal, document: bmsExport, value: { quantity: { value: sub, unit: 'kWh' } }, minute: 1 })],
      },
    ],
    subjects: { project: PROJECT },
  });
  const [output] = runEngine(testCatalogue({ mirrored: false, extra: ['TEST-siteConsumption'] }), input, { newId: () => `test-cand-g8-8-out-${String((ids += 1))}`, at: '2026-10-05T09:00:00Z' }).outputs;
  if (output?.kind !== 'figure') throw new Error(`no TEST site total: ${JSON.stringify(output)}`);
  return output.candidate;
}

describe('G8-8 · a utility meter plus a BMS sub-meter export: the sub-meter is not added', () => {
  test('G8-8 · the site total is the utility meter alone, calculated', () => {
    const total = site(48_000, 6_500);
    expect(total.source).toBe('calculated');
    expect(total.quantity).toEqual({ value: 48_000, unit: 'kWh' });
    expect(total.quantity.value).not.toBe(48_000 + 6_500);
  });

  test('G8-8 · whatever the sub-meter reads, the site total does not move', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), fc.integer({ min: 1, max: 1_000_000 }), (utility, sub) => {
        expect(site(utility, sub).quantity.value).toBe(utility);
      }),
      { numRuns: 50 },
    );
  });
});
