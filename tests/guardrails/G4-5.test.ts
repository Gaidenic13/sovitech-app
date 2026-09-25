/**
 * G4-5 (docs/guardrails.md section 7; rule 4 "A correction is a resolution, not a conflict").
 * Situation: a confirmation shows 30 floors from a document, and the owner corrects it to 28.
 * Expected: the document candidate is rejected by the owner. No conflict, and no second question.
 *
 * The correction is planned by the domain (planOwnerCorrection), appended, and the
 * field is derived again from what was appended. "No second question": the derived
 * state puts nothing on the review step and asks for no confirmation.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, planOwnerCorrection, type FieldDefinition } from '@sovitech/domain';
import {
  documentReading,
  frozen,
  testContext,
  testDocument,
  testEvents,
  testField,
} from './_support/builders';

const PROJECT = 'test-project-g4-5';
const BUILDING = 'test-building-g4-5';

const floorsField = (confirmBy: FieldDefinition['confirmBy']): FieldDefinition =>
  testField('test.building.floors', { kind: 'count', subject: 'building', unit: 'count', qualifierRequired: true, qualifiers: ['upper_floors'], confirmBy });

const memoriu = testDocument('test-doc-g4-5-memoriu', PROJECT, 'technical_design');
const context = testContext({ subjectId: BUILDING, documents: [memoriu] });

function expectRejectedNoConflictNoSecondQuestion(
  confirmBy: FieldDefinition['confirmBy'],
  documentFloors: number,
  ownerFloors: number,
): void {
  const field = floorsField(confirmBy);
  const shown = documentReading({
    id: 'test-cand-g4-5-document',
    subjectId: BUILDING,
    field,
    document: memoriu,
    value: { quantity: { value: documentFloors, unit: 'count', qualifier: 'upper_floors' } },
    minute: 0,
  });
  const candidates = frozen([shown]);
  const before = derive(field, candidates, testEvents({}), context);
  // The confirmation showed the document value as the field's value.
  expect(before.activeCandidateId).toBe(shown.id);

  const plan = planOwnerCorrection({
    projectId: PROJECT,
    field,
    state: before,
    shown,
    value: { quantity: { value: ownerFloors, unit: 'count' } },
    candidateId: 'test-cand-g4-5-owner',
    by: 'test-owner',
    at: '2026-09-25T10:00:00.000Z',
  });
  const after = derive(field, [...candidates, plan.candidate], testEvents({ candidate: plan.candidateEvents }), context);

  // The document candidate is rejected by the owner.
  expect(plan.candidateEvents).toContainEqual(
    expect.objectContaining({ candidateId: shown.id, type: 'rejected', role: 'owner' }),
  );
  expect(after.candidates).toContainEqual(expect.objectContaining({ candidateId: shown.id, status: 'rejected' }));
  // No conflict: the owner's value is the field's value.
  expect(after.state).toBe('known');
  expect(after.conflict).toBeNull();
  expect(after.activeCandidateId).toBe(plan.candidate.id);
  // No second question.
  expect(after.review).toBeNull();
  expect(after.readingsToConfirm).toEqual([]);
}

test('F-VALUE-05 · G4-5: the owner corrects 30 floors from a document to 28: document rejected by the owner, no conflict, no second question', () => {
  expectRejectedNoConflictNoSecondQuestion('owner', 30, 28);

  // Property: any correction to a different count, on a field the owner confirms.
  fc.assert(
    fc.property(
      fc.constantFrom<FieldDefinition['confirmBy']>('owner', 'either'),
      fc.nat({ max: 200 }),
      fc.nat({ max: 200 }),
      (confirmBy, documentFloors, ownerFloors) => {
        fc.pre(documentFloors !== ownerFloors);
        expectRejectedNoConflictNoSecondQuestion(confirmBy, documentFloors, ownerFloors);
      },
    ),
  );
});
