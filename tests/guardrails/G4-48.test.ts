/**
 * G4-48 (new in phase 7 part B, from the read-only adversarial review's finding A-1; guardrails section 8, "The app logs
 * every enforcement as an event: ... `conflict_raised`"; rule 4, "Documents that disagree" and "Routing"; section 4, the
 * Speed Rule's item 6, "Disagreement becomes a conflict (rule 4)"; PRD R-142, US-ADMIN-20 AC1: "Given any enforcement,
 * when it happens, then one guardrail event of its type is logged").
 * Situation: two documents disagree on a field.
 * Expected: one `conflict_raised` event is logged for that field, however often the project is read afterwards, and the
 * admin's guardrail event review counts it.
 *
 * Over a TEST database, three halves:
 * - the one ingestion path (`apps/api/src/ingestion/proposals.ts`): two TEST documents' room counts on the building,
 *   stored one after the other in the extraction account's request; the second opens the conflict (an engineer field,
 *   routed to the engineer), and the event is logged then, before anyone reads the project;
 * - the read path: two TEST documents' building types (an owner field, routed to the owner) stored through the store's
 *   one writer outside the ingestion path, so the wizard's read of the project's state is the first to derive the
 *   conflict and logs it; reading step 5, step 3, the extracted values and the workspace again logs nothing more;
 * - a resolution: the owner resolves that conflict, a third TEST document disagrees with the chosen value, and the
 *   conflict that opens again is a new one, logged once more.
 * The admin's UD-41 count of `conflict_raised` for each project reads the store's count. Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureBuildingSubject, withRequest } from '@sovitech/db';
import { FIELD, productionRegistry, registryLookups } from '@sovitech/registry';
import { AdminGuardrailEventsResponseSchema } from '@sovitech/view-model/browser';
import { ingestProposals } from '../../apps/api/src/ingestion/proposals';
import { adminGet, adminOf } from './_support/admin';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { documentValue, newOwnerProject, productionFieldOf, serviceOf, testDocumentIn } from './_support/workspace-store';

const lookups = registryLookups(productionRegistry);
const LONG = { timeout: 180_000 };

let api: TestApi;
let owner: Auth;
let admin: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
  ({ admin } = await adminOf(api, 'G4-48'));
}, 240_000);

afterAll(async () => {
  await api.stop();
});

interface Logged {
  readonly subject_id: string | null;
  readonly field_key: string | null;
  readonly reason: string | null;
}

function conflictsLogged(projectId: string): Promise<readonly Logged[]> {
  return api.database.asAdministrator<Logged>(`SELECT subject_id, field_key, reason FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'conflict_raised' ORDER BY at, id`, [projectId]);
}

async function read(projectId: string, path: string): Promise<unknown> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers: { ...owner } });
  expect(response.statusCode, `${path}: ${response.body}`).toBe(200);
  return response.json();
}

/** The admin's UD-41 count of conflict_raised for one project, as served. */
async function adminCount(projectId: string): Promise<string | undefined> {
  const response = await adminGet(api, admin, 'guardrail-events');
  expect(response.statusCode, response.body).toBe(200);
  const { displayObjects } = AdminGuardrailEventsResponseSchema.parse(response.json());
  return displayObjects.find((display) => display.valueId === `guardrail_count:${projectId}.conflict_raised`)?.text;
}

/** A room count on the building from one TEST document, through the one ingestion path. */
async function ingestRooms(projectId: string, serviceId: string, buildingId: string, label: string, rooms: number) {
  const excerpt = `TEST ${String(rooms)} spatii, inclusiv incaperi tehnice`;
  const document = await testDocumentIn(api, { projectId, serviceId, label, fileName: `TEST ${label}.pdf`, pages: [excerpt] });
  return withRequest(api.database.app, { userId: serviceId, projectId }, async (request) => {
    await ensureBuildingSubject(request, serviceId);
    return ingestProposals(request, {
      projectId,
      serviceId,
      field: lookups.field,
      proposals: [
        {
          proposal: {
            subjectId: buildingId,
            fieldKey: FIELD.rooms,
            quantity: { value: rooms, unit: 'count', qualifier: 'all_spaces' },
            source: 'document',
            evidence: [{ documentId: document.id, contentHash: document.contentHash, locator: { page: 1 }, excerpt }],
            original: { text: `${String(rooms)} spatii`, locale: 'ro-RO' },
          },
        },
      ],
    });
  });
}

