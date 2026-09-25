/**
 * Every app screen and state the render test visits (guardrails rule 2: "every wizard step
 * and dashboard fixture"). Each phase that adds a screen or a state adds it here, with the
 * route, where its display objects come from and, where needed, the steps that bring the
 * screen into that state. screens-schema.ts holds the rules for an entry; tools/checks/render
 * (`pnpm checks`) and the render spec both apply them.
 *
 * `displayObjects` is required on every entry (docs/adr/0006-render-test.md, decision 1):
 * - `displayObjectsFromApi()` (api-display-objects.ts): the display objects the page itself
 *   receives from the API. Every screen that shows a value uses it, from phase 3 on;
 * - or `{}`, for a screen that shows no value (the phase 0 placeholder).
 * Nothing else is accepted: a function, a hand-typed map of display objects, or an object
 * that only looks like the API source would let a test supply the ids and texts the check
 * compares the screen with. Every `data-value-id` on the screen that the API did not serve
 * fails, and so does every number in a value element that its display object does not declare.
 *
 * Phase 0 (2026-09-25): the app has one placeholder page, with no value on it.
 */
import type { Page } from '@playwright/test';
import type { ApiDisplayObjectSource } from './api-display-objects';

/** A screen that shows no value: no display objects. */
export type ShowsNoValues = Readonly<Record<string, never>>;

export interface RenderScreen {
  /** Screen id (OB-, DB-, UD-) and state, or a plain name before screens exist. */
  name: string;
  /** Path under the Playwright baseURL. */
  path: string;
  /** Required: where the screen's display objects come from (see above). */
  displayObjects: ApiDisplayObjectSource | ShowsNoValues;
  /** Steps after navigation that bring the screen into the state to check. */
  arrange?: (page: Page) => Promise<void>;
}

export const RENDER_SCREENS: readonly RenderScreen[] = [
  { name: 'placeholder page (phase 0 scaffold)', path: '/', displayObjects: {} },
];
