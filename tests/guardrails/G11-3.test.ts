/**
 * G11-3 (docs/guardrails.md section 7; rule 11 "Fire mode is hardwired and wins": "The interface points stay in scope.
 * The proposal includes these interface points: a fire-alarm input and a fire-mode status per affected panel. It never
 * leaves them out"; guardrails section 5, step 4).
 * Situation: AHUs in scope and fire detection present.
 * Expected: fire-alarm input and fire-mode status per AHU panel are in the point list.
 *
 * Engine case (the engine builder), with `TEST-fireInterfacePoints@1.0.0`: a calculated count from the register, one
 * fire-alarm input and one fire-mode status per AHU panel while HVAC is in scope, whatever the Fire Safety decision
 * (the formula does not read it). The BMS gains no command over the fire system: the points are inputs and a status
 * (rule 11, "Only four verbs"). How the proposal names them with no figure while no template is approved is G11-12 (B2).
 */
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import { runEngine } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { TEST_FIELDS, productionField } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, ownerAnswer, testDocument } from './_support/builders';

const PROJECT = 'test-project-g11-3';
const BUILDING = 'test-building-g11-3';
const schematic = testDocument('test-doc-g11-3', PROJECT, 'technical_design');

function building(panels: number, fireSafety: 'include' | 'exclude'): TestEntry[] {
  const decisions = SYSTEMS.map((system): TestEntry => {
    const definition = productionField(scopeFieldKey(system.id));
    const choice = system.id === 'hvac' ? 'include' : system.id === 'fire_safety' ? fireSafety : 'exclude';
    return { definition, subjectId: PROJECT, candidates: [ownerAnswer({ id: `test-cand-g11-3-${system.id}`, subjectId: PROJECT, field: definition, value: { choice }, minute: 1 })] };
  });
  return [
    ...decisions,
    {
      definition: TEST_FIELDS.ahuPanels,
      subjectId: BUILDING,
      candidates: [documentReading({ id: 'test-cand-g11-3-panels', subjectId: BUILDING, field: TEST_FIELDS.ahuPanels, document: schematic, value: { quantity: { value: panels, unit: 'count' } }, minute: 2 })],
    },
  ];
}

let ids = 0;
function interfacePoints(panels: number, fireSafety: 'include' | 'exclude') {
  const result = runEngine(testCatalogue({ mirrored: false, extra: ['TEST-fireInterfacePoints'] }), testEngineInput({ projectId: PROJECT, entries: building(panels, fireSafety), subjects: { project: PROJECT, building: BUILDING } }), {
    newId: () => `test-cand-g11-3-out-${String((ids += 1))}`,
    at: '2026-10-05T09:00:00Z',
  });
  return result.outputs;
}

describe('G11-3 · AHUs in scope and fire detection present: a fire-alarm input and a fire-mode status per AHU panel', () => {
  test('G11-3 · three AHU panels give three fire-alarm inputs and three fire-mode statuses, calculated from the register', () => {
    const [alarms, modes] = interfacePoints(3, 'include');
    expect(alarms?.output).toBe('points.TEST_fireAlarmInputs');
    expect(modes?.output).toBe('points.TEST_fireModeStatuses');
    for (const output of [alarms, modes]) {
      expect(output?.kind).toBe('figure');
      if (output?.kind !== 'figure') continue;
      expect(output.candidate.source).toBe('calculated');
      expect(output.candidate.quantity).toEqual({ value: 3, unit: 'count' });
      expect(output.candidate.method.inputCandidateIds).toContain('test-cand-g11-3-panels');
    }
  });

  test('G11-3 · for any number of panels, one of each per panel, with Fire Safety included or not', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 400 }), fc.constantFrom('include' as const, 'exclude' as const), (panels, fireSafety) => {
        const values = interfacePoints(panels, fireSafety).map((output) => (output.kind === 'figure' ? output.candidate.quantity.value : output.kind));
        expect(values).toEqual([panels, panels]);
      }),
      { numRuns: 40 },
    );
  });
});
