/**
 * The one registered source of an app screen's display objects (docs/adr/0006-render-test.md,
 * decision 1): the display objects the page itself receives from the API.
 *
 * A screen entry (screens.ts) or an e2e flow names `displayObjectsFromApi()`. The render check
 * then intercepts every response of the display-object route the page requests, reads the
 * display objects in it, hands them to the in-page harness, and only then lets the page have
 * the response, so the harness knows each value id and its text before the page can render
 * it. Nothing a test types can add a display object: a screen entry whose display objects are
 * a function, a hand-typed object, or an object that only looks like this source is refused
 * (screens-schema.ts), and a check prepared with typed display objects runs only on the
 * harness's own pages (render-check.ts).
 *
 * Phase 0 builds the mechanism, proven against a TEST server in
 * tools/checks/render/api-display-objects.test.ts. Phase 3 points `DISPLAY_OBJECT_ROUTE` at
 * the route the API serves display objects on and `parseServedDisplayObjects` at the
 * view-model's display-object type (`@sovitech/view-model/browser`).
 */
import type { BrowserContext, Page, Route } from '@playwright/test';
import { z } from 'zod';
import type { ServedDisplay } from './contract';
import { checkedDisplayObjects } from './display-objects';

/**
 * The route the API serves display objects on. Phase 3 replaces it with the route the
 * view-model's API client names; until then no app screen requests it.
 */
export const DISPLAY_OBJECT_ROUTE = /\/api\/display-objects(?:[/?#]|$)/u;

/** A screen's display objects, taken from what the page receives from the API. */
export interface ApiDisplayObjectSource {
  readonly kind: 'api-display-objects';
}

const REGISTERED = new WeakSet<object>();

/** The registered source: the display objects the page receives from the API. */
export function displayObjectsFromApi(): ApiDisplayObjectSource {
  const source: ApiDisplayObjectSource = Object.freeze({ kind: 'api-display-objects' });
  REGISTERED.add(source);
  return source;
}

/** true only for a source this module created; a look-alike object is not one. */
export function isRegisteredApiSource(value: unknown): value is ApiDisplayObjectSource {
  return typeof value === 'object' && value !== null && REGISTERED.has(value);
}

const servedBody = z.object({
  displayObjects: z.array(z.object({ valueId: z.string() }).loose()),
});

/**
 * The display objects in one response body of the display-object route:
 * `{ displayObjects: [{ valueId, text, lines?, parts?, evidence? }] }`. Throws when the body
 * does not hold valid display objects. Phase 3: the view-model's display-object type.
 */
export function parseServedDisplayObjects(body: unknown): Record<string, ServedDisplay> {
  const parsed = servedBody.safeParse(body);
  if (!parsed.success) {
    throw new Error(`the display-object response is not { displayObjects: [{ valueId, text, ... }] }: ${parsed.error.message}`);
  }
  const byId: Record<string, unknown> = {};
  for (const item of parsed.data.displayObjects) {
    const { valueId, ...display } = item;
    if (Object.hasOwn(byId, valueId)) throw new Error(`the display-object response names ${valueId} twice`);
    byId[valueId] = display;
  }
  return checkedDisplayObjects(byId, 'the display objects the API served');
}

/** What the adapter collected for one page or context. */
export interface ApiDisplayObjectCollector {
  /** Every display object received so far; a later response replaces an earlier one per value id. */
  current(): Record<string, ServedDisplay>;
  /** How many display-object responses the page received. */
  responses(): number;
  /** Responses that could not be read; the render check fails on any. */
  problems(): string[];
}

/**
 * Intercepts the display-object route for a page or a context. For each response: read it,
 * add its display objects, `deliver` them all to the page that asked (the render check puts
 * them into the in-page harness), then fulfil the page's request with the same response.
 */
export async function collectApiDisplayObjects(
  target: Page | BrowserContext,
  deliver: (page: Page, displayObjects: Record<string, ServedDisplay>) => Promise<void>,
): Promise<ApiDisplayObjectCollector> {
  const collected = new Map<string, ServedDisplay>();
  const problems: string[] = [];
  let responses = 0;
  const handle = async (route: Route): Promise<void> => {
    const response = await route.fetch();
    try {
      const served = parseServedDisplayObjects(await response.json());
      for (const [valueId, display] of Object.entries(served)) collected.set(valueId, display);
      responses += 1;
      await deliver(route.request().frame().page(), Object.fromEntries(collected));
    } catch (error) {
      problems.push(`${route.request().url()}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await route.fulfill({ response });
  };
  await target.route(DISPLAY_OBJECT_ROUTE, handle);
  return {
    current: () => Object.fromEntries(collected),
    responses: () => responses,
    problems: () => [...problems],
  };
}
