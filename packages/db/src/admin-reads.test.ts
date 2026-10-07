/**
 * The development-only admin area's reads at the store (migration 0018, `0018_admin_reads.admin.sql`; phase 7;
 * docs/adr/0053-phase-7-scope-and-the-admin-area.md decisions 5 and 6; docs/adr/0013, amended; PRD R-134, R-151,
 * R-152, R-154 and R-155 "Until decided"), against a throwaway TEST database.
 *
 * - Who may read: an app request by a person who holds `sovitech_admin` now, member of no project; every other
 *   requester is refused `admin_read_needs_the_admin_role` (SVR06): an owner, an engineer, a commercial reviewer, a
 *   service or seed account holding the admin role, an admin whose role was revoked, a request with no user. The
 *   operator's and the migrator's logins cannot call the functions at all.
 * - What comes back: ids, codes, counts, times, an account's name and a role event's reason; never a candidate's value,
 *   an excerpt, extracted text, a file name or a project's name (rule 13; the case files G13-15 and G13-16 prove the
 *   last two on served responses too).
 * - The guards: each function is a guarded definer function of `sovitech_db_access`, executable by the app's login
 *   only; the access role's new column reads are recorded guards; the invariants hold; nothing was paused.
 * Every account, project, document and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GUARDRAIL_EVENT_TYPES } from '@sovitech/domain';
import {
  readAdminAccounts,
  readAdminCalibrationDecisions,
  readAdminErasures,
  readAdminGuardrailCounts,
  readAdminInferenceDecisions,
  readAdminProjects,
  readAdminRoleEvents,
} from './admin-reads';
import { StoreRefusal } from './errors';
import { eraseDocument, revokeAppRole } from './guarded';
import { newId } from './ids';
import { withRequest, type Request } from './request';
import { appendCandidateEvent, appendGuardrailEvent, insertCandidate } from './writes';
import { createTestAccount, createTestDocumentValue, createTestProject, startTestDatabase, TEST_AREA_FIELD, type TestDatabase } from './testing';

const LONG = { timeout: 120_000 };
const TYPE_FIELD = 'test.asset.type';

/** Every admin read, by name (each read as a request to the store, whatever rows it returns). */
const READS: Readonly<Record<string, (request: Request) => Promise<unknown>>> = {
  accounts: readAdminAccounts,
  roleEvents: readAdminRoleEvents,
  projects: readAdminProjects,
  guardrailCounts: readAdminGuardrailCounts,
  calibrationDecisions: readAdminCalibrationDecisions,
  inferenceDecisions: readAdminInferenceDecisions,
  erasures: readAdminErasures,
};

/** The SQL functions of migration 0018 that the app's login may call. */
const FUNCTIONS = [
  'sovitech.admin_accounts()',
  'sovitech.admin_role_events()',
  'sovitech.admin_projects()',
  'sovitech.admin_guardrail_counts()',
  'sovitech.admin_calibration_decisions()',
  'sovitech.admin_inference_decisions()',
  'sovitech.admin_erasures()',
] as const;

let database: TestDatabase;
let adminId: string;
let ownerId: string;
let seedId: string;
let projectId: string;
let demoId: string;
let documentId: string;
let inferenceId: string;
let documentEventId: string;

