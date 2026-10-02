// @vitest-environment happy-dom
/**
 * G12-12 (new in phase 4, part B; for the integrator to index in docs/guardrails.md section 7). Its
 * Expected follows from rule 12, "Absence of evidence is not evidence of absence" ("'No AHU found in the
 * analysed documents (pages 1-60 of 200)' is correct. 'The building has no AHU' is not, unless a document
 * says so"), with rule 1 ("Otherwise the field stays Unknown") and G1-26 (a document stored with no
 * classification of its kind: its category reads Unknown).
 * Situation: a project whose every document is unclassified (each category reads Unknown, G1-26), and the
 * owner chooses a category chip on Documents.
 * Expected: the register never says that no document matches; it says that no document is in the category
 * and that categories read Unknown until a document's kind is set.
 *
 * Found in part B (DR-14, V-11): every chip but All Documents read "No document matches this filter." even
 * when a file of that kind was stored, because no classifier runs in this build and the category of every
 * row is Unknown: the sentence stated an absence the app had not established.
 *
 * How: the documents view is built by the view-model's own `documentsView` (as G1-26 builds it) from TEST
 * documents stored with each kind the store can hold, and served over HTTP on 127.0.0.1 by this file, as
 * G10-12 serves its TEST API: the web app's own route table (apps/web/src/routes.tsx) in a memory router,
 * its own API client and the page's own `fetch` (happy-dom's). Nothing of the code under test is replaced.
 * Every name and value here is TEST data.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { DOCUMENT_KINDS } from '@sovitech/domain';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { documentsView } from '@sovitech/view-model/server';
import { resetCsrfToken } from '../../apps/web/src/api/client';
import { copy } from '../../apps/web/src/copy';
import { renderApp } from '../../apps/web/src/test/render-app';
import { frameResponse } from '../../apps/web/src/workspace/test-views';
import { testDocument } from './_support/builders';
import { uuid } from './_support/view-model';
import { testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const USER = { userId: uuid(3), displayName: 'TEST owner', roles: ['owner'] };
const AS_OF = '2026-10-02T09:00:00.000Z';

const CATEGORY_SENTENCE = "No document is in this category. Categories read Unknown until a document's kind is set.";
const NO_MATCH = 'No document matches this filter.';

/** One stored document of each kind the store can hold, none classified (the upload's stored default). */
const DOCUMENTS = DOCUMENT_KINDS.map((kind, index) => ({ ...testDocument(uuid(10 + index), PROJECT, 'unknown', { kind }), contentHash: `sha256:${'f'.repeat(64)}` }));
const FILE_NAMES = Object.fromEntries(DOCUMENTS.map((document, index) => [document.id, `TEST file ${String(index + 1)}.pdf`]));

function documentsResponse() {
  const project = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, documents: DOCUMENTS, fileNames: FILE_NAMES });
  const built = documentsView(
    project,
    DOCUMENTS.map((document) => ({ documentId: document.id, format: 'pdf' as const, addedAt: AS_OF, downloadable: true, declaredRevisionOf: null, kindSource: 'stored_default' as const })),
  );
  const name: DisplayObject = { valueId: `project:${PROJECT}.name`, kind: 'field', text: 'TEST project', shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } };
  return {
    asOf: AS_OF,
    project: { projectId: PROJECT, name: name.valueId, isDemo: false, demoLine: null },
    displayObjects: [name, ...built.displayObjects],
    view: built.view,
  };
}

let server: Server;

function answer(request: IncomingMessage, response: ServerResponse): void {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  const answers: Record<string, unknown> = {
    'GET /api/auth/session': { user: USER },
    'GET /api/csrf': { token: 'TEST-token' },
    'GET /api/projects': {
      displayObjects: [{ valueId: `project:${PROJECT}.name`, kind: 'field', text: 'TEST project', shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } }],
      projects: [{ projectId: PROJECT, name: `project:${PROJECT}.name`, isDemo: false, demoLine: null }],
    },
    [`GET /api/projects/${PROJECT}/workspace`]: frameResponse(PROJECT, { name: 'TEST project' }),
    [`GET /api/projects/${PROJECT}/workspace/documents`]: documentsResponse(),
    [`GET /api/projects/${PROJECT}/late-findings`]: { asOf: AS_OF, displayObjects: [], dots: [], notice: null },
  };
  const body = answers[`${request.method ?? 'GET'} ${path}`];
  response.writeHead(body === undefined ? 404 : 200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body ?? { code: 'not_found' }));
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
  resetCsrfToken();
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test('G12-12 · rule 12 · rule 1 · G1-26 · US-DOCS-13 AC3: with every document unclassified, choosing a category chip never says no document matches; it says no document is in the category and that categories read Unknown until a document\'s kind is set', async () => {
  expect(copy.workspace.documents.empty.category).toBe(CATEGORY_SENTENCE);
  renderApp(`/projects/${PROJECT}/documents`);
  const table = await screen.findByRole('table', { name: 'Project documents' });
  await waitFor(() => expect(within(table).getAllByRole('row').slice(1)).toHaveLength(DOCUMENTS.length));
  // Every stored kind reads Unknown in its Category cell (G1-26's rendered half).
  for (const document of DOCUMENTS) expect(table.querySelector(`[data-value-id="document:${document.id}.kind"]`)?.textContent).toContain('Unknown');

  const chips = screen.getByRole('group', { name: 'Document category' });
  const categories = within(chips)
    .getAllByRole('radio')
    .map((radio) => radio.closest('label')?.textContent ?? '')
    .filter((label) => label !== copy.workspace.documents.chips.all);
  expect(categories).toHaveLength(5);
  for (const category of categories) {
    fireEvent.click(within(chips).getByRole('radio', { name: category }));
    const register = screen.getByRole('table', { name: 'Project documents' });
    expect(within(register).getByText(CATEGORY_SENTENCE), category).toBeTruthy();
    expect(document.body.textContent, category).not.toContain(NO_MATCH);
  }

  fireEvent.click(within(chips).getByRole('radio', { name: copy.workspace.documents.chips.all }));
  expect(within(screen.getByRole('table', { name: 'Project documents' })).getAllByRole('row').slice(1)).toHaveLength(DOCUMENTS.length);
});
