// @pending-until: phase 2 verify-proposal
/**
 * G1-10 (docs/guardrails.md section 7; rule 1 "Values not written literally become
 * inferences, and the AI never derives quantities"; 2.1).
 * Situation: the AI returns a chiller capacity as ai_inference, with evidence from
 * the area schedule.
 * Expected: rejected, because an inferred quantity other than a direct count is not
 * allowed. The field stays unknown.
 *
 * The evidence itself passes checks 1 to 4 (it is a real location in this project's
 * area schedule), so the rejection comes from the inference limit alone.
 */
import fc from 'fast-check';
import { expect } from 'vitest';
import {
  NO_EVENTS,
  derive,
  verifyProposal,
  type Candidate,
  type CandidateProposal,
  type DeriveContext,
  type DocumentRecord,
  type FieldDefinition,
  type ProposalContext,
} from '@sovitech/domain';
import { unitByCode } from '@sovitech/registry';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

const PROJECT = 'test-project-g1-10';

const capacityField = (estimation: FieldDefinition['estimation']): FieldDefinition => ({
  key: 'test.asset.cooling_capacity',
  label: 'TEST chiller cooling capacity',
  subject: 'asset',
  kind: 'quantity',
  unit: 'kW',
  qualifierRequired: true,
  estimation,
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'engineer',
});

const areaSchedule: DocumentRecord = {
  id: 'test-doc-g1-10-area-schedule',
  projectId: PROJECT,
  contentHash: 'sha256:test-g1-10-area-schedule',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST pages 1-2 of 2' },
};

const EXCERPT = 'Suprafata utila totala: 1.234,5 mp';

function contextFor(field: FieldDefinition): ProposalContext {
  return {
    projectId: PROJECT,
    field,
    document: (id) => (id === areaSchedule.id ? areaSchedule : undefined),
    textAt: (documentId, contentHash, locator) =>
      documentId === areaSchedule.id && contentHash === areaSchedule.contentHash && locator.page === 2
        ? { text: `TEST Tablou de suprafete. ${EXCERPT}.`, layer: 'text' }
        : undefined,
    readQuantities: (text) => (text === EXCERPT ? [{ value: 1234.5, unit: 'm2' }] : []),
    candidateId: 'test-cand-g1-10',
    createdBy: 'test-verifier',
    createdAt: '2026-09-25T10:00:00.000Z',
  };
}

function inferredCapacity(value: number, confidence: 'high' | 'medium' | 'low'): CandidateProposal {
  return {
    subjectId: 'test-asset-g1-10-chiller',
    fieldKey: 'test.asset.cooling_capacity',
    quantity: { value, unit: 'kW', qualifier: 'cooling_output' },
    source: 'ai_inference',
    evidence: [
      { documentId: areaSchedule.id, contentHash: areaSchedule.contentHash, locator: { page: 2 }, excerpt: EXCERPT },
    ],
    confidence,
  };
}

const deriveContext: DeriveContext = {
  subjectId: 'test-asset-g1-10-chiller',
  document: (id) => (id === areaSchedule.id ? areaSchedule : undefined),
  inputState: () => undefined,
  datasetApproved: () => false,
  unit: unitByCode,
};

function expectRejectedAndUnknown(
  estimation: FieldDefinition['estimation'],
  value: number,
  confidence: 'high' | 'medium' | 'low',
): void {
  const field = capacityField(estimation);
  const verdict = verifyProposal(inferredCapacity(value, confidence), contextFor(field));
  // Only an accepted verdict yields a candidate to store.
  const stored: Candidate[] = verdict.outcome === 'accepted' ? [verdict.candidate] : [];

  // Rejected, because an inferred quantity other than a direct count is not allowed.
  expect(verdict.outcome).toBe('rejected');
  if (verdict.outcome !== 'rejected') return;
  expect(verdict.rejection).toEqual({ kind: 'inferred_quantity_not_direct_count' });

  // The field stays unknown.
  expect(derive(field, stored, NO_EVENTS, deriveContext).state).toBe('unknown');
}

pending('F-EXTRACT-05 · G1-10: an inferred chiller capacity cited to the area schedule: rejected, field unknown', () => {
  expectRejectedAndUnknown('forbidden', 777, 'high');

  // Property: whatever the field's estimation setting, the value and the claimed confidence.
  fc.assert(
    fc.property(
      fc.constantFrom<FieldDefinition['estimation']>('forbidden', 'allowed'),
      fc.integer({ min: 1, max: 100_000 }),
      fc.constantFrom<'high' | 'medium' | 'low'>('high', 'medium', 'low'),
      (estimation, value, confidence) => {
        expectRejectedAndUnknown(estimation, value, confidence);
      },
    ),
  );
});
