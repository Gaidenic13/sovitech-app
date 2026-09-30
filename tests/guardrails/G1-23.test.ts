/**
 * G1-23 (docs/guardrails.md section 7; 2.3, `contentHash`: "identifies the exact revision that was
 * read"; rule 1, "Enforced by": "The content hash matches"). Phase 2 review, adversarial finding
 * "hash race: nothing serialises appends to one upload session" (high).
 * Situation: two chunks of one upload are sent at the same offset, one of them with bytes that are
 * not the file's, and the upload completes.
 * Expected: the stored file holds exactly the bytes its recorded content hash names.
 *
 * On a TEST database and a TEST data folder, the owner uploads a generated synthetic fixture
 * through the upload protocol. The first chunk holds the upload while its body is still arriving;
 * a second chunk at the same offset, with TEST bytes, arrives meanwhile. Before the fix both passed
 * the offset check, and the second, still open after the completion had hashed the fixture's bytes
 * and moved the staged file, appended its bytes into the stored original under the fixture's hash.
 * Now the second is refused while the first holds the upload (`upload_busy`), and the completion
 * stores a sealed copy of exactly the bytes it hashed.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { readProjectDocuments, withRequest } from '@sovitech/db';
import { fixtureBytes, ownerWithProject, signIn, startTestApi, type Auth, type TestApi } from './_support/api';

const FIXTURE = 'fixtures/pdf/nota-proiectant.pdf';

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'G1-23'));
  auth = await signIn(api, ownerId);
}, 240_000);

afterAll(async () => {
  await api.stop();
});

function append(uploadId: string, offset: number, payload: Buffer | PassThrough) {
  return api.app.inject({
    method: 'PUT',
    url: `/api/projects/${projectId}/uploads/${uploadId}?offset=${offset}`,
    headers: { ...auth, 'content-type': 'application/octet-stream' },
    payload,
  });
}

/** Waits until the first chunk holds the upload (its request has taken the upload's lease). */
async function heldByTheFirstChunk(uploadId: string): Promise<void> {
  for (let tries = 0; tries < 200; tries += 1) {
    const [row] = await api.database.asAdministrator<{ state: string }>('SELECT state FROM sovitech_work.upload_sessions WHERE id = $1', [uploadId]);
    if (row?.state === 'appending') return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('the first chunk never held the upload');
}

test('US-DOCS-01 · F-INGEST-01 · F-INGEST-02 · G1-23: two chunks at the same offset, one of them not the file\'s bytes: the stored file holds exactly the bytes its content hash names', async () => {
  const bytes = fixtureBytes(FIXTURE);
  const created = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { ...auth }, payload: { fileName: 'nota-proiectant.pdf', size: bytes.length } });
  expect(created.statusCode).toBe(201);
  const uploadId = (created.json() as { uploadId: string }).uploadId;

  // The first chunk at offset 0 holds the upload, its body still arriving; a second at offset 0 carries TEST bytes.
  const slow = new PassThrough();
  const first = append(uploadId, 0, slow);
  await heldByTheFirstChunk(uploadId);
  const second = await append(uploadId, 0, Buffer.from('TEST bytes that are not the file'));
  expect({ status: second.statusCode, code: (second.json() as { code: string }).code }).toEqual({ status: 409, code: 'upload_busy' });
  slow.end(bytes);
  expect((await first).statusCode).toBe(200);

  const completed = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads/${uploadId}/complete`, headers: { ...auth } });
  expect(completed.statusCode).toBe(201);

  // The recorded content hash names the stored bytes, and they are the file's bytes exactly.
  const recorded = await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => (await readProjectDocuments(request)).documents.map((document) => document.contentHash));
  expect(recorded).toHaveLength(1);
  const contentHash = recorded[0] ?? '';
  const stored = await readFile(api.files.originalPath(projectId, contentHash));
  expect(`sha256:${createHash('sha256').update(stored).digest('hex')}`).toBe(contentHash);
  expect(stored.equals(bytes)).toBe(true);
});
