/**
 * G10-7 (docs/guardrails.md section 7; rule 10 stage 2: "It shows its basis, the provisional inputs, the open items and
 * the exclusions"; rule 11 "The interface points stay in scope"; guardrails section 5, step 4).
 * Situation: a system whose recorded scope decision is "exclude", for example CCTV, or Fire Safety left unchecked.
 * Expected: it contributes no cost, savings, operating-cost or lifecycle line, and it is listed among the estimate's
 * exclusions. The fire-alarm input and fire-mode status points stay in (G11-3).
 *
 * Engine half (this file; the engine builder), with TEST formulas over TEST tables:
 * - CCTV excluded contributes nothing to the points (`TEST-pointsByType`): the result is exactly the systems in scope;
 * - CCTV and Access Control excluded leave Security & Access no savings (`TEST-savingsEstimate`): the estimate is that
 *   of the other areas alone;
 * - Fire Safety unchecked leaves the fire interface points in (`TEST-fireInterfacePoints`, which does not read the Fire
 *   Safety decision at all).
 * The exclusions list on the estimate is the view-model's (B2), from the recorded scope decisions.
 *
 * The view-model half (B2's), folded in by the integrator (phase 5 part A; one file per case id): the stored proposal
 * as `@sovitech/view-model/server` builds it over a TEST project (tests/guardrails/_support/proposal.ts), at the end of
 * this file.
 */
import { describe, expect, test, it } from 'vitest';
import { AUTOMATION_AREAS, FIELD, OUTPUT, SYSTEMS, automationFieldKey, scopeFieldKey } from '@sovitech/registry';
import { exact, interval, multiply, percentOf, point, runEngine, sum, type EngineRun, type FormulaCatalogue } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { TEST_FIELDS, productionField } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, ownerAnswer, testDocument } from './_support/builders';
import { displayById, ownerAnswer as proposalOwnerAnswer, SNAPSHOT_ID, testProposalFields, testProposalInput } from './_support/proposal';
import { testEvents } from './_support/builders';
import { proposalView, INTERFACE_POINTS } from '@sovitech/view-model/server';

const PROJECT = 'test-project-g10-7';
const BUILDING = 'test-building-g10-7';
const plans = testDocument('test-doc-g10-7', PROJECT, 'technical_design');

const decision = (key: string, choice: string): TestEntry => {
  const definition = productionField(key);
  return { definition, subjectId: PROJECT, candidates: [ownerAnswer({ id: `test-cand-g10-7-${key}`, subjectId: PROJECT, field: definition, value: { choice }, minute: 1 })] };
};
const scope = (included: readonly string[]): TestEntry[] => SYSTEMS.map((system) => decision(scopeFieldKey(system.id), included.includes(system.id) ? 'include' : 'exclude'));

let ids = 0;
function run(catalogue: FormulaCatalogue, entries: readonly TestEntry[]): EngineRun {
  return runEngine(catalogue, testEngineInput({ projectId: PROJECT, entries, subjects: { project: PROJECT, building: BUILDING } }), {
    newId: () => `test-cand-g10-7-out-${String((ids += 1))}`,
    at: '2026-10-05T09:00:00Z',
  });
}
const figureOf = (result: EngineRun, output: string) => {
  const found = result.outputs.find((item) => item.output === output);
  if (found?.kind !== 'figure' || found.candidate.range === undefined) throw new Error(`no figure for ${output}: ${JSON.stringify(found)}`);
  return found.candidate;
};

