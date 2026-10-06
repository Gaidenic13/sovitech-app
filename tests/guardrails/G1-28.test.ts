/**
 * G1-28 (proposed for docs/guardrails.md section 7 in phase 5; rule 1: "A value exists only if it comes from ... a
 * permitted calculation"; rule 7: "'Not available yet' never appears alone. It names what is missing"; prompt 3 phase
 * 5: "Write no production formula for a method no source defines: the app shows 'Not available yet' and names what
 * is missing").
 * Situation: an output whose formula has no body, because no source defines its method.
 * Expected: it reads "Not available yet", naming what is missing; no candidate is created and no figure, zero or dash
 * is shown.
 *
 * Engine half (this file; the engine builder): the production catalogue holds the six declared signatures and no
 * body, so every output of every run answers `not_available`, naming the SOVITECH dataset (by its gate's name) while
 * none is approved, or the method once its datasets are there; no candidate exists in the run or its snapshot. The
 * line the owner reads ("Not available yet: …") is the view-model's (B2), from the same missing items.
 *
 * The view-model half (B2's), folded in by the integrator (phase 5 part A; one file per case id): the stored proposal
 * as `@sovitech/view-model/server` builds it over a TEST project (tests/guardrails/_support/proposal.ts), at the end of
 * this file.
 */
import { describe, expect, test, it } from 'vitest';
import { GATE_IDS } from '@sovitech/registry/gates';
import { FIELD, OUTPUT, SYSTEMS, productionRegistry, scopeFieldKey } from '@sovitech/registry';
import { PRODUCTION_CATALOGUE, runEngine, snapshotRecordOf, type Missing } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { productionField } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, ownerAnswer, testDocument } from './_support/builders';
import { displayById, productionRows, SNAPSHOT_ID, testProposalFields, testProposalInput } from './_support/proposal';
import { proposalView } from '@sovitech/view-model/server';

const PROJECT = 'test-project-g1-28';
const BUILDING = 'test-building-g1-28';
const plans = testDocument('test-doc-g1-28', PROJECT, 'technical_design');
let ids = 0;
const newId = (): string => `test-cand-g1-28-out-${String((ids += 1))}`;

/** Every first-estimate input known: the outputs still have no method. */
function knownProject(): TestEntry[] {
  const owner = (key: string, subjectId: string, choice: string): TestEntry => {
    const definition = productionField(key);
    return { definition, subjectId, candidates: [ownerAnswer({ id: `test-cand-g1-28-${key}`, subjectId, field: definition, value: { choice }, minute: 1 })] };
  };
  const area = productionField(FIELD.grossFloorArea);
  return [
    owner(FIELD.projectType, PROJECT, 'new_construction'),
    owner(FIELD.buildingType, BUILDING, 'hotel'),
    {
      definition: area,
      subjectId: BUILDING,
      candidates: [documentReading({ id: 'test-cand-g1-28-area', subjectId: BUILDING, field: area, document: plans, value: { quantity: { value: 12_345, unit: 'm2', qualifier: 'gross_total' } }, minute: 2 })],
    },
    ...SYSTEMS.map((system) => owner(scopeFieldKey(system.id), PROJECT, system.id === 'hvac' ? 'include' : 'exclude')),
  ];
}

const subjects = { project: PROJECT, building: BUILDING } as const;
const datasetNames = (missing: readonly Missing[]): string[] => missing.flatMap((item) => (item.kind === 'dataset' ? [item.name] : []));

