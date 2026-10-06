/**
 * G9-3 (docs/guardrails.md section 7; rule 8 "Points": "hardware_io, split into AI, AO, DI, DO and UI; integration,
 * with its protocol and variant ...; virtual. Point types are never summed into one priced total, and a headline total
 * always shows its breakdown"; F-CALC-08).
 * Situation: points shown.
 * Expected: broken down into hardware_io by type, integration by protocol, and virtual. No single priced total.
 *
 * Engine half (this file; the engine builder): the engine produces points only by type, one candidate per type, and no
 * formula produces a sum of types:
 * - the production catalogue's points formula declares hardware I/O, integration and virtual, each its own output, and
 *   no output of any formula adds point types together (the hardware split by AI to UI and integration by protocol need
 *   the SOVITECH point templates; the build log names the signature change they will bring);
 * - with the TEST formula `TEST-pointsByType@1.0.0` (TEST tables), each I/O type, each protocol and virtual is its own
 *   estimated candidate, qualified by its point type, equal to its own type's points and no other.
 * How the page lays them out is the view-model's (B2).
 */
import { describe, expect, test } from 'vitest';
import { OUTPUT, SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import { PRODUCTION_CATALOGUE, exact, interval, midpoint, multiply, percentOf, point, runEngine, sum } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { POINT_TYPE_OUTPUTS, productionField } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { ownerAnswer } from './_support/builders';

const PROJECT = 'test-project-g9-3';
const IN_SCOPE = ['hvac', 'lighting'];
/** TEST tables (fixtures/datasets, TEST-engine-tables): the AI points of HVAC and Lighting, and the method's spread. */
const AI = { hvac: 9030, lighting: 9031 };

const scope = (): TestEntry[] =>
  SYSTEMS.map((system) => {
    const definition = productionField(scopeFieldKey(system.id));
    const choice = IN_SCOPE.includes(system.id) ? 'include' : 'exclude';
    return { definition, subjectId: PROJECT, candidates: [ownerAnswer({ id: `test-cand-g9-3-${system.id}`, subjectId: PROJECT, field: definition, value: { choice }, minute: 1 })] };
  });

describe('G9-3 · points are broken down by hardware I/O type, integration protocol and virtual; never one priced total', () => {
  test('G9-3 · the production points formula declares one output per point type, and no formula sums point types', () => {
    const points = PRODUCTION_CATALOGUE.formulas.find((formula) => formula.signature.id === 'pointsEstimate');
    expect(points?.signature.outputs).toEqual([OUTPUT.pointsHardwareIo, OUTPUT.pointsIntegration, OUTPUT.pointsVirtual]);
    const pointOutputs = PRODUCTION_CATALOGUE.formulas.flatMap((formula) => formula.signature.outputs).filter((output) => output.startsWith('points.'));
    expect(pointOutputs).toEqual([OUTPUT.pointsHardwareIo, OUTPUT.pointsIntegration, OUTPUT.pointsVirtual]);
  });

  test('G9-3 · each I/O type, each protocol and virtual is its own estimated candidate, qualified by its point type', () => {
    let ids = 0;
    const run = runEngine(testCatalogue({ mirrored: false, extra: ['TEST-pointsByType'] }), testEngineInput({ projectId: PROJECT, entries: scope(), subjects: { project: PROJECT } }), {
      newId: () => `test-cand-g9-3-out-${String((ids += 1))}`,
      at: '2026-10-05T09:00:00Z',
    });
    expect(run.outputs.map((output) => output.output)).toEqual(Object.keys(POINT_TYPE_OUTPUTS));
    const qualifiers = run.outputs.map((output) => (output.kind === 'figure' ? output.candidate.quantity.qualifier : output.kind));
    expect(qualifiers).toEqual(['hardware_io', 'hardware_io', 'hardware_io', 'hardware_io', 'hardware_io', 'integration', 'integration', 'virtual']);
    for (const output of run.outputs) {
      expect(output.kind, output.output).toBe('figure');
      if (output.kind === 'figure') expect(output.candidate.source).toBe('estimated');
    }
    // The AI points are HVAC's and Lighting's AI points only, spread by the method: no other type is added in.
    const ai = run.outputs.find((output) => output.output === 'points.TEST_hardwareIo.AI');
    if (ai?.kind !== 'figure') throw new Error('no AI points');
    const range = multiply(sum([point(exact(AI.hvac)), point(exact(AI.lighting))]), interval(percentOf(9094), percentOf(9095)));
    expect(ai.candidate.range).toEqual({ low: range.low.toNumber(), high: range.high.toNumber() });
    expect(ai.candidate.quantity.value).toBe(midpoint(range).toNumber());
  });
});
