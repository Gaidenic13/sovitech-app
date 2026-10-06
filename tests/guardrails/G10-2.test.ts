/**
 * G10-2 (docs/guardrails.md section 7; rule 10 "Stage 3 is derived, not passed": "It comes from a stored quotation
 * record ... a hash of every input candidate"; "A quotation goes stale when its inputs change. If any input changes
 * after issue, it shows 'Superseded: inputs changed on <date>', and the figures return to stage 2 labels"; F-PRICE-05).
 * Situation: an input changes after a quotation was issued.
 * Expected: "Superseded", and the figures return to stage 2 labels.
 *
 * Engine half (this file; the engine builder): a TEST quotation record (in memory; TEST accounts, no real person; no
 * screen or script creates one: PRD R-129) names a stored TEST proposal and hashes its input candidates.
 * `quotationStanding` reads it as current until an input changes after issue, then as superseded on the date of that
 * change; `priceStageOf` then gives the figure its stage 2 label with the record's "Superseded" date, where before it
 * gave "Formal quotation" with the record's id. A benchmark-only figure (stage 1) never becomes a formal quotation. The
 * API half (B3: the record through the store's TEST machinery) and the view half (B2: the line) are theirs.
 *
 * The view-model half (B2's), folded in by the integrator (phase 5 part A; one file per case id): the stored proposal
 * as `@sovitech/view-model/server` builds it over a TEST project (tests/guardrails/_support/proposal.ts), at the end of
 * this file.
 *
 * Extended in phase 5 part B (new tests, Expected unchanged; for the integrator to index):
 * - V-2, A-3: a record superseded with no dated change (no input listed, an input the reader cannot place, a hash that
 *   no longer matches) answers its issue day as a timestamp with a zone, and the stored proposal reads "Superseded:
 *   inputs changed on <date>" (it failed with a server error on the bare date);
 * - V-4: stage 1's figure never carries "Superseded" (no quotation covers it);
 * - A-4: an input Unknown at issue (so the record could not list it) gets a value after issue: the record alone reads
 *   current, but the figure is out of date, so it shows "Superseded" on that date with the stage 2 label, never
 *   "Formal quotation" (engine and view halves).
 */
