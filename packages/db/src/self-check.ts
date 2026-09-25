/**
 * The store's self-check, run by the migration runner: one engineer
 * verification and one erasure, on TEST rows, inside a transaction (or a
 * savepoint) that is always rolled back.
 *
 * The guard invariants refuse a migration that drops, disables or widens a
 * guard (ADR 0014). A migration can also add something that is a tightening on
 * its face yet stops a guarded path: a CHECK against 'withdrawn' on candidate
 * events once made every owner's erasure fail (rule 13, "Erasure"), and one
 * against 'engineer_verified' would stop every verification (rule 10). Nothing
 * is loosened, but people are blocked ("block outputs, not people"). So after a
 * migration the runner performs both paths end to end, exactly as the app
 * would call them, and the run fails when either does not succeed.
 *
 * It runs on the database administrator's connection and switches the session
 * user for the rest of the transaction only (SET LOCAL SESSION AUTHORIZATION),
 * so the guarded functions see the operator's login and the app's login as
 * they would in use. Everything it writes is rolled back: TEST accounts, a
 * TEST project, a TEST document with its text, a TEST document value with its
 * evidence, the opened item, the verification and the erasure.
 */
import { createHash } from 'node:crypto';
import type pg from 'pg';
import { scrubbed } from './errors';
import { newId } from './ids';

/** Whether the functions and guards the self-check drives are installed (from migration 0009 on). */
async function installed(client: pg.Client): Promise<boolean> {
  const result = await client.query<{ present: boolean }>(
    `SELECT pg_catalog.to_regprocedure('sovitech.erase_document(uuid, uuid, uuid, text, text)') IS NOT NULL
        AND pg_catalog.to_regprocedure('sovitech.verify_candidate(uuid, uuid, text)') IS NOT NULL
        AND pg_catalog.to_regprocedure('sovitech_guard.check_invariants()') IS NOT NULL AS present`,
  );
  return result.rows[0]?.present === true;
}

/** What one erasure reported, as the self-check reads it. */
interface ErasureDetails {
  readonly excerpts_erased?: unknown;
  readonly text_parts_deleted?: unknown;
  readonly candidates_withdrawn?: unknown;
}

