/** What changed since a snapshot or a quotation record (docs/adr/0048; 2.4 "Recalculation"; rule 10; G9-10, G10-2 run the TEST formulas). */
import { describe, expect, test } from 'vitest';
import { NO_EVENTS, derive, type Candidate, type CandidateEvent, type DocumentEvent, type FieldDefinition } from '@sovitech/domain';
import { unitByCode } from '@sovitech/registry';
import { candidateHashOf } from './snapshot';
import { quotationStanding, snapshotChanges, type CurrentInputs, type StoredQuotationRecord, type StoredSnapshot } from './staleness';

const FIELD: FieldDefinition = { key: 'project.TEST_answer', label: 'TEST answer', subject: 'project', kind: 'enum', options: ['TEST_a', 'TEST_b'], estimation: 'forbidden', criticality: 'optional', affects: [], impactRank: 1, confirmBy: 'owner' };
const at = (day: number, hour = 9): string => new Date(Date.UTC(2026, 8, day, hour)).toISOString();
const candidate = (id: string, choice: string, createdAt: string, documentId?: string): Candidate => ({
  id,
  subjectId: 'test-p',
  fieldKey: FIELD.key,
  choice,
  source: documentId === undefined ? 'user' : 'document',
  evidence: documentId === undefined ? [] : [{ documentId, contentHash: `sha256:${documentId}`, locator: { page: 1 }, excerpt: `TEST ${choice}`, check: 'text_match' }],
  createdBy: 'test-author',
  authorRole: documentId === undefined ? 'owner' : 'system',
  createdAt,
});

function current(candidates: readonly Candidate[], events: readonly CandidateEvent[] = [], documentEvents: readonly DocumentEvent[] = []): CurrentInputs {
  const state = derive(FIELD, candidates, { ...NO_EVENTS, candidate: events, document: documentEvents }, {
    subjectId: 'test-p',
    document: (id) => ({ id, projectId: 'test-p', contentHash: `sha256:${id}`, kind: 'other', stage: 'unknown', analysis: { status: 'analysed', coverage: 'TEST' } }),
    unit: unitByCode,
    inputState: () => undefined,
    datasetApproved: () => false,
  });
  return { fields: [{ subjectId: 'test-p', fieldKey: FIELD.key, state, candidates, events }], documentEvents };
}

const snapshot = (candidateIds: readonly string[]): StoredSnapshot => ({
  id: 'test-snapshot',
  createdAt: at(25),
  inputsHash: 'sha256:TEST',
  candidateIds,
  outputs: [{ output: 'TEST.out', formulaId: 'TEST-f', formulaVersion: '1.0.0', candidateId: 'test-out', missing: [], incomplete: false }],
});
const readsOf = (output: string): readonly string[] => (output === 'TEST.out' ? [FIELD.key] : []);

