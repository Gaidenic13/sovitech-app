import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../routes';
import { OTHER_PROJECT, PROJECT, heldHandler, installFakeApi, json, projectList, renderAt, type Handler } from '../test/harness';
import { SWITCHER_FOOTER_GAP_PX } from './ProjectSwitcher';
import { documentsResponse, frameResponse } from './test-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const THIRD = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9d';

interface Setup {
  readonly demo?: boolean;
  readonly stillReading?: boolean;
  readonly frame?: Handler;
  readonly list?: Handler;
  readonly extra?: Readonly<Record<string, Handler>>;
}

function api(options: Setup = {}) {
  return installFakeApi({
    'GET /api/projects':
      options.list ?? (() => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1', demo: options.demo === true }, { projectId: OTHER_PROJECT, name: 'TEST project 2' }]))),
    [`GET /api/projects/${PROJECT}/workspace`]: options.frame ?? (() => json(200, frameResponse(PROJECT, { demo: options.demo === true, name: 'TEST project 1', stillReading: options.stillReading === true }))),
    [`GET /api/projects/${PROJECT}/workspace/documents`]: () => json(200, documentsResponse(PROJECT, [], { demo: options.demo === true })),
    [`GET /api/projects/${OTHER_PROJECT}/workspace`]: () => json(200, frameResponse(OTHER_PROJECT, { name: 'TEST project 2' })),
    [`GET /api/projects/${OTHER_PROJECT}/workspace/documents`]: () => json(200, documentsResponse(OTHER_PROJECT, [])),
    ...options.extra,
  });
}

async function openDocuments(path = `/projects/${PROJECT}/documents`) {
  const view = renderAt(path);
  await screen.findByRole('heading', { name: 'Project Documents', level: 1 });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  return view;
}

function sidebarNav() {
  return screen.getByRole('navigation', { name: 'Project pages' });
}

describe('ADR 0043 · R-146 · R-049 · R-139 · R-145 · UD-32: the workspace frame', () => {
  it('R-146 · US-ADMIN-13 AC1 · R-050 · US-REVIEW-15 AC1: the sidebar lists the built pages in the approved order, each a link to its built page; no Overview, Property, Alarms, Reports or Metrics item; the page on screen is the current one', async () => {
    api();
    await openDocuments();
    const links = within(sidebarNav()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Proposal', 'System Scope', 'Topology', 'Zones', 'Equipment', 'Documents']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      ['proposal', 'system-scope', 'topology', 'zones', 'equipment', 'documents'].map((segment) => `/projects/${PROJECT}/${segment}`),
    );
    for (const absent of ['Overview', 'Property', 'Alarms', 'Reports', 'Metrics']) expect(within(sidebarNav()).queryByText(absent)).toBeNull();
    expect(within(sidebarNav()).getByRole('link', { name: 'Documents' }).getAttribute('aria-current')).toBe('page');
    expect(within(sidebarNav()).getByRole('link', { name: 'Zones' }).getAttribute('aria-current')).toBeNull();
    // No tab set in the header (R-146 "Until decided").
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('R-146 · US-ADMIN-13 AC1: the sidebar lists the pages the frame serves, and only those', async () => {
    api({ frame: () => json(200, frameResponse(PROJECT, { name: 'TEST project 1', pages: ['proposal', 'documents'] })) });
    await openDocuments();
    await waitFor(() => expect(within(sidebarNav()).getAllByRole('link').map((link) => link.textContent)).toEqual(['Proposal', 'Documents']));
  });

  it('ADR 0043 decision 6 · R-077: a floor selection in the URL is kept on the links to the pages that read it, and on no other', async () => {
    api();
    await openDocuments(`/projects/${PROJECT}/documents?level=upper_3`);
    const nav = sidebarNav();
    expect(within(nav).getByRole('link', { name: 'Zones' }).getAttribute('href')).toBe(`/projects/${PROJECT}/zones?level=upper_3`);
    expect(within(nav).getByRole('link', { name: 'Topology' }).getAttribute('href')).toBe(`/projects/${PROJECT}/topology?level=upper_3`);
    expect(within(nav).getByRole('link', { name: 'Documents' }).getAttribute('href')).toBe(`/projects/${PROJECT}/documents`);
    expect(within(nav).getByRole('link', { name: 'Proposal' }).getAttribute('href')).toBe(`/projects/${PROJECT}/proposal`);
  });

  it('ADR 0043: following a sidebar link opens that page in the same frame, with no reload of the frame', async () => {
    const seen = api({ extra: { [`GET /api/projects/${PROJECT}/proposal`]: () => new Promise<Response>(() => undefined) } });
    const { router } = await openDocuments();
    fireEvent.click(within(sidebarNav()).getByRole('link', { name: 'Proposal' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/proposal`));
    expect(within(sidebarNav()).getByRole('link', { name: 'Proposal' }).getAttribute('aria-current')).toBe('page');
    expect(seen.filter((request) => request.path === `/api/projects/${PROJECT}/workspace`)).toHaveLength(1);
  });

  it('R-139 · US-ADMIN-12 AC2 · AC5 · AC6 · rule 10 · GS-1: on the demo, the served demo line shows once, in the status footer, and no live element, timeline or tagline is drawn', async () => {
    api({ demo: true });
    await openDocuments();
    const lines = document.querySelectorAll('[data-demo-line]');
    expect(lines).toHaveLength(1);
    const footer = lines[0]?.closest('footer');
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain('TEST demo line');
    for (const live of ['BMS Live', 'BMS LIVE', 'Last sync', 'LIVE', 'REAL BUILDINGS']) expect(document.body.textContent).not.toContain(live);
  });

  it('G10-12 (workspace) · rule 10: a demo screen whose frame and page requests are still pending shows the demo line, once the page session was told the project is the demo', async () => {
    const frame = heldHandler(() => json(200, frameResponse(PROJECT, { demo: true })));
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1', demo: true }])),
      [`GET /api/projects/${PROJECT}/workspace`]: frame.handler,
      [`GET /api/projects/${PROJECT}/workspace/documents`]: () => new Promise<Response>(() => undefined),
    });
    renderAt(`/projects/${PROJECT}/documents`);
    await waitFor(() => expect(document.querySelectorAll('[data-demo-line]')).toHaveLength(1));
    expect(document.body.hasAttribute('data-render-ready')).toBe(false);
    frame.answer();
  });

  it('G10-10 (workspace, web half) · rule 10: a project not flagged demo shows no demo line in the frame', async () => {
    api();
    await openDocuments();
    expect(document.querySelectorAll('[data-demo-line]')).toHaveLength(0);
    expect(document.body.textContent).not.toContain('TEST demo line');
  });

  it('R-139 · US-ADMIN-12 AC4 · rule 7: while files are read, the footer carries the served "Still reading" line, its number bound', async () => {
    api({ stillReading: true });
    await openDocuments();
    const footer = document.querySelector('footer');
    expect(footer).not.toBeNull();
    const line = within(footer as HTMLElement).getByText('TEST still reading 2 files');
    expect(line.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.stillReading`);
  });

  it('R-049 · US-REVIEW-14 AC1 · AC3 · AC6 to AC8 · AC10 · G2-7: the project card shows each served fact through the value component, bound, with its badge and source line, and no photo, Status or BMS Platform line', async () => {
    api();
    await openDocuments();
    const card = screen.getByRole('region', { name: 'Building' });
    const area = within(card).getByText('1234').closest('[data-value-id]');
    expect(area?.getAttribute('data-value-id')).toMatch(/^building:.+\.grossFloorArea$/u);
    expect(within(card).getByText('TEST document badge')).toBeTruthy();
    expect(within(card).getByText('TEST found in TEST-1.pdf')).toBeTruthy();
    expect(within(card).getByText('TEST project type').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.type`);
    // A fact with no candidate reads Unknown, never blank (AC10).
    expect(within(card).getByText('Unknown')).toBeTruthy();
    expect(card.querySelector('img')).toBeNull();
    for (const absent of ['Status', 'BMS Platform', 'SAUTER']) expect(card.textContent).not.toContain(absent);
  });

  it('rule 7 · R-146 · DR-9: when the frame cannot be loaded, the pages stay reachable, the card place says the building facts could not be loaded with Try again, never the page\'s failure sentence beside a page that loaded, and the page still shows', async () => {
    let fail = true;
    api({ frame: () => (fail ? json(500, { code: 'internal_error' }) : json(200, frameResponse(PROJECT, { name: 'TEST project 1' }))) });
    renderAt(`/projects/${PROJECT}/documents`);
    await screen.findByRole('heading', { name: 'Project Documents', level: 1 });
    const failed = await screen.findByText('The building facts could not be loaded. Try again.');
    expect(screen.queryByText('This page could not be loaded. Nothing you entered is lost.')).toBeNull();
    expect(within(sidebarNav()).getAllByRole('link')).toHaveLength(6);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
    fail = false;
    fireEvent.click(within(failed.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Try again' }));
    await screen.findByRole('region', { name: 'Building' });
  });

  it('DR-3 · V-7 · WCAG 2.4.1 · 1.3.1 · 2.4.3: on a workspace page exactly one main exists, the page column (#main, the skip link\'s target and where the page puts the focus); the sidebar with the switcher and the page links sits outside it, and so does the status footer', async () => {
    api({ demo: true });
    await openDocuments();
    const mains = document.querySelectorAll('main');
    expect(mains).toHaveLength(1);
    const main = mains[0] as HTMLElement;
    expect(main.id).toBe('main');
    expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#main');
    expect(main.contains(screen.getByRole('heading', { name: 'Project Documents', level: 1 }))).toBe(true);
    expect(main.contains(sidebarNav())).toBe(false);
    expect(main.contains(screen.getByRole('button', { name: /Switch project/u }))).toBe(false);
    expect(main.contains(screen.getByRole('region', { name: 'Building' }))).toBe(false);
    const footer = document.querySelector('[data-demo-line]')?.closest('footer');
    expect(footer).not.toBeNull();
    expect(main.contains(footer as HTMLElement)).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(main));
  });

  it('A-1 · rule 7 · rule 10 · GS-1: a workspace page that throws while it renders shows its failure state inside the kept frame: the sidebar stays reachable, the footer keeps the demo line on the demo, and Try again renders the page anew', async () => {
    api({ demo: true });
    let throws = true;
    function TestFailingPage(): ReactElement {
      if (throws) throw new Error('TEST page failure');
      return <h1>TEST page rendered</h1>;
    }
    const withFailingDocuments = (list: readonly RouteObject[]): RouteObject[] =>
      list.map((route) => {
        if (route.path === 'documents') return { ...route, element: <TestFailingPage /> } as RouteObject;
        return route.children === undefined ? route : ({ ...route, children: withFailingDocuments(route.children) } as RouteObject);
      });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const router = createMemoryRouter(withFailingDocuments(routes), { initialEntries: [`/projects/${PROJECT}/documents`] });
      render(<RouterProvider router={router} />);
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain('This page could not be loaded. Nothing you entered is lost.');
      expect(within(sidebarNav()).getAllByRole('link')).toHaveLength(6);
      await waitFor(() => expect(document.querySelectorAll('[data-demo-line]')).toHaveLength(1));
      expect(document.querySelector('[data-demo-line]')?.closest('footer')?.textContent).toContain('TEST demo line');
      await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
      throws = false;
      fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
      await screen.findByRole('heading', { name: 'TEST page rendered', level: 1 });
      expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/documents`);
      expect(within(sidebarNav()).getAllByRole('link')).toHaveLength(6);
    } finally {
      quiet.mockRestore();
    }
  });

  it('render test (tests/e2e/render/README.md): data-render-ready waits for the frame and the page both', async () => {
    const frame = heldHandler(() => json(200, frameResponse(PROJECT)));
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1' }])),
      [`GET /api/projects/${PROJECT}/workspace`]: frame.handler,
      [`GET /api/projects/${PROJECT}/workspace/documents`]: () => json(200, documentsResponse(PROJECT, [])),
    });
    renderAt(`/projects/${PROJECT}/documents`);
    await screen.findByText('No documents yet. Upload your drawings, schedules and other files to start.');
    expect(document.body.hasAttribute('data-render-ready')).toBe(false);
    await act(async () => {
      frame.answer();
      await Promise.resolve();
    });
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });
});

describe('UD-32 · R-145 · US-ADMIN-06 · G13-9 (rendered half): the project switcher', () => {
  function switcher() {
    return screen.getByRole('button', { name: /Switch project/u });
  }

  it('US-ADMIN-06 AC4: the switcher names the project on screen by its served step 1 name, bound', async () => {
    api();
    await openDocuments();
    const name = within(switcher()).getByText('TEST project 1');
    expect(name.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.name`);
  });

  it('G13-9 (rendered half) · rule 13 · US-ADMIN-06 AC1 · AC4: opened, it lists exactly the projects the API serves for the user, each under its served name, bound, linking to the same page of that project; no dialog opens', async () => {
    const seen = api({
      list: () =>
        json(
          200,
          projectList([
            { projectId: PROJECT, name: 'TEST project 1' },
            { projectId: OTHER_PROJECT, name: 'TEST project 2' },
            { projectId: THIRD, name: 'TEST project 3', demo: true },
          ]),
        ),
    });
    await openDocuments();
    const before = seen.filter((request) => request.path === '/api/projects').length;
    fireEvent.click(switcher());
    expect(switcher().getAttribute('aria-expanded')).toBe('true');
    const list = await screen.findByRole('list', { name: 'Switch project' });
    expect(seen.filter((request) => request.path === '/api/projects').length).toBe(before + 1);
    const entries = within(list).getAllByRole('link');
    expect(entries.map((entry) => entry.textContent)).toEqual(['TEST project 1', 'TEST project 2', 'TEST project 3']);
    expect(entries.map((entry) => entry.getAttribute('href'))).toEqual([PROJECT, OTHER_PROJECT, THIRD].map((id) => `/projects/${id}/documents`));
    expect(entries.map((entry) => entry.querySelector('[data-value-id]')?.getAttribute('data-value-id'))).toEqual(
      [PROJECT, OTHER_PROJECT, THIRD].map((id) => `project:${id}.name`),
    );
    expect(entries[0]?.getAttribute('aria-current')).toBe('true');
    // On another project's screen the switcher never shows the demo line (G10-10).
    expect(within(list).queryByText('TEST demo line')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('US-ADMIN-06 AC2 · AC3: choosing a project opens the same page of it in a new frame; the floor selection and nothing else of the previous project is carried over', async () => {
    const seen = api();
    const { router } = await openDocuments(`/projects/${PROJECT}/documents?level=upper_3`);
    fireEvent.click(switcher());
    const list = await screen.findByRole('list', { name: 'Switch project' });
    fireEvent.click(within(list).getByRole('link', { name: 'TEST project 2' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${OTHER_PROJECT}/documents`));
    expect(router.state.location.search).toBe('');
    await waitFor(() => expect(within(switcher()).getByText('TEST project 2')).toBeTruthy());
    expect(seen.some((request) => request.path === `/api/projects/${OTHER_PROJECT}/workspace`)).toBe(true);
    expect(screen.queryByText('TEST project 1', { selector: '[data-value-id] bdi' })).toBeNull();
  });

  it('keyboard: Escape closes the list and returns the focus to the switcher; the arrow keys move between the projects', async () => {
    api();
    await openDocuments();
    switcher().focus();
    fireEvent.click(switcher());
    const list = await screen.findByRole('list', { name: 'Switch project' });
    const [first, second] = within(list).getAllByRole('link');
    fireEvent.keyDown(switcher(), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second as HTMLElement, { key: 'Escape' });
    expect(switcher().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(switcher());
  });

  it('DR-4 · rule 10 "Labelled everywhere" · 2.8 "Prominence" · WCAG 2.4.11: with many projects the open list stops a gutter above the status footer and scrolls inside itself, so the demo line is never covered', async () => {
    const many = Array.from({ length: 19 }, (_, index) => ({
      projectId: `0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8f${String(index + 10)}`,
      name: `TEST project ${String(index + 10)}`,
    }));
    api({ demo: true, list: () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1', demo: true }, ...many])) });
    await openDocuments();
    const footer = document.querySelector('.sov-status-footer') as HTMLElement;
    const panel = document.querySelector('[data-switcher-panel]') as HTMLElement;
    // happy-dom lays nothing out: the places the 1440 x 900 canvas gives them (design review, p-switcher-geometry).
    const at = (top: number) => () => ({ top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => undefined }) as DOMRect;
    footer.getBoundingClientRect = at(852);
    panel.getBoundingClientRect = at(178);
    fireEvent.click(screen.getByRole('button', { name: /Switch project/u }));
    const list = await screen.findByRole('list', { name: 'Switch project' });
    expect(within(list).getAllByRole('link')).toHaveLength(20);
    expect(panel.style.maxHeight).toBe(`${String(852 - SWITCHER_FOOTER_GAP_PX - 178)}px`);
    expect(panel.classList.contains('overflow-y-auto')).toBe(true);
    // The window moves: the list follows, and still stops above the footer.
    panel.getBoundingClientRect = at(100);
    fireEvent.scroll(window);
    await waitFor(() => expect(panel.style.maxHeight).toBe(`${String(852 - SWITCHER_FOOTER_GAP_PX - 100)}px`));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('rule 7: a list that cannot be loaded says so with Try again, and the page is unchanged', async () => {
    let fail = true;
    api({ list: () => (fail ? json(500, { code: 'internal_error' }) : json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1' }]))) });
    await openDocuments();
    // The provider's own read of the list (the header) has answered; the switcher's read fails.
    fireEvent.click(switcher());
    await screen.findByText('Your projects could not be loaded. Try again.');
    fail = false;
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' }).at(-1) as HTMLElement);
    await screen.findByRole('list', { name: 'Switch project' });
  });
});
