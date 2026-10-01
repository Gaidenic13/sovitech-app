/**
 * Renders the app's own route table (../routes.tsx) in a memory router at a path, for the web's
 * component tests and for guardrail cases that drive the web (tests/guardrails/G10-12.test.tsx). Not
 * a test itself, never imported by the app, and it replaces nothing: the routes, pages, client and
 * `fetch` are the app's own.
 */
import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { routes } from '../routes';

export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}
