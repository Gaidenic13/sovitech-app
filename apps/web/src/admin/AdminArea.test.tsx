/**
 * The admin area's frame and the landing by role (phase 7; ./AdminLayout.tsx, ./landing.ts, ../routes.tsx `Entry`,
 * ../pages/SignInPage.tsx, ../pages/ProjectListPage.tsx; docs/adr/0053 decisions 3 to 5; PRD R-144 "Until decided",
 * R-136; the build log, phase 7, "Plan"). Against the fake API of ../test/harness.ts; every account is a TEST account.
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@sovitech/view-model/browser';
import { PROJECT, installFakeApi, json, projectList, renderAt } from '../test/harness';
import { ADMIN_ROUTES, adminApi, openAdminPage } from './admin-test-support';
import { landingOf, mayCreateProjects, mayReadAdminArea, roleLinesOf } from './landing';
import { ADMIN_OWNER_USER, ADMIN_USER, ENGINEER_USER, OWNER_USER, REVIEWER_USER } from './test-admin';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function adminRequests(seen: readonly { readonly path: string }[]): number {
  return seen.filter((request) => request.path.startsWith('/api/admin/')).length;
}

describe('ADR 0053 decision 4 · R-144 "Until decided": where each role lands', () => {
  it('ADR 0053 decision 4 · landing.ts: a user holding sovitech_admin and not owner lands on the admin area; every other user on the project list; only owner starts projects; only sovitech_admin draws the area', () => {
    expect(landingOf(ADMIN_USER)).toBe('/admin/accounts');
    for (const user of [OWNER_USER, ADMIN_OWNER_USER, ENGINEER_USER, REVIEWER_USER]) expect(landingOf(user)).toBe('/projects');
    expect([OWNER_USER, ADMIN_OWNER_USER, ENGINEER_USER, REVIEWER_USER, ADMIN_USER].map(mayCreateProjects)).toEqual([true, true, false, false, false]);
    expect([OWNER_USER, ADMIN_OWNER_USER, ENGINEER_USER, REVIEWER_USER, ADMIN_USER].map(mayReadAdminArea)).toEqual([false, true, false, false, true]);
    expect(roleLinesOf(ADMIN_OWNER_USER)).toEqual([]);
    expect(roleLinesOf({ roles: ['sovitech_engineer', 'sovitech_admin'] })).toEqual(['sovitech_engineer', 'sovitech_admin']);
  });

  it.each([
    ['the admin', ADMIN_USER, '/admin/accounts'],
    ['the owner', OWNER_USER, '/projects'],
    ['an admin who is also an owner', ADMIN_OWNER_USER, '/projects'],
    ['the engineer', ENGINEER_USER, '/projects'],
    ['the commercial reviewer', REVIEWER_USER, '/projects'],
  ] as const)('ADR 0053 decision 4: the app\'s entry sends %s where the roles land it', async (_who, user: SessionUser, path) => {
    adminApi({ 'GET /api/projects': () => json(200, projectList([])) }, user);
    const { router } = renderAt('/');
    await waitFor(() => expect(router.state.location.pathname).toBe(path));
  });

  it('US-ADMIN-01 · ADR 0038 (amended): signing in with the development admin from the sign-in page lands on the admin area', async () => {
    let signedIn = false;
    installFakeApi({
      'GET /api/auth/session': () => json(200, { user: signedIn ? ADMIN_USER : null }),
      'GET /api/auth/dev-accounts': () => json(200, { accounts: [OWNER_USER, ENGINEER_USER, REVIEWER_USER, ADMIN_USER] }),
      'POST /api/auth/dev-sign-in': () => {
        signedIn = true;
        return json(200, { user: ADMIN_USER });
      },
      [`GET ${ADMIN_ROUTES.accounts}`]: () => json(404, { code: 'not_found' }),
    }, { user: null });
    const { router } = renderAt('/sign-in');
    fireEvent.click(await screen.findByRole('button', { name: /TEST development admin/u }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/accounts'));
  });
});

describe('ADR 0053 decisions 3 and 5: who sees the admin area', () => {
  it('ADR 0053 decision 5 · R-134: a user without sovitech_admin who opens an admin page sees the app\'s not-found page: no navigation, no admin title, and nothing is asked of the API', async () => {
    const seen = adminApi({}, ENGINEER_USER);
    renderAt('/admin/guardrail-events');
    expect(await screen.findByRole('heading', { level: 1, name: 'This page does not exist.' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Admin area' })).toBeNull();
    expect(screen.queryByText('Guardrail events')).toBeNull();
    await waitFor(() => expect(document.title).toBe('Page not found – SOVITECH'));
    expect(adminRequests(seen)).toBe(0);
  });

  it.each([
    ['403 admin_only', 403, 'admin_only'],
    ['404 admin_off', 404, 'admin_off'],
  ] as const)('ADR 0053 decisions 3 and 5: a refusal of the area (%s) reads exactly as a page that does not exist: the frame and its navigation give way', async (_name, status, code) => {
    adminApi({ [`GET ${ADMIN_ROUTES.datasets}`]: () => json(status, { code }) });
    renderAt('/admin/datasets');
    expect(await screen.findByRole('heading', { level: 1, name: 'This page does not exist.' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Admin area' })).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    await waitFor(() => expect(document.title).toBe('Page not found – SOVITECH'));
  });

  it('UD-39 to UD-41 · WCAG 2.4.2 · 2.4.3 · keyboard: the admin sees the area\'s three pages as links in its navigation, the current one marked, each page titled; following a link opens that page and takes the focus to its main region', async () => {
    adminApi();
    const { router } = await openAdminPage('/admin/accounts', 'Accounts and roles');
    const nav = screen.getByRole('navigation', { name: 'Admin area' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Accounts and roles', '/admin/accounts'],
      ['Datasets', '/admin/datasets'],
      ['Guardrail events', '/admin/guardrail-events'],
    ]);
    expect(links[0]?.getAttribute('aria-current')).toBe('page');
    await waitFor(() => expect(document.title).toBe('Accounts and roles – SOVITECH'));
    expect(screen.getByText(/Development only\. Everything here is read-only/u)).toBeTruthy();
    fireEvent.click(links[1] as HTMLElement);
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/datasets'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Datasets' })).toBeTruthy();
    await waitFor(() => expect(document.activeElement?.id).toBe('main'));
    expect(within(screen.getByRole('navigation', { name: 'Admin area' })).getByRole('link', { name: 'Datasets' }).getAttribute('aria-current')).toBe('page');
  });

  it('UD-39: /admin opens the first page of the area', async () => {
    adminApi();
    const { router } = renderAt('/admin');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/accounts'));
  });
});

describe('R-136 · ADR 0053 decision 4: the project list by role (draft copy)', () => {
  async function openList(user: SessionUser) {
    installFakeApi({ 'GET /api/projects': () => json(200, projectList([])) }, { user });
    renderAt('/projects');
    await screen.findByRole('heading', { level: 1, name: 'Projects' });
    await screen.findByText('No projects yet.');
  }

  it('R-136 · ADR 0053 decision 4: the owner: "New project", the owner\'s intro and the empty state\'s detail; no role line and no admin link', async () => {
    await openList(OWNER_USER);
    expect(screen.getByRole('link', { name: 'New project' }).getAttribute('href')).toBe('/projects/new');
    expect(screen.getByText('Open a project to continue its intake, or start a new one.')).toBeTruthy();
    expect(screen.getByText('A new project starts with its name, its type and where the building is.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'What your role does in this build' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Open the admin area' })).toBeNull();
  });

  it('R-128 "Until decided" (D-16) · R-136: the engineer sees no "New project", no word on starting one, and the line saying the review queue is not available yet', async () => {
    await openList(ENGINEER_USER);
    expect(screen.queryByRole('link', { name: 'New project' })).toBeNull();
    expect(screen.queryByText('A new project starts with its name, its type and where the building is.')).toBeNull();
    expect(screen.getByText('Open a project to see its intake.')).toBeTruthy();
    const lines = screen.getByRole('region', { name: 'What your role does in this build' });
    expect(within(lines).getByText('The engineer review queue is not built: where SOVITECH engineers work is not decided yet.')).toBeTruthy();
    expect(within(lines).queryByRole('link')).toBeNull();
  });

  it('R-129 "Until decided" (D-20, D-16) · R-136: the commercial reviewer sees no "New project" and the line saying the commercial review is not available yet', async () => {
    await openList(REVIEWER_USER);
    expect(screen.queryByRole('link', { name: 'New project' })).toBeNull();
    const lines = screen.getByRole('region', { name: 'What your role does in this build' });
    expect(within(lines).getByText('The commercial review of a price is not built: where it happens is not decided yet.')).toBeTruthy();
  });

  it('R-136 · ADR 0053 decision 4: the admin without owner: no "New project", the admin\'s line and "Open the admin area"', async () => {
    await openList(ADMIN_USER);
    expect(screen.queryByRole('link', { name: 'New project' })).toBeNull();
    const lines = screen.getByRole('region', { name: 'What your role does in this build' });
    expect(within(lines).getByText('Open the admin area to see accounts, datasets and guardrail events.')).toBeTruthy();
    expect(within(lines).getByRole('link', { name: 'Open the admin area' }).getAttribute('href')).toBe('/admin/accounts');
  });

  it('R-136 · ADR 0053 decision 4: an admin who also holds owner: "New project" and "Open the admin area", and no role line', async () => {
    await openList(ADMIN_OWNER_USER);
    expect(screen.getByRole('link', { name: 'New project' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the admin area' }).getAttribute('href')).toBe('/admin/accounts');
    expect(screen.queryByRole('region', { name: 'What your role does in this build' })).toBeNull();
  });

  it('R-136 · G10-10: the demo project\'s row keeps its served demo line for every role, as R-136\'s interim lists it for every development account', async () => {
    installFakeApi({ 'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST demo hotel', demo: true }])) }, { user: ENGINEER_USER });
    renderAt('/projects');
    const list = await screen.findByRole('list', { name: 'Your projects' });
    expect(within(list).getByText('TEST demo line')).toBeTruthy();
  });
});
