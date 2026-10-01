import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AS_OF, OTHER_PROJECT, PROJECT, USER, envelope, installFakeApi, json, projectList, renderAt } from '../test/harness';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('US-ADMIN-01 · UD-36 · R-133: sign-in with the development login', () => {
  it('US-ADMIN-01 AC1 · rule 13: with no session, a project screen sends the visitor to sign-in and requests nothing of the project', async () => {
    const seen = installFakeApi({ 'GET /api/auth/dev-accounts': () => json(200, { accounts: [USER] }) }, { user: null });
    const { router } = renderAt(`/projects/${PROJECT}/steps/3`);
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(seen.some((request) => request.path.startsWith('/api/projects'))).toBe(false);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy();
  });

  it('US-ADMIN-01 AC2, AC5 · ADR 0038: the accounts come from the API with their roles; choosing one signs in and opens the page the visitor asked for', async () => {
    let signedIn = false;
    const seen = installFakeApi({
      'GET /api/auth/session': () => json(200, { user: signedIn ? USER : null }),
      'GET /api/auth/dev-accounts': () => json(200, { accounts: [USER] }),
      'POST /api/auth/dev-sign-in': () => {
        signedIn = true;
        return json(200, { user: USER });
      },
      'GET /api/projects': () => json(200, projectList([])),
    });
    const { router } = renderAt('/projects');
    const account = await screen.findByRole('button', { name: /TEST owner/u });
    expect(account.textContent).toContain('Owner');
    expect(screen.getByRole('img', { name: 'SOVITECH Control' })).toBeTruthy();
    fireEvent.click(account);
    await waitFor(() => expect(router.state.location.pathname).toBe('/projects'));
    const signIn = seen.find((request) => request.path === '/api/auth/dev-sign-in');
    expect(signIn?.body).toEqual({ accountId: USER.userId });
    expect(signIn?.headers.get('csrf-token')).toBe('TEST-token');
  });

  it('ADR 0038 · R-153: with the development login off, the page says no sign-in is set up and offers no account', async () => {
    installFakeApi({ 'GET /api/auth/dev-accounts': () => json(404, { code: 'dev_login_off' }) }, { user: null });
    renderAt('/sign-in');
    expect(await screen.findByText('No sign-in is set up for this app.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Sign in/u })).toBeNull();
  });
});

describe('US-ADMIN-05 · US-ADMIN-15 · UD-37 · R-136, R-137: the project list', () => {
  it('US-ADMIN-05 AC1, AC2 · US-REVIEW-03 AC7: the projects the API lists, each under its served name, bound; the demo project with its demo line, the other without', async () => {
    installFakeApi({
      'GET /api/projects': () =>
        json(200, projectList([
          { projectId: PROJECT, name: 'TEST demo hotel', demo: true },
          { projectId: OTHER_PROJECT, name: 'TEST own project' },
        ])),
    });
    renderAt('/projects');
    const list = await screen.findByRole('list', { name: 'Your projects' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText('TEST demo hotel').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.name`);
    expect(within(rows[0] as HTMLElement).getByText('TEST demo line')).toBeTruthy();
    expect(within(rows[1] as HTMLElement).queryByText('TEST demo line')).toBeNull();
    // R-009 "Until decided": a project reopened before Generate opens at step 1.
    expect(within(rows[1] as HTMLElement).getByRole('link').getAttribute('href')).toBe(`/projects/${OTHER_PROJECT}/steps/1`);
  });

  it('DR-22 · US-ADMIN-05 AC2: each row shows the served project type and city under its name, each bound, in the order the API serves the rows', async () => {
    const list = projectList([
      { projectId: OTHER_PROJECT, name: 'TEST newer project' },
      { projectId: PROJECT, name: 'TEST older project' },
    ]);
    const typeOf = (projectId: string, text: string) => ({ valueId: `project:${projectId}.type`, kind: 'field' as const, text, shape: 'value' as const, badge: { id: 'provided_by_you' as const, label: 'TEST provided badge' } });
    const cityOf = (projectId: string, text: string) => ({ valueId: `project:${projectId}.city`, kind: 'field' as const, text, shape: 'value' as const, badge: { id: 'provided_by_you' as const, label: 'TEST provided badge' } });
    installFakeApi({
      'GET /api/projects': () =>
        json(200, {
          displayObjects: [...list.displayObjects, typeOf(OTHER_PROJECT, 'TEST renovation'), cityOf(OTHER_PROJECT, 'TEST city one'), typeOf(PROJECT, 'TEST existing building'), cityOf(PROJECT, 'TEST city two')],
          projects: list.projects.map((row) => ({ ...row, projectType: `project:${row.projectId}.type`, city: `project:${row.projectId}.city` })),
        }),
    });
    renderAt('/projects');
    const rows = within(await screen.findByRole('list', { name: 'Your projects' })).getAllByRole('listitem');
    expect(rows.map((row) => row.querySelector('[data-value-id$=".name"]')?.textContent)).toEqual(['TEST newer project', 'TEST older project']);
    expect(within(rows[0] as HTMLElement).getByText('TEST renovation').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${OTHER_PROJECT}.type`);
    expect(within(rows[0] as HTMLElement).getByText('TEST city one').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${OTHER_PROJECT}.city`);
    expect(within(rows[1] as HTMLElement).getByText('TEST existing building')).toBeTruthy();
    expect(within(rows[1] as HTMLElement).getByText('TEST city two')).toBeTruthy();
  });

  it('US-ADMIN-05 AC3: "New project" opens step 1 with no project', async () => {
    const seen = installFakeApi({ 'GET /api/projects': () => json(200, projectList([])) });
    const { router } = renderAt('/projects');
    expect(await screen.findByText('No projects yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'New project' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/projects/new'));
    expect(seen.some((request) => request.method === 'POST')).toBe(false);
  });

  it('R-136 · prompt 3 section 11: a list that fails to load says so and offers Try again, with no figure', async () => {
    let calls = 0;
    installFakeApi({
      'GET /api/projects': () => {
        calls += 1;
        return calls === 1 ? json(500, { code: 'internal_error' }) : json(200, projectList([]));
      },
    });
    renderAt('/projects');
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No projects yet.')).toBeTruthy();
  });
});

describe('DR-12 · DR-18 · A-8 · UD-37: the project list\'s loading state, heading roles and names', () => {
  it('DR-12 · prompt 3 section 11: while the list loads, the title and "New project" stay and one line says "Loading your answers", with no figure', async () => {
    installFakeApi({ 'GET /api/projects': () => new Promise<Response>(() => undefined) });
    renderAt('/projects');
    expect(await screen.findByText('Loading your answers')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'New project' })).toBeTruthy();
    expect(document.querySelector('main')?.textContent).not.toMatch(/\p{N}/u);
  });

  it('A-8 · rule 2 · US-ADMIN-05 AC2: a project name holding a direction control shows as stored, bound and isolated (<bdi>), in the list and in the project\'s header', async () => {
    const name = 'TEST \u202Eeman';
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name }])),
      [`GET /api/projects/${PROJECT}/steps/2`]: () => json(200, { ...envelope(PROJECT, [{ valueId: `project:${PROJECT}.documents.count`, kind: 'line', text: 'TEST files line', shape: 'value' }], { name }), view: { step: 2, files: [], documentCount: `project:${PROJECT}.documents.count`, stillReading: null } }),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    const { router } = renderAt('/projects');
    const listed = await screen.findByText(name);
    expect(listed.tagName).toBe('BDI');
    expect(listed.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.name`);
    await router.navigate(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('No files added yet. You can continue without documents and add them later.');
    const header = document.querySelector(`header [data-value-id="project:${PROJECT}.name"]`);
    expect(header?.querySelector('bdi')?.textContent).toBe(name);
    expect(header?.textContent).toBe(name);
  });

  it('DR-18: sign-in\'s accounts heading takes the kit\'s group heading role', async () => {
    installFakeApi({ 'GET /api/auth/dev-accounts': () => json(200, { accounts: [USER] }) }, { user: null });
    renderAt('/sign-in');
    const heading = await screen.findByRole('heading', { level: 2, name: 'Development accounts' });
    expect(heading.classList.contains('sov-heading-group')).toBe(true);
  });
});

describe('DR-17 · WCAG 2.4.2: the document title', () => {
  it('DR-17 · WCAG 2.4.2 · rule 2: each route names its page in the document title from the catalogue, with no digit and no project name', async () => {
    installFakeApi({ 'GET /api/auth/dev-accounts': () => json(200, { accounts: [USER] }) }, { user: null });
    renderAt('/sign-in');
    await waitFor(() => expect(document.title).toBe('Sign in – SOVITECH'));
    cleanup();
    vi.unstubAllGlobals();
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST named project' }])),
      [`GET /api/projects/${PROJECT}/steps/3`]: () => new Promise<Response>(() => undefined),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    const { router } = renderAt('/projects');
    await waitFor(() => expect(document.title).toBe('Your projects – SOVITECH'));
    await router.navigate('/projects/new');
    await waitFor(() => expect(document.title).toBe('New project – SOVITECH'));
    await router.navigate(`/projects/${PROJECT}/steps/1`);
    await waitFor(() => expect(document.title).toBe('Your project – SOVITECH'));
    await router.navigate(`/projects/${PROJECT}/steps/3`);
    await waitFor(() => expect(document.title).toBe('Your building – SOVITECH'));
    await router.navigate(`/projects/${PROJECT}/steps/4`);
    await waitFor(() => expect(document.title).toBe('Which systems should be included? – SOVITECH'));
    await router.navigate(`/projects/${PROJECT}/extracted`);
    await waitFor(() => expect(document.title).toBe('All extracted data – SOVITECH'));
    await router.navigate(`/projects/${PROJECT}/proposal`);
    await waitFor(() => expect(document.title).toBe('Preliminary proposal – SOVITECH'));
    await router.navigate(`/projects/${PROJECT}/steps/9`);
    await waitFor(() => expect(document.title).toBe('Page not found – SOVITECH'));
    await router.navigate('/nowhere');
    await waitFor(() => expect(document.title).toBe('Page not found – SOVITECH'));
    expect(document.title).not.toMatch(/\p{N}|TEST named project/u);
  });
});

describe('US-ADMIN-07 · US-ADMIN-01 AC3, AC4 · UD-16 · R-144: the header menu', () => {
  it('A-15 · WCAG 2.4.11 · UD-16: the open menu closes when the focus leaves it, so its panel never covers the focused element; a move within it keeps it open', async () => {
    installFakeApi({ 'GET /api/projects': () => json(200, projectList([])) });
    renderAt('/projects');
    const trigger = await screen.findByRole('button', { name: 'Menu' });
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const signOut = screen.getByRole('button', { name: 'Sign out' });
    // Within the menu: the panel stays.
    fireEvent.blur(trigger, { relatedTarget: signOut });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Tab past its last entry, into the page: the panel closes.
    const outside = screen.getByRole('link', { name: 'New project' });
    fireEvent.blur(signOut, { relatedTarget: outside });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '') as HTMLElement;
    expect(panel.hidden).toBe(true);
  });

  it('R-144 "Until decided" · US-ADMIN-07 AC1: the menu holds the account item (name and role), Projects and Sign out, and nothing else', async () => {
    installFakeApi({ 'GET /api/projects': () => json(200, projectList([])) });
    renderAt('/projects');
    const trigger = await screen.findByRole('button', { name: 'Menu' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '') as HTMLElement;
    expect(within(panel).getByText('TEST owner')).toBeTruthy();
    expect(within(panel).getByText('Owner')).toBeTruthy();
    expect(within(panel).getAllByRole('link').map((link) => link.textContent)).toEqual(['Projects']);
    expect(within(panel).getAllByRole('button').map((button) => button.textContent)).toEqual(['Sign out']);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('US-ADMIN-01 AC4: signing out shows sign-in and no project data from the session remains on screen', async () => {
    const seen = installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST own project' }])),
      'POST /api/auth/sign-out': () => new Response(null, { status: 204 }),
      'GET /api/auth/dev-accounts': () => json(200, { accounts: [USER] }),
    });
    const { router } = renderAt('/projects');
    expect(await screen.findByText('TEST own project')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(screen.queryByText('TEST own project')).toBeNull();
    await waitFor(() => expect(seen.some((request) => request.path === '/api/auth/sign-out')).toBe(true));
  });
});

describe('UD-36 · R-133: the entry', () => {
  it('R-133: "/" opens the project list with a session and sign-in without one', async () => {
    installFakeApi({ 'GET /api/projects': () => json(200, projectList([])) });
    const signedIn = renderAt('/');
    await waitFor(() => expect(signedIn.router.state.location.pathname).toBe('/projects'));
    cleanup();
    vi.unstubAllGlobals();
    installFakeApi({ 'GET /api/auth/dev-accounts': () => json(200, { accounts: [] }) }, { user: null });
    const signedOut = renderAt('/');
    await waitFor(() => expect(signedOut.router.state.location.pathname).toBe('/sign-in'));
  });
});
