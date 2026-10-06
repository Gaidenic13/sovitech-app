/**
 * G9-10 (proposed for docs/guardrails.md section 7 in phase 5; 2.4 "Recalculation": "A calculated candidate whose inputs
 * are no longer all active is stale. It renders as 'Out of date, recalculating' and never as current"; "A generated
 * proposal keeps a snapshot of the candidate ids and formula versions it used"; 2.8 status lines).
 * Situation: an input of a stored proposal's TEST estimated figure changes after generation.
 * Expected: the figure renders as "Out of date, recalculating", never as current, and the stored proposal never shows
 * the newer value (as indexed in section 7 at 1.10, worded as 2.4 writes it: "It renders as 'Out of date,
 * recalculating' and never as current").
 *
 * Engine half (this file; the engine builder): `snapshotChanges` compares the snapshot's candidates with the ones that
 * decide each input now: the changed input, the outputs whose formula reads it ("Out of date, recalculating"), and the
 * date of the first change; the stored snapshot itself, and the figure's candidate id in it, are not touched (nothing
 * regenerates silently). Rendering the figure as that line is the view-model's (B2).
 *
 * The view-model half (B2's), folded in by the integrator (phase 5 part A; one file per case id): the stored proposal
 * as `@sovitech/view-model/server` builds it over a TEST project (tests/guardrails/_support/proposal.ts), at the end of
 * this file.
 */
import { describe, expect, test, it } from 'vitest';
import { inputsOfOutput, runEngine, snapshotChanges, snapshotRecordOf, storedSnapshotOf, type StoredSnapshot } from '@sovitech/engine';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { TEST_FIELDS } from '../../packages/engine/test-formulas/fields';
import { testCurrentInputs, testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, engineerEntry, testDocument, testTime } from './_support/builders';
import { changesSince, displayById, ownerAnswer as proposalOwnerAnswer, productionRows, SNAPSHOT_ID, testEstimate, testProposalFields, testProposalInput } from './_support/proposal';
import { uuid } from './_support/view-model';
import { testEvents } from './_support/builders';
import { proposalView } from '@sovitech/view-model/server';
import { readsOf as catalogueReadsOf } from '../../apps/api/src/proposal/engine';
import { PRODUCTION_CATALOGUE } from '@sovitech/engine';
import type { Candidate } from '@sovitech/domain';

const PROJECT = 'test-project-g9-10';
const BUILDING = 'test-building-g9-10';
const asBuilt = testDocument('test-doc-g9-10', PROJECT, 'as_built');
const catalogue = testCatalogue({ mirrored: false, extra: ['TEST-capexFieldDevices'] });
const OUTPUT = 'capex.TEST_fieldDevices';

const devices: TestEntry = {
  definition: TEST_FIELDS.fieldDevices,
  subjectId: BUILDING,
  candidates: [documentReading({ id: 'test-cand-g9-10-devices', subjectId: BUILDING, field: TEST_FIELDS.fieldDevices, document: asBuilt, value: { quantity: { value: 140, unit: 'count' } }, minute: 2 })],
};
const reuseUnknown: TestEntry = { definition: TEST_FIELDS.fieldDevicesReuse, subjectId: BUILDING, candidates: [] };
const reuseSurveyed: TestEntry = {
  definition: TEST_FIELDS.fieldDevicesReuse,
  subjectId: BUILDING,
  candidates: [engineerEntry({ id: 'test-cand-g9-10-survey', subjectId: BUILDING, field: TEST_FIELDS.fieldDevicesReuse, value: { choice: 'reuse' }, minute: 40 })],
};

/** The proposal generated at minute 10, as the store keeps it. */
function generated(): StoredSnapshot {
  let ids = 0;
  const run = runEngine(catalogue, testEngineInput({ projectId: PROJECT, entries: [devices, reuseUnknown], subjects: { building: BUILDING } }), {
    newId: () => `test-cand-g9-10-out-${String((ids += 1))}`,
    at: testTime(10),
  });
  return storedSnapshotOf({ id: 'test-snapshot-g9-10', createdAt: testTime(10) }, snapshotRecordOf(run, []));
}

const readsOf = (output: string): readonly string[] => inputsOfOutput(catalogue, output);

