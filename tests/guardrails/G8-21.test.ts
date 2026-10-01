/**
 * G8-21 (new in phase 3, indexed in docs/guardrails.md section 7 at v1.8; its Expected follows from
 * rule 8 as written: "Ambiguous readings keep both. When a reading is ambiguous, such as '1.500', the
 * candidate carries both alternatives with low confidence. It is never silently read one way";
 * US-INTAKE-17 AC7; PRD R-003, "owner-typed numbers go through the registry parser and dimension
 * check and are never stored as one silent reading").
 * Situation: the owner types "1.500" in the step 8 inline ask for the gross floor area.
 * Expected: it is not stored as one reading: the field reads neither 1.5 nor 1500.
 *
 * The build meets it the stricter way while the interface number format is open (D-26; build log,
 * phase 3, "Waiting"): the entry is refused with `number_ambiguous`, and nothing is stored, so the
 * owner writes it again or skips it (rule 7). Storing it with both readings would meet it too.
 *
 * Over a TEST database, through the API route the inline ask uses (`POST .../fields/edit`, the
 * contract's fields.edit): "1.500" and "1,500", each of which reads two ways with no locale known (the
 * interface number format is open, D-26), are answered 422 `number_ambiguous`, and the gross floor area
 * holds no candidate and no event after either. The controls: "1500" reads one way and is
 * stored as the owner's value; an entry that is no number is refused `answer_invalid`, and one with a
 * unit of another dimension `unit_mismatch`; neither is stored.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { StepResponseSchema } from '@sovitech/view-model/browser';
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
    payload: { name: 'TEST G8-21 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G8-21' },
  });
  projectId = (created.json() as { projectId: string }).projectId;
  const step8 = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/8`, headers: { ...owner } })).json());
  if (step8.view.step !== 8) throw new Error('not step 8');
  const ask = step8.view.proposal.inlineAsks.find((entry) => entry.questionId === 'q.building.grossFloorArea');
  const [field] = ask?.fields ?? [];
  if (field === undefined) throw new Error('step 8 does not ask for the gross floor area');
  area = field;
}, 180_000);

afterAll(async () => {
  await api.stop();
});

function answer(raw: string) {
  return api.app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/fields/edit`,
    headers: { ...owner },
    payload: { field: area, value: { kind: 'quantity', raw, qualifier: 'gross_total' }, corrects: [] },
  });
}

async function storedAreas(): Promise<readonly { readonly quantity_value: number }[]> {
  return api.database.asAdministrator<{ quantity_value: number }>(
    `SELECT quantity_value FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'building.grossFloorArea' ORDER BY created_at`,
    [projectId],
  );
}

test('G8-21 · rule 8 · US-INTAKE-17 AC7: "1.500" typed in the step 8 inline ask is refused, and nothing is stored', async () => {
  for (const raw of ['1.500', '1,500']) {
    const response = await answer(raw);
    expect(response.statusCode, raw).toBe(422);
    expect(response.json()).toEqual({ code: 'number_ambiguous' });
  }
  expect(await storedAreas()).toEqual([]);
  const events = await api.database.asAdministrator('SELECT id FROM sovitech.field_events WHERE project_id = $1', [projectId]);
  expect(events).toEqual([]);
});

test('G8-21 controls: an entry that is no number or of another dimension is refused; one that reads one way is stored', async () => {
  const notANumber = await answer('about a thousand');
  expect(notANumber.statusCode).toBe(422);
  expect(notANumber.json()).toEqual({ code: 'answer_invalid' });
  const otherDimension = await answer('1500 kW');
  expect(otherDimension.statusCode).toBe(422);
  expect(otherDimension.json()).toEqual({ code: 'unit_mismatch' });
  expect(await storedAreas()).toEqual([]);
  const stored = await answer('1500');
  expect(stored.statusCode, stored.body).toBe(200);
  expect(await storedAreas()).toEqual([{ quantity_value: 1500 }]);
});
