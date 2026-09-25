/**
 * Document status and revision supersession (docs/guardrails.md 2.3, "Revisions
 * are declared, never guessed"; F-VALUE-07). Every value is TEST data.
 */
import { describe, expect, test } from 'vitest';
import {
  ERASURE_EVENT_REASON,
  derive,
  documentStatuses,
  revisionNotice,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DocumentEvent,
  type DocumentRecord,
  type FieldDefinition,
} from './index';

const record = (id: string, supersedes?: string): DocumentRecord => ({
  id,
  projectId: 'test-project',
  contentHash: `sha256:${id}`,
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
  ...(supersedes === undefined ? {} : { supersedes }),
});
const revA = record('test-rev-a');
const revB = record('test-rev-b', revA.id);
const revC = record('test-rev-c', revB.id);
const lookup = (id: string) => [revA, revB, revC].find((doc) => doc.id === id);

const declared = (doc: DocumentRecord, role: DocumentEvent['role'] = 'owner'): DocumentEvent => ({
  documentId: doc.id,
  type: 'declared_revision_of',
  by: 'test-person',
  role,
  at: '2026-09-25T10:00:00.000Z',
});

describe('documentStatuses', () => {
  test('a declared revision supersedes its predecessor, through a chain', () => {
    const statuses = documentStatuses([declared(revB), declared(revC)], lookup);
    expect(statuses.status(revA.id)).toBe('superseded');
    expect([...statuses.successors(revA.id)].sort()).toEqual([revB.id, revC.id]);
    expect(statuses.status(revC.id)).toBe('active');
  });

  test('an undeclared `supersedes`, or one the system declared, supersedes nothing (upload order never decides)', () => {
    expect(documentStatuses([], lookup).status(revA.id)).toBe('active');
    expect(documentStatuses([declared(revB, 'system')], lookup).status(revA.id)).toBe('active');
  });

  test('withdrawn and erased documents are removed; a removed revision supersedes nothing', () => {
    const withdrawn: DocumentEvent = { ...declared(revB), type: 'withdrawn' };
    const statuses = documentStatuses([declared(revB), withdrawn], lookup);
    expect(statuses.status(revB.id)).toBe('withdrawn');
    expect(statuses.removed(revB.id)).toBe(true);
    expect(statuses.status(revA.id)).toBe('active');
    expect(documentStatuses([{ ...declared(revA), type: 'erased' }], lookup).status(revA.id)).toBe('erased');
  });

  test('a document is withdrawn by the owner or an engineer, by the system only for a person\'s withdrawal it names, and erased by the owner or the erasure function (2.3; rule 13; rounds 4 and 5)', () => {
    const removal = (
      type: 'withdrawn' | 'erased',
      role: DocumentEvent['role'],
      reason?: string,
      by = 'test-person',
      extra: Pick<DocumentEvent, 'id' | 'requestEventId' | 'documentId'> | Record<string, never> = {},
    ): DocumentEvent => ({
      documentId: revA.id,
      type,
      by,
      role,
      at: '2026-09-25T10:00:00.000Z',
      ...(reason === undefined ? {} : { reason }),
      ...extra,
    });
    const byOwner = removal('withdrawn', 'owner', undefined, 'test-owner', { id: 'test-event-owner', documentId: revA.id });
    const byEngineer = removal('withdrawn', 'sovitech_engineer', undefined, 'test-engineer', { id: 'test-event-engineer', documentId: revA.id });
    const onRevB = removal('withdrawn', 'owner', undefined, 'test-owner', { id: 'test-event-rev-b', documentId: revB.id });
    const job = (requestEventId: string): DocumentEvent =>
      removal('withdrawn', 'system', 'document_deleted', 'test-job', { id: `test-job-${requestEventId}`, requestEventId, documentId: revA.id });
    // Held: the owner's and an engineer's own withdrawal (2.3 names both), the job carrying out either, the owner's
    // erasure, and the erasure function's erasure as the system with its reason.
    for (const events of [
      [byOwner],
      [byEngineer],
      [byOwner, job(byOwner.id ?? '')],
      [byEngineer, job(byEngineer.id ?? '')],
      [removal('erased', 'owner')],
      [removal('erased', 'system', ERASURE_EVENT_REASON)],
    ]) {
      const label = events.map((event) => `${event.type}/${event.role}`).join(' ');
      const statuses = documentStatuses(events, lookup);
      expect(statuses.removed(revA.id), label).toBe(true);
      expect(statuses.status(revA.id), label).toBe(events[0]?.type);
      expect(statuses.refused, label).toEqual([]);
    }
    // Refused: the system with no person's withdrawal behind it, or naming one of another document or none at all;
    // an erasure by an engineer or by the system without the erasure function's reason; an event naming nobody.
    const unnamed = removal('withdrawn', 'system', 'document_deleted', 'test-job', { id: 'test-job-unnamed', requestEventId: 'test-event-missing', documentId: revA.id });
    for (const [event, refusal] of [
      [removal('withdrawn', 'system', 'document_deleted'), 'withdrawal_without_request'],
      [removal('withdrawn', 'system', ERASURE_EVENT_REASON), 'withdrawal_without_request'],
      [unnamed, 'withdrawal_without_request'],
      [removal('erased', 'system', 'TEST reason'), 'erasure_outside_function'],
      [removal('erased', 'system'), 'erasure_outside_function'],
      [removal('erased', 'sovitech_engineer', ERASURE_EVENT_REASON), 'erasure_outside_function'],
      [removal('withdrawn', 'owner', undefined, ' '), 'by_missing'],
      [removal('withdrawn', 'sovitech_engineer', undefined, ''), 'by_missing'],
    ] as const) {
      const statuses = documentStatuses([event], lookup);
      const label = `${event.type}/${event.role}/${event.reason ?? '-'}/${event.requestEventId ?? '-'}`;
      expect(statuses.removed(revA.id), label).toBe(false);
      expect(statuses.status(revA.id), label).toBe('active');
      expect(statuses.refused, label).toEqual([{ event, refusal }]);
    }
    // A job naming the owner's withdrawal of another document removes nothing here.
    const elsewhere = documentStatuses([onRevB, job(onRevB.id ?? '')], lookup);
    expect(elsewhere.removed(revA.id)).toBe(false);
    expect(elsewhere.removed(revB.id)).toBe(true);
    expect(elsewhere.refused.map((entry) => entry.refusal)).toEqual(['withdrawal_without_request']);
    // A job naming a person's withdrawal that names nobody removes nothing either.
    const nameless = removal('withdrawn', 'owner', undefined, '', { id: 'test-event-nameless', documentId: revA.id });
    expect(documentStatuses([nameless, job('test-event-nameless')], lookup).refused.map((entry) => entry.refusal)).toEqual(['by_missing', 'withdrawal_without_request']);
    // A refused withdrawal of a revision leaves the revision in force; an engineer's withdrawal of it holds.
    const byJob = removal('withdrawn', 'system', 'document_deleted');
    expect(documentStatuses([declared(revB), { ...byJob, documentId: revB.id }], lookup).status(revA.id)).toBe('superseded');
    expect(documentStatuses([declared(revB), { ...byEngineer, documentId: revB.id }], lookup).status(revA.id)).toBe('active');
  });
});

