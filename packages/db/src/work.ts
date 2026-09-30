/**
 * The working state of schema `sovitech_work` (migration 0010;
 * docs/adr/0026-analysis-queue-and-upload-sessions.md): the analysis queue and
 * the resumable uploads in flight. Unlike the value store, these rows are updated
 * and deleted: they are not candidates, evidence or events, and they hold ids and
 * codes only (rule 13), except an upload's file name while it is in flight.
 *
 * The queue:
 * - one open job (queued or running) per document at a time (a partial unique index);
 * - a worker claims the oldest ready job with `FOR UPDATE SKIP LOCKED`, so two
 *   workers never take the same job, and a job whose worker went away is claimed
 *   again once its lock is older than the staleness limit;
 * - a job ends done, or failed with a code, or goes back to queued for a retry.
 *
 * An upload session is open, or held by one request under a lease while it appends a
 * chunk or completes (migration 0011): two appends, or an append and the completion,
 * never touch the staged bytes at once.
 */
import { sql, type Kysely, type Transaction } from 'kysely';
import { refusing } from './errors';
import { newId } from './ids';
import type { Database, StoredFormat } from './schema';

type Executor = Kysely<Database> | Transaction<Database>;

/** A worker's name: lower case letters, digits and hyphens (0010's CHECK). */
const WORKER_ID = /^[a-z0-9-]{1,64}$/;
/** An error code: never a message or any text a document could hold (0010's CHECK). */
const ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/;

export interface AnalysisJob {
  readonly id: string;
  readonly projectId: string;
  readonly documentId: string;
  readonly contentHash: string;
  readonly kind: 'analyse_document';
  readonly state: 'queued' | 'running' | 'done' | 'failed';
  readonly attempts: number;
  readonly errorCode?: string;
}

interface JobRow {
  readonly id: string;
  readonly project_id: string;
  readonly document_id: string;
  readonly content_hash: string;
  readonly kind: 'analyse_document';
  readonly state: AnalysisJob['state'];
  readonly attempts: number;
  readonly error_code: string | null;
}

function jobOf(row: JobRow): AnalysisJob {
  return {
    id: row.id,
    projectId: row.project_id,
    documentId: row.document_id,
    contentHash: row.content_hash,
    kind: row.kind,
    state: row.state,
    attempts: row.attempts,
    ...(row.error_code === null ? {} : { errorCode: row.error_code }),
  };
}

const JOB_COLUMNS = sql.raw('id, project_id, document_id, content_hash, kind, state, attempts, error_code');

/**
 * Queues the analysis of a document, unless one is already open for it (one analysis
 * per document at a time). Returns the job id queued, or undefined when one was open.
 * Run it in the request that registered the document, so both commit together.
 */
export async function enqueueAnalysis(
  executor: Executor | { readonly trx: Transaction<Database> },
  input: { readonly projectId: string; readonly documentId: string; readonly contentHash: string; readonly id?: string },
): Promise<string | undefined> {
  const target = 'trx' in executor ? executor.trx : executor;
  const id = input.id ?? newId();
  const result = await refusing(() =>
    sql<{ id: string }>`
      INSERT INTO sovitech_work.analysis_jobs (id, project_id, document_id, content_hash, kind)
      VALUES (${id}, ${input.projectId}, ${input.documentId}, ${input.contentHash}, 'analyse_document')
      ON CONFLICT (project_id, document_id) WHERE state IN ('queued', 'running') DO NOTHING
      RETURNING id`.execute(target),
  );
  return result.rows[0]?.id;
}

/**
 * Claims the oldest ready job for `workerId`: a queued job whose time has come, or a
 * running one whose lock is older than `staleAfterSeconds` (its worker went away).
 */
