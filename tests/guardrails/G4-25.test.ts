/**
 * G4-25 (docs/guardrails.md section 7; 2.3, "Revisions are declared, never guessed" and
 * "Deleting a document withdraws each candidate whose evidence comes only from that document";
 * 2.4, "Recalculation": the engine supersedes its own calculated candidate; rule 4, "Only the
 * right person's resolution closes a conflict"). Phase 1 review, adversarial finding 2 (high).
 * Situation: tender shows 6 AHUs and as-built shows 5, and a `superseded` event from the
 * system, or a `withdrawn` event that neither follows the removal of the value's document nor
 * comes from the value's own author, arrives on the as-built value.
 * Expected: the field stays in conflict, routed to the engineer.
 *
 * G4-6's situation, with an event appended that would otherwise take one value out of play
 * with no person deciding. Each such event is listed as refused. The controls: the engine
 * supersedes its own calculated candidate, and the system's withdrawal holds once the value's
 * document is actually erased.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type Candidate, type CandidateEvent, type DocumentEvent } from '@sovitech/domain';
import { TEST_STAGE_ORDER, documentReading, testContext, testDocument, testEvents, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g4-25';
const BUILDING = 'test-building-g4-25';

const ahuCount = testField('test.building.ahu_count_stated', {
  kind: 'count',
  subject: 'building',
  unit: 'count',
  qualifierRequired: true,
  qualifiers: ['ahu'],
  confirmBy: 'engineer',
});

const tender = testDocument('test-doc-g4-25-tender', PROJECT, 'tender', { kind: 'mep' });
const asBuilt = testDocument('test-doc-g4-25-as-built', PROJECT, 'as_built', { kind: 'mep' });

const reading = (id: string, document: typeof tender, value: number): Candidate =>
  documentReading({ id, subjectId: BUILDING, field: ahuCount, document, value: { quantity: { value, unit: 'count', qualifier: 'ahu' } }, minute: 0 });

const fromTender = reading('test-cand-g4-25-tender', tender, 6);
const fromAsBuilt = reading('test-cand-g4-25-as-built', asBuilt, 5);
const context = testContext({ subjectId: BUILDING, documents: [tender, asBuilt], stageOrder: TEST_STAGE_ORDER });

type Appended = Pick<CandidateEvent, 'type' | 'role'> & { readonly reason?: string; readonly by?: string };

/** Every event that would take the as-built value out of play with no person deciding. */
const OUT_OF_PLAY: readonly Appended[] = [
  { type: 'superseded', role: 'system' },
  { type: 'superseded', role: 'sovitech_engineer' },
  { type: 'superseded', role: 'owner' },
  { type: 'withdrawn', role: 'system' },
  { type: 'withdrawn', role: 'system', reason: 'document_erased' },
  { type: 'withdrawn', role: 'system', reason: 'document_deleted' },
  { type: 'withdrawn', role: 'owner' },
  { type: 'withdrawn', role: 'sovitech_engineer' },
];

function onAsBuilt(appended: Appended, minute: number): CandidateEvent {
  return {
    candidateId: fromAsBuilt.id,
    type: appended.type,
    by: appended.by ?? 'test-actor',
    role: appended.role,
    at: testTime(minute),
    ...(appended.reason === undefined ? {} : { reason: appended.reason }),
  };
}

function expectConflictForTheEngineer(appended: CandidateEvent): void {
  const state = derive(ahuCount, [fromTender, fromAsBuilt], testEvents({ candidate: [appended] }), context);
  expect(state.state).toBe('conflict');
  expect(state.review).toEqual({ list: 'sovitech_will_check', reason: 'conflict' });
  expect(state.candidates.find((candidate) => candidate.candidateId === fromAsBuilt.id)?.status).toBe('eligible');
  expect(state.refusedEvents.map((refused) => refused.event)).toEqual([appended]);
}

test('F-VALUE-02 · G4-25: a system supersession, or a withdrawal with no removed document, leaves tender 6 against as-built 5 in conflict for the engineer', () => {
  expect(derive(ahuCount, [fromTender, fromAsBuilt], testEvents({}), context)).toMatchObject({
    state: 'conflict',
    review: { list: 'sovitech_will_check', reason: 'conflict' },
  });
  for (const appended of OUT_OF_PLAY) expectConflictForTheEngineer(onAsBuilt(appended, 30));

  // Property: whichever such event, whenever it arrives.
  fc.assert(
    fc.property(fc.constantFrom(...OUT_OF_PLAY), fc.integer({ min: 1, max: 59 }), (appended, minute) => {
      expectConflictForTheEngineer(onAsBuilt(appended, minute));
    }),
  );
});

test('F-VALUE-02 · G4-25 controls: the engine supersedes its own calculation; the system withdraws a value once its document is erased', () => {
  const calculated = (id: string, value: number, minute: number): Candidate => ({
    id,
    subjectId: BUILDING,
    fieldKey: ahuCount.key,
    quantity: { value, unit: 'count', qualifier: 'ahu' },
    source: 'calculated',
    evidence: [],
    method: { formulaId: 'TEST-count', formulaVersion: '1.0.0', inputCandidateIds: ['test-cand-g4-25-input'], unknownPolicy: 'refuse', assumptions: [] },
    createdBy: 'test-engine',
    createdAt: testTime(minute),
  });
  const old = calculated('test-cand-g4-25-calc-old', 4, 0);
  const recalculated = calculated('test-cand-g4-25-calc-new', 5, 10);
  const byEngine: CandidateEvent = { candidateId: old.id, type: 'superseded', by: 'test-engine', role: 'system', at: testTime(10) };
  const engine = derive(ahuCount, [old, recalculated], testEvents({ candidate: [byEngine] }), context);
  expect(engine.candidates.find((candidate) => candidate.candidateId === old.id)?.status).toBe('superseded');
  expect(engine.activeCandidateId).toBe(recalculated.id);

  const erased: DocumentEvent = { documentId: asBuilt.id, type: 'erased', by: 'test-owner', role: 'owner', at: testTime(29) };
  const withdrawn = onAsBuilt({ type: 'withdrawn', role: 'system', reason: 'document_erased', by: 'test-erasure' }, 30);
  const removed = derive(ahuCount, [fromTender, fromAsBuilt], testEvents({ candidate: [withdrawn], document: [erased] }), context);
  expect(removed.candidates.find((candidate) => candidate.candidateId === fromAsBuilt.id)?.status).toBe('withdrawn');
  expect(removed).toMatchObject({ state: 'known', activeCandidateId: fromTender.id, refusedEvents: [] });
});
