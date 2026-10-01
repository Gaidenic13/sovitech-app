/**
 * The owner's writes of one project sent together, through the wizard API over a TEST database (phase 3
 * part B, the final verification's first new problem; guardrails rules 4 and 7, section 8; docs/adr/0036).
 * Each write reads the project's state and decides on it; two tabs or a double click send two at once, and
 * before the project's write lock both read the state before either wrote: two owner answers in conflict
 * ("Two values", "1,200 to 1,300 m²", "Hotel or Office"), a skip written two or three times, and step 8's
 * systems ask gone. Now `ownerState` (apps/api/src/wizard/service.ts) takes the lock before it reads, so the
 * later request decides on the earlier one's result, as the one-at-a-time path does (G4-36, G7-10; sent
 * together, the cases G4-38 and G7-13, whose case files repeat the first six tests). The
 * defect logging of the served views takes the same lock before it reads the events it counts (G5-3, G5-4).
 *
 * Every round sends its requests with Promise.all and is repeated, since one round may happen to run one at
 * a time. Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withRequest } from '@sovitech/db';
import { productionRegistry } from '@sovitech/registry';
import { StepResponseSchema, type DisplayObject } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';
import { logPlanDefects, logServedAsksForKnownFields } from '../../apps/api/src/wizard/defects';
import { readProjectState } from '../../apps/api/src/wizard/project-state';

/** Each test runs several rounds over a TEST database; under a loaded run a request can take seconds. */
const LONG = { timeout: 180_000 };
const ROUNDS = 4;

let api: TestApi;
let ownerId: string;
let owner: Auth;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, ownerId);
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function newProject(label: string): Promise<{ readonly projectId: string; readonly buildingId: string }> {
  const created = await api.app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { ...owner },
    payload: { name: `TEST concurrent ${label}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city concurrent' },
  });
  expect(created.statusCode, created.body).toBe(201);
  const { projectId } = created.json() as { projectId: string };
  const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
  if (building === undefined) throw new Error('no building subject');
  return { projectId, buildingId: building.id };
}

function post(projectId: string, path: string, payload: Record<string, unknown>) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/${path}`, headers: { ...owner }, payload });
}

async function count(sql: string, params: readonly unknown[]): Promise<number> {
  const [row] = await api.database.asAdministrator<{ n: number }>(sql, params);
  return row?.n ?? Number.NaN;
}

const candidates = (subjectId: string, fieldKey: string) => count('SELECT count(*)::integer AS n FROM sovitech.candidates WHERE subject_id = $1 AND field_key = $2', [subjectId, fieldKey]);
/** The `skipped` field events and section 8 `skipped` events on the given fields of the project. */
async function skippedEvents(projectId: string, fieldKeys: readonly string[]): Promise<{ readonly field: number; readonly guardrail: number }> {
  const field = await count(`SELECT count(*)::integer AS n FROM sovitech.field_events WHERE project_id = $1 AND type = 'skipped' AND field_key = ANY($2::text[])`, [projectId, fieldKeys]);
  const guardrail = await count(`SELECT count(*)::integer AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'skipped' AND field_key = ANY($2::text[])`, [projectId, fieldKeys]);
  return { field, guardrail };
}

async function step(projectId: string, number: number) {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(number)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json());
}

async function inlineAsks(projectId: string): Promise<readonly string[]> {
  const { view } = await step(projectId, 8);
  if (view.step !== 8) throw new Error('not step 8');
  return view.proposal.inlineAsks.map((ask) => ask.questionId);
}

function display(displays: readonly DisplayObject[], valueId: string): DisplayObject | undefined {
  return displays.find((entry) => entry.valueId === valueId);
}

/** The registry's fields of a question (the systems of step 4, the goals of step 6). */
function questionFields(questionId: string): readonly string[] {
  const question = productionRegistry.questions.find((entry) => entry.id === questionId);
  if (question === undefined) throw new Error(`no question ${questionId}`);
  return question.fieldKeys;
}