async function run(client: pg.Client): Promise<void> {
  const owner = newId();
  const engineer = newId();
  const service = newId();
  const project = newId();
  const building = newId();
  const document = newId();
  const candidate = newId();
  const locator = newId();
  const hash = `sha256:${createHash('sha256').update(`TEST store self-check ${project}`, 'utf8').digest('hex')}`;
  const request = (userId: string, projectId: string): Promise<unknown> =>
    client.query(`SELECT pg_catalog.set_config('sovitech.user_id', $1, true), pg_catalog.set_config('sovitech.project_id', $2, true)`, [
      userId,
      projectId,
    ]);

  // The operator's login creates the TEST accounts and grants their roles.
  await client.query('SET LOCAL SESSION AUTHORIZATION sovitech_db_admin');
  for (const [id, label, kind] of [
    [owner, 'TEST store self-check owner', 'person'],
    [engineer, 'TEST store self-check engineer', 'person'],
    [service, 'TEST store self-check extraction service', 'service'],
  ] as const) {
    await client.query('SELECT sovitech.create_app_user($1, $2, $3, $4, $5)', [id, newId(), label, kind, 'TEST store self-check']);
  }
  await client.query('SELECT sovitech.grant_app_role($1, $2, $3, $4, $5)', [newId(), newId(), owner, 'owner', 'TEST store self-check']);
  await client.query('SELECT sovitech.grant_app_role($1, $2, $3, $4, $5)', [
    newId(),
    newId(),
    engineer,
    'sovitech_engineer',
    'TEST store self-check',
  ]);

  // The app's login, as the API: the owner's project, the extraction service's document value.
  await client.query('SET LOCAL SESSION AUTHORIZATION sovitech_db_app');
  await request(owner, '');
  await client.query('SELECT sovitech.create_project($1, $2, false)', [project, newId()]);
  await request(owner, project);
  await client.query('SELECT sovitech.add_project_member($1, $2, $3)', [project, service, newId()]);
  await request(service, project);
  await client.query(`INSERT INTO sovitech.subjects (id, project_id, kind, created_by) VALUES ($1, $2, 'building', $3), ($4, $2, 'document', $3)`, [
    building,
    project,
    service,
    document,
  ]);
  await client.query(
    `INSERT INTO sovitech.documents (id, project_id, content_hash, kind, stage, created_by) VALUES ($1, $2, $3, 'other', 'unknown', $4)`,
    [document, project, hash, service],
  );
  await client.query(
    `INSERT INTO sovitech.document_analysis_events (id, project_id, document_id, status, coverage, actor)
     VALUES ($1, $2, $3, 'analysed', 'TEST page 1 of 1', $4)`,
    [newId(), project, document, service],
  );
  await client.query(
    `INSERT INTO sovitech.document_texts (project_id, content_hash, part, text, created_by) VALUES ($1, $2, 'page:1', 'TEST store self-check text', $3)`,
    [project, hash, service],
  );
  await client.query(
    `INSERT INTO sovitech.candidates (id, project_id, subject_id, field_key, text_value, source, created_by)
     VALUES ($1, $2, $3, 'test.store_self_check', 'TEST store self-check text', 'document', $4)`,
    [candidate, project, building, service],
  );
  await client.query(
    `INSERT INTO sovitech.evidence_locators (id, project_id, candidate_id, ordinal, document_id, content_hash, page, evidence_check)
     VALUES ($1, $2, $3, 0, $4, $5, 1, 'text_match')`,
    [locator, project, candidate, document, hash],
  );
  await client.query(
    `INSERT INTO sovitech.evidence_excerpts (evidence_id, project_id, content_hash, text) VALUES ($1, $2, $3, 'TEST store self-check text')`,
    [locator, project, hash],
  );
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');

  // Rule 10: an engineer who opened the item verifies it.
  await request(engineer, project);
  await client.query('SELECT sovitech.open_review_item($1, $2)', [newId(), candidate]);
  await client.query('SELECT sovitech.verify_candidate($1, $2, $3)', [newId(), candidate, 'TEST store self-check']);

  // Rule 13: the owner erases the document.
  await request(owner, project);
  const erased = await client.query<{ details: ErasureDetails }>('SELECT sovitech.erase_document($1, $2, $3, $4, $5) AS details', [
    newId(),
    newId(),
    document,
    'owner',
    'TEST store self-check',
  ]);
  const details = erased.rows[0]?.details;
  if (details?.excerpts_erased !== 1 || details.text_parts_deleted !== 1 || details.candidates_withdrawn !== 1) {
    throw new Error('the erasure erased no excerpt, deleted no text or withdrew no value');
  }
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
}

/**
 * The error a failed self-check throws. Its cause is the scrubbed database error
 * (a StoreRefusal or a StoreError: SQLSTATE and names only, errors.ts), never
 * the database's own, which could carry a row (rule 13).
 */
function selfCheckFailure(after: string, cause: unknown): Error {
  return new Error(
    `the store's self-check failed ${after}: engineer verification or erasure no longer succeeds (${
      cause instanceof Error ? cause.message : 'unknown error'
    })`,
    { cause },
  );
}

/**
 * Runs the self-check on the administrator's connection: in its own transaction
 * (`transaction`), or inside the one already open (`savepoint`, for an admin
 * migration, which then rolls back with it). Always rolled back. Throws when
 * verification or erasure does not succeed, naming what was checked (`after`).
 */
export async function storeSelfCheck(client: pg.Client, after: string, mode: 'transaction' | 'savepoint'): Promise<void> {
  if (!(await installed(client))) return;
  await client.query(mode === 'transaction' ? 'BEGIN' : 'SAVEPOINT sovitech_self_check');
  try {
    await run(client);
  } catch (error) {
    throw selfCheckFailure(after, scrubbed(error));
  } finally {
    await client.query(mode === 'transaction' ? 'ROLLBACK' : 'ROLLBACK TO SAVEPOINT sovitech_self_check');
    if (mode === 'savepoint') await client.query('RELEASE SAVEPOINT sovitech_self_check');
  }
}
