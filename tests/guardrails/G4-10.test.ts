/**
 * G4-10 (docs/guardrails.md section 7; rule 4 "Conflict test", "What is compared").
 * Situation: area candidates 34,500, 34,200 and 33,900 m², same basis, tolerance 1%.
 * Expected: conflict, because the spread is 1.7%.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { unitByCode } from '@sovitech/registry';
import {
  NO_EVENTS,
  derive,
  type Candidate,
  type DeriveContext,
  type DocumentRecord,
  type FieldDefinition,
} from '@sovitech/domain';

const BUILDING = 'test-building-g4-10';

const areaField: FieldDefinition = {
  key: 'test.building.gross_floor_area',
  label: 'TEST gross floor area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  qualifierRequired: true,
  qualifiers: ['gross_total'],
  estimation: 'forbidden',
  tolerance: { relative: 0.01, reason: 'TEST: the 1% tolerance case G4-10 names' },
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};

const documentFor = (index: number): DocumentRecord => ({
  id: `test-doc-g4-10-${index}`,
  projectId: 'test-project-g4-10',
  contentHash: `sha256:test-g4-10-${index}`,
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
});

/** One document reading per value, each from its own document, arriving in array order. */
function readings(values: readonly number[]): { candidates: Candidate[]; context: DeriveContext } {
  const documents = values.map((_, index) => documentFor(index));
  const candidates = values.map((value, index): Candidate => {
    const document = documentFor(index);
    return {
      id: `test-cand-g4-10-${index}`,
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
  const context: DeriveContext = {
    subjectId: BUILDING,
    document: (id) => documents.find((document) => document.id === id),
    unit: unitByCode,
    inputState: () => undefined,
    datasetApproved: () => false,
  };
  return { candidates, context };
}

function expectConflict(values: readonly number[]): void {
  const { candidates, context } = readings(values);
  const state = derive(areaField, candidates, NO_EVENTS, context);
  expect(state.state).toBe('conflict');
}

/** Every ordering of a short list. */
function orderings<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) =>
    orderings([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

test('F-VALUE-03 · G4-10: 34,500, 34,200 and 33,900 m², same basis, tolerance 1%: conflict over the 1.7% spread', () => {
  // Each neighbouring pair is within 1%; the whole spread is not. Every arrival order.
  for (const order of orderings([34500, 34200, 33900])) expectConflict(order);

  // Property: steps that each stay within the tolerance never drift past it unnoticed.
  fc.assert(
    fc.property(
      fc
        .integer({ min: 10_000, max: 1_000_000 })
        .chain((largest) =>
          fc.tuple(
            fc.constant(largest),
            fc.integer({ min: Math.ceil(largest / 800), max: Math.floor(largest / 200) }),
          ),
        )
        .chain(([largest, step]) => {
          const steps = Math.floor(largest / (100 * step)) + 1;
          const values = Array.from({ length: steps + 1 }, (_, index) => largest - index * step);
          return fc.shuffledSubarray(values, { minLength: values.length, maxLength: values.length });
        }),
      (values) => {
        const largest = Math.max(...values);
        const smallest = Math.min(...values);
        const sorted = [...values].sort((a, b) => b - a);
        // Oracle, in integers: each neighbour within 1% of the larger value, the whole spread beyond it.
        sorted.slice(1).forEach((value, index) => {
          const previous = sorted[index] ?? value;
          expect(100 * (previous - value)).toBeLessThanOrEqual(previous);
        });
        expect(100 * (largest - smallest)).toBeGreaterThan(largest);
        expectConflict(values);
      },
    ),
  );
});