/** A building type from one TEST document, stored through the store's one writer (not the ingestion path). */
async function storedType(projectId: string, serviceId: string, buildingId: string, label: string, choice: string): Promise<string> {
  const page = `TEST ${label} Destinatia cladirii: ${choice}`;
  const document = await testDocumentIn(api, { projectId, serviceId, label, fileName: `TEST ${label}.pdf`, pages: [page] });
  return documentValue(api, { projectId, serviceId, subjectId: buildingId, field: productionFieldOf(FIELD.buildingType), value: { choice }, from: [{ document, page: 1, excerpt: page }] });
}

describe('G4-48 · section 8 · rule 4: a conflict raised is logged once', LONG, () => {
  it('G4-48 (the ingestion path): the second document that disagrees opens the conflict, and one conflict_raised is logged then, routed to the engineer, before any read', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-48 rooms');
    const serviceId = await serviceOf(api, projectId, 'G4-48 rooms');

    expect((await ingestRooms(projectId, serviceId, buildingId, 'G4-48 schedule A', 424)).map((outcome) => outcome.outcome)).toEqual(['stored']);
    expect(await conflictsLogged(projectId), 'one value: no conflict').toEqual([]);

    expect((await ingestRooms(projectId, serviceId, buildingId, 'G4-48 schedule B', 430)).map((outcome) => outcome.outcome)).toEqual(['stored']);
    const logged = [{ subject_id: buildingId, field_key: FIELD.rooms, reason: 'routed_to_engineer' }];
    expect(await conflictsLogged(projectId), 'logged when the conflict is stored').toEqual(logged);

    for (const path of ['steps/5', 'steps/5', 'extracted', 'workspace', 'workspace/system-scope']) await read(projectId, path);
    expect(await conflictsLogged(projectId), 'reading the project again logs nothing more').toEqual(logged);
    expect(await adminCount(projectId)).toBe('1');
  });

  it('G4-48 (the read path): a conflict that reached the store another way is logged on the first read of the project, once, routed to the owner', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-48 type');
    const serviceId = await serviceOf(api, projectId, 'G4-48 type');
    await storedType(projectId, serviceId, buildingId, 'G4-48 memo A', 'hotel');
    await storedType(projectId, serviceId, buildingId, 'G4-48 memo B', 'office');
    expect(await conflictsLogged(projectId), 'nothing has derived the conflict yet').toEqual([]);

    for (const path of ['steps/5', 'steps/5', 'steps/3', 'extracted', 'workspace']) await read(projectId, path);
    expect(await conflictsLogged(projectId)).toEqual([{ subject_id: buildingId, field_key: FIELD.buildingType, reason: 'routed_to_owner' }]);
    expect(await adminCount(projectId)).toBe('1');
  });

  it('G4-48 (a resolution): after the owner resolves the conflict, a later document that disagrees opens a new one, logged once more', async () => {
    const { projectId, buildingId } = await newOwnerProject(api, owner, 'G4-48 resolved');
    const serviceId = await serviceOf(api, projectId, 'G4-48 resolved');
    const hotel = await storedType(projectId, serviceId, buildingId, 'G4-48 memo C', 'hotel');
    await storedType(projectId, serviceId, buildingId, 'G4-48 memo D', 'office');
    await read(projectId, 'steps/5');
    expect(await conflictsLogged(projectId)).toHaveLength(1);

    const resolved = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/fields/resolve-conflict`,
      headers: { ...owner },
      payload: { field: { subjectId: buildingId, fieldKey: FIELD.buildingType }, chosenCandidateId: hotel },
    });
    expect(resolved.statusCode, resolved.body).toBe(200);
    await read(projectId, 'steps/5');
    expect(await conflictsLogged(projectId), 'resolved: nothing new').toHaveLength(1);

    await storedType(projectId, serviceId, buildingId, 'G4-48 memo E', 'office');
    await read(projectId, 'steps/5');
    await read(projectId, 'steps/5');
    expect(await conflictsLogged(projectId), 'the new conflict, once').toEqual([
      { subject_id: buildingId, field_key: FIELD.buildingType, reason: 'routed_to_owner' },
      { subject_id: buildingId, field_key: FIELD.buildingType, reason: 'routed_to_owner' },
    ]);
    expect(await adminCount(projectId)).toBe('2');
  });
});
