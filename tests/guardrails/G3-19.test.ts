/**
 * G3-19 (new in phase 3 part B, for the integrator to index; rule 4, "An engineer's verification is never
 * overruled by the owner"; rule 3, "On an engineer field, the owner is not asked to confirm. They may see 'Looks
 * right' and 'Something's wrong'").
 * Situation: an engineer verified a TEST zones value (an engineer field) read from a document; the owner then
 * sends "Something's wrong" on it (a page that showed the value before its verification).
 * Expected: refused (409 `shown_value_changed`), and no event is appended; the value stays Verified by SOVITECH.
 *
 * Over a TEST database, through the API (the contract's fields.concern). The TEST engineer verifies through the
 * store's guarded path after opening the item, as the review endpoint will (rule 10). Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addProjectMember, fileNamePart, insertCandidate, newId, openReviewItem, registerDocument, storeDocumentTexts, verifyCandidate, withRequest } from '@sovitech/db';
import { createTestAccount, createTestService, testContentHash } from '@sovitech/db/testing';
import { productionRegistry } from '@sovitech/registry';
import { StepResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

describe('G3-19 · rule 4: the owner never overrules an engineer\'s verification', { timeout: 60_000 }, () => {
  it('G3-19 · US-ASSETS-04 · rule 3: "Something\'s wrong" on an engineer_verified value is refused and appends no event', async () => {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G3-19 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G3-19' },
    });
    const { projectId } = created.json() as { projectId: string };
    const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
    if (building === undefined) throw new Error('no building subject');
    const zones = productionRegistry.fields.find((field) => field.key === 'building.zones');
    if (zones === undefined || zones.confirmBy !== 'engineer') throw new Error('the zones field is not an engineer field');
    const serviceId = await createTestService(api.database, { projectId, label: 'G3-19 zones' });
    const contentHash = testContentHash(`${projectId} G3-19 zones`);
    const candidateId = newId();
    await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      const document = await registerDocument(request, { contentHash, kind: 'mep', stage: 'technical_design', analysis: { status: 'analysed', coverage: 'pages 1-1 of 1' }, createdBy: serviceId });
      await storeDocumentTexts(request, {
        contentHash,
        parts: [
          { part: 'page:1', text: 'TEST 6 zone' },
          { part: fileNamePart(document.id), text: 'TEST G3-19 zones.pdf' },
        ],
        createdBy: serviceId,
      });
      const written = await insertCandidate(
        request,
        {
          id: candidateId,
          subjectId: building.id,
          fieldKey: zones.key,
          quantity: { value: 6, unit: 'count', qualifier: 'hvac_control' },
          source: 'document',
          evidence: [{ documentId: document.id, contentHash, locator: { page: 1 }, excerpt: 'TEST 6 zone', check: 'text_match' }],
          createdBy: serviceId,
        },
        zones,
      );
      expect(written.outcome).toBe('stored');
    });
    const engineer = await createTestAccount(api.database, { label: 'G3-19 engineer', kind: 'person', roles: ['sovitech_engineer'] });
    await addProjectMember(api.database.operator.db, { projectId, userId: engineer });
    await withRequest(api.database.app, { userId: engineer, projectId }, async (request) => {
      await openReviewItem(request, { candidateId });
      await verifyCandidate(request, { candidateId, reason: 'TEST G3-19' });
    });
    const eventsBefore = await api.database.asAdministrator('SELECT id FROM sovitech.candidate_events WHERE candidate_id = $1', [candidateId]);

    const concern = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/concern`, headers: { ...owner }, payload: { candidateId } });
    expect(concern.statusCode).toBe(409);
    expect(concern.json()).toEqual({ code: 'shown_value_changed' });
    expect(await api.database.asAdministrator('SELECT id FROM sovitech.candidate_events WHERE candidate_id = $1', [candidateId])).toEqual(eventsBefore);

    const step3 = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/3`, headers: { ...owner } })).json());
    const shown = step3.displayObjects.find((display) => display.valueId.startsWith(`building:${building.id}.zones`) && display.badge?.id === 'verified_by_sovitech');
    expect(shown?.badge?.label).toBe('Verified by SOVITECH');
  });
});
