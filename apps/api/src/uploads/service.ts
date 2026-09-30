/**
 * The upload protocol (docs/adr/0019-resumable-uploads-chunk-protocol.md; prompt 3
 * section 10, phase 2, "Uploads": chunked and resumable, up to 500 MB per file,
 * content-hashed; section 11, "Security basics": upload type and size checks; PRD R-013,
 * R-021's "Until decided": no total limit).
 *
 * create -> append chunks at the offset the server holds -> complete (hash, the owner's
 * fixtures-only guard, the file moved under its project id and content hash, the
 * DocumentRecord registered, its analysis queued) -> or abort. A refusal names the file's
 * own problem and blocks nothing else (rule 7). Nothing here logs a file name or content
 * (rule 13).
 *
 * One writer at a time (migration 0011): each append and the completion hold the upload's
 * lease, taken in one database update, so a second append at the same offset, or an append
 * while the upload completes, is refused (`upload_busy`), and the offset is checked again
 * under the lease. The completion copies exactly the declared bytes out of the staged file
 * into a sealed copy while hashing them, and stores that copy: the stored original is always
 * the bytes the guard checked, even if another descriptor wrote to the staged file.
 *
 * Abandoned uploads (no append for ABANDONED_UPLOAD_SECONDS) are swept with their staged bytes
 * and their file name by `sweepAbandonedUploads`, which this API process runs when an upload
 * is opened (at most once a minute), and the worker runs on its own schedule. The bytes go
 * first and the session after, so a removal that fails leaves the session for the next sweep.
 */
import type { Readable } from 'node:stream';
import {
  claimAbandonedUpload,
  claimUploadLease,
  createUploadSession,
  deleteAbandonedUpload,
  deleteUploadSession,
  readUploadSession,
  releaseAbandonedUpload,
  releaseUploadLease,
  staleUploadSessions,
  withRequest,
  type Store,
  type UploadSession,
} from '@sovitech/db';
import type { DocumentRecord } from '@sovitech/domain';
import { ApiRefusal, notFound, type ChunkCutCode } from '../errors';
import { inProject, registerUpload, requireOwner } from '../documents/service';
import { MAX_FILE_BYTES, formatOfFileName } from '../documents/formats';
import type { ModelReadingServices } from '../documents/model-reading';
import type { ApiServices } from '../services';
import { FileStoreError } from '../storage/file-store';
import { NOT_A_FIXTURE_MESSAGE } from './fixture-guard';

/** The largest chunk the server takes in one request: 8 MiB. */
export const CHUNK_BYTES = 8 * 1024 * 1024;

/** How long one chunk may take to arrive; past it the chunk is dropped and the client resumes. */
export const APPEND_DEADLINE_SECONDS = 120;
/** An append's lease: its deadline and a margin, so the write has ended before the lease can. */
export const APPEND_LEASE_SECONDS = APPEND_DEADLINE_SECONDS + 60;
/** A completion's lease: the copy of up to 500 MB while hashing, and the registration. */
export const COMPLETE_LEASE_SECONDS = 600;
/** An upload with no append or completion for this long is abandoned (ADR 0019, ADR 0028). */
export const ABANDONED_UPLOAD_SECONDS = 30 * 60;
/** The API process sweeps abandoned uploads at most this often. */
const SWEEP_EVERY_MS = 60 * 1000;

export interface UploadState {
  readonly uploadId: string;
  /** Bytes the server holds, so the client resumes from there. */
  readonly received: number;
  readonly chunkBytes: number;
}

type Scope = { readonly userId: string; readonly projectId: string };

/** The whole number of bytes the client declared, from a JSON body. Undefined when it is not one. */
function declaredBytes(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
}

/** When each set of services last swept abandoned uploads. */
const lastSweep = new WeakMap<object, number>();

/** How long the sweep holds an abandoned upload while its bytes go: far longer than removing two files takes. */
const SWEEP_LEASE_SECONDS = APPEND_LEASE_SECONDS;

