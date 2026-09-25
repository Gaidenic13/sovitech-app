/**
 * G4-21 (docs/guardrails.md section 7; 2.5, "Merging, splitting and removing are events. Only
 * engineer accounts write them, and counts include only assets that are neither removed nor
 * merged into another"). Proposed in phase 1 (P-1-CASES).
 * Situation: an asset merge, split or remove event comes from an account that is not
 * sovitech_engineer.
 * Expected: refused; the asset register and its counts are unchanged.
 *
 * Two layers. In the domain, the register derived from the events refuses the event and counts
 * as before, whatever role it names. At the store (a TEST database), an owner's request is
 * refused whether it names its own role or claims the engineer's, an admin's request too, and
 * nothing is written. The control: the engineer's own request removes the duplicate.
 */
import fc from 'fast-check';
import { afterAll, beforeAll, expect, test } from 'vitest';
import {
  EVENT_ROLES,
  deriveAssetRegister,
  type AssetAppearance,
  type AssetIdentity,
  type ProposedAssetEvent,
} from '@sovitech/domain';
import {
  addProjectMember,
  appendAssetEvent,
  assetForTag,
  readAssetRegisterInputs,
  recordAssetAppearance,
  withRequest,
  type RequestScope,
} from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  type TestDatabase,
  type TestDocumentValue,
} from '@sovitech/db/testing';
import { testDocumentStatuses } from './_support/builders';

const PROJECT = 'test-project-g4-21';
const identities: readonly AssetIdentity[] = ['A', 'B'].map((tag) => ({ assetId: `test-asset-g4-21-${tag}`, projectId: PROJECT, normalisedTag: tag }));
const appearances: readonly AssetAppearance[] = identities.map((held) => ({
  id: `test-appearance-g4-21-${held.normalisedTag}`,
  projectId: PROJECT,
  tagAsWritten: held.normalisedTag,
  evidence: [{ documentId: 'test-doc-g4-21', contentHash: 'sha256:test-doc-g4-21', locator: { page: 1 }, excerpt: held.normalisedTag, check: 'text_match' }],
}));

test('F-VALUE-08 · G4-21: in the domain, a merge, split or remove from any role but sovitech_engineer is refused and the count is unchanged', () => {
  const before = deriveAssetRegister({ projectId: PROJECT, identities, appearances, events: [], documents: testDocumentStatuses() });
  expect(before.countable).toEqual(['test-asset-g4-21-A', 'test-asset-g4-21-B']);
  fc.assert(
    fc.property(
      fc.constantFrom(...EVENT_ROLES.filter((role) => role !== 'sovitech_engineer'), 'sovitech_admin', 'sovitech_commercial_reviewer'),
      fc.constantFrom<ProposedAssetEvent['type']>('merged_into', 'split_from', 'removed'),
      (role, type) => {
        const proposed: ProposedAssetEvent = {
          assetId: 'test-asset-g4-21-A',
          type,
          relatedAssetIds: type === 'removed' ? [] : ['test-asset-g4-21-B'],
          by: 'test-person',
          role,
          at: '2026-09-25T10:00:00.000Z',
          reason: 'TEST duplicate',
        };
        const after = deriveAssetRegister({ projectId: PROJECT, identities, appearances, events: [proposed], documents: testDocumentStatuses() });
        expect(after.refusedEvents).toEqual([{ event: proposed, refusal: 'role_not_engineer' }]);
        expect(after.countable).toEqual(before.countable);
      },
    ),
  );
});

let database: TestDatabase;
let ownerId: string;
let engineerId: string;
let adminId: string;
let projectId: string;
let value: TestDocumentValue;
let assetId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'G4-21 owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'G4-21 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  adminId = await createTestAccount(database, { label: 'G4-21 admin', kind: 'person', roles: ['owner', 'sovitech_admin'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  value = await createTestDocumentValue(database, { projectId, label: 'G4-21 schedule' });
  // The extraction job's account records the appearance (2.5), as the ingestion path will.
  const scope: RequestScope = { userId: value.serviceId, projectId };
  assetId = await withRequest(database.app, scope, async (request) => {
    await recordAssetAppearance(request, {
      tagAsWritten: 'TEST-CTA-21',
      evidence: [{ documentId: value.documentId, contentHash: value.contentHash, locator: { page: 1 }, excerpt: 'TEST-CTA-21', check: 'text_match' }],
      createdBy: value.serviceId,
    });
    return (await assetForTag(request, { tagAsWritten: 'TEST-CTA-21', createdBy: value.serviceId })).assetId;
  });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

async function assetEventRows(): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.asset_events WHERE project_id = $1', [projectId]);
  return row?.count ?? -1;
}

test('F-VALUE-08 · G4-21: at the store, a remove event from the owner, as owner or claiming the engineer role, is refused and nothing is written', async () => {
  const asOwner = await withRequest(database.app, { userId: ownerId, projectId }, (request) =>
    appendAssetEvent(request, { assetId, type: 'removed', relatedAssetIds: [], by: ownerId, role: 'owner', reason: 'TEST duplicate' }),
  );
  expect(asOwner).toEqual({ outcome: 'refused', refusal: 'role_not_engineer' });
  const claimed = withRequest(database.app, { userId: ownerId, projectId }, (request) =>
    appendAssetEvent(request, { assetId, type: 'removed', relatedAssetIds: [], by: ownerId, role: 'sovitech_engineer', reason: 'TEST duplicate' }),
  );
  await expect(claimed).rejects.toMatchObject({ refusal: 'asset_event_not_from_the_requesting_engineer' });
  expect(await assetEventRows()).toBe(0);
});

test('F-VALUE-08 · G4-21: at the store, an admin who is not an engineer is refused too, and the register is unchanged', async () => {
  await withRequest(database.app, { userId: ownerId, projectId }, (request) => addProjectMember(request, { projectId, userId: adminId }));
  const byAdmin = withRequest(database.app, { userId: adminId, projectId }, (request) =>
    appendAssetEvent(request, { assetId, type: 'removed', relatedAssetIds: [], by: adminId, role: 'sovitech_engineer', reason: 'TEST duplicate' }),
  );
  await expect(byAdmin).rejects.toMatchObject({ refusal: 'asset_event_not_from_the_requesting_engineer' });
  const register = await withRequest(database.app, { userId: ownerId, projectId }, readAssetRegisterInputs);
  expect(register.events).toEqual([]);
  expect(await assetEventRows()).toBe(0);
});

test('F-VALUE-08 · G4-21 control: the engineer\'s own request removes the duplicate', async () => {
  const byEngineer = await withRequest(database.app, { userId: engineerId, projectId }, (request) =>
    appendAssetEvent(request, { assetId, type: 'removed', relatedAssetIds: [], by: engineerId, role: 'sovitech_engineer', reason: 'TEST duplicate' }),
  );
  expect(byEngineer).toMatchObject({ outcome: 'appended', event: { assetId, type: 'removed', by: engineerId } });
  expect(await assetEventRows()).toBe(1);
});
