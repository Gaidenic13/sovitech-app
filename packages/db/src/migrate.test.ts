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

  it('installs the guards last, so every later migration runs under the event trigger', () => {
    const last = loadMigrations().at(-1);
    expect(last?.id).toBe('0009_guards.admin');
    expect(last?.sql).toMatch(/CREATE EVENT TRIGGER sovitech_guard_after_ddl ON ddl_command_end/);
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
