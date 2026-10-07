/**
 * The conversion record of a stored IFC model shown as a document, and its queue (migration 0017; the viewer step,
 * part 1; the owner's decision of 2026-10-05 on D-03, for display only; PRD R-025; docs/build-log.md, "The viewer
 * step", item 3).
 *
 * - `sovitech.model_view_events` is append-only: `queued`, `started`, `converted`, `failed` with a code, and `erased`.
 *   Each names the project, the document and the content hash, and holds the converter's name and source hash, the
 *   sandbox image's digest, byte sizes and durations: never text from the model (rule 13). The state of a project's
 *   conversion of one content hash is derived from its events (`modelViewStateOf`), never stored. It is not a value: no
 *   candidate, field event, badge, field state or Documents line comes from it (G1-30).
 * - `sovitech_work.model_view_jobs` is the queue: working state, like the analysis queue (./work.ts), with one open
 *   job per project and content hash, so a second document of the same bytes in the same project reuses the
 *   conversion. A worker claims the oldest ready job with `FOR UPDATE SKIP LOCKED`.
 *
 * There is no update or delete method for the record here (guardrails 2.4).
 */
import { sql, type Kysely, type Transaction } from 'kysely';
import { refusing } from './errors';
import { newId } from './ids';
import { projectOf, type Request } from './request';
import type { Database } from './schema';

type Executor = Kysely<Database> | Transaction<Database>;

/** The steps of a conversion (0017's CHECK). */
export const MODEL_VIEW_EVENT_TYPES = ['queued', 'started', 'converted', 'failed', 'erased'] as const;
export type ModelViewEventType = (typeof MODEL_VIEW_EVENT_TYPES)[number];

/**
 * Why a conversion failed: codes only (0017's CHECK). The model's own (`parse_failed`, `timed_out`, `out_of_memory`,
 * `no_geometry`, `output_refused`), and the environment's (`stale_image`, `sandbox_unavailable`, `output_unavailable`:
 * the copy out of the sandbox or the move into `derived/` failed on the host's or the daemon's side; `internal_error`:
 * the job failed in a way it does not name), which the worker's start queues again.
 */
export const MODEL_VIEW_FAILURES = [
  'parse_failed',
  'timed_out',
  'out_of_memory',
  'no_geometry',
  'stale_image',
  'output_refused',
  'sandbox_unavailable',
  'output_unavailable',
  'internal_error',
] as const;
export type ModelViewFailure = (typeof MODEL_VIEW_FAILURES)[number];

/** The converter and the sandbox image a conversion ran with. */
export interface ModelViewConverter {
  /** The converter's name, for example `sovitech-model-converter`. */
  readonly name: string;
  /** The SHA-256 of the converter's sources, as the image's label records it (`sha256:<hex>`). */
  readonly version: string;
  /** The sandbox image's digest (`sha256:<hex>`). */
  readonly imageDigest: string;
}

/** Sizes in bytes and durations in milliseconds, as the converter and the job measured them. Never a value. */
export interface ModelViewMeasures {
  readonly inputBytes?: number;
  readonly viewBytes?: number;
  readonly indexBytes?: number;
  readonly peakRssKib?: number;
  readonly importMs?: number;
  readonly derivativeMs?: number;
  readonly indexMs?: number;
  readonly wallMs?: number;
}

