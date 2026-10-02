/**
 * G4-42 (new in phase 4 part B; 2.3, "Revisions are declared, never guessed": "A document is a revision of another only
 * through `supersedes`. The old one is then superseded, and the new revision's candidates supersede the old ones for the
 * same subject and field"; "Deleting a document ... A field left with no eligible candidate returns to unknown";
 * 7.1.1-D4 and US-DOCS-21 AC1: "The confirmation states the effect"; finding A-3).
 * Situation: Delete is opened on a declared newer revision whose value superseded the older document's value.
 * Expected: the confirmation states that 0 values will return to Unknown, and after Delete the older value is current.
 *
 * Over a TEST database, through the API: TEST older.pdf states a gross floor area of 1000 m², newer.pdf 1100 m², and the
 * owner declares newer a revision of older (`documents.revisionOf`). Step 3 shows 1,100 m². The effect of deleting newer
 * is derived with newer removed, so its declaration no longer supersedes the older value: "0 values will return to
 * Unknown" (it served "1 value" before the fix). After Delete, step 3 shows the older value, 1,000 m², as current.
 * Every account, document and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DeleteEffectResponseSchema, StepResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { documentValue, newOwnerProject, productionFieldOf, serviceOf, testDocumentIn } from './_support/workspace-store';

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

async function area(projectId: string, buildingId: string): Promise<DisplayObject | undefined> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/3`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json()).displayObjects.find((display) => display.valueId === `building:${buildingId}.grossFloorArea`);
}

describe('G4-42 · 2.3: deleting a declared newer revision brings the older value back', { timeout: 120_000 }, () => {
  it('A-3 · US-DOCS-21 AC1 · 7.1.1-D4 · G4-42: the effect states 0 values, and after Delete the older value is current', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-42 revision');
    const serviceId = await serviceOf(api, projectId, 'G4-42');
    const field = productionFieldOf('building.grossFloorArea');
    const older = await testDocumentIn(api, { projectId, serviceId, label: 'G4-42 older', fileName: 'TEST older.pdf', pages: ['TEST Suprafata construita desfasurata: 1000 mp'] });
    const newer = await testDocumentIn(api, { projectId, serviceId, label: 'G4-42 newer', fileName: 'TEST newer.pdf', pages: ['TEST Suprafata construita desfasurata: 1100 mp'] });
    await documentValue(api, { projectId, serviceId, subjectId: buildingId, field, value: { quantity: { value: 1000, unit: 'm2', qualifier: 'gross_total' } }, from: [{ document: older, page: 1, excerpt: 'TEST Suprafata construita desfasurata: 1000 mp' }] });
    await documentValue(api, { projectId, serviceId, subjectId: buildingId, field, value: { quantity: { value: 1100, unit: 'm2', qualifier: 'gross_total' } }, from: [{ document: newer, page: 1, excerpt: 'TEST Suprafata construita desfasurata: 1100 mp' }] });
    const declared = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/documents/${newer.id}/revision-of`, headers: { ...owner }, payload: { revisionOf: older.id } });
    expect(declared.statusCode, declared.body).toBe(204);
    expect((await area(projectId, buildingId))?.text).toContain('1,100');

    const effect = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/documents/${newer.id}/delete-effect`, headers: { ...owner } });
    expect(effect.statusCode, effect.body).toBe(200);
    const parsed = DeleteEffectResponseSchema.parse(effect.json());
    expect(parsed.displayObjects.find((display) => display.valueId === parsed.view.effect)?.text).toBe('0 values will return to Unknown');

    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${newer.id}`, headers: { ...owner } });
    expect(deleted.statusCode, deleted.body).toBe(200);
    const after = await area(projectId, buildingId);
    expect(after?.shape).toBe('value');
    expect(after?.text).toContain('1,000');
    expect(after?.text).not.toContain('1,100');
    expect((after?.lines ?? []).map((line) => line.text)).not.toContain('From a superseded revision');
  });
});
