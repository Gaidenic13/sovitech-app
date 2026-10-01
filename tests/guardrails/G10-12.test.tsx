// @vitest-environment happy-dom
/**
 * G10-12 (new in phase 3, part B; for the integrator to index in docs/guardrails.md section 7). Its
 * Expected follows from rule 10, "Demo data": "Demo projects are flagged `demo`. Every screen and
 * export for them shows 'Demo data, not an assessment of the real building'", with 2.8's demo line,
 * and from the first promise (a demo value read without its label reads as a real building's).
 * US-INTAKE-01 AC8 names the loading and error states of every screen; US-REVIEW-03 AC1, AC7.
 * Situation: the demo project, once a response of the page session has said it is the demo (its
 * row in the project list), then one of its screens while its own requests are still pending, and
 * while the step view and the project list both fail; and a project that is not flagged demo in the
 * same states.
 * Expected: every such screen of the demo project shows the demo line, the line the API served; no
 * screen of the other project shows it.
 *
 * Found in part B (V-1, A-10): the web took the demo line only from `GET /api/projects` or the step
 * envelope, so with both pending or both failing the demo's step 3 showed none.
 *
 * How: the web app's own route table (apps/web/src/routes.tsx) in a memory router, its own API
 * client and the page's own `fetch` (happy-dom's), against a TEST API served over HTTP by this file
 * on 127.0.0.1. The TEST API stands in at the network boundary for the real one (a dependency handed
 * in, as the extractor's ScriptedRunner is in tests/guardrails/_support/api.ts), holding a request or
 * failing it on demand; nothing of the code under test is replaced (no `vi.mock` or `vi.stubGlobal`:
 * tools/checks/index/case-files.ts). The API's own half, which responses carry the line, is G10-10.
 * Every name and value here is TEST data; the demo line is the registry's 2.8 line.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { statusLineById } from '@sovitech/registry';
import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import { resetCsrfToken } from '../../apps/web/src/api/client';
import { renderApp } from '../../apps/web/src/test/render-app';

const DEMO = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a01';
const OWN = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a02';
const USER = { userId: '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a03', displayName: 'TEST owner', roles: ['owner'] };
const AS_OF = '2026-10-01T10:00:00.000Z';
const DEMO_LINE: Line = { id: 'demo_data', kind: 'demo_line', text: statusLineById('demo_data').text };

/** How the TEST API answers one route: a status and a body, or never (the request stays pending until the test ends). */
type Answer = { readonly status: number; readonly body: unknown } | 'pending';

const answers = new Map<string, Answer>();
let server: Server;
const held = new Set<ServerResponse>();

function nameDisplay(projectId: string, text: string): DisplayObject {
  return { valueId: `project:${projectId}.name`, kind: 'field', text, shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } };
}

function listOf(...projects: ReadonlyArray<{ readonly projectId: string; readonly name: string; readonly demo: boolean }>) {
  return {
    displayObjects: projects.map((project) => nameDisplay(project.projectId, project.name)),
    projects: projects.map((project) => ({ projectId: project.projectId, name: `project:${project.projectId}.name`, isDemo: project.demo, demoLine: project.demo ? DEMO_LINE : null })),
  };
}

const BOTH = listOf({ projectId: DEMO, name: 'TEST demo project', demo: true }, { projectId: OWN, name: 'TEST own project', demo: false });

/** Step 3 of a project as the API would serve it: nothing found yet (the TEST view's facts are empty). */
function stepThree(projectId: string, demo: boolean) {
  const name = nameDisplay(projectId, demo ? 'TEST demo project' : 'TEST own project');
  return {
    asOf: AS_OF,
    project: { projectId, name: name.valueId, isDemo: demo, demoLine: demo ? DEMO_LINE : null },
    displayObjects: [name],
    view: {
      step: 3,
      intro: 'no_documents',
      summary: [],
      details: [],
      confirmationCount: null,
      forYouRow: null,
      files: [],
      viewer: { state: 'no_model', line: { id: 'not_available_yet_named', kind: 'rule_line', text: 'TEST model missing line' }, addModelOnStep: 2 },
    },
  };
}

function answer(request: IncomingMessage, response: ServerResponse): void {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  const key = `${request.method ?? 'GET'} ${path}`;
  const defaults: Record<string, Answer> = {
    'GET /api/auth/session': { status: 200, body: { user: USER } },
    'GET /api/csrf': { status: 200, body: { token: 'TEST-token' } },
    [`GET /api/projects/${DEMO}/late-findings`]: { status: 200, body: { asOf: AS_OF, displayObjects: [], dots: [], notice: null } },
    [`GET /api/projects/${OWN}/late-findings`]: { status: 200, body: { asOf: AS_OF, displayObjects: [], dots: [], notice: null } },
  };
  const chosen = answers.get(key) ?? defaults[key] ?? { status: 404, body: { code: 'not_found' } };
  if (chosen === 'pending') {
    held.add(response);
    response.on('close', () => held.delete(response));
    return;
  }
  response.writeHead(chosen.status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(chosen.body));
}

