/**
 * G9-4 (docs/guardrails.md section 7; 2.1 `estimated`: "Points from per-room tables, CAPEX from €/point, and
 * consumption from capacity × hours are always estimated"; F-CALC-08).
 * Situation: points from a per-room table.
 * Expected: the source is `estimated`, never `calculated`.
 *
 * Engine case (the engine builder): the engine takes a candidate's source from the formula's signature, never from the
 * body, and refuses a catalogue that would pair a template or a price table with a formula not declared estimated:
 * - `TEST-roomControlPoints@1.0.0` (points per guest room from a TEST per-room table) produces `estimated` candidates;
 * - a TEST catalogue declaring the same per-room formula as not estimated is refused before any run;
 * - a body that answers a figure of the wrong kind for its signature is refused, and no candidate is created.
 */
import { describe, expect, test } from 'vitest';
import { FIELD } from '@sovitech/registry';
import { EngineInputError, point, exact, runEngine, type FormulaCatalogue } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { TEST_FIELDS, productionField } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, ownerAnswer, testDocument } from './_support/builders';

const PROJECT = 'test-project-g9-4';
const BUILDING = 'test-building-g9-4';
const schedule = testDocument('test-doc-g9-4', PROJECT, 'technical_design');

function hotel(): TestEntry[] {
  const rooms = productionField(FIELD.rooms);
  return [
    {
      definition: TEST_FIELDS.roomControlSupplier,
      subjectId: PROJECT,
      candidates: [ownerAnswer({ id: 'test-cand-g9-4-supplier', subjectId: PROJECT, field: TEST_FIELDS.roomControlSupplier, value: { choice: 'sovitech_supplied' }, minute: 1 })],
    },
    {
      definition: rooms,
      subjectId: BUILDING,
      candidates: [documentReading({ id: 'test-cand-g9-4-rooms', subjectId: BUILDING, field: rooms, document: schedule, value: { quantity: { value: 120, unit: 'count', qualifier: 'guest_rooms' } }, minute: 2 })],
    },
  ];
}

let ids = 0;
const options = { newId: () => `test-cand-g9-4-out-${String((ids += 1))}`, at: '2026-10-05T09:00:00Z' };
const input = () => testEngineInput({ projectId: PROJECT, entries: hotel(), subjects: { project: PROJECT, building: BUILDING } });

describe('G9-4 · points from a per-room table are estimated, never calculated', () => {
  test('G9-4 · every candidate of the per-room formula is estimated, with its range', () => {
    const run = runEngine(testCatalogue({ mirrored: false, extra: ['TEST-roomControlPoints'] }), input(), options);
    expect(run.outputs).toHaveLength(2);
    for (const output of run.outputs) {
      expect(output.kind).toBe('figure');
      if (output.kind !== 'figure') continue;
      expect(output.candidate.source).toBe('estimated');
      expect(output.candidate.range).toBeDefined();
    }
  });

  test('G9-4 · a catalogue declaring the per-room formula as not estimated is refused before it runs', () => {
    const catalogue = testCatalogue({ mirrored: false, extra: ['TEST-roomControlPoints'] });
    const [formula] = catalogue.formulas;
    if (formula === undefined) throw new Error('no formula');
    const mislabelled: FormulaCatalogue = { kind: 'test', formulas: [{ ...formula, signature: { ...formula.signature, estimated: false } }] };
    expect(() => runEngine(mislabelled, input(), options)).toThrow(EngineInputError);
    expect(() => runEngine(mislabelled, input(), options)).toThrow(/G9-4/u);
  });

  test('G9-4 · a body answering an exact value for an estimated formula is refused: no candidate, the refusal recorded', () => {
    const catalogue = testCatalogue({ mirrored: false, extra: ['TEST-roomControlPoints'] });
    const [formula] = catalogue.formulas;
    if (formula === undefined) throw new Error('no formula');
    const exactAnswer = {
      ...formula,
      body: () => ({
        'points.TEST_roomHardwareIo': { kind: 'value' as const, value: point(exact(240)), unit: 'count', qualifier: 'hardware_io', assumptions: [] },
        'points.TEST_roomIntegration': { kind: 'value' as const, value: point(exact(120)), unit: 'count', qualifier: 'integration', assumptions: [] },
      }),
    };
    const run = runEngine({ kind: 'test', formulas: [exactAnswer] }, input(), options);
    expect(run.outputs.every((output) => output.kind === 'not_available')).toBe(true);
    expect(run.refusals.map((refusal) => refusal.reason)).toEqual(['value_from_estimated_formula', 'value_from_estimated_formula']);
    expect(TEST_FIELDS.roomHardwareIo.estimation).toBe('allowed');
  });
});