export interface ModelViewEvent extends ModelViewMeasures {
  readonly id: string;
  readonly documentId: string;
  readonly contentHash: string;
  readonly type: ModelViewEventType;
  readonly code?: ModelViewFailure;
  readonly jobId?: string;
  readonly converter?: ModelViewConverter;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface NewModelViewEvent extends ModelViewMeasures {
  readonly id?: string;
  readonly documentId: string;
  readonly contentHash: string;
  readonly type: ModelViewEventType;
  readonly code?: ModelViewFailure;
  readonly jobId?: string;
  readonly converter?: ModelViewConverter;
  /** The user making the request (the store refuses any other: SVX20). */
  readonly createdBy: string;
}

interface EventRow {
  readonly id: string;
  readonly document_id: string;
  readonly content_hash: string;
  readonly type: ModelViewEventType;
  readonly code: ModelViewFailure | null;
  readonly job_id: string | null;
  readonly converter_name: string | null;
  readonly converter_version: string | null;
  readonly image_digest: string | null;
  readonly input_bytes: number | null;
  readonly view_bytes: number | null;
  readonly index_bytes: number | null;
  readonly peak_rss_kib: number | null;
  readonly import_ms: number | null;
  readonly derivative_ms: number | null;
  readonly index_ms: number | null;
  readonly wall_ms: number | null;
  readonly created_by: string;
  readonly created_at: string;
}

function present<K extends string, V>(key: K, value: V | null): { readonly [P in K]?: V } {
  return (value === null ? {} : { [key]: value }) as { readonly [P in K]?: V };
}

function eventOf(row: EventRow): ModelViewEvent {
  return {
    id: row.id,
    documentId: row.document_id,
    contentHash: row.content_hash,
    type: row.type,
    ...present('code', row.code),
    ...present('jobId', row.job_id),
    ...(row.converter_name === null || row.converter_version === null || row.image_digest === null
      ? {}
      : { converter: { name: row.converter_name, version: row.converter_version, imageDigest: row.image_digest } }),
    ...present('inputBytes', row.input_bytes),
    ...present('viewBytes', row.view_bytes),
    ...present('indexBytes', row.index_bytes),
    ...present('peakRssKib', row.peak_rss_kib),
    ...present('importMs', row.import_ms),
    ...present('derivativeMs', row.derivative_ms),
    ...present('indexMs', row.index_ms),
    ...present('wallMs', row.wall_ms),
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

const EVENT_COLUMNS = sql.raw(
  'id, document_id, content_hash, type, code, job_id, converter_name, converter_version, image_digest, input_bytes, view_bytes, index_bytes, peak_rss_kib, import_ms, derivative_ms, index_ms, wall_ms, created_by, created_at',
);

/** Appends one conversion event in the request's project. The store decides who may write which (SVX20, SVE11). */
export async function appendModelViewEvent(request: Request, input: NewModelViewEvent): Promise<string> {
  const projectId = projectOf(request);
  const id = input.id ?? newId();
  const measure = (value: number | undefined): number | null => value ?? null;
  await refusing(() =>
    sql`
      INSERT INTO sovitech.model_view_events (
        id, project_id, document_id, content_hash, type, code, job_id, converter_name, converter_version, image_digest,
        input_bytes, view_bytes, index_bytes, peak_rss_kib, import_ms, derivative_ms, index_ms, wall_ms, created_by)
      VALUES (
        ${id}, ${projectId}, ${input.documentId}, ${input.contentHash}, ${input.type}, ${input.code ?? null}, ${input.jobId ?? null},
        ${input.converter?.name ?? null}, ${input.converter?.version ?? null}, ${input.converter?.imageDigest ?? null},
        ${measure(input.inputBytes)}, ${measure(input.viewBytes)}, ${measure(input.indexBytes)}, ${measure(input.peakRssKib)},
        ${measure(input.importMs)}, ${measure(input.derivativeMs)}, ${measure(input.indexMs)}, ${measure(input.wallMs)}, ${input.createdBy})`.execute(request.trx),
  );
  return id;
}

/** The project's conversion events, oldest first; of one content hash when it is given. */
export async function readModelViewEvents(request: Request, filter: { readonly contentHash?: string } = {}): Promise<ModelViewEvent[]> {
  projectOf(request);
  const result =
    filter.contentHash === undefined
      ? await sql<EventRow>`SELECT ${EVENT_COLUMNS} FROM sovitech.model_view_events ORDER BY created_at, id`.execute(request.trx)
      : await sql<EventRow>`SELECT ${EVENT_COLUMNS} FROM sovitech.model_view_events WHERE content_hash = ${filter.contentHash} ORDER BY created_at, id`.execute(
          request.trx,
        );
  return result.rows.map(eventOf);
}

/**
 * The state of a project's conversion of one content hash, derived from its events (oldest first): the latest event
 * decides. `none`: never queued, or its view files went with their document (`erased`); `preparing`: queued or
 * started; `converted`: its view files are stored (the event names the converter and the sizes); `failed`: with its
 * code. Never stored.
 */
export type ModelViewState =
  | { readonly kind: 'none'; readonly erased: boolean }
  | { readonly kind: 'preparing' }
  | { readonly kind: 'converted'; readonly event: ModelViewEvent }
  | { readonly kind: 'failed'; readonly code: ModelViewFailure };

export function modelViewStateOf(events: readonly ModelViewEvent[], contentHash: string): ModelViewState {
  const latest = events.filter((event) => event.contentHash === contentHash).at(-1);
  if (latest === undefined) return { kind: 'none', erased: false };
  switch (latest.type) {
    case 'queued':
    case 'started':
      return { kind: 'preparing' };
    case 'converted':
      return { kind: 'converted', event: latest };
    case 'failed':
      return { kind: 'failed', code: latest.code ?? 'parse_failed' };
    case 'erased':
      return { kind: 'none', erased: true };
  }
}

// ---------------------------------------------------------------------------
// The queue (sovitech_work.model_view_jobs)
// ---------------------------------------------------------------------------

/** A worker's name: lower case letters, digits and hyphens (0017's CHECK). */
const WORKER_ID = /^[a-z0-9-]{1,64}$/;
/** An error code: never a message or any text a document could hold (0017's CHECK). */
const ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/;

export interface ModelViewJob {
  readonly id: string;
  readonly projectId: string;
  readonly documentId: string;
  readonly contentHash: string;
  readonly state: 'queued' | 'running' | 'done' | 'failed';
  readonly attempts: number;
  readonly errorCode?: string;
}

interface JobRow {
  readonly id: string;
  readonly project_id: string;
  readonly document_id: string;
  readonly content_hash: string;
  readonly state: ModelViewJob['state'];
  readonly attempts: number;
  readonly error_code: string | null;
}

function jobOf(row: JobRow): ModelViewJob {
  return {
    id: row.id,
    projectId: row.project_id,
    documentId: row.document_id,
    contentHash: row.content_hash,
    state: row.state,
    attempts: row.attempts,
    ...(row.error_code === null ? {} : { errorCode: row.error_code }),
  };
}

const JOB_COLUMNS = sql.raw('id, project_id, document_id, content_hash, state, attempts, error_code');

/**
 * Queues the conversion of a stored IFC model's bytes, unless one is open for them in the project, and records it
 * (`queued`, naming the job) in the same request. Returns the job id, or undefined when one was open (the open job
 * converts the same bytes). Run it in the request that registered the document, so both commit together.
 */
export async function queueModelView(request: Request, input: { readonly documentId: string; readonly contentHash: string; readonly createdBy: string }): Promise<string | undefined> {
  const projectId = projectOf(request);
  const id = newId();
  const result = await refusing(() =>
    sql<{ id: string }>`
      INSERT INTO sovitech_work.model_view_jobs (id, project_id, document_id, content_hash)
      VALUES (${id}, ${projectId}, ${input.documentId}, ${input.contentHash})
      ON CONFLICT (project_id, content_hash) WHERE state IN ('queued', 'running') DO NOTHING
      RETURNING id`.execute(request.trx),
  );
  const queued = result.rows[0]?.id;
  if (queued === undefined) return undefined;
  await appendModelViewEvent(request, { documentId: input.documentId, contentHash: input.contentHash, type: 'queued', jobId: queued, createdBy: input.createdBy });
  return queued;
}

/**
 * Claims the oldest ready conversion for `workerId`: a queued job whose time has come, or a running one whose lock is
 * older than `staleAfterSeconds` (its worker went away).
 */
export async function claimModelViewJob(executor: Executor, input: { readonly workerId: string; readonly staleAfterSeconds: number }): Promise<ModelViewJob | undefined> {
  if (!WORKER_ID.test(input.workerId)) throw new Error('a worker id is lower case letters, digits and hyphens');
  const result = await refusing(() =>
    sql<JobRow>`
      UPDATE sovitech_work.model_view_jobs
      SET state = 'running', attempts = attempts + 1, locked_by = ${input.workerId}, locked_at = clock_timestamp()
      WHERE id = (
        SELECT id FROM sovitech_work.model_view_jobs
        WHERE (state = 'queued' AND run_after <= clock_timestamp())
           OR (state = 'running' AND locked_at < clock_timestamp() - make_interval(secs => ${input.staleAfterSeconds}))
        ORDER BY created_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING ${JOB_COLUMNS}`.execute(executor),
  );
  const row = result.rows[0];
  return row === undefined ? undefined : jobOf(row);
}

/** Ends a conversion the worker holds: done. Returns false when the worker no longer holds it. */
export async function finishModelViewJob(executor: Executor, input: { readonly jobId: string; readonly workerId: string }): Promise<boolean> {
  const result = await refusing(() =>
    sql<{ id: string }>`
      UPDATE sovitech_work.model_view_jobs
      SET state = 'done', finished_at = clock_timestamp(), locked_by = NULL, locked_at = NULL, error_code = NULL
      WHERE id = ${input.jobId} AND state = 'running' AND locked_by = ${input.workerId}
      RETURNING id`.execute(executor),
  );
  return result.rows.length === 1;
}

/**
 * Ends a conversion the worker holds with an error code: back to queued after `retryAfterSeconds` when a retry is
 * left, or failed. Returns the state it ends in, or undefined when the worker no longer holds it.
 */
export async function failModelViewJob(
  executor: Executor,
  input: { readonly jobId: string; readonly workerId: string; readonly errorCode: string; readonly retry: boolean; readonly retryAfterSeconds: number },
): Promise<'queued' | 'failed' | undefined> {
  if (!ERROR_CODE.test(input.errorCode)) throw new Error('a job error is a code, never text');
  const result = await refusing(() =>
    sql<{ state: 'queued' | 'failed' }>`
      UPDATE sovitech_work.model_view_jobs
      SET state = CASE WHEN ${input.retry} THEN 'queued' ELSE 'failed' END,
          run_after = clock_timestamp() + make_interval(secs => ${input.retryAfterSeconds}),
          finished_at = CASE WHEN ${input.retry} THEN NULL ELSE clock_timestamp() END,
          locked_by = NULL, locked_at = NULL, error_code = ${input.errorCode}
      WHERE id = ${input.jobId} AND state = 'running' AND locked_by = ${input.workerId}
      RETURNING state`.execute(executor),
  );
  return result.rows[0]?.state;
}

/** The conversions of one project's bytes, oldest first (for tests and the worker's own checks). */
export async function readModelViewJobs(executor: Executor, input: { readonly projectId: string; readonly contentHash?: string }): Promise<ModelViewJob[]> {
  const result =
    input.contentHash === undefined
      ? await sql<JobRow>`SELECT ${JOB_COLUMNS} FROM sovitech_work.model_view_jobs WHERE project_id = ${input.projectId} ORDER BY created_at, id`.execute(executor)
      : await sql<JobRow>`
          SELECT ${JOB_COLUMNS} FROM sovitech_work.model_view_jobs
          WHERE project_id = ${input.projectId} AND content_hash = ${input.contentHash}
          ORDER BY created_at, id`.execute(executor);
  return result.rows.map(jobOf);
}

/**
 * Whether `workerId` still holds the conversion: it is running and locked by that worker. The worker reads it under the
 * project's write lock before it records or keeps anything, so a conversion the erasure ended (`endRunningModelViews`,
 * under the same lock) records and keeps nothing (the review of part 1, V-3 and A-1).
 */
export async function holdsModelViewJob(executor: Executor, input: { readonly jobId: string; readonly workerId: string }): Promise<boolean> {
  const result = await sql<{ id: string }>`
    SELECT id FROM sovitech_work.model_view_jobs
    WHERE id = ${input.jobId} AND state = 'running' AND locked_by = ${input.workerId}`.execute(executor);
  return result.rows.length === 1;
}

/**
 * Ends the running conversion of a project's bytes, once no document of the project holds them: the erasure's step,
 * under the project's write lock, beside `cancelQueuedModelViews`. The job reads `failed` with the code `erased`; its
 * worker no longer holds it, so the run stores and records nothing when it ends, and the bytes' one open slot is free
 * for a later registration of the same bytes, which queues a conversion of its own. Returns the ids ended.
 */
export async function endRunningModelViews(executor: Executor, input: { readonly projectId: string; readonly contentHash: string }): Promise<readonly string[]> {
  const result = await sql<{ id: string }>`
    UPDATE sovitech_work.model_view_jobs
    SET state = 'failed', finished_at = clock_timestamp(), locked_by = NULL, locked_at = NULL, error_code = 'erased'
    WHERE project_id = ${input.projectId} AND content_hash = ${input.contentHash} AND state = 'running'
    RETURNING id`.execute(executor);
  return result.rows.map((row) => row.id);
}

/**
 * Removes the queued (not running) conversion of a project's bytes, once no document of the project holds them: the
 * erasure's step (a running one is ended by `endRunningModelViews`, and stores nothing). Returns the ids removed.
 */
export async function cancelQueuedModelViews(executor: Executor, input: { readonly projectId: string; readonly contentHash: string }): Promise<readonly string[]> {
  const result = await sql<{ id: string }>`
    DELETE FROM sovitech_work.model_view_jobs
    WHERE project_id = ${input.projectId} AND content_hash = ${input.contentHash} AND state = 'queued'
    RETURNING id`.execute(executor);
  return result.rows.map((row) => row.id);
}
