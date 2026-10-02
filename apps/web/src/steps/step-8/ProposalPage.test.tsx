import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequireSession, SessionProvider } from '../../session/SessionProvider';
import { AS_OF, PROJECT, installFakeApi, json, projectList, renderAt, type Handler } from '../../test/harness';
import { frameResponse } from '../../workspace/test-views';
import { ProjectLayout } from '../../wizard/ProjectLayout';
import { AREA_BOX, CAPEX_LABEL, CAPEX_LABEL_TEXT, CAPEX_LINE, STILL_READING, proposalView, step8View } from './step8-fixture';
import { ProposalPage } from './ProposalPage';
import { Step8 } from './Step8';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** The project routes this page needs (routes.tsx points `proposal` at the planner's placeholder until the integrator re-points it). */
function renderProposal(path = `/projects/${PROJECT}/proposal`) {
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
            element: <RequireSession loading={null} failed={null} />,
            children: [
              {
                path: '/projects/:projectId',
                element: <ProjectLayout />,
                children: [
                  { path: 'proposal', element: <ProposalPage /> },
                  { path: 'steps/8', element: <Step8 /> },
                ],
              },
            ],
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function api(proposal: Handler, demo = false) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo }])),
    [`GET /api/projects/${PROJECT}/proposal`]: proposal,
    [`GET /api/projects/${PROJECT}/steps/8`]: () => json(200, step8View({ demo })),
    [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
  });
}

