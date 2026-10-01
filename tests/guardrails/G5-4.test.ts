/**
 * G5-4 (new in phase 3 part B, for the integrator to index; section 4, "A question asked for something the app
 * already knew is a defect, and is logged as one"; section 8, `question_for_known_field`; rule 5, "If the answer
 * exists in the project data, the documents or reference data, the app does not ask for it"; GS-1).
 * Situation: a step view as served asks for a field that already holds an eligible candidate (a TEST state: the
 * owner's own building type, with a step 5 view that serves the building type question unanswered with its
 * "Skip for now"); and, apart, the demo project's eight steps as the API serves them.
 * Expected: the detector, which reads the served view and the field's derived state (not the question engine's
 * plan), logs exactly one `question_for_known_field` event for that field, once however often the view is served;
 * the demo's served steps log none.
 *
 * Over a TEST database: the detector (`apps/api/src/wizard/defects.ts`) runs in the owner's own request on the
 * project's stored state, fed the step 5 view the API served before the owner answered (so a view as served, which
 * now asks for a known field; a case file may not build an object with a `skip` key, which the index check reads as
 * a held-out test); the demo is seeded as `tests/api/wizard-demo.test.ts` seeds it (no sandbox runner).
 * Every value is TEST data.
 */
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withRequest } from '@sovitech/db';
import { StepResponseSchema } from '@sovitech/view-model/browser';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { addToDemoProject } from '../../apps/api/src/cli/dev-accounts';
import { seedDemo } from '../../apps/api/src/seed/demo-seed';
import { FileStore } from '../../apps/api/src/storage/file-store';
import { logServedAsksForKnownFields } from '../../apps/api/src/wizard/defects';
import { readProjectState } from '../../apps/api/src/wizard/project-state';
import { REPOSITORY_ROOT, signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let ownerId: string;
let owner: Auth;
let seedFolder: string;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [id] = api.devAccountIds;
  if (id === undefined) throw new Error('no TEST development owner');
  ownerId = id;
  owner = await signIn(api, ownerId);
  seedFolder = mkdtempSync(join(tmpdir(), 'sovitech-test-g5-4-'));
}, 240_000);

afterAll(async () => {
  await api.stop();
  await rm(seedFolder, { recursive: true, force: true });
});

async function defectsOf(projectId: string): Promise<readonly { readonly field_key: string | null }[]> {
  return api.database.asAdministrator<{ field_key: string | null }>(`SELECT field_key FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`, [projectId]);
}

describe('G5-4 · section 4: a question asked for a known field is logged as a defect', { timeout: 120_000 }, () => {
  it('G5-4 · GS-1: a served view that asks for a known field logs exactly one question_for_known_field, once', async () => {
    const created = await api.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { ...owner },
      payload: { name: 'TEST G5-4 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G5-4' },
    });
    const { projectId } = created.json() as { projectId: string };
    const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
    if (building === undefined) throw new Error('no building subject');
    const field = { subjectId: building.id, fieldKey: 'building.type' };
    // The step 5 view as the API serves it before the answer: the building type question unanswered, with its Skip.
    const before = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/5`, headers: { ...owner } });
    expect(before.statusCode, before.body).toBe(200);
    const view = StepResponseSchema.parse(before.json()).view;
    if (view.step !== 5) throw new Error('not step 5');
    const asked = view.questions.find((question) => question.questionId === 'q.building.type');
    expect(asked?.state).toBe('unanswered');
    expect(asked?.fields).toEqual([field]);
    const answer = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/steps/5/continue`,
      headers: { ...owner },
      payload: { answers: [{ field, value: { kind: 'choice', choice: 'hotel' }, corrects: [] }], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } },
    });
    expect(answer.statusCode, answer.body).toBe(200);
    expect(await defectsOf(projectId)).toEqual([]);

    // The view served before the answer is a TEST served view that now asks for a known field (as a stale or faulty
    // view would): the building type question unanswered, with its Skip, although the field holds the owner's answer.
    for (const served of [1, 2]) {
      const defects = await withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => logServedAsksForKnownFields(request, await readProjectState(request, { userId: ownerId, projectId }), view));
      expect(defects, `served ${String(served)}`).toEqual([{ questionId: 'q.building.type', subjectId: building.id, fieldKey: 'building.type' }]);
    }
    expect(await defectsOf(projectId)).toEqual([{ field_key: 'building.type' }]);
  });

  it('G5-4 · section 8: the same view served three times at once still logs exactly one question_for_known_field (the logging takes the project\'s write lock before it reads the events)', async () => {
    // Found by the final verification of part B: views served together each read no event yet and each logged one.
    for (const round of [1, 2, 3, 4]) {
      const created = await api.app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { ...owner },
        payload: { name: `TEST G5-4 at once ${String(round)}`, projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G5-4' },
      });
      expect(created.statusCode, created.body).toBe(201);
      const { projectId } = created.json() as { projectId: string };
      const [building] = await api.database.asAdministrator<{ id: string }>(`SELECT id FROM sovitech.subjects WHERE project_id = $1 AND kind = 'building'`, [projectId]);
      if (building === undefined) throw new Error('no building subject');
      const before = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/5`, headers: { ...owner } });
      expect(before.statusCode, before.body).toBe(200);
      const view = StepResponseSchema.parse(before.json()).view;
      const answer = await api.app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/steps/5/continue`,
        headers: { ...owner },
        payload: { answers: [{ field: { subjectId: building.id, fieldKey: 'building.type' }, value: { kind: 'choice', choice: 'hotel' }, corrects: [] }], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } },
      });
      expect(answer.statusCode, answer.body).toBe(200);
      await Promise.all(
        [1, 2, 3].map(() => withRequest(api.database.app, { userId: ownerId, projectId }, async (request) => logServedAsksForKnownFields(request, await readProjectState(request, { userId: ownerId, projectId }), view))),
      );
      expect(await defectsOf(projectId), `round ${String(round)}`).toEqual([{ field_key: 'building.type' }]);
    }
  });

  it('G5-4 · GS-1 · R-137: the demo project\'s eight served steps log no question_for_known_field', async () => {
    const report = await seedDemo({
      gates: assertGatesStartupSafe(),
      app: api.database.app,
      operator: api.database.operator,
      files: new FileStore(seedFolder),
      uploadGuard: api.services.uploadGuard,
      extractionAccountId: api.extractionAccountId,
      repositoryRoot: REPOSITORY_ROOT,
      log: () => undefined,
    });
    expect(await addToDemoProject(api.database.operator, api.devAccountIds)).toBe(report.projectId);
    for (const step of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const response = await api.app.inject({ method: 'GET', url: `/api/projects/${report.projectId}/steps/${String(step)}`, headers: { ...owner } });
      expect(response.statusCode, `step ${String(step)}: ${response.body}`).toBe(200);
    }
    expect(await defectsOf(report.projectId)).toEqual([]);
  });
});
