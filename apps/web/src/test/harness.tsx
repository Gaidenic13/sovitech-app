/**
 * Test support for the web's component and route tests (happy-dom; vitest.config.ts project
 * `components`). Not a test itself, and never imported by the app.
 *
 * - `installFakeApi` replaces `fetch` with a fake API that answers the contract's routes from the
 *   handlers given, records every request, and answers the session and the CSRF token by default.
 * - `renderAt` renders the app's real route table (../routes.tsx) in a memory router at a path.
 * - The display objects built here carry TEST values in the contract's shapes; none is a figure of
 *   the mockups or of a real building.
 */
import { act } from '@testing-library/react';
import { vi } from 'vitest';
import type { DisplayObject, Line, SessionUser } from '@sovitech/view-model/browser';
import { resetCsrfToken } from '../api/client';
import { renderApp } from './render-app';

export const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
export const OTHER_PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9e';
export const USER: SessionUser = { userId: '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e90', displayName: 'TEST owner', roles: ['owner'] };
export const AS_OF = '2026-09-30T10:00:00.000Z';
export const DEMO_LINE: Line = { id: 'demo_project', kind: 'demo_line', text: 'TEST demo line' };

export interface Seen {
  readonly method: string;
  readonly path: string;
  readonly url: URL;
  readonly body: unknown;
  readonly headers: Headers;
}

export type Handler = (request: Seen) => Response | Promise<Response>;

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function bodyOf(init: RequestInit | undefined): Promise<unknown> {
  const body = init?.body;
  if (typeof body !== 'string') return body;
  const parsed: unknown = await new Response(body).json();
  return parsed;
}

/**
 * Installs the fake API. `handlers` are keyed "METHOD /path" (the path as sent, parameters filled);
 * a handler may also be keyed "METHOD /path/*" to answer every path under it. Unhandled requests
 * answer 404 `not_found`.
 */
export function installFakeApi(handlers: Readonly<Record<string, Handler>>, options: { readonly user?: SessionUser | null } = {}): Seen[] {
  resetCsrfToken();
  const user = options.user === undefined ? USER : options.user;
  const defaults: Record<string, Handler> = {
    'GET /api/csrf': () => json(200, { token: 'TEST-token' }),
    'GET /api/auth/session': () => json(200, { user }),
  };
  const all: Record<string, Handler> = { ...defaults, ...handlers };
  const seen: Seen[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, 'http://127.0.0.1');
      const method = init?.method ?? 'GET';
      const request: Seen = { method, path: url.pathname, url, body: await bodyOf(init), headers: new Headers(init?.headers) };
      seen.push(request);
      const exact = all[`${method} ${url.pathname}`];
      if (exact !== undefined) return exact(request);
      const prefix = Object.entries(all).find(([key]) => key.endsWith('/*') && `${method} ${url.pathname}`.startsWith(key.slice(0, -1)));
      if (prefix !== undefined) return prefix[1](request);
      return json(404, { code: 'not_found' });
    }),
  );
  return seen;
}

export function renderAt(path: string) {
  return renderApp(path);
}

/** The project name's display object, as the API would serve it. */
export function nameDisplay(projectId: string, text: string): DisplayObject {
  return { valueId: `project:${projectId}.name`, kind: 'field', text, shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' } };
}

/** `GET /api/projects` with the given projects (the first flagged demo when `demo` is set). */
export function projectList(projects: ReadonlyArray<{ readonly projectId: string; readonly name: string; readonly demo?: boolean }>) {
  return {
    displayObjects: projects.map((project) => nameDisplay(project.projectId, project.name)),
    projects: projects.map((project) => ({
      projectId: project.projectId,
      name: `project:${project.projectId}.name`,
      isDemo: project.demo === true,
      demoLine: project.demo === true ? DEMO_LINE : null,
    })),
  };
}

/** A screen envelope for the project (common.ts `screenEnvelope`). */
export function envelope(projectId: string, displayObjects: readonly DisplayObject[], options: { readonly demo?: boolean; readonly name?: string } = {}) {
  const name = nameDisplay(projectId, options.name ?? 'TEST project');
  return {
    asOf: AS_OF,
    project: { projectId, name: name.valueId, isDemo: options.demo === true, demoLine: options.demo === true ? DEMO_LINE : null },
    displayObjects: [name, ...displayObjects],
  };
}

/**
 * Two presses of a control before React renders again (a double-click, Enter then a click, a key held
 * down): both clicks are dispatched inside one act, so the second meets the handlers and the state of
 * the first render. A guard that only reads React state lets the second through; the wizard's
 * (../wizard/use-in-flight.ts) does not.
 */
export function pressTwice(element: HTMLElement): void {
  act(() => {
    element.click();
    element.click();
  });
}

/**
 * A handler whose answer waits until `answer()` is called: the request stays on its way meanwhile.
 * Every request it receives waits for the same call.
 */
export function heldHandler(respond: (request: Seen) => Response | Promise<Response>): { readonly handler: Handler; readonly answer: () => void } {
  let open: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  return {
    handler: async (request) => {
      await gate;
      return respond(request);
    },
    answer: () => open(),
  };
}

/** How many requests of a method went to a path ending with `suffix`. */
export function sentTo(seen: readonly Seen[], method: string, suffix: string): number {
  return seen.filter((request) => request.method === method && request.path.endsWith(suffix)).length;
}

/** Lets every request a press started reach the fake API (the CSRF token's fetch comes first). */
export async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}
