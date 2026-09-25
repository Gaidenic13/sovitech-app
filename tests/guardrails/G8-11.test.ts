/**
 * G8-11 (docs/guardrails.md section 7; rule 4 "Only like with like"; rule 8 "Area rules").
 * Situation: a room's `usable` area from one source (26.4 m²) and its `gross_total` area from a second source (24.1 m²).
 * Expected: no conflict: each is stored under its own basis, and no ratio between them is assumed.
 *
 * The TEST area field has no tolerance, so any two values it compared would
 * conflict. The room is a TEST zone subject.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive } from '@sovitech/domain';
import { documentReading, frozen, testContext, testDocument, testEvents, testField } from './_support/builders';

const PROJECT = 'test-project-g8-11';
const ROOM = 'test-zone-g8-11-room';

const BASES = ['footprint', 'gross_total', 'usable', 'heated_usable', 'conditioned'] as const;
type Basis = (typeof BASES)[number];

const roomAreaField = testField('test.zone.area', { kind: 'quantity', subject: 'zone', unit: 'm2', qualifierRequired: true, qualifiers: BASES });

const areaSchedule = testDocument('test-doc-g8-11-area-schedule', PROJECT, 'technical_design');
const roomSheet = testDocument('test-doc-g8-11-room-sheet', PROJECT, 'as_built');
const context = testContext({ subjectId: ROOM, documents: [areaSchedule, roomSheet] });

function expectEachUnderItsOwnBasis(firstBasis: Basis, firstValue: number, secondBasis: Basis, secondValue: number): void {
  const first = documentReading({
    id: 'test-cand-g8-11-first',
    subjectId: ROOM,
    field: roomAreaField,
    document: areaSchedule,
    value: { quantity: { value: firstValue, unit: 'm2', qualifier: firstBasis } },
    minute: 0,
  });
  const second = documentReading({
    id: 'test-cand-g8-11-second',
    subjectId: ROOM,
    field: roomAreaField,
    document: roomSheet,
    value: { quantity: { value: secondValue, unit: 'm2', qualifier: secondBasis } },
    minute: 30,
  });
  const candidates = frozen([first, second]);

  const state = derive(roomAreaField, candidates, testEvents({}), context);

  // No conflict.
  expect(state.state).toBe('known');
  expect(state.conflict).toBeNull();
  expect(state.conflicts).toEqual([]);
  // Each is stored under its own basis: two facts, each holding only its own reading.
  const byBasis = new Map(state.facts.map((fact) => [fact.qualifier, fact]));
  expect(byBasis.get(firstBasis)?.candidateIds).toEqual([first.id]);
  expect(byBasis.get(firstBasis)?.activeCandidateId).toBe(first.id);
  expect(byBasis.get(secondBasis)?.candidateIds).toEqual([second.id]);
  expect(byBasis.get(secondBasis)?.activeCandidateId).toBe(second.id);
  // No ratio is assumed: no basis is read from another, and no confirmation ties them.
  expect(state.facts).toHaveLength(2);
  expect(state.readingsToConfirm).toEqual([]);
  expect(candidates).toHaveLength(2);
}

test('F-VALUE-03 · G8-11: a room\'s usable area 26.4 m² and gross_total area 24.1 m² from two sources: no conflict, each under its own basis', () => {
  expectEachUnderItsOwnBasis('usable', 26.4, 'gross_total', 24.1);

  // Property: any two known, different bases, any two values (any ratio between them).
  fc.assert(
    fc.property(
      fc.constantFrom(...BASES),
      fc.constantFrom(...BASES),
      fc.double({ min: 0.1, max: 100_000, noNaN: true }),
      fc.double({ min: 0.1, max: 100_000, noNaN: true }),
      (firstBasis, secondBasis, firstValue, secondValue) => {
        fc.pre(firstBasis !== secondBasis);
        expectEachUnderItsOwnBasis(firstBasis, firstValue, secondBasis, secondValue);
      },
    ),
  );
});
