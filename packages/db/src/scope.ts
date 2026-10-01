/**
 * What the request's user may do in the project in scope, as the store answers it
 * (migration 0006: `sovitech.request_user_acts_as`, `sovitech.current_project_id`).
 * The API asks before it acts, to answer with a clear refusal; the store's guards
 * refuse the writes themselves whatever the API asked (ADR 0013, "The trust boundary").
 */
import { sql } from 'kysely';
import type { Role } from '@sovitech/domain';
import { projectOf, type Request } from './request';
import { createSubject } from './writes';

/** Whether the project in scope is visible to the request: its user is a member, or holds a SOVITECH review role. */
export async function projectVisible(request: Request): Promise<boolean> {
  const projectId = projectOf(request);
  const row = await request.trx.selectFrom('projects').select(['id', 'is_demo']).where('id', '=', projectId).executeTakeFirst();
  return row !== undefined;
}

/** The demo flag of the project in scope, or undefined when it is not visible. */
export async function projectIsDemo(request: Request): Promise<boolean | undefined> {
  const projectId = projectOf(request);
  const row = await request.trx.selectFrom('projects').select('is_demo').where('id', '=', projectId).executeTakeFirst();
  return row?.is_demo;
}

/** Whether the request's user acts in the project in scope in `role` (the owner, an engineer, or the system). */
export async function requestActsAs(request: Request, role: Role): Promise<boolean> {
  const projectId = projectOf(request);
  const result = await sql<{ acts: boolean }>`SELECT sovitech.request_user_acts_as(${projectId}::uuid, ${role}) AS acts`.execute(request.trx);
  return result.rows[0]?.acts === true;
}

/** The ids among `ids` that are subjects of the project in scope. */
export async function existingSubjects(request: Request, ids: readonly string[]): Promise<Set<string>> {
  projectOf(request);
  const valid = ids.filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(id));
  if (valid.length === 0) return new Set();
  const rows = await request.trx.selectFrom('subjects').select('id').where('id', 'in', valid).execute();
  return new Set(rows.map((row) => row.id));
}

/**
 * Makes the requests that decide a write on the project's stored state wait for each other until each
 * one's transaction ends (a transaction-level advisory lock keyed by the project). An owner's write reads
 * the project's state and decides on it: an answer from a screen that did not show the field's value is
 * refused (rule 4, G4-36), and a skip is written only where it is asked now, once (rule 7, G7-10). Two
 * such requests sent together (two tabs, a double click) both read the state before either wrote, and
 * both wrote: two owner values in conflict, a skip written twice (phase 3 part B, the final verification).
 * Taken before the state is read, the later request's reads see what the earlier one committed (the store
 * runs in READ COMMITTED; its guards refuse any other level), so it decides on the earlier result as if it
 * had been sent after it. Re-entrant in one transaction. It writes nothing and reads no row.
 */
export async function lockProjectWrites(request: Request): Promise<void> {
  const projectId = projectOf(request);
  await sql`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${`sovitech.project_writes:${projectId}`}, 0))`.execute(request.trx);
}

/**
 * The project's building subject (2.2): the first one recorded, or a new one. Taken under a
 * transaction lock of the project, so two requests never make two buildings of one project. The
 * project's write lock comes first, so every request that holds both took them in one order (an owner's
 * write holds the write lock when it reads the state that may create the building).
 */
export async function ensureBuildingSubject(request: Request, createdBy: string): Promise<string> {
  const projectId = projectOf(request);
  await lockProjectWrites(request);
  await sql`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${`sovitech building ${projectId}`}, 0))`.execute(request.trx);
  const row = await request.trx
    .selectFrom('subjects')
    .select('id')
    .where('kind', '=', 'building')
    .orderBy('created_at')
    .orderBy('id')
    .executeTakeFirst();
  if (row !== undefined) return row.id;
  return (await createSubject(request, { kind: 'building', createdBy })).id;
}

/** The database's clock now (clock_timestamp()), as the store writes times: an ISO 8601 string in UTC with microseconds. */
export async function databaseTime(request: Pick<Request, 'trx'>): Promise<string> {
  const result = await sql<{ now: string }>`SELECT pg_catalog.clock_timestamp() AS now`.execute(request.trx);
  const now = result.rows[0]?.now;
  if (now === undefined) throw new Error('the store gave no time');
  return now;
}
