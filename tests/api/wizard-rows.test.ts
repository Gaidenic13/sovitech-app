/**
 * Rows the wizard's lists serve (phase 3 part B; the contract additions of docs/adr/0036 decision 11), over a TEST
 * database through the API:
 * - DR-22 (UD-37; PRD R-136): the project list serves each row's stored project type and city as display ids,
 *   resolved like its name, and lists the rows newest first by the store's creation time;
 * - DR-4 (US-DOCS-03 AC1; 2.8, `pending`: "Reading documents…"): on step 2, a stored document being read shows
 *   its progress state with 2.8's pending wording, bound; an upload still being sent has no words of its own;
 * - DR-10 (US-DOCS-01; ADR 0028): a file the fixtures-only guard refuses after its upload id exists is named in the
 *   refusal as a bound display object (`upload:<id>.fileName`), never in the message, and never in the log
 *   (rule 13).
 *
 * TEST accounts and projects only; the uploaded files are a generated synthetic fixture and TEST bytes.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProjectListResponseSchema, RefusalBodySchema, StepResponseSchema } from '@sovitech/view-model/browser';
import { fixtureBytes, signIn, startTestApi, upload, type Auth, type TestApi } from '../guardrails/_support/api';

/** Each test reads and writes a TEST database; under a loaded full run a request can take seconds. */
const LONG = { timeout: 90_000 };

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

async function createProject(payload: Record<string, string>): Promise<string> {
  const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload });
  expect(created.statusCode, created.body).toBe(201);
  return (created.json() as { projectId: string }).projectId;
}

describe('DR-22 · UD-37 · R-136: the project list rows', LONG, () => {
  it('DR-22 · US-ADMIN-05: each row serves its stored project type and city as display ids, and the rows are newest first', async () => {
    const older = await createProject({ name: 'TEST DR-22 older', projectType: 'renovation', countryCode: 'RO', city: 'TEST Brașov' });
    const newer = await createProject({ name: 'TEST DR-22 newer', projectType: 'new_construction', countryCode: 'RO', city: 'TEST Cluj' });
    const list = ProjectListResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/projects', headers: { ...owner } })).json());
    const order = list.projects.map((row) => row.projectId).filter((id) => id === older || id === newer);
    expect(order).toEqual([newer, older]);

    const byId = new Map(list.displayObjects.map((display) => [display.valueId, display]));
    for (const [projectId, city] of [
      [older, 'TEST Brașov'],
      [newer, 'TEST Cluj'],
    ] as const) {
      const row = list.projects.find((entry) => entry.projectId === projectId);
      expect(row?.projectType).toBe(`project:${projectId}.type`);
      expect(row?.city).toBe(`project:${projectId}.city`);
      const type = byId.get(row?.projectType ?? '');
      expect(type?.field?.fieldKey).toBe('project.type');
      expect(type?.badge?.id).toBe('provided_by_you');
      expect(type?.text.length).toBeGreaterThan(0);
      expect(byId.get(row?.city ?? '')).toMatchObject({ text: city, badge: { id: 'provided_by_you' } });
    }
    expect(byId.get(`project:${older}.type`)?.text).not.toBe(byId.get(`project:${newer}.type`)?.text);
  });
});

describe('DR-4 · DR-10 · US-DOCS-03 · US-DOCS-01: step 2\'s file rows', LONG, () => {
  it('DR-4 · US-DOCS-03 AC1 · 2.8: a stored document being read shows "Reading documents…" as its progress, bound', async () => {
    const projectId = await createProject({ name: 'TEST DR-4 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city DR-4' });
    const uploaded = await upload(api, owner, projectId, 'memoriu-tehnic.pdf', fixtureBytes('fixtures/pdf/memoriu-tehnic.pdf'), 4096);
    expect(uploaded.status).toBe(201);
    // No worker runs here: the document stays queued, being read.
    const step2 = StepResponseSchema.parse((await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/2`, headers: { ...owner } })).json());
    if (step2.view.step !== 2) throw new Error('not step 2');
    const [row] = step2.view.files;
    expect(row?.documentId).toBe(uploaded.body.documentId);
    expect(row?.status.kind).toBe('progress');
    const line = row?.status.kind === 'progress' ? row.status.line : undefined;
    expect(line).toBe(`document:${uploaded.body.documentId ?? ''}.coverage`);
    expect(step2.displayObjects.find((display) => display.valueId === line)).toMatchObject({ text: 'Reading documents…', badge: { id: 'reading_documents' } });
  });

  it('DR-10 · ADR 0028 · rule 13: a file the fixtures-only guard refuses is named by a bound display object, never in the message or the log', async () => {
    const projectId = await createProject({ name: 'TEST DR-10 project', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city DR-10' });
    const uploaded = await upload(api, owner, projectId, 'TEST plan DR-10.pdf', Buffer.from('TEST bytes that are not a generated fixture (DR-10)'));
    expect(uploaded.status).toBe(422);
    const refusal = RefusalBodySchema.parse(uploaded.body);
    expect(refusal.code).toBe('not_a_fixture');
    expect(refusal.fileName).toMatch(/^upload:[0-9a-f-]{36}\.fileName$/u);
    expect(refusal.displayObjects).toEqual([expect.objectContaining({ valueId: refusal.fileName, text: 'TEST plan DR-10.pdf' })]);
    expect(refusal.message).not.toContain('DR-10');
    expect(JSON.stringify(api.log)).not.toContain('TEST plan DR-10');
  });
});
