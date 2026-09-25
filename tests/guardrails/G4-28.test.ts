/**
 * G4-28 (docs/guardrails.md section 7; 2.3, "Deleting a document withdraws each candidate whose
 * evidence comes only from that document. A candidate or asset with evidence from other active
 * documents keeps that evidence" and "Withdrawn values are never shown as current"; 2.5,
 * "Counting": every equipment count is calculated from the asset register; rule 13, "Erasure").
 * Phase 1 review, verifier finding 5 and adversarial finding 11.
 * Situation: the only document that shows CTA-01 is deleted.
 * Expected: CTA-01 is not counted.
 *
 * The register keeps CTA-01's identity and its appearance ids (nothing is deleted), but an
 * appearance whose document is withdrawn or erased is no longer live evidence, so the asset
 * leaves the countable set. The control: an asset also shown on another active document keeps
 * that evidence and stays counted.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { deriveAssetRegister, type AssetAppearance, type AssetIdentity, type DocumentEvent } from '@sovitech/domain';
import { testDocument, testDocumentStatuses, testTime } from './_support/builders';

const PROJECT = 'test-project-g4-28';

const plan = testDocument('test-doc-g4-28-plan', PROJECT, 'technical_design', { kind: 'mep' });
const schedule = testDocument('test-doc-g4-28-schedule', PROJECT, 'technical_design', { kind: 'mep' });

const cta01: AssetIdentity = { assetId: 'test-asset-g4-28-CTA-01', projectId: PROJECT, normalisedTag: 'CTA-01' };

function appearanceOn(document: typeof plan, id: string): AssetAppearance {
  return {
    id,
    projectId: PROJECT,
    tagAsWritten: 'CTA-01',
    evidence: [{ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'CTA-01', check: 'text_match' }],
  };
}

function removal(type: 'withdrawn' | 'erased', minute: number): DocumentEvent {
  return { documentId: plan.id, type, by: 'test-owner', role: 'owner', at: testTime(minute) };
}

test('F-VALUE-08 · G4-28: the only document that shows CTA-01 is deleted: CTA-01 is not counted', () => {
  const only = appearanceOn(plan, 'test-appearance-g4-28-plan');
  const before = deriveAssetRegister({ projectId: PROJECT, identities: [cta01], appearances: [only], events: [], documents: testDocumentStatuses([], [plan]) });
  expect(before.countable).toEqual([cta01.assetId]);

  for (const type of ['withdrawn', 'erased'] as const) {
    const after = deriveAssetRegister({
      projectId: PROJECT,
      identities: [cta01],
      appearances: [only],
      events: [],
      documents: testDocumentStatuses([removal(type, 10)], [plan]),
    });
    expect(after.countable, type).toEqual([]);
    expect(after.withoutLiveEvidence, type).toEqual([cta01.assetId]);
    // Nothing is deleted: the identity and its appearance id stay in the register.
    expect(after.assets.map((asset) => asset.appearanceIds), type).toEqual([[only.id]]);
  }

  // Property: however many appearances CTA-01 has on the deleted document, and whenever it is deleted.
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 1, max: 59 }), fc.constantFrom<'withdrawn' | 'erased'>('withdrawn', 'erased'), (count, minute, type) => {
      const appearances = Array.from({ length: count }, (_, index) => appearanceOn(plan, `test-appearance-g4-28-plan-${String(index)}`));
      const register = deriveAssetRegister({ projectId: PROJECT, identities: [cta01], appearances, events: [], documents: testDocumentStatuses([removal(type, minute)], [plan]) });
      expect(register.countable).toEqual([]);
    }),
  );
});

test('F-VALUE-08 · G4-28 control: CTA-01 also shown on another active document keeps that evidence and is counted', () => {
  const register = deriveAssetRegister({
    projectId: PROJECT,
    identities: [cta01],
    appearances: [appearanceOn(plan, 'test-appearance-g4-28-plan'), appearanceOn(schedule, 'test-appearance-g4-28-schedule')],
    events: [],
    documents: testDocumentStatuses([removal('erased', 10)], [plan, schedule]),
  });
  expect(register.countable).toEqual([cta01.assetId]);
  expect(register.withoutLiveEvidence).toEqual([]);
});
