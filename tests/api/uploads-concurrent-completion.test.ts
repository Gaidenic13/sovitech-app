/**
 * Two uploads completing at the same time in a new project (found by the phase 3 e2e flow (b):
 * step 2 uploads two files at a time, PARALLEL_UPLOADS in apps/web/src/api/uploads.ts). Each
 * completion registers its document and, for a file the extractor reads, adds the extraction
 * service account as a member of the project when it is not one yet. Both completions read it as
 * absent, and the second insert failed on the members' key: the owner saw "This file could not be
 * uploaded", and the upload stayed open. Now the completions of one project add the member one after
 * the other (a transaction-level lock), and both documents are stored and queued.
 *
 * On a TEST database and a TEST data folder; the bytes are generated synthetic fixtures.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fixtureBytes, ownerWithProject, signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';

const FILES = ['fixtures/pdf/tabel-suprafete.pdf', 'fixtures/xlsx/tabel-camere.xlsx', 'fixtures/pdf/nota-proiectant.pdf'];

let api: TestApi;

beforeAll(async () => {
  api = await startTestApi();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

async function upload(auth: Auth, projectId: string, path: string): Promise<{ status: number; body: string }> {
  const bytes = fixtureBytes(path);
  const fileName = path.split('/').at(-1) ?? path;
  const created = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { ...auth }, payload: { fileName, size: bytes.length } });
  expect(created.statusCode, created.body).toBe(201);
  const { uploadId } = created.json() as { uploadId: string };
  const appended = await api.app.inject({
    method: 'PUT',
    url: `/api/projects/${projectId}/uploads/${uploadId}?offset=0`,
    headers: { ...auth, 'content-type': 'application/octet-stream' },
    payload: bytes,
  });
  expect(appended.statusCode, appended.body).toBe(200);
  const done = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads/${uploadId}/complete`, headers: { ...auth } });
  return { status: done.statusCode, body: done.body };
}

describe('uploads completing together in a new project (phase 3 integration)', () => {
  it('US-DOCS-01 AC1 · US-DOCS-03 · R-013 · rule 7: every upload completing at once is stored and queued, and the extraction account is added once', { timeout: 120_000 }, async () => {
    for (let round = 0; round < 3; round += 1) {
      const { ownerId, projectId } = await ownerWithProject(api, `concurrent completion ${String(round)}`);
      const auth = await signIn(api, ownerId);
      const results = await Promise.all(FILES.map((path) => upload(auth, projectId, path)));
      expect(results.map((result) => result.status), results.map((result) => result.body).join('\n')).toEqual(FILES.map(() => 201));
      const members = await api.database.asAdministrator<{ count: number }>(
        'SELECT count(*)::int AS count FROM sovitech.project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, api.extractionAccountId],
      );
      expect(members).toEqual([{ count: 1 }]);
      const jobs = await api.database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech_work.analysis_jobs WHERE project_id = $1', [projectId]);
      expect(jobs).toEqual([{ count: FILES.length }]);
    }
  });
});