describe('G9-10 · an input of a stored TEST estimate changes after generation: "Out of date, recalculating", never the newer value', () => {
  test('G9-10 · with nothing changed, nothing is out of date', () => {
    const changes = snapshotChanges(generated(), testCurrentInputs({ entries: [devices, reuseUnknown] }), readsOf);
    expect(changes).toEqual({ changedFields: [], outOfDateOutputs: new Set(), outOfDateOn: new Map(), changedOn: null });
  });

  test('G9-10 · a site survey records reuse after generation: the figure is out of date, from the survey date, and the snapshot keeps its figure', () => {
    const snapshot = generated();
    const figure = snapshot.outputs.find((row) => row.output === OUTPUT)?.candidateId;
    expect(figure).toBe('test-cand-g9-10-out-1');
    const before = structuredClone(snapshot);

    const changes = snapshotChanges(snapshot, testCurrentInputs({ entries: [devices, reuseSurveyed] }), readsOf);
    expect(changes.changedFields).toEqual([{ subjectId: BUILDING, fieldKey: TEST_FIELDS.fieldDevicesReuse.key }]);
    expect([...changes.outOfDateOutputs]).toEqual([OUTPUT]);
    expect(changes.changedOn).toBe(testTime(40));
    // Never recomputed into the stored proposal: the snapshot, and the figure's candidate in it, are as generated.
    expect(snapshot).toEqual(before);
    expect(snapshot.outputs.find((row) => row.output === OUTPUT)?.candidateId).toBe(figure);
  });

  test('G9-10 · an output whose formula does not read the changed input is not marked', () => {
    const changes = snapshotChanges(generated(), testCurrentInputs({ entries: [devices, reuseSurveyed] }), () => []);
    expect(changes.changedFields).toHaveLength(1);
    expect(changes.outOfDateOutputs.size).toBe(0);
  });
});

// ---- The view-model half (B2's, folded in by the integrator, phase 5 part A; moved from tests/api/proposal-view.test.ts) ----

describe('G9-10 (the view-model half) · 2.4 "Recalculation": an input of a stored figure changed after generation', () => {
  it('G9-10 · US-PROPOSAL-10 · R-110: the figure reads "Out of date, recalculating", never as current and never the newer value; its badge and method stay', () => {
    const area = proposalOwnerAnswer(280, 'building.grossFloorArea', { quantity: { value: 1500, unit: 'm2', qualifier: 'gross_total' } });
    const before = testProposalFields({ candidates: [area.candidate], events: testEvents({ candidate: [area.event] }) });
    const figure = testEstimate(281, { output: 'energy.annualConsumption', value: 300000, low: 240000, high: 380000, unit: 'kWh/a', inputCandidateIds: [area.candidate.id] });
    const rows = productionRows(before).rows.map((row) => (row.output === 'energy.annualConsumption' ? { ...row, candidateId: figure.id, missing: [], incomplete: false } : row));
    const asStored = testProposalInput({ fields: before, rows, snapshotCandidates: [area.candidate, figure] });
    const snapshot: StoredSnapshot = asStored.snapshot;
    // Unchanged: the figure reads as generated.
    const fresh = proposalView({ ...asStored, changes: changesSince(snapshot, before, catalogueReadsOf(PRODUCTION_CATALOGUE)) });
    expect(displayById(fresh.displayObjects, `proposal:${SNAPSHOT_ID}.outputs.energy.annualConsumption`).text).toBe('about 300,000 kWh/a (240,000 to 380,000 kWh/a)');
    // The owner corrected the area after generation.
    const corrected: Candidate = { ...area.candidate, id: uuid(282), quantity: { value: 1800, unit: 'm2', qualifier: 'gross_total' }, createdAt: '2026-10-03T10:00:00.000000Z' };
    const after = testProposalFields({
      candidates: [area.candidate, corrected],
      events: testEvents({
        candidate: [
          area.event,
          { candidateId: area.candidate.id, type: 'rejected', by: uuid(80), role: 'owner', at: corrected.createdAt, reason: 'owner_corrected' },
          { candidateId: corrected.id, type: 'user_confirmed', by: uuid(80), role: 'owner', at: corrected.createdAt },
        ],
      }),
    });
    const changes = changesSince(snapshot, after, catalogueReadsOf(PRODUCTION_CATALOGUE));
    expect(changes.outOfDateOutputs.has('energy.annualConsumption')).toBe(true);
    const stale = proposalView({ ...testProposalInput({ fields: after, rows, snapshotCandidates: [area.candidate, figure] }), changes });
    const output = stale.view.energy.outputs.find((entry) => entry.output === 'energy.annualConsumption');
    expect(output).toMatchObject({ availability: 'figure', outOfDate: true });
    const display = displayById(stale.displayObjects, output?.display ?? '');
    expect(display.text).toBe('Out of date, recalculating');
    expect(display.badge?.id).toBe('estimated');
    expect(display.sourceLine?.text).toBe('Method: TEST-pointsEstimate, version 1');
    expect(display.parts).toBeUndefined();
    // The basis keeps the value as used, never the newer one (US-PROPOSAL-03 AC3).
    expect(displayById(stale.displayObjects, `proposal:${SNAPSHOT_ID}.inputs.building.grossFloorArea`).text).toContain('1,500');
  });
});
