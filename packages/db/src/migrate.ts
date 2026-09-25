/**
 * The migration runner: hand-written SQL files in packages/db/migrations/, applied
 * in order, each in its own transaction, recorded with its SHA-256 in
 * sovitech_meta.schema_migrations. A file that changed after it was applied stops
 * the run.
 *
 * Two kinds of file:
 * - `NNNN_name.admin.sql` runs on the database administrator's connection (a
 *   superuser): roles, the functions owned by the definer roles, the guards and
 *   the event trigger;
 * - `NNNN_name.sql` runs as sovitech_db_migrator acting as sovitech_db_owner
 *   (SET LOCAL ROLE): tables, indexes, grants and policies.
 *
 * Inside each migration's transaction, and again after the run, the guard
 * invariants must hold and every table of schema sovitech must have registered
 * guards (sovitech_guard.check_invariants, unguarded_tables), or the migration
 * rolls back and the run fails. Passwords for the login roles are set on every
 * run and never logged.
 *
 * Once the guards are installed, the store's self-check (self-check.ts) also
 * runs one engineer verification and one erasure on TEST rows, always rolled
 * back: inside an admin migration's transaction, so a migration that stops
 * either path rolls back; after an ordinary migration commits (its transaction
 * is the migrator's, which cannot act as the app or the operator), so the run
 * fails naming it; and at the end of every run.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';
import { storeSelfCheck } from './self-check';

export const MIGRATIONS_DIRECTORY = new URL('../migrations/', import.meta.url);

/** The login roles of the store (0000). */
export const LOGIN_ROLES = {
  migrator: 'sovitech_db_migrator',
  app: 'sovitech_db_app',
  operator: 'sovitech_db_admin',
} as const;
export type LoginRole = keyof typeof LOGIN_ROLES;

export type MigrationRunner = 'administrator' | 'migrator';

export interface Migration {
  /** The file name without `.sql`, for example `0003_candidates_and_evidence`. */
  readonly id: string;
  readonly runner: MigrationRunner;
  readonly sql: string;
  /** `sha256:` and the hex digest of the file. */
  readonly checksum: string;
}

const FILE_NAME = /^(\d{4})_[a-z0-9_]+(\.admin)?\.sql$/;

/** The migration that installs the guards; every run includes it. */
export const GUARDS_MIGRATION = '0009_guards.admin';

export function checksumOf(sql: string): string {
  return `sha256:${createHash('sha256').update(sql, 'utf8').digest('hex')}`;
}

/** A migration from its id and text; `.admin` in the id means the administrator runs it. */
export function migrationOf(fileName: string, sql: string): Migration {
  const match = FILE_NAME.exec(fileName);
  if (match === null) throw new Error(`not a migration file name: ${fileName}`);
  return {
    id: fileName.replace(/\.sql$/, ''),
    runner: match[2] === undefined ? 'migrator' : 'administrator',
    sql,
    checksum: checksumOf(sql),
  };
}

/** Every migration in the directory, in order. Any other file, or a repeated number, is an error. */
export function loadMigrations(directory: URL = MIGRATIONS_DIRECTORY): Migration[] {
  const names = readdirSync(directory).filter((name) => !name.startsWith('.')).sort();
  const numbers = new Set<string>();
  return names.map((name) => {
    const migration = migrationOf(name, readFileSync(new URL(name, directory), 'utf8'));
    const number = name.slice(0, 4);
    if (numbers.has(number)) throw new Error(`two migrations share the number ${number}`);
    numbers.add(number);
    return migration;
  });
}

/** A connection string for one login role, on the same server and database as `baseUrl`. */
export function loginUrl(baseUrl: string, role: string, password: string): string {
  const url = new URL(baseUrl);
  url.username = encodeURIComponent(role);
  url.password = encodeURIComponent(password);
  return url.toString();
}

export interface MigrationSettings {
  /** A superuser connection string: the database administrator. */
  readonly administratorUrl: string;
  /** The passwords of the login roles, set on every run. */
  readonly passwords: Readonly<Record<LoginRole, string>>;
  /** The migrations to apply; the package's own by default. */
  readonly migrations?: readonly Migration[];
}

export interface MigrationReport {
  readonly applied: readonly string[];
  readonly alreadyApplied: readonly string[];
}

const META = `
CREATE SCHEMA IF NOT EXISTS sovitech_meta;
REVOKE ALL ON SCHEMA sovitech_meta FROM PUBLIC;
CREATE TABLE IF NOT EXISTS sovitech_meta.schema_migrations (
  id text PRIMARY KEY,
  checksum text NOT NULL,
  runner text NOT NULL CHECK (runner IN ('administrator', 'migrator')),
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
`;

