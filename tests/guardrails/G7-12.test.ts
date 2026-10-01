/**
 * G7-12 (new in phase 3 part B, for the integrator to index; rule 7, "Skip for now": "Continue counts as
 * skipping. Pressing Continue on an unanswered question skips it. The question then shows 'You can provide this
 * later.' once, inline"; 2.6, "Multi-select choices are stored as one `decision` field per option").
 * Situation: a TEST project with no documents whose owner pressed Continue on steps 4 to 7 with nothing answered
 * (exit flow (c)), so the systems in scope, the goals and the automation areas, and the three step 5 questions,
 * are skipped; the owner opens step 8.
 * Expected: step 8 carries "You can provide this later." once per skipped multi-select (on its card), and no
 * option's own display carries it; each skipped question of one field (building type, schedule, occupancy)
 * keeps its line on its own row.
 *
 * Over a TEST database, through the API (the contract's steps.continue and steps.view). Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StepResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let owner: Auth;

const PROVIDE_LATER = 'You can provide this later.';
const MULTI_SELECTS: Readonly<Record<string, string>> = { systems: 'q.project.systemsInScope', goals: 'q.project.goals', automation: 'q.project.automationAreas' };

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

describe('G7-12 · rule 7: "You can provide this later." once per skipped question', { timeout: 60_000 }, () => {
  it('G7-12 · US-INTAKE-15 AC5 · flow (c): step 8 carries the line once per skipped multi-select, on no option, and on each skipped question of one field', async () => {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G7-12 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G7-12' },
    });
    const { projectId } = created.json() as { projectId: string };
    const shown: Record<number, string[]> = { 4: ['q.project.systemsInScope'], 5: ['q.building.type', 'q.project.operatingSchedule', 'q.project.occupancy'], 6: ['q.project.goals'], 7: ['q.project.automationAreas'] };
    for (const step of [4, 5, 6, 7]) {
      const response = await api.app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/steps/${String(step)}/continue`,
        headers: { ...owner },
        payload: { answers: [], multi: [], visibleSuggestions: [], shown: { questions: shown[step] ?? [], confirmations: [] } },
      });
      expect(response.statusCode, `step ${String(step)}: ${response.body}`).toBe(200);
    }

    const step8 = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/8`, headers: { ...owner } })).json());
    if (step8.view.step !== 8) throw new Error('not step 8');
    const byId = new Map(step8.displayObjects.map((display) => [display.valueId, display]));
    const carries = (valueId: string): boolean => (byId.get(valueId)?.lines ?? []).some((line) => line.text === PROVIDE_LATER);

    for (const card of step8.view.cards) {
      const multi = MULTI_SELECTS[card.cardId];
      if (multi !== undefined) {
        expect(card.skippedQuestions, card.cardId).toEqual([{ questionId: multi, line: { id: 'provide_later', kind: 'rule_line', text: PROVIDE_LATER } }]);
        expect(card.rows.filter(carries), card.cardId).toEqual([]);
      } else {
        expect(card.skippedQuestions ?? [], card.cardId).toEqual([]);
      }
    }
    // No decision field's display carries the line anywhere in the response.
    const decisions = step8.displayObjects.filter((display) => /^project\.(scope|goal|automation)\./u.test(display.field?.fieldKey ?? ''));
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.filter((display) => carries(display.valueId)).map((display) => display.valueId)).toEqual([]);
    // Each skipped question of one field keeps its line on its own row.
    const operations = step8.view.cards.find((card) => card.cardId === 'operations');
    expect(operations?.rows.filter(carries)).toHaveLength(3);
    // The line appears once per skipped multi-select, and once per skipped single-field row: six in all.
    const lines = step8.view.cards.flatMap((card) => [...(card.skippedQuestions ?? []).map((entry) => entry.line.text), ...card.rows.filter(carries).map(() => PROVIDE_LATER)]);
    expect(lines).toHaveLength(6);
  });
});
