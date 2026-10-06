/**
 * G4-12 (docs/guardrails.md section 7; rule 4 "Until a conflict is resolved": "where a formula cannot take a range, its
 * output reads 'Not available yet: two values for floors', with the action to resolve it. It never runs on one of the
 * values"; "the outputs that depend on it ... show a range over the values where the formula allows it").
 * Situation: a formula with no range support depends on a field in conflict.
 * Expected: "Not available yet: two values for floors".
 *
 * Engine half (this file; the engine builder): `TEST-levelsTotal@1.0.0`, a calculated total that takes no range
 * (`refuse`), reading the floor structure while two documents disagree on its upper floors: the output is not
 * available, naming the floors as in conflict, and its body never runs. Control: a formula that takes a range
 * (`TEST-pointsEstimate@1.0.0`, `range_over_options`) shows a range over both values. The line ("Not available yet: two
 * values for floors") is the view-model's (B2), from the missing input's reason.
 *
 * The view-model half (B2's), folded in by the integrator (phase 5 part A; one file per case id): the stored proposal
 * as `@sovitech/view-model/server` builds it over a TEST project (tests/guardrails/_support/proposal.ts), at the end of
 * this file.
 */
import { describe, expect, test, it } from 'vitest';
import { AUTOMATION_AREAS, FIELD, OUTPUT, SYSTEMS, automationFieldKey, scopeFieldKey } from '@sovitech/registry';
import { methodNotesOf, runEngine, type EngineRun } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { productionField } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, ownerAnswer, testDocument } from './_support/builders';
import { BUILDING_ID, displayById, productionRows, testProposalFields, testProposalInput } from './_support/proposal';
import { proposalView } from '@sovitech/view-model/server';

const PROJECT = 'test-project-g4-12';
const BUILDING = 'test-building-g4-12';
const memoriu = testDocument('test-doc-g4-12-a', PROJECT, 'technical_design');
const section = testDocument('test-doc-g4-12-b', PROJECT, 'technical_design');

function building(upper: readonly number[]): TestEntry[] {
  const floors = productionField(FIELD.floors);
  const rooms = productionField(FIELD.rooms);
  const zones = productionField(FIELD.zones);
  const type = productionField(FIELD.buildingType);
  const count = (id: string, field: typeof floors, document: typeof memoriu, value: number, qualifier: string, minute: number) =>
    documentReading({ id, subjectId: BUILDING, field, document, value: { quantity: { value, unit: 'count', qualifier } }, minute });
  const owner = (key: string, choice: string): TestEntry => {
    const definition = productionField(key);
    return { definition, subjectId: PROJECT, candidates: [ownerAnswer({ id: `test-cand-g4-12-${key}`, subjectId: PROJECT, field: definition, value: { choice }, minute: 1 })] };
  };
  return [
    {
      definition: floors,
      subjectId: BUILDING,
      candidates: [
        count('test-cand-g4-12-ground', floors, memoriu, 1, 'ground', 2),
        ...upper.map((value, index) => count(`test-cand-g4-12-upper-${String(index)}`, floors, index === 0 ? memoriu : section, value, 'upper', 3 + index)),
      ],
    },
    { definition: rooms, subjectId: BUILDING, candidates: [count('test-cand-g4-12-rooms', rooms, memoriu, 40, 'guest_rooms', 5)] },
    { definition: zones, subjectId: BUILDING, candidates: [count('test-cand-g4-12-zones', zones, memoriu, 12, 'hvac_control', 6)] },
    { definition: type, subjectId: BUILDING, candidates: [ownerAnswer({ id: 'test-cand-g4-12-type', subjectId: BUILDING, field: type, value: { choice: 'hotel' }, minute: 1 })] },
    ...SYSTEMS.map((system) => owner(scopeFieldKey(system.id), system.id === 'hvac' ? 'include' : 'exclude')),
    ...AUTOMATION_AREAS.map((area) => owner(automationFieldKey(area.id), 'not_selected')),
  ];
}

let ids = 0;
function run(upper: readonly number[]): EngineRun {
  return runEngine(testCatalogue({ extra: ['TEST-levelsTotal'] }), testEngineInput({ projectId: PROJECT, entries: building(upper), subjects: { project: PROJECT, building: BUILDING } }), {
    newId: () => `test-cand-g4-12-out-${String((ids += 1))}`,
    at: '2026-10-05T09:00:00Z',
  });
}

describe('G4-12 · a formula with no range support reading a field in conflict: "Not available yet: two values for floors"', () => {
  test('G4-12 · two documents disagree on the upper floors: the total is not available, naming the floors as in conflict', () => {
    const result = run([28, 30]);
    const total = result.outputs.find((output) => output.output === 'levels.TEST_total');
    expect(total).toEqual({
      kind: 'not_available',
      output: 'levels.TEST_total',
      formula: 'TEST-levelsTotal@1.0.0',
      missing: [{ kind: 'input', fieldKey: FIELD.floors, subjectId: BUILDING, reason: 'conflict' }],
    });
    // It never ran on one of the values.
    expect(result.formulasRun).not.toContain('TEST-levelsTotal@1.0.0');
  });

  test('G4-12 · control: with one value it runs, and a formula that takes a range shows a range over both values', () => {
    const settled = run([28]).outputs.find((output) => output.output === 'levels.TEST_total');
    expect(settled?.kind).toBe('figure');
    if (settled?.kind === 'figure') expect(settled.candidate.quantity).toEqual({ value: 29, unit: 'count' });

    const ranged = run([28, 30]).outputs.find((output) => output.output === OUTPUT.pointsHardwareIo);
    expect(ranged?.kind).toBe('figure');
    if (ranged?.kind !== 'figure') return;
    expect(methodNotesOf(ranged.candidate.method)).toContainEqual({ kind: 'range_over_values', subjectId: BUILDING, fieldKey: FIELD.floors });
    expect(ranged.candidate.method.inputCandidateIds).toEqual(expect.arrayContaining(['test-cand-g4-12-upper-0', 'test-cand-g4-12-upper-1']));
    const one = run([28]).outputs.find((output) => output.output === OUTPUT.pointsHardwareIo);
    const other = run([30]).outputs.find((output) => output.output === OUTPUT.pointsHardwareIo);
    if (one?.kind !== 'figure' || other?.kind !== 'figure') throw new Error('the single-value runs gave no figure');
    expect(ranged.candidate.range).toEqual({ low: one.candidate.range?.low, high: other.candidate.range?.high });
  });
});

// ---- The view-model half (B2's, folded in by the integrator, phase 5 part A; moved from tests/api/proposal-view.test.ts) ----

const FLOORS = 'building.floors';

describe('G4-12 (the line) · rule 4: a formula with no range support reading a field in conflict', () => {
  it('G4-12 · rule 4 "Until a conflict is resolved": the output reads "Not available yet: two values for floors"', () => {
    const fields = testProposalFields();
    const rows = productionRows(fields).rows.map((row) => (row.output === 'measures.priorityOrder' ? { ...row, missing: [`input:${BUILDING_ID}:${FLOORS}:conflict`] } : row));
    const built = proposalView(testProposalInput({ fields, rows }));
    const output = built.view.measures.outputs[0];
    const display = displayById(built.displayObjects, output?.display ?? '');
    expect(display.text).toBe('Not available yet: two values for floors');
    expect(display.missing).toBe('not_available_yet');
    expect(display.actions).toBeUndefined();
  });
});
