/**
 * G8-22 (new in phase 3 part B, for the integrator to index; rule 8, "Units and meaning must be explicit": "A
 * quantity is stored as a value, a unit and a qualifier", and its dimensions table, "Area, volume, length"; rule
 * 1, "A value exists only if it comes from the project data, a verified document location, reference data, or a
 * permitted calculation").
 * Situation: the owner types "-5" for the gross floor area (the step 8 inline ask, or Edit on step 3).
 * Expected: it is refused (`answer_invalid`), and nothing is stored.
 *
 * Over a TEST database, through the API route both use (the contract's fields.edit). The controls: "0" and a very
 * large value are stored (their plausibility is rule 8's "Please check", D-93, not this refusal). Every value is
 * TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let owner: Auth;
let projectId: string;
let area: { readonly subjectId: string; readonly fieldKey: string };

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
  const created = await api.app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { ...owner },
    payload: { name: 'TEST G8-22 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G8-22' },
  });
  projectId = (created.json() as { projectId: string }).projectId;
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  area = { subjectId: building.id, fieldKey: 'building.grossFloorArea' };
}, 180_000);

afterAll(async () => {
  await api.stop();
});

function answer(raw: string, corrects: readonly string[] = []) {
  return api.app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/fields/edit`,
    headers: { ...owner },
    payload: { field: area, value: { kind: 'quantity', raw, qualifier: 'gross_total' }, corrects: [...corrects] },
  });
}

async function storedAreas(): Promise<readonly { readonly id: string; readonly quantity_value: number }[]> {
  return api.database.asAdministrator<{ id: string; quantity_value: number }>(
    `SELECT id, quantity_value FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'building.grossFloorArea' ORDER BY created_at`,
    [projectId],
  );
}

describe('G8-22 · rule 8: an area is never below zero', { timeout: 60_000 }, () => {
  it('G8-22 · US-INTAKE-17 · US-REVIEW-07: "-5" for the gross floor area is refused, and nothing is stored', async () => {
    for (const raw of ['-5', '-5 mp', '- 5']) {
      const response = await answer(raw);
      expect(response.statusCode, raw).toBe(422);
      expect(response.json()).toEqual({ code: 'answer_invalid' });
    }
    expect(await storedAreas()).toEqual([]);
    const events = await api.database.asAdministrator('SELECT id FROM sovitech.field_events WHERE project_id = $1', [projectId]);
    expect(events).toEqual([]);
  });

  it('G8-22 controls: zero and a very large area are stored as typed (rule 8\'s plausibility check is another step)', async () => {
    const zero = await answer('0');
    expect(zero.statusCode, zero.body).toBe(200);
    const [first] = await storedAreas();
    const large = await answer('999999999', first === undefined ? [] : [first.id]);
    expect(large.statusCode, large.body).toBe(200);
    expect((await storedAreas()).map((row) => row.quantity_value)).toEqual([0, 999999999]);
  });
});