/** The store's side of the sweep (the store's own functions over the app's login; a unit test hands its own). */
export interface AbandonedUploadStore {
  /** The sessions abandoned for `olderThanSeconds`, with no lease held. */
  readonly stale: (olderThanSeconds: number) => Promise<readonly { readonly id: string; readonly projectId: string }[]>;
  /** Takes one for the sweep while it is still abandoned; its last activity unchanged. The lease id, or undefined. */
  readonly claim: (id: string, olderThanSeconds: number, leaseSeconds: number) => Promise<string | undefined>;
  /** Gives the sweep's lease back, its last activity unchanged, so the session is still abandoned. */
  readonly release: (id: string, leaseId: string) => Promise<boolean>;
  /** Deletes the session the sweep holds, with its file name. */
  readonly remove: (id: string, leaseId: string) => Promise<boolean>;
}

/** The sweep's store operations over the store. */
export function abandonedUploadStore(store: Store): AbandonedUploadStore {
  return {
    stale: (olderThanSeconds) => staleUploadSessions(store.db, olderThanSeconds),
    claim: (id, olderThanSeconds, leaseSeconds) => claimAbandonedUpload(store.db, { id, olderThanSeconds, leaseSeconds }),
    release: (id, leaseId) => releaseAbandonedUpload(store.db, { id, leaseId }),
    remove: (id, leaseId) => deleteAbandonedUpload(store.db, { id, leaseId }),
  };
}

/** Some abandoned uploads' bytes could not be removed; their sessions stay for the next sweep. A code, no names. */
export class UploadSweepIncomplete extends Error {
  readonly code = 'upload_sweep_incomplete';
  constructor(readonly sessionsLeft: number) {
    super('upload_sweep_incomplete');
    this.name = 'UploadSweepIncomplete';
  }
}

/**
 * Removes abandoned uploads: each session with no append or completion for `olderThanSeconds` and no lease held. The
 * sweep takes the session first (so no append or completion takes it meanwhile; a session an append took stays), then
 * removes its staged bytes and any sealed copy, and only then deletes the session with the owner-typed file name it
 * holds. When the bytes cannot be removed, the session is given back still abandoned and kept, so the next sweep finds
 * it and removes them: bytes never stay without a session that leads the sweep to them. The other sessions are swept
 * all the same, and the sweep then throws `UploadSweepIncomplete`. Returns the ids of the sessions that went.
 */
export async function sweepAbandonedUploads(
  services: Pick<ApiServices, 'store' | 'files'>,
  olderThanSeconds: number = ABANDONED_UPLOAD_SECONDS,
  sessions: AbandonedUploadStore = abandonedUploadStore(services.store),
): Promise<readonly string[]> {
  const removed: string[] = [];
  let left = 0;
  for (const session of await sessions.stale(olderThanSeconds)) {
    const leaseId = await sessions.claim(session.id, olderThanSeconds, SWEEP_LEASE_SECONDS);
    if (leaseId === undefined) continue;
    try {
      await services.files.removeStaged(session.projectId, session.id);
    } catch {
      left += 1;
      // Kept for the next sweep; a release that fails leaves the lease to end on its own, and the session is still abandoned then.
      await sessions.release(session.id, leaseId).catch(() => false);
      continue;
    }
    if (await sessions.remove(session.id, leaseId)) removed.push(session.id);
  }
  if (left > 0) throw new UploadSweepIncomplete(left);
  return removed;
}

/** Runs the sweep from the API process, at most once a minute per set of services; a failure is logged as a code. */
async function sweepNowAndThen(services: Pick<ApiServices, 'store' | 'files' | 'log'>): Promise<void> {
  const now = Date.now();
  if (now - (lastSweep.get(services) ?? Number.NEGATIVE_INFINITY) < SWEEP_EVERY_MS) return;
  lastSweep.set(services, now);
  try {
    await sweepAbandonedUploads(services);
  } catch {
    services.log({ event: 'upload_sweep_failed', code: 'sweep_failed' });
  }
}

/** Opens an upload: the owner of the project, an accepted format, a size within the limit. */
export async function createUpload(services: Pick<ApiServices, 'store' | 'files' | 'log'>, scope: Scope, body: { readonly fileName: unknown; readonly size: unknown }): Promise<UploadState> {
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const size = declaredBytes(body.size);
  if (fileName === '' || fileName.length > 255 || /[\p{Cc}/\\]/u.test(fileName)) throw new ApiRefusal(400, 'file_name_invalid');
  const format = formatOfFileName(fileName);
  if (format === undefined) throw new ApiRefusal(415, 'format_not_accepted', 'This format is not on the accepted list. The other files are kept.');
  if (size === undefined || size < 1) throw new ApiRefusal(400, 'size_invalid');
  if (size > MAX_FILE_BYTES) throw new ApiRefusal(413, 'file_too_large', 'This file is larger than the size limit. The other files are kept.');
  await sweepNowAndThen(services);
  const uploadId = await inProject(services, scope, async (request) => {
    await requireOwner(request);
    return createUploadSession(request.trx, { projectId: scope.projectId, userId: scope.userId, fileName, format, declaredSize: size });
  });
  await services.files.startStaging(scope.projectId, uploadId);
  return { uploadId, received: 0, chunkBytes: CHUNK_BYTES };
}

