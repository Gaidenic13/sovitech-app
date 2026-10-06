/**
 * G3-23 (new in phase 5, for the integrator to index; rule 3, "A suggestion left in place counts as the owner's answer
 * ... On Continue, each suggestion that was visible, labelled and left in place is written ...", "Nothing hidden,
 * collapsed or on another step is accepted this way"; rule 7, "Nothing fills the gap"; PRD R-109, US-PROPOSAL-01 AC3).
 * Situation: the owner presses Generate with a visible Suggested choice left on step 7 and an unanswered question on
 * step 5.
 * Expected: generation creates no candidate, candidate event or field event for either.
 *
 * Through the API over a TEST database, with a TEST suggestion rule handed in through the registry seam (production
 * has none: PRD R-005, R-006, R-051) that preselects the HVAC automation area with Suggested on step 7: step 7 shows it,
 * the owner never presses its Continue, and step 5's questions stay unanswered; Generate stores a version, and the store
 * holds exactly the candidates, candidate events and field events it held before; the suggestion stays a suggestion
 * (its field has no value) and step 5's questions are not skipped. Every account and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StepResponseSchema } from '@sovitech/view-model/browser';
import type { SuggestionRule } from '@sovitech/view-model/server';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { newOwnerProject, testRegistry } from './_support/workspace-store';

const AREA = 'project.automation.hvac';

/** A TEST rule: the HVAC automation area preselected with Suggested, its reason the registry's rule line. */
const SUGGEST_HVAC_AREA: SuggestionRule = (fields) => {
  const field = fields.find((entry) => entry.field.key === AREA);
  if (field === undefined || field.state.state === 'known') return [];
  return [{ fieldKey: AREA, subjectId: field.subjectId, choice: 'selected', reasonLineId: 'suggested_because', reasonSlots: { reason: 'TEST reason' }, suggestedBy: 'TEST rule G3-23' }];
};

let api: TestApi;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true, registry: testRegistry({ suggestionRules: [SUGGEST_HVAC_AREA] }) });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function counts(projectId: string): Promise<Record<string, number>> {
  const [row] = await api.database.asAdministrator<{ candidates: number; candidate_events: number; field_events: number }>(
    `SELECT (SELECT count(*)::int FROM sovitech.candidates WHERE project_id = $1) AS candidates,
            (SELECT count(*)::int FROM sovitech.candidate_events WHERE project_id = $1) AS candidate_events,
            (SELECT count(*)::int FROM sovitech.field_events WHERE project_id = $1) AS field_events`,
    [projectId],
  );
  if (row === undefined) throw new Error('no counts');
  return { ...row };
}

describe('G3-23 · rule 3 · rule 7: Generate accepts no suggestion and fills no gap', { timeout: 60_000 }, () => {
  it('G3-23 · US-PROPOSAL-01 AC3 · R-109: a visible Suggested area on step 7 and step 5 unanswered: Generate writes no candidate, candidate event or field event', async () => {
    const { projectId } = await newOwnerProject(api, owner, 'G3-23');
    const step7 = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/7`, headers: { ...owner } })).json());
    const suggested = step7.displayObjects.find((display) => display.field?.fieldKey === AREA);
    expect(suggested?.badge?.id).toBe('suggested');
    const before = await counts(projectId);

    const generated = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/proposals`, headers: { ...owner }, payload: {} });
    expect(generated.statusCode, generated.body).toBe(201);
    expect(await counts(projectId)).toEqual(before);

    // The suggestion is still only a suggestion, and step 5's questions are not skipped.
    const again = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/7`, headers: { ...owner } })).json());
    expect(again.displayObjects.find((display) => display.field?.fieldKey === AREA)?.badge?.id).toBe('suggested');
    const step5 = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/5`, headers: { ...owner } })).json());
    if (step5.view.step !== 5) throw new Error('not step 5');
    for (const display of step5.displayObjects.filter((entry) => entry.field !== undefined && entry.field.subjectId === projectId)) {
      expect(display.lines?.some((line) => line.id === 'provide_later') === true, display.valueId).toBe(false);
    }
    const skips = await api.database.asAdministrator<{ count: number }>("SELECT count(*)::int AS count FROM sovitech.field_events WHERE project_id = $1 AND type = 'skipped'", [projectId]);
    expect(skips[0]?.count).toBe(0);
  });
});