describe('documentStatuses: a declaration is corrected, never a cycle (phase 1 adversarial finding)', () => {
  const docA = record('test-doc-a');
  const docB = record('test-doc-b');
  const docC = record('test-doc-c');
  const docD = record('test-doc-d');
  const all = (id: string) => [docA, docB, docC, docD].find((doc) => doc.id === id);
  const declares = (revision: DocumentRecord, predecessor: DocumentRecord, minute: number): DocumentEvent => ({
    documentId: revision.id,
    type: 'declared_revision_of',
    by: 'test-owner',
    role: 'owner',
    at: `2026-09-25T10:${String(minute).padStart(2, '0')}:00.000000Z`,
    revisionOf: predecessor.id,
  });

  test('declaring B a revision of A after A a revision of B corrects the first: only A is superseded', () => {
    const statuses = documentStatuses([declares(docA, docB, 1), declares(docB, docA, 2)], all);
    expect(statuses.status(docA.id)).toBe('superseded');
    expect(statuses.status(docB.id)).toBe('active');
    // The order the events are passed in never matters.
    const reversed = documentStatuses([declares(docB, docA, 2), declares(docA, docB, 1)], all);
    expect(reversed.status(docA.id)).toBe('superseded');
    expect(reversed.status(docB.id)).toBe('active');
  });

  test('the same correction read from the records alone, when the events carry no target', () => {
    const recA = record('test-doc-a', docB.id);
    const recB = record('test-doc-b', docA.id);
    const byRecord = (id: string) => [recA, recB].find((doc) => doc.id === id);
    const strip = (event: DocumentEvent): DocumentEvent => ({ documentId: event.documentId, type: event.type, by: event.by, role: event.role, at: event.at });
    const statuses = documentStatuses([strip(declares(recA, recB, 1)), strip(declares(recB, recA, 2))], byRecord);
    expect(statuses.status(recA.id)).toBe('superseded');
    expect(statuses.status(recB.id)).toBe('active');
  });

  test('two opposite declarations at the same time cancel each other: neither document is superseded', () => {
    const statuses = documentStatuses([declares(docA, docB, 1), declares(docB, docA, 1)], all);
    expect(statuses.status(docA.id)).toBe('active');
    expect(statuses.status(docB.id)).toBe('active');
  });

  test('a declaration that closes a longer cycle is ignored with the whole cycle; a revision from outside it still holds', () => {
    const cycle = [declares(docA, docB, 1), declares(docB, docC, 2), declares(docC, docA, 3)];
    const statuses = documentStatuses(cycle, all);
    for (const doc of [docA, docB, docC]) expect(statuses.status(doc.id)).toBe('active');
    const withD = documentStatuses([...cycle, declares(docD, docA, 4)], all);
    expect(withD.status(docA.id)).toBe('superseded');
    expect([...withD.successors(docA.id)]).toEqual([docD.id]);
  });

  test('a later declaration by one revision replaces its earlier one', () => {
    const statuses = documentStatuses([declares(docC, docA, 1), declares(docC, docB, 2)], all);
    expect(statuses.status(docA.id)).toBe('active');
    expect(statuses.status(docB.id)).toBe('superseded');
  });

  test("derive keeps both documents' values after a corrected mistake: they are compared, not turned Unknown", () => {
    const area: FieldDefinition = {
      key: 'test.building.area',
      label: 'TEST area',
      subject: 'building',
      kind: 'quantity',
      unit: 'm2',
      qualifierRequired: true,
      qualifiers: ['gross_total'],
      estimation: 'forbidden',
      criticality: 'optional',
      affects: [],
      impactRank: 1,
      confirmBy: 'owner',
    };
    const reading = (id: string, doc: DocumentRecord, value: number): Candidate => ({
      id,
      subjectId: 'test-building',
      fieldKey: area.key,
      quantity: { value, unit: 'm2', qualifier: 'gross_total' },
      source: 'document',
      evidence: [{ documentId: doc.id, contentHash: doc.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
      createdBy: 'test-extractor',
      createdAt: '2026-09-25T09:00:00.000Z',
    });
    const context: DeriveContext = {
      subjectId: 'test-building',
      document: all,
      unit: (code) => (code === 'm2' ? { code, symbol: 'm²', dimension: 'area' } : undefined),
      inputState: () => undefined,
      datasetApproved: () => false,
    };
    const candidates = [reading('test-from-a', docA, 1000), reading('test-from-b', docB, 1200)];
    const sameTime = derive(area, candidates, { candidate: [], field: [], document: [declares(docA, docB, 1), declares(docB, docA, 1)] }, context);
    expect(sameTime.state).toBe('conflict');
    expect(sameTime.candidates.map((candidate) => candidate.status)).toEqual(['eligible', 'eligible']);
    const corrected = derive(area, candidates, { candidate: [], field: [], document: [declares(docA, docB, 1), declares(docB, docA, 2)] }, context);
    expect(corrected).toMatchObject({ state: 'known', activeCandidateId: 'test-from-b' });
  });
});

describe('derive with a declared revision (2.3)', () => {
  const area: FieldDefinition = {
    key: 'test.building.area',
    label: 'TEST area',
    subject: 'building',
    kind: 'quantity',
    unit: 'm2',
    qualifierRequired: true,
    qualifiers: ['gross_total', 'usable'],
    estimation: 'forbidden',
    criticality: 'optional',
    affects: [],
    impactRank: 1,
    confirmBy: 'owner',
  };
  const reading = (id: string, doc: DocumentRecord, value: number, qualifier = 'gross_total'): Candidate => ({
    id,
    subjectId: 'test-building',
    fieldKey: area.key,
    quantity: { value, unit: 'm2', qualifier },
    source: 'document',
    evidence: [{ documentId: doc.id, contentHash: doc.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
    createdBy: 'test-extractor',
    createdAt: '2026-09-25T09:00:00.000Z',
  });
  const context: DeriveContext = {
    subjectId: 'test-building',
    document: lookup,
    unit: (code) => (code === 'm2' ? { code, symbol: 'm²', dimension: 'area' } : undefined),
    inputState: () => undefined,
    datasetApproved: () => false,
  };

  test("the new revision's candidate supersedes the old one for the same fact: no conflict", () => {
    const state = derive(area, [reading('test-old', revA, 1000), reading('test-new', revB, 1200)], { candidate: [], field: [], document: [declared(revB)] }, context);
    expect(state.state).toBe('known');
    expect(state.activeCandidateId).toBe('test-new');
    expect(state.candidates.find((c) => c.candidateId === 'test-old')?.status).toBe('superseded');
  });

  test('without the declaration the two are compared: a conflict, never a silent choice by upload order', () => {
    const state = derive(area, [reading('test-old', revA, 1000), reading('test-new', revB, 1200)], { candidate: [], field: [], document: [] }, context);
    expect(state.state).toBe('conflict');
  });

  test('a user_confirmed value is never superseded silently: the new value puts the field in conflict', () => {
    const ownerCheck: CandidateEvent = { candidateId: 'test-old', type: 'user_confirmed', by: 'test-owner', role: 'owner', at: '2026-09-25T09:30:00.000Z' };
    const state = derive(
      area,
      [reading('test-old', revA, 1000), reading('test-new', revB, 1200)],
      { candidate: [ownerCheck], field: [], document: [declared(revB)] },
      context,
    );
    expect(state.state).toBe('conflict');
  });

  test('the notice lists a checked value the revision changed as a conflict, and an unchanged value not at all', () => {
    const ownerCheck: CandidateEvent = { candidateId: 'test-old', type: 'user_confirmed', by: 'test-owner', role: 'owner', at: '2026-09-25T09:30:00.000Z' };
    const events = { candidate: [ownerCheck], field: [], document: [declared(revB)] };
    const changed = [reading('test-old', revA, 1000), reading('test-new', revB, 1200)];
    const state = derive(area, changed, events, context);
    expect(revisionNotice(revB, [{ state, candidates: changed }], events.document, lookup).changes).toEqual([
      { subjectId: 'test-building', fieldKey: area.key, fromCandidateId: 'test-old', toCandidateId: 'test-new', outcome: 'conflict' },
    ]);
    const unchanged = [reading('test-old', revA, 1000), reading('test-new', revB, 1000)];
    const same = derive(area, unchanged, { candidate: [], field: [], document: [declared(revB)] }, context);
    expect(revisionNotice(revB, [{ state: same, candidates: unchanged }], [declared(revB)], lookup).changes).toEqual([]);
  });

  test('a value only the old revision had stays visible, marked from a superseded revision', () => {
    const state = derive(area, [reading('test-old', revA, 1000)], { candidate: [], field: [], document: [declared(revB)] }, context);
    expect(state.state).toBe('known');
    expect(state.activeCandidateId).toBe('test-old');
    expect(state.statusLines).toContain('from_superseded_revision');
  });

  test('a new revision supersedes only the same fact: another basis stays', () => {
    const state = derive(
      area,
      [reading('test-old', revA, 1000, 'usable'), reading('test-new', revB, 1200, 'gross_total')],
      { candidate: [], field: [], document: [declared(revB)] },
      context,
    );
    expect(state.candidates.find((c) => c.candidateId === 'test-old')?.status).toBe('eligible');
  });
});
