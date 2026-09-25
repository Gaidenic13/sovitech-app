/**
 * G4-19 (docs/guardrails.md section 7; rule 4 "An engineer's verification is never overruled by the owner").
 * Situation: the owner edits an engineer_verified value.
 * Expected: no rejected event. A conflict goes to the engineer.
 *
 * The edit is planned by the domain (planOwnerCorrection), appended, and the field
 * is derived again. The engineer's event is built in memory by the one builder file
 * that may (tests/guardrails/_support/builders.ts).
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, planOwnerCorrection, type FieldDefinition } from '@sovitech/domain';
import {
  documentReading,
  engineerVerificationInMemory,
  frozen,
  testContext,
  testDocument,
  testEvents,
  testField,
} from './_support/builders';

const PROJECT = 'test-project-g4-19';
const BUILDING = 'test-building-g4-19';

const areaField = (confirmBy: FieldDefinition['confirmBy']): FieldDefinition =>
  testField('test.building.gross_floor_area', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], confirmBy });

const schedule = testDocument('test-doc-g4-19-schedule', PROJECT, 'as_built');
const context = testContext({ subjectId: BUILDING, documents: [schedule] });

function expectNoRejectionConflictForEngineer(
  confirmBy: FieldDefinition['confirmBy'],
  checkedArea: number,
  ownerArea: number,
): void {
  const field = areaField(confirmBy);
  const engineerChecked = documentReading({
    id: 'test-cand-g4-19-engineer-checked',
    subjectId: BUILDING,
    field,
    document: schedule,
    value: { quantity: { value: checkedArea, unit: 'm2', qualifier: 'gross_total' } },
    minute: 0,
  });
  const verification = engineerVerificationInMemory(engineerChecked.id, 30);
  const candidates = frozen([engineerChecked]);
  const before = derive(field, candidates, testEvents({ candidate: [verification] }), context);
  expect(before.activeCandidateId).toBe(engineerChecked.id);

  const plan = planOwnerCorrection({
    projectId: PROJECT,
    field,
    state: before,
    shown: engineerChecked,
    value: { quantity: { value: ownerArea, unit: 'm2', qualifier: 'gross_total' } },
    candidateId: 'test-cand-g4-19-owner',
    by: 'test-owner',
    at: '2026-09-25T11:00:00.000Z',
  });
  const after = derive(
    field,
    [...candidates, plan.candidate],
    testEvents({ candidate: [verification, ...plan.candidateEvents] }),
    context,
  );

  // No rejected event.
  expect(plan.rejectsShown).toBe(false);
  expect(plan.candidateEvents.map((event) => event.type)).not.toContain('rejected');
  expect(after.candidates).toContainEqual(expect.objectContaining({ candidateId: engineerChecked.id, status: 'eligible' }));
  // A conflict goes to the engineer.
  expect(after.state).toBe('conflict');
  expect(after.conflict?.routedTo).toBe('engineer');
  expect(after.review?.list).toBe('sovitech_will_check');
}

test('F-VALUE-05 · G4-19: the owner edits an engineer_verified value: no rejected event, a conflict for the engineer', () => {
  expectNoRejectionConflictForEngineer('owner', 2345, 2400);

  // Property: any different value, whoever confirms the field (no tolerance: any difference disagrees).
  fc.assert(
    fc.property(
      fc.constantFrom<FieldDefinition['confirmBy']>('owner', 'either', 'engineer'),
      fc.integer({ min: 1, max: 1_000_000 }),
      fc.integer({ min: 1, max: 1_000_000 }),
      (confirmBy, checkedArea, ownerArea) => {
        fc.pre(checkedArea !== ownerArea);
        expectNoRejectionConflictForEngineer(confirmBy, checkedArea, ownerArea);
      },
    ),
  );
});
