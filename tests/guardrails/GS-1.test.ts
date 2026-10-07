/**
 * GS-1 (docs/guardrails.md section 7; section 4, the Speed Rule: "A question asked for something the app already knew
 * is a defect, and is logged as one"; rule 10, "Demo data": "Every screen and export for them shows 'Demo data, not an
 * assessment of the real building'"; PRD R-137, R-142; prompt 3 section 10, phase 7's exit).
 * Situation: the demo fixture runs end to end.
 * Expected: zero `question_for_known_field` events. The demo banner is on every screen.
 *
 * This file is the API half (phase 7 plan, B2): the demo is seeded as tests/api/wizard-demo.test.ts seeds it (the demo
 * seed over a TEST database, its analysis left queued: no extractor sandbox here), the TEST development owner is made a
 * member as the development accounts' CLI does, and the owner reads every project screen the contract serves display
 * objects for (every GET route under /api/projects/:projectId marked `servesDisplayObjects`), on the demo, after
 * Continue on each step with the seeded answers as shown and after Generate (the stored proposal the proposal, print
 * and Metrics routes read). Each screen's envelope names the demo and carries 2.8's demo line; then the store holds no
 * `question_for_known_field` and no `confirmation_budget_exceeded` event for the demo. The rendered half (every
 * screen through the render test, axe, the reserved-term scan and the demo line) is the integrator's e2e flow (m).
 *
 * Two routes are not screens and carry no project header: the late-findings ledger (a notice the step screens show,
 * US-INTAKE-19), and an asset's record when the demo lists no asset (its analysis is queued here, so the register is
 * empty: no asset id to ask for). The first is asked for and checked for its demo-free shape; the second is asked for
 * whenever Equipment lists a row. A coverage check fails when a GET route that serves display objects is neither asked
 * for nor named here.
 */
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { statusLineById } from '@sovitech/registry';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { DocumentsResponseSchema, EquipmentResponseSchema, GenerateResponseSchema, ROUTES, StepResponseSchema } from '@sovitech/view-model/browser';
import { addToDemoProject } from '../../apps/api/src/cli/dev-accounts';
import { seedDemo, type DemoSeedReport } from '../../apps/api/src/seed/demo-seed';
import { FileStore } from '../../apps/api/src/storage/file-store';
import { REPOSITORY_ROOT, signIn, startTestApi, type Auth, type TestApi } from './_support/api';

const LONG = { timeout: 180_000 };
const DEMO_LINE = statusLineById('demo_data').text;
const P = '/api/projects/:projectId';

let api: TestApi;
let owner: Auth;
let report: DemoSeedReport;
let seedFolder: string;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  seedFolder = mkdtempSync(join(tmpdir(), 'sovitech-test-gs-1-'));
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

const url = (path: string): string => `/api/projects/${report.projectId}/${path}`;

async function getJson(path: string): Promise<Record<string, unknown>> {
  const response = await api.app.inject({ method: 'GET', url: url(path), headers: { ...owner } });
  expect(response.statusCode, `${path}: ${response.body}`).toBe(200);
  return response.json();
}

async function defects(): Promise<{ type: string }[]> {
  return api.database.asAdministrator<{ type: string }>(
    `SELECT type FROM sovitech.guardrail_events WHERE project_id = $1 AND type IN ('question_for_known_field', 'confirmation_budget_exceeded') ORDER BY type`,
    [report.projectId],
  );
}

