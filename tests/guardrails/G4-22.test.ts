/**
 * G4-22 (docs/guardrails.md section 7; 2.4, "Candidates never change after they are written";
 * rule 4, "Enforced by: Storage. Candidates are immutable, and events are append-only"; rule 10,
 * "No script, migration, seed, AI output or service account can write it"). Proposed in phase 1
 * (P-1-CASES), widened after the phase 1 review (verifier finding 0; adversarial findings 0 and 4)
 * and its third round (a default privilege granted on tables created later).
 * Situation: a migration run by the migrator rewrites or drops a column, drops or changes a
 * constraint, replaces a view the store's functions read, sets or drops a column default, adds
 * a function or a view, grants a privilege on a candidate, evidence or event table, or joins a
 * table by inheritance.
 * Expected: refused and rolled back; every stored row, and every role a user holds, is unchanged.
 *
 * Each attempt is an ordinary migration handed to the migration runner after the package's own,
 * on a TEST database holding a document value, its evidence and events. The guard check
 * (ADR 0014) names the reason for each; the relations the definer functions trust (accounts,
 * role events, projects, members) are not the migrator's, so it cannot touch them at all.
 * Afterwards the stored rows, the recorded shape and every account's roles are as before, and
 * an account holding no role still reads nothing and verifies nothing. The control: adding a
 * column is not a lost guard, and that migration is recorded.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { loadMigrations, migrationOf, openReviewItem, runMigrations, verifyCandidate, withRequest, type Migration } from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  type TestDatabase,
  type TestDocumentValue,
} from '@sovitech/db/testing';

/** Every attempt, with the code the store refuses it with and, for the guard check, the reason it must name. */
const ATTEMPTS: readonly { readonly name: string; readonly sql: string; readonly code: string; readonly because?: RegExp }[] = [
  {
    name: 'test_rewrites_values',
    sql: 'ALTER TABLE sovitech.candidates ALTER COLUMN quantity_value TYPE double precision USING quantity_value * 2;',
    code: 'SVG02',
  },
  { name: 'test_drops_a_column', sql: 'ALTER TABLE sovitech.candidate_events DROP COLUMN reason;', code: 'SVG01' },
  { name: 'test_drops_the_project_key', sql: 'ALTER TABLE sovitech.evidence_locators DROP CONSTRAINT evidence_locators_document_fk;', code: 'SVG01' },
  {
    name: 'test_changes_a_constraint',
    sql: `ALTER TABLE sovitech.field_events DROP CONSTRAINT field_events_resolution_reason,
            ADD CONSTRAINT field_events_resolution_reason CHECK (true);`,
    code: 'SVG01',
    because: /field_events_resolution_reason/,
  },
  {
    name: 'test_replaces_the_roles_view',
    sql: `CREATE OR REPLACE VIEW sovitech.app_user_roles WITH (security_barrier) AS
            SELECT account.id AS user_id, 'sovitech_engineer'::text AS role, account.created_at AS since FROM sovitech.app_users AS account;`,
    code: '42501',
  },
  { name: 'test_unbars_the_roles_view', sql: 'ALTER VIEW sovitech.app_user_roles RESET (security_barrier);', code: '42501' },
  { name: 'test_backdates_role_events', sql: `ALTER TABLE sovitech.app_role_events ALTER COLUMN at SET DEFAULT '2000-01-01';`, code: '42501' },
  {
    name: 'test_backdates_events',
    sql: `ALTER TABLE sovitech.candidate_events ALTER COLUMN at SET DEFAULT '2000-01-01';`,
    code: 'SVG01',
    because: /column at of sovitech\.candidate_events was dropped or changed/,
  },
  {
    name: 'test_backdates_candidates',
    sql: `ALTER TABLE sovitech.candidates ALTER COLUMN created_at SET DEFAULT '2000-01-01';`,
    code: 'SVG01',
    because: /column created_at of sovitech\.candidates was dropped or changed/,
  },
  {
    name: 'test_drops_a_default',
    sql: 'ALTER TABLE sovitech.field_events ALTER COLUMN at DROP DEFAULT;',
    code: 'SVG01',
    because: /column at of sovitech\.field_events was dropped or changed/,
  },
  {
    name: 'test_adds_a_definer_function',
    sql: `CREATE FUNCTION sovitech.test_forge(p_candidate uuid) RETURNS void LANGUAGE sql SECURITY DEFINER AS
            $body$ INSERT INTO sovitech.candidate_events (id, project_id, candidate_id, type, actor, role)
                   SELECT gen_random_uuid(), project_id, id, 'rejected', 'test-forged', 'sovitech_engineer'
                   FROM sovitech.candidates WHERE id = p_candidate $body$;
          GRANT EXECUTE ON FUNCTION sovitech.test_forge(uuid) TO sovitech_db_app;`,
    code: 'SVG01',
    because: /function sovitech\.test_forge\(uuid\) in schema sovitech is not a guarded function/,
  },
  {
    name: 'test_adds_a_view',
    sql: 'CREATE VIEW sovitech.test_every_candidate AS SELECT * FROM sovitech.candidates;',
    code: 'SVG01',
    because: /view definition on sovitech\.test_every_candidate is not a recorded guard/,
  },
  {
    name: 'test_grants_the_operator_writes',
    sql: 'GRANT SELECT, INSERT ON sovitech.candidate_events, sovitech.evidence_excerpts TO sovitech_db_admin;',
    code: 'SVG01',
    because: /privilege sovitech_db_admin on sovitech\.candidate_events is not a recorded guard/,
  },
  {
    // Phase 1 review, round 3 (adversarial finding, probe M1): a default privilege is a grant on every
    // table created later, so the next reviewed candidate or event table would reach the app and the
    // operator's login unseen.
    name: 'test_grants_on_later_tables',
    sql: 'ALTER DEFAULT PRIVILEGES FOR ROLE sovitech_db_owner IN SCHEMA sovitech GRANT SELECT, INSERT ON TABLES TO sovitech_db_admin, sovitech_db_app;',
    code: 'SVG01',
    because: /default privilege sovitech_db_owner in sovitech on r on sovitech\.\(default privileges\) is not a recorded guard/,
  },
  {
    name: 'test_adds_an_inheriting_table',
    sql: 'CREATE TABLE sovitech.test_more_candidates () INHERITS (sovitech.candidates);',
    code: 'SVG01',
    because: /sovitech\.test_more_candidates and sovitech\.candidates are joined by inheritance/,
  },
];