export async function claimAnalysisJob(
  executor: Executor,
  input: { readonly workerId: string; readonly staleAfterSeconds: number },
): Promise<AnalysisJob | undefined> {
  if (!WORKER_ID.test(input.workerId)) throw new Error('a worker id is lower case letters, digits and hyphens');
  const result = await refusing(() =>
    sql<JobRow>`
      UPDATE sovitech_work.analysis_jobs
      SET state = 'running', attempts = attempts + 1, locked_by = ${input.workerId}, locked_at = clock_timestamp()
      WHERE id = (
        SELECT id FROM sovitech_work.analysis_jobs
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

/** Ends a job the worker holds: done. Returns false when the worker no longer holds it. */
export async function finishAnalysisJob(executor: Executor, input: { readonly jobId: string; readonly workerId: string }): Promise<boolean> {
  const result = await refusing(() =>
    sql<{ id: string }>`
      UPDATE sovitech_work.analysis_jobs
      SET state = 'done', finished_at = clock_timestamp(), locked_by = NULL, locked_at = NULL, error_code = NULL
      WHERE id = ${input.jobId} AND state = 'running' AND locked_by = ${input.workerId}
      RETURNING id`.execute(executor),
  );
  return result.rows.length === 1;
}

/**
 * Ends a job the worker holds with an error code: back to queued after `retryAfterSeconds`
 * when a retry is left, or failed. Returns the state it ends in, or undefined when the
 * worker no longer holds it.
 */
export async function failAnalysisJob(
  executor: Executor,
  input: { readonly jobId: string; readonly workerId: string; readonly errorCode: string; readonly retry: boolean; readonly retryAfterSeconds: number },
): Promise<'queued' | 'failed' | undefined> {
  if (!ERROR_CODE.test(input.errorCode)) throw new Error('a job error is a code, never text');
  const result = await refusing(() =>
    sql<{ state: 'queued' | 'failed' }>`
      UPDATE sovitech_work.analysis_jobs
      SET state = CASE WHEN ${input.retry} THEN 'queued' ELSE 'failed' END,
          run_after = clock_timestamp() + make_interval(secs => ${input.retryAfterSeconds}),
          finished_at = CASE WHEN ${input.retry} THEN NULL ELSE clock_timestamp() END,
          locked_by = NULL, locked_at = NULL, error_code = ${input.errorCode}
      WHERE id = ${input.jobId} AND state = 'running' AND locked_by = ${input.workerId}
      RETURNING state`.execute(executor),
  );
  return result.rows[0]?.state;
}

/** The jobs of one document, oldest first (for tests and the engineer's view of what ran). */
export async function readAnalysisJobs(executor: Executor, input: { readonly projectId: string; readonly documentId: string }): Promise<AnalysisJob[]> {
  const result = await sql<JobRow>`
    SELECT ${JOB_COLUMNS} FROM sovitech_work.analysis_jobs
    WHERE project_id = ${input.projectId} AND document_id = ${input.documentId}
    ORDER BY created_at, id`.execute(executor);
  return result.rows.map(jobOf);
}

/** Whether any job of the project is open (queued or running): "Still reading" (rule 7). */
export async function openAnalysisJobs(executor: Executor, projectId: string): Promise<readonly { readonly documentId: string }[]> {
  const result = await sql<{ document_id: string }>`
    SELECT document_id FROM sovitech_work.analysis_jobs
    WHERE project_id = ${projectId} AND state IN ('queued', 'running')
    ORDER BY created_at, id`.execute(executor);
  return result.rows.map((row) => ({ documentId: row.document_id }));
}

// ---------------------------------------------------------------------------
// Upload sessions (ADR 0019)
// ---------------------------------------------------------------------------

/** The accepted formats of the step 2 line ("PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG, ZIP"). */
export type UploadFormat = Exclude<StoredFormat, 'other'>;

export interface UploadSession {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string;
  /** The file name as uploaded: owner text, never logged (rule 13). */
  readonly fileName: string;
  readonly format: UploadFormat;
  /** Bytes, as the client declared them (at most the per-file limit, well inside an int4). */
  readonly declaredSize: number;
  readonly createdAt: string;
}

interface SessionRow {
  readonly id: string;
  readonly project_id: string;
  readonly user_id: string;
  readonly file_name: string;
  readonly format: UploadFormat;
  readonly declared_size: number;
  readonly created_at: string;
}

const sessionOf = (row: SessionRow): UploadSession => ({
  id: row.id,
  projectId: row.project_id,
  userId: row.user_id,
  fileName: row.file_name,
  format: row.format,
  declaredSize: row.declared_size,
  createdAt: row.created_at,
});

export async function createUploadSession(
  executor: Executor,
  input: { readonly id?: string; readonly projectId: string; readonly userId: string; readonly fileName: string; readonly format: UploadFormat; readonly declaredSize: number },
): Promise<string> {
  const id = input.id ?? newId();
  await refusing(() =>
    sql`
      INSERT INTO sovitech_work.upload_sessions (id, project_id, user_id, file_name, format, declared_size)
      VALUES (${id}, ${input.projectId}, ${input.userId}, ${input.fileName}, ${input.format}, ${input.declaredSize})`.execute(executor),
  );
  return id;
}

/** An upload session of this project and this user; any other reads as none. */
export async function readUploadSession(
  executor: Executor,
  input: { readonly id: string; readonly projectId: string; readonly userId: string },
): Promise<UploadSession | undefined> {
  const result = await sql<SessionRow>`
    SELECT id, project_id, user_id, file_name, format, declared_size::integer AS declared_size, created_at
    FROM sovitech_work.upload_sessions
    WHERE id = ${input.id} AND project_id = ${input.projectId} AND user_id = ${input.userId}`.execute(executor);
  const row = result.rows[0];
  return row === undefined ? undefined : sessionOf(row);
}

/** Deletes an upload session of this project and this user. Returns whether one was there. */
export async function deleteUploadSession(
  executor: Executor,
  input: { readonly id: string; readonly projectId: string; readonly userId: string },
): Promise<boolean> {
  const result = await sql<{ id: string }>`
    DELETE FROM sovitech_work.upload_sessions WHERE id = ${input.id} AND project_id = ${input.projectId} AND user_id = ${input.userId}
    RETURNING id`.execute(executor);
  return result.rows.length === 1;
}

/**
 * Takes the lease of an upload session for one append or for its completion (migration 0011):
 * in one UPDATE under the row's lock, so two requests never both hold it. The session must be
 * open, or its last lease must have ended (the request that held it went away). Returns the
 * lease id, or undefined when another request holds the session or the session is not this
 * project's and this user's. Every append and the completion run under a lease, so no two
 * writers touch a staged file at once and nothing appends while it is hashed.
 */
export async function claimUploadLease(
  executor: Executor,
  input: { readonly id: string; readonly projectId: string; readonly userId: string; readonly purpose: 'appending' | 'completing'; readonly leaseSeconds: number },
): Promise<string | undefined> {
  if (!Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 1) throw new Error('a lease lasts a whole number of seconds');
  const leaseId = newId();
  const result = await refusing(() =>
    sql<{ lease_id: string }>`
      UPDATE sovitech_work.upload_sessions
      SET state = ${input.purpose}, lease_id = ${leaseId},
          lease_until = clock_timestamp() + make_interval(secs => ${input.leaseSeconds}),
          last_activity_at = clock_timestamp()
      WHERE id = ${input.id} AND project_id = ${input.projectId} AND user_id = ${input.userId}
        AND (state = 'open' OR lease_until < clock_timestamp())
      RETURNING lease_id`.execute(executor),
  );
  return result.rows[0]?.lease_id;
}

/** Gives a lease back: the session is open again. Returns false when the lease was no longer held. */
export async function releaseUploadLease(executor: Executor, input: { readonly id: string; readonly leaseId: string }): Promise<boolean> {
  const result = await refusing(() =>
    sql<{ id: string }>`
      UPDATE sovitech_work.upload_sessions
      SET state = 'open', lease_id = NULL, lease_until = NULL, last_activity_at = clock_timestamp()
      WHERE id = ${input.id} AND lease_id = ${input.leaseId}
      RETURNING id`.execute(executor),
  );
  return result.rows.length === 1;
}

/**
 * Upload sessions abandoned for `olderThanSeconds`: no append or completion since (or since
 * they were opened), and no lease held. The staging sweep removes them and their bytes.
 */
export async function staleUploadSessions(executor: Executor, olderThanSeconds: number): Promise<readonly { readonly id: string; readonly projectId: string }[]> {
  const result = await sql<{ id: string; project_id: string }>`
    SELECT id, project_id FROM sovitech_work.upload_sessions
    WHERE coalesce(last_activity_at, created_at) < clock_timestamp() - make_interval(secs => ${olderThanSeconds})
      AND (state = 'open' OR lease_until < clock_timestamp())
    ORDER BY created_at, id`.execute(executor);
  return result.rows.map((row) => ({ id: row.id, projectId: row.project_id }));
}

/**
 * Takes an abandoned upload session for the staging sweep, whoever opened it: in one UPDATE under the row's lock, and
 * only while it is still abandoned for `olderThanSeconds` (no append or completion since) with no lease held, so a
 * session an append took meanwhile stays. The sweep holds it as a request that ends a session does (`completing`), so
 * no append or completion takes it while its bytes go. Its last activity is left as it was: a session whose bytes the
 * sweep could not remove is still abandoned for the next sweep. Returns the lease id, or undefined when it is not taken.
 */
export async function claimAbandonedUpload(
  executor: Executor,
  input: { readonly id: string; readonly olderThanSeconds: number; readonly leaseSeconds: number },
): Promise<string | undefined> {
  if (!Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 1) throw new Error('a lease lasts a whole number of seconds');
  const leaseId = newId();
  const result = await refusing(() =>
    sql<{ lease_id: string }>`
      UPDATE sovitech_work.upload_sessions
      SET state = 'completing', lease_id = ${leaseId}, lease_until = clock_timestamp() + make_interval(secs => ${input.leaseSeconds})
      WHERE id = ${input.id}
        AND coalesce(last_activity_at, created_at) < clock_timestamp() - make_interval(secs => ${input.olderThanSeconds})
        AND (state = 'open' OR lease_until < clock_timestamp())
      RETURNING lease_id`.execute(executor),
  );
  return result.rows[0]?.lease_id;
}

/**
 * Gives the sweep's lease back when the session's bytes could not be removed: the session is open again, its last
 * activity unchanged, so it is still abandoned and the next sweep takes it again. Returns false when the lease was no
 * longer held.
 */
export async function releaseAbandonedUpload(executor: Executor, input: { readonly id: string; readonly leaseId: string }): Promise<boolean> {
  const result = await refusing(() =>
    sql<{ id: string }>`
      UPDATE sovitech_work.upload_sessions
      SET state = 'open', lease_id = NULL, lease_until = NULL
      WHERE id = ${input.id} AND lease_id = ${input.leaseId}
      RETURNING id`.execute(executor),
  );
  return result.rows.length === 1;
}

/**
 * Deletes an abandoned upload session the sweep holds, with the owner-typed file name it holds, once its bytes are
 * gone. Only while the sweep's lease is still held. Returns whether it was deleted.
 */
export async function deleteAbandonedUpload(executor: Executor, input: { readonly id: string; readonly leaseId: string }): Promise<boolean> {
  const result = await sql<{ id: string }>`
    DELETE FROM sovitech_work.upload_sessions WHERE id = ${input.id} AND lease_id = ${input.leaseId}
    RETURNING id`.execute(executor);
  return result.rows.length === 1;
}

/** Removes the queued (not yet running) analyses of a document: its erasure leaves nothing to read. */
export async function cancelQueuedAnalysis(executor: Executor, input: { readonly projectId: string; readonly documentId: string }): Promise<void> {
  await sql`
    DELETE FROM sovitech_work.analysis_jobs
    WHERE project_id = ${input.projectId} AND document_id = ${input.documentId} AND state = 'queued'`.execute(executor);
}
