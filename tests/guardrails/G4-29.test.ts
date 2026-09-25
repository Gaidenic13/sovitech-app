/**
 * G4-29 (docs/guardrails.md section 7; rule 4, "If it matches none, the field is in conflict"
 * and "Only the right person's resolution closes a conflict"). Phase 1 review, verifier
 * finding 11.
 * Situation: a value with no qualifier matches no qualified reading, and the person the
 * conflict is routed to resolves it by choosing one reading.
 * Expected: the conflict closes.
 *
 * A TEST owner field (confirmBy owner): the owner entered 28 with no qualifier, and the
 * documents give 30 upper floors and 8 below ground. The owner, shown all three, chooses the
 * upper-floor reading; the unqualified value is set aside with that fact and stays eligible.
 * The control: the same resolution from someone the conflict is not routed to (the system)
 * closes nothing.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type FieldEvent } from '@sovitech/domain';
import { documentReading, ownerAnswer, testContext, testDocument, testEvents, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g4-29';
const BUILDING = 'test-building-g4-29';

const floors = testField('test.building.floors', {
  kind: 'count',
  subject: 'building',
  unit: 'count',
  qualifierRequired: true,
  qualifiers: ['upper_floors', 'below_ground'],
  confirmBy: 'owner',
});

const memoriu = testDocument('test-doc-g4-29-memoriu', PROJECT, 'technical_design');
const context = testContext({ subjectId: BUILDING, documents: [memoriu] });

const upper = documentReading({ id: 'test-cand-g4-29-upper', subjectId: BUILDING, field: floors, document: memoriu, value: { quantity: { value: 30, unit: 'count', qualifier: 'upper_floors' } }, minute: 0 });
const below = documentReading({ id: 'test-cand-g4-29-below', subjectId: BUILDING, field: floors, document: memoriu, value: { quantity: { value: 8, unit: 'count', qualifier: 'below_ground' } }, minute: 0 });
const own = ownerAnswer({ id: 'test-cand-g4-29-own', subjectId: BUILDING, field: floors, value: { quantity: { value: 28, unit: 'count' } }, minute: 2 });

function choosing(chosen: string, role: FieldEvent['role'], minute: number): FieldEvent {
  return {
    subjectId: BUILDING,
    fieldKey: floors.key,
    type: 'conflict_resolved',
    by: role === 'system' ? 'test-job' : 'test-owner',
    role,
    at: testTime(minute),
    reason: 'TEST: the owner meant the upper floors',
    chosenCandidateId: chosen,
    coveredCandidateIds: [upper.id, below.id, own.id],
  };
}

test('F-VALUE-04 · G4-29: a value with no qualifier matching no reading is closed by the routed person choosing a reading', () => {
  const open = derive(floors, [upper, below, own], testEvents({}), context);
  expect(open.state).toBe('conflict');
  expect(open.conflict?.kind).toBe('unqualified_matches_none');

  const closed = derive(floors, [upper, below, own], testEvents({ field: [choosing(upper.id, 'owner', 10)] }), context);
  expect(closed.state).toBe('known');
  expect(closed.conflicts).toEqual([]);
  expect(closed.facts.find((fact) => fact.qualifier === 'upper_floors')?.setAsideIds).toEqual([own.id]);
  expect(closed.candidates.find((candidate) => candidate.candidateId === own.id)?.status).toBe('eligible');

  // Property: whichever qualified reading is chosen, whenever.
  fc.assert(
    fc.property(fc.constantFrom(upper.id, below.id), fc.integer({ min: 3, max: 59 }), (chosen, minute) => {
      expect(derive(floors, [upper, below, own], testEvents({ field: [choosing(chosen, 'owner', minute)] }), context).state).toBe('known');
    }),
  );
});

test('F-VALUE-04 · G4-29 control: the same resolution from someone the conflict is not routed to closes nothing', () => {
  const state = derive(floors, [upper, below, own], testEvents({ field: [choosing(upper.id, 'system', 10)] }), context);
  expect(state.state).toBe('conflict');
});
