/**
 * Shared steps of the admin area's component tests (phase 7). Not a test itself, never imported by the app.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';
import type { SessionUser } from '@sovitech/view-model/browser';
import { installFakeApi, json, renderAt, type Handler, type Seen } from '../test/harness';
import { ADMIN_USER, accountsResponse, datasetsResponse, guardrailEventsResponse } from './test-admin';

export const ADMIN_ROUTES = {
  accounts: '/api/admin/accounts',
  datasets: '/api/admin/datasets',
  guardrailEvents: '/api/admin/guardrail-events',
} as const;

/** The fake API of the admin area: each admin route answers its TEST response unless a handler is given. */
export function adminApi(handlers: Readonly<Record<string, Handler>> = {}, user: SessionUser = ADMIN_USER): Seen[] {
  return installFakeApi(
    {
      [`GET ${ADMIN_ROUTES.accounts}`]: () => json(200, accountsResponse()),
      [`GET ${ADMIN_ROUTES.datasets}`]: () => json(200, datasetsResponse()),
      [`GET ${ADMIN_ROUTES.guardrailEvents}`]: () => json(200, guardrailEventsResponse()),
      ...handlers,
    },
    { user },
  );
}

/** Opens an admin page and waits until it has rendered what it asked for. */
export async function openAdminPage(path: string, title: string) {
  const view = renderAt(path);
  await screen.findByRole('heading', { level: 1, name: title });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  return view;
}

/** The page's own column (the article), outside the area's navigation and the header. */
export function pageColumn(): HTMLElement {
  return screen.getByRole('article');
}

/**
 * Every control in an element that could change anything: a button, a form field, a form, an editable region, a link
 * (the page column holds none: the area's navigation sits outside it). The admin pages hold none (prompt 3 5.4;
 * guardrails section 10, "Metrics prompt a review, never an edit").
 */
export function controlsIn(element: HTMLElement): Element[] {
  return [...element.querySelectorAll('button, input, select, textarea, form, a[href], [contenteditable="true"], [role="button"], [role="switch"], [role="checkbox"], [role="menuitem"]')];
}

/** The table a section's caption names. */
export function tableNamed(name: string): HTMLElement {
  return screen.getByRole('table', { name });
}

/** The row of a table whose row header holds the text. */
export function rowOf(table: HTMLElement, text: string): HTMLElement {
  const header = within(table).getAllByRole('rowheader').find((cell) => cell.textContent?.includes(text) === true);
  const row = header?.closest('tr');
  if (row === null || row === undefined) throw new Error(`no row headed "${text}"`);
  return row;
}