describe('UD-07 · US-INTAKE-16 · R-003 · R-012 · prompt 3 5.2 "Generate before phase 5": the proposal page', () => {
  it('UD-07 · rule 2: while it loads, the generating state shows a progress bar with no number and no figure', async () => {
    api(() => new Promise<Response>(() => undefined));
    renderProposal();
    await screen.findByRole('heading', { name: 'Preparing your preliminary proposal', level: 1 });
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.textContent).toBe('');
    expect(document.querySelector('[data-value-id^="project:"][data-value-id*=".outputs."]')).toBeNull();
    expect(document.body.hasAttribute('data-render-ready')).toBe(false);
  });

  it('US-INTAKE-16 AC2 · AC3 · AC4 · rule 7 · rule 10 · G10-11 (web half): the page says no investment figure is available yet, names the investment output by its served stage label, and names what each output needs, bound; "Still reading <n> files…" is bound; nothing is a figure', async () => {
    api(() => json(200, proposalView()));
    renderProposal();
    await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 });
    expect(screen.getByText('No investment figure is available yet. Each output below names what it still needs.')).toBeTruthy();
    expect(screen.getByText(CAPEX_LABEL_TEXT).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_LABEL);
    expect(document.body.textContent).not.toContain('Investment estimate from');
    expect(screen.getByText('TEST not available: a dataset and the area').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_LINE);
    expect(screen.getByText('TEST still reading line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(STILL_READING);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });

  it('UD-07 · DR-18: the page\'s section heading is a level 2 heading in the kit\'s one section heading role, under the page title', async () => {
    api(() => json(200, proposalView()));
    renderProposal();
    await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 });
    const heading = screen.getByRole('heading', { name: 'What each output still needs', level: 2 });
    expect(heading.classList.contains('sov-heading-section')).toBe(true);
  });

  it('R-012 "Until decided" · US-INTAKE-22 AC6: an owner input\'s "Add" opens step 8 at that field\'s inline ask, never an empty page', async () => {
    api(() => json(200, proposalView()));
    const router = renderProposal();
    fireEvent.click(await screen.findByRole('button', { name: 'TEST add the area' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    const input = await screen.findByRole('textbox', { name: AREA_BOX });
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('G7-11 · US-INTAKE-22 AC6 · R-012: after Generate skipped the area\'s inline ask, "Add" on the proposal page opens step 8 with the field named, and the ask served again is focused', async () => {
    const base = step8View();
    const [areaAsk] = base.view.proposal.inlineAsks;
    const skipped = new Set<string>();
    const seen = installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`GET /api/projects/${PROJECT}/proposal`]: () => json(200, proposalView()),
      [`POST /api/projects/${PROJECT}/fields/skip`]: (request) => {
        skipped.add((request.body as { questionId: string }).questionId);
        return json(200, { displayObjects: [] });
      },
      [`POST /api/projects/${PROJECT}/steps/8/continue`]: () => json(200, { nextStep: 'proposal', displayObjects: [] }),
      // The API serves an ask until it is skipped, and again for the field the `add` query names (rule 7: a skipped first-estimate field returns at step 8).
      [`GET /api/projects/${PROJECT}/steps/8`]: (request) => {
        const add = request.url.searchParams.get('add');
        const inlineAsks = base.view.proposal.inlineAsks.filter((ask) => !skipped.has(ask.questionId) || ask.fields.some((field) => field.fieldKey === add));
        return json(200, { ...base, view: { ...base.view, proposal: { ...base.view.proposal, inlineAsks } } });
      },
    });
    const router = renderProposal(`/projects/${PROJECT}/steps/8`);
    await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/proposal`));
    expect(skipped.has(areaAsk?.questionId ?? '')).toBe(true);
    // The proposal page, not step 8 on its way out (step 8 names the same "Add" on its own output list).
    const proposal = (await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 })).closest('[data-proposal-page]') as HTMLElement;
    fireEvent.click(await within(proposal).findByRole('button', { name: 'TEST add the area' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    const input = await screen.findByRole('textbox', { name: AREA_BOX });
    await waitFor(() => expect(document.activeElement).toBe(input));
    const reads = seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8'));
    expect(reads.at(-1)?.url.searchParams.get('add')).toBe('building.grossFloorArea');
    // Only the field the owner came to add is asked again; the other skipped asks stay skipped (rule 7, "Skip means skip").
    expect(screen.queryByText('TEST ask for the type')).toBeNull();
  });

  it('UD-47 · rule 7: a page that cannot load says so, offers "Try again" and "Back to review", and shows no value', async () => {
    let calls = 0;
    const seen = api(() => {
      calls += 1;
      return calls === 1 ? json(500, { code: 'internal_error' }) : json(200, proposalView());
    });
    const router = renderProposal();
    await screen.findByText('Your preliminary proposal could not be loaded. Your answers are kept. Try again, or go back to the review.');
    expect(document.querySelector('[data-value-id*=".outputs."]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText(CAPEX_LABEL_TEXT);
    expect(seen.filter((request) => request.path.endsWith('/proposal'))).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Back to review' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
  });

  it('DR-7 · DR-2 · ADR 0043 decision 3: in the workspace frame the page takes the workspace page layout (the kit\'s left-aligned page header, no padding or width of its own) on its generating state and once loaded, and "Back to review" is a 40px secondary button, not the wizard\'s footer button', async () => {
    let answer: ((response: Response) => void) | undefined;
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/workspace`]: () => json(200, frameResponse(PROJECT, { name: 'TEST project' })),
      [`GET /api/projects/${PROJECT}/proposal`]: () => new Promise<Response>((resolve) => (answer = resolve)),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/proposal`);
    const generating = await screen.findByRole('heading', { name: 'Preparing your preliminary proposal', level: 1 });
    expect(generating.classList.contains('sov-page-header__title')).toBe(true);
    expect(screen.getByRole('navigation', { name: 'Project pages' })).toBeTruthy();
    answer?.(json(200, proposalView()));
    const title = await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 });
    expect(title.classList.contains('sov-page-header__title')).toBe(true);
    expect(screen.getByText('No investment figure is available yet. Each output below names what it still needs.').classList.contains('sov-page-header__subtitle')).toBe(true);
    const page = title.closest('[data-proposal-page]') as HTMLElement;
    expect(page.className).not.toMatch(/(^|\s)(mx-auto|max-w-\S+|w-full|p[xytblr]?-\S+)(\s|$)/u);
    const back = screen.getByRole('button', { name: 'Back to review' });
    expect(back.getAttribute('data-variant')).toBe('secondary');
    expect(back.getAttribute('data-size')).toBe('default');
  });

  it('G10-10 · US-REVIEW-03 AC1 · GS-1 (web side): the demo line shows on the generating state and on the page of the demo project', async () => {
    let answer: ((response: Response) => void) | undefined;
    api(() => new Promise<Response>((resolve) => (answer = resolve)), true);
    renderProposal();
    await screen.findByRole('heading', { name: 'Preparing your preliminary proposal', level: 1 });
    await screen.findByText('TEST demo line');
    answer?.(json(200, proposalView(true)));
    await screen.findByRole('heading', { name: 'Preliminary proposal', level: 1 });
    expect(screen.getByText('TEST demo line')).toBeTruthy();
  });
});
