/**
 * The workspace's registers over a TEST database with a TEST registry, through the API's registry seam (phase 4;
 * docs/adr/0044 decision 4, 0045 decision 1: no asset, zone or level field is in the production registry, so the pages
 * are proven with TEST fields handed to the API, never through the gate-opening test utilities):
 * - Equipment's filters match only what an asset's own stored value says (R-066); System Scope's detail panel lists the
 *   levels and zones its equipment's stored values name (R-056: a system's floor-level equipment is reached through it);
 * - Zones list a zone subject with its registered fields; the zone editor (UD-09) is `fields.edit` on a zone's field,
 *   in the owner's name (rule 4: the shown value rejected, G4-5); an asset's field takes no Edit (every asset is treated
 *   as possibly life-safety: prompt 3 5.2; ADR 0045 decision 5);
 * - "Looks right" on an asset's value (`fields.acknowledge`) and "Something's wrong" on a selection (`fields.concernMany`)
 *   record the owner's acknowledgement and rejections, once (G3-3, G3-10), never verification;
 * - G11-10 (the API half): with TEST detections naming Fire Safety and HVAC, System Scope suggests HVAC only, and "Save
 *   and Continue" reporting a Suggested Fire Safety stores nothing for it.
 * Every account, document and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSubject, recordAssetAppearance, withRequest } from '@sovitech/db';
import { SYSTEMS, scopeFieldKey } from '@sovitech/registry';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { AssetResponseSchema, EquipmentResponseSchema, FieldWriteResponseSchema, SystemScopeResponseSchema, ZonesResponseSchema } from '@sovitech/view-model/browser';
import { scopeSuggestionRule } from '@sovitech/view-model/server';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { registryField } from '../guardrails/_support/view-model';
import { documentValue, newOwnerProject, serviceOf, testDocumentIn, testRegistry } from '../guardrails/_support/workspace-store';

const LONG = { timeout: 120_000 };
const detectionKey = (system: string): string => `building.testDetection.${system}`;

const FIELDS: readonly RegistryFieldDefinition[] = [
  registryField('asset.system', { kind: 'enum', subject: 'asset', options: SYSTEMS.map((system) => system.id), confirmBy: 'engineer' }),
  registryField('asset.level', { kind: 'text', subject: 'asset', confirmBy: 'engineer' }),
  registryField('asset.zone', { kind: 'text', subject: 'asset', confirmBy: 'engineer' }),
  registryField('zone.name', { kind: 'text', subject: 'zone', confirmBy: 'engineer' }),
  registryField('zone.level', { kind: 'text', subject: 'zone', confirmBy: 'engineer' }),
  registryField(detectionKey('fire_safety'), { kind: 'enum', subject: 'building', options: ['present'], confirmBy: 'owner' }),
  registryField(detectionKey('hvac'), { kind: 'enum', subject: 'building', options: ['present'], confirmBy: 'owner' }),
];
const field = (key: string): RegistryFieldDefinition => {
  const found = FIELDS.find((entry) => entry.key === key);
  if (found === undefined) throw new Error(`no TEST field ${key}`);
  return found;
};

let api: TestApi;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true, registry: testRegistry({ fields: FIELDS, suggestionRules: [scopeSuggestionRule(detectionKey, () => 'TEST schema.pdf')] }) });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

function get(projectId: string, path: string) {
  return api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers: { ...owner } });
}

function post(projectId: string, path: string, payload: Record<string, unknown>) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/${path}`, headers: { ...owner }, payload });
}

describe('R-060 · R-065 · R-066 · UD-09: the registers over TEST asset and zone fields', LONG, () => {
  it('R-066 · R-056 · R-061 · UD-09 · G3-3 · G3-10 · G4-5: filters, the detail panel\'s levels and zones, the zone editor, no Edit on an asset, "Looks right" and "Something\'s wrong" on a selection', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'test registry registers');
    const serviceId = await serviceOf(api, projectId, 'test registry');
    const schedule = await testDocumentIn(api, { projectId, serviceId, label: 'registers schedule', fileName: 'TEST schedule.pdf', pages: ['TEST CTA-01 hvac upper_1 zone', 'TEST Zona 1'] });
    const { zoneId, assetId } = await withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
      const zone = await createSubject(request, { kind: 'zone', createdBy: serviceId });
      const appearance = await recordAssetAppearance(request, { tagAsWritten: 'TEST-CTA-01', evidence: [{ documentId: schedule.id, contentHash: schedule.contentHash, locator: { page: 1 }, excerpt: 'TEST CTA-01 hvac upper_1 zone', check: 'text_match' }], createdBy: serviceId });
      return { zoneId: zone.id, assetId: appearance.assetId ?? '' };
    });
    const at = (page: number, excerpt: string) => [{ document: schedule, page, excerpt }];
    const systemId = await documentValue(api, { projectId, serviceId, subjectId: assetId, field: field('asset.system'), value: { choice: 'hvac' }, from: at(1, 'TEST CTA-01 hvac upper_1 zone') });
    const levelId = await documentValue(api, { projectId, serviceId, subjectId: assetId, field: field('asset.level'), value: { text: 'upper_1' }, from: at(1, 'TEST CTA-01 hvac upper_1 zone') });
    const zoneValueId = await documentValue(api, { projectId, serviceId, subjectId: assetId, field: field('asset.zone'), value: { text: zoneId }, from: at(1, 'TEST CTA-01 hvac upper_1 zone') });
    const nameId = await documentValue(api, { projectId, serviceId, subjectId: zoneId, field: field('zone.name'), value: { text: 'TEST Zona 1' }, from: at(2, 'TEST Zona 1') });
    const floors = await post(projectId, 'fields/edit', { field: { subjectId: buildingId, fieldKey: 'building.floors' }, value: { kind: 'quantity', raw: '1', qualifier: 'upper' }, corrects: [] });
    expect(floors.statusCode, floors.body).toBe(200);

    // Filters match only what the asset's own values say.
    for (const [query, rows] of [
      ['system=hvac', 1],
      ['system=lighting', 0],
      ['level=upper_1', 1],
      [`zone=${zoneId}`, 1],
      ['badge=unknown', 1],
    ] as const) {
      const listed = EquipmentResponseSchema.parse((await get(projectId, `workspace/equipment?${query}`)).json());
      expect(listed.view.rows.length, query).toBe(rows);
      expect(listed.view.filters.active, query).toEqual(Object.fromEntries([query.split('=')]));
    }
    const listed = EquipmentResponseSchema.parse((await get(projectId, 'workspace/equipment')).json());
    expect(listed.view.filters.zones.map((zone) => zone.zoneId)).toEqual([zoneId]);
    const row = listed.view.rows[0];
    const byId = new Map(listed.displayObjects.map((display) => [display.valueId, display]));
    expect(byId.get(row?.system ?? '')).toMatchObject({ badge: { id: 'sovitech_will_check' } });
    expect(byId.get(row?.type ?? '')?.text).toBe('Unknown');
    expect((byId.get(row?.system ?? '')?.actions ?? []).map((action) => action.kind).sort()).toEqual(['acknowledge', 'concern']);
    // V-1 · A-12 · G8-24 (the API half): the Floor cell names the level by the register's label, the Zone cell the zone by
    // its name; badge, source line and the owner's actions kept; never the stored key or the zone's id.
    expect(byId.get(row?.level ?? '')).toMatchObject({ valueId: `asset:${assetId}.level`, text: 'E1', badge: { id: 'sovitech_will_check' }, sourceLine: { text: 'Found in TEST schedule.pdf, page 1' } });
    expect(byId.get(row?.zone ?? '')).toMatchObject({ valueId: `asset:${assetId}.zone`, text: 'TEST Zona 1' });
    expect((byId.get(row?.level ?? '')?.actions ?? []).map((action) => action.kind).sort()).toEqual(['acknowledge', 'concern']);
    for (const display of listed.displayObjects) expect(display.text, display.valueId).not.toMatch(new RegExp(`upper_1|${zoneId}`, 'u'));
    const record = AssetResponseSchema.parse((await get(projectId, `workspace/equipment/${assetId}`)).json());
    const recordIds = new Map(record.displayObjects.map((display) => [display.valueId, display]));
    expect(recordIds.get(`asset:${assetId}.level`)).toEqual(byId.get(row?.level ?? ''));
    expect(recordIds.get(`asset:${assetId}.zone`)?.text).toBe('TEST Zona 1');

    // System Scope's detail panel: the levels and zones HVAC's equipment names.
    const scope = SystemScopeResponseSchema.parse((await get(projectId, 'workspace/system-scope')).json());
    const hvac = scope.view.systems.find((entry) => entry.systemId === 'hvac');
    const scopeIds = new Map(scope.displayObjects.map((display) => [display.valueId, display]));
    expect(scopeIds.get(hvac?.levels ?? '')?.text).toBe('E1');
    expect(scopeIds.get(hvac?.zones ?? '')?.text).toBe('TEST Zona 1');
    expect(scopeIds.get(scope.view.systems.find((entry) => entry.systemId === 'lighting')?.levels ?? '')?.text).toBe('Unknown');

    // Zones: the zone, its systems, and the zone editor on its name.
    const zones = ZonesResponseSchema.parse((await get(projectId, 'workspace/zones')).json());
    expect(zones.view.state).toBe('listed');
    const zoneIds = new Map(zones.displayObjects.map((display) => [display.valueId, display]));
    const [zoneRow] = zones.view.rows;
    expect(zoneIds.get(zoneRow?.name ?? '')?.text).toBe('TEST Zona 1');
    expect(zoneIds.get(zoneRow?.systems ?? '')?.text).toBe('HVAC');
    // V-6: each chip carries the decision, the catalogue system and its life-safety flag; V-9: six fields, the description last.
    expect(zones.view.details[0]?.systemDecisions).toEqual([{ decision: `project:${projectId}.scope.hvac`, systemId: 'hvac', lifeSafety: false }]);
    expect(zones.view.details[0]?.fields).toEqual(['code', 'name', 'level', 'kind', 'area', 'description'].map((path) => `zone:${zoneId}.${path}`));
    expect(zoneIds.get(`zone:${zoneId}.description`)?.text).toBe('Unknown');
    expect(zones.view.details[0]?.documents.map((document) => document.documentId)).toEqual([schedule.id]);
    const edit = zoneIds.get(zoneRow?.name ?? '')?.actions?.find((action) => action.kind === 'edit');
    expect(edit).toMatchObject({ field: { subjectId: zoneId, fieldKey: 'zone.name' }, shownCandidateIds: [nameId] });
    const corrected = await post(projectId, 'fields/edit', { field: { subjectId: zoneId, fieldKey: 'zone.name' }, value: { kind: 'text', text: 'TEST Zona A' }, corrects: [nameId] });
    expect(corrected.statusCode, corrected.body).toBe(200);
    const answer = FieldWriteResponseSchema.parse(corrected.json()).displayObjects.find((display) => display.valueId === `zone:${zoneId}.name`);
    expect(answer).toMatchObject({ text: 'TEST Zona A', badge: { id: 'provided_by_you' } });
    const [rejected] = await api.database.asAdministrator<{ type: string; role: string }>(`SELECT type, role FROM sovitech.candidate_events WHERE candidate_id = $1 AND type = 'rejected'`, [nameId]);
    expect(rejected).toEqual({ type: 'rejected', role: 'owner' });

    // No Edit on an asset's field: refused, nothing stored.
    const assetEdit = await post(projectId, 'fields/edit', { field: { subjectId: assetId, fieldKey: 'asset.system' }, value: { kind: 'choice', choice: 'lighting' }, corrects: [systemId] });
    expect(assetEdit.statusCode).toBe(400);
    const [systems] = await api.database.asAdministrator<{ n: number }>('SELECT count(*)::integer AS n FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2', [assetId, 'asset.system']);
    expect(systems?.n).toBe(1);

    // "Looks right" on one value; "Something's wrong" on a selection, twice: recorded once each.
    const acknowledged = await post(projectId, 'fields/acknowledge', { candidateIds: [systemId, levelId] });
    expect(acknowledged.statusCode, acknowledged.body).toBe(200);
    // V-1 · G8-24 (the wizard's write answers): fields.acknowledge, fields.concern and fields.edit name the level and the
    // zone as Equipment does, never by the stored key or the zone's id (G2-7: one display per value id).
    const acknowledgedDisplays = FieldWriteResponseSchema.parse(acknowledged.json()).displayObjects;
    expect(acknowledgedDisplays.find((display) => display.valueId === `asset:${assetId}.level`)?.text).toBe('E1');
    for (const display of acknowledgedDisplays) expect(display.text, display.valueId).not.toMatch(new RegExp(`upper_1|${zoneId}`, 'u'));
    for (const round of [1, 2]) {
      const concern = await post(projectId, 'fields/concern-many', { candidateIds: [levelId, zoneValueId] });
      expect(concern.statusCode, `${String(round)}: ${concern.body}`).toBe(200);
      // The answer serves the level and the zone as Equipment does (G8-24; G2-7: one display per value id).
      const answered = FieldWriteResponseSchema.parse(concern.json()).displayObjects;
      for (const display of answered) expect(display.text, display.valueId).not.toMatch(new RegExp(`upper_1|${zoneId}`, 'u'));
    }
    const events = await api.database.asAdministrator<{ candidate_id: string; type: string; role: string }>(
      `SELECT candidate_id, type, role FROM sovitech.candidate_events WHERE candidate_id = ANY($1::uuid[]) ORDER BY type, candidate_id`,
      [[systemId, levelId, zoneValueId]],
    );
    expect(events).toEqual(
      [
        { candidate_id: systemId, type: 'owner_acknowledged', role: 'owner' },
        { candidate_id: levelId, type: 'owner_acknowledged', role: 'owner' },
        { candidate_id: levelId, type: 'rejected', role: 'owner' },
        { candidate_id: zoneValueId, type: 'rejected', role: 'owner' },
      ].sort((a, b) => a.type.localeCompare(b.type) || a.candidate_id.localeCompare(b.candidate_id)),
    );
  });
});

describe('G11-10 · rule 11 (the API half): System Scope never suggests Fire Safety', LONG, () => {
  it('US-SCOPE-06 · R-052 · G11-10: TEST detections name Fire Safety and HVAC: HVAC is Suggested, Fire Safety is not preselected; a reported Suggested Fire Safety stores nothing', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G11-10 API');
    const serviceId = await serviceOf(api, projectId, 'G11-10 API');
    const schematic = await testDocumentIn(api, { projectId, serviceId, label: 'G11-10 schema', fileName: 'TEST schema.pdf', pages: ['TEST present'] });
    for (const system of ['fire_safety', 'hvac']) {
      await documentValue(api, { projectId, serviceId, subjectId: buildingId, field: field(detectionKey(system)), value: { choice: 'present' }, from: [{ document: schematic, page: 1, excerpt: 'TEST present' }] });
    }
    const scope = SystemScopeResponseSchema.parse((await get(projectId, 'workspace/system-scope')).json());
    const byId = new Map(scope.displayObjects.map((display) => [display.valueId, display]));
    const fire = scope.view.systems.find((row) => row.systemId === 'fire_safety');
    expect(fire).toMatchObject({ included: false, suggestion: null, lifeSafety: true });
    expect(byId.get(fire?.decision ?? '')?.badge?.id).toBe('not_provided_yet');
    expect(scope.view.systems.find((row) => row.systemId === 'hvac')?.suggestion?.reason.text).toBe('Suggested because TEST schema.pdf names HVAC');

    const saved = await post(projectId, 'workspace/system-scope/decisions', {
      decisions: [],
      visibleSuggestions: [
        { field: { subjectId: projectId, fieldKey: scopeFieldKey('fire_safety') }, choice: 'include' },
        { field: { subjectId: projectId, fieldKey: scopeFieldKey('hvac') }, choice: 'include' },
      ],
    });
    expect(saved.statusCode, saved.body).toBe(200);
    const [fireRows] = await api.database.asAdministrator<{ n: number }>('SELECT count(*)::integer AS n FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2', [projectId, scopeFieldKey('fire_safety')]);
    expect(fireRows?.n).toBe(0);
    const [hvacRows] = await api.database.asAdministrator<{ n: number }>('SELECT count(*)::integer AS n FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2', [projectId, scopeFieldKey('hvac')]);
    expect(hvacRows?.n).toBe(1);
    expect(api.log.some((record) => record.event === 'suggestion_ignored' && record.projectId === projectId)).toBe(true);
  });
});
