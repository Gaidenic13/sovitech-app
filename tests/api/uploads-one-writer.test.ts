/**
 * One writer at a time per upload, and abandoned uploads swept (the phase 2 review's upload hash
 * race; docs/adr/0019-resumable-uploads-chunk-protocol.md; docs/adr/0028-upload-guard-fixtures-only.md;
 * migration 0011). On a TEST database and a TEST data folder; the bytes uploaded are a generated
 * synthetic fixture, or TEST bytes.
 *
 * The attack: two appends at the same offset both passed the offset check; after the completion
 * hashed the fixture's bytes and moved the staged file, the second, still open, appended bytes no
 * guard saw into the stored original under the fixture's hash. Now each append and the completion
 * hold the upload's lease: the second append and a completion during an append are refused
 * (`upload_busy`), and the completion stores a sealed copy of exactly the bytes it hashed.
 */
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUploadSession, readUploadSession } from '@sovitech/db';
import { ABANDONED_UPLOAD_SECONDS, sweepAbandonedUploads } from '../../apps/api/src/uploads/service';
import { fixtureBytes, ownerWithProject, signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';

const FIXTURE = 'fixtures/pdf/nota-proiectant.pdf';

let api: TestApi;
let ownerId: string;
let projectId: string;
let auth: Auth;

beforeAll(async () => {
  api = await startTestApi();
  ({ ownerId, projectId } = await ownerWithProject(api, 'one writer'));
  auth = await signIn(api, ownerId);
}, 240_000);

afterAll(async () => {
  await api.stop();
});

async function open(fileName: string, size: number): Promise<string> {
  const created = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads`, headers: { ...auth }, payload: { fileName, size } });
  expect(created.statusCode).toBe(201);
  return (created.json() as { uploadId: string }).uploadId;
}

function append(uploadId: string, offset: number, payload: Buffer | PassThrough) {
  return api.app.inject({
    method: 'PUT',
    url: `/api/projects/${projectId}/uploads/${uploadId}?offset=${offset}`,
    headers: { ...auth, 'content-type': 'application/octet-stream' },
    payload,
  });
}

function complete(uploadId: string) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads/${uploadId}/complete`, headers: { ...auth } });
}

async function sessionState(uploadId: string): Promise<string | undefined> {
  const [row] = await api.database.asAdministrator<{ state: string }>('SELECT state FROM sovitech_work.upload_sessions WHERE id = $1', [uploadId]);
  return row?.state;
}

