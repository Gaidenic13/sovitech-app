/**
 * G7-6 (docs/guardrails.md section 7; rule 7, the `required` row: "Continue stays enabled and shows an
 * inline error on each empty required field, and the project is not created until all four are
 * filled"; "Nobody is blocked except by the four required fields"; PRD R-001, R-136; US-INTAKE-02,
 * US-INTAKE-03, US-ADMIN-05).
 * Situation: any of the four required fields (project name, project type, city, country) is empty on
 * step 1.
 * Expected: Continue shows an inline error on that field, and the project is not created. These are
 * the only blocking cases.
 *
 * Both halves in one case file (phase 3 part B, V-7: the index check counts a case as real from its
 * case file alone, so the web half lives here too). The file runs in Node, as the API half needs (a
 * happy-dom environment for the whole file rewrites `import.meta.url` to an http URL, and the API's
 * support reads its folders from it); the web half sets up Vitest's own happy-dom environment
 * (`builtinEnvironments['happy-dom']` from vitest/runtime) for its tests only, at the origin of a TEST
 * API this file serves over HTTP on 127.0.0.1, and imports React, the testing library and the app
 * after it, so they start with a DOM:
 * - the API half, over a TEST database: step 1's Next is `POST /api/projects` (the contract's
 *   projects.create). With each of the four fields empty in turn (missing, or blank), the API answers
 *   422 `required_fields_missing` naming exactly that field and creates no project; with all four
 *   empty it names all four. With all four filled, the project is created. And nothing else blocks:
 *   Continue on every later step of a project with nothing answered is answered, never refused.
 * - the web half: the app's step 1 of a new project (its real route table, apps/web/src/routes.tsx, in
 *   a memory router, with its own API client and the page's own `fetch`), against the TEST API, which
 *   stands in at the network boundary for the real one and records every request (nothing of the code
 *   under test is replaced: no `vi.mock` or `vi.stubGlobal`). Next with a required field empty shows
 *   the inline error on that field (marked invalid), stays enabled, and sends nothing, so no project is
 *   created; with each field in turn the only one left empty, the error is on that field alone.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { builtinEnvironments } from 'vitest/runtime';
import { REQUIRED_FIELD_NAMES } from '@sovitech/view-model/browser';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';

type Library = typeof import('@testing-library/react');
type Harness = typeof import('../../apps/web/src/test/harness');
type RenderApp = typeof import('../../apps/web/src/test/render-app');
type Client = typeof import('../../apps/web/src/api/client');

const FILLED = { name: 'TEST G7-6 project', projectType: 'renovation', countryCode: 'RO', city: 'TEST city G7-6' } as const;

describe('G7-6 (API half, over a TEST database)', () => {
  let api: TestApi;
  let owner: Auth;

  beforeAll(async () => {
    api = await startTestApi({ devLogin: true });
    const [ownerId] = api.devAccountIds;
    if (ownerId === undefined) throw new Error('no TEST development owner');
    owner = await signIn(api, ownerId);
  }, 180_000);

  afterAll(async () => {
    // Started in beforeAll; a start that timed out leaves nothing to stop.
    if ((api as TestApi | undefined) !== undefined) await api.stop();
  });

  /** The projects the TEST owner belongs to, counted by the database (an int4 comes back as a number). */
  async function projectsOfOwner(): Promise<number> {
    const [row] = await api.database.asAdministrator<{ count: number }>('SELECT count(*)::integer AS count FROM sovitech.project_members WHERE user_id = $1', [
      api.devAccountIds[0],
    ]);
    // No fallback: a count the database did not answer fails the case (V-12), it is never read as 0.
    if (typeof row?.count !== 'number') throw new Error('the database answered no count of the owner\'s projects');
    return row.count;
  }

  function create(payload: Record<string, unknown>) {
    return api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload });
  }

  test('G7-6 · US-INTAKE-02 · US-INTAKE-03 · R-001: each required field empty in turn is named, and no project is created', async () => {
    const before = await projectsOfOwner();
    expect(typeof before).toBe('number');
    for (const field of REQUIRED_FIELD_NAMES) {
      for (const empty of [undefined, '', '   ']) {
        const payload: Record<string, unknown> = { ...FILLED };
        if (empty === undefined) delete payload[field];
        else payload[field] = empty;
        const response = await create(payload);
        expect(response.statusCode, `${field} ${JSON.stringify(empty)}`).toBe(422);
        expect(response.json()).toEqual({ code: 'required_fields_missing', fields: [field] });
      }
    }
    const allEmpty = await create({});
    expect(allEmpty.statusCode).toBe(422);
    expect(allEmpty.json()).toEqual({ code: 'required_fields_missing', fields: ['name', 'projectType', 'countryCode', 'city'] });
    expect(await projectsOfOwner()).toBe(before);
  });

  test('G7-6 · R-001: with all four filled the project is created, and nothing after step 1 blocks: Continue on steps 2 to 8 with nothing answered is answered', async () => {
    const before = await projectsOfOwner();
    expect(typeof before).toBe('number');
    const created = await create({ ...FILLED });
    expect(created.statusCode, created.body).toBe(201);
    const { projectId, nextStep } = created.json() as { projectId: string; nextStep: number };
    expect(nextStep).toBe(2);
    expect(await projectsOfOwner()).toBe(before + 1);
    for (const step of [2, 3, 4, 5, 6, 7, 8]) {
      const response = await api.app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/steps/${String(step)}/continue`,
        headers: { ...owner },
        payload: { answers: [], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } },
      });
      expect(response.statusCode, `step ${String(step)}: ${response.body}`).toBe(200);
    }
  });
});

/** A request the page sent to the TEST API: its method and path (bodies are not read). */
interface Sent {
  readonly method: string;
  readonly path: string;
}

describe('G7-6 (web half: step 1 of a new project, the app in happy-dom)', () => {
  // Assigned once the DOM exists (beforeAll): the testing library binds `screen` to the document when it loads.
  let library: Library;
  let screen: Library['screen'];
  let fireEvent: Library['fireEvent'];
  let waitFor: Library['waitFor'];
  let renderApp: RenderApp['renderApp'];
  let client: Client;
  let teardownDom: (() => Promise<void>) | undefined;
  let server: Server | undefined;
  const sent: Sent[] = [];

  beforeAll(async () => {
    // The app's modules (the harness's builders included) load only once the DOM exists, below.
    const loaded: { harness?: Harness } = {};
    // The TEST API answers the session, the CSRF token and the project list; anything else is 404. It records every request.
    const answer = (request: IncomingMessage, response: ServerResponse): void => {
      const method = request.method ?? 'GET';
      const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      sent.push({ method, path });
      const answers: Record<string, unknown> = {
        'GET /api/auth/session': { user: loaded.harness?.USER },
        'GET /api/csrf': { token: 'TEST-token' },
        'GET /api/projects': loaded.harness?.projectList([]),
      };
      const body = answers[`${method} ${path}`];
      response.writeHead(body === undefined ? 404 : 200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body ?? { code: 'not_found' }));
    };
    const started = createServer(answer);
    server = started;
    await new Promise<void>((resolve) => started.listen(0, '127.0.0.1', resolve));
    const address = started.address();
    if (address === null || typeof address === 'string') throw new Error('the TEST API has no port');
    // The page's origin is the TEST API's, so the app's same-origin `/api` requests reach it.
    const dom = await builtinEnvironments['happy-dom'].setup(globalThis, { happyDOM: { url: `http://127.0.0.1:${String(address.port)}/` } });
    teardownDom = async () => {
      await dom.teardown(globalThis);
    };
    loaded.harness = await import('../../apps/web/src/test/harness');
    library = await import('@testing-library/react');
    ({ screen, fireEvent, waitFor } = library);
    ({ renderApp } = await import('../../apps/web/src/test/render-app'));
    client = await import('../../apps/web/src/api/client');
  });

  afterEach(async () => {
    library.cleanup();
    await (window as unknown as { happyDOM: { abort(): Promise<void> } }).happyDOM.abort();
    client.resetCsrfToken();
    sent.length = 0;
  });

  afterAll(async () => {
    await teardownDom?.();
    const started = server;
    if (started === undefined) return;
    started.closeAllConnections();
    await new Promise((resolve) => started.close(resolve));
  });

  const next = () => screen.getByRole('button', { name: 'Next' });
  const creates = () => sent.filter((request) => request.method === 'POST' && request.path === '/api/projects');

  /** Fills every required field but `empty`, on the page's own controls. */
  async function fillAllBut(empty: (typeof REQUIRED_FIELD_NAMES)[number]): Promise<void> {
    const name = await screen.findByRole('textbox', { name: 'Project name' });
    if (empty !== 'name') fireEvent.change(name, { target: { value: 'TEST G7-6 project' } });
    if (empty !== 'projectType') fireEvent.click(screen.getByRole('radio', { name: 'Renovation' }));
    if (empty !== 'countryCode') fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'RO' } });
    if (empty !== 'city') fireEvent.change(screen.getByRole('textbox', { name: 'City' }), { target: { value: 'TEST city' } });
  }

  test('G7-6 · US-INTAKE-02 AC2 · US-ADMIN-05 AC3 (web half): Next with the four fields empty shows the inline error on each, stays enabled, and sends nothing, so no project is created', async () => {
    renderApp('/projects/new');
    await screen.findByRole('textbox', { name: 'Project name' });
    expect(next().hasAttribute('disabled')).toBe(false);
    fireEvent.click(next());
    await screen.findAllByText('Fill in this field to create the project.');
    expect(screen.getByRole('textbox', { name: 'Project name' }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('textbox', { name: 'City' }).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Choose a project type to create the project.')).toBeTruthy();
    expect(screen.getByText('Choose a country to create the project.')).toBeTruthy();
    // Next stays enabled: pressing it again is answered with the same errors, never a disabled button.
    expect(next().hasAttribute('disabled')).toBe(false);
    expect(next().getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(next());
    expect(creates()).toEqual([]);
  });

  for (const empty of REQUIRED_FIELD_NAMES) {
    test(`G7-6 (web half): with only ${empty} empty, the inline error is on that field alone, Next stays enabled, and no project is created`, async () => {
      renderApp('/projects/new');
      await fillAllBut(empty);
      fireEvent.click(next());
      const expected: Readonly<Record<(typeof REQUIRED_FIELD_NAMES)[number], string>> = {
        name: 'Fill in this field to create the project.',
        projectType: 'Choose a project type to create the project.',
        countryCode: 'Choose a country to create the project.',
        city: 'Fill in this field to create the project.',
      };
      await waitFor(() => expect(screen.getAllByText(expected[empty])).toHaveLength(1));
      const others = Object.entries(expected).filter(([name, text]) => name !== empty && text !== expected[empty]);
      for (const [, text] of others) expect(screen.queryByText(text)).toBeNull();
      if (empty === 'name' || empty === 'city') {
        const box = screen.getByRole('textbox', { name: empty === 'name' ? 'Project name' : 'City' });
        expect(box.getAttribute('aria-invalid')).toBe('true');
        const other = screen.getByRole('textbox', { name: empty === 'name' ? 'City' : 'Project name' });
        expect(other.getAttribute('aria-invalid')).toBeNull();
      }
      expect(next().hasAttribute('disabled')).toBe(false);
      expect(creates()).toEqual([]);
    });
  }
});
