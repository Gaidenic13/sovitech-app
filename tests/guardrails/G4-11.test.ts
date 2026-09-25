/**
 * G4-11 (docs/guardrails.md section 7; rule 4 "An unknown qualifier is still compared"; rule 8 "Floors").
 * Situation: the owner entered 28 floors with no qualifier, and the memoriu gives 8S+P+28E.
 * Expected: one confirmation naming the upper-floor reading. The owner's value is compared, not ignored.
 *
 * The memoriu's regim de înălțime is held as the floor structure by level type
 * (rule 8): 8 below ground, 1 ground floor, 28 upper floors, each a document
 * reading with its qualifier. Reading "8S+P+28E" into that structure is the
 * parser's case (G8-9); here the readings are built as the extractor stores them.
 * Whether and where the confirmation is shown is the question engine's decision
 * (rule 5); derive names the reading it must confirm.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type Candidate } from '@sovitech/domain';
import {
  documentReading,
  ownerAnswer,
  ownerConfirmation,
  testContext,
  testDocument,
  testEvents,
  testField,
} from './_support/builders';

const PROJECT = 'test-project-g4-11';
const BUILDING = 'test-building-g4-11';

const floorsField = testField('test.building.floors', {
  kind: 'count',
  subject: 'building',
  unit: 'count',
  qualifierRequired: true,
  qualifiers: ['below_ground', 'ground', 'upper_floors'],
  confirmBy: 'owner',
});

const memoriu = testDocument('test-doc-g4-11-memoriu', PROJECT, 'technical_design');
const context = testContext({ subjectId: BUILDING, documents: [memoriu] });

type LevelType = 'below_ground' | 'ground' | 'upper_floors';

function floorStructure(belowGround: number, upperFloors: number): Record<LevelType, Candidate> {
  const reading = (qualifier: LevelType, value: number): Candidate =>
    documentReading({
      id: `test-cand-g4-11-${qualifier}`,
      subjectId: BUILDING,
      field: floorsField,
      document: memoriu,
      value: { quantity: { value, unit: 'count', qualifier } },
      minute: 30,
      page: 2,
    });
  return {
    below_ground: reading('below_ground', belowGround),
    ground: reading('ground', 1),
    upper_floors: reading('upper_floors', upperFloors),
  };
}

function expectOneConfirmationNaming(expected: LevelType, belowGround: number, upperFloors: number, owner: number): void {
  const structure = floorStructure(belowGround, upperFloors);
  const entered = ownerAnswer({
    id: 'test-cand-g4-11-owner',
    subjectId: BUILDING,
    field: floorsField,
    value: { quantity: { value: owner, unit: 'count' } },
    minute: 0,
  });

  const state = derive(
    floorsField,
    [entered, ...Object.values(structure)],
    testEvents({ candidate: [ownerConfirmation(entered)] }),
    context,
  );

  // One confirmation, naming the matching reading, for the owner's value: compared, not ignored.
  expect(state.readingsToConfirm).toEqual([
    { candidateId: entered.id, qualifier: expected, matchedCandidateIds: [structure[expected].id] },
  ]);
  expect(state.candidates).toContainEqual(expect.objectContaining({ candidateId: entered.id, status: 'eligible' }));
  expect(state.conflict).toBeNull();
}

test('F-VALUE-03 · G4-11: owner 28 floors with no qualifier, memoriu 8S+P+28E: one confirmation naming the upper floors', () => {
  expectOneConfirmationNaming('upper_floors', 8, 28, 28);

  // Property: whatever the floor structure, an unqualified count equal to exactly one level type's
  // count gets one confirmation naming that level type.
  fc.assert(
    fc.property(
      fc.integer({ min: 2, max: 12 }),
      fc.integer({ min: 2, max: 80 }),
      fc.constantFrom<LevelType>('below_ground', 'ground', 'upper_floors'),
      (belowGround, upperFloors, matching) => {
        fc.pre(belowGround !== upperFloors);
        const owner = matching === 'below_ground' ? belowGround : matching === 'ground' ? 1 : upperFloors;
        expectOneConfirmationNaming(matching, belowGround, upperFloors, owner);
      },
    ),
  );
});
