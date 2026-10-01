/**
 * G5-3 (docs/guardrails.md section 7; rule 5, "Budget": "Steps 3 to 7 together show at most N owner
 * confirmations ... ordered by impactRank. Anything beyond the budget stays labelled and goes to the
 * engineer queue. Going over the budget is logged as a defect.").
 * Situation: 12 values pass the confirmation test and the budget is 7.
 * Expected: 7 are shown by impact. 5 are labelled and go to the engineer queue. A defect is logged.
 *
 * Twelve TEST owner fields of the first-estimate set, each holding an AI inference (uncertain), on
 * steps 3 to 7, with the registry's budget setting (proposed 7). The seven lowest impactRanks are
 * shown with their confirmation; the other five keep their badge, carry no confirmation, and are
 * listed under "SOVITECH will check"; the planner reports the defect the API logs as
 * `confirmation_budget_exceeded` (section 8).
 *
 * The API half (phase 3 part B, V-7: the planner's `defect` flag alone did not show that anything is logged):
 * the API's own logging, `logPlanDefects` (apps/api/src/wizard/defects.ts, which the served step views call
 * through service.ts with the plan of the project as it stands), run over a TEST database on a TEST project
 * with the engine's selection of the same twelve values: one `confirmation_budget_exceeded` event for each of
 * the five fields over the budget, none for the seven shown, and nothing more when the views are read again.
 * The production registry allows one owner confirmation (the building type), so twelve values pass the test
 * only with TEST fields; the API reads the production registry as module constants, and a case file may not
 * mock it (tools/checks/index/case-files.ts), so the served view itself is not read here (the build log's
 * "Waiting" table names the registry seam a run through the served view needs).
 */
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { withRequest } from '@sovitech/db';
import { productionRegistry } from '@sovitech/registry';
import { confirmActionOf, confirmationCandidates, openItems, planQuestion, resolveField, selectConfirmations } from '@sovitech/view-model/server';
import type { StepNumber } from '@sovitech/view-model/browser';
import { documentReading, testDocument } from './_support/builders';
import { intakeFieldOf, registryField, resolveInputOf, uuid } from './_support/view-model';
import { signIn, startTestApi, type TestApi } from './_support/api';
import { logPlanDefects } from '../../apps/api/src/wizard/defects';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const memoriu = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'c'.repeat(64)}` };
const STEPS: readonly StepNumber[] = [3, 4, 5, 6, 7];

/** impactRank in a shuffled order, so the selection is by impact, not by position. */
const RANKS = [12, 3, 7, 1, 11, 5, 9, 2, 10, 4, 8, 6];

/** Twelve TEST owner fields of the first-estimate set on a building, each holding an AI inference (uncertain). */
function twelveFields(buildingId: string) {
  return RANKS.map((rank, index) => {
    const field = registryField(`building.testFact${String(index)}`, {
      kind: 'enum',
      subject: 'building',
      options: ['one', 'two'],
      confirmBy: 'owner',
      criticality: 'first_estimate',
      impactRank: rank,
    });
    const inferred = documentReading({ id: uuid(100 + index), subjectId: buildingId, field, document: memoriu, value: { choice: 'one' }, minute: 1, source: 'ai_inference', confidence: 'medium' });
    return intakeFieldOf(field, buildingId, [inferred], undefined, [memoriu]);
  });
}

test('US-REVIEW-05 AC2 · F-QUESTION-02 · G5-3: 12 values pass the confirmation test and the budget is 7: 7 shown by impact, 5 labelled for the engineer, a defect', () => {
  const budget = productionRegistry.settings.confirmationBudget.value;
  expect(budget).toBe(7);
  const ranks = RANKS;
  const fields = twelveFields(BUILDING);
  const stepOf = (field: (typeof fields)[number]): StepNumber => STEPS[fields.indexOf(field) % STEPS.length] ?? 3;

  const passing = confirmationCandidates(fields, stepOf);
  expect(passing).toHaveLength(12);
  const { shown, overflow, defect } = selectConfirmations(passing, budget);

  // 7 are shown, by impact.
  expect(shown.map((entry) => entry.impactRank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  // 5 go to the engineer queue.
  expect(overflow.map((entry) => entry.impactRank)).toEqual([8, 9, 10, 11, 12]);
  // A defect: the planner reports it, and the API logs it (the test below).
  expect(defect).toBe(true);

  const shownIds = new Set(shown.map((entry) => entry.candidateId));
  for (const field of fields) {
    const confirmation = productionRegistry.questions.find((question) => question.kind === 'confirmation');
    if (confirmation === undefined) throw new Error('the registry holds a confirmation');
    const plan = planQuestion({ question: { ...confirmation, fieldKeys: [field.field.key] }, fields: [field], shownConfirmations: shownIds, visibleSuggestion: false }).plan;
    const candidate = field.candidates[0];
    if (candidate === undefined) throw new Error('each field holds its inference');
    const inBudget = shownIds.has(candidate.id);
    expect(plan.kind).toBe(inBudget ? 'confirm' : 'show');
    // Labelled either way: the one badge the inference reads, with the confirmation only within the budget.
    const actions = inBudget ? [confirmActionOf(field.field, candidate)] : [];
    const [display] = resolveField(resolveInputOf(field, 'building', { actions, documents: [memoriu] }));
    expect(display?.badge?.id).toBe('possible');
    expect((display?.actions ?? []).some((action) => action.kind === 'confirm')).toBe(inBudget);
  }

  const items = openItems({ fields, confirmationsLeft: shown, confirmationOverflow: overflow, unverifiedAssetTypes: 0, siteSurveyNeeded: false });
  expect(items.forYou).toHaveLength(7);
  expect(items.engineer).toEqual([{ group: 'engineer_values', count: 5, fieldLabels: [8, 9, 10, 11, 12].map((rank) => `TEST building.testFact${String(ranks.indexOf(rank))}`) }]);
});

describe('G5-3 · the API logs the defect (over a TEST database)', () => {
  let api: TestApi;
  let ownerId: string;
  let projectId: string;
  let buildingId: string;

  beforeAll(async () => {
    api = await startTestApi({ devLogin: true });
    const [id] = api.devAccountIds;
    if (id === undefined) throw new Error('no TEST development owner');
    ownerId = id;
    const owner = await signIn(api, ownerId);
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G5-3 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G5-3' },
    });
    expect(created.statusCode, created.body).toBe(201);
    projectId = (created.json() as { projectId: string }).projectId;
    const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
    if (building === undefined) throw new Error('no building subject');
    buildingId = building.id;
  }, 180_000);

  afterAll(async () => {
    await api.stop();
  });

  test('G5-3 · rule 5 "Going over the budget is logged as a defect" · section 8: one confirmation_budget_exceeded per field over the budget, none for those shown, and none more on a second read', async () => {
    const fields = twelveFields(buildingId);
    const stepOf = (field: (typeof fields)[number]): StepNumber => STEPS[fields.indexOf(field) % STEPS.length] ?? 3;
    const { shown, overflow, defect } = selectConfirmations(confirmationCandidates(fields, stepOf), productionRegistry.settings.confirmationBudget.value);
    expect(defect).toBe(true);
    const overBudget = overflow.map((entry) => ({ subjectId: buildingId, fieldKey: entry.fieldKey }));
    // Each step view the API serves logs the plan's defects; read twice, as two views would.
    for (const read of [1, 2]) {
      await withRequest(api.database.app, { userId: ownerId, projectId }, (request) => logPlanDefects(request, ownerId, { knownFieldAsks: [], overBudget }));
      const rows = await api.database.asAdministrator<{ fieldKey: string; subjectId: string; reason: string; actor: string }>(
        `SELECT field_key AS "fieldKey", subject_id AS "subjectId", reason, actor FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'confirmation_budget_exceeded' ORDER BY field_key`,
        [projectId],
      );
      expect(rows.map((row) => row.fieldKey), `read ${String(read)}`).toEqual(overflow.map((entry) => entry.fieldKey).sort());
      expect(rows.every((row) => row.subjectId === buildingId && row.reason === 'budget' && row.actor === ownerId)).toBe(true);
      expect(rows.some((row) => shown.some((entry) => entry.fieldKey === row.fieldKey))).toBe(false);
    }
  });

  test('G5-3 · section 8: the same plan logged by three views at once still logs one confirmation_budget_exceeded per field over the budget (the logging takes the project\'s write lock before it reads the events)', async () => {
    // Found by the final verification of part B: views served together each read no event yet and each logged the fields.
    const owner = await signIn(api, ownerId);
    for (const round of [1, 2, 3, 4]) {
      const created = await api.app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { ...owner },
        payload: { name: `TEST G5-3 at once ${String(round)}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G5-3' },
      });
      expect(created.statusCode, created.body).toBe(201);
      const fresh = (created.json() as { projectId: string }).projectId;
      const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [fresh]);
      if (building === undefined) throw new Error('no building subject');
      const fields = twelveFields(building.id);
      const stepOf = (field: (typeof fields)[number]): StepNumber => STEPS[fields.indexOf(field) % STEPS.length] ?? 3;
      const { overflow } = selectConfirmations(confirmationCandidates(fields, stepOf), productionRegistry.settings.confirmationBudget.value);
      const overBudget = overflow.map((entry) => ({ subjectId: building.id, fieldKey: entry.fieldKey }));
      await Promise.all([1, 2, 3].map(() => withRequest(api.database.app, { userId: ownerId, projectId: fresh }, (request) => logPlanDefects(request, ownerId, { knownFieldAsks: [], overBudget }))));
      const rows = await api.database.asAdministrator<{ fieldKey: string }>(`SELECT field_key AS "fieldKey" FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'confirmation_budget_exceeded' ORDER BY field_key`, [fresh]);
      expect(rows.map((row) => row.fieldKey), `round ${String(round)}`).toEqual(overflow.map((entry) => entry.fieldKey).sort());
    }
  });
});
