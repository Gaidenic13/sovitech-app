/**
 * G8-23 (new in phase 3 part B, for the integrator to index; rule 8, "A quantity is stored as a value, a unit and
 * a qualifier, plus the original text exactly as written", and "Approximate wording is kept. Words like 'cca.' ...
 * are stored as `approximate`"; rule 9, "Stored values are never rounded", "Document values display as written").
 * Situation: the owner types "cca. 1 234,5 mp" for the gross floor area (gross total), then corrects it to
 * "1.300,25 mp".
 * Expected: the first is stored as 1234.5 m², approximate, with the original "cca. 1 234,5 mp"; the correction
 * as 1300.25 m² with the original "1.300,25 mp"; each shown formatted ("about 1,234.5 m²", "1,300.25 m²"), not
 * as written, since only document values display as written.
 *
 * Over a TEST database, through the API route of Edit and the step 8 inline ask (the contract's fields.edit).
 * Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FieldWriteResponseSchema } from '@sovitech/view-model/browser';
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
    payload: { name: 'TEST G8-23 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G8-23' },
  });
  projectId = (created.json() as { projectId: string }).projectId;
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  area = { subjectId: building.id, fieldKey: 'building.grossFloorArea' };
}, 180_000);

afterAll(async () => {
  await api.stop();
});

interface StoredArea {
  readonly id: string;
  readonly quantity_value: number;
  readonly quantity_unit: string;
  readonly quantity_qualifier: string;
  readonly quantity_approximate: boolean | null;
  readonly original_text: string | null;
}

async function storedAreas(): Promise<readonly StoredArea[]> {
  return api.database.asAdministrator<StoredArea>(
    `SELECT id, quantity_value, quantity_unit, quantity_qualifier, quantity_approximate, original_text FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'building.grossFloorArea' ORDER BY created_at`,
    [projectId],
  );
}

async function answer(raw: string, corrects: readonly string[]): Promise<string | undefined> {
  const response = await api.app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/fields/edit`,
    headers: { ...owner },
    payload: { field: area, value: { kind: 'quantity', raw, qualifier: 'gross_total' }, corrects: [...corrects] },
  });
  expect(response.statusCode, response.body).toBe(200);
  return FieldWriteResponseSchema.parse(response.json()).displayObjects.find((display) => display.valueId === `building:${area.subjectId}.grossFloorArea`)?.text;
}

describe('G8-23 · rule 8: the owner\'s typed quantity keeps its original text', { timeout: 60_000 }, () => {
  it('G8-23 · US-REVIEW-07 AC6 · US-INTAKE-17: "cca. 1 234,5 mp" is stored as 1234.5 m², approximate, with its original, and shown formatted; the correction keeps its own', async () => {
    expect(await answer('cca. 1 234,5 mp', [])).toBe('about 1,234.5 m²');
    const [first] = await storedAreas();
    expect(first).toMatchObject({ quantity_value: 1234.5, quantity_unit: 'm2', quantity_qualifier: 'gross_total', quantity_approximate: true, original_text: 'cca. 1 234,5 mp' });
    expect(await answer('1.300,25 mp', first === undefined ? [] : [first.id])).toBe('1,300.25 m²');
    const [, second] = await storedAreas();
    expect(second).toMatchObject({ quantity_value: 1300.25, quantity_unit: 'm2', quantity_qualifier: 'gross_total', original_text: '1.300,25 mp' });
    expect(second?.quantity_approximate).not.toBe(true);
  });
});
