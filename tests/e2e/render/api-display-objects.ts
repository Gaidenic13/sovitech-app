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
 * Phase 0 built the mechanism against a TEST server; phase 3 points it at the API: a request is a
 * display-object request when its method and path match a route the contract marks
 * `servesDisplayObjects` (`isDisplayObjectRequest`, packages/view-model/src/browser/contract/routes.ts),
 * and each display object of a 2xx response is validated against the contract's
 * `DisplayObjectSchema` and projected with `servedDisplayOf`, the one projection the UI components
 * render from (docs/adr/0036-wizard-api-contract.md). A refusal (4xx, 5xx) of a display-object
 * route is passed to the page unread unless its body carries display objects.
 *
 * Phase 3 part B: a refusal may carry display objects of its own (the contract's `RefusalBody`
 * `displayObjects`; the fixtures-only guard's `not_a_fixture` names the refused file, bound to
 * `upload:<id>.fileName`, DR-10). So a refusal of any state-changing request (not a GET) is read too:
 * when its JSON body holds `displayObjects`, they are validated and projected as above and handed to
 * the harness before the page has the refusal; a malformed list is a problem that fails the check. A
 * GET outside the display-object routes, and a refusal with no display objects, pass unread.
 */
import type { BrowserContext, Page, Route } from '@playwright/test';
import { z } from 'zod';
import { DisplayObjectSchema, isDisplayObjectRequest, servedDisplayOf } from '@sovitech/view-model/browser';
import type { ServedDisplay } from './contract';
import { checkedDisplayObjects } from './display-objects';

/** Every API request is looked at; only display-object requests are read (`isDisplayObjectRoute`). */
const API_REQUESTS = /\/api\//u;

/** Whether a request (method and full URL) is one whose 2xx response carries display objects. */
export function isDisplayObjectRoute(method: string, url: string): boolean {
  return isDisplayObjectRequest(method, new URL(url).pathname);
}

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

const servedBody = z.object({ displayObjects: z.array(DisplayObjectSchema) }).loose();

/**
 * The display objects in one 2xx response body of a display-object route, each projected with
 * the contract's `servedDisplayOf`. Throws when the body does not hold valid display objects, or
 * names one value id twice with two different displays (G2-7: one value id, one display).
 */
export function parseServedDisplayObjects(body: unknown): Record<string, ServedDisplay> {
  const parsed = servedBody.safeParse(body);
  if (!parsed.success) {
    throw new Error(`the display-object response is not { displayObjects: [DisplayObject] } as the contract defines it: ${parsed.error.message}`);
  }
  const byId: Record<string, ServedDisplay> = {};
  for (const display of parsed.data.displayObjects) {
    const served = servedDisplayOf(display);
    const earlier = byId[display.valueId];
    if (earlier !== undefined) {
      if (JSON.stringify(earlier) !== JSON.stringify(served)) throw new Error(`the display-object response names ${display.valueId} twice, with two different displays`);
      continue;
    }
    byId[display.valueId] = served;
  }
  return checkedDisplayObjects(byId, 'the display objects the API served');
}

/** A delivery that failed only because its document was replaced or closed (a navigation in flight). */
function isNavigationRace(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Execution context was destroyed|Frame was detached|frame got detached|Target page, context or browser has been closed/iu.test(message);
}

/**
 * A request that could not go on because its test had ended or its page had closed: a request still in
 * flight when a screen's check is over (a poll, or a held request released at the end of its test;
 * tests/e2e/support/network.ts). No check reads that page any more, so there is nothing to collect.
 */
function isAfterTheTest(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Test ended|Target page, context or browser has been closed/iu.test(message);
}

type FetchedResponse = Awaited<ReturnType<Route['fetch']>>;

/** A display-object response's JSON body; a body that is not JSON is a problem (and nothing is read). */
async function readBody(response: FetchedResponse, where: string, problems: string[]): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return body;
  } catch (error) {
    problems.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

/** A refusal's JSON body when it carries display objects (RefusalBody.displayObjects); otherwise nothing to read. */
async function refusalWithDisplays(response: FetchedResponse, where: string, problems: string[]): Promise<unknown> {
  if (!(response.headers()['content-type'] ?? '').includes('application/json')) return undefined;
  const body = await readBody(response, where, problems);
  return typeof body === 'object' && body !== null && 'displayObjects' in body ? body : undefined;
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
    const request = route.request();
    const displayRoute = isDisplayObjectRoute(request.method(), request.url());
    // A GET outside the display-object routes never carries display objects: it goes on unread.
    if (!displayRoute && request.method().toUpperCase() === 'GET') {
      try {
        await route.fallback();
      } catch (error) {
        if (!isAfterTheTest(error)) throw error;
      }
      return;
    }
    let response: Awaited<ReturnType<Route['fetch']>>;
    try {
      response = await route.fetch();
    } catch (error) {
      // A fetch that failed while its page's check still runs is a failure of the run; one after the test ended is nothing.
      if (isAfterTheTest(error)) return;
      throw error;
    }
    const where = `${request.method()} ${new URL(request.url()).pathname}`;
    // A display-object route's 2xx always carries display objects; any refusal may (RefusalBody.displayObjects).
    const body = displayRoute && response.ok() ? await readBody(response, where, problems) : !response.ok() ? await refusalWithDisplays(response, where, problems) : undefined;
    if (body !== undefined) {
      let served: Record<string, ServedDisplay> | undefined;
      try {
        served = parseServedDisplayObjects(body);
      } catch (error) {
        problems.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (served !== undefined) {
        for (const [valueId, display] of Object.entries(served)) collected.set(valueId, display);
        responses += 1;
        try {
          await deliver(request.frame().page(), Object.fromEntries(collected));
        } catch (error) {
          // The page navigated while the response was on its way: the document it was for is gone.
          // Nothing is lost: the next document's harness starts empty and receives everything
          // collected at its own first display-object response, and a value it shows unannounced
          // fails the check (unknown-value-id). Any other delivery error is a problem.
          if (!isNavigationRace(error)) problems.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    try {
      await route.fulfill({ response });
    } catch (error) {
      if (!isNavigationRace(error) && !isAfterTheTest(error)) throw error;
    }
  };
  await target.route(API_REQUESTS, handle);
  return {
    current: () => Object.fromEntries(collected),
    responses: () => responses,
    problems: () => [...problems],
  };
}
