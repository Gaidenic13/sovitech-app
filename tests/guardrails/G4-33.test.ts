/**
 * G4-33 (docs/guardrails.md section 7; rule 4, "Routing": "Conflicts on owner fields go to the owner" and "Only the
 * right person's resolution closes a conflict. Each resolution records who, when and why"). Phase 1 review, round 5:
 * NP-1 of round 4's closing verification (an engineer's `rejected` event on one side of an owner-routed conflict
 * closed it, while the same engineer's `conflict_resolved` on the pair was refused).
 * Situation: on an owner field (`confirmBy` owner), two documents disagree on the building type, hotel and office,
 * and an engineer rejects office.
 * Expected: the field stays in conflict, routed to the owner.
 *
 * The rejection is listed among the events derive did not apply (`resolver_not_routed`), as the same engineer's
 * resolution is; the conflict stays on the owner's "For you" list. The controls: the owner's own rejection of office
 * closes the conflict (rule 4, the right person), and an engineer's rejection of a value outside any conflict still
 * holds (whether an engineer may set aside an owner fact there is proposal P-1-OWNER-FACT-REJECTION, not this case).
 * G4-32 is not used: round 4 indexed it and round 5 took the row back before the phase 1 commit, because its expected
 * result rests on a reading (build log, phase 1, round 5).
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type CandidateEvent, type FieldState } from '@sovitech/domain';
import { documentReading, testContext, testDocument, testEvents, testField, testTime, TEST_STAGE_ORDER } from './_support/builders';

const BUILDING = 'test-building-g4-33';
const buildingType = testField('test.building.type', {
  kind: 'enum',
  subject: 'building',
  options: ['hotel', 'office'],
  confirmBy: 'owner',
  confirmByBasis: 'use_and_occupancy',
});
const permit = testDocument('test-doc-g4-33-permit', 'test-project-g4-33', 'permit', { kind: 'architectural' });
const design = testDocument('test-doc-g4-33-design', 'test-project-g4-33', 'technical_design', { kind: 'architectural' });
const hotel = documentReading({ id: 'test-cand-g4-33-hotel', subjectId: BUILDING, field: buildingType, document: permit, value: { choice: 'hotel' }, minute: 1 });
const office = documentReading({ id: 'test-cand-g4-33-office', subjectId: BUILDING, field: buildingType, document: design, value: { choice: 'office' }, minute: 2 });
const context = testContext({ subjectId: BUILDING, documents: [permit, design], stageOrder: TEST_STAGE_ORDER });

function rejectedBy(candidateId: string, role: CandidateEvent['role'], by: string, minute: number): CandidateEvent {
  return { candidateId, type: 'rejected', by, role, at: testTime(minute), reason: 'TEST reason' };
}

function expectConflictForTheOwner(state: FieldState, label: string): void {
  expect(state.state, label).toBe('conflict');
  expect(state.activeCandidateId, label).toBeNull();
  expect(state.conflict?.routedTo, label).toBe('owner');
  expect(state.conflict?.candidateIds, label).toEqual([hotel.id, office.id].sort());
  expect(state.review, label).toEqual({ list: 'for_you', reason: 'conflict' });
}

test('F-VALUE-02 · G4-33: an engineer\'s rejection of office leaves the building type in conflict, routed to the owner', () => {
  expectConflictForTheOwner(derive(buildingType, [hotel, office], testEvents({}), context), 'before');
  const rejection = rejectedBy(office.id, 'sovitech_engineer', 'test-engineer', 3);
  const state = derive(buildingType, [hotel, office], testEvents({ candidate: [rejection] }), context);
  expectConflictForTheOwner(state, 'after');
  expect(state.candidates.find((candidate) => candidate.candidateId === office.id)?.status).toBe('eligible');
  expect(state.refusedEvents).toEqual([{ kind: 'candidate', event: rejection, refusal: 'resolver_not_routed' }]);

  // Property: whichever side the engineer rejects, how often and when, while the two documents disagree: from minute
  // 2, when office is read. A rejection made before then is judged against the field as it stood then, with one
  // document only (phase 2, NP-A; packages/domain/src/field-state.test.ts), which is not this case's situation.
  fc.assert(
    fc.property(fc.array(fc.tuple(fc.boolean(), fc.integer({ min: 2, max: 59 })), { minLength: 1, maxLength: 4 }), (drawn) => {
      const rejections = drawn.map(([onOffice, minute]) => rejectedBy(onOffice ? office.id : hotel.id, 'sovitech_engineer', 'test-engineer', minute));
      const after = derive(buildingType, [hotel, office], testEvents({ candidate: rejections }), context);
      expectConflictForTheOwner(after, JSON.stringify(drawn));
      expect(after.refusedEvents.every((refused) => refused.refusal === 'resolver_not_routed')).toBe(true);
      expect(after.refusedEvents).toHaveLength(rejections.length);
    }),
  );
});

test('F-VALUE-02 · G4-33 controls: the owner\'s own rejection of office closes the conflict; an engineer\'s rejection outside any conflict holds', () => {
  const byOwner = derive(buildingType, [hotel, office], testEvents({ candidate: [rejectedBy(office.id, 'owner', 'test-owner', 3)] }), context);
  expect(byOwner).toMatchObject({ state: 'known', activeCandidateId: hotel.id, refusedEvents: [] });

  const alone = derive(buildingType, [office], testEvents({ candidate: [rejectedBy(office.id, 'sovitech_engineer', 'test-engineer', 3)] }), context);
  expect(alone.candidates).toEqual([{ candidateId: office.id, verification: 'unverified', status: 'rejected', refusal: null }]);
  expect(alone.refusedEvents).toEqual([]);
});
