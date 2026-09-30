/**
 * G4-34 (docs/guardrails.md section 7; rule 4, "Routing": "A conflict in which any candidate is engineer_verified goes
 * to the engineer queue, whatever the field's `confirmBy`" and "Only the right person's resolution closes a conflict.
 * Each resolution records who, when and why"; rule 4, "An engineer's verification is never overruled by the owner").
 * Phase 1 review, round 5: R5-4, the owner's mirror of G4-33, found while fixing NP-1 (on an owner field, the owner's
 * rejection of one side of a conflict routed to the engineer, with no value of their own, closed it, while the owner's
 * `conflict_resolved` on the pair was refused). Drafted in phase 1 and indexed in phase 2 by the integrator.
 * Situation: on an owner field (`confirmBy` owner), two documents disagree on the building type, hotel and office, an
 * engineer verifies hotel, and the owner rejects office without a value of their own.
 * Expected: the field stays in conflict, routed to the engineer.
 *
 * The rejection is listed among the events derive did not apply (`resolver_not_routed`), as the owner's resolution of
 * the same pair is; the conflict stays under "SOVITECH will check". The property draws the owner's rejections while
 * the conflict is routed to the engineer: after both readings and the verification exist (phase 2, NP-A: a rejection
 * is judged against the field as it stood when it was made). The controls: without the verification the conflict is
 * the owner's and the owner's rejection closes it (G4-33's control); the engineer's own rejection of office closes the
 * conflict routed to the engineer (rule 4, the right person).
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type CandidateEvent, type FieldState } from '@sovitech/domain';
import {
  documentReading,
  engineerVerificationInMemory,
  testContext,
  testDocument,
  testEvents,
  testField,
  testTime,
  TEST_STAGE_ORDER,
} from './_support/builders';

const BUILDING = 'test-building-g4-34';
const buildingType = testField('test.building.type', {
  kind: 'enum',
  subject: 'building',
  options: ['hotel', 'office'],
  confirmBy: 'owner',
  confirmByBasis: 'use_and_occupancy',
});
const permit = testDocument('test-doc-g4-34-permit', 'test-project-g4-34', 'permit', { kind: 'architectural' });
const design = testDocument('test-doc-g4-34-design', 'test-project-g4-34', 'technical_design', { kind: 'architectural' });
const hotel = documentReading({ id: 'test-cand-g4-34-hotel', subjectId: BUILDING, field: buildingType, document: permit, value: { choice: 'hotel' }, minute: 1 });
const office = documentReading({ id: 'test-cand-g4-34-office', subjectId: BUILDING, field: buildingType, document: design, value: { choice: 'office' }, minute: 2 });
const context = testContext({ subjectId: BUILDING, documents: [permit, design], stageOrder: TEST_STAGE_ORDER });
/** An engineer's verification of hotel at minute 3, once both documents disagree. */
const hotelChecked = engineerVerificationInMemory(hotel.id, 3);

function rejectedBy(candidateId: string, role: CandidateEvent['role'], by: string, minute: number): CandidateEvent {
  return { candidateId, type: 'rejected', by, role, at: testTime(minute), reason: 'TEST reason' };
}

function expectConflictForTheEngineer(state: FieldState, label: string): void {
  expect(state.state, label).toBe('conflict');
  expect(state.activeCandidateId, label).toBeNull();
  expect(state.conflict?.routedTo, label).toBe('engineer');
  expect(state.conflict?.candidateIds, label).toEqual([hotel.id, office.id].sort());
  expect(state.review, label).toEqual({ list: 'sovitech_will_check', reason: 'conflict' });
}

test("F-VALUE-02 · G4-34: the owner's rejection of office, with no value of their own, leaves the building type in conflict, routed to the engineer, once hotel carries an engineer's verification", () => {
  expectConflictForTheEngineer(derive(buildingType, [hotel, office], testEvents({ candidate: [hotelChecked] }), context), 'before');
  const rejection = rejectedBy(office.id, 'owner', 'test-owner', 4);
  const state = derive(buildingType, [hotel, office], testEvents({ candidate: [hotelChecked, rejection] }), context);
  expectConflictForTheEngineer(state, 'after');
  expect(state.candidates.find((candidate) => candidate.candidateId === office.id)?.status).toBe('eligible');
  expect(state.refusedEvents).toEqual([{ kind: 'candidate', event: rejection, refusal: 'resolver_not_routed' }]);

  // Property: however often and whenever the owner rejects office, while the conflict is routed to the engineer (from
  // minute 3, when the engineer's verification of hotel is recorded).
  fc.assert(
    fc.property(fc.array(fc.integer({ min: 3, max: 59 }), { minLength: 1, maxLength: 4 }), (minutes) => {
      const rejections = minutes.map((minute) => rejectedBy(office.id, 'owner', 'test-owner', minute));
      const after = derive(buildingType, [hotel, office], testEvents({ candidate: [hotelChecked, ...rejections] }), context);
      expectConflictForTheEngineer(after, JSON.stringify(minutes));
      expect(after.refusedEvents).toHaveLength(rejections.length);
      expect(after.refusedEvents.every((refused) => refused.refusal === 'resolver_not_routed')).toBe(true);
    }),
  );
});

test("F-VALUE-02 · G4-34 controls: without the verification the owner's rejection closes the owner's conflict; the engineer's own rejection closes the engineer's", () => {
  const forTheOwner = derive(buildingType, [hotel, office], testEvents({ candidate: [rejectedBy(office.id, 'owner', 'test-owner', 4)] }), context);
  expect(forTheOwner).toMatchObject({ state: 'known', activeCandidateId: hotel.id, refusedEvents: [] });

  const byTheEngineer = derive(buildingType, [hotel, office], testEvents({ candidate: [hotelChecked, rejectedBy(office.id, 'sovitech_engineer', 'test-engineer', 4)] }), context);
  expect(byTheEngineer).toMatchObject({ state: 'known', activeCandidateId: hotel.id, refusedEvents: [] });
  expect(byTheEngineer.candidates.find((candidate) => candidate.candidateId === office.id)?.status).toBe('rejected');
});
