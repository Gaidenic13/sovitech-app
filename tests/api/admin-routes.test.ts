/**
 * The development-only admin area's routes (phase 7; docs/adr/0053-phase-7-scope-and-the-admin-area.md decisions 3 to 7;
 * the contract: packages/view-model/src/browser/contract/admin.ts; PRD R-134, R-141, R-143, R-150, R-151, R-152, R-154,
 * R-155 and their "Until decided" lines; prompt 3 section 9: "development-only admin that never creates approval
 * records"), over a TEST database through the API:
 * - off while the development login is off (404 `admin_off`, before the session or the role is read);
 * - read by a person holding `sovitech_admin` only (403 `admin_only` for an owner, an engineer, a commercial reviewer);
 * - three reads that serve display objects and change nothing; no write route exists under /api/admin;
 * - an admin who is a member of no project reads no project (rule 13; ADR 0013 decision 5);
 * - ADR 0054 decision 3: the owner's "Yes" on an inference records the tier the owner was shown, and the admin's
 *   calibration counts read it as an agreement.
 * The cases G1-33, G3-24, G3-26, G13-15, G13-16 and GS-2 prove their halves in their own files. Every account, project,
 * document and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestAccount } from '@sovitech/db/testing';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { FIELD } from '@sovitech/registry';
import {
  ADMIN_GUARDRAIL_EVENT_TYPES,
  AdminAccountsResponseSchema,
  AdminDatasetsResponseSchema,
  AdminGuardrailEventsResponseSchema,
  ROUTES,
  type DisplayObject,
} from '@sovitech/view-model/browser';
import { buildServer } from '../../apps/api/src/server';
import { adminGet, adminOf, inferredValue, type AdminPath } from '../guardrails/_support/admin';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { newOwnerProject, productionFieldOf, serviceOf, testDocumentIn } from '../guardrails/_support/workspace-store';

const LONG = { timeout: 120_000 };
const PAGES: readonly AdminPath[] = ['accounts', 'datasets', 'guardrail-events'];

let api: TestApi;
let admin: Auth;
let adminId: string;
let owner: Auth;
let ownerId: string;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  ({ admin, adminId } = await adminOf(api, 'admin routes'));
  const [devOwner] = api.devAccountIds;
  if (devOwner === undefined) throw new Error('no TEST development owner');
  ownerId = devOwner;
  owner = await signIn(api, ownerId);
}, 240_000);

afterAll(async () => {
  await api.stop();
});

const textOf = (displays: readonly DisplayObject[], valueId: string): string | undefined => displays.find((display) => display.valueId === valueId)?.text;

describe('ADR 0053 · R-134: the development-only admin area\'s routes', LONG, () => {
  it('ADR 0053 decision 3 · R-133: while the development login is off (no development account, or an upload guard that is not fixtures-only), every admin route answers 404 admin_off, even for a signed-in admin', async () => {
    for (const services of [
      { ...api.services, devAccounts: [] },
      { ...api.services, uploadGuard: { accepts: () => true } },
    ]) {
      const off = buildServer({ gates: assertGatesStartupSafe(), services });
      await off.ready();
      try {
        for (const page of PAGES) {
          for (const auth of [admin, undefined]) {
            const response = await adminGet({ app: off }, auth, page);
            expect(response.statusCode, page).toBe(404);
            expect(response.json(), page).toEqual({ code: 'admin_off' });
          }
        }
      } finally {
        await off.close();
      }
    }
  });

  it('ADR 0053 decision 5 · R-134 · G10-3: not signed in is 401; an owner, an engineer and a commercial reviewer are refused 403 admin_only, and nothing of the area is served', async () => {
    for (const page of PAGES) {
      const anonymous = await adminGet(api, undefined, page);
      expect(anonymous.statusCode, page).toBe(401);
      expect(anonymous.json(), page).toEqual({ code: 'not_signed_in' });
    }
    const engineerId = await createTestAccount(api.database, { label: 'admin routes engineer', kind: 'person', roles: ['sovitech_engineer'] });
    const reviewerId = await createTestAccount(api.database, { label: 'admin routes reviewer', kind: 'person', roles: ['sovitech_commercial_reviewer'] });
    for (const auth of [owner, await signIn(api, engineerId), await signIn(api, reviewerId)]) {
      for (const page of PAGES) {
        const response = await adminGet(api, auth, page);
        expect(response.statusCode, page).toBe(403);
        expect(response.json(), page).toEqual({ code: 'admin_only' });
      }
    }
  });

  it('UD-39 · R-134 · R-143 "Until decided" · R-154 "Until decided": the admin reads every account with its roles and kind, the development flag, every role event, the projects by id with the demo flag and members, and no processor chosen', async () => {
    const response = await adminGet(api, admin, 'accounts');
    expect(response.statusCode, response.body).toBe(200);
    const { view, displayObjects } = AdminAccountsResponseSchema.parse(response.json());
    const own = view.accounts.find((account) => account.userId === adminId);
    expect(own).toMatchObject({ kind: 'person', development: false, roles: [{ role: 'sovitech_admin' }] });
    expect(textOf(displayObjects, own?.name ?? '')).toBe('TEST admin routes admin');
    expect(view.accounts.find((account) => account.userId === ownerId)).toMatchObject({ development: true, roles: [{ role: 'owner' }] });
    expect(view.accounts.find((account) => account.userId === api.extractionAccountId)).toMatchObject({ kind: 'service', roles: [] });
    const grant = view.roleEvents.find((event) => event.userId === adminId);
    expect(grant).toMatchObject({ role: 'sovitech_admin', change: 'granted' });
    expect(textOf(displayObjects, grant?.by ?? '')).toBe("The operator's login");
    expect(textOf(displayObjects, grant?.reason ?? '')).toBe('TEST setup');
    expect(view.processors).toEqual({ state: 'none_chosen' });
    for (const display of displayObjects) expect(display.actions, display.valueId).toBeUndefined();
  });

  it('UD-40 · R-150 "Until decided" · R-132 "Until decided" · G1-33 (the API half): each dataset the gates wait for, no IFC mapping table, each with no version received and no approval record', async () => {
    const response = await adminGet(api, admin, 'datasets');
    expect(response.statusCode, response.body).toBe(200);
    const { view, displayObjects } = AdminDatasetsResponseSchema.parse(response.json());
    expect(view.datasets.map((dataset) => dataset.datasetKey).sort()).toEqual(['romanian-glossary', 'sauter-catalogue', 'sovitech-asset-taxonomy', 'sovitech-cost-ranges', 'sovitech-point-templates']);
    for (const dataset of view.datasets) {
      expect(textOf(displayObjects, dataset.approval), dataset.datasetKey).toBe('No approval record');
      expect(textOf(displayObjects, dataset.version), dataset.datasetKey).toBe('No version received');
    }
    expect(textOf(displayObjects, 'dataset:sovitech-cost-ranges.name')).toBe('SOVITECH cost ranges and benchmarks');
    expect(textOf(displayObjects, 'dataset:sovitech-cost-ranges.waitsFor')).toBe('Waited for by dataset-cost-ranges (D-92)');
    for (const display of displayObjects) expect(display.actions, display.valueId).toBeUndefined();
  });

  it('UD-41 · R-151 · R-142: every section 8 type counted for each project and in all, the release split not counted, and the paired metrics with their targets not set', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'admin routes counts');
    // Step 5's building type question skipped by the owner: one `skipped` event of section 8.
    const skip = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/skip`, headers: { ...owner }, payload: { questionId: 'q.building.type', step: 5 } });
    expect(skip.statusCode, skip.body).toBe(200);
    const response = await adminGet(api, admin, 'guardrail-events');
    expect(response.statusCode, response.body).toBe(200);
    const { view, displayObjects } = AdminGuardrailEventsResponseSchema.parse(response.json());
    const row = view.projects.find((entry) => entry.projectId === projectId);
    expect(row?.counts.map((count) => count.type)).toEqual([...ADMIN_GUARDRAIL_EVENT_TYPES]);
    const [stored] = await api.database.asAdministrator<{ n: number }>(`SELECT count(*)::int AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'skipped'`, [projectId]);
    expect(stored?.n).toBe(1);
    expect(textOf(displayObjects, `guardrail_count:${projectId}.skipped`)).toBe('1');
    expect(textOf(displayObjects, `guardrail_count:${projectId}.question_for_known_field`)).toBe('0');
    expect(textOf(displayObjects, view.byRelease)).toBe('By release: not counted yet. No release is recorded with the events.');
    expect(textOf(displayObjects, `metric:${projectId}.questions_per_project`)).toBe('not counted yet');
    expect(textOf(displayObjects, `metric:${projectId}.questions_per_project.target`)).toBe('Target not set');
    expect(textOf(displayObjects, view.calibration.threshold)).toBe("Not set: the approver sets it (the guardrails propose 10% over the last 50 decisions). No tier's wording changes until then.");
    for (const display of displayObjects) expect(display.actions, display.valueId).toBeUndefined();
  });

  it('ADR 0053 · prompt 3 5.4 · guardrails section 10 ("Metrics prompt a review, never an edit"): the contract has no admin route but the three reads, a write under /api/admin answers 404, and reading the area changes no row', async () => {
    expect(ROUTES.filter((route) => route.path.startsWith('/api/admin')).map((route) => `${route.method} ${route.path}`).sort()).toEqual([
      'GET /api/admin/accounts',
      'GET /api/admin/datasets',
      'GET /api/admin/guardrail-events',
    ]);
    const counted = () =>
      api.database.asAdministrator<{ n: number }>(
        `SELECT (SELECT count(*) FROM sovitech.audit_events) + (SELECT count(*) FROM sovitech.app_role_events) + (SELECT count(*) FROM sovitech.app_users)
           + (SELECT count(*) FROM sovitech.project_members) + (SELECT count(*) FROM sovitech.guardrail_events) + (SELECT count(*) FROM sovitech.candidate_events) AS n`,
      );
    const before = await counted();
    for (const page of PAGES) expect((await adminGet(api, admin, page)).statusCode, page).toBe(200);
    for (const method of ['POST', 'PUT', 'DELETE'] as const) {
      for (const page of PAGES) {
        const response = await api.app.inject({ method, url: `/api/admin/${page}`, headers: { ...admin }, payload: {} });
        expect(response.statusCode, `${method} ${page}`).toBe(404);
      }
    }
    expect(await counted()).toEqual(before);
  });

  it('ADR 0013 decision 5 · rule 13 · R-134: an admin who is a member of no project reads no project\'s screen', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'admin routes isolation');
    for (const path of ['steps/1', 'workspace', 'workspace/documents']) {
      const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers: { ...admin } });
      expect(response.statusCode, path).toBe(404);
    }
    const list = await api.app.inject({ method: 'GET', url: '/api/projects', headers: { ...admin } });
    expect((list.json() as { projects: unknown[] }).projects).toEqual([]);
  });

  it('ADR 0053 decision 4 · R-136 · ADR 0013: a user without `owner` (the admin, an engineer) creating a project is refused 403 owner_only, and nothing is stored', async () => {
    const engineerId = await createTestAccount(api.database, { label: 'admin routes creating engineer', kind: 'person', roles: ['sovitech_engineer'] });
    const before = await api.database.asAdministrator<{ n: number }>('SELECT count(*)::int AS n FROM sovitech.projects');
    for (const auth of [admin, await signIn(api, engineerId)]) {
      const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...auth }, payload: { name: 'TEST admin routes refused', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city' } });
      expect(created.statusCode, created.body).toBe(403);
      expect(created.json()).toEqual({ code: 'owner_only' });
    }
    expect(await api.database.asAdministrator<{ n: number }>('SELECT count(*)::int AS n FROM sovitech.projects')).toEqual(before);
  });

  it('ADR 0054 decision 3 · rule 3: the owner\'s "Yes" on an inference records the tier the owner was shown, and the admin\'s counts read it as an agreement on that tier', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'admin routes confirmation');
    const serviceId = await serviceOf(api, projectId, 'admin routes confirmation');
    const memo = await testDocumentIn(api, { projectId, serviceId, label: 'admin routes memo', fileName: 'TEST memoriu.pdf', pages: ['TEST Destinatia cladirii: hotel'] });
    const inferenceId = await inferredValue(api, {
      projectId,
      serviceId,
      subjectId: buildingId,
      field: productionFieldOf(FIELD.buildingType),
      choice: 'hotel',
      confidence: 'high',
      from: [{ document: memo, page: 1, excerpt: 'TEST Destinatia cladirii: hotel' }],
    });
    const before = AdminGuardrailEventsResponseSchema.parse((await adminGet(api, admin, 'guardrail-events')).json());
    const confirmed = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/confirm`, headers: { ...owner }, payload: { candidateId: inferenceId } });
    expect(confirmed.statusCode, confirmed.body).toBe(200);
    const [event] = await api.database.asAdministrator<{ type: string; role: string; reason: string | null }>(
      `SELECT type, role, reason FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'user_confirmed'`,
      [inferenceId],
    );
    expect(event).toEqual({ type: 'user_confirmed', role: 'owner', reason: 'confidence:high' });
    // The owner correction rate counts it as an agreement; the corrections per tier and item type are unchanged.
    const after = AdminGuardrailEventsResponseSchema.parse((await adminGet(api, admin, 'guardrail-events')).json());
    expect(textOf(after.displayObjects, `metric:${projectId}.owner_correction_rate`)).toBe('0 of 1 decisions corrected (0%)');
    expect(after.view.calibration.tiers.map((tier) => tier.items)).toEqual(before.view.calibration.tiers.map((tier) => tier.items));
  });
});
