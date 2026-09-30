import { describe, expect, it } from 'vitest';
import { checksumOf, loadMigrations, migrationOf } from './migrate';

describe('migration files', () => {
  it('loads every file of packages/db/migrations in number order, each with its runner', () => {
    const migrations = loadMigrations();
    expect(migrations.map((migration) => migration.id)).toEqual([...migrations.map((migration) => migration.id)].sort());
    expect(migrations[0]).toMatchObject({ id: '0000_roles_and_schemas.admin', runner: 'administrator' });
    expect(migrations.find((migration) => migration.id === '0003_candidates_and_evidence')).toMatchObject({ runner: 'migrator' });
    for (const migration of migrations) expect(migration.checksum).toBe(checksumOf(migration.sql));
  });

  it('F-VALUE-01: installs the guards in 0009, and every later migration runs under the event trigger and never pauses it', () => {
    const migrations = loadMigrations();
    const guards = migrations.findIndex((migration) => migration.id === '0009_guards.admin');
    expect(guards).toBeGreaterThan(0);
    expect(migrations[guards]?.sql).toMatch(/CREATE EVENT TRIGGER sovitech_guard_after_ddl ON ddl_command_end/);
    const later = migrations.slice(guards + 1);
    // Phase 2 added 0010 (the ingestion tables and the work schema), an admin migration that
    // registers its tables' guards and records the shape (packages/db/README.md).
    expect(later.map((migration) => migration.id)).toContain('0010_ingestion.admin');
    for (const migration of later) {
      expect(migration.sql, migration.id).not.toMatch(/ALTER EVENT TRIGGER[^;]*DISABLE/i);
      expect(migration.sql, migration.id).not.toMatch(/DROP EVENT TRIGGER/i);
    }
  });

  it('refuses a file name that is not NNNN_name.sql or NNNN_name.admin.sql', () => {
    expect(() => migrationOf('9001_test.txt', 'SELECT 1')).toThrow(/not a migration file name/);
    expect(() => migrationOf('1_test.sql', 'SELECT 1')).toThrow(/not a migration file name/);
    expect(migrationOf('9001_test_step.admin.sql', 'SELECT 1')).toMatchObject({ id: '9001_test_step.admin', runner: 'administrator' });
  });

  it('writes engineer_verified in exactly one INSERT: the one in sovitech.verify_candidate', () => {
    const inserts = loadMigrations().flatMap((migration) =>
      [...migration.sql.matchAll(/INSERT INTO sovitech\.candidate_events[^;]*;/g)]
        .map((match) => match[0])
        .filter((statement) => statement.includes(`'engineer_verified'`))
        .map((statement) => ({ id: migration.id, statement })),
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.id).toBe('0008_guarded_writers.admin');
  });
});