describe('ADR 0048 · staleness', () => {
  test('a field that had no value at generation and has one now is a change, dated by the new candidate', () => {
    const changes = snapshotChanges(snapshot([]), current([candidate('test-c1', 'TEST_a', at(26))]), readsOf);
    expect(changes.changedFields).toEqual([{ subjectId: 'test-p', fieldKey: FIELD.key }]);
    expect([...changes.outOfDateOutputs]).toEqual(['TEST.out']);
    expect(changes.changedOn).toBe(at(26));
  });

  test('a document withdrawn after generation dates the change by its document event', () => {
    const value = candidate('test-c1', 'TEST_a', at(20), 'test-doc');
    const withdrawn: DocumentEvent = { documentId: 'test-doc', type: 'withdrawn', by: 'test-owner', role: 'owner', at: at(27), reason: 'TEST' };
    const changes = snapshotChanges(snapshot(['test-c1']), current([value], [], [withdrawn]), readsOf);
    expect(changes.changedFields).toEqual([{ subjectId: 'test-p', fieldKey: FIELD.key }]);
    expect(changes.changedOn).toBe(at(27));
  });

  test('rule 10 · a record with a date-only issue day is superseded by a change on or after that day; current otherwise', () => {
    const value = candidate('test-c1', 'TEST_a', at(20));
    const record: StoredQuotationRecord = {
      id: 'test-q',
      recordNumber: 'TEST-1',
      reviewingEngineerId: 'test-engineer',
      commercialReviewerId: 'test-commercial-reviewer',
      issuedOn: '2026-09-26',
      validUntil: '2026-10-26',
      currency: 'EUR',
      vatBasis: 'TEST',
      proposalSnapshotId: 'test-snapshot',
      inputs: [{ candidateId: value.id, candidateHash: candidateHashOf(value) }],
    };
    expect(quotationStanding(record, current([value]))).toEqual({ state: 'current' });
    const rejected: CandidateEvent = { candidateId: value.id, type: 'rejected', by: 'test-owner', role: 'owner', at: at(26, 15) };
    const corrected = candidate('test-c2', 'TEST_b', at(26, 15));
    expect(quotationStanding(record, current([value, corrected], [rejected]))).toEqual({ state: 'superseded', changedOn: at(26, 15) });
    // An input the caller does not hand over cannot be shown current.
    expect(quotationStanding(record, { fields: [] }).state).toBe('superseded');
    // A record with no input lists nothing it could be current about.
    expect(quotationStanding({ ...record, inputs: [] }, current([value])).state).toBe('superseded');
  });

  test('V-2 · A-3 · rule 10 · a superseded record with no dated change answers its issue day as a timestamp with a zone, never the bare date', () => {
    const value = candidate('test-c1', 'TEST_a', at(20));
    const record: StoredQuotationRecord = {
      id: 'test-q',
      recordNumber: 'TEST-1',
      reviewingEngineerId: 'test-engineer',
      commercialReviewerId: 'test-commercial-reviewer',
      issuedOn: '2026-09-26',
      validUntil: '2026-10-26',
      currency: 'EUR',
      vatBasis: 'TEST',
      proposalSnapshotId: 'test-snapshot',
      inputs: [{ candidateId: value.id, candidateHash: candidateHashOf(value) }],
    };
    expect(quotationStanding({ ...record, inputs: [] }, current([value]))).toEqual({ state: 'superseded', changedOn: '2026-09-26T00:00:00Z' });
    expect(quotationStanding(record, { fields: [] })).toEqual({ state: 'superseded', changedOn: '2026-09-26T00:00:00Z' });
    // A hash that no longer matches, with no record of the change dated on or after issue.
    expect(quotationStanding({ ...record, inputs: [{ candidateId: value.id, candidateHash: 'sha256:TEST-other' }] }, current([value]))).toEqual({ state: 'superseded', changedOn: '2026-09-26T00:00:00Z' });
  });

  test('A-4 · `outOfDateOn` dates each out-of-date output by the first change among the fields it reads, or null', () => {
    const other: FieldDefinition = { ...FIELD, key: 'project.TEST_other', label: 'TEST other' };
    const otherState = derive(other, [], { ...NO_EVENTS }, { subjectId: 'test-p', document: () => undefined, unit: unitByCode, inputState: () => undefined, datasetApproved: () => false });
    const now = current([candidate('test-c1', 'TEST_a', at(26))]);
    const withOther: CurrentInputs = { fields: [...now.fields, { subjectId: 'test-p', fieldKey: other.key, state: otherState, candidates: [], events: [] }] };
    const twoOutputs: StoredSnapshot = { ...snapshot([]), outputs: [...snapshot([]).outputs, { output: 'TEST.unread', formulaId: 'TEST-g', formulaVersion: '1.0.0', candidateId: 'test-out-2', missing: [], incomplete: false }] };
    const changes = snapshotChanges(twoOutputs, withOther, (output) => (output === 'TEST.out' ? [FIELD.key] : [other.key]));
    expect([...changes.outOfDateOn]).toEqual([['TEST.out', at(26)]]);
    expect(changes.outOfDateOutputs.has('TEST.unread')).toBe(false);
    // A change no record dates (the value that decided the field no longer does, with no event after generation, as a
    // change of the registry reads): null.
    const unknownState = current([]).fields[0]?.state;
    if (unknownState === undefined) throw new Error('no TEST field');
    const gone = snapshotChanges(snapshot(['test-c1']), { fields: [{ subjectId: 'test-p', fieldKey: FIELD.key, state: unknownState, candidates: [candidate('test-c1', 'TEST_a', at(20))], events: [] }] }, readsOf);
    expect([...gone.outOfDateOutputs]).toEqual(['TEST.out']);
    expect(gone.outOfDateOn.get('TEST.out')).toBeNull();
  });
});
