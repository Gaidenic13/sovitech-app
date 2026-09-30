/**
 * The upload protocol end to end (docs/adr/0019, 0024, 0025; prompt 3 section 10, phase
 * 2, "Uploads"; section 11, "Security basics"; PRD R-013, R-014, R-022). Every account and
 * project is TEST data; the files are the generated synthetic fixtures, or TEST bytes.
 */
import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readProjectDocuments, readDocumentFiles, readAnalysisJobs, withRequest } from '@sovitech/db';
import { createTestAccount } from '@sovitech/db/testing';
import { documentList, fixtureBytes, ownerWithProject, signIn, startTestApi, upload, type TestApi } from '../guardrails/_support/api';

const LONG = { timeout: 120_000 };
let api: TestApi;

beforeAll(async () => {
  api = await startTestApi();
}, 240_000);

afterAll(async () => {
  await api.stop();
});

describe('the upload protocol (ADR 0019)', LONG, () => {
  it('US-DOCS-01 · F-INGEST-01 · F-INGEST-02 · F-INGEST-04: stores a fixture PDF under its project id and content hash, registers it queued, and queues its analysis', async () => {
    const { ownerId, projectId } = await ownerWithProject(api, 'uploads pdf');
    const auth = await signIn(api, ownerId);
    const bytes = fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf');
    const uploaded = await upload(api, auth, projectId, 'memoriu-tehnic.pdf', bytes, 4096);
    expect(uploaded.status).toBe(201);
    const documentId = uploaded.body.documentId ?? '';
    expect(uploaded.body.statusLine).toEqual({ kind: 'progress' });

    const contentHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const stored = await stat(api.files.originalPath(projectId, contentHash));
    expect(stored.size).toBe(bytes.length);

    const read = await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => ({
      documents: await readProjectDocuments(request),
      files: await readDocumentFiles(request),
    }));
    expect(read.documents.documents).toMatchObject([{ id: documentId, contentHash, stage: 'unknown', analysis: { status: 'queued', coverage: 'pending' } }]);
    expect(read.documents.documents[0]).not.toHaveProperty('revision');
    expect(read.files).toEqual([{ documentId, contentHash, format: 'pdf', byteSize: `${bytes.length}` }]);
    expect(await readAnalysisJobs(api.database.app.db, { projectId, documentId })).toMatchObject([{ state: 'queued', contentHash }]);

    expect(await documentList(api, auth, projectId)).toEqual([
      { documentId, fileName: 'memoriu-tehnic.pdf', format: 'pdf', stage: 'unknown', statusLine: { kind: 'progress' } },
    ]);
    // Logs name codes and ids, never a file name.
    expect(JSON.stringify(api.log)).not.toContain('memoriu');
  });

  it("US-DOCS-01 · F-INGEST-01 · ADR 0028: refuses a file that is not a fixture with the owner's clear message, stores and registers nothing, and logs the refusal by code", async () => {
    const { ownerId, projectId } = await ownerWithProject(api, 'uploads refused');
    const auth = await signIn(api, ownerId);
    const bytes = Buffer.from('TEST bytes that are not a generated fixture');
    const uploaded = await upload(api, auth, projectId, 'TEST plan.pdf', bytes);
    expect(uploaded).toMatchObject({ status: 422, body: { code: 'not_a_fixture', message: expect.stringContaining('fixtures/manifest.json') } });
    expect(await api.files.hashesOf(projectId)).toEqual([]);
    const documents = await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => readProjectDocuments(request));
    expect(documents.documents).toEqual([]);
    expect(api.log).toContainEqual(expect.objectContaining({ event: 'upload_refused', code: 'not_a_fixture', projectId }));
  });

  it('US-DOCS-01 · US-DOCS-02 · F-INGEST-01: refuses a format off the accepted line and a file over the limit on their own row, and nothing else', async () => {
    const { ownerId, projectId } = await ownerWithProject(api, 'uploads formats');
    const auth = await signIn(api, ownerId);
    const format = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { ...auth }, payload: { fileName: 'TEST notes.txt', size: 10 } });
    expect(format.statusCode).toBe(415);
    expect(format.json()).toMatchObject({ code: 'format_not_accepted' });
    const large = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { ...auth }, payload: { fileName: 'TEST model.ifc', size: 500 * 1024 * 1024 + 1 } });
    expect(large.statusCode).toBe(413);
    const fine = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { ...auth }, payload: { fileName: 'TEST model.ifc', size: 500 * 1024 * 1024 } });
    expect(fine.statusCode).toBe(201);
  });

  it('US-DOCS-01 · F-INGEST-01 · ADR 0019: resumes from the offset the server holds, and refuses a chunk at any other offset or past the declared size', async () => {
    const { ownerId, projectId } = await ownerWithProject(api, 'uploads resume');
    const auth = await signIn(api, ownerId);
    const bytes = fixtureBytes('fixtures/xlsx/tabel-camere.xlsx');
    const created = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { ...auth }, payload: { fileName: 'tabel-camere.xlsx', size: bytes.length } });
    const { uploadId } = created.json() as { uploadId: string };
    const put = (offset: number, chunk: Buffer) =>
      api.app.inject({ method: 'PUT', url: `/api/projects/${projectId}/uploads/${uploadId}?offset=${offset}`, headers: { ...auth, 'content-type': 'application/octet-stream' }, payload: chunk });
    expect((await put(0, bytes.subarray(0, 1000))).json()).toMatchObject({ received: 1000 });
    const wrong = await put(0, bytes.subarray(0, 1000));
    expect(wrong.statusCode).toBe(409);
    expect(wrong.json()).toEqual({ code: 'offset_mismatch', received: 1000 });
    const status = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/uploads/${uploadId}`, headers: { ...auth } });
    expect(status.json()).toMatchObject({ received: 1000 });
    const early = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads/${uploadId}/complete`, headers: { ...auth } });
    expect(early.json()).toEqual({ code: 'upload_incomplete', received: 1000 });
    const past = await put(1000, Buffer.concat([bytes.subarray(1000), Buffer.from('TEST extra')]));
    expect(past.statusCode).toBe(413);
    expect((await put(1000, bytes.subarray(1000))).json()).toMatchObject({ received: bytes.length });
    const done = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads/${uploadId}/complete`, headers: { ...auth } });
    expect(done.statusCode).toBe(201);
  });

  it('US-ADMIN-01 · F-AUTH-01: refuses state-changing requests without the CSRF token, and every project route without a session', async () => {
    const { ownerId, projectId } = await ownerWithProject(api, 'uploads csrf');
    const auth = await signIn(api, ownerId);
    const noToken = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { cookie: auth.cookie }, payload: { fileName: 'TEST.pdf', size: 1 } });
    expect(noToken.statusCode).toBe(403);
    const noSession = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents` });
    expect(noSession.statusCode).toBe(401);
  });

  it("US-ADMIN-04 · US-DOCS-11 · F-AUTH-02 · F-AUTH-03: reads another project as not found, and refuses an upload by a member who is not the owner", async () => {
    const first = await ownerWithProject(api, 'uploads first');
    const second = await ownerWithProject(api, 'uploads second');
    const auth = await signIn(api, second.ownerId);
    const other = await api.app.inject({ method: 'GET', url: `/api/projects/${first.projectId}/documents`, headers: { ...auth } });
    expect(other.statusCode).toBe(404);
    const created = await api.app.inject({ method: 'POST', url: `/api/projects/${first.projectId}/uploads`, headers: { ...auth }, payload: { fileName: 'TEST.pdf', size: 1 } });
    expect(created.statusCode).toBe(404);
    const reviewer = await createTestAccount(api.database, { label: 'uploads reviewer', kind: 'person', roles: ['sovitech_commercial_reviewer'] });
    const reviewerAuth = await signIn(api, reviewer);
    const byReviewer = await api.app.inject({ method: 'POST', url: `/api/projects/${first.projectId}/uploads`, headers: { ...reviewerAuth }, payload: { fileName: 'TEST.pdf', size: 1 } });
    expect([403, 404]).toContain(byReviewer.statusCode);
  });

  it('US-DOCS-11 · F-INGEST-02 · rule 13: stores byte-identical uploads in one project once, as two documents of the same bytes', async () => {
    const { ownerId, projectId } = await ownerWithProject(api, 'uploads twice');
    const auth = await signIn(api, ownerId);
    const bytes = fixtureBytes('fixtures/pdf/nota-proiectant.pdf');
    const first = await upload(api, auth, projectId, 'nota-proiectant.pdf', bytes);
    const second = await upload(api, auth, projectId, 'nota-proiectant copy.pdf', bytes);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.documentId).not.toBe(second.body.documentId);
    expect(await api.files.hashesOf(projectId)).toHaveLength(1);
    const names = (await documentList(api, auth, projectId)).map((row) => row['fileName']).sort();
    expect(names).toEqual(['nota-proiectant copy.pdf', 'nota-proiectant.pdf']);
  });
});
