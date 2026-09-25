// @pending-until: phase 1 derive
/**
 * G4-2 (docs/guardrails.md section 7; rule 4 "Conflict test").
 * Situation: 34,500 m² and 34,480 m², same basis, tolerance 1%.
 * Expected: no conflict.
 */
import fc from 'fast-check';
import { expect } from 'vitest';
import {
  NO_EVENTS,
  derive,
  type Candidate,
  type DeriveContext,
  type DocumentRecord,
  type FieldDefinition,
} from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

const PROJECT = 'test-project-g4-2';
const BUILDING = 'test-building-g4-2';

const areaField: FieldDefinition = {
  key: 'test.building.gross_floor_area',
  label: 'TEST gross floor area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  qualifierRequired: true,
  estimation: 'forbidden',
  tolerance: { relative: 0.01, reason: 'TEST: the 1% tolerance case G4-2 names' },
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};

const documentFor = (index: number): DocumentRecord => ({
  id: `test-doc-g4-2-${index}`,
  projectId: PROJECT,
  contentHash: `sha256:test-g4-2-${index}`,
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
});

/** One document reading per value, each from its own document, arriving in array order. */
function readings(values: readonly number[]): Candidate[] {
  return values.map((value, index) => {
    const document = documentFor(index);
    return {
      id: `test-cand-g4-2-${index}`,
      subjectId: BUILDING,
      fieldKey: areaField.key,
      quantity: { value, unit: 'm2', qualifier: 'gross_total' },
      source: 'document',
      evidence: [
        {
          documentId: document.id,
          contentHash: document.contentHash,
          locator: { page: 1 },
          excerpt: `Scd = ${value} mp`,
          check: 'text_match',
        },
      ],
      createdBy: 'test-extractor',
      createdAt: new Date(Date.UTC(2026, 8, 25, 9, index)).toISOString(),
    };
  });
}

/** Enough documents for the longest list the property draws (five values). */
const documents: readonly DocumentRecord[] = Array.from({ length: 5 }, (_, index) => documentFor(index));

const context: DeriveContext = {
  document: (id) => documents.find((document) => document.id === id),
  inputState: () => undefined,
  datasetApproved: () => false,
};

function expectNoConflict(values: readonly number[]): void {
  const state = derive(areaField, readings(values), NO_EVENTS, context);
  expect(state.conflict).toBeNull();
  expect(state.state).toBe('known');
}

pending('F-VALUE-03 · G4-2: 34,500 m² and 34,480 m², same basis, tolerance 1%: no conflict', () => {
  expectNoConflict([34500, 34480]);
  expectNoConflict([34480, 34500]);

  // Property: every set of same-basis values whose whole spread stays within 1% of the
  // largest, in any arrival order, including a spread equal to the tolerance.
  fc.assert(
    fc.property(
      fc.integer({ min: 1000, max: 10_000_000 }).chain((largest) =>
        fc.tuple(
          fc.constant(largest),
          fc.array(fc.integer({ min: largest - Math.floor(largest / 100), max: largest }), {
            minLength: 1,
            maxLength: 4,
          }),
          fc.nat({ max: 4 }),
        ),
      ),
      ([largest, others, position]) => {
        const at = Math.min(position, others.length);
        expectNoConflict([...others.slice(0, at), largest, ...others.slice(at)]);
      },
    ),
  );
});