import { describe, expect, test, it } from 'vitest';
import { AUTOMATION_AREAS, FIELD, OUTPUT, SYSTEMS, automationFieldKey, scopeFieldKey } from '@sovitech/registry';
import {
  PRODUCTION_CATALOGUE,
  candidateHashOf,
  priceStageOf,
  quotationStanding,
  runEngine,
  snapshotChanges,
  snapshotRecordOf,
  storedSnapshotOf,
  type FormulaCatalogue,
  type SnapshotOutputRow,
  type StoredQuotationRecord,
  type StoredSnapshot,
} from '@sovitech/engine';
import type { Candidate } from '@sovitech/domain';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { productionField } from '../../packages/engine/test-formulas/fields';
import { testCurrentInputs, testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { documentReading, ownerAnswer, testDocument, testTime } from './_support/builders';
import { changesSince, displayById, GENERATED_AT, ownerAnswer as proposalOwnerAnswer, productionRows, SNAPSHOT_ID, standingOf, testEstimate, testProposalFields, testProposalInput } from './_support/proposal';
import { uuid } from './_support/view-model';
import { testEvents } from './_support/builders';
import { proposalView } from '@sovitech/view-model/server';

const PROJECT = 'test-project-g10-2';
const BUILDING = 'test-building-g10-2';
const memoriu = testDocument('test-doc-g10-2-a', PROJECT, 'technical_design');
const revision = testDocument('test-doc-g10-2-b', PROJECT, 'technical_design');
/** Two days after the TEST day: after the record's issue date. */
const AFTER_ISSUE = testTime(2 * 24 * 60);

const owner = (key: string, subjectId: string, choice: string): TestEntry => {
  const definition = productionField(key);
  return { definition, subjectId, candidates: [ownerAnswer({ id: `test-cand-g10-2-${key}`, subjectId, field: definition, value: { choice }, minute: 1 })] };
};
const text = (key: string, value: string): TestEntry => ({
  definition: productionField(key),
  subjectId: PROJECT,
  candidates: [{ id: `test-cand-g10-2-${key}`, subjectId: PROJECT, fieldKey: key, text: value, source: 'user', evidence: [], createdBy: 'test-owner', authorRole: 'owner', createdAt: testTime(1) }],
});

/** The project; `laterFloors` adds a later document that disagrees on the upper floors. */
function project(laterFloors: boolean): TestEntry[] {
  const floors = productionField(FIELD.floors);
  const count = (id: string, field: typeof floors, value: number, qualifier: string, minute: number, document = memoriu): Candidate =>
    documentReading({ id, subjectId: BUILDING, field, document, value: { quantity: { value, unit: 'count', qualifier } }, minute });
  const later: Candidate[] = laterFloors ? [{ ...count('test-cand-g10-2-upper-later', floors, 5, 'upper', 0, revision), createdAt: AFTER_ISSUE }] : [];
  return [
    owner(FIELD.projectType, PROJECT, 'new_construction'),
    text(FIELD.country, 'TEST-XA'),
    owner(FIELD.buildingType, BUILDING, 'hotel'),
    { definition: floors, subjectId: BUILDING, candidates: [count('test-cand-g10-2-ground', floors, 1, 'ground', 2), count('test-cand-g10-2-upper', floors, 3, 'upper', 2), ...later] },
    { definition: productionField(FIELD.rooms), subjectId: BUILDING, candidates: [count('test-cand-g10-2-rooms', productionField(FIELD.rooms), 20, 'guest_rooms', 3)] },
    { definition: productionField(FIELD.zones), subjectId: BUILDING, candidates: [count('test-cand-g10-2-zones', productionField(FIELD.zones), 6, 'hvac_control', 3)] },
    ...SYSTEMS.map((system) => owner(scopeFieldKey(system.id), PROJECT, ['hvac', 'lighting'].includes(system.id) ? 'include' : 'exclude')),
    ...AUTOMATION_AREAS.map((area) => owner(automationFieldKey(area.id), PROJECT, 'not_selected')),
  ];
}

const SNAPSHOT = 'test-snapshot-g10-2';
let ids = 0;
const entries = project(false);
const run = runEngine(testCatalogue(), testEngineInput({ projectId: PROJECT, entries, subjects: { project: PROJECT, building: BUILDING } }), {
  newId: () => `test-cand-g10-2-out-${String((ids += 1))}`,
  at: testTime(10),
});
const snapshot = storedSnapshotOf({ id: SNAPSHOT, createdAt: testTime(10) }, snapshotRecordOf(run, []));
const row = (output: string): SnapshotOutputRow => {
  const found = snapshot.outputs.find((item) => item.output === output);
  if (found === undefined) throw new Error(`no row for ${output}`);
  return { output: found.output, formula: `${found.formulaId}@${found.formulaVersion}`, candidateId: found.candidateId, missing: found.missing, incomplete: found.incomplete };
};

/** A TEST quotation record over the preliminary estimate's inputs (TEST accounts; in memory only). */
function record(proposalSnapshotId: string, tamper = false): StoredQuotationRecord {
  const candidates = new Map(entries.flatMap((entry) => entry.candidates).map((candidate) => [candidate.id, candidate]));
  return {
    id: `test-quotation-g10-2-${proposalSnapshotId}`,
    recordNumber: 'TEST-Q-0001',
    reviewingEngineerId: 'test-engineer',
    commercialReviewerId: 'test-commercial-reviewer',
    issuedOn: '2026-09-26',
    validUntil: '2026-10-26',
    currency: 'EUR',
    vatBasis: 'TEST VAT basis',
    proposalSnapshotId,
    inputs: run.inputCandidateIds.map((candidateId, index) => {
      const candidate = candidates.get(candidateId);
      if (candidate === undefined) throw new Error(`no candidate ${candidateId}`);
      return { candidateId, candidateHash: tamper && index === 0 ? candidateHashOf({ ...candidate, createdBy: 'test-someone-else' }) : candidateHashOf(candidate) };
    }),
  };
}

describe('G10-2 · an input changes after a quotation was issued: "Superseded", and the figures return to stage 2 labels', () => {
  test('G10-2 · before any change the record is current: the preliminary figure reads "Formal quotation" with the record id', () => {
    expect(row(OUTPUT.preliminaryEstimate).candidateId).not.toBeNull();
    const current = record(SNAPSHOT);
    const standing = quotationStanding(current, testCurrentInputs({ entries }));
    expect(standing).toEqual({ state: 'current' });
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate), records: [{ record: current, standing }], snapshotId: SNAPSHOT })).toEqual({
      stage: 'formal_quotation',
      quotationRecordId: current.id,
      superseded: null,
    });
    // A benchmark-only figure never becomes a formal quotation.
    expect(priceStageOf({ output: row(OUTPUT.indicativeRange), records: [{ record: current, standing }], snapshotId: SNAPSHOT }).stage).toBe('indicative_range');
  });

  test('G10-2 · a later document disagrees on an input after issue: superseded on that date, and the figure returns to its stage 2 label', () => {
    const issued = record(SNAPSHOT);
    const standing = quotationStanding(issued, testCurrentInputs({ entries: project(true) }));
    expect(standing).toEqual({ state: 'superseded', changedOn: AFTER_ISSUE });
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate), records: [{ record: issued, standing }], snapshotId: SNAPSHOT })).toEqual({
      stage: 'preliminary_investment_estimate',
      quotationRecordId: null,
      superseded: { recordId: issued.id, changedOn: AFTER_ISSUE },
    });
  });

  test('G10-2 · an input whose content no longer matches its hash supersedes the record too', () => {
    expect(quotationStanding(record(SNAPSHOT, true), testCurrentInputs({ entries })).state).toBe('superseded');
  });

  test('G10-2 · V-2 · A-3 · superseded with no dated change: the issue day as a timestamp with a zone, never the bare date', () => {
    // A record that lists no input, and one whose hash no longer matches while nothing dated changed on or after issue.
    expect(quotationStanding({ ...record(SNAPSHOT), inputs: [] }, testCurrentInputs({ entries }))).toEqual({ state: 'superseded', changedOn: '2026-09-26T00:00:00Z' });
    expect(quotationStanding(record(SNAPSHOT, true), testCurrentInputs({ entries }))).toEqual({ state: 'superseded', changedOn: '2026-09-26T00:00:00Z' });
    // An input the reader cannot place.
    expect(quotationStanding(record(SNAPSHOT), { fields: [] })).toEqual({ state: 'superseded', changedOn: '2026-09-26T00:00:00Z' });
  });

  test('G10-2 · V-4 · stage 1\'s figure never carries "Superseded": no quotation covers a benchmark-only figure', () => {
    const issued = record(SNAPSHOT);
    const standing = quotationStanding(issued, testCurrentInputs({ entries: project(true) }));
    expect(standing.state).toBe('superseded');
    expect(priceStageOf({ output: row(OUTPUT.indicativeRange), records: [{ record: issued, standing }], snapshotId: SNAPSHOT })).toEqual({
      stage: 'indicative_range',
      quotationRecordId: null,
      superseded: null,
    });
  });

  test('G10-2 · A-4 · an input Unknown at issue gets a value after issue: "Superseded" on that date, the stage 2 label, never "Formal quotation"', () => {
    // At issue the first automation area is Unknown: the TEST stage 2 formula ranges over its options, so the record
    // (a hash of every input candidate the run read) cannot list it.
    const area = automationFieldKey(AUTOMATION_AREAS[0]?.id ?? '');
    const atIssue = entries.map((entry) => (entry.definition.key === area ? { ...entry, candidates: [] } : entry));
    const catalogue: FormulaCatalogue = testCatalogue();
    let n = 0;
    const issueRun = runEngine(catalogue, testEngineInput({ projectId: PROJECT, entries: atIssue, subjects: { project: PROJECT, building: BUILDING } }), {
      newId: () => `test-cand-g10-2-a4-out-${String((n += 1))}`,
      at: testTime(10),
    });
    const stored = storedSnapshotOf({ id: 'test-snapshot-g10-2-a4', createdAt: testTime(10) }, snapshotRecordOf(issueRun, []));
    const stageTwo = stored.outputs.find((output) => output.output === OUTPUT.preliminaryEstimate);
    expect(stageTwo?.candidateId).not.toBeNull();
    const candidates = new Map(atIssue.flatMap((entry) => entry.candidates).map((candidate) => [candidate.id, candidate]));
    const issued: StoredQuotationRecord = {
      ...record(stored.id),
      inputs: issueRun.inputCandidateIds.map((candidateId) => {
        const candidate = candidates.get(candidateId);
        if (candidate === undefined) throw new Error(`no candidate ${candidateId}`);
        return { candidateId, candidateHash: candidateHashOf(candidate) };
      }),
    };
    // After issue the owner answers the area.
    const answered = atIssue.map((entry) =>
      entry.definition.key === area ? { ...entry, candidates: [{ ...ownerAnswer({ id: 'test-cand-g10-2-a4-area', subjectId: PROJECT, field: entry.definition, value: { choice: 'selected' }, minute: 1 }), createdAt: AFTER_ISSUE }] } : entry,
    );
    const now = testCurrentInputs({ entries: answered });
    const standing = quotationStanding(issued, now);
    expect(standing).toEqual({ state: 'current' }); // the record alone cannot see it
    const readsOf = (output: string): readonly string[] => catalogue.formulas.filter((formula) => formula.signature.outputs.includes(output)).flatMap((formula) => formula.signature.inputs);
    const changes = snapshotChanges(stored, now, readsOf);
    expect(changes.outOfDateOutputs.has(OUTPUT.preliminaryEstimate)).toBe(true);
    expect(changes.outOfDateOn.get(OUTPUT.preliminaryEstimate)).toBe(AFTER_ISSUE);
    if (stageTwo === undefined) throw new Error('no stage 2 row');
    const staleRow: SnapshotOutputRow = { output: stageTwo.output, formula: `${stageTwo.formulaId}@${stageTwo.formulaVersion}`, candidateId: stageTwo.candidateId, missing: stageTwo.missing, incomplete: stageTwo.incomplete, outOfDate: { changedOn: changes.outOfDateOn.get(OUTPUT.preliminaryEstimate) ?? null } };
    expect(priceStageOf({ output: staleRow, records: [{ record: issued, standing }], snapshotId: stored.id })).toEqual({
      stage: 'preliminary_investment_estimate',
      quotationRecordId: null,
      superseded: { recordId: issued.id, changedOn: AFTER_ISSUE },
    });
    // Control: the same row as generated (no input changed) reads "Formal quotation" with the record's id.
    expect(priceStageOf({ output: { ...staleRow, outOfDate: null }, records: [{ record: issued, standing }], snapshotId: stored.id }).stage).toBe('formal_quotation');
  });

  test('G10-2 · with no record naming the snapshot, the figure keeps its stage 2 label and nothing reads "Superseded"', () => {
    const elsewhere = record('test-snapshot-g10-2-other');
    const standing = quotationStanding(elsewhere, testCurrentInputs({ entries }));
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate), records: [{ record: elsewhere, standing }], snapshotId: SNAPSHOT })).toEqual({
      stage: 'preliminary_investment_estimate',
      quotationRecordId: null,
      superseded: null,
    });
    expect(priceStageOf({ output: row(OUTPUT.preliminaryEstimate), records: [], snapshotId: SNAPSHOT }).stage).toBe('preliminary_investment_estimate');
  });
});

