/**
 * G13-6 (docs/guardrails.md section 7; rule 13, "Project boundary" and "Isolation": "Every
 * document, excerpt, embedding and cache entry is keyed by project id, and retrieval filters by
 * project before ranking"). Proposed in phase 1 (P-1-CASES).
 * Situation: a migration adds a permissive row-level policy, or widens the project-scope
 * policy, on a project table.
 * Expected: refused and rolled back; a session scoped to project B still reads no project A row.
 *
 * Each attempt is an ordinary migration handed to the migration runner after the package's own,
 * on a TEST database holding a document value in each of two projects. The guard check (ADR
 * 0014) refuses every added or changed policy and the switch that turns row-level security off
 * or unforces it; the migrator acting as the table owner outside the runner is refused the
 * same way. Afterwards a session scoped to project B reads only B's rows.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { loadMigrations, migrationOf, runMigrations, type Migration } from '@sovitech/db';
import {
  createTestAccount,
  createTestDocumentValue,
  createTestProject,
  startTestDatabase,
  type TestDatabase,
  type TestDocumentValue,
} from '@sovitech/db/testing';

const WIDENINGS: readonly { readonly name: string; readonly sql: string }[] = [
  { name: 'test_opens_a_policy_on_candidates', sql: 'CREATE POLICY test_open ON sovitech.candidates USING (true);' },
  { name: 'test_opens_a_policy_on_excerpts', sql: 'CREATE POLICY test_open ON sovitech.evidence_excerpts FOR SELECT USING (true);' },
  { name: 'test_widens_the_policy_on_candidates', sql: 'ALTER POLICY project_scope ON sovitech.candidates USING (true);' },
  { name: 'test_widens_the_policy_on_documents', sql: 'ALTER POLICY project_scope ON sovitech.documents USING (true) WITH CHECK (true);' },
  { name: 'test_switches_row_security_off', sql: 'ALTER TABLE sovitech.evidence_excerpts DISABLE ROW LEVEL SECURITY;' },
  { name: 'test_unforces_row_security', sql: 'ALTER TABLE sovitech.candidates NO FORCE ROW LEVEL SECURITY;' },
];

/** What a session reads, table by table: the project ids of every row it sees. */
const READS = ['candidates', 'evidence_excerpts', 'evidence_locators', 'documents', 'document_texts', 'subjects'] as const;

let database: TestDatabase;
let projectA: string;
let projectB: string;
let ownerB: string;
let valueA: TestDocumentValue;

function passwords(): Record<'migrator' | 'app' | 'operator', string> {
  const of = (role: 'migrator' | 'app' | 'operator'): string => decodeURIComponent(new URL(database.url(role)).password);
  return { migrator: of('migrator'), app: of('app'), operator: of('operator') };
}

function applyExtra(migration: Migration): Promise<unknown> {
  return runMigrations({ administratorUrl: database.administratorUrl, passwords: passwords(), migrations: [...loadMigrations(), migration] });
}

async function projectsSeenByB(): Promise<string[]> {
  const seen = new Set<string>();
  for (const table of READS) {
    const rows = await database.as<{ project_id: string }>('app', `SELECT project_id::text FROM sovitech.${table}`, [], { userId: ownerB, projectId: projectB });
    for (const row of rows) seen.add(row.project_id);
  }
  return [...seen].sort();
}

beforeAll(async () => {
  database = await startTestDatabase();
  const ownerA = await createTestAccount(database, { label: 'G13-6 owner A', kind: 'person', roles: ['owner'] });
  ownerB = await createTestAccount(database, { label: 'G13-6 owner B', kind: 'person', roles: ['owner'] });
  projectA = await createTestProject(database, { ownerId: ownerA, isDemo: false });
  projectB = await createTestProject(database, { ownerId: ownerB, isDemo: false });
  valueA = await createTestDocumentValue(database, { projectId: projectA, label: 'G13-6 schedule of A' });
  await createTestDocumentValue(database, { projectId: projectB, label: 'G13-6 schedule of B' });
}, 240_000);

afterAll(async () => {
  await database.stop();
});

test('F-AUTH-03 · G13-6: a migration that opens or widens a policy, or switches row security off, is refused and rolled back; B still reads no A row', async () => {
  expect(await projectsSeenByB()).toEqual([projectB]);
  const policiesBefore = await database.asAdministrator("SELECT tablename, policyname, qual, with_check FROM pg_catalog.pg_policies WHERE schemaname = 'sovitech' ORDER BY 1, 2");
  for (const attempt of WIDENINGS) {
    const migration = migrationOf(`9${String(Date.now()).slice(-3)}_${attempt.name}.sql`, attempt.sql);
    await expect(applyExtra(migration), attempt.name).rejects.toMatchObject({ code: 'SVG01' });
    expect(await database.asAdministrator('SELECT 1 FROM sovitech_meta.schema_migrations WHERE id = $1', [migration.id]), attempt.name).toEqual([]);
    expect(await projectsSeenByB(), attempt.name).toEqual([projectB]);
  }
  expect(await database.asAdministrator("SELECT tablename, policyname, qual, with_check FROM pg_catalog.pg_policies WHERE schemaname = 'sovitech' ORDER BY 1, 2")).toEqual(
    policiesBefore,
  );
});

test('F-AUTH-03 · G13-6: the same, run by the migrator acting as the table owner outside the runner, is refused; B asking for A by id reads nothing', async () => {
  for (const attempt of WIDENINGS) {
    await expect(database.as('owner', attempt.sql), attempt.name).rejects.toMatchObject({ code: 'SVG01' });
  }
  expect(await database.asAdministrator('SELECT * FROM sovitech_guard.check_invariants()')).toEqual([]);
  expect(
    await database.as('app', 'SELECT id FROM sovitech.candidates WHERE id = $1', [valueA.candidateId], { userId: ownerB, projectId: projectB }),
  ).toEqual([]);
  expect(await database.as('app', 'SELECT text FROM sovitech.evidence_excerpts', [], { userId: ownerB, projectId: projectA })).toEqual([]);
  expect(await projectsSeenByB()).toEqual([projectB]);
});
