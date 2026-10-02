// @vitest-environment happy-dom
/**
 * G11-11 (new in phase 4; rule 11, "Read-only by default. The BMS may monitor their status and alarms. It never
 * commands, resets, inhibits, delays or overrides them" and "Fire mode is hardwired and wins"; section 5 step 4: the
 * scope text "monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system";
 * dashboards-spec 7.1-r18 and 7.1.1-L4; PRD R-072).
 * Situation: Topology with Fire Safety and HVAC included.
 * Expected: Fire Safety is its own group, with "monitoring only (read-only); fire logic and fire-mode interlocks remain
 * in the fire system" and a link in the monitoring direction only, never a control command.
 *
 * Both halves are here (phase 4 part B, V-12: the file held only the view-model half, and the link was asserted only
 * in TopologyPage.test.tsx and the e2e flows, which the index does not count):
 * - the view-model half (packages/view-model/src/workspace/topology.ts): the view marks the life-safety group
 *   `monitoringOnly`, never joins it to another group, and serves no control, command, interlock or setpoint for it;
 *   the catalogue text is checked word for word;
 * - the rendered half: the app's own Topology page (apps/web/src/routes.tsx in a memory router, its own API client and
 *   happy-dom's own `fetch`) against that same view, served over HTTP on 127.0.0.1 by this file the way the API
 *   answers it (the envelope of apps/api/src/workspace/service.ts around `topologyView` and `frameView` of the TEST
 *   project). Nothing of the code under test is replaced (no `vi.mock` or `vi.stubGlobal`:
 *   tools/checks/index/case-files.ts). The page draws Fire Safety alone in its monitoring lane, with exactly one link,
 *   in the monitoring direction (`data-direction="to-bms"`), and no control of any kind in that lane.
 * Every name and value here is TEST data; the decisions are the owner's own TEST answers.
 */
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { URL as NodeUrl } from 'node:url';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { SYSTEMS, productionRegistry, scopeFieldKey } from '@sovitech/registry';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { frameView, topologyView, type Built } from '@sovitech/view-model/server';
import { resetCsrfToken } from '../../apps/web/src/api/client';
import { renderApp } from '../../apps/web/src/test/render-app';
import { ownerAnswer, ownerConfirmation } from './_support/builders';
import { uuid } from './_support/view-model';
import { shownTexts, testWorkspace, type TestSubjectField } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const USER = { userId: uuid(3), displayName: 'TEST owner', roles: ['owner'] };
const AS_OF = '2026-10-02T10:00:00.000Z';
const MONITORING_ONLY = 'monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system';

function included(systems: readonly string[]): TestSubjectField[] {
  return productionRegistry.fields
    .filter((field) => field.key.startsWith('project.scope.'))
    .map((field, index) => {
      if (!systems.some((system) => scopeFieldKey(system) === field.key)) return { field, subjectId: PROJECT, subjectKind: 'project' as const };
      const own = ownerAnswer({ id: uuid(100 + index), subjectId: PROJECT, field, value: { choice: 'include' }, minute: 1 });
      return { field, subjectId: PROJECT, subjectKind: 'project' as const, candidates: [own], candidateEvents: [ownerConfirmation(own)] };
    });
}

/** The TEST project of the Situation: HVAC and Fire Safety included by the owner, every other system undecided. */
const PROJECT_STATE = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, fields: included(['fire_safety', 'hvac']) });

test('US-TOPO-05 · R-072 · G11-11: with Fire Safety and HVAC included, Fire Safety is its own group, monitoring only, never joined to HVAC, with no control served', () => {
  const { view, displayObjects } = topologyView(PROJECT_STATE);
  expect(view.groups.map((group) => [group.systemId, group.monitoringOnly])).toEqual([
    ['hvac', false],
    ['fire_safety', true],
  ]);
  // Its own group: a group names one system; nothing joins groups (the view carries no link or relation between them).
  for (const group of view.groups) expect(Object.keys(group).sort()).toEqual(['decision', 'equipment', 'monitoringOnly', 'systemId']);
  expect(Object.keys(view).sort()).toEqual(['design', 'groups', 'levels', 'noDecision']);
  // No control of a life-safety system is served anywhere in the response (rule 11's four verbs only).
  for (const text of shownTexts(displayObjects)) expect(text).not.toMatch(/\b(control(s|led|ler)?|command|reset|inhibit|override|setpoint|interlock)\b/iu);
  // Every life-safety system the catalogue holds is drawn monitoring only.
  expect(SYSTEMS.filter((system) => system.lifeSafety).map((system) => system.id)).toEqual(['fire_safety']);
});

