/**
 * G4-7 (docs/guardrails.md section 7; rule 4 "Only like with like"; rule 8 "Area basis").
 * Situation: Scd 34,500 m² in a document, and the owner enters 27,600 m² usable.
 * Expected: no conflict. They are two fields.
 *
 * Checked both ways the registry may hold the two areas: as two fields (one per
 * basis), and as one area field whose candidates name their basis, where the two
 * are two facts that are never compared. The TEST fields have no tolerance, so any
 * compared difference would be a conflict.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type Candidate, type FieldDefinition } from '@sovitech/domain';
import {
  documentReading,
  ownerAnswer,
  ownerConfirmation,
  testContext,
  testDocument,
  testEvents,
  testField,
} from './_support/builders';

const PROJECT = 'test-project-g4-7';
const BUILDING = 'test-building-g4-7';

const areaEntry = { kind: 'quantity', subject: 'building', unit: 'm2', qualifierRequired: true, qualifiers: ['gross_total', 'usable'] } as const;
const grossAreaField = testField('test.building.gross_floor_area', areaEntry);
const usableAreaField = testField('test.building.usable_area', areaEntry);
const oneAreaField = testField('test.building.area', areaEntry);

const memoriu = testDocument('test-doc-g4-7-memoriu', PROJECT, 'technical_design');
const context = testContext({ subjectId: BUILDING, documents: [memoriu] });

function scdReading(field: FieldDefinition, value: number): Candidate {
  return documentReading({
    id: 'test-cand-g4-7-scd',
    subjectId: BUILDING,
    field,
    document: memoriu,
    value: { quantity: { value, unit: 'm2', qualifier: 'gross_total' } },
    minute: 0,
  });
}

function usableEntry(field: FieldDefinition, value: number): Candidate {
  return ownerAnswer({
    id: 'test-cand-g4-7-usable',
    subjectId: BUILDING,
    field,
    value: { quantity: { value, unit: 'm2', qualifier: 'usable' } },
    minute: 30,
  });
}

function expectNoConflict(scd: number, usable: number): void {
  // Two fields: each holds its own value, known, with no conflict.
  const scdCandidate = scdReading(grossAreaField, scd);
  const usableCandidate = usableEntry(usableAreaField, usable);
  const gross = derive(grossAreaField, [scdCandidate], testEvents({}), context);
  const net = derive(usableAreaField, [usableCandidate], testEvents({ candidate: [ownerConfirmation(usableCandidate)] }), context);
  expect(gross.state).toBe('known');
  expect(gross.conflict).toBeNull();
  expect(gross.activeCandidateId).toBe(scdCandidate.id);
  expect(net.state).toBe('known');
  expect(net.conflict).toBeNull();
  expect(net.activeCandidateId).toBe(usableCandidate.id);

  // One area field with both: two facts, never compared.
  const usableOnOneField = usableEntry(oneAreaField, usable);
  const area = derive(
    oneAreaField,
    [scdReading(oneAreaField, scd), usableOnOneField],
    testEvents({ candidate: [ownerConfirmation(usableOnOneField)] }),
    context,
  );
  expect(area.state).toBe('known');
  expect(area.conflict).toBeNull();
  expect(area.facts.map((fact) => [fact.qualifier, fact.activeCandidateId])).toEqual([
    ['gross_total', 'test-cand-g4-7-scd'],
    ['usable', 'test-cand-g4-7-usable'],
  ]);
}

test('F-VALUE-03 · G4-7: Scd 34,500 m² in a document, owner enters 27,600 m² usable: no conflict, two fields', () => {
  expectNoConflict(34500, 27600);

  // Property: whatever the two areas, a gross area and a usable area are never compared.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 1_000_000 }), fc.integer({ min: 1, max: 1_000_000 }), (scd, usable) => {
      expectNoConflict(scd, usable);
    }),
  );
});