describe('GS-1 · section 4 · rule 10 · R-137 · R-142 (the API half)', LONG, () => {
  it('GS-1: every project screen of the demo names the demo and carries the demo line, and the demo logs no question for a known field and no confirmation over the budget', async () => {
    // The demo end to end: Continue on each step with the seeded answers as shown (nothing new is written), then Generate.
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const view = StepResponseSchema.parse(await getJson(`steps/${String(n)}`)).view;
      const multi =
        view.step === 4
          ? [{ questionId: view.question.questionId, ticked: view.systems.filter((system) => system.selected).map((system) => `project.scope.${system.systemId}`) }]
          : view.step === 6 || view.step === 7
            ? [{ questionId: view.question.questionId, ticked: view.question.options.filter((option) => option.selected).map((option) => option.key) }]
            : [];
      const questions = view.step === 5 ? view.questions.map((question) => question.questionId) : multi.map((entry) => entry.questionId);
      const continued = await api.app.inject({ method: 'POST', url: url(`steps/${String(n)}/continue`), headers: { ...owner }, payload: { answers: [], multi, visibleSuggestions: [], shown: { questions, confirmations: [] } } });
      expect(continued.statusCode, `step ${String(n)}: ${continued.body}`).toBe(200);
    }
    const generated = await api.app.inject({ method: 'POST', url: url('proposals'), headers: { ...owner }, payload: {} });
    expect(generated.statusCode, generated.body).toBe(201);
    const { snapshotId } = GenerateResponseSchema.parse(generated.json());

    const documents = DocumentsResponseSchema.parse(await getJson('workspace/documents'));
    const documentId = documents.view.rows[0]?.documentId;
    if (documentId === undefined) throw new Error('the demo lists no document');
    const equipment = EquipmentResponseSchema.parse(await getJson('workspace/equipment'));
    const assetId = equipment.view.rows[0]?.assetId;

    // Every screen (route id → the path asked for).
    const screens = new Map<string, readonly string[]>([
      ['steps.view', [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `steps/${String(n)}`)],
      ['extracted.view', ['extracted']],
      ['proposal.preview', ['proposal']],
      ['workspace.frame', ['workspace']],
      ['workspace.documents', ['workspace/documents']],
      ['workspace.documents.deleteEffect', [`workspace/documents/${documentId}/delete-effect`]],
      ['workspace.systemScope', ['workspace/system-scope']],
      ['workspace.equipment', ['workspace/equipment']],
      ['workspace.asset', assetId === undefined ? [] : [`workspace/equipment/${assetId}`]],
      ['workspace.zones', ['workspace/zones']],
      ['workspace.topology', ['workspace/topology']],
      ['proposals.list', ['proposals']],
      ['proposals.view', [`proposals/${snapshotId}`]],
      ['proposals.print', [`proposals/${snapshotId}/print`]],
      ['reports.list', ['reports']],
      ['metrics.financialOverview', ['metrics/financial-overview']],
      ['metrics.capex', ['metrics/capex']],
      ['metrics.opex', ['metrics/opex']],
      ['metrics.payback', ['metrics/payback']],
      ['metrics.lifecycle', ['metrics/lifecycle']],
      ['metrics.payback.print', [`metrics/payback/print?snapshot=${snapshotId}`]],
      ['metrics.lifecycle.print', [`metrics/lifecycle/print?snapshot=${snapshotId}`]],
    ]);
    const notScreens = new Map<string, string>([['lateFindings', 'late-findings?current=8']]);

    // Coverage: every GET route of a project that serves display objects is asked for here, or named as no screen.
    const served = ROUTES.filter((route) => route.method === 'GET' && route.servesDisplayObjects && route.path.startsWith(P)).map((route) => route.id);
    expect([...served].sort()).toEqual([...screens.keys(), ...notScreens.keys()].sort());

    for (const [routeId, paths] of screens) {
      for (const path of paths) {
        const body = await getJson(path);
        expect(body['project'], `${routeId}: ${path}`).toMatchObject({ projectId: report.projectId, isDemo: true, demoLine: { kind: 'demo_line', text: DEMO_LINE } });
      }
    }
    for (const [routeId, path] of notScreens) {
      const body = await getJson(path);
      expect(body['project'], `${routeId}: ${path}`).toBeUndefined();
    }

    expect(await defects()).toEqual([]);
  });
});
