/**
 * G4-35 (docs/guardrails.md section 7; rule 4, "Candidates that disagree put the field in conflict", with the conflict
 * test over eligible candidates, and "Only the right person's resolution closes a conflict"; 2.4, "Eligible means not
 * rejected, superseded or withdrawn" and "Everything that happens to them later is an append-only event"; rule 5, "Never
 * ask twice"). Phase 2: NP-A of round 5's closing verification (a rejection that held when it was made came undone when
 * a value that disagreed arrived later, and the field went into a new conflict over the rejected value).
 * Situation: on an owner field (`confirmBy` owner), the owner rejects the building type "office", read from the only
 * document, without a value of their own; later a second document says "hotel", and an engineer verifies "hotel".
 * Expected: the field is known on "hotel", with "office" still rejected and no conflict.
 *
 * The owner is the person an owner field's conflicts go to, and no conflict was open when the owner rejected "office",
 * so the rejection holds. What arrives later (a reading, then a verification that would route a conflict to the
 * engineer) is compared with the values still eligible; the rejected one is not among them, so nobody is asked about it
 * again. The control: the same rejection made after "hotel" arrived and carried an `engineer_verified` event takes a side of a conflict routed
 * to the engineer, which the owner may not resolve, and stays refused (`resolver_not_routed`).
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type CandidateEvent } from '@sovitech/domain';
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

const BUILDING = 'test-building-g4-35';
const buildingType = testField('test.building.type', {
  kind: 'enum',
  subject: 'building',
  options: ['hotel', 'office'],
  confirmBy: 'owner',
  confirmByBasis: 'use_and_occupancy',
});
const design = testDocument('test-doc-g4-35-design', 'test-project-g4-35', 'technical_design', { kind: 'architectural' });
const permit = testDocument('test-doc-g4-35-permit', 'test-project-g4-35', 'permit', { kind: 'architectural' });
const office = documentReading({ id: 'test-cand-g4-35-office', subjectId: BUILDING, field: buildingType, document: design, value: { choice: 'office' }, minute: 1 });
const context = testContext({ subjectId: BUILDING, documents: [design, permit], stageOrder: TEST_STAGE_ORDER });

function ownerRejects(minute: number): CandidateEvent {
  return { candidateId: office.id, type: 'rejected', by: 'test-owner', role: 'owner', at: testTime(minute), reason: 'TEST reason' };
}

test('F-VALUE-02 · F-VALUE-04 · G4-35: the owner\'s rejection of the only reading holds when a reading that disagrees arrives later and an engineer verifies it', () => {
  const rejection = ownerRejects(2);
  const then = derive(buildingType, [office], testEvents({ candidate: [rejection] }), context);
  expect(then.candidates).toEqual([{ candidateId: office.id, verification: 'unverified', status: 'rejected', refusal: null }]);

  // Property: whenever the second document is read, and its value checked by an engineer, after the rejection.
  fc.assert(
    fc.property(fc.integer({ min: 3, max: 30 }), fc.integer({ min: 0, max: 29 }), (readAt, after) => {
      const hotel = documentReading({ id: 'test-cand-g4-35-hotel', subjectId: BUILDING, field: buildingType, document: permit, value: { choice: 'hotel' }, minute: readAt });
      const engineerCheck = engineerVerificationInMemory(hotel.id, readAt + after);
      const state = derive(buildingType, [office, hotel], testEvents({ candidate: [rejection, engineerCheck] }), context);
      expect(state).toMatchObject({ state: 'known', activeCandidateId: hotel.id, conflict: null, review: null, refusedEvents: [] });
      expect(state.candidates.find((candidate) => candidate.candidateId === office.id)?.status).toBe('rejected');
    }),
  );
});

test('F-VALUE-02 · F-VALUE-04 · G4-35 control: the same rejection made after "hotel" arrived with an `engineer_verified` event is refused, and the conflict stays with the engineer', () => {
  const hotel = documentReading({ id: 'test-cand-g4-35-hotel', subjectId: BUILDING, field: buildingType, document: permit, value: { choice: 'hotel' }, minute: 3 });
  const rejection = ownerRejects(5);
  const state = derive(buildingType, [office, hotel], testEvents({ candidate: [engineerVerificationInMemory(hotel.id, 4), rejection] }), context);
  expect(state).toMatchObject({ state: 'conflict', activeCandidateId: null, conflict: { routedTo: 'engineer' }, review: { list: 'sovitech_will_check', reason: 'conflict' } });
  expect(state.refusedEvents).toEqual([{ kind: 'candidate', event: rejection, refusal: 'resolver_not_routed' }]);
});
