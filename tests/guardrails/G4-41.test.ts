/**
 * G4-41 (new in phase 4 part B; 2.3, "Deleting a document": "Deleting a document withdraws each candidate whose evidence
 * comes only from that document. A candidate or asset with evidence from other active documents keeps that evidence. A
 * field left with no eligible candidate returns to unknown"; 2.5, `tag?: FieldRef` (a tag is a value of its asset) and
 * "Counting"; design/dashboards-spec.md 7.1.1-D4: "The confirmation states the effect ('N values will return to
 * Unknown')"; US-DOCS-21 AC1; finding A-2).
 * Situation: Delete is opened on a document that is the only live source of three equipment tags.
 * Expected: the confirmation states that 3 values will return to Unknown, and after Delete Equipment lists none of them.
 *
 * Over a TEST database, through the API, with the production registry (no asset field is registered, so the tags are
 * the only values the list holds): `workspace.documents.deleteEffect` serves "3 values will return to Unknown" (it
 * served "0 values" before the fix, while Delete then emptied Equipment); `documents.delete` runs rule 13's erasure job;
 * Equipment then lists none of the three (G4-28). A tag also written in a second document keeps that evidence and stays
 * listed, and is not counted (G4-31). Every account, document and tag is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordAssetAppearance, withRequest } from '@sovitech/db';
import type { DocumentRecord } from '@sovitech/domain';
import { DeleteEffectResponseSchema, EquipmentResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject, serviceOf, testDocumentIn } from './_support/workspace-store';

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

async function effectOf(projectId: string, documentId: string): Promise<string | undefined> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/documents/${documentId}/delete-effect`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  const parsed = DeleteEffectResponseSchema.parse(response.json());
  return parsed.displayObjects.find((display) => display.valueId === parsed.view.effect)?.text;
}

async function listedTags(projectId: string): Promise<string[]> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/equipment`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  const parsed = EquipmentResponseSchema.parse(response.json());
  return parsed.view.rows.map((row) => parsed.displayObjects.find((display) => display.valueId === row.tag)?.text ?? '?').sort();
}

async function tagsIn(projectId: string, serviceId: string, tags: readonly (readonly [string, readonly DocumentRecord[]])[]): Promise<void> {
  await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
    for (const [tag, documents] of tags) {
      await recordAssetAppearance(request, {
        tagAsWritten: tag,
        evidence: documents.map((document) => ({ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt: 'TEST CTA-01 CTA-02 CTA-03', check: 'text_match' as const })),
        createdBy: serviceId,
      });
    }
  });
}

describe('G4-41 · 2.3 "Deleting a document" · 2.5: the delete confirmation counts the equipment tags only the document holds', { timeout: 120_000 }, () => {
  it('A-2 · US-DOCS-21 AC1 · 7.1.1-D4 · G4-41: a list that is the only live source of three tags: "3 values will return to Unknown", and Equipment lists none after Delete', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G4-41 three tags');
    const serviceId = await serviceOf(api, projectId, 'G4-41');
    const list = await testDocumentIn(api, { projectId, serviceId, label: 'G4-41 list', fileName: 'TEST lista G4-41.pdf', pages: ['TEST CTA-01 CTA-02 CTA-03'] });
    await tagsIn(projectId, serviceId, [['TEST-CTA-01', [list]], ['TEST-CTA-02', [list]], ['TEST-CTA-03', [list]]]);
    expect(await listedTags(projectId)).toEqual(['TEST-CTA-01', 'TEST-CTA-02', 'TEST-CTA-03']);

    expect(await effectOf(projectId, list.id)).toBe('3 values will return to Unknown');
    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${list.id}`, headers: { ...owner } });
    expect(deleted.statusCode, deleted.body).toBe(200);
    expect(await listedTags(projectId)).toEqual([]);
  });

  it('G4-41 · G4-31: a tag also written in a second document keeps that evidence: not counted, and still listed after Delete', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G4-41 shared tag');
    const serviceId = await serviceOf(api, projectId, 'G4-41 shared');
    const list = await testDocumentIn(api, { projectId, serviceId, label: 'G4-41 shared list', fileName: 'TEST lista G4-41.pdf', pages: ['TEST CTA-01 CTA-02 CTA-03'] });
    const schematic = await testDocumentIn(api, { projectId, serviceId, label: 'G4-41 schematic', fileName: 'TEST schema G4-41.pdf', pages: ['TEST CTA-03'] });
    await tagsIn(projectId, serviceId, [['TEST-CTA-01', [list]], ['TEST-CTA-02', [list]], ['TEST-CTA-03', [list, schematic]]]);

    expect(await effectOf(projectId, list.id)).toBe('2 values will return to Unknown');
    expect(await effectOf(projectId, schematic.id)).toBe('0 values will return to Unknown');
    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${list.id}`, headers: { ...owner } });
    expect(deleted.statusCode, deleted.body).toBe(200);
    expect(await listedTags(projectId)).toEqual(['TEST-CTA-03']);
  });
});
