/**
 * ifc-input 6.2.16 (stricter choice built live, not indexed; prompt 3 section 10, phase 2:
 * "derived files are erased with their document (6.2.16). Their tests are blocking tests
 * outside tests/guardrails/, named after those proposals, and are not indexed"; prompt 3
 * section 7, "Documents stay with their project": every file derived from a document is
 * keyed by project id plus content hash "and removed by the erasure job with its document";
 * PRD R-016, R-022, R-025).
 *
 * Files derived from a document (converted models, plan images, thumbnails, page images)
 * live under the document's project id and content hash. When the owner deletes the
 * document, the erasure job removes them with the original and any job folder, and no file
 * keyed to the erased hash remains in the project. No conversion runs in phase 2 (the
 * viewer is phase 4), so the test writes the derived files where a conversion would.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readProjectDocuments, withRequest } from '@sovitech/db';
import { fixtureBytes, ownerWithProject, signIn, startTestApi, upload, type TestApi } from '../guardrails/_support/api';

let api: TestApi;

beforeAll(async () => {
  api = await startTestApi();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

describe('ifc-input 6.2.16 (stricter choice, not indexed): derived files are erased with their document', { timeout: 120_000 }, () => {
  it('ifc-input 6.2.16: deleting a model removes its converted files, plan images and job folders with it, and nothing keyed to its hash remains', async () => {
    const { ownerId, projectId } = await ownerWithProject(api, '6.2.16');
    const auth = await signIn(api, ownerId);
    const documentId = (await upload(api, auth, projectId, 'demo-hotel-arh.ifc', fixtureBytes('fixtures/ifc/demo-hotel-arh.ifc'))).body.documentId ?? '';
    const [document] = (await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request))).documents;
    const hash = document?.contentHash ?? '';
    const derived = ['model.glb', 'model.frag', 'plan-etaj-1.svg', 'thumbnail.png'].map((name) => api.files.derivedPath(projectId, hash, name));
    const leftover = join(api.files.workDirectory(projectId, hash, '0192f0a0-0000-7000-8000-0000000000ff'), 'output', 'output.json');
    for (const path of [...derived, leftover]) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, 'TEST derived bytes');
    }
    expect(await api.files.filesKeyedTo(projectId, hash)).toHaveLength(6);

    const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${documentId}`, headers: { ...auth } });
    expect(deleted.statusCode).toBe(200);
    expect(await api.files.filesKeyedTo(projectId, hash)).toEqual([]);
    expect(await api.files.hashesOf(projectId)).toEqual([]);
  });
});
