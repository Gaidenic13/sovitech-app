/**
 * The store's guards, route by route (prompt 3 phase 1 exit: "a non-engineer
 * cannot write engineer_verified by any route (direct SQL as the app role, the
 * admin role, a seed, a migration)", and "updating or deleting a candidate or an
 * event fails"). Each attempt runs against a throwaway TEST database. The
 * indexed cases G4-20, G10-3, G10-8 and G13-5 live in tests/guardrails/.
 */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppRole } from '@sovitech/domain';
import { StoreRefusal } from './errors';
import { createAppUser, grantAppRole, openReviewItem, verifyCandidate } from './guarded';
import { newId } from './ids';
import { loadMigrations, migrationOf, runMigrations, type Migration } from './migrate';
import { withRequest, type RequestScope } from './request';
import { appendCandidateEvent, appendDocumentEvent, registerDocument, type NewCandidateEvent } from './writes';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  testContentHash,
  type TestDatabase,
  type TestDocumentValue,
} from './testing';

const LONG = { timeout: 120_000 };

let database: TestDatabase;
let engineerId: string;
let ownerId: string;
let projectId: string;
let value: TestDocumentValue;
let engineerScope: RequestScope;

/** The engineer_verified rows of the TEST candidate, as the administrator sees them. */
async function verifiedRows(): Promise<number> {
  const [row] = await database.asAdministrator<{ count: number }>(
    `SELECT count(*)::int AS count FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'engineer_verified'`,
    [value.candidateId],
  );
  return row?.count ?? -1;
}

function insertVerified(actor: string): string {
  return `INSERT INTO sovitech.candidate_events (id, project_id, candidate_id, type, actor, role)
          VALUES ('${newId()}', '${projectId}', '${value.candidateId}', 'engineer_verified', '${actor}', 'sovitech_engineer')`;
}

/** A TEST migration that would run after the package's own. */
function testMigration(name: string, sql: string): Migration {
  return migrationOf(`9${String(Date.now()).slice(-3)}_${name}.sql`, sql);
}

/** The login passwords of the TEST database (the runner sets them on every run, so it gets the same ones). */
function passwords(): Record<'migrator' | 'app' | 'operator', string> {
  const of = (role: 'migrator' | 'app' | 'operator'): string => decodeURIComponent(new URL(database.url(role)).password);
  return { migrator: of('migrator'), app: of('app'), operator: of('operator') };
}

async function applyExtra(migration: Migration): Promise<unknown> {
  return runMigrations({
    administratorUrl: database.administratorUrl,
    passwords: passwords(),
    migrations: [...loadMigrations(), migration],
  });
}

