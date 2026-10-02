/**
 * G13-10 (new in phase 4 part B; rule 13, "Erasure": "When an owner deletes a document or asks for erasure, one audited
 * erasure job ... removes the file, its extracted text and its embeddings"; 2.3, "Deleting a document": "A candidate or
 * asset with evidence from other active documents keeps that evidence"; US-DOCS-21 AC8: the bytes stay while another
 * document of the project holds them; finding A-4).
 * Situation: the owner deletes a document while an upload of the same bytes completes, the deletion's erasure committing
 * before the upload registers its document and its file removal running after.
 * Expected: the second document stays downloadable, and its analysis has its file.
 *
 * Over a TEST database, through the API, with the synthetic fixture `tabel-suprafete.pdf` uploaded twice:
 * - the interleaving the adversarial review found, made certain with the project's write lock: the case holds the lock,
 *   Delete waits on it, then the second upload's completion waits on it behind Delete (the lock queue grants in order);
 *   on release the erasure commits with no other document holding the bytes, the upload registers its document, and
 *   Delete's file removal, which reads the documents holding the bytes under the same lock, keeps them. Before the fix
 *   the upload registered without the lock and Delete removed the bytes after the registration (Download 404, no hash
 *   folder left);
 * - the second upload sealed while the first document still holds the bytes, then Delete runs to its end, then the
 *   upload registers: it moves its own sealed copy in.
 * Each time the second document's row is downloadable, its file downloads with the uploaded bytes, and its original is
 * stored where its analysis reads it. Every account, project and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lockProjectWrites, withRequest } from '@sovitech/db';
import { DocumentsResponseSchema } from '@sovitech/view-model/browser';
import { fixtureBytes, signIn, startTestApi, upload, type Auth, type TestApi } from './_support/api';
import { newOwnerProject } from './_support/workspace-store';

const FIXTURE = 'fixtures/pdf/tabel-suprafete.pdf';

let api: TestApi;
let owner: Auth;
let ownerId: string;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, id);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

/** How many requests wait on an advisory lock (the project's write lock is the only one these cases take). */
async function waiting(): Promise<number> {
  const [row] = await api.database.asAdministrator<{ n: number }>(`SELECT count(*)::integer AS n FROM pg_catalog.pg_locks WHERE locktype = 'advisory' AND NOT granted`);
  return row?.n ?? -1;
}

/** Waits until `count` requests wait on the lock; fails the case after ten seconds. */
async function untilWaiting(count: number, label: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while ((await waiting()) < count) {
    if (Date.now() > deadline) throw new Error(`${label}: ${String(count)} requests never waited on the project's write lock`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** The second document as the owner sees it: its row's downloadable flag, its download, and its stored original. */
async function secondDocument(projectId: string, documentId: string, bytes: Buffer): Promise<void> {
  const documents = DocumentsResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/workspace/documents`, headers: { ...owner } })).json());
  const row = documents.view.rows.find((entry) => entry.documentId === documentId);
  expect(row?.downloadable).toBe(true);
  const download = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents/${documentId}/file`, headers: { ...owner } });
  expect(download.statusCode, download.body.slice(0, 200)).toBe(200);
  expect(download.rawPayload.equals(bytes)).toBe(true);
  const [stored] = await api.database.asAdministrator<{ content_hash: string }>('SELECT content_hash FROM sovitech.documents WHERE id = $1', [documentId]);
  const hash = stored?.content_hash ?? '';
  // The analysis reads the stored original by the project and the content hash (the extractor's read-only mount).
  expect(await api.files.exists(api.files.originalPath(projectId, hash))).toBe(true);
  expect(await api.files.hashesOf(projectId)).toEqual([hash]);
}

describe('G13-10 · rule 13 "Erasure" · 2.3: Delete racing an upload of the same bytes', { timeout: 120_000 }, () => {
  it('A-4 · US-DOCS-21 AC8 · G13-10: the erasure commits, the upload registers, then the file removal runs: the second document keeps its original', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G13-10 lock queue');
    const bytes = fixtureBytes(FIXTURE);
    const first = await upload(api, owner, projectId, 'TEST first G13-10.pdf', bytes);
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    const firstId = first.body.documentId ?? '';

    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const lockTaken = new Promise<void>((resolve) => (locked = resolve));
    const holder = withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
      await lockProjectWrites(request);
      locked();
      await released;
    });
    await lockTaken;
    try {
      const deleting = api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${firstId}`, headers: { ...owner } });
      await untilWaiting(1, 'Delete');
      const uploading = upload(api, owner, projectId, 'TEST second G13-10.pdf', bytes);
      await untilWaiting(2, 'the second upload');
      release();
      await holder;
      const [deleted, second] = await Promise.all([deleting, uploading]);
      expect(deleted.statusCode, deleted.body).toBe(200);
      expect(second.status, JSON.stringify(second.body)).toBe(201);
      await secondDocument(projectId, second.body.documentId ?? '', bytes);
    } finally {
      release();
      await holder;
    }
  });

  it('A-4 · G13-10: the second upload sealed while the first document holds the bytes, then Delete runs to its end: the upload moves its sealed copy in', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G13-10 sealed first');
    const bytes = fixtureBytes(FIXTURE);
    const first = await upload(api, owner, projectId, 'TEST first G13-10.pdf', bytes);
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    const files = api.files as unknown as { sealStaged: (projectId: string, uploadId: string, size: number) => Promise<string> };
    const seal = files.sealStaged.bind(api.files);
    let reached!: () => void;
    const sealed = new Promise<void>((resolve) => (reached = resolve));
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    files.sealStaged = async (...args) => {
      const hash = await seal(...args);
      reached();
      await released;
      return hash;
    };
    try {
      const uploading = upload(api, owner, projectId, 'TEST second G13-10.pdf', bytes);
      await sealed;
      const deleted = await api.app.inject({ method: 'DELETE', url: `/api/projects/${projectId}/documents/${first.body.documentId ?? ''}`, headers: { ...owner } });
      expect(deleted.statusCode, deleted.body).toBe(200);
      expect(await api.files.hashesOf(projectId)).toEqual([]);
      release();
      const second = await uploading;
      expect(second.status, JSON.stringify(second.body)).toBe(201);
      await secondDocument(projectId, second.body.documentId ?? '', bytes);
    } finally {
      release();
      files.sealStaged = seal;
    }
  });
});
