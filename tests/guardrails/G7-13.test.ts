/**
 * G7-13 (docs/guardrails.md section 7; new in phase 3, from the final verification of part B, its first new
 * problem, and the fix round after it; rule 7, the `first_estimate` row, "At step 8 the review asks for it once,
 * inline", and "Skip means skip"; section 8, "The app logs every enforcement as an event"; the same reading as
 * G7-10, for skips sent together).
 * Situation: one "Skip for now" is sent several times at once (a double click, two tabs): step 4's systems in
 * scope, step 6's goals, and step 8's "Generate without it" for the gross floor area.
 * Expected: each field's skip is recorded once (one `skipped` field event and one `skipped` guardrail event per
 * field), and step 8 still asks for the systems in scope.
 *
 * Found by the final verification: three goal skips sent at once wrote 21 events in place of 7, and a browser
 * double click on step 4's "Skip for now" wrote the eight systems' skips twice, after which step 8 no longer
 * asked for the systems in scope. The owner's writes of a project now take the project's write lock before they
 * read (`lockProjectWrites`, in `ownerState`), and the web sends one request per press (`useInFlight`,
 * apps/web/src/wizard/use-in-flight.ts, proven by the component tests titled "A-7 · G7-10 (web half)").
 *
 * Over a TEST database, through the API (the contract's fields.skip with the page's step), each round sent with
 * Promise.all and repeated. Every value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import { StepResponseSchema } from '@sovitech/view-model/browser';
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

async function newProject(label: string): Promise<string> {
  const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload: { name: `TEST G7-13 ${label}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G7-13' } });
  expect(created.statusCode, created.body).toBe(201);
  return (created.json() as { projectId: string }).projectId;
}

function sendSkip(projectId: string, questionId: string, step: number) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/fields/skip`, headers: { ...owner }, payload: { questionId, step } });
}

function fieldsOf(questionId: string): readonly string[] {
  const question = productionRegistry.questions.find((entry) => entry.id === questionId);
  if (question === undefined) throw new Error(`no question ${questionId}`);
  return question.fieldKeys;
}

async function skippedEvents(projectId: string, fieldKeys: readonly string[]): Promise<{ readonly field: number | undefined; readonly guardrail: number | undefined }> {
  const [field] = await api.database.asAdministrator<{ n: number }>(`SELECT count(*)::integer AS n FROM sovitech.field_events WHERE project_id = $1 AND type = 'skipped' AND field_key = ANY($2::text[])`, [projectId, fieldKeys]);
  const [guardrail] = await api.database.asAdministrator<{ n: number }>(`SELECT count(*)::integer AS n FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'skipped' AND field_key = ANY($2::text[])`, [projectId, fieldKeys]);
  return { field: field?.n, guardrail: guardrail?.n };
}

async function inlineAsks(projectId: string): Promise<readonly string[]> {
  const view = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/8`, headers: { ...owner } })).json()).view;
  if (view.step !== 8) throw new Error('not step 8');
  return view.proposal.inlineAsks.map((ask) => ask.questionId);
}

describe('G7-13 · rule 7: one skip sent several times at once counts once', { timeout: 180_000 }, () => {
  it('G7-13 · step 4: a double "Skip for now" sent at once records each system once, and step 8 still asks for the systems in scope', async () => {
    const systems = fieldsOf('q.project.systemsInScope');
    for (let round = 1; round <= ROUNDS; round += 1) {
      const projectId = await newProject(`systems ${String(round)}`);
      const answers = await Promise.all([sendSkip(projectId, 'q.project.systemsInScope', 4), sendSkip(projectId, 'q.project.systemsInScope', 4)]);
      expect(answers.map((answer) => answer.statusCode)).toEqual([200, 200]);
      expect(await skippedEvents(projectId, systems), `round ${String(round)}`).toEqual({ field: systems.length, guardrail: systems.length });
      expect(await inlineAsks(projectId), `round ${String(round)}`).toContain('q.project.systemsInScope');
    }
  });

  it('G7-13 · step 6: three "Skip for now" of the goals sent at once record each goal once', async () => {
    const goals = fieldsOf('q.project.goals');
    for (let round = 1; round <= ROUNDS; round += 1) {
      const projectId = await newProject(`goals ${String(round)}`);
      const answers = await Promise.all([1, 2, 3].map(() => sendSkip(projectId, 'q.project.goals', 6)));
      expect(answers.map((answer) => answer.statusCode)).toEqual([200, 200, 200]);
      expect(await skippedEvents(projectId, goals), `round ${String(round)}`).toEqual({ field: goals.length, guardrail: goals.length });
    }
  });

  it('G7-13 · step 8: "Generate without it" for the area sent three times at once records one skip', async () => {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const projectId = await newProject(`area ${String(round)}`);
      const answers = await Promise.all([1, 2, 3].map(() => sendSkip(projectId, 'q.building.grossFloorArea', 8)));
      expect(answers.map((answer) => answer.statusCode)).toEqual([200, 200, 200]);
      expect(await skippedEvents(projectId, ['building.grossFloorArea']), `round ${String(round)}`).toEqual({ field: 1, guardrail: 1 });
    }
  });
});
