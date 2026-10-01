/**
 * G7-11 (new in phase 3 part B, for the integrator to index; rule 7, the `first_estimate` row: "If it is still
 * missing, the output falls back to ... 'Not available yet' with the missing item and an action to add it", and
 * '"Not available yet" never appears alone. It names what is missing and offers the action'; PRD R-012 "Until
 * decided": the action "opens a built page (at least the step 8 inline ask for that field)").
 * Situation: the owner generated without the gross floor area (step 8's skip), then pressed the proposal page's
 * "Add gross floor area".
 * Expected: step 8 without the owner's request serves no area ask (asked once, rule 7); with
 * `add=building.grossFloorArea` it serves the area's inline ask, whatever its skip count, and logs no
 * `question_for_known_field`; a value typed there is stored as the owner's.
 *
 * Over a TEST database, through the API (the contract's steps.view with its `add` query, fields.skip and
 * fields.edit). Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StepResponseSchema, type StepResponse } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

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

async function step8(projectId: string, query = ''): Promise<StepResponse> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/8${query}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json());
}

function asksOf(response: StepResponse): readonly string[] {
  if (response.view.step !== 8) throw new Error('not step 8');
  return response.view.proposal.inlineAsks.map((ask) => ask.questionId);
}

describe('G7-11 · PRD R-012: "Add" after Generate opens the step 8 ask the owner asked for', { timeout: 60_000 }, () => {
  it('G7-11 · US-INTAKE-22 AC6 · rule 7: after Generate\'s skip, no area ask unless the owner asks for it; then it is served, and a value typed there is stored', async () => {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G7-11 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G7-11' },
    });
    const { projectId } = created.json() as { projectId: string };
    expect(asksOf(await step8(projectId))).toContain('q.building.grossFloorArea');
    const generated = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/skip`, headers: { ...owner }, payload: { questionId: 'q.building.grossFloorArea', step: 8 } });
    expect(generated.statusCode, generated.body).toBe(200);
    expect(asksOf(await step8(projectId))).not.toContain('q.building.grossFloorArea');

    const requested = await step8(projectId, '?add=building.grossFloorArea');
    expect(asksOf(requested)).toContain('q.building.grossFloorArea');
    if (requested.view.step !== 8) throw new Error('not step 8');
    const ask = requested.view.proposal.inlineAsks.find((entry) => entry.questionId === 'q.building.grossFloorArea');
    expect(ask?.input).toMatchObject({ kind: 'quantity', unit: { code: 'm2' } });
    const [field] = ask?.fields ?? [];
    if (field === undefined) throw new Error('the requested ask names no field');

    // Not the app asking again: no defect is logged for it.
    const defects = await api.database.asAdministrator(`SELECT id FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`, [projectId]);
    expect(defects).toEqual([]);

    const typed = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/fields/edit`,
      headers: { ...owner },
      payload: { field, value: { kind: 'quantity', raw: '2400', qualifier: 'gross_total' }, corrects: [] },
    });
    expect(typed.statusCode, typed.body).toBe(200);
    const stored = await api.database.asAdministrator<{ quantity_value: number; source: string }>(
      `SELECT quantity_value, source FROM sovitech.candidates WHERE project_id = $1 AND field_key = 'building.grossFloorArea'`,
      [projectId],
    );
    expect(stored).toEqual([{ quantity_value: 2400, source: 'user' }]);
    // Once the field holds a value, the request serves no ask (rule 5: a known field is never asked).
    expect(asksOf(await step8(projectId, '?add=building.grossFloorArea'))).not.toContain('q.building.grossFloorArea');
  });

  it('G7-11 controls: `add` on another step is refused; a field outside the first-estimate set serves no extra ask', async () => {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G7-11 controls', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G7-11' },
    });
    const { projectId } = created.json() as { projectId: string };
    const elsewhere = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/3?add=building.grossFloorArea`, headers: { ...owner } });
    expect(elsewhere.statusCode).toBe(400);
    expect(elsewhere.json()).toEqual({ code: 'request_invalid' });
    expect(asksOf(await step8(projectId, '?add=project.occupancy'))).toEqual(asksOf(await step8(projectId)));
  });
});
