/**
 * G4-14 (docs/guardrails.md section 7; 2.3 "Revisions and removal"; rule 4 "Routing").
 * Situation: Rev B changes an engineer_verified chiller capacity.
 * Expected: conflict, routed to the engineer.
 *
 * Rev B is declared a revision of Rev A through `supersedes` and a
 * `declared_revision_of` document event (2.3). The engineer's event is built in
 * memory for this derive test only, by the one builder file that may
 * (tests/guardrails/_support/builders.ts).
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { unitByCode } from '@sovitech/registry';
import {
  derive,
  type Candidate,
  type DeriveContext,
  type DeriveEvents,
  type DocumentRecord,
  type FieldDefinition,
} from '@sovitech/domain';
import { engineerVerificationInMemory } from './_support/builders';

const PROJECT = 'test-project-g4-14';
const CHILLER = 'test-asset-g4-14-chiller';

const capacityField: FieldDefinition = {
  key: 'test.asset.cooling_capacity',
  label: 'TEST chiller cooling capacity',
  subject: 'asset',
  kind: 'quantity',
  unit: 'kW',
  qualifierRequired: true,
  qualifiers: ['cooling_output'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'engineer',
};

const revA: DocumentRecord = {
  id: 'test-doc-g4-14-m001-rev-a',
  projectId: PROJECT,
  contentHash: 'sha256:test-g4-14-rev-a',
  kind: 'mep',
  stage: 'technical_design',
  revision: 'Rev. A',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
};

const revB: DocumentRecord = {
  id: 'test-doc-g4-14-m001-rev-b',
  projectId: PROJECT,
  contentHash: 'sha256:test-g4-14-rev-b',
  kind: 'mep',
  stage: 'technical_design',
  revision: 'Rev. B',
  supersedes: revA.id,
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
};

const context: DeriveContext = {
  subjectId: CHILLER,
  document: (id) => [revA, revB].find((document) => document.id === id),
  unit: unitByCode,
  inputState: () => undefined,
  datasetApproved: () => false,
};

function capacityReading(id: string, document: DocumentRecord, value: number, at: string): Candidate {
  return {
    id,
    subjectId: CHILLER,
    fieldKey: capacityField.key,
    quantity: { value, unit: 'kW', qualifier: 'cooling_output' },
    source: 'document',
    evidence: [
      {
        documentId: document.id,
        contentHash: document.contentHash,
        locator: { page: 3 },
        excerpt: `Putere frigorifica ${value} kW`,
        check: 'text_match',
      },
    ],
    createdBy: 'test-extractor',
    createdAt: at,
  };
}

function scenario(revAValue: number, revBValue: number): { candidates: Candidate[]; events: DeriveEvents } {
  const fromRevA = capacityReading('test-cand-g4-14-rev-a', revA, revAValue, '2026-09-25T09:00:00.000Z');
  const fromRevB = capacityReading('test-cand-g4-14-rev-b', revB, revBValue, '2026-09-25T13:00:00.000Z');
  // 2026-09-25T10:00Z, after Rev A was read and before Rev B was declared.
  const verification = engineerVerificationInMemory(fromRevA.id, 60);
  return {
    candidates: [fromRevA, fromRevB],
    events: {
      candidate: [verification],
      field: [],
      document: [
        { documentId: revB.id, type: 'declared_revision_of', by: 'test-owner', role: 'owner', at: '2026-09-25T12:00:00.000Z' },
      ],
    },
  };
}

function expectConflictForEngineer(revAValue: number, revBValue: number): void {
  const { candidates, events } = scenario(revAValue, revBValue);
  const state = derive(capacityField, candidates, events, context);
  expect(state.state).toBe('conflict');
  expect(state.conflict?.routedTo).toBe('engineer');
}

test('F-VALUE-04 · F-VALUE-07 · G4-14: Rev B changes an engineer_verified chiller capacity: conflict, routed to the engineer', () => {
  expectConflictForEngineer(640, 700);

  // Property: any change Rev B makes to the capacity.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10_000 }), fc.integer({ min: 1, max: 10_000 }), (revAValue, revBValue) => {
      fc.pre(revAValue !== revBValue);
      expectConflictForEngineer(revAValue, revBValue);
    }),
  );
});
