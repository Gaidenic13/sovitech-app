/**
 * UD-39, accounts, roles, projects and processors, read-only (phase 7; ./AccountsPage.tsx; docs/adr/0053 decision 7;
 * PRD R-134, R-143 and R-154 "Until decided"). Against the fake API of ../test/harness.ts with TEST responses the
 * contract accepts (./test-admin.ts).
 */
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminAccountsResponseSchema } from '@sovitech/view-model/browser';
import { heldHandler, json, renderAt } from '../test/harness';
import { rowDemoLine } from './admin-view';
import { ADMIN_ROUTES, adminApi, controlsIn, openAdminPage, pageColumn, rowOf, tableNamed } from './admin-test-support';
import { ADMIN_ID, DEMO_PROJECT, GRANT_EVENT, OWNER_ID, OWN_PROJECT, REVOKE_EVENT, SEED_ID, TEST_DEMO_LINE, accountsResponse } from './test-admin';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PATH = '/admin/accounts';
const TITLE = 'Accounts and roles';

describe('UD-39 · R-134 · R-154 · R-143: accounts, roles, projects and processors', () => {
  it('UD-39 · ADR 0053 (contract admin.accounts): the TEST fixture is a response the contract accepts', () => {
    expect(() => AdminAccountsResponseSchema.parse(accountsResponse())).not.toThrow();
  });

  it('US-ADMIN-03 · US-ADMIN-16 AC1 · rule 2: each account by its served name, bound, its kind, the development accounts marked, and each role held with its grant day, bound', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    const table = tableNamed('Accounts');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Account', 'Kind', 'Roles']);
    const admin = rowOf(table, 'TEST development admin');
    expect(within(admin).getByText('TEST development admin').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`account:${ADMIN_ID}.displayName`);
    expect(within(admin).getByText('Development account')).toBeTruthy();
    expect(within(admin).getByText('Person')).toBeTruthy();
    expect(within(admin).getByText('SOVITECH admin')).toBeTruthy();
    expect(within(admin).getByText('TEST 7 Oct 2026').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`account:${ADMIN_ID}.roles.sovitech_admin.since`);
    const seed = rowOf(table, 'TEST demo seed');
    expect(within(seed).getByText('Seed account')).toBeTruthy();
    expect(within(seed).queryByText('Development account')).toBeNull();
    expect(within(seed).getByText('No role')).toBeTruthy();
    expect(seed.querySelector(`[data-value-id="account:${SEED_ID}.displayName"]`)).not.toBeNull();
  });

  it('ADR 0013 decision 2 · R-154: every role change as served, newest first: the account, the role, granted or revoked, by whom, when and the reason recorded, each bound', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    const table = tableNamed('Role changes');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Account', 'Role', 'Change', 'By', 'When', 'Reason']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const [revoked, granted] = rows as [HTMLElement, HTMLElement];
    expect(within(revoked).getByText('TEST development owner').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`account:${OWNER_ID}.displayName`);
    expect(within(revoked).getByText('SOVITECH engineer')).toBeTruthy();
    expect(within(revoked).getByText('Revoked')).toBeTruthy();
    for (const [field, text] of [
      ['by', 'TEST operator login'],
      ['at', 'TEST 6 Oct 2026'],
      ['reason', 'TEST reason, revoked'],
    ] as const) {
      expect(within(revoked).getByText(text).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`role_event:${REVOKE_EVENT}.${field}`);
    }
    expect(within(granted).getByText('Granted')).toBeTruthy();
    expect(granted.querySelector(`[data-value-id="role_event:${GRANT_EVENT}.reason"]`)?.textContent).toBe('TEST reason, granted');
  });

  it('G10-10 (extended) · rule 13: projects by their id only, bound, with their creation day and members by name; no demo line on a project that is not the demo', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    const table = tableNamed('Projects');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Project', 'Created', 'Members']);
    const demo = rowOf(table, DEMO_PROJECT);
    expect(demo.querySelector(`[data-value-id="admin_project:${DEMO_PROJECT}.id"]`)?.textContent).toBe(DEMO_PROJECT);
    expect(demo.querySelector(`[data-value-id="admin_project:${DEMO_PROJECT}.createdOn"]`)?.textContent).toBe('TEST 1 Oct 2026');
    expect(within(demo).getByText('TEST development owner').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`account:${OWNER_ID}.displayName`);
    const own = rowOf(table, OWN_PROJECT);
    expect(within(own).getByText('No member')).toBeTruthy();
    expect(own.querySelector('[data-demo-line]')).toBeNull();
    // The demo's row carries the line the API served with it (phase 7 integrator; P-7-ADMIN-ROW-DEMO-LINE), and only that row.
    expect(demo.querySelector('[data-demo-line]')?.textContent).toBe(TEST_DEMO_LINE.text);
    expect(table.querySelectorAll('[data-demo-line]')).toHaveLength(1);
  });

  it('G10-10 (extended) · rule 10: a row carries the demo line the API served for it only when the row is the demo project, and never words of the web', () => {
    const line = { id: 'demo_data', kind: 'demo_line' as const, text: 'TEST demo line' };
    expect(rowDemoLine({ isDemo: true, demoLine: line })).toEqual(line);
    expect(rowDemoLine({ isDemo: false, demoLine: line })).toBeNull();
    expect(rowDemoLine({ isDemo: true })).toBeNull();
    expect(rowDemoLine({ isDemo: false })).toBeNull();
  });

  it('R-143 "Until decided" (D-09): the processors section says that none is chosen and that no owner document or excerpt is sent to any external service', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    const section = screen.getByRole('region', { name: 'Processors' });
    expect(section.textContent).toContain('No processor is chosen. No owner document or excerpt is sent to any external service.');
    expect(within(section).queryByRole('table')).toBeNull();
  });

  it('R-154 "Until decided" · prompt 3 5.4: no control anywhere on the page creates an account, grants or revokes a role, adds a member or changes a processor', async () => {
    adminApi();
    await openAdminPage(PATH, TITLE);
    expect(controlsIn(pageColumn())).toEqual([]);
    for (const name of [/grant/iu, /revoke/iu, /add/iu, /create/iu, /invite/iu, /remove/iu, /approve/iu]) expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('UD-39 · prompt 3 section 11: with no role change and no project, each table says so in words; nothing stands in for a row', async () => {
    adminApi({ [`GET ${ADMIN_ROUTES.accounts}`]: () => json(200, accountsResponse({ roleEvents: false, projects: false })) });
    await openAdminPage(PATH, TITLE);
    expect(within(tableNamed('Role changes')).getByText('No role has been granted or revoked yet.')).toBeTruthy();
    expect(within(tableNamed('Projects')).getByText('No project exists yet.')).toBeTruthy();
  });

  it('R-003 · prompt 3 section 11: while the answer is on its way the page shows one polite line and no figure; a failure says so and "Try again" reads it again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    let reads = 0;
    adminApi({
      [`GET ${ADMIN_ROUTES.accounts}`]: (request) => {
        reads += 1;
        return reads === 1 ? held.handler(request) : json(200, accountsResponse());
      },
    });
    renderAt(PATH);
    expect(await screen.findByRole('heading', { level: 1, name: TITLE })).toBeTruthy();
    expect(within(pageColumn()).getByRole('status').textContent).toBe('Loading this page');
    expect(/\d/u.test(pageColumn().textContent ?? '')).toBe(false);
    held.answer();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('This page could not be loaded.');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Accounts' })).toBeTruthy();
    expect(reads).toBe(2);
  });
});