/** The stored rows the attempts must leave unchanged, and the roles every account holds. */
const SNAPSHOT_QUERIES = [
  'SELECT row_to_json(stored)::text AS row FROM sovitech.candidates AS stored ORDER BY 1',
  'SELECT row_to_json(stored)::text AS row FROM sovitech.evidence_excerpts AS stored ORDER BY 1',
  'SELECT row_to_json(stored)::text AS row FROM sovitech.candidate_events AS stored ORDER BY 1',
  'SELECT row_to_json(stored)::text AS row FROM sovitech.field_events AS stored ORDER BY 1',
  'SELECT row_to_json(stored)::text AS row FROM sovitech.app_role_events AS stored ORDER BY 1',
  'SELECT row_to_json(stored)::text AS row FROM sovitech.app_user_roles AS stored ORDER BY 1',
] as const;

let database: TestDatabase;
let projectId: string;
let value: TestDocumentValue;

function passwords(): Record<'migrator' | 'app' | 'operator', string> {
  const of = (role: 'migrator' | 'app' | 'operator'): string => decodeURIComponent(new URL(database.url(role)).password);
  return { migrator: of('migrator'), app: of('app'), operator: of('operator') };
}

function testMigration(name: string, sql: string): Migration {
  return migrationOf(`9${String(Date.now()).slice(-3)}_${name}.sql`, sql);
}

function applyExtra(migration: Migration): Promise<unknown> {
  return runMigrations({ administratorUrl: database.administratorUrl, passwords: passwords(), migrations: [...loadMigrations(), migration] });
}

async function snapshot(): Promise<unknown[]> {
  const parts: unknown[] = [];
  for (const query of SNAPSHOT_QUERIES) parts.push(await database.asAdministrator(query));
  parts.push(await database.asAdministrator('SELECT * FROM sovitech_guard.current_shape() ORDER BY 1, 2, 3'));
  return parts;
}

beforeAll(async () => {
  database = await startTestDatabase();
  const ownerId = await createTestAccount(database, { label: 'G4-22 owner', kind: 'person', roles: ['owner'] });
  const engineerId = await createTestAccount(database, { label: 'G4-22 engineer', kind: 'person', roles: ['sovitech_engineer'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  value = await createTestDocumentValue(database, { projectId, label: 'G4-22 schedule' });
  await withRequest(database.app, { userId: engineerId, projectId }, (request) => openReviewItem(request, { candidateId: value.candidateId }));
}, 240_000);

afterAll(async () => {
  await database.stop();
});

test('F-VALUE-01 · G4-22: each weakening migration is refused for its own reason, rolled back and not recorded; rows and roles unchanged', async () => {
  const before = await snapshot();
  for (const attempt of ATTEMPTS) {
    const migration = testMigration(attempt.name, attempt.sql);
    await expect(applyExtra(migration), attempt.name).rejects.toMatchObject({ code: attempt.code });
    if (attempt.because !== undefined) {
      await expect(applyExtra(migration), attempt.name).rejects.toMatchObject({ detail: expect.stringMatching(attempt.because) });
    }
    expect(await database.asAdministrator('SELECT 1 FROM sovitech_meta.schema_migrations WHERE id = $1', [migration.id]), attempt.name).toEqual([]);
  }
  expect(await snapshot()).toEqual(before);
  expect(await database.asAdministrator('SELECT * FROM sovitech_guard.check_invariants()')).toEqual([]);
});

test('F-VALUE-01 · G4-22: after every attempt, an account holding no role reads nothing and verifies nothing', async () => {
  const nobodyId = await createTestAccount(database, { label: 'G4-22 nobody', kind: 'person', roles: [] });
  expect(await database.asAdministrator('SELECT role FROM sovitech.app_user_roles WHERE user_id = $1', [nobodyId])).toEqual([]);
  expect(await database.as('app', 'SELECT text FROM sovitech.evidence_excerpts', [], { userId: nobodyId, projectId })).toEqual([]);
  const attempt = withRequest(database.app, { userId: nobodyId, projectId }, (request) => verifyCandidate(request, { candidateId: value.candidateId }));
  await expect(attempt).rejects.toMatchObject({ refusal: 'verification_needs_the_engineer_role' });
  const [row] = await database.asAdministrator<{ count: number }>(
    `SELECT count(*)::int AS count FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'engineer_verified'`,
    [value.candidateId],
  );
  expect(row?.count).toBe(0);
});

test('F-VALUE-01 · G4-22 control: adding a column is not a lost guard, and that migration is recorded', async () => {
  const migration = testMigration('test_adds_a_column', 'ALTER TABLE sovitech.guardrail_events ADD COLUMN test_note text;');
  await expect(applyExtra(migration)).resolves.toMatchObject({ applied: [migration.id] });
});
