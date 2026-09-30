/**
 * G1-4 (docs/guardrails.md section 7; rule 1 "Enforced by", check 4).
 * Situation: the cited excerpt does not occur on the cited page.
 * Expected: rejected and logged. The field stays unknown.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
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

const PROJECT = 'test-project-g1-4';
const BUILDING = 'test-building-g1-4';

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

const schedule: DocumentRecord = {
  id: 'test-doc-g1-4-schedule',
  projectId: PROJECT,
  contentHash: 'sha256:test-g1-4-schedule',
  kind: 'architectural',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST pages 1-5 of 5' },
};

const EXCERPT = 'Suprafata construita desfasurata: 2.345 mp';

/** The extracted text layer of the schedule: the excerpt is on page 5 only. */
const pages = new Map<number, string>([
  [1, 'TEST Tablou de suprafete. Cartus.'],
  [2, 'TEST Nivel parter: suprafata utila 410 mp'],
  [3, 'TEST Nivel etaj 1: suprafata utila 395 mp'],
  [4, 'TEST Legenda si note generale'],
  [5, `TEST Total. ${EXCERPT}. Sfarsit.`],
]);

function contextFor(): ProposalContext {
  return {
    projectId: PROJECT,
    field: areaField,
    document: (id) => (id === schedule.id ? schedule : undefined),
    textAt: (documentId, contentHash, locator) => {
      if (documentId !== schedule.id || contentHash !== schedule.contentHash || locator.page === undefined) {
        return undefined;
      }
      const text = pages.get(locator.page);
      return text === undefined ? undefined : { text, layer: 'text' };
    },
    readQuantities: (text) => (text === EXCERPT ? [{ value: 2345, unit: 'm2' }] : []),
    candidateId: 'test-cand-g1-4',
    createdBy: 'test-verifier',
    createdAt: '2026-09-25T10:00:00.000Z',
  };
}

function proposalCiting(page: number): CandidateProposal {
  return {
    subjectId: BUILDING,
    fieldKey: areaField.key,
    quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' },
    source: 'document',
    evidence: [{ documentId: schedule.id, contentHash: schedule.contentHash, locator: { page }, excerpt: EXCERPT }],
    original: { text: '2.345 mp', locale: 'ro-RO' },
  };
}

const deriveContext: DeriveContext = {
  subjectId: BUILDING,
  document: (id) => (id === schedule.id ? schedule : undefined),
  inputState: () => undefined,
  datasetApproved: () => false,
  unit: unitByCode,
};

function expectRejectedLoggedUnknown(page: number): void {
  const verdict = verifyProposal(proposalCiting(page), contextFor());
  // Only an accepted verdict yields a candidate to store.
  const stored: Candidate[] = verdict.outcome === 'accepted' ? [verdict.candidate] : [];

  // Rejected ...
  expect(verdict.outcome).toBe('rejected');
  if (verdict.outcome !== 'rejected') return;
  expect(verdict.rejection).toEqual({ kind: 'evidence_check_failed', check: 'excerpt_at_locator', evidenceIndex: 0 });
  // ... and logged.
  expect(verdict.guardrailEvents.map((event) => event.type)).toContain('evidence_not_found');

  // The field stays unknown.
  expect(derive(areaField, stored, NO_EVENTS, deriveContext).state).toBe('unknown');
}

test('F-EXTRACT-04 · G1-4: the cited excerpt does not occur on the cited page: rejected and logged, field unknown', () => {
  expectRejectedLoggedUnknown(4);

  // Property: every cited page of the schedule that does not hold the excerpt.
  fc.assert(
    fc.property(fc.constantFrom(1, 2, 3, 4), (page) => {
      expectRejectedLoggedUnknown(page);
    }),
  );
});
