/**
 * The project list at the store (migration 0014, `request_user_projects()`; phase 3, UD-37;
 * PRD R-136: "the project list shows only the projects the user may access"; guardrails
 * rule 13, "Project boundary"), and the bulk read of a project's field inputs the wizard's
 * step views use, against a throwaway TEST database.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProject } from './guarded';
import { newId } from './ids';
import { readFieldInputs, readProjectFieldInputs } from './reads';
import { readProjectSubjects, readUserProjects } from './projects';
import { withRequest } from './request';
import { appendFieldEvent, createSubject } from './writes';
import { createTestAccount, createTestDocumentValue, createTestProject, startTestDatabase, TEST_AREA_FIELD, type TestDatabase } from './testing';

let database: TestDatabase;

beforeAll(async () => {
  database = await startTestDatabase();
}, 120_000);

afterAll(async () => {
  await database.stop();
});

describe('US-ADMIN-05 · R-136 · rule 13: request_user_projects()', () => {
  it('US-ADMIN-05 · R-136 · rule 13: each user lists only the projects they are a member of, with the demo flag, oldest first', async () => {
    const ownerA = await createTestAccount(database, { label: 'list owner A', kind: 'person', roles: ['owner'] });
    const ownerB = await createTestAccount(database, { label: 'list owner B', kind: 'person', roles: ['owner'] });
    const seed = await createTestAccount(database, { label: 'list demo seed', kind: 'seed', roles: ['owner'] });
    const first = await createTestProject(database, { ownerId: ownerA, isDemo: false });
    const second = await createTestProject(database, { ownerId: ownerA, isDemo: false });
    const other = await createTestProject(database, { ownerId: ownerB, isDemo: false });
    const demo = await createTestProject(database, { ownerId: seed, isDemo: true });

    const listed = await withRequest(database.app, { userId: ownerA }, (request) => readUserProjects(request));
    expect(listed.map((row) => row.projectId)).toEqual([first, second]);
    expect(listed.every((row) => !row.isDemo)).toBe(true);
    expect(listed.map((row) => row.projectId)).not.toContain(other);

    const listedB = await withRequest(database.app, { userId: ownerB }, (request) => readUserProjects(request));
    expect(listedB.map((row) => row.projectId)).toEqual([other]);

    const listedSeed = await withRequest(database.app, { userId: seed }, (request) => readUserProjects(request));
    expect(listedSeed).toEqual([{ projectId: demo, isDemo: true, createdAt: expect.stringMatching(/Z$/u) as unknown as string }]);
  });

  it('rule 13 · R-136: a project in scope does not widen the list, and a SOVITECH review role alone lists nothing', async () => {
    const owner = await createTestAccount(database, { label: 'scope owner', kind: 'person', roles: ['owner'] });
    const engineer = await createTestAccount(database, { label: 'scope engineer', kind: 'person', roles: ['sovitech_engineer'] });
    const project = await createTestProject(database, { ownerId: owner, isDemo: false });
    const outsider = await createTestAccount(database, { label: 'scope outsider', kind: 'person', roles: ['owner'] });
    // The outsider names the owner's project in scope: row security shows it nothing, and the list stays its own (empty).
    expect(await withRequest(database.app, { userId: outsider, projectId: project }, (request) => readUserProjects(request))).toEqual([]);
    // An engineer may read a project in scope (0006), but is a member of none: the list is empty (the engineer's queue is phase 7).
    expect(await withRequest(database.app, { userId: engineer }, (request) => readUserProjects(request))).toEqual([]);
    // No user in the request: nothing.
    expect(await withRequest(database.app, { userId: newId() }, (request) => readUserProjects(request))).toEqual([]);
  });

  it('G4-22 · G13-6 · ADR 0013: the function is a guarded function of sovitech_db_access, not executable by everyone, and the guards hold', async () => {
    const [registered] = await database.asAdministrator<{ owner_role: string; security_definer: boolean }>(
      `SELECT owner_role, security_definer FROM sovitech_guard.guarded_functions WHERE signature = 'sovitech.request_user_projects()'`,
    );
    expect(registered).toEqual({ owner_role: 'sovitech_db_access', security_definer: true });
    const [facts] = await database.asAdministrator<{ owner: string; definer: boolean; public_execute: boolean; app_execute: boolean }>(
      `SELECT pg_catalog.pg_get_userbyid(func.proowner) AS owner, func.prosecdef AS definer,
              pg_catalog.has_function_privilege('public', func.oid, 'EXECUTE') AS public_execute,
              pg_catalog.has_function_privilege('sovitech_db_app', func.oid, 'EXECUTE') AS app_execute
       FROM pg_catalog.pg_proc AS func WHERE func.oid = pg_catalog.to_regprocedure('sovitech.request_user_projects()')`,
    );
    expect(facts).toEqual({ owner: 'sovitech_db_access', definer: true, public_execute: false, app_execute: true });
    const problems = await database.asAdministrator<{ problem: string }>(
      'SELECT problem FROM sovitech_guard.check_invariants() UNION ALL SELECT problem FROM sovitech_guard.unguarded_tables()',
    );
    expect(problems).toEqual([]);
    const [trigger] = await database.asAdministrator<{ enabled: string }>(
      `SELECT evtenabled AS enabled FROM pg_catalog.pg_event_trigger WHERE evtname = 'sovitech_guard_after_ddl'`,
    );
    expect(trigger).toEqual({ enabled: 'A' });
    // The administrator's default privilege the migration set for one command is put back: none of its own remains.
    const defaults = await database.asAdministrator(
      `SELECT defaclobjtype FROM pg_catalog.pg_default_acl WHERE defaclrole = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)`,
    );
    expect(defaults).toEqual([]);
  });

  it('G4-22: the migrator cannot replace the function', async () => {
    await expect(
      database.as(
        'owner',
        `CREATE OR REPLACE FUNCTION sovitech.request_user_projects() RETURNS TABLE (project_id uuid, is_demo boolean, created_at timestamptz)
         LANGUAGE sql STABLE AS $$ SELECT id, is_demo, created_at FROM sovitech.projects $$`,
      ),
    ).rejects.toThrow(/must be owner|permission denied/u);
  });
});

describe('the wizard\'s bulk read of a project\'s field inputs', () => {
  it('R-136 · rule 13 · 2.4: reads each field\'s candidates, their events and the project\'s documents as readFieldInputs does, in one pass', async () => {
    const owner = await createTestAccount(database, { label: 'bulk owner', kind: 'person', roles: ['owner'] });
    const project = await createTestProject(database, { ownerId: owner, isDemo: false });
    const value = await createTestDocumentValue(database, { projectId: project, label: 'bulk read' });
    const skippedSubject = await withRequest(database.app, { userId: owner, projectId: project }, async (request) => {
      const subject = await createSubject(request, { kind: 'building', createdBy: owner });
      await appendFieldEvent(request, { subjectId: subject.id, fieldKey: TEST_AREA_FIELD, type: 'skipped', by: owner, role: 'owner' });
      return subject.id;
    });
    await withRequest(database.app, { userId: owner, projectId: project }, async (request) => {
      const bulk = await readProjectFieldInputs(request, [value.subjectId, skippedSubject]);
      const single = await readFieldInputs(request, { subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD });
      expect(bulk.fieldInputs(value.subjectId, TEST_AREA_FIELD)).toEqual(single);
      const skipped = bulk.fieldInputs(skippedSubject, TEST_AREA_FIELD);
      expect(skipped.candidates).toEqual([]);
      expect(skipped.events.field.map((event) => event.type)).toEqual(['skipped']);
      expect(bulk.fieldInputs(skippedSubject, 'test.never.stored')).toMatchObject({ candidates: [], events: { candidate: [], field: [] } });
      expect(bulk.storedFields).toHaveLength(2);
      expect(bulk.documents.map((document) => document.id)).toEqual([value.documentId]);
      const subjects = await readProjectSubjects(request);
      expect(subjects.map((subject) => subject.kind)).toEqual(expect.arrayContaining(['project', 'building', 'document']));
    });
  });

  it('rule 13: a subject of another project reads as nothing', async () => {
    const ownerA = await createTestAccount(database, { label: 'bulk scope A', kind: 'person', roles: ['owner'] });
    const ownerB = await createTestAccount(database, { label: 'bulk scope B', kind: 'person', roles: ['owner'] });
    const projectA = await createTestProject(database, { ownerId: ownerA, isDemo: false });
    const projectB = await withRequest(database.app, { userId: ownerB }, (request) => createProject(request, { isDemo: false }));
    const value = await createTestDocumentValue(database, { projectId: projectA, label: 'bulk other project' });
    await withRequest(database.app, { userId: ownerB, projectId: projectB }, async (request) => {
      const bulk = await readProjectFieldInputs(request, [value.subjectId]);
      expect(bulk.fieldInputs(value.subjectId, TEST_AREA_FIELD).candidates).toEqual([]);
      expect(bulk.storedFields).toEqual([]);
      expect(bulk.documents).toEqual([]);
    });
  });
});