beforeAll(async () => {
  database = await startTestDatabase();
  ownerId = await createTestAccount(database, { label: 'guards owner', kind: 'person', roles: ['owner'] });
  engineerId = await createTestAccount(database, { label: 'guards engineer', kind: 'person', roles: ['sovitech_engineer'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  value = await createTestDocumentValue(database, { projectId, label: 'guards schedule' });
  engineerScope = { userId: engineerId, projectId };
  // The engineer opened the item: every route below is tried by someone who got that far.
  await withRequest(database.app, engineerScope, (request) => openReviewItem(request, { candidateId: value.candidateId }));
  // A document event to try changing: a second TEST document, withdrawn.
  await withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    const draft = await registerDocument(request, {
      contentHash: testContentHash('guards draft'),
      kind: 'other',
      stage: 'unknown',
      analysis: { status: 'stored_only', coverage: 'TEST not analysed' },
      createdBy: ownerId,
    });
    await appendDocumentEvent(request, { documentId: draft.id, type: 'withdrawn', by: ownerId, role: 'owner' });
  });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

describe('engineer_verified has one writer, by any route', LONG, () => {
  it('direct SQL as the app role, in an engineer request that opened the item: refused', async () => {
    await expect(database.as('app', insertVerified(engineerId), [], engineerScope)).rejects.toMatchObject({ code: 'SVV10' });
    expect(await verifiedRows()).toBe(0);
  });

  it('direct SQL as the operator role: refused, it may not write candidate events at all', async () => {
    await expect(database.as('operator', insertVerified(engineerId))).rejects.toMatchObject({ code: '42501' });
    expect(await verifiedRows()).toBe(0);
  });

  it('a seed through the data-access layer, with the type forced past the compiler: refused by the store', async () => {
    const forced = { candidateId: value.candidateId, type: 'engineer_verified', by: engineerId, role: 'sovitech_engineer' };
    const attempt = withRequest(database.app, engineerScope, (request) =>
      appendCandidateEvent(request, forced as unknown as NewCandidateEvent),
    );
    await expect(attempt).rejects.toBeInstanceOf(StoreRefusal);
    await expect(attempt).rejects.toMatchObject({ refusal: 'engineer_verified_outside_the_guarded_function' });
    expect(await verifiedRows()).toBe(0);
  });

  it('a seed in SQL, run as the table owner: refused', async () => {
    await expect(database.as('owner', insertVerified(engineerId), [], engineerScope)).rejects.toMatchObject({ code: 'SVV10' });
    expect(await verifiedRows()).toBe(0);
  });

  it('the database administrator, even in a replica-mode session that skips ordinary triggers: refused', async () => {
    // With no request scope, the event-actor guard refuses first; with the engineer's scope, the verified guard does.
    await expect(
      database.asAdministrator(`SET session_replication_role = replica; ${insertVerified(engineerId)}`),
    ).rejects.toMatchObject({ code: 'SVX09' });
    await expect(
      database.asAdministrator(
        `SET session_replication_role = replica;
         SELECT set_config('sovitech.user_id', '${engineerId}', false), set_config('sovitech.project_id', '${projectId}', false);
         ${insertVerified(engineerId)}`,
      ),
    ).rejects.toMatchObject({ code: 'SVV10' });
    expect(await verifiedRows()).toBe(0);
  });

  it('a migration that sets an engineer request scope and inserts it: refused, not recorded, nothing written', async () => {
    const migration = testMigration(
      'test_writes_verified',
      `SELECT set_config('sovitech.user_id', '${engineerId}', true), set_config('sovitech.project_id', '${projectId}', true);
       ${insertVerified(engineerId)};`,
    );
    await expect(applyExtra(migration)).rejects.toMatchObject({ code: 'SVV10' });
    const recorded = await database.asAdministrator('SELECT 1 FROM sovitech_meta.schema_migrations WHERE id = $1', [migration.id]);
    expect(recorded).toEqual([]);
    expect(await verifiedRows()).toBe(0);
  });

  it('a migration that first disables, or drops, the guard: refused by the event trigger', async () => {
    const disable = testMigration(
      'test_disables_guard',
      `ALTER TABLE sovitech.candidate_events DISABLE TRIGGER guard_engineer_verified; ${insertVerified(engineerId)};`,
    );
    await expect(applyExtra(disable)).rejects.toMatchObject({ code: 'SVG01' });
    const drop = testMigration(
      'test_drops_guard',
      `DROP TRIGGER guard_engineer_verified ON sovitech.candidate_events; ${insertVerified(engineerId)};`,
    );
    await expect(applyExtra(drop)).rejects.toMatchObject({ code: 'SVG01' });
    expect(await verifiedRows()).toBe(0);
  });

  it('a migration that replaces the guarded function, or acts as its owner: refused', async () => {
    const replace = testMigration(
      'test_replaces_function',
      `CREATE OR REPLACE FUNCTION sovitech.verify_candidate(p_event_id uuid, p_candidate_id uuid, p_reason text)
       RETURNS timestamptz LANGUAGE sql AS $body$ SELECT now() $body$;`,
    );
    await expect(applyExtra(replace)).rejects.toMatchObject({ code: '42501' });
    const actAs = testMigration('test_sets_role', `SET LOCAL ROLE sovitech_db_verifier; ${insertVerified(engineerId)};`);
    await expect(applyExtra(actAs)).rejects.toMatchObject({ code: '42501' });
    const join = testMigration('test_joins_role', 'GRANT sovitech_db_verifier TO sovitech_db_migrator;');
    await expect(applyExtra(join)).rejects.toMatchObject({ code: '42501' });
    expect(await verifiedRows()).toBe(0);
  });

  it('the guarded function called from the owner or operator login: refused, they may not execute it', async () => {
    const call = `SELECT sovitech.verify_candidate('${newId()}', '${value.candidateId}', NULL)`;
    await expect(database.as('owner', call, [], engineerScope)).rejects.toMatchObject({ code: '42501' });
    await expect(database.as('operator', call, [], engineerScope)).rejects.toMatchObject({ code: '42501' });
    expect(await verifiedRows()).toBe(0);
  });

  it('an engineer who has not opened the item: refused', async () => {
    const otherEngineer = await createTestAccount(database, { label: 'guards second engineer', kind: 'person', roles: ['sovitech_engineer'] });
    const attempt = withRequest(database.app, { userId: otherEngineer, projectId }, (request) =>
      verifyCandidate(request, { candidateId: value.candidateId }),
    );
    await expect(attempt).rejects.toMatchObject({ refusal: 'item_not_opened' });
    expect(await verifiedRows()).toBe(0);
  });

  it('the guarded function, called by the engineer who opened the item through the app role: written once', async () => {
    await withRequest(database.app, engineerScope, (request) => verifyCandidate(request, { candidateId: value.candidateId }));
    expect(await verifiedRows()).toBe(1);
  });
});

describe('a migration cannot weaken a guard', LONG, () => {
  /** `because`: what the guard check must name in its refusal (the SVG01 detail), so each attempt is refused for its own reason. */
  const ATTEMPTS: readonly { readonly name: string; readonly sql: string; readonly code: string; readonly because?: RegExp }[] = [
    { name: 'test_opens_a_policy', sql: 'CREATE POLICY test_open ON sovitech.candidates USING (true);', code: 'SVG01' },
    { name: 'test_widens_the_policy', sql: 'ALTER POLICY project_scope ON sovitech.candidates USING (true);', code: 'SVG01' },
    {
      name: 'test_rewrites_values',
      sql: 'ALTER TABLE sovitech.candidates ALTER COLUMN quantity_value TYPE double precision USING quantity_value * 2;',
      code: 'SVG02',
    },
    { name: 'test_drops_a_column', sql: 'ALTER TABLE sovitech.candidate_events DROP COLUMN reason;', code: 'SVG01' },
    {
      name: 'test_drops_the_project_key',
      sql: 'ALTER TABLE sovitech.evidence_locators DROP CONSTRAINT evidence_locators_document_fk;',
      code: 'SVG01',
    },
    {
      name: 'test_adds_a_trigger',
      sql: `CREATE FUNCTION sovitech.test_rewrite() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN RETURN NEW; END $body$;
            CREATE TRIGGER test_rewrite BEFORE INSERT ON sovitech.candidates FOR EACH ROW EXECUTE FUNCTION sovitech.test_rewrite();`,
      code: 'SVG01',
    },
    { name: 'test_drops_the_schema', sql: 'DROP SCHEMA sovitech CASCADE;', code: 'SVG01' },
    { name: 'test_renames_a_table', sql: 'ALTER TABLE sovitech.candidates RENAME TO old_candidates;', code: 'SVG01' },
    // Phase 1 review: the current-roles view replaced, so that every account reads as an engineer.
    {
      name: 'test_replaces_the_roles_view',
      sql: `CREATE OR REPLACE VIEW sovitech.app_user_roles WITH (security_barrier) AS
              SELECT account.id AS user_id, 'sovitech_engineer'::text AS role, account.created_at AS since FROM sovitech.app_users AS account;`,
      code: '42501',
    },
    { name: 'test_unbars_the_roles_view', sql: 'ALTER VIEW sovitech.app_user_roles RESET (security_barrier);', code: '42501' },
    { name: 'test_adds_a_member_default', sql: `ALTER TABLE sovitech.project_members ALTER COLUMN added_by SET DEFAULT gen_random_uuid();`, code: '42501' },
    // Phase 1 review: defaults moved to 2000-01-01, so new rows sort before every resolution or revocation.
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
    { name: 'test_backdates_role_events', sql: `ALTER TABLE sovitech.app_role_events ALTER COLUMN at SET DEFAULT '2000-01-01';`, code: '42501' },
    {
      name: 'test_drops_a_default',
      sql: 'ALTER TABLE sovitech.field_events ALTER COLUMN at DROP DEFAULT;',
      code: 'SVG01',
      because: /column at of sovitech\.field_events was dropped or changed/,
    },
    // Phase 1 review: a new definer function, granted to the app, that writes what the guards refuse.
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
      name: 'test_adds_a_function',
      sql: 'CREATE FUNCTION sovitech.test_helper() RETURNS int LANGUAGE sql AS $body$ SELECT 1 $body$;',
      code: 'SVG01',
      because: /function sovitech\.test_helper\(\) in schema sovitech is not a guarded function/,
    },
    {
      name: 'test_adds_a_view',
      sql: 'CREATE VIEW sovitech.test_every_candidate AS SELECT * FROM sovitech.candidates;',
      code: 'SVG01',
      because: /view definition on sovitech\.test_every_candidate is not a recorded guard/,
    },
    // Phase 1 review: read and write privileges handed to the operator's login, which may name any engineer.
    {
      name: 'test_grants_the_operator_reads',
      sql: 'GRANT SELECT, INSERT ON sovitech.candidate_events, sovitech.evidence_excerpts TO sovitech_db_admin;',
      code: 'SVG01',
      because: /privilege sovitech_db_admin on sovitech\.candidate_events is not a recorded guard/,
    },
    {
      name: 'test_grants_a_column_insert',
      sql: 'GRANT INSERT (reason) ON sovitech.field_events TO sovitech_db_admin;',
      code: 'SVG01',
      because: /privilege sovitech_db_admin on sovitech\.field_events is not a recorded guard/,
    },
    {
      name: 'test_grants_everyone_a_table',
      sql: 'GRANT SELECT ON sovitech.proposal_snapshots TO PUBLIC;',
      code: 'SVG01',
      because: /privilege public on sovitech\.proposal_snapshots is not a recorded guard/,
    },
    {
      name: 'test_opens_the_schema',
      sql: 'GRANT CREATE ON SCHEMA sovitech TO sovitech_db_app;',
      code: 'SVG01',
      because: /sovitech_db_app may create objects in schema sovitech/,
    },
    {
      name: 'test_adds_an_inheriting_table',
      sql: 'CREATE TABLE sovitech.test_more_candidates () INHERITS (sovitech.candidates);',
      code: 'SVG01',
      because: /sovitech\.test_more_candidates and sovitech\.candidates are joined by inheritance/,
    },
    // Phase 1 round 3 (probe M1): a default privilege is a grant on every table created later, so the
    // next reviewed table would reach the app and the operator's login with INSERT and SELECT unseen.
    {
      name: 'test_default_privileges_on_tables',
      sql: 'ALTER DEFAULT PRIVILEGES FOR ROLE sovitech_db_owner IN SCHEMA sovitech GRANT SELECT, INSERT, REFERENCES ON TABLES TO sovitech_db_admin, sovitech_db_app;',
      code: 'SVG01',
      because: /default privilege sovitech_db_owner in sovitech on r on sovitech\.\(default privileges\) is not a recorded guard/,
    },
    {
      name: 'test_default_privileges_undo_0000',
      sql: 'ALTER DEFAULT PRIVILEGES FOR ROLE sovitech_db_owner GRANT EXECUTE ON FUNCTIONS TO PUBLIC;',
      code: 'SVG01',
      because: /default privilege sovitech_db_owner in every schema on f of sovitech\.\(default privileges\) was dropped or changed/,
    },
    // Phase 1 round 3 (probes M2, M3): a collation decides how the guards compare text; a
    // nondeterministic one made 'BUILDING.ROOMS' read as 'building.rooms'.
    {
      name: 'test_collates_a_column',
      sql: 'ALTER TABLE sovitech.candidates ALTER COLUMN field_key TYPE text COLLATE "C";',
      code: 'SVG01',
      because: /column field_key of sovitech\.candidates was dropped or changed/,
    },
    {
      name: 'test_adds_a_collation',
      sql: `CREATE COLLATION sovitech.test_ci (provider = icu, locale = 'und-u-ks-level2', deterministic = false);`,
      code: 'SVG01',
      because: /collation sovitech\.test_ci is not part of the store/,
    },
    {
      name: 'test_adds_a_domain',
      sql: 'CREATE DOMAIN sovitech.test_text AS text;',
      code: 'SVG01',
      because: /type sovitech\.test_text is not the row type of a table or view of the store/,
    },
    {
      name: 'test_adds_a_type',
      sql: `CREATE TYPE sovitech.test_kind AS ENUM ('TEST');`,
      code: 'SVG01',
      because: /type sovitech\.test_kind is not the row type of a table or view of the store/,
    },
    // Phase 1 round 3 (probe M4): a tightening on its face that stops rule 13's erasure or rule 10's verification.
    {
      name: 'test_blocks_erasure',
      sql: `ALTER TABLE sovitech.candidate_events ADD CONSTRAINT test_no_withdrawn CHECK (type <> 'withdrawn') NOT VALID;`,
      code: 'SVG01',
      because: /constraint test_no_withdrawn on sovitech\.candidate_events is not recorded: the erasure and verification functions write this table/,
    },
    {
      name: 'test_blocks_verification',
      sql: `ALTER TABLE sovitech.candidate_events ADD CONSTRAINT test_no_verified CHECK (type <> 'engineer_verified') NOT VALID;`,
      code: 'SVG01',
      because: /constraint test_no_verified on sovitech\.candidate_events is not recorded/,
    },
    {
      name: 'test_blocks_a_second_event',
      sql: 'CREATE UNIQUE INDEX test_one_event_per_type ON sovitech.candidate_events (candidate_id, type);',
      code: 'SVG01',
      because: /unique index test_one_event_per_type on sovitech\.candidate_events is not recorded/,
    },
    {
      name: 'test_drops_a_unique_index',
      sql: 'DROP INDEX sovitech.evidence_locators_candidate_ordinal;',
      code: 'SVG01',
      because: /unique index evidence_locators_candidate_ordinal of sovitech\.evidence_locators was dropped or changed/,
    },
  ];

  it('each attempt fails, rolls back and is not recorded', async () => {
    const shapeBefore = await database.asAdministrator('SELECT * FROM sovitech_guard.current_shape() ORDER BY 1, 2, 3');
    for (const attempt of ATTEMPTS) {
      const migration = testMigration(attempt.name, attempt.sql);
      await expect(applyExtra(migration), attempt.name).rejects.toMatchObject({ code: attempt.code });
      if (attempt.because !== undefined) {
        await expect(applyExtra(migration), attempt.name).rejects.toMatchObject({ detail: expect.stringMatching(attempt.because) });
      }
      const recorded = await database.asAdministrator('SELECT 1 FROM sovitech_meta.schema_migrations WHERE id = $1', [migration.id]);
      expect(recorded, attempt.name).toEqual([]);
    }
    expect(await database.asAdministrator('SELECT * FROM sovitech_guard.current_shape() ORDER BY 1, 2, 3')).toEqual(shapeBefore);
  });

  it('the same attempts on the migrator\'s own login, outside the runner, acting as the owner: refused by the event trigger or by ownership', async () => {
    const direct: readonly { readonly sql: string; readonly code: string }[] = [
      {
        sql: `CREATE OR REPLACE VIEW sovitech.app_user_roles WITH (security_barrier) AS
                SELECT account.id AS user_id, 'sovitech_engineer'::text AS role, account.created_at AS since FROM sovitech.app_users AS account`,
        code: '42501',
      },
      { sql: `ALTER TABLE sovitech.candidate_events ALTER COLUMN at SET DEFAULT '2000-01-01'`, code: 'SVG01' },
      { sql: 'CREATE FUNCTION sovitech.test_direct() RETURNS int LANGUAGE sql SECURITY DEFINER AS $body$ SELECT 1 $body$', code: 'SVG01' },
      { sql: 'GRANT SELECT ON sovitech.evidence_excerpts TO sovitech_db_admin', code: 'SVG01' },
      { sql: 'CREATE TABLE sovitech.test_direct_child () INHERITS (sovitech.candidate_events)', code: 'SVG01' },
      { sql: 'ALTER DEFAULT PRIVILEGES FOR ROLE sovitech_db_owner IN SCHEMA sovitech GRANT SELECT, INSERT ON TABLES TO sovitech_db_admin', code: 'SVG01' },
      { sql: 'ALTER TABLE sovitech.candidates ALTER COLUMN field_key TYPE text COLLATE "C"', code: 'SVG01' },
      { sql: `CREATE COLLATION sovitech.test_direct_ci (provider = icu, locale = 'und-u-ks-level2', deterministic = false)`, code: 'SVG01' },
      { sql: `ALTER TABLE sovitech.candidate_events ADD CONSTRAINT test_direct_no_withdrawn CHECK (type <> 'withdrawn') NOT VALID`, code: 'SVG01' },
    ];
    for (const attempt of direct) {
      await expect(database.as('owner', attempt.sql), attempt.sql).rejects.toMatchObject({ code: attempt.code });
    }
    expect(await database.asAdministrator('SELECT * FROM sovitech_guard.check_invariants()')).toEqual([]);
  });

  it('after every attempt, an account holding no role still reads no project and verifies nothing', async () => {
    const nobodyId = await createTestAccount(database, { label: 'guards nobody', kind: 'person', roles: [] });
    expect(await database.as('app', 'SELECT text FROM sovitech.evidence_excerpts', [], { userId: nobodyId, projectId })).toEqual([]);
    const attempt = withRequest(database.app, { userId: nobodyId, projectId }, (request) =>
      verifyCandidate(request, { candidateId: value.candidateId }),
    );
    await expect(attempt).rejects.toMatchObject({ refusal: 'verification_needs_the_engineer_role' });
    const [row] = await database.asAdministrator<{ count: number }>(
      `SELECT count(*)::int AS count FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'engineer_verified' AND actor = $2`,
      [value.candidateId, nobodyId],
    );
    expect(row?.count).toBe(0);
  });

  it('after the refused default privileges, a table the owner creates later grants the app and the operator nothing', async () => {
    await expect(
      applyExtra(
        testMigration(
          'test_default_privileges_later',
          'ALTER DEFAULT PRIVILEGES FOR ROLE sovitech_db_owner IN SCHEMA sovitech GRANT SELECT, INSERT ON TABLES TO sovitech_db_admin, sovitech_db_app;',
        ),
      ),
    ).rejects.toMatchObject({ code: 'SVG01' });
    const defaults = await database.asAdministrator<{ acl: string }>('SELECT defaclacl::text AS acl FROM pg_catalog.pg_default_acl');
    expect(defaults.filter((row) => /sovitech_db_(app|admin)=/.test(row.acl))).toEqual([]);
    // A later table, as a reviewed admin migration would create it, in a transaction rolled back afterwards.
    const client = new pg.Client({ connectionString: database.administratorUrl });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE sovitech_db_owner');
      await client.query('CREATE TABLE sovitech.test_later_events (id uuid PRIMARY KEY, project_id uuid NOT NULL)');
      await client.query('RESET ROLE');
      const granted = await client.query<{ app_insert: boolean; operator_select: boolean; operator_insert: boolean }>(
        `SELECT has_table_privilege('sovitech_db_app', 'sovitech.test_later_events', 'INSERT') AS app_insert,
                has_table_privilege('sovitech_db_admin', 'sovitech.test_later_events', 'SELECT') AS operator_select,
                has_table_privilege('sovitech_db_admin', 'sovitech.test_later_events', 'INSERT') AS operator_insert`,
      );
      expect(granted.rows).toEqual([{ app_insert: false, operator_select: false, operator_insert: false }]);
    } finally {
      await client.query('ROLLBACK');
      await client.end();
    }
  });

  it('a new table of the store without registered guards is refused by the runner and rolled back', async () => {
    const migration = testMigration('test_unguarded_table', 'CREATE TABLE sovitech.test_notes (id uuid PRIMARY KEY, project_id uuid NOT NULL);');
    await expect(applyExtra(migration)).rejects.toThrow(/would leave the store unguarded: sovitech\.test_notes has no registered guards/);
    expect(await database.asAdministrator(`SELECT pg_catalog.to_regclass('sovitech.test_notes') AS found`)).toEqual([{ found: null }]);
  });

  it('adding a column is not a lost guard, and the migration is recorded', async () => {
    const migration = testMigration('test_adds_a_column', 'ALTER TABLE sovitech.guardrail_events ADD COLUMN test_note text;');
    await expect(applyExtra(migration)).resolves.toMatchObject({ applied: [migration.id] });
  });
});

describe('append-only for the table owner too: the raising triggers', LONG, () => {
  const TABLES = [
    ['candidates', `field_key = 'test.changed'`],
    ['evidence_locators', 'page = page + 1'],
    ['evidence_excerpts', `text = '[erased]', erased_at = now()`],
    ['document_texts', `text = 'TEST changed'`],
    ['candidate_events', `reason = 'test-changed'`],
    ['document_events', `reason = 'test-changed'`],
    ['review_item_opens', 'opened_at = opened_at'],
    ['audit_events', `reason = 'test-changed'`],
  ] as const;

  async function rowsOf(table: string): Promise<string[]> {
    const rows = await database.asAdministrator<{ row: string }>(
      `SELECT row_to_json(stored)::text AS row FROM sovitech.${table} AS stored ORDER BY 1`,
    );
    return rows.map((entry) => entry.row);
  }

  it('UPDATE, DELETE and TRUNCATE by the owner, which holds every privilege, fail and change no row', async () => {
    const ownerScope: RequestScope = { userId: ownerId, projectId };
    for (const [table, change] of TABLES) {
      const before = await rowsOf(table);
      expect(before.length, table).toBeGreaterThan(0);
      await expect(database.as('owner', `UPDATE sovitech.${table} SET ${change}`, [], ownerScope), table).rejects.toMatchObject({
        code: 'SVA01',
      });
      await expect(database.as('owner', `DELETE FROM sovitech.${table}`, [], ownerScope), table).rejects.toMatchObject({
        code: 'SVA01',
      });
      await expect(database.as('owner', `TRUNCATE sovitech.${table} CASCADE`, [], ownerScope), table).rejects.toMatchObject({
        code: 'SVA01',
      });
      expect(await rowsOf(table), table).toEqual(before);
    }
  });

  it('an erased document event from anywhere but the erasure function: refused', async () => {
    const insert = `INSERT INTO sovitech.document_events (id, project_id, document_id, type, actor, role)
                    VALUES ('${newId()}', '${projectId}', '${value.documentId}', 'erased', '${ownerId}', 'owner')`;
    await expect(database.as('app', insert, [], { userId: ownerId, projectId })).rejects.toMatchObject({ code: 'SVE10' });
    await expect(database.as('owner', insert, [], { userId: ownerId, projectId })).rejects.toMatchObject({ code: 'SVE10' });
  });
});

describe('accounts and roles: granting any role is audited, and only through the access functions', LONG, () => {
  it('each grant writes a role event and an audit event naming who granted it', async () => {
    const userId = await createAppUser(database.operator.db, { displayName: 'TEST audited', kind: 'person', reason: 'TEST setup' });
    await grantAppRole(database.operator.db, { userId, role: 'sovitech_commercial_reviewer', reason: 'TEST grant' });
    const audit = await database.asAdministrator<{ type: string; actor_database_role: string; details: { role: AppRole } }>(
      `SELECT type, actor_database_role, details FROM sovitech.audit_events WHERE target_user_id = $1 ORDER BY at`,
      [userId],
    );
    expect(audit).toEqual([
      { type: 'app_user_created', actor_database_role: 'sovitech_db_admin', details: { kind: 'person' } },
      expect.objectContaining({ type: 'app_role_granted', actor_database_role: 'sovitech_db_admin', details: expect.objectContaining({ role: 'sovitech_commercial_reviewer' }) }),
    ]);
  });

  it('an app request by a user without sovitech_admin cannot grant a role', async () => {
    const attempt = withRequest(database.app, { userId: ownerId }, (request) =>
      grantAppRole(request.trx, { userId: ownerId, role: 'sovitech_engineer', reason: 'TEST self grant' }),
    );
    await expect(attempt).rejects.toMatchObject({ refusal: 'not_authorised' });
  });

  it('a person holding sovitech_admin grants through the app, and the grant is audited with that person', async () => {
    const adminId = await createTestAccount(database, { label: 'guards admin', kind: 'person', roles: ['sovitech_admin'] });
    const userId = await createAppUser(database.operator.db, { displayName: 'TEST new owner', kind: 'person', reason: 'TEST setup' });
    await withRequest(database.app, { userId: adminId }, (request) =>
      grantAppRole(request.trx, { userId, role: 'owner', reason: 'TEST admin grant' }),
    );
    const [audit] = await database.asAdministrator<{ actor_user_id: string }>(
      `SELECT actor_user_id FROM sovitech.audit_events WHERE target_user_id = $1 AND type = 'app_role_granted'`,
      [userId],
    );
    expect(audit?.actor_user_id).toBe(adminId);
  });

  it('a role event written directly, by the app, the operator or the owner: refused', async () => {
    const insert = `INSERT INTO sovitech.app_role_events (id, user_id, role, type, actor_database_role, reason)
                    VALUES ('${newId()}', '${ownerId}', 'sovitech_engineer', 'granted', 'test', 'TEST direct')`;
    await expect(database.as('app', insert)).rejects.toMatchObject({ code: '42501' });
    await expect(database.as('operator', insert)).rejects.toMatchObject({ code: '42501' });
    // The role events belong to sovitech_db_access (0009): the owner role holds no privilege on them at all.
    await expect(database.as('owner', insert)).rejects.toMatchObject({ code: '42501' });
  });
});

describe('the stage 3 record has no writer yet', LONG, () => {
  it('neither the app nor the owner can insert one', async () => {
    const insert = `INSERT INTO sovitech.quotation_records (id, project_id, record_number, reviewing_engineer_id,
                      commercial_reviewer_id, issued_on, valid_until, currency, vat_basis, inclusions, exclusions)
                    VALUES ('${newId()}', '${projectId}', 'TEST-1', '${engineerId}', '${ownerId}', '2026-09-25',
                      '2026-10-25', 'EUR', 'TEST basis', '{}', '{}')`;
    await expect(database.as('app', insert, [], { userId: ownerId, projectId })).rejects.toMatchObject({ code: '42501' });
    await expect(database.as('owner', insert, [], { userId: ownerId, projectId })).rejects.toMatchObject({ code: 'SVR10' });
  });
});

describe('the guards hold after the run, and the runner protects the record', LONG, () => {
  it('reports no invariant problem', async () => {
    expect(await database.asAdministrator('SELECT * FROM sovitech_guard.check_invariants()')).toEqual([]);
  });

  it('refuses a migration that changed after it was applied', async () => {
    const [first, ...rest] = loadMigrations();
    if (first === undefined) throw new Error('no migrations');
    const changed = { ...first, sql: `${first.sql}\n-- TEST changed`, checksum: 'sha256:0' };
    await expect(
      runMigrations({
        administratorUrl: database.administratorUrl,
        passwords: passwords(),
        migrations: [changed, ...rest],
      }),
    ).rejects.toThrow(/changed after it was applied/);
  });
});
