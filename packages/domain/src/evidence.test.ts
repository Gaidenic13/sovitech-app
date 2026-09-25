/**
 * The evidence verifier's check 1, built in phase 1 (docs/guardrails.md rule 1
 * "Enforced by", rule 13; G13-1 is the indexed case). The other four checks are
 * phase 2 and still reach the stub. Every value is TEST data.
 */
import { describe, expect, test } from 'vitest';
import {
  notImplementedFeature,
  verifyProposal,
  type CandidateProposal,
  type DocumentRecord,
  type FieldDefinition,
  type ProposalContext,
} from './index';

const field: FieldDefinition = {
  key: 'test.building.area',
  label: 'TEST area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
};
const own: DocumentRecord = {
  id: 'test-doc-own',
  projectId: 'test-project-a',
  contentHash: 'sha256:own',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST' },
};
const foreign: DocumentRecord = { ...own, id: 'test-doc-foreign', projectId: 'test-project-b' };

const context: ProposalContext = {
  projectId: 'test-project-a',
  field,
  document: (id) => [own, foreign].find((doc) => doc.id === id),
  textAt: () => undefined,
  readQuantities: () => [],
  candidateId: 'test-cand',
  createdBy: 'test-verifier',
  createdAt: '2026-09-25T10:00:00.000Z',
};

const proposal = (documentIds: readonly string[]): CandidateProposal => ({
  subjectId: 'test-building',
  fieldKey: field.key,
  quantity: { value: 1, unit: 'm2', qualifier: 'gross_total' },
  source: 'document',
  evidence: documentIds.map((documentId) => ({ documentId, contentHash: 'sha256:x', locator: { page: 1 }, excerpt: 'TEST excerpt' })),
});

const reached = (run: () => unknown): string | undefined => {
  try {
    run();
  } catch (error) {
    return notImplementedFeature(error);
  }
  return undefined;
};

describe('verifyProposal, check 1: the document belongs to this project', () => {
  test("any entry citing another project's document, or an unknown one, rejects the proposal and logs it without document text", () => {
    for (const [ids, index] of [
      [[foreign.id], 0],
      [[own.id, foreign.id], 1],
      [['test-doc-missing'], 0],
    ] as const) {
      const verdict = verifyProposal(proposal(ids), context);
      expect(verdict).toEqual({
        outcome: 'rejected',
        rejection: { kind: 'evidence_check_failed', check: 'document_in_project', evidenceIndex: index },
        guardrailEvents: [
          { type: 'evidence_not_found', projectId: 'test-project-a', subjectId: 'test-building', fieldKey: field.key, reason: 'document_in_project' },
        ],
      });
      expect(JSON.stringify(verdict)).not.toContain('TEST excerpt');
    }
  });

  test('evidence from this project passes check 1 and reaches the checks phase 2 builds', () => {
    expect(reached(() => verifyProposal(proposal([own.id]), context))).toBe('verify-proposal');
  });
});