async function sessionOf(services: Pick<ApiServices, 'store'>, scope: Scope, uploadId: string): Promise<UploadSession> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(uploadId)) throw notFound();
  const session = await withRequest(services.store, scope, (request) => readUploadSession(request.trx, { id: uploadId, projectId: scope.projectId, userId: scope.userId }));
  if (session === undefined) throw notFound();
  return session;
}

/**
 * Runs `work` while this request holds the upload's lease, and gives the lease back after.
 * Another request holding it refuses this one with `upload_busy`: the client asks for the
 * status and resumes from the bytes held.
 */
async function underLease<T>(
  services: Pick<ApiServices, 'store' | 'log'>,
  scope: Scope,
  session: UploadSession,
  purpose: 'appending' | 'completing',
  work: () => Promise<T>,
): Promise<T> {
  const leaseSeconds = purpose === 'appending' ? APPEND_LEASE_SECONDS : COMPLETE_LEASE_SECONDS;
  const leaseId = await withRequest(services.store, scope, (request) =>
    claimUploadLease(request.trx, { id: session.id, projectId: scope.projectId, userId: scope.userId, purpose, leaseSeconds }),
  );
  if (leaseId === undefined) throw new ApiRefusal(409, 'upload_busy');
  try {
    return await work();
  } finally {
    // A completed or refused upload's session is gone, and its lease with it. A release that
    // fails leaves the lease to end on its own time.
    await withRequest(services.store, scope, (request) => releaseUploadLease(request.trx, { id: session.id, leaseId })).catch(() => {
      services.log({ event: 'upload_lease_not_released', code: 'lease_release_failed', projectId: scope.projectId, uploadId: session.id });
    });
  }
}

/** Where an upload stands: the bytes the server holds. */
export async function uploadStatus(services: Pick<ApiServices, 'store' | 'files'>, scope: Scope, uploadId: string): Promise<UploadState> {
  const session = await sessionOf(services, scope, uploadId);
  const received = await services.files.stagedSize(scope.projectId, session.id);
  if (received === undefined) throw notFound();
  return { uploadId, received, chunkBytes: CHUNK_BYTES };
}

/**
 * Why a chunk's body ended early, from the request stream it came on: the server's request wait
 * answered it 408 (Node's `ERR_HTTP_REQUEST_TIMEOUT` on its socket), or the client cut it (the
 * stream aborted). Undefined when the stream ended whole.
 */
function chunkCut(chunk: Readable): ChunkCutCode | undefined {
  const request = chunk as Readable & { readonly aborted?: boolean; readonly socket?: { readonly errored?: { readonly code?: unknown } | null } | null };
  if (request.socket?.errored?.code === 'ERR_HTTP_REQUEST_TIMEOUT') return 'request_timeout';
  if (chunk.readableAborted || request.aborted === true) return 'chunk_incomplete';
  return undefined;
}

/**
 * Writes one chunk after the `received` bytes the upload holds, taking at most `room` bytes, under
 * the lease the caller holds; returns the bytes held after it. A chunk larger than `room` is refused
 * (`chunk_too_large`), one slower than APPEND_DEADLINE_SECONDS is refused (`chunk_timeout`), and one
 * whose body ended early, cut by the client or answered 408 by the server's request wait, is logged
 * and refused with its own code (`chunk_incomplete`, `request_timeout`; phase 2 fix round 4, the
 * verifier's finding that both were logged as `internal_error`). Nothing of a refused chunk is kept,
 * and the client resumes from `received`. The log carries codes and ids only (rule 13).
 */
