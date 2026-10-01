/**
 * G4-36 (new in phase 3 part B, for the integrator to index; rule 4, "A correction is a resolution, not a
 * conflict": "When the owner changes a value on a screen that showed them the other value and its source: the
 * shown candidate gets a `rejected` event by the owner, and the owner's value becomes active", and "A conflict is
 * put to someone only when values arrive without that person having seen both"; rule 4, "Routing": the owner
 * sees "Documents disagree on this. A SOVITECH engineer will check it." on a conflict of documents).
 * Situation: the owner answers a field from a stale screen: the answer names no value (`corrects` empty) while
 * the field shows the owner's own earlier answer (a second tab, a page left open), on the fields/edit route and
 * on Continue.
 * Expected: refused 409 `shown_value_changed`; nothing is stored; the field is not in conflict; and no display on
 * a project with no documents carries "Documents disagree on this".
 *
 * Over a TEST database, through the API (the contract's fields.edit and steps.continue). The resolver half: two
 * owner entries that disagree on an engineer field (written straight through the store in the owner's own
 * request, since the API now refuses the second) read Two values with no line about documents; with a document
 * value in the conflict, the rule 4 line is back. Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertCandidate, newId, withRequest } from '@sovitech/db';
import { productionRegistry } from '@sovitech/registry';
import { StepResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let ownerId: string;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function newProject(label: string): Promise<{ readonly projectId: string; readonly buildingId: string }> {
  const created = await api.app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { ...owner },
    payload: { name: `TEST G4-36 ${label}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G4-36' },
  });
  expect(created.statusCode, created.body).toBe(201);
  const { projectId } = created.json() as { projectId: string };
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  return { projectId, buildingId: building.id };
}

function post(projectId: string, path: string, payload: Record<string, unknown>) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/${path}`, headers: { ...owner }, payload });
}

async function candidatesOf(subjectId: string, fieldKey: string): Promise<readonly unknown[]> {
  return api.database.asAdministrator('SELECT id FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2', [subjectId, fieldKey]);
}

async function displaysOf(projectId: string, step: number): Promise<readonly DisplayObject[]> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(step)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json()).displayObjects;
}

const DOCUMENTS_DISAGREE = 'Documents disagree on this';

describe('G4-36 · rule 4: an owner answer from a stale screen', { timeout: 60_000 }, () => {
  it('G4-36 · fields/edit: a second area with `corrects` empty while the first is shown is refused 409; nothing is stored; no conflict', async () => {
    const { projectId, buildingId } = await newProject('edit');
    const area = { subjectId: buildingId, fieldKey: 'building.grossFloorArea' };
    const first = await post(projectId, 'fields/edit', { field: area, value: { kind: 'quantity', raw: '1200', qualifier: 'gross_total' }, corrects: [] });
    expect(first.statusCode, first.body).toBe(200);
    const stale = await post(projectId, 'fields/edit', { field: area, value: { kind: 'quantity', raw: '1300', qualifier: 'gross_total' }, corrects: [] });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toEqual({ code: 'shown_value_changed' });
    expect(await candidatesOf(buildingId, area.fieldKey)).toHaveLength(1);
    const shown = (await displaysOf(projectId, 3)).find((display) => display.valueId === `building:${buildingId}.grossFloorArea`);
    expect(shown?.badge?.id).toBe('provided_by_you');
    expect(shown?.text).toBe('1,200 m²');
    // The same answer from the fresh screen, naming the value it showed, is the owner's correction (G4-5's rule).
    const [firstId] = (await api.database.asAdministrator<{ id: string }>('SELECT id FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2', [buildingId, area.fieldKey])).map((row) => row.id);
    const fresh = await post(projectId, 'fields/edit', { field: area, value: { kind: 'quantity', raw: '1300', qualifier: 'gross_total' }, corrects: [firstId] });
    expect(fresh.statusCode, fresh.body).toBe(200);
    const corrected = (await displaysOf(projectId, 3)).find((display) => display.valueId === `building:${buildingId}.grossFloorArea`);
    expect(corrected?.text).toBe('1,300 m²');
    expect(corrected?.badge?.id).toBe('provided_by_you');
  });

  it('G4-36 · steps/5/continue: a second building type with `corrects` empty while the first is shown is refused 409; nothing is stored; no conflict', async () => {
    const { projectId, buildingId } = await newProject('continue');
    const type = { subjectId: buildingId, fieldKey: 'building.type' };
    const body = (choice: string) => ({ answers: [{ field: type, value: { kind: 'choice', choice }, corrects: [] }], multi: [], visibleSuggestions: [], shown: { questions: ['q.building.type'], confirmations: [] } });
    const first = await post(projectId, 'steps/5/continue', body('hotel'));
    expect(first.statusCode, first.body).toBe(200);
    const stale = await post(projectId, 'steps/5/continue', body('office'));
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toEqual({ code: 'shown_value_changed' });
    expect(await candidatesOf(buildingId, type.fieldKey)).toHaveLength(1);
    const shown = (await displaysOf(projectId, 5)).find((display) => display.valueId === `building:${buildingId}.type`);
    expect(shown?.text).toBe('Hotel');
    expect(shown?.badge?.id).toBe('provided_by_you');
    // The unchanged answer from the stale screen writes nothing and is not refused (US-SCOPE-02 AC9).
    const same = await post(projectId, 'steps/5/continue', body('hotel'));
    expect(same.statusCode, same.body).toBe(200);
    expect(await candidatesOf(buildingId, type.fieldKey)).toHaveLength(1);
  });

  it('G4-36 · rule 4 "Routing": on a project with no documents, no display carries "Documents disagree on this", even over two owner entries in conflict', async () => {
    const { projectId, buildingId } = await newProject('resolver');
    const field = productionRegistry.fields.find((entry) => entry.key === 'building.grossFloorArea');
    if (field === undefined) throw new Error('no gross floor area field');
    // Two owner entries that disagree, written in the owner's own request as the API wrote them before this case's fix.
    await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => {
      for (const value of [1200, 1300]) {
        const written = await insertCandidate(request, { id: newId(), subjectId: buildingId, fieldKey: field.key, quantity: { value, unit: 'm2', qualifier: 'gross_total' }, source: 'user', evidence: [], createdBy: ownerId }, field);
        expect(written.outcome).toBe('stored');
      }
    });
    for (const step of [3, 8]) {
      const displays = await displaysOf(projectId, step);
      const area = displays.find((display) => display.valueId === `building:${buildingId}.grossFloorArea`);
      expect(area?.badge?.id, `step ${String(step)}`).toBe('two_values');
      for (const display of displays) {
        const words = [display.text, ...(display.lines ?? []).map((line) => line.text)].join(' ');
        expect(words.includes(DOCUMENTS_DISAGREE), `${display.valueId} on step ${String(step)}`).toBe(false);
      }
    }
  });
});
