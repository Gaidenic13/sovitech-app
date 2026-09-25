/**
 * G4-31 (docs/guardrails.md section 7; 2.3, "Deleting a document ... A candidate or asset with evidence
 * from other active documents keeps that evidence"; 2.5, "Counting": every equipment count is calculated
 * from the asset register). Phase 1 review, round 3: adversarial finding on appearances with several
 * evidence entries (the data-access layer passed only the first) and domain finding X7. (G4-30 is held
 * by the proposal P-1-REVISION-CASE.)
 * Situation: CTA-01 is shown by two documents, and the owner deletes one of them.
 * Expected: CTA-01 is counted.
 *
 * Two layers. In the domain, whether CTA-01's appearance cites both documents or each document holds an
 * appearance of its own, deleting (withdrawing) or erasing either one leaves CTA-01 in the countable set.
 * At the store (a TEST database), an appearance recorded with an entry in each of two documents reads
 * back with both entries, in order, and CTA-01 stays counted after the owner deletes the first document.
 * The control, at both layers: once no document that shows it is left, CTA-01 is not counted (G4-28).
 */
import fc from 'fast-check';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { deriveAssetRegister, type AssetAppearance, type AssetIdentity, type DocumentEvent, type Evidence } from '@sovitech/domain';
import {
  appendDocumentEvent,
  eraseDocument,
  readAssetRegisterInputs,
  recordAssetAppearance,
  registerDocument,
  withRequest,
  type RequestScope,
} from '@sovitech/db';
import { createTestAccount, createTestProject, createTestService, startTestDatabase, testContentHash, type TestDatabase } from '@sovitech/db/testing';
import { testDocument, testDocumentStatuses, testTime } from './_support/builders';

const PROJECT = 'test-project-g4-31';
const plan = testDocument('test-doc-g4-31-plan', PROJECT, 'technical_design', { kind: 'mep' });
const schedule = testDocument('test-doc-g4-31-schedule', PROJECT, 'technical_design', { kind: 'mep' });
const cta01: AssetIdentity = { assetId: 'test-asset-g4-31-CTA-01', projectId: PROJECT, normalisedTag: 'CTA-01' };

function entryIn(document: typeof plan): Evidence {
  return { documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'CTA-01', check: 'text_match' };
}

/** One appearance citing both documents. */
const citingBoth: AssetAppearance = { id: 'test-appearance-g4-31', projectId: PROJECT, tagAsWritten: 'CTA-01', evidence: [entryIn(plan), entryIn(schedule)] };
/** One appearance per document, joined by the tag (2.5, "One tag, one asset"). */
const onePerDocument: readonly AssetAppearance[] = [plan, schedule].map((document) => ({
  id: `test-appearance-g4-31-${document.id}`,
  projectId: PROJECT,
  tagAsWritten: 'CTA-01',
  evidence: [entryIn(document)],
}));

function removal(documentId: string, type: 'withdrawn' | 'erased', minute: number): DocumentEvent {
  return { documentId, type, by: 'test-owner', role: 'owner', at: testTime(minute) };
}

test('F-VALUE-08 · G4-31: CTA-01 is shown by two documents and one is deleted: CTA-01 is counted', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(plan.id, schedule.id),
      fc.constantFrom<'withdrawn' | 'erased'>('withdrawn', 'erased'),
      fc.constantFrom('one appearance citing both', 'one appearance per document'),
      fc.boolean(),
      (deleted, type, shape, reversed) => {
        const shown = shape === 'one appearance citing both' ? [citingBoth] : onePerDocument;
        const appearances = shown.map((appearance) => ({ ...appearance, evidence: reversed ? [...appearance.evidence].reverse() : appearance.evidence }));
        const register = deriveAssetRegister({
          projectId: PROJECT,
          identities: [cta01],
          appearances: reversed ? [...appearances].reverse() : appearances,
          events: [],
          documents: testDocumentStatuses([removal(deleted, type, 10)], [plan, schedule]),
        });
        expect(register.countable).toEqual([cta01.assetId]);
        expect(register.withoutLiveEvidence).toEqual([]);
      },
    ),
  );
});

test('F-VALUE-08 · G4-31 control: with both documents deleted, CTA-01 is not counted', () => {
  for (const shown of [[citingBoth], onePerDocument]) {
    const register = deriveAssetRegister({
      projectId: PROJECT,
      identities: [cta01],
      appearances: shown,
      events: [],
      documents: testDocumentStatuses([removal(plan.id, 'erased', 10), removal(schedule.id, 'withdrawn', 11)], [plan, schedule]),
    });
    expect(register.countable).toEqual([]);
    expect(register.withoutLiveEvidence).toEqual([cta01.assetId]);
  }
});

let database: TestDatabase;
let ownerId: string;
let projectId: string;
let ownerScope: RequestScope;
let serviceId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G4-31 owner', kind: 'person', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  ownerScope = { userId: ownerId, projectId };
  serviceId = await createTestService(database, { projectId, label: 'G4-31' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

test('F-VALUE-08 · G4-31: at the store, CTA-01 recorded from two documents keeps both entries, and stays counted after the owner deletes one', async () => {
  const [first, second] = await withRequest(database.app, ownerScope, async (request) => {
    const register = (label: string) =>
      registerDocument(request, {
        contentHash: testContentHash(`G4-31 ${label}`),
        kind: 'mep',
        stage: 'technical_design',
        analysis: { status: 'analysed', coverage: 'TEST page 1 of 1' },
        createdBy: ownerId,
      });
    return [await register('plan'), await register('schedule')];
  });
  if (first === undefined || second === undefined) throw new Error('the TEST documents were not registered');
  const recorded = await withRequest(database.app, { userId: serviceId, projectId }, (request) =>
    recordAssetAppearance(request, {
      tagAsWritten: 'TEST-CTA-01',
      evidence: [first, second].map((document) => ({ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST-CTA-01', check: 'text_match' as const })),
      createdBy: serviceId,
    }),
  );
  const assetId = recorded.assetId;
  expect(assetId).not.toBeNull();

  const counted = async () => withRequest(database.app, ownerScope, async (request) => deriveAssetRegister(await readAssetRegisterInputs(request)));
  const inputs = await withRequest(database.app, ownerScope, readAssetRegisterInputs);
  expect(inputs.appearances.find((appearance) => appearance.id === recorded.appearanceId)?.evidence.map((entry) => entry.documentId)).toEqual([first.id, second.id]);
  expect((await counted()).countable).toEqual([assetId]);

  // The owner deletes the first document: CTA-01 is still counted.
  await withRequest(database.app, ownerScope, (request) => appendDocumentEvent(request, { documentId: first.id, type: 'withdrawn', by: ownerId, role: 'owner' }));
  const afterDelete = await counted();
  expect(afterDelete.countable).toEqual([assetId]);
  expect(afterDelete.withoutLiveEvidence).toEqual([]);

  // Control: once the second is erased too, no document shows it, and it is not counted.
  await withRequest(database.app, ownerScope, (request) => eraseDocument(request, { documentId: second.id, role: 'owner', reason: 'TEST owner request' }));
  const afterErasure = await counted();
  expect(afterErasure.countable).toEqual([]);
  expect(afterErasure.withoutLiveEvidence).toEqual([assetId]);
});