describe('G10-7 · an excluded system contributes no line; the fire interface points stay in', () => {
  test('G10-7 · CCTV excluded adds no points: the AI points are those of the systems in scope, exactly', () => {
    const points = testCatalogue({ mirrored: false, extra: ['TEST-pointsByType'] });
    const ai = figureOf(run(points, scope(['hvac', 'lighting'])), 'points.TEST_hardwareIo.AI');
    // TEST tables: AI points of HVAC 9030 and Lighting 9031 (CCTV's would be 9037); the method's spread 9094 to 9095 %.
    const expected = multiply(sum([point(exact(9030)), point(exact(9031))]), interval(percentOf(9094), percentOf(9095)));
    expect(ai.range).toEqual({ low: expected.low.toNumber(), high: expected.high.toNumber() });
    const withCctv = figureOf(run(points, scope(['hvac', 'lighting', 'cctv'])), 'points.TEST_hardwareIo.AI');
    expect(withCctv.range?.high).toBeGreaterThan(ai.range?.high ?? Number.NaN);
  });

  test('G10-7 · CCTV and Access Control excluded leave Security & Access no savings: the estimate is the other areas alone', () => {
    const savings = testCatalogue({ mirrored: true });
    const type = productionField(FIELD.buildingType);
    const area = productionField(FIELD.grossFloorArea);
    const facts: TestEntry[] = [
      { definition: type, subjectId: BUILDING, candidates: [ownerAnswer({ id: 'test-cand-g10-7-type', subjectId: BUILDING, field: type, value: { choice: 'office' }, minute: 1 })] },
      {
        definition: area,
        subjectId: BUILDING,
        candidates: [documentReading({ id: 'test-cand-g10-7-area', subjectId: BUILDING, field: area, document: plans, value: { quantity: { value: 100, unit: 'm2', qualifier: 'gross_total' } }, minute: 1 })],
      },
      decision(FIELD.occupancy, 'mixed'),
      decision(FIELD.operatingSchedule, 'business_hours'),
    ];
    const areas = (selected: readonly string[]) => AUTOMATION_AREAS.map((automation) => decision(automationFieldKey(automation.id), selected.includes(automation.id) ? 'selected' : 'not_selected'));
    const country = { definition: productionField(FIELD.country), subjectId: PROJECT, candidates: [{ id: 'test-cand-g10-7-country', subjectId: PROJECT, fieldKey: FIELD.country, text: 'TEST-XA', source: 'user' as const, evidence: [], createdBy: 'test-owner', authorRole: 'owner' as const, createdAt: '2026-09-25T09:01:00.000Z' }] };
    const city = { definition: productionField(FIELD.city), subjectId: PROJECT, candidates: [{ id: 'test-cand-g10-7-city', subjectId: PROJECT, fieldKey: FIELD.city, text: 'TEST city A', source: 'user' as const, evidence: [], createdBy: 'test-owner', authorRole: 'owner' as const, createdAt: '2026-09-25T09:01:00.000Z' }] };
    const excluded = figureOf(run(savings, [...facts, country, city, ...scope(['hvac']), ...areas(['hvac', 'security_access'])]), OUTPUT.annualSavings);
    const hvacOnly = figureOf(run(savings, [...facts, country, city, ...scope(['hvac']), ...areas(['hvac'])]), OUTPUT.annualSavings);
    expect(excluded.range).toEqual(hvacOnly.range);
  });

  test('G10-7 · Fire Safety left unchecked never removes the fire interface points (G11-3)', () => {
    const fire = testCatalogue({ mirrored: false, extra: ['TEST-fireInterfacePoints'] });
    const [formula] = fire.formulas;
    expect(formula?.signature.inputs).not.toContain(scopeFieldKey('fire_safety'));
    const panels: TestEntry = {
      definition: TEST_FIELDS.ahuPanels,
      subjectId: BUILDING,
      candidates: [documentReading({ id: 'test-cand-g10-7-panels', subjectId: BUILDING, field: TEST_FIELDS.ahuPanels, document: plans, value: { quantity: { value: 3, unit: 'count' } }, minute: 1 })],
    };
    for (const fireSafety of [['hvac'], ['hvac', 'fire_safety']]) {
      const result = run(fire, [...scope(fireSafety), panels]);
      expect(result.outputs.map((output) => (output.kind === 'figure' ? output.candidate.quantity.value : output.kind))).toEqual([3, 3]);
    }
  });
});

// ---- The view-model half (B2's, folded in by the integrator, phase 5 part A; moved from tests/api/proposal-view.test.ts) ----

describe('G10-7 (the view-model half) · rule 10 · rule 11: excluded systems on the stored proposal', () => {
  it('G10-7 · G11-3 · R-111: CCTV and Fire Safety excluded are listed among the exclusions through their decisions as used; no line of their own; the interface points stay', () => {
    const cctv = proposalOwnerAnswer(250, 'project.scope.cctv', { choice: 'exclude' });
    const fire = proposalOwnerAnswer(251, 'project.scope.fire_safety', { choice: 'exclude' });
    const hvac = proposalOwnerAnswer(252, 'project.scope.hvac', { choice: 'include' });
    const answers = [cctv, fire, hvac];
    const fields = testProposalFields({ candidates: answers.map((answer) => answer.candidate), events: testEvents({ candidate: answers.map((answer) => answer.event) }) });
    const built = proposalView(testProposalInput({ fields }));
    expect(built.view.scope.exclusions).toEqual(['fire_safety', 'cctv']);
    const decisionOf = (systemId: string): string => built.view.scope.systems.find((system) => system.systemId === systemId)?.decision ?? '';
    expect(built.view.investment.exclusions).toEqual([decisionOf('fire_safety'), decisionOf('cctv')]);
    for (const systemId of ['fire_safety', 'cctv']) {
      const decision = displayById(built.displayObjects, decisionOf(systemId));
      expect(decision.valueId).toBe(`proposal:${SNAPSHOT_ID}.inputs.project.scope.${systemId}`);
      expect(decision.badge?.id).toBe('provided_by_you');
    }
    expect(built.view.investment.exclusions).not.toContain(decisionOf('hvac'));
    expect(built.view.scope.systems.find((system) => system.systemId === 'fire_safety')?.sentence).toBeNull();
    for (const display of built.displayObjects.filter((entry) => entry.valueId.includes('.outputs.'))) expect(display.text, display.valueId).not.toMatch(/CCTV|Fire Safety/u);
    expect(displayById(built.displayObjects, built.view.points.interfacePoints).text).toBe(INTERFACE_POINTS);
  });
});
