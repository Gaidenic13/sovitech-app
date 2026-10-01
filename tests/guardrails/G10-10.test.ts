/**
 * G10-10 (new in phase 3, indexed in docs/guardrails.md section 7 at v1.8; its Expected follows from
 * rule 10, "Demo data": "Demo projects are flagged `demo`. Every screen and export for them shows
 * 'Demo data, not an assessment of the real building'", with the first promise ("every value is true
 * or honestly labelled": the line on another project would label its values as demo data); 2.8's
 * demo line; US-REVIEW-03 AC1, AC7; PRD R-044, R-136).
 * Situation: a project that is not flagged `demo`.
 * Expected: no screen of it, and not its row in the project list, shows the demo line.
 *
 * The second test is the control: the demo project, seen by the same development account, carries it
 * on every screen response and on its row.
 *
 * Over a TEST database: a TEST demo project made by a TEST seed account (the store flags a project demo
 * only for the seed, ADR 0015), with the TEST development owner added as a member on the operator's
 * login, as the development accounts' CLI does (PRD R-136 interim), and a project the development owner
 * creates through step 1. Every screen route of the contract (the project list, the eight steps, UD-45,
 * the proposal page, and late findings, which carries no header) is read for both.
 */
import { afterAll, beforeAll, expect, test } from 'vitest';
import { addProjectMember } from '@sovitech/db';
import { createTestAccount, createTestProject } from '@sovitech/db/testing';
import { statusLineById } from '@sovitech/registry';
import { ProjectListResponseSchema } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

let api: TestApi;
let owner: Auth;
let demoId: string;
let ownProjectId: string;

const DEMO_LINE = statusLineById('demo_data').text;
const SCREENS = ['steps/1', 'steps/2', 'steps/3', 'steps/4', 'steps/5', 'steps/6', 'steps/7', 'steps/8', 'extracted', 'proposal'] as const;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
  const [ownerId] = api.devAccountIds;
  if (ownerId === undefined) throw new Error('no TEST development owner');
  const seed = await createTestAccount(api.database, { label: 'G10-10 demo seed', kind: 'seed', roles: ['owner'] });
  demoId = await createTestProject(api.database, { ownerId: seed, isDemo: true });
  await addProjectMember(api.database.operator.db, { projectId: demoId, userId: ownerId });
  owner = await signIn(api, ownerId);
  const created = await api.app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: { ...owner },
    payload: { name: 'TEST G10-10 project', projectType: 'existing_building', countryCode: 'RO', city: 'TEST city G10-10' },
  });
  ownProjectId = (created.json() as { projectId: string }).projectId;
}, 180_000);

afterAll(async () => {
  await api.stop();
});

async function screen(projectId: string, path: string): Promise<{ readonly status: number; readonly body: string; readonly json: { project?: { isDemo: boolean; demoLine: { text: string } | null } } }> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/${path}`, headers: { ...owner } });
  return { status: response.statusCode, body: response.body, json: response.json() };
}

test('G10-10 · rule 10 · US-REVIEW-03 AC7: no screen response of a project not flagged demo carries the demo line', async () => {
  for (const path of SCREENS) {
    const read = await screen(ownProjectId, path);
    expect(read.status, `${path}: ${read.body}`).toBe(200);
    expect(read.json.project?.isDemo).toBe(false);
    expect(read.json.project?.demoLine).toBeNull();
    expect(read.body.includes(DEMO_LINE), path).toBe(false);
  }
  const findings = await screen(ownProjectId, 'late-findings?current=1');
  expect(findings.body.includes(DEMO_LINE)).toBe(false);
  const list = ProjectListResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/projects', headers: { ...owner } })).json());
  expect(list.projects.find((row) => row.projectId === ownProjectId)?.demoLine).toBeNull();
});

test('G10-10 · rule 10 · US-REVIEW-03 AC1 · R-136: every screen response of the demo project, and its list row, carries the demo line', async () => {
  for (const path of SCREENS) {
    const read = await screen(demoId, path);
    expect(read.status, `${path}: ${read.body}`).toBe(200);
    expect(read.json.project?.isDemo).toBe(true);
    expect(read.json.project?.demoLine?.text).toBe(DEMO_LINE);
  }
  const list = ProjectListResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/projects', headers: { ...owner } })).json());
  const row = list.projects.find((entry) => entry.projectId === demoId);
  expect(row?.isDemo).toBe(true);
  expect(row?.demoLine?.text).toBe(DEMO_LINE);
});