beforeAll(async () => {
  database = await startTestDatabase();
  adminId = await createTestAccount(database, { label: 'admin reads admin', kind: 'person', roles: ['sovitech_admin'] });
  ownerId = await createTestAccount(database, { label: 'admin reads owner', kind: 'person', roles: ['owner'] });
  seedId = await createTestAccount(database, { label: 'admin reads demo seed', kind: 'seed', roles: ['owner'] });
  projectId = await createTestProject(database, { ownerId, isDemo: false });
  demoId = await createTestProject(database, { ownerId: seedId, isDemo: true });
  const value = await createTestDocumentValue(database, { projectId, label: 'admin reads schedule' });
  documentId = value.documentId;
  // A TEST inference of high confidence on the same TEST page, by the project's TEST extraction account.
  inferenceId = newId();
  await withRequest(database.app, { userId: value.serviceId, projectId }, async (request) => {
    const written = await insertCandidate(
      request,
      {
        id: inferenceId,
        subjectId: value.subjectId,
        fieldKey: TYPE_FIELD,
        choice: 'ahu',
        source: 'ai_inference',
        confidence: 'high',
        evidence: [{ documentId: value.documentId, contentHash: value.contentHash, locator: { page: 1 }, excerpt: 'TEST admin reads schedule: Suprafata construita desfasurata 1.234,5 mp', check: 'text_match' }],
        createdBy: value.serviceId,
      },
      { key: TYPE_FIELD, kind: 'enum' },
    );
    if (written.outcome !== 'stored') throw new Error(`the TEST inference was refused: ${written.outcome}`);
  });
  await withRequest(database.app, { userId: ownerId, projectId }, async (request) => {
    // The owner confirms the inference, the tier recorded with the decision (ADR 0054 decision 3).
    await appendCandidateEvent(request, { candidateId: inferenceId, type: 'user_confirmed', by: ownerId, role: 'owner', reason: 'confidence:high' });
    // Section 8: two corrections of inferences, a medium and a high one, and two skips.
    await appendGuardrailEvent(request, { type: 'owner_corrected_inference', subjectId: value.subjectId, fieldKey: TEST_AREA_FIELD, reason: 'confidence:medium', actor: ownerId });
    await appendGuardrailEvent(request, { type: 'owner_corrected_inference', subjectId: value.subjectId, fieldKey: TYPE_FIELD, reason: 'confidence:high', actor: ownerId });
    await appendGuardrailEvent(request, { type: 'skipped', fieldKey: TEST_AREA_FIELD, reason: 'skip_for_now', actor: ownerId });
    await appendGuardrailEvent(request, { type: 'skipped', fieldKey: TYPE_FIELD, reason: 'skip_for_now', actor: ownerId });
  });
  await withRequest(database.app, { userId: seedId, projectId: demoId }, (request) => appendGuardrailEvent(request, { type: 'skipped', reason: 'skip_for_now', actor: seedId }));
  // The owner deletes the TEST document: one audited erasure (rule 13).
  documentEventId = newId();
  await withRequest(database.app, { userId: ownerId, projectId }, (request) => eraseDocument(request, { documentId: value.documentId, role: 'owner', reason: 'owner_deleted_document', documentEventId }));
}, 240_000);

afterAll(async () => {
  await database.stop();
});

const asAdmin = <T>(read: (request: Request) => Promise<T>): Promise<T> => withRequest(database.app, { userId: adminId }, read);

describe('ADR 0053 decisions 5 and 6 · R-134 · SVR06: who may read the admin area at the store', LONG, () => {
  it('R-134 · ADR 0013 decision 5 · G10-3: an owner, an engineer, a commercial reviewer, a service or seed account holding the admin role, a revoked admin and a request with no user are each refused by every read', async () => {
    const engineerId = await createTestAccount(database, { label: 'admin reads engineer', kind: 'person', roles: ['sovitech_engineer'] });
    const reviewerId = await createTestAccount(database, { label: 'admin reads reviewer', kind: 'person', roles: ['sovitech_commercial_reviewer'] });
    const serviceAdmin = await createTestAccount(database, { label: 'admin reads service admin', kind: 'service', roles: ['sovitech_admin'] });
    const seedAdmin = await createTestAccount(database, { label: 'admin reads seed admin', kind: 'seed', roles: ['sovitech_admin'] });
    const revoked = await createTestAccount(database, { label: 'admin reads revoked admin', kind: 'person', roles: ['sovitech_admin'] });
    await revokeAppRole(database.operator.db, { userId: revoked, role: 'sovitech_admin', reason: 'TEST revoke' });
    const refused = [ownerId, engineerId, reviewerId, serviceAdmin, seedAdmin, revoked, newId()];
    for (const userId of refused) {
      for (const [name, read] of Object.entries(READS)) {
        const attempt = withRequest(database.app, { userId }, (request) => read(request));
        await expect(attempt, `${name} as ${userId}`).rejects.toBeInstanceOf(StoreRefusal);
        await expect(attempt, `${name} as ${userId}`).rejects.toMatchObject({ refusal: 'admin_read_needs_the_admin_role', sqlState: 'SVR06' });
      }
    }
    // An owner who is a member of a project, with that project in scope, is refused too: membership grants no admin read.
    await expect(withRequest(database.app, { userId: ownerId, projectId }, (request) => readAdminProjects(request))).rejects.toMatchObject({ refusal: 'admin_read_needs_the_admin_role' });
  });

  it('ADR 0053 decision 6: the operator\'s login and the migrator cannot call the functions at all', async () => {
    for (const signature of FUNCTIONS) {
      const call = `SELECT * FROM ${signature.replace('()', '()')}`;
      await expect(database.as('operator', call, [], { userId: adminId }), signature).rejects.toThrow(/permission denied/u);
      await expect(database.as('owner', call, [], { userId: adminId }), signature).rejects.toThrow(/permission denied/u);
    }
  });
});