beforeAll(async () => {
  server = createServer(answer);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('the TEST API has no port');
  // The page's origin is the TEST API's, so the app's same-origin `/api` requests reach it.
  (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(`http://127.0.0.1:${String(address.port)}/`);
});

afterEach(() => {
  cleanup();
  answers.clear();
  resetCsrfToken();
  // A held request is answered only now, after the page that sent it is gone.
  for (const response of held) response.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ code: 'internal_error' }));
  held.clear();
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

function open(path: string) {
  return renderApp(path).router;
}

const demoLines = () => [...document.querySelectorAll('[data-demo-line]')];

/** The list is read once (the session learns each row's flag), then every later request is held or failed. */
async function learnFromTheList(): Promise<ReturnType<typeof open>> {
  answers.set('GET /api/projects', { status: 200, body: BOTH });
  const router = open('/projects');
  await screen.findByRole('list', { name: 'Your projects' });
  expect(demoLines()).toHaveLength(1);
  return router;
}

test('G10-12 · rule 10 · US-INTAKE-01 AC8: the demo project, known from the list, shows the demo line on step 3 while the step view and the list are both still pending', async () => {
  const router = await learnFromTheList();
  answers.set('GET /api/projects', 'pending');
  answers.set(`GET /api/projects/${DEMO}/steps/3`, 'pending');
  await router.navigate(`/projects/${DEMO}/steps/3`);
  await screen.findByRole('heading', { level: 1, name: 'Your building' });
  expect(screen.getByText('Loading your answers')).toBeTruthy();
  const lines = demoLines();
  expect(lines).toHaveLength(1);
  expect(lines[0]?.textContent).toBe(DEMO_LINE.text);
});

test('G10-12 · rule 10 · US-INTAKE-01 AC8: once the flag is known, the demo line stays when the step view and the list both fail, on step 3 and on the step the list\'s Open leads to', async () => {
  const router = await learnFromTheList();
  answers.set('GET /api/projects', { status: 500, body: { code: 'internal_error' } });
  answers.set(`GET /api/projects/${DEMO}/steps/3`, { status: 500, body: { code: 'internal_error' } });
  await router.navigate(`/projects/${DEMO}/steps/3`);
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(demoLines().map((line) => line.textContent)).toEqual([DEMO_LINE.text]);

  // The owner's own path: a new page session, the list answers once, Open is pressed, and then the
  // list and the step Open leads to both fail.
  cleanup();
  answers.clear();
  answers.set('GET /api/projects', { status: 200, body: BOTH });
  open('/projects');
  const row = await screen.findByRole('link', { name: /TEST demo project/u });
  answers.set('GET /api/projects', { status: 500, body: { code: 'internal_error' } });
  answers.set(`GET /api/projects/${DEMO}/steps/1`, { status: 500, body: { code: 'internal_error' } });
  fireEvent.click(row);
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(demoLines().map((line) => line.textContent)).toEqual([DEMO_LINE.text]);
});

test('G10-12 · rule 10 · US-REVIEW-03 AC7 · G10-10 (web half): a project not flagged demo shows no demo line while loading, after a failure or once loaded, in a session that knows the demo', async () => {
  const router = await learnFromTheList();
  answers.set('GET /api/projects', 'pending');
  answers.set(`GET /api/projects/${OWN}/steps/3`, 'pending');
  await router.navigate(`/projects/${OWN}/steps/3`);
  await screen.findByRole('heading', { level: 1, name: 'Your building' });
  expect(screen.getByText('Loading your answers')).toBeTruthy();
  expect(demoLines()).toHaveLength(0);

  // The same session, both failing: the project's screens open again with nothing answered.
  answers.set('GET /api/projects', { status: 500, body: { code: 'internal_error' } });
  answers.set(`GET /api/projects/${OWN}/steps/3`, { status: 500, body: { code: 'internal_error' } });
  await router.navigate('/projects');
  await screen.findByRole('button', { name: 'Try again' });
  await router.navigate(`/projects/${OWN}/steps/3`);
  await screen.findByRole('heading', { level: 1, name: 'Your building' });
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(demoLines()).toHaveLength(0);

  answers.set(`GET /api/projects/${OWN}/steps/3`, { status: 200, body: stepThree(OWN, false) });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('region', { name: 'Building model' });
  await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${OWN}/steps/3`));
  expect(demoLines()).toHaveLength(0);
});