describe('rule 4: two answers to one field sent at once (A-1, sent together)', LONG, () => {
  it('G4-38 · G4-36 · rule 4 · A-1: two first areas sent at once from screens that showed none: one is stored, the other refused shown_value_changed; the field is not in conflict', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId, buildingId } = await newProject(`edit ${String(round)}`);
      const area = { subjectId: buildingId, fieldKey: 'building.grossFloorArea' };
      const edit = (raw: string) => post(projectId, 'fields/edit', { field: area, value: { kind: 'quantity', raw, qualifier: 'gross_total' }, corrects: [] });
      const answers = await Promise.all([edit('1200'), edit('1300')]);
      expect(answers.map((answer) => answer.statusCode).sort(), `round ${String(round)}`).toEqual([200, 409]);
      expect(answers.find((answer) => answer.statusCode === 409)?.json()).toEqual({ code: 'shown_value_changed' });
      expect(await candidates(buildingId, area.fieldKey), `round ${String(round)}`).toBe(1);
      const shown = display((await step(projectId, 3)).displayObjects, `building:${buildingId}.grossFloorArea`);
      expect(shown?.badge?.id, `round ${String(round)}`).toBe('provided_by_you');
      expect(['1,200 m²', '1,300 m²']).toContain(shown?.text);
    }
  });

  it('G4-38 · G4-36 · US-SCOPE-02 AC9: the same area sent twice at once is stored once, and neither request is refused', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId, buildingId } = await newProject(`same edit ${String(round)}`);
      const area = { subjectId: buildingId, fieldKey: 'building.grossFloorArea' };
      const edit = () => post(projectId, 'fields/edit', { field: area, value: { kind: 'quantity', raw: '1200', qualifier: 'gross_total' }, corrects: [] });
      const answers = await Promise.all([edit(), edit()]);
      expect(answers.map((answer) => answer.statusCode), `round ${String(round)}`).toEqual([200, 200]);
      expect(await candidates(buildingId, area.fieldKey), `round ${String(round)}`).toBe(1);
    }
  });

  it('G4-38 · G4-36 · rule 4 · A-1: two step 5 Continues with different building types sent at once: one is stored, the other refused shown_value_changed; no "Hotel or Office"', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId, buildingId } = await newProject(`continue ${String(round)}`);
      const type = { subjectId: buildingId, fieldKey: 'building.type' };
      const body = (choice: string) => ({ answers: [{ field: type, value: { kind: 'choice', choice }, corrects: [] }], multi: [], visibleSuggestions: [], shown: { questions: ['q.building.type'], confirmations: [] } });
      const answers = await Promise.all([post(projectId, 'steps/5/continue', body('hotel')), post(projectId, 'steps/5/continue', body('office'))]);
      expect(answers.map((answer) => answer.statusCode).sort(), `round ${String(round)}`).toEqual([200, 409]);
      expect(answers.find((answer) => answer.statusCode === 409)?.json()).toEqual({ code: 'shown_value_changed' });
      expect(await candidates(buildingId, type.fieldKey), `round ${String(round)}`).toBe(1);
      const shown = display((await step(projectId, 5)).displayObjects, `building:${buildingId}.type`);
      expect(shown?.badge?.id, `round ${String(round)}`).toBe('provided_by_you');
      expect(['Hotel', 'Office']).toContain(shown?.text);
    }
  });
});