/** Waits until the session is held by an append (the first request has its lease). */
async function held(uploadId: string): Promise<void> {
  for (let tries = 0; tries < 200; tries += 1) {
    if ((await sessionState(uploadId)) === 'appending') return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('the first append never took the lease');
}

describe('abandoned uploads (ADR 0019, ADR 0028)', () => {
  it('F-INGEST-01 · rule 13 · ADR 0028: an upload with no append for the sweep\'s time goes with its staged bytes and its file name, from the API process itself; a fresh one and one held by a request stay', async () => {
    const other = await ownerWithProject(api, 'one writer sweep');
    const scope = { userId: other.ownerId, projectId: other.projectId };
    const make = async (label: string): Promise<string> => {
      const id = await createUploadSession(api.database.app.db, { projectId: other.projectId, userId: other.ownerId, fileName: `TEST ${label}.pdf`, format: 'pdf', declaredSize: 64 });
      await api.files.startStaging(other.projectId, id);
      return id;
    };
    const abandoned = await make('abandoned');
    const fresh = await make('fresh');
    const leased = await make('leased');
    const long = `${ABANDONED_UPLOAD_SECONDS + 60} seconds`;
    await api.database.asAdministrator(`UPDATE sovitech_work.upload_sessions SET created_at = clock_timestamp() - $2::interval WHERE id = ANY ($1::uuid[])`, [[abandoned, leased], long]);
    await api.database.asAdministrator(
      `UPDATE sovitech_work.upload_sessions SET state = 'appending', lease_id = gen_random_uuid(), lease_until = clock_timestamp() + interval '1 hour' WHERE id = $1`,
      [leased],
    );

    // Opening an upload runs the sweep in the API process (the first upload opened on this API: the sweep runs at most once a minute).
    const otherAuth = await signIn(api, other.ownerId);
    const opened = await api.app.inject({ method: 'POST', url: `/api/projects/${other.projectId}/uploads`, headers: { ...otherAuth }, payload: { fileName: 'TEST new.pdf', size: 10 } });
    expect(opened.statusCode).toBe(201);

    const read = (id: string) => readUploadSession(api.database.app.db, { id, projectId: scope.projectId, userId: scope.userId });
    expect(await read(abandoned)).toBeUndefined();
    expect(await api.files.stagedSize(other.projectId, abandoned)).toBeUndefined();
    expect(await read(fresh)).toMatchObject({ fileName: 'TEST fresh.pdf' });
    expect(await api.files.stagedSize(other.projectId, fresh)).toBe(0);
    expect(await read(leased)).toMatchObject({ fileName: 'TEST leased.pdf' });

    // The same sweep, as the worker runs it, removes nothing more now.
    expect(await sweepAbandonedUploads(api.services)).toEqual([]);
  });
});

describe('one writer at a time per upload (migration 0011)', () => {
  it('US-DOCS-01 · F-INGEST-01 · F-INGEST-02 · ADR 0028: while one append holds an upload, a second append at the same offset and the completion are refused, and the stored original is exactly the fixture\'s hashed bytes', async () => {
    const bytes = fixtureBytes(FIXTURE);
    const uploadId = await open('nota-proiectant.pdf', bytes.length);

    // The first append holds the upload, its body still arriving.
    const slow = new PassThrough();
    const first = append(uploadId, 0, slow);
    await held(uploadId);

    // A second append at the same offset, with TEST bytes no guard would take, is refused.
    const second = await append(uploadId, 0, Buffer.from('TEST bytes that are not the fixture'));
    expect({ status: second.statusCode, code: (second.json() as { code: string }).code }).toEqual({ status: 409, code: 'upload_busy' });
    // So is the completion, while the first append holds the upload.
    const early = await complete(uploadId);
    expect({ status: early.statusCode, code: (early.json() as { code: string }).code }).toEqual({ status: 409, code: 'upload_busy' });

    slow.end(bytes);
    const done = await first;
    expect({ status: done.statusCode, received: (done.json() as { received: number }).received }).toEqual({ status: 200, received: bytes.length });
    expect(await sessionState(uploadId)).toBe('open');

    // The offset is checked again under the lease: a late chunk at 0 learns the bytes held.
    const late = await append(uploadId, 0, Buffer.from('TEST late chunk'));
    expect({ status: late.statusCode, body: late.json() }).toEqual({ status: 409, body: { code: 'offset_mismatch', received: bytes.length } });

    const completed = await complete(uploadId);
    expect(completed.statusCode).toBe(201);
    const hash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const stored = await readFile(api.files.originalPath(projectId, hash));
    expect(stored.equals(bytes)).toBe(true);
    // The staged bytes and the sealed copy are gone, and so is the session.
    expect(await api.files.stagedSize(projectId, uploadId)).toBeUndefined();
    await expect(stat(api.files.sealedPath(projectId, uploadId))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await sessionState(uploadId)).toBeUndefined();
  });

  it('F-INGEST-01 · ADR 0019: a lease whose request went away ends, and the upload resumes', async () => {
    const bytes = fixtureBytes(FIXTURE);
    const uploadId = await open('nota-proiectant again.pdf', bytes.length);
    // A lease left by a request that died: taken, never given back, its time over.
    await api.database.asAdministrator(
      `UPDATE sovitech_work.upload_sessions SET state = 'appending', lease_id = gen_random_uuid(), lease_until = clock_timestamp() - interval '1 second' WHERE id = $1`,
      [uploadId],
    );
    const resumed = await append(uploadId, 0, bytes);
    expect(resumed.statusCode).toBe(200);
    // One still in its time is respected.
    await api.database.asAdministrator(
      `UPDATE sovitech_work.upload_sessions SET state = 'appending', lease_id = gen_random_uuid(), lease_until = clock_timestamp() + interval '1 hour' WHERE id = $1`,
      [uploadId],
    );
    const busy = await complete(uploadId);
    expect({ status: busy.statusCode, code: (busy.json() as { code: string }).code }).toEqual({ status: 409, code: 'upload_busy' });
    await api.database.asAdministrator(`UPDATE sovitech_work.upload_sessions SET state = 'open', lease_id = NULL, lease_until = NULL WHERE id = $1`, [uploadId]);
    expect((await complete(uploadId)).statusCode).toBe(201);
  });

  it('F-INGEST-01 · rule 13: the app cannot rewrite the owner-typed file name of an upload in flight, only its lease', async () => {
    const uploadId = await open('TEST name.pdf', 10);
    await expect(api.database.as('app', `UPDATE sovitech_work.upload_sessions SET file_name = 'x' WHERE id = '${uploadId}'`)).rejects.toThrow();
  });
});
