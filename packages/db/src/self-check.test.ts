/**
 * The runner's self-check (self-check.ts; ADR 0014): after a migration, one
 * engineer verification and one erasure on TEST rows, always rolled back, must
 * succeed, or the run fails. Phase 1 round 3, probe M4: an ordinary migration
 * added `CHECK (type <> 'withdrawn') NOT VALID` on candidate events, and every
 * owner's erasure then failed (rule 13, "Erasure"; rule 7, "block outputs, not
 * people"). The guard check now refuses that migration itself (guards.test.ts);
 * this file shows the self-check catching the same change when an admin
 * migration records it, and a change the guard check lets through.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadMigrations, migrationOf, runMigrations, type Migration } from './migrate';
import { startTestDatabase, type TestDatabase } from './testing';

const LONG = { timeout: 120_000 };

let database: TestDatabase;

function passwords(): Record<'migrator' | 'app' | 'operator', string> {
  const of = (role: 'migrator' | 'app' | 'operator'): string => decodeURIComponent(new URL(database.url(role)).password);
  return { migrator: of('migrator'), app: of('app'), operator: of('operator') };
}

function applyExtra(migration: Migration): Promise<unknown> {
  return runMigrations({ administratorUrl: database.administratorUrl, passwords: passwords(), migrations: [...loadMigrations(), migration] });
}

/** Rows the self-check would leave behind if it did not roll back. */
async function storedRows(): Promise<unknown[]> {
  return database.asAdministrator(
    `SELECT (SELECT count(*)::int FROM sovitech.app_users) AS accounts, (SELECT count(*)::int FROM sovitech.projects) AS projects,
            (SELECT count(*)::int FROM sovitech.candidate_events) AS candidate_events, (SELECT count(*)::int FROM sovitech.audit_events) AS audit_events`,
  );
}

async function recorded(migration: Migration): Promise<boolean> {
  return (await database.asAdministrator('SELECT 1 FROM sovitech_meta.schema_migrations WHERE id = $1', [migration.id])).length > 0;
}

beforeAll(async () => {
  database = await startTestDatabase();
}, 240_000);

afterAll(async () => {
  await database.stop();
});

describe('the self-check after every migration', LONG, () => {
  it('passes on the store as installed, on every run, and leaves no row behind', async () => {
    const before = await storedRows();
    await expect(runMigrations({ administratorUrl: database.administratorUrl, passwords: passwords() })).resolves.toMatchObject({ applied: [] });
    expect(await storedRows()).toEqual(before);
  });

  it('an admin migration that records a constraint stopping erasure, or verification, is refused and rolled back', async () => {
    for (const [name, type] of [
      ['test_admin_blocks_erasure', 'withdrawn'],
      ['test_admin_blocks_verification', 'engineer_verified'],
    ] as const) {
      // As a reviewed admin migration changes a registered table: the event trigger paused, the shape recorded.
      const migration = migrationOf(
        `9${String(Date.now()).slice(-3)}_${name}.admin.sql`,
        `ALTER EVENT TRIGGER sovitech_guard_after_ddl DISABLE;
         ALTER TABLE sovitech.candidate_events ADD CONSTRAINT ${name} CHECK (type <> '${type}') NOT VALID;
         SELECT sovitech_guard.record_shape();
         ALTER EVENT TRIGGER sovitech_guard_after_ddl ENABLE ALWAYS;`,
      );
      await expect(applyExtra(migration), name).rejects.toThrow(/self-check failed in migration .*engineer verification or erasure no longer succeeds/);
      expect(await recorded(migration), name).toBe(false);
      expect(await database.asAdministrator('SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = $1', [name]), name).toEqual([]);
    }
    expect(await database.asAdministrator('SELECT * FROM sovitech_guard.check_invariants()')).toEqual([]);
  });

  // Last in the file: the database keeps the migration, and every later run fails until a new migration repairs it.
  it('an ordinary migration the guard check lets through, which stops the paths the self-check drives, fails the run after it commits', async () => {
    const migration = migrationOf(
      `9${String(Date.now()).slice(-3)}_test_blocks_document_values.sql`,
      `ALTER TABLE sovitech.candidates ADD CONSTRAINT test_no_document_values CHECK (source <> 'document') NOT VALID;`,
    );
    await expect(applyExtra(migration)).rejects.toThrow(new RegExp(`self-check failed after migration ${migration.id}`));
    // The migrator's transaction had committed: the run fails loudly, and keeps failing.
    expect(await recorded(migration)).toBe(true);
    await expect(applyExtra(migration)).rejects.toThrow(/self-check failed after the run/);
  });
});