async function inTransaction(client: pg.Client, work: () => Promise<void>): Promise<void> {
  await client.query('BEGIN');
  try {
    await work();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function rolesExist(admin: pg.Client): Promise<boolean> {
  const result = await admin.query<{ present: boolean }>(
    `SELECT count(*) = 3 AS present FROM pg_catalog.pg_roles WHERE rolname = ANY ($1::text[])`,
    [Object.values(LOGIN_ROLES)],
  );
  return result.rows[0]?.present === true;
}

async function setPasswords(admin: pg.Client, passwords: Readonly<Record<LoginRole, string>>): Promise<void> {
  for (const [key, role] of Object.entries(LOGIN_ROLES) as [LoginRole, string][]) {
    const password = passwords[key];
    if (password.length < 12) throw new Error(`the password for ${role} is shorter than 12 characters`);
    await admin.query(`ALTER ROLE ${admin.escapeIdentifier(role)} WITH LOGIN PASSWORD ${admin.escapeLiteral(password)}`);
  }
}

async function record(client: pg.Client, migration: Migration): Promise<void> {
  await client.query('INSERT INTO sovitech_meta.schema_migrations (id, checksum, runner) VALUES ($1, $2, $3)', [
    migration.id,
    migration.checksum,
    migration.runner,
  ]);
}

/**
 * The guard invariants that do not hold, and the tables of schema sovitech with
 * no registered guards, as the database reports them. Empty when every guard
 * holds, and before migration 0009 installs the guards.
 */
export async function guardProblems(client: pg.Client): Promise<string[]> {
  const installed = await client.query<{ present: boolean }>(
    `SELECT pg_catalog.to_regprocedure('sovitech_guard.unguarded_tables()') IS NOT NULL AS present`,
  );
  if (installed.rows[0]?.present !== true) return [];
  const result = await client.query<{ problem: string }>(
    'SELECT problem FROM sovitech_guard.check_invariants() UNION ALL SELECT problem FROM sovitech_guard.unguarded_tables()',
  );
  return result.rows.map((row) => row.problem);
}

/** Fails the migration's own transaction, so it rolls back, when it would leave the store unguarded. */
async function refuseUnguarded(client: pg.Client, migration: Migration): Promise<void> {
  const problems = await guardProblems(client);
  if (problems.length > 0) {
    throw new Error(`migration ${migration.id} would leave the store unguarded: ${problems.join('; ')}`);
  }
}

/** Applies every pending migration, in order. */
export async function runMigrations(settings: MigrationSettings): Promise<MigrationReport> {
  const migrations = settings.migrations ?? loadMigrations();
  const admin = new pg.Client({ connectionString: settings.administratorUrl });
  await admin.connect();
  let migrator: pg.Client | undefined;
  const applied: string[] = [];
  const alreadyApplied: string[] = [];
  try {
    await admin.query(`SELECT pg_catalog.pg_advisory_lock(pg_catalog.hashtext('sovitech-migrations'))`);
    await admin.query(META);
    const recorded = new Map(
      (await admin.query<{ id: string; checksum: string }>('SELECT id, checksum FROM sovitech_meta.schema_migrations')).rows.map(
        (row) => [row.id, row.checksum],
      ),
    );
    for (const migration of migrations) {
      const checksum = recorded.get(migration.id);
      if (checksum !== undefined) {
        if (checksum !== migration.checksum) {
          throw new Error(`migration ${migration.id} changed after it was applied; write a new migration instead`);
        }
        alreadyApplied.push(migration.id);
        continue;
      }
      if (migration.runner === 'administrator') {
        await inTransaction(admin, async () => {
          await admin.query(migration.sql);
          await refuseUnguarded(admin, migration);
          await storeSelfCheck(admin, `in migration ${migration.id}`, 'savepoint');
          await record(admin, migration);
        });
      } else {
        if (migrator === undefined) {
          if (!(await rolesExist(admin))) throw new Error(`migration ${migration.id} needs the roles of 0000 first`);
          await setPasswords(admin, settings.passwords);
          migrator = new pg.Client({
            connectionString: loginUrl(settings.administratorUrl, LOGIN_ROLES.migrator, settings.passwords.migrator),
          });
          await migrator.connect();
        }
        const client = migrator;
        await inTransaction(client, async () => {
          await client.query('SET LOCAL ROLE sovitech_db_owner');
          await client.query(migration.sql);
          await client.query('SET LOCAL ROLE NONE');
          await refuseUnguarded(client, migration);
          await record(client, migration);
        });
        applied.push(migration.id);
        await storeSelfCheck(admin, `after migration ${migration.id}`, 'transaction');
        continue;
      }
      applied.push(migration.id);
    }
    if (await rolesExist(admin)) await setPasswords(admin, settings.passwords);
    const problems = await guardProblems(admin);
    if (problems.length > 0) throw new Error(`the guards of the store do not hold: ${problems.join('; ')}`);
    if (!migrations.some((migration) => migration.id === GUARDS_MIGRATION)) {
      throw new Error(`the migrations do not include ${GUARDS_MIGRATION}, which installs the guards`);
    }
    await storeSelfCheck(admin, 'after the run', 'transaction');
    return { applied, alreadyApplied };
  } finally {
    await migrator?.end();
    await admin.query(`SELECT pg_catalog.pg_advisory_unlock(pg_catalog.hashtext('sovitech-migrations'))`).catch(() => undefined);
    await admin.end();
  }
}
