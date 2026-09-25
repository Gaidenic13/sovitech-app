/**
 * G8-13 (docs/guardrails.md section 7; rule 8, "Ambiguous readings keep both ... It is never
 * silently read one way"; rule 1, "Ranges need a basis": ambiguous readings are a basis for a
 * range, not a value). Phase 1 review, adversarial finding 9: the derive half of G8-12.
 * Situation: a lone candidate "1.500 kW" carries both readings, 1.5 and 1500.
 * Expected: no active value: the field reads neither one.
 *
 * The one candidate, with its two alternatives and low confidence, forms one fact marked
 * ambiguous with no active candidate; the field is provisional, and a calculation that read it
 * is stale, so an engine must work over the options (range_over_options). The control: a
 * candidate whose alternatives read the same value is not ambiguous.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type Candidate } from '@sovitech/domain';
import { documentReading, testContext, testDocument, testEvents, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g8-13';
const CHILLER = 'test-asset-g8-13-chiller';

const capacity = testField('test.asset.cooling_capacity', {
  kind: 'quantity',
  subject: 'asset',
  unit: 'kW',
  qualifierRequired: true,
  qualifiers: ['cooling_output'],
  confirmBy: 'engineer',
});

const table = testDocument('test-doc-g8-13-table', PROJECT, 'technical_design', { kind: 'mep' });
const context = testContext({ subjectId: CHILLER, documents: [table] });

function ambiguous(small: number, large: number): Candidate {
  const reading = documentReading({
    id: 'test-cand-g8-13',
    subjectId: CHILLER,
    field: capacity,
    document: table,
    value: { quantity: { value: large, unit: 'kW', qualifier: 'cooling_output' } },
    minute: 0,
  });
  return {
    ...reading,
    alternatives: [
      { value: small, unit: 'kW', qualifier: 'cooling_output' },
      { value: large, unit: 'kW', qualifier: 'cooling_output' },
    ],
    confidence: 'low',
  };
}

test('F-VALUE-02 · G8-13: a lone "1.500 kW" read as 1.5 or 1500 has no active value; the field reads neither', () => {
  const candidate = ambiguous(1.5, 1500);
  const state = derive(capacity, [candidate], testEvents({}), context);
  expect(state.state).toBe('known');
  expect(state.activeCandidateId).toBeNull();
  expect(state.provisional).toBe(true);
  expect(state.facts).toEqual([expect.objectContaining({ ambiguous: true, activeCandidateId: null, candidateIds: [candidate.id] })]);

  // Property: whichever two readings differ.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 999 }), (whole) => {
      const derived = derive(capacity, [ambiguous(whole, whole * 1000)], testEvents({}), context);
      expect(derived.activeCandidateId).toBeNull();
      expect(derived.facts[0]?.ambiguous).toBe(true);
    }),
  );
});

test('F-VALUE-02 · G8-13: a calculation that read the ambiguous value is stale: it has no single input value', () => {
  const candidate = ambiguous(1.5, 1500);
  const read = derive(capacity, [candidate], testEvents({}), context);
  const calculated: Candidate = {
    id: 'test-cand-g8-13-calc',
    subjectId: CHILLER,
    fieldKey: capacity.key,
    quantity: { value: 3000, unit: 'kW', qualifier: 'cooling_output' },
    source: 'calculated',
    evidence: [],
    method: { formulaId: 'TEST-sum', formulaVersion: '1.0.0', inputCandidateIds: [candidate.id], unknownPolicy: 'refuse', assumptions: [] },
    createdBy: 'test-engine',
    createdAt: testTime(5),
  };
  const states = new Map([[candidate.id, read]]);
  expect(derive(capacity, [calculated], testEvents({}), testContext({ subjectId: CHILLER, documents: [table], inputStates: states }))).toMatchObject({
    stale: true,
    provisional: true,
  });
});

test('F-VALUE-02 · G8-13 control: alternatives that read the same value are no ambiguity', () => {
  const plain = { ...ambiguous(1500, 1500) };
  expect(derive(capacity, [plain], testEvents({}), context)).toMatchObject({ state: 'known', activeCandidateId: plain.id });
});
