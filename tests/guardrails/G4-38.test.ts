/**
 * G4-38 (docs/guardrails.md section 7; new in phase 3, from the final verification of part B, its first new
 * problem, and the fix round after it; rule 4, "A correction is a resolution, not a conflict", "The owner is not
 * asked 'Which is right?' about a choice they just made", and "A conflict is put to someone only when values
 * arrive without that person having seen both. That happens when two documents disagree, or when a document
 * analysed later disagrees with an answer the owner gave earlier"; the same reading as G4-36, for answers sent
 * together; G4-37 is left for proposal P-3B-CONFLICT-NO-DOCUMENT).
 * Situation: two answers to one field are sent at once (two tabs, a double click) from screens that showed no
 * value for it, on Edit (the gross floor area) and on Continue (step 5's building type), on a project with no
 * documents.
 * Expected: one owner answer is stored and shown, Provided by you, and the field is not in conflict; a different
 * answer sent with it is refused (`shown_value_changed`) and stores nothing.
 *
 * Found by the final verification: each write read the project's state and then wrote, with no lock, so two
 * requests that arrived together both read the field as empty and both stored ("Two values 1,200 to 1,300 m²",
 * "Hotel or Office", in 6 of 6 rounds). The owner's writes of a project now take the project's write lock before
 * they read (`lockProjectWrites`, packages/db/src/scope.ts, in `ownerState`, apps/api/src/wizard/service.ts).
 *
 * Over a TEST database, through the API (the contract's fields.edit and steps.continue), each round sent with
 * Promise.all and repeated, since one round may happen to run one request after the other. The same answer sent
 * twice at once is stored once (the second is the owner's own value, a no-op). Every value is TEST data.
 *
 * Phase 4 extends it to System Scope, the only scope editor after Generate (PRD R-052; the contract's
 * workspace.systemScope.decide): two decisions for one system sent at once from screens that showed no value are one
 * stored decision, Provided by you, and a different decision sent with it is refused `shown_value_changed` (the
 * decision takes the project's write lock before it reads, as every owner write does: docs/adr/0044 decision 6).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StepResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

const ROUNDS = 4;

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

async function newProject(label: string): Promise<{ readonly projectId: string; readonly buildingId: string }> {
  const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload: { name: `TEST G4-38 ${label}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G4-38' } });
  expect(created.statusCode, created.body).toBe(201);
  const { projectId } = created.json() as { projectId: string };
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  return { projectId, buildingId: building.id };
}

function post(projectId: string, path: string, payload: Record<string, unknown>) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/${path}`, headers: { ...owner }, payload });
}

async function candidateCount(subjectId: string, fieldKey: string): Promise<number | undefined> {
  const [row] = await api.database.asAdministrator<{ n: number }>('SELECT count(*)::integer AS n FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2', [subjectId, fieldKey]);
  return row?.n;
}

async function displayOf(projectId: string, step: number, valueId: string): Promise<DisplayObject | undefined> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(step)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json()).displayObjects.find((display) => display.valueId === valueId);
}

describe('G4-38 · rule 4: two answers to one field sent at once', { timeout: 180_000 }, () => {
  it('G4-38 · fields/edit: two first areas sent at once: one stored, the other refused shown_value_changed; no conflict', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId, buildingId } = await newProject(`edit ${String(round)}`);
      const area = { subjectId: buildingId, fieldKey: 'building.grossFloorArea' };
      const edit = (raw: string) => post(projectId, 'fields/edit', { field: area, value: { kind: 'quantity', raw, qualifier: 'gross_total' }, corrects: [] });
      const answers = await Promise.all([edit('1200'), edit('1300')]);
      expect(answers.map((answer) => answer.statusCode).sort(), `round ${String(round)}`).toEqual([200, 409]);
      expect(answers.find((answer) => answer.statusCode === 409)?.json()).toEqual({ code: 'shown_value_changed' });
      expect(await candidateCount(buildingId, area.fieldKey)).toBe(1);
      const shown = await displayOf(projectId, 3, `building:${buildingId}.grossFloorArea`);
      expect(shown?.badge?.id).toBe('provided_by_you');
      expect(['1,200 m²', '1,300 m²']).toContain(shown?.text);
    }
  });

  it('G4-38 · fields/edit: the same area sent twice at once is stored once, and neither is refused', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId, buildingId } = await newProject(`same ${String(round)}`);
      const area = { subjectId: buildingId, fieldKey: 'building.grossFloorArea' };
      const edit = () => post(projectId, 'fields/edit', { field: area, value: { kind: 'quantity', raw: '1200', qualifier: 'gross_total' }, corrects: [] });
      expect((await Promise.all([edit(), edit()])).map((answer) => answer.statusCode)).toEqual([200, 200]);
      expect(await candidateCount(buildingId, area.fieldKey)).toBe(1);
    }
  });

  it('G4-38 · steps/5/continue: two building types sent at once: one stored, the other refused shown_value_changed; no conflict', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId, buildingId } = await newProject(`continue ${String(round)}`);
      const type = { subjectId: buildingId, fieldKey: 'building.type' };
      const body = (choice: string) => ({ answers: [{ field: type, value: { kind: 'choice', choice }, corrects: [] }], multi: [], visibleSuggestions: [], shown: { questions: ['q.building.type'], confirmations: [] } });
      const answers = await Promise.all([post(projectId, 'steps/5/continue', body('hotel')), post(projectId, 'steps/5/continue', body('office'))]);
      expect(answers.map((answer) => answer.statusCode).sort(), `round ${String(round)}`).toEqual([200, 409]);
      expect(answers.find((answer) => answer.statusCode === 409)?.json()).toEqual({ code: 'shown_value_changed' });
      expect(await candidateCount(buildingId, type.fieldKey)).toBe(1);
      const shown = await displayOf(projectId, 5, `building:${buildingId}.type`);
      expect(shown?.badge?.id).toBe('provided_by_you');
      expect(['Hotel', 'Office']).toContain(shown?.text);
    }
  });

  it('G4-38 · workspace/system-scope/decisions: two decisions for one system sent at once from screens that showed no value: one stored, Provided by you; a different one refused shown_value_changed; the same one twice stored once', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId } = await newProject(`scope ${String(round)}`);
      const decide = (choice: string) =>
        post(projectId, 'workspace/system-scope/decisions', { decisions: [{ field: { subjectId: projectId, fieldKey: 'project.scope.hvac' }, choice, corrects: [] }], visibleSuggestions: [] });
      const answers = await Promise.all([decide('include'), decide('exclude')]);
      expect(answers.map((answer) => answer.statusCode).sort(), `round ${String(round)}`).toEqual([200, 409]);
      expect(answers.find((answer) => answer.statusCode === 409)?.json()).toEqual({ code: 'shown_value_changed' });
      expect(await candidateCount(projectId, 'project.scope.hvac')).toBe(1);
      const shown = await displayOf(projectId, 4, `project:${projectId}.scope.hvac`);
      expect(shown?.badge?.id).toBe('provided_by_you');

      const same = await newProject(`scope same ${String(round)}`);
      const twice = () =>
        post(same.projectId, 'workspace/system-scope/decisions', { decisions: [{ field: { subjectId: same.projectId, fieldKey: 'project.scope.lighting' }, choice: 'include', corrects: [] }], visibleSuggestions: [] });
      expect((await Promise.all([twice(), twice()])).map((answer) => answer.statusCode)).toEqual([200, 200]);
      expect(await candidateCount(same.projectId, 'project.scope.lighting')).toBe(1);
    }
  });
});
