/**
 * Owner corrections (docs/guardrails.md rule 4, "A correction is a resolution, not
 * a conflict"; F-VALUE-05). The indexed cases are G4-5 and G4-19; these cover the
 * rest of the rule. Every value is TEST data.
 */
import { describe, expect, test } from 'vitest';
import {
  derive,
  planOwnerCorrection,
  type Candidate,
  type CandidateEvent,
  type DeriveContext,
  type DocumentRecord,
  type FieldDefinition,
} from './index';

const SUBJECT = 'test-building';
const document: DocumentRecord = {
  id: 'test-doc',
  projectId: 'test-project',
  contentHash: 'sha256:test-doc',
  kind: 'mep',
  stage: 'technical_design',
  analysis: { status: 'analysed', coverage: 'TEST full coverage' },
};
const context: DeriveContext = {
  subjectId: SUBJECT,
  document: (id) => (id === document.id ? document : undefined),
  unit: (code) => (code === 'kW' ? { code, symbol: code, dimension: 'power' } : undefined),
  inputState: () => undefined,
  datasetApproved: () => false,
};

const field = (entry: Partial<FieldDefinition>): FieldDefinition => ({
  key: 'test.building.capacity',
  label: 'TEST capacity',
  subject: 'building',
  kind: 'quantity',
  unit: 'kW',
  qualifierRequired: true,
  qualifiers: ['cooling_output'],
  estimation: 'forbidden',
  criticality: 'optional',
  affects: [],
  impactRank: 1,
  confirmBy: 'owner',
  ...entry,
});

const shownReading = (source: 'document' | 'ai_inference'): Candidate => ({
  id: 'test-cand-shown',
  subjectId: SUBJECT,
  fieldKey: 'test.building.capacity',
  quantity: { value: 640, unit: 'kW', qualifier: 'cooling_output' },
  source,
  evidence: [{ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST', check: 'text_match' }],
  confidence: 'medium',
  createdBy: 'test-extractor',
  createdAt: '2026-09-25T09:00:00.000Z',
});

function correct(entry: Partial<FieldDefinition>, source: 'document' | 'ai_inference' = 'document') {
  const f = field(entry);
  const shown = shownReading(source);
  const state = derive(f, [shown], { candidate: [], field: [], document: [] }, context);
  const plan = planOwnerCorrection({
    projectId: 'test-project',
    field: f,
    state,
    shown,
    value: { quantity: { value: 700, unit: 'kW' } },
    candidateId: 'test-cand-owner',
    by: 'test-owner',
    at: '2026-09-25T10:00:00.000Z',
  });
  const after = derive(f, [shown, plan.candidate], { candidate: plan.candidateEvents, field: [], document: [] }, context);
  return { plan, after };
}

describe('planOwnerCorrection', () => {
  test('the owner value corrects the reading shown: same qualifier, a user candidate, user_confirmed on an owner field', () => {
    const { plan } = correct({ confirmBy: 'owner' });
    expect(plan.candidate).toMatchObject({ source: 'user', quantity: { value: 700, unit: 'kW', qualifier: 'cooling_output' } });
    expect(plan.candidateEvents.map((event: CandidateEvent) => event.type).sort()).toEqual(['rejected', 'user_confirmed']);
    expect(plan.engineerQueue).toBe('none');
  });

  test('on an engineer field the owner value stays unverified, and the rejected document value goes to the engineer queue', () => {
    const { plan, after } = correct({ confirmBy: 'engineer' });
    expect(plan.candidateEvents.map((event) => event.type)).toEqual(['rejected']);
    expect(plan.engineerQueue).toBe('rejected_value');
    expect(after.state).toBe('known');
    expect(after.review).toEqual({ list: 'sovitech_will_check', reason: 'owner_correction' });
    expect(after.candidates.find((c) => c.candidateId === 'test-cand-owner')?.verification).toBe('unverified');
    expect(after.provisional).toBe(true);
  });

  test('on a for_quotation owner field the rejected document value also goes to the engineer queue', () => {
    const { plan, after } = correct({ confirmBy: 'owner', criticality: 'for_quotation' });
    expect(plan.engineerQueue).toBe('rejected_value');
    expect(after.review).toEqual({ list: 'sovitech_will_check', reason: 'owner_correction' });
  });

  test('correcting an inference logs owner_corrected_inference with its confidence tier, never document text', () => {
    // An inferred quantity other than a direct count is never a value (rule 1), so the inference here is a count.
    const { plan } = correct({ confirmBy: 'owner', kind: 'count' }, 'ai_inference');
    expect(plan.guardrailEvents).toEqual([
      {
        type: 'owner_corrected_inference',
        projectId: 'test-project',
        subjectId: SUBJECT,
        fieldKey: 'test.building.capacity',
        reason: 'confidence:medium',
      },
    ]);
  });

  test('a candidate the screen could not have shown is refused', () => {
    const f = field({});
    const shown = shownReading('document');
    const state = derive(f, [shown], { candidate: [], field: [], document: [] }, context);
    const base = { projectId: 'test-project', field: f, state, value: { quantity: { value: 1, unit: 'kW' } }, candidateId: 'x', by: 'o', at: '2026-09-25T10:00:00.000Z' };
    expect(() => planOwnerCorrection({ ...base, shown: { ...shown, id: 'test-cand-other' } })).toThrow(/not an eligible value/);
    expect(() => planOwnerCorrection({ ...base, shown: { ...shown, fieldKey: 'test.other' } })).toThrow(/is not a value of/);
  });
});
