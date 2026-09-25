/**
 * G4-13 (docs/guardrails.md section 7; 2.3 "Revisions and removal"; rule 4).
 * Situation: Rev B, declared as a revision of Rev A, changes an unverified area.
 * Expected: Rev A's candidate is superseded, with no conflict. One notice lists the change.
 *
 * Rev B is declared through `supersedes` and a `declared_revision_of` event by the
 * owner (2.3: "Revisions are declared, never guessed"). The area has no tolerance,
 * so without the declaration the two readings would conflict. The notice is the
 * revision's change notice (revisionNotice); its wording ("Rev B changed <n>
 * values") is the status-line registry's.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, revisionNotice, type FieldDefinition } from '@sovitech/domain';
import { declaredRevision, documentReading, testContext, testDocument, testEvents, testField } from './_support/builders';

const PROJECT = 'test-project-g4-13';
const BUILDING = 'test-building-g4-13';

const areaField = (confirmBy: FieldDefinition['confirmBy']): FieldDefinition =>
  testField('test.building.gross_floor_area', { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total'], confirmBy });

const revA = testDocument('test-doc-g4-13-a-201-rev-a', PROJECT, 'technical_design', { revision: 'Rev. A' });
const revB = testDocument('test-doc-g4-13-a-201-rev-b', PROJECT, 'technical_design', { revision: 'Rev. B', supersedes: revA.id });
const documents = [revA, revB];
const record = (id: string) => documents.find((document) => document.id === id);

function expectSupersededNoConflictOneNotice(confirmBy: FieldDefinition['confirmBy'], revAArea: number, revBArea: number): void {
  const field = areaField(confirmBy);
  const fromRevA = documentReading({
    id: 'test-cand-g4-13-rev-a',
    subjectId: BUILDING,
    field,
    document: revA,
    value: { quantity: { value: revAArea, unit: 'm2', qualifier: 'gross_total' } },
    minute: 0,
  });
  const fromRevB = documentReading({
    id: 'test-cand-g4-13-rev-b',
    subjectId: BUILDING,
    field,
    document: revB,
    value: { quantity: { value: revBArea, unit: 'm2', qualifier: 'gross_total' } },
    minute: 60,
  });
  const documentEvents = [declaredRevision(revB, 30)];
  const candidates = [fromRevA, fromRevB];
  const state = derive(field, candidates, testEvents({ document: documentEvents }), testContext({ subjectId: BUILDING, documents }));

  // Rev A's candidate is superseded ...
  expect(state.candidates).toContainEqual(expect.objectContaining({ candidateId: fromRevA.id, status: 'superseded' }));
  // ... with no conflict.
  expect(state.state).toBe('known');
  expect(state.conflict).toBeNull();
  expect(state.activeCandidateId).toBe(fromRevB.id);
  // One notice lists the change.
  expect(revisionNotice(revB, [{ state, candidates }], documentEvents, record)).toEqual({
    revisionDocumentId: revB.id,
    changes: [
      { subjectId: BUILDING, fieldKey: field.key, fromCandidateId: fromRevA.id, toCandidateId: fromRevB.id, outcome: 'superseded' },
    ],
  });
}

test('F-VALUE-07 · G4-13: Rev B, declared a revision of Rev A, changes an unverified area: Rev A superseded, no conflict, one notice', () => {
  expectSupersededNoConflictOneNotice('owner', 2345, 2360);

  // Property: any change to the area, whoever confirms the field, as long as nobody checked Rev A's value.
  fc.assert(
    fc.property(
      fc.constantFrom<FieldDefinition['confirmBy']>('owner', 'either', 'engineer'),
      fc.integer({ min: 1, max: 1_000_000 }),
      fc.integer({ min: 1, max: 1_000_000 }),
      (confirmBy, revAArea, revBArea) => {
        fc.pre(revAArea !== revBArea);
        expectSupersededNoConflictOneNotice(confirmBy, revAArea, revBArea);
      },
    ),
  );
});
