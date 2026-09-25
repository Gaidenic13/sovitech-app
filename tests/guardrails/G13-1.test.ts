// @pending-until: phase 1 verify-proposal
/**
 * G13-1 (docs/guardrails.md section 7; rule 13 "Enforced by"; rule 1 check 1).
 * Situation: evidence cites a document from another project.
 * Expected: rejected and logged.
 *
 * Everything else about the evidence holds (hash, locator, excerpt, value), and the
 * document lookup is not scoped to the project, so only the verifier's own
 * ownership check can reject it.
 */
import { expect } from 'vitest';
import {
  verifyProposal,
  type CandidateProposal,
  type DocumentRecord,
  type FieldDefinition,
  type ProposalContext,
} from '@sovitech/domain';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

const PROJECT_A = 'test-project-g13-1-a';
const PROJECT_B = 'test-project-g13-1-b';

const areaField: FieldDefinition = {
  key: 'test.building.gross_floor_area',
  label: 'TEST gross floor area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  qualifierRequired: true,
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};

/** A document of project B. */
const otherProjectsDocument: DocumentRecord = {
  id: 'test-doc-g13-1-b-schedule',
  projectId: PROJECT_B,
  contentHash: 'sha256:test-g13-1-b-schedule',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST pages 1-1 of 1' },
};

const EXCERPT = 'Suprafata construita desfasurata: 3.456 mp';

/** Lookups as a store that is not scoped by project would answer them. */
const unscopedContext: ProposalContext = {
  projectId: PROJECT_A,
  field: areaField,
  document: (id) => (id === otherProjectsDocument.id ? otherProjectsDocument : undefined),
  textAt: (documentId, contentHash, locator) =>
    documentId === otherProjectsDocument.id && contentHash === otherProjectsDocument.contentHash && locator.page === 1
      ? { text: `TEST ${EXCERPT}.`, layer: 'text' }
      : undefined,
  readQuantities: (text) => (text === EXCERPT ? [{ value: 3456, unit: 'm2' }] : []),
  candidateId: 'test-cand-g13-1',
  createdBy: 'test-verifier',
  createdAt: '2026-09-25T10:00:00.000Z',
};

/** A proposal in project A whose evidence cites project B's document. */
const proposal: CandidateProposal = {
  subjectId: 'test-building-g13-1-a',
  fieldKey: areaField.key,
  quantity: { value: 3456, unit: 'm2', qualifier: 'gross_total' },
  source: 'document',
  evidence: [
    {
      documentId: otherProjectsDocument.id,
      contentHash: otherProjectsDocument.contentHash,
      locator: { page: 1 },
      excerpt: EXCERPT,
    },
  ],
  original: { text: '3.456 mp', locale: 'ro-RO' },
};

pending('F-EXTRACT-04 · G13-1: evidence cites a document from another project: rejected and logged', () => {
  const verdict = verifyProposal(proposal, unscopedContext);

  // Rejected ...
  expect(verdict.outcome).toBe('rejected');
  if (verdict.outcome !== 'rejected') return;
  expect(verdict.rejection).toEqual({ kind: 'evidence_check_failed', check: 'document_in_project', evidenceIndex: 0 });
  // ... and logged, in the project where it was attempted.
  expect(verdict.guardrailEvents).toContainEqual(
    expect.objectContaining({ type: 'evidence_not_found', projectId: PROJECT_A }),
  );
});