export async function writeChunk(
  services: Pick<ApiServices, 'files' | 'log'>,
  scope: Scope,
  uploadId: string,
  received: number,
  room: number,
  chunk: Readable,
): Promise<number> {
  try {
    return await services.files.appendChunk(scope.projectId, uploadId, chunk, room, APPEND_DEADLINE_SECONDS * 1000);
  } catch (error) {
    if (error instanceof FileStoreError && error.code === 'chunk_too_large') throw new ApiRefusal(413, 'chunk_too_large');
    if (error instanceof FileStoreError && error.code === 'chunk_timeout') throw new ApiRefusal(409, 'chunk_timeout', undefined, received);
    const cut = chunkCut(chunk);
    if (cut === undefined) throw error;
    services.log({ event: 'upload_chunk_cut', code: cut, projectId: scope.projectId, uploadId });
    throw new ApiRefusal(409, cut, undefined, received);
  }
}

/**
 * Appends one chunk at `offset`, under the upload's lease. A chunk at any other offset than
 * the bytes held is refused with the right offset, so the client resumes from there; a chunk
 * larger than the chunk size, or past the declared size, or slower than the deadline, or whose
 * body ended early, is refused and nothing of it is kept (`writeChunk`).
 */
export async function appendUpload(
  services: Pick<ApiServices, 'store' | 'files' | 'log'>,
  scope: Scope,
  uploadId: string,
  offset: number | undefined,
  chunk: Readable,
): Promise<UploadState> {
  const session = await sessionOf(services, scope, uploadId);
  return underLease(services, scope, session, 'appending', async () => {
    const received = await services.files.stagedSize(scope.projectId, session.id);
    if (received === undefined) throw notFound();
    if (offset !== received) throw new ApiRefusal(409, 'offset_mismatch', undefined, received);
    const room = Math.min(CHUNK_BYTES, session.declaredSize - received);
    const after = await writeChunk(services, scope, session.id, received, room, chunk);
    return { uploadId, received: after, chunkBytes: CHUNK_BYTES };
  });
}

/** Abandons an upload: the staged bytes and the session go. */
export async function abortUpload(services: Pick<ApiServices, 'store' | 'files'>, scope: Scope, uploadId: string): Promise<void> {
  const session = await sessionOf(services, scope, uploadId);
  await services.files.removeStaged(scope.projectId, session.id);
  await withRequest(services.store, scope, (request) => deleteUploadSession(request.trx, { id: session.id, projectId: scope.projectId, userId: scope.userId }));
}

export interface CompletedUpload {
  readonly document: DocumentRecord;
}

/**
 * Completes an upload, under its lease: every declared byte held (checked under the lease),
 * the declared bytes copied into a sealed file while hashed, the owner's fixtures-only guard
 * applied to that hash before anything is stored (docs/adr/0028), the sealed file moved to
 * `<projectId>/<contentHash>/original`, and the document registered in the owner's request
 * with its analysis queued; the staged bytes go after. A refused file is removed from
 * staging with the guard's message, and nothing is registered.
 */
export async function completeUpload(services: ApiServices & ModelReadingServices, scope: Scope, uploadId: string): Promise<CompletedUpload> {
  const session = await sessionOf(services, scope, uploadId);
  return underLease(services, scope, session, 'completing', async () => {
    const received = await services.files.stagedSize(scope.projectId, session.id);
    if (received === undefined) throw notFound();
    if (received !== session.declaredSize) throw new ApiRefusal(409, 'upload_incomplete', undefined, received);
    const contentHash = await services.files.sealStaged(scope.projectId, session.id, session.declaredSize);
    if (!services.uploadGuard.accepts(contentHash)) {
      await services.files.removeStaged(scope.projectId, session.id);
      await withRequest(services.store, scope, (request) => deleteUploadSession(request.trx, { id: session.id, projectId: scope.projectId, userId: scope.userId }));
      services.log({ event: 'upload_refused', code: 'not_a_fixture', projectId: scope.projectId, uploadId });
      throw new ApiRefusal(422, 'not_a_fixture', NOT_A_FIXTURE_MESSAGE);
    }
    await services.files.promoteSealed(scope.projectId, session.id, contentHash);
    const document = await inProject(services, scope, async (request) => {
      await requireOwner(request);
      return registerUpload(services, request, { session, contentHash, byteSize: session.declaredSize });
    });
    await services.files.removeStaged(scope.projectId, session.id);
    services.log({ event: 'document_registered', projectId: scope.projectId, documentId: document.id });
    return { document };
  });
}
