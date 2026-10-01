import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequireSession, SessionProvider } from '../../session/SessionProvider';
import { PROJECT, envelope, installFakeApi, json, projectList, type Seen } from '../../test/harness';
import { ProjectLayout } from '../../wizard/ProjectLayout';
import { ExtractedPage } from './ExtractedPage';
import { AREA, AREA_CANDIDATE, FLOORS, ROOMS, ROOMS_CANDIDATE, areaDisplay, floorsDisplays, roomsDisplay } from './test-support';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const COUNT = `project:${PROJECT}.confirmations.extractedFacts`;

/**
 * The page is rendered in the project layout with its own route, until the integrator points the app's
 * route table (../../routes.tsx) at it in place of the planner's placeholder.
 */
function renderExtracted() {
  const router = createMemoryRouter(
    [
      {
        element: (
          <SessionProvider>
            <Outlet />
          </SessionProvider>
        ),
        children: [
          {
            element: <RequireSession loading={<p>TEST session loading</p>} failed={<p>TEST session failed</p>} />,
            children: [
              {
                path: '/projects/:projectId',
                element: <ProjectLayout />,
                children: [
                  { path: 'extracted', element: <ExtractedPage /> },
                  { path: 'steps/:step', element: <p>TEST step page</p> },
                ],
              },
            ],
          },
        ],
      },
    ],
    { initialEntries: [`/projects/${PROJECT}/extracted`] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

function api(options: { readonly demo?: boolean } = {}) {
  const displays = [areaDisplay({ confirm: true }), ...floorsDisplays(), roomsDisplay(), { valueId: COUNT, kind: 'line' as const, text: 'TEST extracted count line', shape: 'value' as const }];
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo: options.demo === true }])),
    [`GET /api/projects/${PROJECT}/extracted`]: () =>
      json(200, { ...envelope(PROJECT, displays, { demo: options.demo === true }), view: { facts: [AREA, FLOORS, `${FLOORS}.upper`, `${FLOORS}.below_ground`, ROOMS], confirmationCount: COUNT } }),
    [`POST /api/projects/${PROJECT}/fields/confirm`]: () => json(200, { displayObjects: [] }),
    [`POST /api/projects/${PROJECT}/fields/acknowledge`]: () => json(200, { displayObjects: [] }),
  });
}

const extractedViews = (seen: readonly Seen[]) => seen.filter((request) => request.method === 'GET' && request.path.endsWith('/extracted')).length;

describe('US-REVIEW-08 · UD-45: View all extracted data', () => {
  it('US-REVIEW-08 AC1 · AC2 · rule 2 · rule 3: every served fact shows through its display, bound, with Edit and its excerpt on demand; no "Confirm all" and no bulk action', async () => {
    api();
    renderExtracted();
    expect(await screen.findByRole('heading', { name: 'All extracted data' })).toBeTruthy();
    await screen.findByText('TEST area as written');
    for (const valueId of [AREA, FLOORS, `${FLOORS}.upper`, `${FLOORS}.below_ground`, ROOMS]) {
      expect(document.querySelectorAll(`.sov-value[data-value-id="${valueId}"]`), valueId).toHaveLength(1);
    }
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /confirm all|all/iu })).toBeNull();
    const excerpt = screen.getByText('TEST area excerpt');
    expect(excerpt.getAttribute('data-copy-kind')).toBe('evidence-excerpt');
    expect(excerpt.getAttribute('data-value-id')).toBe(AREA);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });

  it('US-REVIEW-08 AC5 · rule 5: the count is the served line, bound; a shown confirmation and an engineer item\'s "Looks right" post their served candidates', async () => {
    const seen = api();
    renderExtracted();
    const count = await screen.findByText('TEST extracted count line');
    expect(count.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(COUNT);
    const before = extractedViews(seen);
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(seen.find((request) => request.path.endsWith('/fields/confirm'))?.body).toEqual({ candidateId: AREA_CANDIDATE }));
    await waitFor(() => expect(extractedViews(seen)).toBeGreaterThan(before));
    const rooms = document.querySelector(`.sov-value[data-value-id="${ROOMS}"]`) as HTMLElement;
    fireEvent.click(within(rooms).getByRole('button', { name: 'Looks right' }));
    await waitFor(() => expect(seen.find((request) => request.path.endsWith('/fields/acknowledge'))?.body).toEqual({ candidateIds: [ROOMS_CANDIDATE] }));
  });

  it('US-REVIEW-08 AC6 · GS-1: the demo project shows the served demo line on the page; another project shows none', async () => {
    api({ demo: true });
    renderExtracted();
    expect(await screen.findByText('TEST demo line')).toBeTruthy();
    cleanup();
    vi.unstubAllGlobals();
    api();
    renderExtracted();
    await screen.findByRole('heading', { name: 'All extracted data' });
    await screen.findByText('TEST area as written');
    expect(screen.queryByText('TEST demo line')).toBeNull();
  });

  it('DR-12 · UD-45 · prompt 3 section 11: while the page loads, its title and intro stay with one "Loading your answers" line over the outlines of the rows to come, and no figure', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/extracted`]: () => new Promise<Response>(() => undefined),
    });
    renderExtracted();
    expect(await screen.findByText('Loading your answers')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'All extracted data' })).toBeTruthy();
    expect(document.querySelectorAll('main .min-h-\\[112px\\]').length).toBeGreaterThan(0);
    expect(document.querySelector('main [data-value-id]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Back to your building' })).toBeTruthy();
  });

  it('UD-45 · R-009: Back returns to step 3 and stores nothing', async () => {
    const seen = api();
    const { router } = renderExtracted();
    fireEvent.click(await screen.findByRole('button', { name: 'Back to your building' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/3`));
    expect(seen.some((request) => request.method === 'POST')).toBe(false);
  });
});
