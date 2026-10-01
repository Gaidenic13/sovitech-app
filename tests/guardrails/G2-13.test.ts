/**
 * G2-13 (new in phase 3 part B, for the integrator to index; rule 2, "Every value has a source and a verification
 * level (2.1), and the owner sees both": what is shown is what is stored; rule 7, "Nobody is blocked except by the
 * four required fields", read with the refusal the owner can act on).
 * Situation: the owner's project name or city holds a control character (NUL), a lone surrogate, or a
 * bidirectional override (U+202E), on creation or on Edit.
 * Expected: refused 422 `answer_invalid` (never a 500), and no row is stored; ordinary Romanian diacritics pass
 * and are stored and shown as typed.
 *
 * Over a TEST database, through the API (the contract's projects.create and fields.edit). The store cannot hold
 * NUL (it answered 500 before), a lone surrogate was stored as a replacement character (not as typed), and a
 * bidirectional override made the name show in another order than it was stored. Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StepResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let owner: Auth;

const FILLED = { name: 'TEST G2-13 project', projectType: 'renovation', countryCode: 'RO', city: 'TEST city G2-13' } as const;
const REFUSED = ['TEST\u0000NUL', 'TEST\uD800x', 'TEST \u202E21 egap', 'TEST \u2066isolate\u2069', 'TEST\u0007bell'] as const;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function projectsOfOwner(): Promise<number | undefined> {
  const [row] = await api.database.asAdministrator<{ count: number }>('SELECT count(*)::integer AS count FROM sovitech.project_members WHERE user_id = $1', [api.devAccountIds[0]]);
  return row?.count;
}

function create(payload: Record<string, unknown>) {
  return api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload });
}

describe('G2-13 · rule 2: owner text is stored and shown as typed, or refused', { timeout: 60_000 }, () => {
  it('G2-13 · US-INTAKE-02: a name or city with NUL, a lone surrogate or a bidirectional control is refused 422 answer_invalid, and no project is created', async () => {
    const before = await projectsOfOwner();
    for (const field of ['name', 'city'] as const) {
      for (const text of REFUSED) {
        const response = await create({ ...FILLED, [field]: text });
        expect(response.statusCode, `${field} ${JSON.stringify(text)}`).toBe(422);
        expect(response.json()).toEqual({ code: 'answer_invalid' });
      }
    }
    expect(await projectsOfOwner()).toBe(before);
  });

  it('G2-13 · US-REVIEW-07: Edit refuses the same, stores nothing; Romanian diacritics pass and show as typed', async () => {
    const created = await create({ ...FILLED, name: 'TEST Hotel Știrbei', city: 'Brașov' });
    expect(created.statusCode, created.body).toBe(201);
    const { projectId } = created.json() as { projectId: string };
    const count = async (): Promise<number | undefined> =>
      (await api.database.asAdministrator<{ count: number }>('SELECT count(*)::integer AS count FROM sovitech.candidates WHERE project_id = $1', [projectId]))[0]?.count;
    const before = await count();
    for (const text of REFUSED) {
      const edit = await api.app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/fields/edit`,
        headers: { ...owner },
        payload: { field: { subjectId: projectId, fieldKey: 'project.city' }, value: { kind: 'text', text }, corrects: [] },
      });
      expect(edit.statusCode, JSON.stringify(text)).toBe(422);
      expect(edit.json()).toEqual({ code: 'answer_invalid' });
    }
    expect(await count()).toBe(before);
    const step1 = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/1`, headers: { ...owner } })).json());
    const text = (valueId: string): string | undefined => step1.displayObjects.find((display) => display.valueId === valueId)?.text;
    expect(text(`project:${projectId}.name`)).toBe('TEST Hotel Știrbei');
    expect(text(`project:${projectId}.city`)).toBe('Brașov');
  });
});