// ---- The view-model half (B2's, folded in by the integrator, phase 5 part A; moved from tests/api/proposal-view.test.ts) ----

describe('G10-2 (the view-model half) · rule 10: a quotation record whose inputs changed', () => {
  it('G10-2 · G10-9 · US-ENGINEER-16 · R-129: current, the figure is a "Formal quotation" naming its record; after the input changed, "Superseded: inputs changed on <date>" and the stage 2 label', () => {
    const area = proposalOwnerAnswer(230, 'building.grossFloorArea', { quantity: { value: 1234, unit: 'm2', qualifier: 'gross_total' } });
    const before = testProposalFields({ candidates: [area.candidate], events: testEvents({ candidate: [area.event] }) });
    const figure = testEstimate(231, { output: 'capex.preliminaryEstimate', value: 92000, low: 81000, high: 108000, unit: 'EUR', inputCandidateIds: [area.candidate.id] });
    const rows = productionRows(before).rows.map((row) => (row.output === 'capex.preliminaryEstimate' ? { ...row, candidateId: figure.id, missing: [], incomplete: false } : row));
    const record: StoredQuotationRecord = {
      id: uuid(240),
      recordNumber: 'TEST-Q-1',
      reviewingEngineerId: uuid(241),
      commercialReviewerId: uuid(242),
      issuedOn: '2026-10-01',
      validUntil: '2026-12-31',
      currency: 'EUR',
      vatBasis: 'TEST VAT basis',
      proposalSnapshotId: SNAPSHOT_ID,
      inputs: [{ candidateId: area.candidate.id, candidateHash: candidateHashOf(area.candidate) }],
    };
    const current = proposalView(testProposalInput({ fields: before, rows, snapshotCandidates: [area.candidate, figure], records: [{ record, standing: standingOf(record, before) }] }));
    const currentPrice = current.view.headline.investment.price;
    expect(currentPrice.stageId).toBe('formal_quotation');
    expect(currentPrice.quotationRecordId).toBe(record.id);
    expect(displayById(current.displayObjects, currentPrice.stage ?? '').text).toBe('Formal quotation');
    expect(displayById(current.displayObjects, currentPrice.figure).quotationRecordId).toBe(record.id);

    const corrected: Candidate = { ...area.candidate, id: uuid(232), quantity: { value: 1300, unit: 'm2', qualifier: 'gross_total' }, createdAt: '2026-10-02T10:00:00.000000Z' };
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
    const standing = standingOf(record, after);
    expect(standing.state).toBe('superseded');
    const stale = proposalView(testProposalInput({ fields: after, rows, snapshotCandidates: [area.candidate, figure], records: [{ record, standing }] }));
    const price = stale.view.headline.investment.price;
    expect(price.stageId).toBe('preliminary_investment_estimate');
    expect(price.quotationRecordId).toBeNull();
    expect(displayById(stale.displayObjects, price.stage ?? '').text).toBe('Preliminary investment estimate');
    expect(displayById(stale.displayObjects, price.superseded ?? '').text).toBe('Superseded: inputs changed on 2 Oct 2026');
    const figureDisplay = displayById(stale.displayObjects, price.figure);
    expect(figureDisplay.quotationRecordId).toBeUndefined();
    expect((figureDisplay.lines ?? []).map((line) => line.text)).toEqual(expect.arrayContaining(['Preliminary investment estimate', 'Superseded: inputs changed on 2 Oct 2026']));
    expect(stale.displayObjects.some((display) => display.text === 'Formal quotation' || display.lines?.some((line) => line.text === 'Formal quotation') === true)).toBe(false);
  });
});

