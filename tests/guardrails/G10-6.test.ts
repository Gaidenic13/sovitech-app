/**
 * G10-6 (docs/guardrails.md section 7; rule 10 "Stage 2 also states who supplies what": "room control where a separate
 * guest room management system (GRMS) exists ... An unknown split is an open item, never an assumption. While a split
 * is unknown, the estimate shows a range over both supply options (`range_over_options`)"; F-CALC-08: "Room
 * controllers are never derived from a room count").
 * Situation: a hotel where the room-control supplier is unknown.
 * Expected: room points shown as a range over the SOVITECH-supplied and GRMS-integrated options, with an open item.
 * Never 424 room controllers assumed.
 *
 * Engine half (this file; the engine builder), with `TEST-roomControlPoints@1.0.0` (TEST room points per guest room by
 * supply option): while the supplier is unknown, each point type is one estimate whose range covers both options,
 * recorded as a range over the supplier field (the open item the view-model lists, B2); no option is assumed, and the
 * engine produces points by type, never a count of room controllers.
 */
import { describe, expect, test } from 'vitest';
import { FIELD } from '@sovitech/registry';
import { methodNotesOf, runEngine, type EngineRun } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { TEST_FIELDS, productionField } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, ownerAnswer, testDocument } from './_support/builders';

const PROJECT = 'test-project-g10-6';
const BUILDING = 'test-building-g10-6';
const schedule = testDocument('test-doc-g10-6', PROJECT, 'technical_design');
const GUEST_ROOMS = 424;

function hotel(supplier: string | null): TestEntry[] {
  const rooms = productionField(FIELD.rooms);
  return [
    {
      definition: TEST_FIELDS.roomControlSupplier,
      subjectId: PROJECT,
      candidates: supplier === null ? [] : [ownerAnswer({ id: 'test-cand-g10-6-supplier', subjectId: PROJECT, field: TEST_FIELDS.roomControlSupplier, value: { choice: supplier }, minute: 1 })],
    },
    {
      definition: rooms,
      subjectId: BUILDING,
      candidates: [documentReading({ id: 'test-cand-g10-6-rooms', subjectId: BUILDING, field: rooms, document: schedule, value: { quantity: { value: GUEST_ROOMS, unit: 'count', qualifier: 'guest_rooms' } }, minute: 2 })],
    },
  ];
}

let ids = 0;
function run(supplier: string | null): EngineRun {
  return runEngine(testCatalogue({ mirrored: false, extra: ['TEST-roomControlPoints'] }), testEngineInput({ projectId: PROJECT, entries: hotel(supplier), subjects: { project: PROJECT, building: BUILDING } }), {
    newId: () => `test-cand-g10-6-out-${String((ids += 1))}`,
    at: '2026-10-05T09:00:00Z',
  });
}
const rangeOf = (result: EngineRun, output: string) => {
  const found = result.outputs.find((item) => item.output === output);
  if (found?.kind !== 'figure' || found.candidate.range === undefined) throw new Error(`no TEST room points: ${JSON.stringify(found)}`);
  return found.candidate;
};

describe('G10-6 · room-control supplier unknown: room points range over both supply options, with an open item', () => {
  test('G10-6 · each point type covers the SOVITECH-supplied and the GRMS-integrated option, and names the supplier as its open basis', () => {
    const open = run(null);
    for (const output of ['points.TEST_roomHardwareIo', 'points.TEST_roomIntegration']) {
      const candidate = rangeOf(open, output);
      const sovitech = rangeOf(run('sovitech_supplied'), output).range;
      const grms = rangeOf(run('grms_integrated'), output).range;
      if (candidate.range === undefined || sovitech === undefined || grms === undefined) throw new Error('no range');
      expect(candidate.range.low).toBe(Math.min(sovitech.low, grms.low));
      expect(candidate.range.high).toBe(Math.max(sovitech.high, grms.high));
      expect(methodNotesOf(candidate.method)).toContainEqual({ kind: 'range_over_options', subjectId: PROJECT, fieldKey: TEST_FIELDS.roomControlSupplier.key });
      // No supplier assumed: the supplier field gives no input candidate.
      expect(candidate.method.inputCandidateIds).toEqual(['test-cand-g10-6-rooms']);
    }
  });

  test('G10-6 · never 424 room controllers: the engine produces points by type, and no figure is the room count', () => {
    const open = run(null);
    expect(open.outputs.map((output) => output.output)).toEqual(['points.TEST_roomHardwareIo', 'points.TEST_roomIntegration']);
    for (const output of open.outputs) {
      if (output.kind !== 'figure') throw new Error('no figure');
      expect(['hardware_io', 'integration']).toContain(output.candidate.quantity.qualifier);
      expect(output.candidate.quantity.value).not.toBe(GUEST_ROOMS);
      expect(output.candidate.fieldKey).not.toMatch(/controller/iu);
    }
  });
});