describe('ADR 0053 decision 7: what an admin who is a member of no project reads', LONG, () => {
  it('UD-39 · R-154 "Until decided": accounts with their current roles, and every role event with who acted and why', async () => {
    const accounts = await asAdmin(readAdminAccounts);
    const admin = accounts.find((account) => account.userId === adminId);
    expect(admin).toMatchObject({ displayName: 'TEST admin reads admin', kind: 'person', roles: [{ role: 'sovitech_admin', since: expect.stringMatching(/Z$/u) as unknown as string }] });
    expect(accounts.find((account) => account.userId === seedId)).toMatchObject({ kind: 'seed', roles: [{ role: 'owner' }] });
    const events = await asAdmin(readAdminRoleEvents);
    const grant = events.find((event) => event.userId === adminId);
    // Granted on the operator's login (createTestAccount), with its reason as recorded.
    expect(grant).toMatchObject({ role: 'sovitech_admin', change: 'granted', byOperator: true, byUserId: null, reason: 'TEST setup' });
    // Newest first.
    const times = events.map((event) => event.at);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('UD-39 · rule 13: projects by id with the demo flag, creation time and members, never a name', async () => {
    const projects = await asAdmin(readAdminProjects);
    expect(projects.find((project) => project.projectId === projectId)).toMatchObject({ isDemo: false, memberIds: expect.arrayContaining([ownerId]) as unknown as string[] });
    expect(projects.find((project) => project.projectId === demoId)).toMatchObject({ isDemo: true, memberIds: [seedId] });
    for (const project of projects) expect(Object.keys(project).sort()).toEqual(['createdAt', 'isDemo', 'memberIds', 'projectId']);
  });

  it('UD-41 · R-151 · R-142: every section 8 type counted for every project, a count of none included, and per type in all', async () => {
    const { projects, totals } = await asAdmin(readAdminGuardrailCounts);
    const own = projects.filter((row) => row.projectId === projectId);
    expect(own.map((row) => row.type)).toEqual([...GUARDRAIL_EVENT_TYPES]);
    expect(own.find((row) => row.type === 'owner_corrected_inference')?.count).toBe(2);
    expect(own.find((row) => row.type === 'skipped')?.count).toBe(2);
    expect(own.find((row) => row.type === 'question_for_known_field')?.count).toBe(0);
    expect(projects.find((row) => row.projectId === demoId && row.type === 'skipped')).toMatchObject({ isDemo: true, count: 1 });
    expect(totals.map((row) => row.type)).toEqual([...GUARDRAIL_EVENT_TYPES]);
    const [stored] = await database.asAdministrator<{ n: number }>(`SELECT count(*)::int AS n FROM sovitech.guardrail_events WHERE type = 'skipped'`);
    expect(totals.find((row) => row.type === 'skipped')?.count).toBe(stored?.n);
  });

  it('UD-41 · R-152 "Until decided" · ADR 0054 decision 3 · G3-24: decisions on inferences with the tier recorded with each, the item type, the outcome, who and when; no project, subject, candidate or value', async () => {
    const decisions = await asAdmin(readAdminCalibrationDecisions);
    expect(decisions.map(({ tier, fieldKey, outcome, by }) => ({ tier, fieldKey, outcome, by }))).toEqual(
      expect.arrayContaining([
        { tier: 'high', fieldKey: TYPE_FIELD, outcome: 'agreed', by: 'owner' },
        { tier: 'medium', fieldKey: TEST_AREA_FIELD, outcome: 'corrected', by: 'owner' },
        { tier: 'high', fieldKey: TYPE_FIELD, outcome: 'corrected', by: 'owner' },
      ]),
    );
    expect(decisions).toHaveLength(3);
    for (const decision of decisions) expect(Object.keys(decision).sort()).toEqual(['at', 'by', 'fieldKey', 'outcome', 'tier']);
    const perProject = await asAdmin(readAdminInferenceDecisions);
    expect(perProject.find((row) => row.projectId === projectId)).toEqual({ projectId, confirmations: 1, corrections: 2 });
    expect(perProject.find((row) => row.projectId === demoId)).toEqual({ projectId: demoId, confirmations: 0, corrections: 0 });
  });

  it('UD-41 · R-151 · R-155 "Until decided" · rule 13: one erasure entry per erased document event, with who asked, the role, when, the document and the counts', async () => {
    const erasures = await asAdmin(readAdminErasures);
    const entry = erasures.find((row) => row.documentEventId === documentEventId);
    expect(entry).toMatchObject({ projectId, isDemo: false, documentId, role: 'owner', byUserId: ownerId, excerptsErased: 2, candidatesWithdrawn: 2 });
    expect(entry?.textPartsDeleted).toBeGreaterThanOrEqual(1);
    expect(Object.keys(entry ?? {}).sort()).toEqual(
      ['at', 'byUserId', 'candidatesWithdrawn', 'documentEventId', 'documentId', 'excerptsErased', 'isDemo', 'projectId', 'role', 'textPartsDeleted'].sort(),
    );
  });

  it('ADR 0053: nothing an admin read does writes a row', async () => {
    const counted = async () =>
      database.asAdministrator<{ n: number }>(
        `SELECT (SELECT count(*) FROM sovitech.audit_events) + (SELECT count(*) FROM sovitech.app_role_events) + (SELECT count(*) FROM sovitech.guardrail_events)
           + (SELECT count(*) FROM sovitech.candidate_events) + (SELECT count(*) FROM sovitech.project_members) + (SELECT count(*) FROM sovitech.app_users) AS n`,
      );
    const before = await counted();
    for (const read of Object.values(READS)) await asAdmin(read);
    expect(await counted()).toEqual(before);
  });
});

describe('G4-22 · G13-6 · ADR 0013 (amended): the guards of migration 0018', LONG, () => {
  it('each admin read is a guarded definer function of sovitech_db_access, executable by the app\'s login only; the check is not executable by the app', async () => {
    for (const signature of [...FUNCTIONS, 'sovitech.admin_reading_user()']) {
      const [registered] = await database.asAdministrator<{ owner_role: string; security_definer: boolean }>(
        'SELECT owner_role, security_definer FROM sovitech_guard.guarded_functions WHERE signature = $1',
        [signature],
      );
      expect(registered, signature).toEqual({ owner_role: 'sovitech_db_access', security_definer: true });
      const [facts] = await database.asAdministrator<{ owner: string; definer: boolean; public_execute: boolean; app_execute: boolean; operator_execute: boolean; migrator_execute: boolean }>(
        `SELECT pg_catalog.pg_get_userbyid(func.proowner) AS owner, func.prosecdef AS definer,
                pg_catalog.has_function_privilege('public', func.oid, 'EXECUTE') AS public_execute,
                pg_catalog.has_function_privilege('sovitech_db_app', func.oid, 'EXECUTE') AS app_execute,
                pg_catalog.has_function_privilege('sovitech_db_admin', func.oid, 'EXECUTE') AS operator_execute,
                pg_catalog.has_function_privilege('sovitech_db_migrator', func.oid, 'EXECUTE') AS migrator_execute
         FROM pg_catalog.pg_proc AS func WHERE func.oid = pg_catalog.to_regprocedure($1)`,
        [signature],
      );
      const appMay = signature !== 'sovitech.admin_reading_user()';
      expect(facts, signature).toEqual({ owner: 'sovitech_db_access', definer: true, public_execute: false, app_execute: appMay, operator_execute: false, migrator_execute: false });
    }
  });

  it('the access role reads only the columns the admin reads need, and those reads are recorded guards; the invariants hold, and no default privilege of the administrator remains', async () => {
    const granted = await database.asAdministrator<{ table_name: string; definition: string }>(
      `SELECT table_name, definition FROM sovitech_guard.recorded_shape
       WHERE kind = 'privilege' AND name = 'sovitech_db_access' AND table_name IN ('guardrail_events', 'document_events', 'candidate_events', 'candidates')
       ORDER BY table_name`,
    );
    expect(granted).toEqual([
      { table_name: 'candidate_events', definition: 'SELECT (at), SELECT (candidate_id), SELECT (project_id), SELECT (reason), SELECT (role), SELECT (type)' },
      { table_name: 'candidates', definition: 'SELECT (field_key), SELECT (id), SELECT (project_id), SELECT (source)' },
      { table_name: 'document_events', definition: 'SELECT (at), SELECT (document_id), SELECT (id), SELECT (project_id), SELECT (role), SELECT (type)' },
      { table_name: 'guardrail_events', definition: 'SELECT (at), SELECT (field_key), SELECT (project_id), SELECT (reason), SELECT (type)' },
    ]);
    // No value, excerpt or text column is readable by the access role.
    const readable = await database.asAdministrator<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.column_privileges
       WHERE grantee = 'sovitech_db_access' AND privilege_type = 'SELECT'
         AND table_schema = 'sovitech' AND table_name IN ('candidates', 'evidence_excerpts', 'document_texts', 'documents', 'document_files')
       ORDER BY table_name, column_name`,
    );
    expect(readable).toEqual([
      { table_name: 'candidates', column_name: 'field_key' },
      { table_name: 'candidates', column_name: 'id' },
      { table_name: 'candidates', column_name: 'project_id' },
      { table_name: 'candidates', column_name: 'source' },
    ]);
    const problems = await database.asAdministrator<{ problem: string }>('SELECT problem FROM sovitech_guard.check_invariants() UNION ALL SELECT problem FROM sovitech_guard.unguarded_tables()');
    expect(problems).toEqual([]);
    const [trigger] = await database.asAdministrator<{ enabled: string }>(`SELECT evtenabled AS enabled FROM pg_catalog.pg_event_trigger WHERE evtname = 'sovitech_guard_after_ddl'`);
    expect(trigger).toEqual({ enabled: 'A' });
    const defaults = await database.asAdministrator(`SELECT defaclobjtype FROM pg_catalog.pg_default_acl WHERE defaclrole = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user)`);
    expect(defaults).toEqual([]);
  });

  it('G4-22: the migrator cannot replace an admin read, nor grant itself one', async () => {
    await expect(
      database.as('owner', `CREATE OR REPLACE FUNCTION sovitech.admin_projects() RETURNS TABLE (project_id uuid, is_demo boolean, created_at timestamptz, member_ids uuid[]) LANGUAGE sql STABLE AS $$ SELECT NULL::uuid, false, now(), ARRAY[]::uuid[] $$`),
    ).rejects.toThrow(/must be owner|permission denied/u);
    await expect(database.as('owner', 'GRANT EXECUTE ON FUNCTION sovitech.admin_projects() TO sovitech_db_admin')).rejects.toThrow(/permission denied|not owner|refused/u);
  });
});
