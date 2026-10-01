/**
 * G7-9 (new in phase 3 part B, for the integrator to index; rule 7, the `required` row: "Continue stays enabled
 * and shows an inline error on each empty required field, and the project is not created until all four are
 * filled"; G7-6).
 * Situation: a required field (project name, project type, country or city) holds only characters that show as
 * nothing: zero-width spaces and joiners (U+200B, U+200D, U+2060), direction marks (U+200E, U+200F), the
 * Mongolian vowel separator (U+180E), the Hangul fillers (U+3164, U+115F, U+1160, U+FFA0), the Braille blank
 * (U+2800), or white space of any kind.
 * Expected: 422 `required_fields_missing` naming that field, and no project is created; Next on step 1 of an
 * existing project and Edit refuse it too, and store nothing.
 *
 * Over a TEST database, through the API (the contract's projects.create, steps.continue on step 1 and
 * fields.edit). Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let owner: Auth;

const FILLED = { name: 'TEST G7-9 project', projectType: 'renovation', countryCode: 'RO', city: 'TEST city G7-9' } as const;
const INVISIBLE = ['\u200B', '\u200D\u2060', '\u200E\u200F', '\u180E', '\u3164', '\u115F\u1160', '\uFFA0', '\u2800', '\u00A0\u2003\u3000'] as const;

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

describe('G7-9 · rule 7: a required field that shows nothing is empty', { timeout: 60_000 }, () => {
  it('G7-9 · G7-6 · US-INTAKE-02: each required field holding only invisible characters is named, and no project is created', async () => {
    const before = await projectsOfOwner();
    for (const field of ['name', 'projectType', 'countryCode', 'city'] as const) {
      for (const invisible of INVISIBLE) {
        const response = await create({ ...FILLED, [field]: invisible });
        expect(response.statusCode, `${field} ${JSON.stringify(invisible)}`).toBe(422);
        expect(response.json()).toEqual({ code: 'required_fields_missing', fields: [field] });
      }
    }
    const both = await create({ ...FILLED, name: '\u200B', city: '\u2800' });
    expect(both.json()).toEqual({ code: 'required_fields_missing', fields: ['name', 'city'] });
    expect(await projectsOfOwner()).toBe(before);
  });

  it('G7-9 · US-INTAKE-21 AC2: on an existing project, Next on step 1 and Edit refuse a name or city that shows nothing, and store nothing', async () => {
    const created = await create({ ...FILLED });
    expect(created.statusCode, created.body).toBe(201);
    const { projectId } = created.json() as { projectId: string };
    const count = async (): Promise<number | undefined> =>
      (await api.database.asAdministrator<{ count: number }>('SELECT count(*)::integer AS count FROM sovitech.candidates WHERE project_id = $1', [projectId]))[0]?.count;
    const before = await count();
    for (const invisible of INVISIBLE) {
      const next = await api.app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/steps/1/continue`,
        headers: { ...owner },
        payload: { answers: [{ field: { subjectId: projectId, fieldKey: 'project.name' }, value: { kind: 'text', text: invisible }, corrects: [] }], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } },
      });
      expect(next.statusCode, JSON.stringify(invisible)).toBe(422);
      expect(next.json()).toEqual({ code: 'required_fields_missing', fields: ['name'] });
      const edit = await api.app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/fields/edit`,
        headers: { ...owner },
        payload: { field: { subjectId: projectId, fieldKey: 'project.city' }, value: { kind: 'text', text: invisible }, corrects: [] },
      });
      expect(edit.statusCode, JSON.stringify(invisible)).toBe(422);
      expect(edit.json()).toEqual({ code: 'required_fields_missing', fields: ['city'] });
    }
    expect(await count()).toBe(before);
  });
});
