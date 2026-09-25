// @pending-until: phase 2 verify-proposal
/**
 * G2-2 (docs/guardrails.md section 7; 2.1 "code decides which of the two applies";
 * rule 1 check 5; rule 8 "Sheet counts never establish floor counts").
 * Situation: the AI labels a count of sheets as `document`.
 * Expected: stored as ai_inference.
 *
 * Each cited sheet is really in the drawing set (checks 1 to 4 pass), but the count
 * is not written in any excerpt (check 5 fails for `document`), and a direct count of
 * items at the cited locations is an allowed inference (rule 1).
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

const PROJECT = 'test-project-g2-2';

const sheetsField: FieldDefinition = {
  key: 'test.drawing_set.sheets',
  label: 'TEST drawing sheets in the set',
  subject: 'document',
  kind: 'count',
  unit: 'count',
  qualifierRequired: true,
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'engineer',
};

const drawingSet: DocumentRecord = {
  id: 'test-doc-g2-2-drawing-set',
  projectId: PROJECT,
  contentHash: 'sha256:test-g2-2-drawing-set',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST pages 1-3 of 3' },
};

/** Sheet titles, one per page, with no number written in them. */
const sheetTitles = new Map<number, string>([
  [1, 'Plan subsol'],
  [2, 'Plan parter'],
  [3, 'Plan etaj curent'],
]);

const context: ProposalContext = {
  projectId: PROJECT,
  field: sheetsField,
  document: (id) => (id === drawingSet.id ? drawingSet : undefined),
  textAt: (documentId, contentHash, locator) => {
    if (documentId !== drawingSet.id || contentHash !== drawingSet.contentHash || locator.page === undefined) {
      return undefined;
    }
    const title = sheetTitles.get(locator.page);
    return title === undefined ? undefined : { text: `TEST Cartus. Plansa: ${title}.`, layer: 'text' };
  },
  // No quantity is written in any sheet title.
  readQuantities: () => [],
  candidateId: 'test-cand-g2-2',
  createdBy: 'test-verifier',
  createdAt: '2026-09-25T10:00:00.000Z',
};

/** The AI counted the sheets it cited and labelled the count `document`. */
const proposal: CandidateProposal = {
  subjectId: drawingSet.id,
  fieldKey: sheetsField.key,
  quantity: { value: sheetTitles.size, unit: 'count', qualifier: 'drawing_sheets' },
  source: 'document',
  evidence: [...sheetTitles].map(([page, title]) => ({
    documentId: drawingSet.id,
    contentHash: drawingSet.contentHash,
    locator: { page },
    excerpt: title,
  })),
};

pending('F-EXTRACT-05 · G2-2: the AI labels a count of sheets as document: stored as ai_inference', () => {
  const verdict = verifyProposal(proposal, context);
  expect(verdict.outcome).toBe('accepted');
  if (verdict.outcome !== 'accepted') return;
  expect(verdict.candidate.source).toBe('ai_inference');
});