describe('G1-28 · an output whose formula has no body reads "Not available yet", naming what is missing, and creates no candidate', () => {
  test('G1-28 · with every gate closed and no dataset approved, every production output names its SOVITECH dataset; no candidate, no figure', () => {
    const input = testEngineInput({ projectId: PROJECT, entries: knownProject(), subjects, closedGates: GATE_IDS, datasets: () => undefined });
    const run = runEngine(PRODUCTION_CATALOGUE, input, { newId, at: '2026-10-05T09:00:00Z' });

    const declared = productionRegistry.formulas.flatMap((signature) => signature.outputs);
    expect(run.outputs.map((output) => output.output)).toEqual(declared);
    for (const output of run.outputs) {
      expect(output.kind, output.output).toBe('not_available');
      if (output.kind !== 'not_available') continue;
      // Named, never alone (rule 7): at least one dataset, each with the name its gate's "Waits for" gives it.
      expect(datasetNames(output.missing).length, output.output).toBeGreaterThan(0);
      expect(output.missing.some((item) => item.kind === 'method'), output.output).toBe(false);
    }
    const byOutput = new Map(run.outputs.map((output) => [output.output, output.kind === 'not_available' ? datasetNames(output.missing) : []]));
    expect(byOutput.get(OUTPUT.indicativeRange)).toEqual(['SOVITECH cost ranges and benchmarks']);
    expect(byOutput.get(OUTPUT.pointsHardwareIo)).toEqual(['SOVITECH point templates']);
    expect(byOutput.get(OUTPUT.preliminaryEstimate)).toEqual(['SOVITECH point templates', 'SOVITECH cost ranges and benchmarks']);
    expect(byOutput.get(OUTPUT.annualSavings)).toEqual(['SOVITECH cost ranges and benchmarks', 'SOVITECH savings factors']);
    expect(byOutput.get(OUTPUT.measurePriority)).toEqual(['SOVITECH function set']);

    expect(run.formulasRun).toEqual([]);
    expect(run.datasets).toEqual([]);
    expect(run.refusals).toEqual([]);
    const snapshot = snapshotRecordOf(run, []);
    expect(snapshot.outputs.every((row) => row.candidateId === null && row.missing.length > 0 && !row.incomplete)).toBe(true);
    // The datasets first, then each owner input still missing (building facts the documents have not given), as codes.
    const preliminary = snapshot.outputs.find((row) => row.output === OUTPUT.preliminaryEstimate)?.missing ?? [];
    expect(preliminary.slice(0, 2)).toEqual(['dataset:sovitech-point-templates', 'dataset:sovitech-cost-ranges']);
    expect(preliminary.slice(2).every((code) => code.startsWith('input:'))).toBe(true);
    // The snapshot holds the inputs it read, and no candidate of its own: nothing was produced.
    expect(snapshot.candidateIds).toEqual(run.inputCandidateIds);
  });

  test('G1-28 · with the gates open but no dataset version approved, the datasets are still named; nothing reads as a figure', () => {
    const input = testEngineInput({ projectId: PROJECT, entries: knownProject(), subjects, closedGates: [], datasets: () => undefined });
    const run = runEngine(PRODUCTION_CATALOGUE, input, { newId, at: '2026-10-05T09:00:00Z' });
    expect(run.outputs.every((output) => output.kind === 'not_available' && datasetNames(output.missing).length > 0)).toBe(true);
  });

  test('G1-28 · a formula whose datasets are all there but that has no body names its method, and runs nothing', () => {
    const catalogue = testCatalogue();
    const measures = catalogue.formulas.find((formula) => formula.signature.id === 'TEST-measurePriority');
    expect(measures?.body).toBeUndefined();
    const input = testEngineInput({ projectId: PROJECT, entries: knownProject(), subjects });
    const run = runEngine(catalogue, input, { newId, at: '2026-10-05T09:00:00Z' });
    const output = run.outputs.find((item) => item.output === OUTPUT.measurePriority);
    expect(output?.kind).toBe('not_available');
    if (output?.kind !== 'not_available') return;
    // The method first; the owner's unanswered goals after it (rule 7: each named); no dataset, since all are there.
    expect(output.missing[0]).toEqual({ kind: 'method', name: 'TEST-measurePriority' });
    expect(datasetNames(output.missing)).toEqual([]);
    expect(run.formulasRun).not.toContain('TEST-measurePriority@1.0.0');
  });
});

// ---- The view-model half (B2's, folded in by the integrator, phase 5 part A; moved from tests/api/proposal-view.test.ts) ----

describe('G1-28 (the line) · rule 1 · rule 7: an output whose formula has no body', () => {
  it('G1-28 · prompt 3 phase 5: no source defines the method: "Not available yet", naming what is missing; no figure, zero or dash', () => {
    const fields = testProposalFields();
    const rows = productionRows(fields).rows.map((row) => (row.output === 'measures.priorityOrder' ? { ...row, missing: ['method:measurePriority'] } : row));
    const built = proposalView(testProposalInput({ fields, rows }));
    const display = displayById(built.displayObjects, `proposal:${SNAPSHOT_ID}.outputs.measures.priorityOrder`);
    expect(display.text).toBe("Not available yet: SOVITECH's method for order of the measures");
    expect(display.shape).toBe('missing');
    expect(display.text).not.toMatch(/\p{N}|—|–/u);
    // Every output of a live proposal names a SOVITECH dataset (none is approved), never a figure.
    for (const output of [...built.view.investment.outputs, ...built.view.points.outputs, ...built.view.energy.outputs]) {
      expect(displayById(built.displayObjects, output.display).text.startsWith('Not available yet: '), output.output).toBe(true);
    }
  });
});
