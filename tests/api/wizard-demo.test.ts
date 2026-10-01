/**
 * The demo project through the wizard API (prompt 3 phase 3 exit (a), at the API level; GS-1's
 * "zero `question_for_known_field` events. The demo banner is on every screen"; rule 10, "Demo data";
 * PRD R-044, R-136, R-137; docs/adr/0037, 0038). The demo seed builds the demo on a TEST database
 * with its analysis left queued (no sandbox runner here: the e2e setup runs the extractor), and the
 * development accounts' CLI function adds the TEST development owner as a member, as the e2e setup
 * does. The owner then reads every step and presses Continue on each with the seeded answers as shown:
 * nothing new is written, nothing is asked that is known, and every screen carries the demo line.
 */
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { statusLineById } from '@sovitech/registry';
import { ProjectListResponseSchema, StepResponseSchema, type StepResponse } from '@sovitech/view-model/browser';
import { DEV_OWNER_NAME, addToDemoProject, ensureDevOwner } from '../../apps/api/src/cli/dev-accounts';
import { DEMO_WORKING_NAME } from '../../apps/api/src/seed/owner-answers';
import { seedDemo, type DemoSeedReport } from '../../apps/api/src/seed/demo-seed';
import { FileStore } from '../../apps/api/src/storage/file-store';
import { REPOSITORY_ROOT, signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';

/** Each test reads and writes a TEST database; under a loaded full run a read can take seconds. */
const LONG = { timeout: 60_000 };

const DEMO_LINE = statusLineById('demo_data').text;

let api: TestApi;
let owner: Auth;
let report: DemoSeedReport;
let seedFolder: string;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  seedFolder = mkdtempSync(join(tmpdir(), 'sovitech-test-wizard-demo-'));
  report = await seedDemo({
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
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  owner = await signIn(api, ownerId);
}, 240_000);

afterAll(async () => {
  await api.stop();
  await rm(seedFolder, { recursive: true, force: true });
});

async function step(n: number): Promise<StepResponse> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${report.projectId}/steps/${String(n)}`, headers: { ...owner } });
  expect(response.statusCode, response.body).toBe(200);
  return StepResponseSchema.parse(response.json());
}

function continueWith(n: number, payload: Record<string, unknown>) {
  return api.app.inject({ method: 'POST', url: `/api/projects/${report.projectId}/steps/${String(n)}/continue`, headers: { ...owner }, payload });
}

describe('prompt 3 phase 3 exit (a) at the API · GS-1 · R-137: the demo project from step 1 to step 8', LONG, () => {
  it('US-ADMIN-15 · R-136 interim: the development owner\'s list holds the demo under its working name, with the demo line', async () => {
    const list = ProjectListResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/projects', headers: { ...owner } })).json());
    const row = list.projects.find((entry) => entry.projectId === report.projectId);
    expect(row?.isDemo).toBe(true);
    expect(row?.demoLine?.text).toBe(DEMO_LINE);
    expect(list.displayObjects.find((display) => display.valueId === row?.name)?.text).toBe(DEMO_WORKING_NAME);
  });

  it('GS-1 · US-REVIEW-03 AC1: every step carries the demo line; step 2 lists the ten fixture files; step 3 names the stored models and no viewer', async () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const view = await step(n);
      expect(view.project.demoLine?.text, `step ${String(n)}`).toBe(DEMO_LINE);
    }
    const two = await step(2);
    if (two.view.step !== 2) throw new Error('step 2');
    expect(two.view.files).toHaveLength(10);
    const three = await step(3);
    if (three.view.step !== 3) throw new Error('step 3');
    expect(three.view.viewer.state).toBe('model_stored');
    expect(three.view.viewer.line.text).toBe('Not analysed: IFC model stored, not analysed');
    const lines = three.view.files.map((id) => three.displayObjects.find((display) => display.valueId === id)?.text);
    expect(lines.filter((text) => text === 'Not analysed: IFC model stored, not analysed')).toHaveLength(2);
    // With the analysis queued, the documents are still being read (rule 7): step 3's intro says so, and no value is a document's.
    expect(three.view.intro).toBe('reading');
  });

  it('DR-25 · US-SCOPE-01 AC10 · rule 12: the demo has documents, none of which names a system, so step 4 serves the none-named subtitle', async () => {
    const four = await step(4);
    if (four.view.step !== 4) throw new Error('step 4');
    expect(four.view.subtitle).toBe('none_named');
  });

  it('GS-1 · rule 5 · US-SCOPE-02 AC9: Continue on each step with the seeded answers as shown writes nothing, asks nothing known, and reaches the proposal page', async () => {
    const before = await api.database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.candidates WHERE project_id = $1', [report.projectId]);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const view = await step(n);
      const multi =
        view.view.step === 4 || view.view.step === 6 || view.view.step === 7
          ? [
              {
                questionId: view.view.step === 4 ? view.view.question.questionId : view.view.question.questionId,
                ticked:
                  view.view.step === 4
                    ? view.view.systems.filter((system) => system.selected).map((system) => `project.scope.${system.systemId}`)
                    : view.view.question.options.filter((option) => option.selected).map((option) => option.key),
              },
            ]
          : [];
      const questions = view.view.step === 5 ? view.view.questions.map((question) => question.questionId) : multi.map((entry) => entry.questionId);
      const response = await continueWith(n, { answers: [], multi, visibleSuggestions: [], shown: { questions, confirmations: [] } });
      expect(response.statusCode, `step ${String(n)}: ${response.body}`).toBe(200);
    }
    const after = await api.database.asAdministrator<{ count: number }>('SELECT count(*)::int AS count FROM sovitech.candidates WHERE project_id = $1', [report.projectId]);
    expect(after).toEqual(before);
    const known = await api.database.asAdministrator(`SELECT id FROM sovitech.guardrail_events WHERE project_id = $1 AND type = 'question_for_known_field'`, [report.projectId]);
    expect(known).toEqual([]);
    const proposal = await api.app.inject({ method: 'GET', url: `/api/projects/${report.projectId}/proposal`, headers: { ...owner } });
    expect(proposal.statusCode).toBe(200);
    expect((proposal.json() as { project: { demoLine: { text: string } } }).project.demoLine.text).toBe(DEMO_LINE);
  });
});

describe('ADR 0038: the development accounts\' CLI functions', LONG, () => {
  it('ADR 0038 · R-136 interim: the development owner is created once, holds owner once, and is added to the demo once', async () => {
    const first = await ensureDevOwner(api.database.operator);
    const second = await ensureDevOwner(api.database.operator);
    expect(second).toBe(first);
    const [account] = await api.database.asAdministrator<{ display_name: string; kind: string }>('SELECT display_name, kind FROM sovitech.app_users WHERE id = $1', [first]);
    expect(account).toEqual({ display_name: DEV_OWNER_NAME, kind: 'person' });
    const grants = await api.database.asAdministrator('SELECT id FROM sovitech.app_role_events WHERE user_id = $1', [first]);
    expect(grants).toHaveLength(1);
    expect(await addToDemoProject(api.database.operator, [first])).toBe(report.projectId);
    expect(await addToDemoProject(api.database.operator, [first])).toBe(report.projectId);
    const members = await api.database.asAdministrator('SELECT user_id FROM sovitech.project_members WHERE project_id = $1 AND user_id = $2', [report.projectId, first]);
    expect(members).toHaveLength(1);
  });
});
