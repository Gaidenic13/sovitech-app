// @vitest-environment happy-dom
/**
 * G3-22 (new in phase 4, part B; for the integrator to index in docs/guardrails.md section 7). Its Expected follows
 * from rule 3, "A suggestion left in place counts as the owner's answer": "On Continue, each suggestion that was
 * visible, labelled and left in place is written as a new `user` candidate, with a `user_confirmed` event and an
 * `accepted_suggestion` event", and "Nothing hidden, collapsed or on another step is accepted this way".
 * Situation: System Scope shows two Suggested systems (HVAC and Lighting, each labelled Suggested with its reason, its
 * switch on); the owner sets the page's system filter (screen 16's "All Systems", built in part B: V-10) to one system,
 * so HVAC's row is hidden, then presses "Save and Continue".
 * Expected: the hidden Suggested system is not reported as visible and is not accepted: "Save and Continue" reports
 * only the suggestions on the rows the filter shows (none at all when the system shown carries no suggestion), so the
 * server, which writes only what is reported (G3-20), writes no answer for the hidden one.
 *
 * Found in part B (V-10): the build had left the approved "All Systems" filter out, its reason being that a hidden
 * row's suggestion could not be left in place visibly; the filter is built, and this case holds the line rule 3 draws.
 *
 * How: the web app's own route table (apps/web/src/routes.tsx) in a memory router, its own API client and the page's
 * own `fetch` (happy-dom's), against a TEST API served over HTTP by this file on 127.0.0.1, which records each request
 * (as G10-12 does). The TEST API stands in at the network boundary for the real one; nothing of the code under test is
 * replaced (no `vi.mock` or `vi.stubGlobal`: tools/checks/index/case-files.ts). The API's half, that a reported visible
 * suggestion is written as the owner's answer and nothing else is, is G3-20. Every name and value here is TEST data,
 * in the contract's shapes (the web's TEST views, apps/web/src/workspace/pages/system-scope/test-views.ts).
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { resetCsrfToken } from '../../apps/web/src/api/client';
import { renderApp } from '../../apps/web/src/test/render-app';
import { systemScopeResponse, type ScopeOptions } from '../../apps/web/src/workspace/pages/system-scope/test-views';
import { frameResponse } from '../../apps/web/src/workspace/test-views';

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a21';
const USER = { userId: '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a22', displayName: 'TEST owner', roles: ['owner'] };
const SCOPE = `/api/projects/${PROJECT}/workspace/system-scope`;
const DECIDE = `${SCOPE}/decisions`;

interface Recorded {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

let server: Server;
let scope: ScopeOptions = {};
const recorded: Recorded[] = [];

function nameDisplay(text: string): DisplayObject {
  return { valueId: `project:${PROJECT}.name`, kind: 'field', text, shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } };
}

const LIST = {
  displayObjects: [nameDisplay('TEST project')],
  projects: [{ projectId: PROJECT, name: `project:${PROJECT}.name`, isDemo: false, demoLine: null }],
};

function routeOf(method: string, path: string): { readonly status: number; readonly body: unknown } {
  if (method === 'GET' && path === '/api/auth/session') return { status: 200, body: { user: USER } };
  if (method === 'GET' && path === '/api/csrf') return { status: 200, body: { token: 'TEST-token' } };
  if (method === 'GET' && path === '/api/projects') return { status: 200, body: LIST };
  if (method === 'GET' && path === `/api/projects/${PROJECT}/workspace`) return { status: 200, body: frameResponse(PROJECT) };
  if (method === 'GET' && path === SCOPE) return { status: 200, body: systemScopeResponse(PROJECT, scope) };
  // The refreshed view the route answers: what the server holds after it (G3-20's half), here as it was.
  if (method === 'POST' && path === DECIDE) return { status: 200, body: systemScopeResponse(PROJECT, scope) };
  return { status: 404, body: { code: 'not_found' } };
}

function answer(request: IncomingMessage, response: ServerResponse): void {
  const chunks: Buffer[] = [];
  request.on('data', (chunk: Buffer) => chunks.push(chunk));
  request.on('end', () => {
    const method = request.method ?? 'GET';
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const text = Buffer.concat(chunks).toString('utf8');
    recorded.push({ method, path, body: text === '' ? undefined : (JSON.parse(text) as unknown) });
    const chosen = routeOf(method, path);
    response.writeHead(chosen.status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(chosen.body));
  });
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
  recorded.length = 0;
  scope = {};
  resetCsrfToken();
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const decisionsSent = () => recorded.filter((request) => request.method === 'POST' && request.path === DECIDE).map((request) => request.body);

function systemNames(): string[] {
  const table = screen.getByRole('table', { name: 'Building systems and whether each is in scope' });
  return within(table)
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent ?? '');
}

/** Zones, opened by "Save and Continue", has read its view (no request is left on its way when the page is cleaned up). */
async function settled(): Promise<void> {
  await screen.findByRole('heading', { level: 1, name: 'Zones' });
  await waitFor(() => expect(recorded.some((request) => request.path === `/api/projects/${PROJECT}/workspace/zones`)).toBe(true));
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
}

/** Opens System Scope, then sets its system filter to one system (the page's "All Systems" dropdown). */
async function openFilteredTo(system: string) {
  const { router } = renderApp(`/projects/${PROJECT}/system-scope`);
  await screen.findByRole('table', { name: 'Building systems and whether each is in scope' });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: /^System/u }));
  fireEvent.click(within(screen.getByRole('listbox', { name: 'System' })).getByRole('option', { name: system }));
  return router;
}

test('G3-22 · rule 3 "Nothing hidden, collapsed or on another step is accepted this way": with the filter on Lighting, Save and Continue reports Lighting\'s visible suggestion only; HVAC\'s, hidden by the filter, is not reported and not accepted', async () => {
  scope = { decisions: { hvac: 'suggested', lighting: 'suggested' } };
  const router = await openFilteredTo('Lighting');
  // HVAC's suggestion is out of sight: its row is not drawn.
  expect(systemNames()).toEqual(['Lighting']);
  expect(document.querySelector(`[data-value-id="project:${PROJECT}.scope.hvac"]`)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }));
  await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/zones`));
  await settled();
  expect(decisionsSent()).toEqual([{ decisions: [], visibleSuggestions: [{ field: { subjectId: PROJECT, fieldKey: 'project.scope.lighting' }, choice: 'include' }] }]);
});

test('G3-22 · rule 3: with the filter on a system that carries no suggestion, Save and Continue reports none: both hidden suggestions stay suggestions, and nothing is written', async () => {
  scope = { decisions: { hvac: 'suggested', lighting: 'suggested', energy: 'include' } };
  const router = await openFilteredTo('Energy');
  expect(systemNames()).toEqual(['Energy']);
  fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }));
  await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/zones`));
  await settled();
  expect(decisionsSent()).toEqual([]);
  expect(recorded.filter((request) => request.method !== 'GET')).toEqual([]);
});