test('§5-4b · G11-11: the monitoring-only text the page shows for Fire Safety is the catalogue\'s, word for word', () => {
  const catalogue = JSON.parse(readFileSync(new NodeUrl('../../apps/web/src/copy/en.json', import.meta.url), 'utf8')) as { systems?: { fire_safety?: { description?: string } } };
  expect((catalogue.systems?.fire_safety?.description ?? '').toLowerCase()).toContain(MONITORING_ONLY);
});

// ---- The rendered half: the app's Topology page against the served view ------------------------------------------

/** The project name's display, as the envelope carries it (a TEST name the owner entered on step 1). */
const NAME: DisplayObject = { valueId: `project:${PROJECT}.name`, kind: 'field', text: 'TEST project', shape: 'value', badge: { id: 'provided_by_you', label: 'Provided by you' } };

/** A workspace response as the API serves it: the envelope (name, no demo line: not the demo) around a built view. */
function served<View>(built: Built<View>) {
  return {
    asOf: AS_OF,
    project: { projectId: PROJECT, name: NAME.valueId, isDemo: false, demoLine: null },
    displayObjects: [NAME, ...built.displayObjects],
    view: built.view,
  };
}

function answer(request: IncomingMessage, response: ServerResponse): void {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const key = `${request.method ?? 'GET'} ${url.pathname}`;
  const level = url.searchParams.get('level');
  const answers: Record<string, () => unknown> = {
    'GET /api/auth/session': () => ({ user: USER }),
    'GET /api/csrf': () => ({ token: 'TEST-token' }),
    'GET /api/projects': () => ({
      displayObjects: [NAME],
      projects: [{ projectId: PROJECT, name: NAME.valueId, isDemo: false, demoLine: null }],
    }),
    [`GET /api/projects/${PROJECT}/workspace`]: () => served(frameView(PROJECT_STATE)),
    [`GET /api/projects/${PROJECT}/workspace/topology`]: () => served(topologyView(PROJECT_STATE, level === null ? {} : { level })),
  };
  const body = answers[key];
  response.writeHead(body === undefined ? 404 : 200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body === undefined ? { code: 'not_found' } : body()));
}

let server: Server;

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
  resetCsrfToken();
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test('US-TOPO-05 AC1 · AC3 · R-072 · 7.1-r18 · 7.1.1-L4 · G11-11 (rendered half): the Topology page draws Fire Safety alone in its monitoring lane, with the monitoring-only text and exactly one link, in the monitoring direction only; HVAC stays out of the lane and no control is drawn', async () => {
  renderApp(`/projects/${PROJECT}/topology`);
  await screen.findByRole('heading', { name: 'Topology', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-topology-group]')).toHaveLength(2));
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));

  // Fire Safety is its own group, and the only one in the monitoring lane.
  const lanes = [...document.querySelectorAll<HTMLElement>('[data-monitoring-lane]')];
  expect(lanes).toHaveLength(1);
  const lane = lanes[0];
  if (lane === undefined) throw new Error('no monitoring lane');
  expect([...lane.querySelectorAll('[data-topology-group]')].map((group) => group.getAttribute('data-topology-group'))).toEqual(['fire_safety']);
  const fire = lane.querySelector<HTMLElement>('[data-topology-group="fire_safety"]');
  expect(fire?.getAttribute('data-monitoring-only')).toBe('true');
  expect((fire?.textContent ?? '').toLowerCase()).toContain(MONITORING_ONLY);
  const hvac = document.querySelector<HTMLElement>('[data-topology-group="hvac"]');
  expect(hvac).not.toBeNull();
  expect(hvac?.closest('[data-monitoring-lane]')).toBeNull();
  expect(hvac?.getAttribute('data-monitoring-only')).toBe('false');

  // Exactly one link on the page: Fire Safety's, in the monitoring direction (status and alarms to the BMS), in the lane.
  const links = [...document.querySelectorAll<HTMLElement>('[data-monitoring-link]')];
  expect(links).toHaveLength(1);
  expect(document.querySelectorAll('[data-monitoring-link][data-direction="to-bms"]')).toHaveLength(1);
  const link = links[0];
  expect(link === undefined ? false : lane.contains(link)).toBe(true);
  expect(link?.closest('[data-topology-group]')?.getAttribute('data-topology-group')).toBe('fire_safety');
  // No link or direction in any other sense anywhere on the page (never a control command).
  expect([...document.querySelectorAll('[data-direction]')].map((element) => element.getAttribute('data-direction'))).toEqual(['to-bms']);
  expect(hvac?.querySelector('[data-monitoring-link]')).toBeNull();

  // Nothing in the lane can be pressed or set: no button, switch, input or menu, and no control wording.
  expect(lane.querySelectorAll('button, input, select, textarea, [role="switch"], [role="menu"], [role="slider"]')).toHaveLength(0);
  expect(lane.textContent ?? '').not.toMatch(/\b(commands?|controls?|controlled|controller|resets?|inhibits?|delays?|overrides?|setpoints?)\b/iu);
});
