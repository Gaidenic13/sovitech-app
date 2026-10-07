/**
 * The workspace's routes over a TEST database, through the API (phase 4; docs/adr/0044-workspace-api-contract.md;
 * packages/view-model/src/browser/contract/workspace.ts), with the production registry as the app reads it:
 * - every route needs a session (401 `not_signed_in`), reads another project as not found (404; rule 13), refuses a
 *   query or body the contract refuses (400 `request_invalid`), and each write checks the CSRF token (403
 *   `csrf_invalid`); an owner write needs the owner's role in the project (403 `owner_only`);
 * - every 2xx body satisfies the contract (the API validates its own answers; the test parses them again);
 * - G1-26 (the API half): an uploaded fixture's Category reads Unknown with no chip; its row names its format, the date
 *   it was added, its status as step 2 shows it, and whether its original can be downloaded;
 * - the frame's footer and Documents carry "Still reading <n> files" while a document waits to be read (rule 7);
 * - Equipment lists one row per tag (2.5), never an untagged appearance (G4-17), pages 50 rows with previous and next
 *   only, and finds a tag by search; the asset detail shows the tag's evidence; an unknown asset is not found;
 * - Zones and Topology on a project with no zone and no decision say so truthfully (G12-10, G7-15);
 * - G2-7 (the served half): one value id with one filter is one display in every response that serves it: the area and
 *   the project type on the project card, step 3 and step 8; a scope decision on System Scope, Topology, step 4 and
 *   step 8; a system's equipment line on System Scope and Topology.
 * Every account, document and value is TEST data; the uploaded file is a generated synthetic fixture.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordAssetAppearance, withRequest } from '@sovitech/db';
import { createTestAccount } from '@sovitech/db/testing';
import {
  AssetResponseSchema,
  StepResponseSchema,
  servedDisplayOf,
  type DisplayObject,
  DocumentsResponseSchema,
  EquipmentResponseSchema,
  SystemScopeResponseSchema,
  TopologyResponseSchema,
  WorkspaceFrameResponseSchema,
  ZonesResponseSchema,
} from '@sovitech/view-model/browser';
import { fixtureBytes, signIn, startTestApi, upload, type Auth, type TestApi } from '../guardrails/_support/api';
import { newOwnerProject, serviceOf, testDocumentIn } from '../guardrails/_support/workspace-store';

const LONG = { timeout: 120_000 };
const READS = ['workspace', 'workspace/documents', 'workspace/system-scope', 'workspace/equipment', 'workspace/zones', 'workspace/topology'] as const;

let api: TestApi;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

function get(projectId: string, path: string, headers: Record<string, string> = { ...owner }) {
  return api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers });
}

describe('ADR 0044 · F-RENDER-06: the workspace routes\' sessions, project boundary, refusals and CSRF', LONG, () => {
  it('ADR 0044 · rule 13 · G13-5: no session is 401; another project is 404; a bad query is 400; a write without the CSRF token is 403; a member who is no owner may not write', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'routes boundary');
    const stranger = await signIn(api, await createTestAccount(api.database, { label: 'routes stranger', kind: 'person', roles: ['owner'] }));
    for (const path of READS) {
      expect((await get(projectId, path, {})).statusCode, path).toBe(401);
      expect((await get(projectId, path, { ...stranger })).statusCode, path).toBe(404);
      const own = await get(projectId, path);
      expect(own.statusCode, `${path}: ${own.body}`).toBe(200);
    }
    for (const bad of ['workspace/equipment?page=0', 'workspace/equipment?level=E1', 'workspace/equipment?zone=not-a-uuid', 'workspace/zones?unknown=1', 'workspace/topology?level=upper']) {
      expect((await get(projectId, bad)).statusCode, bad).toBe(400);
    }
    expect((await get(projectId, 'workspace/equipment/0192f0e4-7e57-7000-8000-000000000001')).statusCode).toBe(404);
    expect((await get(projectId, 'workspace/documents/0192f0e4-7e57-7000-8000-000000000001/delete-effect')).statusCode).toBe(404);
    expect((await get(projectId, 'workspace/documents/not-an-id/delete-effect')).statusCode).toBe(404);

    const decision = { decisions: [{ field: { subjectId: projectId, fieldKey: 'project.scope.hvac' }, choice: 'include', corrects: [] }], visibleSuggestions: [] };
    const noToken = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/workspace/system-scope/decisions`, headers: { cookie: owner.cookie }, payload: decision });
    expect(noToken.statusCode).toBe(403);
    expect((noToken.json() as { code: string }).code).toBe('csrf_invalid');
    const concernNoToken = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/concern-many`, headers: { cookie: owner.cookie }, payload: { candidateIds: ['0192f0e4-7e57-7000-8000-000000000001'] } });
    expect(concernNoToken.statusCode).toBe(403);
    const badBody = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/workspace/system-scope/decisions`, headers: { ...owner }, payload: { decisions: [{ field: { subjectId: projectId, fieldKey: 'project.scope.hvac' }, choice: 'maybe', corrects: [] }], visibleSuggestions: [] } });
    expect(badBody.statusCode).toBe(400);
    const notScope = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/workspace/system-scope/decisions`, headers: { ...owner }, payload: { decisions: [{ field: { subjectId: projectId, fieldKey: 'project.goal.reduce_energy' }, choice: 'include', corrects: [] }], visibleSuggestions: [] } });
    expect(notScope.statusCode).toBe(422);
    expect((notScope.json() as { code: string }).code).toBe('answer_invalid');
    const foreignCandidate = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/concern-many`, headers: { ...owner }, payload: { candidateIds: ['0192f0e4-7e57-7000-8000-000000000001'] } });
    expect(foreignCandidate.statusCode).toBe(404);
    // A member who is no owner of the project (an engineer) may read, never decide the owner's scope.
    const engineerId = await createTestAccount(api.database, { label: 'routes engineer', kind: 'person', roles: ['sovitech_engineer'] });
    const { addProjectMember } = await import('@sovitech/db');
    await addProjectMember(api.database.operator.db, { projectId, userId: engineerId });
    const engineer = await signIn(api, engineerId);
    expect((await get(projectId, 'workspace/system-scope', { ...engineer })).statusCode).toBe(200);
    const refused = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/workspace/system-scope/decisions`, headers: { ...engineer }, payload: decision });
    expect(refused.statusCode).toBe(403);
    expect((refused.json() as { code: string }).code).toBe('owner_only');
  });
});

describe('DB-15 · R-016: Documents on an uploaded fixture', LONG, () => {
  it('US-DOCS-12 · R-016 · G1-26 · G12-5: the row names the file, its format, when it was added, its status, its Category Unknown with no chip; the footer says it is still being read', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'documents');
    const uploaded = await upload(api, owner, projectId, 'TEST memoriu tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'));
    expect(uploaded.status).toBe(201);
    const documentId = uploaded.body.documentId ?? '';
    const listed = DocumentsResponseSchema.parse((await get(projectId, 'workspace/documents')).json());
    expect(listed.view.state).toBe('listed');
    const [row] = listed.view.rows;
    expect(row).toMatchObject({ documentId, format: 'pdf', category: null, downloadable: true, revisionOf: null });
    const byId = new Map(listed.displayObjects.map((display) => [display.valueId, display]));
    expect(byId.get(row?.fileName ?? '')?.text).toBe('TEST memoriu tehnic.pdf');
    expect(byId.get(row?.categoryValue ?? '')).toMatchObject({ text: 'Unknown', missing: 'unknown', badge: { id: 'unknown' } });
    expect(byId.get(row?.stage ?? '')?.text).toBe('Unknown');
    expect(row?.status.kind).toBe('progress');
    expect(Number.isNaN(Date.parse(row?.addedAt ?? ''))).toBe(false);
    // Nobody reads it in this test: rule 7's line, the same id in the footer and on Documents.
    expect(byId.get(listed.view.stillReading ?? '')?.text).toBe('Still reading 1 file. Your estimate will update when it finishes.');
    const frame = WorkspaceFrameResponseSchema.parse((await get(projectId, 'workspace')).json());
    expect(frame.view.footer.stillReading).toBe(listed.view.stillReading);
    expect(frame.view.pages).toEqual(['proposal', 'system_scope', 'topology', 'zones', 'equipment', 'documents', 'reports', 'financial_overview', 'capex', 'opex', 'payback', 'lifecycle']);
    expect(frame.project.demoLine).toBeNull();
  });
});

describe('DB-17 · R-065 · R-066: Equipment over the asset register', LONG, () => {
  it('US-ASSETS-01 · US-ASSETS-05 · G4-17 · R-017: one row per tag, never an untagged appearance; 50 rows a page with previous and next; search by tag; the asset detail with its evidence; type Unknown under the closed taxonomy gate', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'equipment');
    const serviceId = await serviceOf(api, projectId, 'equipment');
    const list = await testDocumentIn(api, { projectId, serviceId, label: 'equipment list', fileName: 'TEST lista echipamente.pdf', pages: ['TEST lista'] });
    await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      for (let index = 1; index <= 52; index += 1) {
        const tag = `TEST-VCV-${String(index).padStart(2, '0')}`;
        await recordAssetAppearance(request, { tagAsWritten: tag, evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST lista', check: 'text_match' }], createdBy: serviceId });
      }
      // The same tag again (one asset, two pieces of evidence) and an untagged appearance (never an asset).
      await recordAssetAppearance(request, { tagAsWritten: 'test-vcv-01', evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST lista', check: 'text_match' }], createdBy: serviceId });
      await recordAssetAppearance(request, { evidence: [{ documentId: list.id, contentHash: list.contentHash, locator: { page: 1 }, excerpt: 'TEST lista', check: 'text_match' }], createdBy: serviceId });
    });
    const first = EquipmentResponseSchema.parse((await get(projectId, 'workspace/equipment')).json());
    expect(first.view.state).toBe('listed');
    expect(first.view.rows).toHaveLength(50);
    expect(first.view.page).toEqual({ hasPrevious: false, hasNext: true });
    const second = EquipmentResponseSchema.parse((await get(projectId, 'workspace/equipment?page=2')).json());
    expect(second.view.rows).toHaveLength(2);
    expect(second.view.page).toEqual({ hasPrevious: true, hasNext: false });
    const byId = new Map(first.displayObjects.map((display) => [display.valueId, display]));
    expect(byId.get(first.view.total)?.text).toBe('Not available yet: SOVITECH asset taxonomy');
    const [row] = first.view.rows;
    expect(byId.get(row?.tag ?? '')).toMatchObject({ badge: { id: 'from_document' } });
    expect(byId.get(row?.tag ?? '')?.sourceLine?.text).toBe('Found in TEST lista echipamente.pdf, page 1');
    for (const cell of ['type', 'system', 'location', 'level', 'zone'] as const) expect(byId.get(row?.[cell] ?? '')?.text, cell).toBe('Unknown');
    expect(first.view.filters.badges).toEqual(['unknown']);

    const found = EquipmentResponseSchema.parse((await get(projectId, 'workspace/equipment?search=vcv-52')).json());
    expect(found.view.rows).toHaveLength(1);
    expect(found.displayObjects.find((display) => display.valueId === found.view.rows[0]?.tag)?.text).toBe('TEST-VCV-52');
    // A filter on a value no asset states matches nothing (never a guess).
    expect(EquipmentResponseSchema.parse((await get(projectId, 'workspace/equipment?system=hvac')).json()).view.rows).toEqual([]);

    const detail = AssetResponseSchema.parse((await get(projectId, `workspace/equipment/${row?.assetId ?? ''}`)).json());
    expect(detail.view.evidence.length).toBeGreaterThan(0);
    expect(detail.displayObjects.find((display) => display.valueId === detail.view.points)?.text).toBe('Not available yet: SOVITECH point templates');
    expect(detail.view.history).toEqual([]);
    expect(detail.view.documents.map((document) => document.documentId)).toEqual([list.id]);
  });
});

describe('DB-16 · DB-20 · DB-08: System Scope, Zones and Topology of a new project', LONG, () => {
  it('R-052 · R-061 · R-071 · G12-10 · G7-15 · G7-14: eight systems, Not provided yet; no zone, said truthfully; no group, with the action to choose the systems; floors "Not available yet"', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'scope zones topology');
    const scope = SystemScopeResponseSchema.parse((await get(projectId, 'workspace/system-scope')).json());
    expect(scope.view.systems.map((row) => row.systemId)).toEqual(['hvac', 'lighting', 'energy', 'access_control', 'fire_safety', 'water', 'elevators', 'cctv']);
    const byId = new Map(scope.displayObjects.map((display) => [display.valueId, display]));
    for (const row of scope.view.systems) {
      expect(byId.get(row.decision)?.badge?.id, row.systemId).toBe('not_provided_yet');
      expect(row.included).toBe(false);
      expect(row.suggestion).toBeNull();
    }
    const zones = ZonesResponseSchema.parse((await get(projectId, 'workspace/zones')).json());
    expect(zones.view).toMatchObject({ state: 'no_documents', rows: [], details: [] });
    expect(zones.view.levels.state).toBe('unknown');
    const topology = TopologyResponseSchema.parse((await get(projectId, 'workspace/topology')).json());
    expect(topology.view.groups).toEqual([]);
    expect(topology.view.noDecision?.actions).toEqual(['choose_systems']);

    const decided = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/workspace/system-scope/decisions`,
      headers: { ...owner },
      payload: { decisions: [{ field: { subjectId: projectId, fieldKey: 'project.scope.fire_safety' }, choice: 'include', corrects: [] }], visibleSuggestions: [] },
    });
    expect(decided.statusCode, decided.body).toBe(200);
    // The owner's own opt-in of a life-safety system: monitoring only on Topology (rule 11; G11-11).
    const after = TopologyResponseSchema.parse((await get(projectId, 'workspace/topology')).json());
    expect(after.view.groups.map((group) => [group.systemId, group.monitoringOnly])).toEqual([['fire_safety', true]]);
    expect(after.view.noDecision).toBeNull();
  });
});

describe('G2-7 · F-VALUE-14: one value id, one display, on every served screen', LONG, () => {
  it('US-REVIEW-14 · US-SCOPE-05 · US-TOPO-01 · G2-7: the card\'s area and project type, a scope decision and a system\'s equipment line are served identically by the workspace and the wizard', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G2-7 served');
    const area = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/edit`, headers: { ...owner }, payload: { field: { subjectId: buildingId, fieldKey: 'building.grossFloorArea' }, value: { kind: 'quantity', raw: '2345', qualifier: 'gross_total' }, corrects: [] } });
    expect(area.statusCode, area.body).toBe(200);
    const decided = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/workspace/system-scope/decisions`, headers: { ...owner }, payload: { decisions: [{ field: { subjectId: projectId, fieldKey: 'project.scope.hvac' }, choice: 'include', corrects: [] }], visibleSuggestions: [] } });
    expect(decided.statusCode, decided.body).toBe(200);
    const shown = (displays: readonly DisplayObject[], id: string): unknown => {
      const display = displays.find((entry) => entry.valueId === id);
      if (display === undefined) throw new Error(`no display ${id}`);
      return { ...display, actions: undefined, served: servedDisplayOf({ ...display, actions: [] }) };
    };
    const frame = WorkspaceFrameResponseSchema.parse((await get(projectId, 'workspace')).json()).displayObjects;
    const step3 = StepResponseSchema.parse((await get(projectId, 'steps/3')).json()).displayObjects;
    const step4 = StepResponseSchema.parse((await get(projectId, 'steps/4')).json()).displayObjects;
    const step8 = StepResponseSchema.parse((await get(projectId, 'steps/8')).json()).displayObjects;
    const scope = SystemScopeResponseSchema.parse((await get(projectId, 'workspace/system-scope?level=upper_1')).json());
    const topology = TopologyResponseSchema.parse((await get(projectId, 'workspace/topology?level=upper_1')).json());
    const areaId = `building:${buildingId}.grossFloorArea`;
    expect(shown(frame, areaId)).toEqual(shown(step3, areaId));
    expect(shown(frame, areaId)).toEqual(shown(step8, areaId));
    const typeId = `project:${projectId}.type`;
    expect(shown(frame, typeId)).toEqual(shown(step8, typeId));
    const hvac = `project:${projectId}.scope.hvac`;
    for (const other of [step4, step8, topology.displayObjects]) expect(shown(scope.displayObjects, hvac)).toEqual(shown(other, hvac));
    const row = scope.view.systems.find((entry) => entry.systemId === 'hvac');
    expect(topology.view.groups[0]?.equipment).toBe(row?.equipment);
    expect(shown(scope.displayObjects, row?.equipment ?? '')).toEqual(shown(topology.displayObjects, row?.equipment ?? ''));
  });
});
