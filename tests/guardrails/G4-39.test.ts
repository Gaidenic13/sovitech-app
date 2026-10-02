/**
 * G4-39 (new in phase 4; 2.3, "Deleting a document": "Deleting a document withdraws each candidate whose evidence comes
 * only from that document. A candidate or asset with evidence from other active documents keeps that evidence. A field
 * left with no eligible candidate returns to unknown"; design/dashboards-spec.md 7.1.1, "15's delete and replace":
 * "The confirmation states the effect ('N values will return to Unknown')"; US-DOCS-21 AC1 and AC4).
 * Situation: Delete is opened on a document that is the only source of three fields and one of two sources of a fourth.
 * Expected: the confirmation states that 3 values will return to Unknown.
 *
 * Over a TEST database, through the API: `workspace.documents.deleteEffect` serves "3 values will return to Unknown",
 * bound to `document:<id>.deleteEffect`, before anything is removed (nothing is withdrawn by reading it). Then
 * `documents.delete` runs rule 13's erasure job: the three fields read Unknown, the fourth keeps its value from the
 * other document. One field from one document reads "1 value will return to Unknown"; the owner's own answer is never
 * counted (it cites no document). Every value is TEST data.
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

async function deleteEffect(projectId: string, documentId: string): Promise<{ readonly status: number; readonly text?: string; readonly valueId?: string }> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/documents/${documentId}/delete-effect`, headers: { ...owner } });
  if (response.statusCode !== 200) return { status: response.statusCode };
  const parsed = DeleteEffectResponseSchema.parse(response.json());
  const effect = parsed.displayObjects.find((display) => display.valueId === parsed.view.effect);
  return { status: 200, ...(effect === undefined ? {} : { text: effect.text, valueId: effect.valueId }) };
}

async function step3(projectId: string): Promise<readonly DisplayObject[]> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/3`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json()).displayObjects;
}

describe('G4-39 · 2.3 "Deleting a document": the delete confirmation states its effect', { timeout: 120_000 }, () => {
  it('US-DOCS-21 AC1 · AC4 · UD-42 · 7.1.1-D4 · G4-39: a document that is the only source of three fields and one of two sources of a fourth: "3 values will return to Unknown"; Delete then leaves exactly those three Unknown', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-39 three of four');
    const serviceId = await serviceOf(api, projectId, 'G4-39');
    const memoriu = await testDocumentIn(api, { projectId, serviceId, label: 'G4-39 memoriu', fileName: 'TEST memoriu G4-39.pdf', pages: ['TEST Suprafata construita desfasurata: 2345 mp', 'TEST Regim de inaltime: 2S+P+3E', 'TEST 120 camere', 'TEST 14 zone HVAC'] });
    const releveu = await testDocumentIn(api, { projectId, serviceId, label: 'G4-39 releveu', fileName: 'TEST releveu G4-39.pdf', pages: ['TEST 14 zone HVAC'] });
    await documentValue(api, { projectId, serviceId, subjectId: buildingId, field: productionFieldOf('building.grossFloorArea'), value: { quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' } }, from: [{ document: memoriu, page: 1, excerpt: 'TEST Suprafata construita desfasurata: 2345 mp' }] });
    await documentValue(api, { projectId, serviceId, subjectId: buildingId, field: productionFieldOf('building.floors'), value: { quantity: { value: 3, unit: 'count', qualifier: 'upper' } }, from: [{ document: memoriu, page: 2, excerpt: 'TEST Regim de inaltime: 2S+P+3E' }] });
    await documentValue(api, { projectId, serviceId, subjectId: buildingId, field: productionFieldOf('building.rooms'), value: { quantity: { value: 120, unit: 'count', qualifier: 'all_spaces' } }, from: [{ document: memoriu, page: 3, excerpt: 'TEST 120 camere' }] });
    await documentValue(api, {
      projectId,
      serviceId,
      subjectId: buildingId,
      field: productionFieldOf('building.zones'),
      value: { quantity: { value: 14, unit: 'count', qualifier: 'hvac_control' } },
      from: [
        { document: memoriu, page: 4, excerpt: 'TEST 14 zone HVAC' },
        { document: releveu, page: 1, excerpt: 'TEST 14 zone HVAC' },
      ],
    });

    const effect = await deleteEffect(projectId, memoriu.id);
    expect(effect).toEqual({ status: 200, text: '3 values will return to Unknown', valueId: `document:${memoriu.id}.deleteEffect` });
    // Reading the effect removes nothing.
    expect(await deleteEffect(projectId, memoriu.id)).toEqual(effect);

    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${memoriu.id}`, headers: { ...owner } });
    expect(deleted.statusCode, deleted.body).toBe(200);
    const after = await step3(projectId);
    for (const key of ['grossFloorArea', 'floors', 'rooms']) {
      const display = after.find((entry) => entry.valueId === `building:${buildingId}.${key}`);
      expect(display?.shape, key).toBe('missing');
    }
    const zones = after.find((entry) => entry.valueId === `building:${buildingId}.zones`);
    expect(zones?.shape).toBe('value');
    expect(zones?.text).toContain('14');
    // The deleted document is no longer listed, so it has no effect to state.
    expect((await deleteEffect(projectId, memoriu.id)).status).toBe(404);
  });

  it('G4-39 · the singular, and the owner\'s own answer is never counted: one field read only from the document, beside the owner\'s own answer', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-39 one');
    const serviceId = await serviceOf(api, projectId, 'G4-39 one');
    const plan = await testDocumentIn(api, { projectId, serviceId, label: 'G4-39 plan', fileName: 'TEST plan G4-39.pdf', pages: ['TEST Suprafata construita desfasurata: 1200 mp'] });
    await documentValue(api, { projectId, serviceId, subjectId: buildingId, field: productionFieldOf('building.grossFloorArea'), value: { quantity: { value: 1200, unit: 'm2', qualifier: 'gross_total' } }, from: [{ document: plan, page: 1, excerpt: 'TEST Suprafata construita desfasurata: 1200 mp' }] });
    expect((await deleteEffect(projectId, plan.id)).text).toBe('1 value will return to Unknown');
    // The project's step 1 answers (the owner's own) cite no document: counted by no delete.
    const other = await testDocumentIn(api, { projectId, serviceId, label: 'G4-39 empty', fileName: 'TEST empty G4-39.pdf', pages: ['TEST'] });
    expect((await deleteEffect(projectId, other.id)).text).toBe('0 values will return to Unknown');
  });
});