describe('G10-2 (the view-model half, phase 5 part B) · the issue day, and an input Unknown at issue', () => {
  const area = proposalOwnerAnswer(250, 'building.grossFloorArea', { quantity: { value: 1234, unit: 'm2', qualifier: 'gross_total' } });
  const figure = testEstimate(251, { output: 'capex.preliminaryEstimate', value: 92000, low: 81000, high: 108000, unit: 'EUR', inputCandidateIds: [area.candidate.id] });
  const before = testProposalFields({ candidates: [area.candidate], events: testEvents({ candidate: [area.event] }) });
  const rows = productionRows(before).rows.map((row) => (row.output === 'capex.preliminaryEstimate' ? { ...row, candidateId: figure.id, missing: [], incomplete: false } : row));
  const record: StoredQuotationRecord = {
    id: uuid(260),
    recordNumber: 'TEST-Q-2',
    reviewingEngineerId: uuid(261),
    commercialReviewerId: uuid(262),
    issuedOn: '2026-10-01',
    validUntil: '2026-12-31',
    currency: 'EUR',
    vatBasis: 'TEST VAT basis',
    proposalSnapshotId: SNAPSHOT_ID,
    inputs: [{ candidateId: area.candidate.id, candidateHash: candidateHashOf(area.candidate) }],
  };
  const texts = (displays: readonly { readonly text: string; readonly lines?: readonly { readonly text: string }[] }[]): string[] => displays.flatMap((display) => [display.text, ...(display.lines ?? []).map((line) => line.text)]);

  it('G10-2 · V-2 · A-3: a record superseded on its issue day reads "Superseded: inputs changed on 1 Oct 2026" and the proposal is built', () => {
    const empty = { ...record, inputs: [] };
    const standing = standingOf(empty, before);
    expect(standing).toEqual({ state: 'superseded', changedOn: '2026-10-01T00:00:00Z' });
    const built = proposalView(testProposalInput({ fields: before, rows, snapshotCandidates: [area.candidate, figure], records: [{ record: empty, standing }] }));
    const price = built.view.headline.investment.price;
    expect(price.stageId).toBe('preliminary_investment_estimate');
    expect(displayById(built.displayObjects, price.superseded ?? '').text).toBe('Superseded: inputs changed on 1 Oct 2026');
  });

  it('G10-2 · A-4: an input Unknown at issue answered after issue: the figure reads "Out of date, recalculating" beside the stage 2 label and "Superseded" on that date, never "Formal quotation"', () => {
    const rooms = proposalOwnerAnswer(252, FIELD.rooms, { quantity: { value: 20, unit: 'count', qualifier: 'guest_rooms' } });
    const changedAt = '2026-10-03T08:00:00.000000Z';
    const later = { candidate: { ...rooms.candidate, createdAt: changedAt }, event: { ...rooms.event, at: changedAt } };
    const after = testProposalFields({ candidates: [area.candidate, later.candidate], events: testEvents({ candidate: [area.event, later.event] }) });
    const standing = standingOf(record, after);
    expect(standing).toEqual({ state: 'current' }); // the record lists the area only
    const snapshot: StoredSnapshot = {
      id: SNAPSHOT_ID,
      createdAt: GENERATED_AT,
      inputsHash: 'sha256:TEST',
      candidateIds: [area.candidate.id, figure.id],
      outputs: rows.map((row) => {
        const at = row.formula.lastIndexOf('@');
        return { output: row.output, formulaId: row.formula.slice(0, at), formulaVersion: row.formula.slice(at + 1), candidateId: row.candidateId, missing: [...row.missing], incomplete: row.incomplete };
      }),
    };
    const readsOf = (output: string): readonly string[] => PRODUCTION_CATALOGUE.formulas.filter((formula) => formula.signature.outputs.includes(output)).flatMap((formula) => formula.signature.inputs);
    const changes = changesSince(snapshot, after, readsOf);
    expect(changes.outOfDateOn.get('capex.preliminaryEstimate')).toBe(changedAt);
    // The reader marks each out-of-date row as the API does (staleness `outOfDateOn` to the row's `outOfDate`).
    const read = rows.map((row) => (changes.outOfDateOutputs.has(row.output) ? { ...row, outOfDate: { changedOn: changes.outOfDateOn.get(row.output) ?? null } } : row));
    const built = proposalView(testProposalInput({ fields: after, rows: read, snapshotCandidates: [area.candidate, figure], records: [{ record, standing }], changes }));
    const price = built.view.headline.investment.price;
    expect(price.stageId).toBe('preliminary_investment_estimate');
    expect(price.quotationRecordId).toBeNull();
    expect(displayById(built.displayObjects, price.stage ?? '').text).toBe('Preliminary investment estimate');
    expect(displayById(built.displayObjects, price.superseded ?? '').text).toBe('Superseded: inputs changed on 3 Oct 2026');
    const shown = displayById(built.displayObjects, price.figure);
    expect(shown.text).toBe('Out of date, recalculating');
    expect(shown.quotationRecordId).toBeUndefined();
    expect(texts(built.displayObjects)).not.toContain('Formal quotation');
  });
});