describe('rule 7 and section 8: one skip sent several times at once (A-7, sent together)', LONG, () => {
  it('G7-13 · G7-10 · rule 7 · section 8 · A-7: three "Skip for now" of step 6\'s goals sent at once write one skipped field event and one skipped guardrail event per goal', async () => {
    const goals = questionFields('q.project.goals');
    expect(goals.length).toBeGreaterThan(1);
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId } = await newProject(`goals ${String(round)}`);
      const skips = await Promise.all([1, 2, 3].map(() => post(projectId, 'fields/skip', { questionId: 'q.project.goals', step: 6 })));
      expect(skips.map((skip) => skip.statusCode), `round ${String(round)}`).toEqual([200, 200, 200]);
      expect(await skippedEvents(projectId, goals), `round ${String(round)}`).toEqual({ field: goals.length, guardrail: goals.length });
    }
  });

  it('G7-13 · G7-10 · rule 7 "At step 8 the review asks for it once, inline" · A-7: a double "Skip for now" on step 4 sent at once writes the systems\' skips once, and step 8 still asks for the systems in scope', async () => {
    const systems = questionFields('q.project.systemsInScope');
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId } = await newProject(`systems ${String(round)}`);
      const skips = await Promise.all([1, 2].map(() => post(projectId, 'fields/skip', { questionId: 'q.project.systemsInScope', step: 4 })));
      expect(skips.map((skip) => skip.statusCode), `round ${String(round)}`).toEqual([200, 200]);
      expect(await skippedEvents(projectId, systems), `round ${String(round)}`).toEqual({ field: systems.length, guardrail: systems.length });
      expect(await inlineAsks(projectId), `round ${String(round)}`).toContain('q.project.systemsInScope');
    }
  });

  it('G7-13 · G7-10 · rule 7 · A-7: step 8\'s "Generate without it" for the area sent three times at once writes one skip', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId } = await newProject(`area ${String(round)}`);
      const skip = () => post(projectId, 'fields/skip', { questionId: 'q.building.grossFloorArea', step: 8 });
      const skips = await Promise.all([skip(), skip(), skip()]);
      expect(skips.map((response) => response.statusCode), `round ${String(round)}`).toEqual([200, 200, 200]);
      expect(await skippedEvents(projectId, ['building.grossFloorArea']), `round ${String(round)}`).toEqual({ field: 1, guardrail: 1 });
      expect(await inlineAsks(projectId)).not.toContain('q.building.grossFloorArea');
    }
  });
});

describe('section 8: a defect logged once per field, whatever is served at once', LONG, () => {
  it('G5-4 · section 4 · section 8: a stale step 5 view that asks for the known building type, served three times at once, logs one question_for_known_field', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId, buildingId } = await newProject(`defect ${String(round)}`);
      const field = { subjectId: buildingId, fieldKey: 'building.type' };
      const { view } = await step(projectId, 5);
      const answered = await post(projectId, 'steps/5/continue', { answers: [{ field, value: { kind: 'choice', choice: 'hotel' }, corrects: [] }], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } });
      expect(answered.statusCode, answered.body).toBe(200);
      // The view served before the answer now asks for a known field (as G5-4's stale view does), served three times at once.
      await Promise.all(
        [1, 2, 3].map(() => withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => logServedAsksForKnownFields(request, await readProjectState(request, { userId: ownerId, projectId }), view))),
      );
      const logged = await count(`SELECT count(*)::integer AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field' AND field_key = 'building.type'`, [projectId]);
      expect(logged, `round ${String(round)}`).toBe(1);
    }
  });

  it('G5-3 · rule 5 "Going over the budget is logged as a defect" · section 8: the same over-budget fields logged by three views at once are logged once each', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const { projectId, buildingId } = await newProject(`budget ${String(round)}`);
      const overBudget = ['building.testOverBudget1', 'building.testOverBudget2'].map((fieldKey) => ({ subjectId: buildingId, fieldKey }));
      await Promise.all([1, 2, 3].map(() => withRequest(api.database.app, { userId: ownerId, projectId }, (request) => logPlanDefects(request, ownerId, { knownFieldAsks: [], overBudget }))));
      const logged = await count(`SELECT count(*)::integer AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'confirmation_budget_exceeded'`, [projectId]);
      expect(logged, `round ${String(round)}`).toBe(overBudget.length);
    }
  });
});
