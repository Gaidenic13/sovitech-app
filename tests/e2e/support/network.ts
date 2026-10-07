/**
 * Holding and failing the page's own API requests, for the render screens of the loading and error
 * states (UD-33 to UD-35, UD-47; prompt 3 section 11: "Every data view has its loading, empty,
 * partial and error states"). Page actions only: no assertion, no store, no typed display object, so
 * the render test's screen list may import it.
 *
 * - `holdRequests` holds each matching request until the hold is released, or at the latest
 *   `releaseAfterMs` after the request, then lets it go on to the render check's API adapter (a
 *   route registered earlier) or the network. The render check observes the page from document start,
 *   so it reads the loading state and then the loaded screen, and every digit either one shows (a
 *   placeholder figure while loading fails as a transient digit, G2-1). The screen-states spec runs
 *   axe and the demo line while the hold stands, then releases it (`releaseHeld`).
 * - `failRequests` aborts each matching request, as a network failure: the page shows its
 *   load-failure state.
 */
import type { Page, Request, Route } from '@playwright/test';

/** A request the page makes to the API, matched by method and path. */
export type RequestMatch = (method: string, path: string) => boolean;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** A step's view (`GET /api/projects/:projectId/steps/:step`), any project and step. */
export const stepView: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/steps/[1-8]$`, 'u').test(path);
/** The project list (`GET /api/projects`), which the header reads until a screen publishes its own. */
export const projectList: RequestMatch = (method, path) => method === 'GET' && path === '/api/projects';
/** The proposal page's view (`GET /api/projects/:projectId/proposal`). */
export const proposalView: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/proposal$`, 'u').test(path);
/** A workspace page's view (`GET /api/projects/:projectId/workspace/<page>`, phase 4), any project and page; the frame is not one. */
export const workspaceView: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/workspace/[a-z-]+$`, 'u').test(path);
/** The workspace frame (`GET /api/projects/:projectId/workspace`, phase 4): the sidebar's pages, the project card and the footer. */
export const workspaceFrame: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/workspace$`, 'u').test(path);
/** Phase 5 (docs/adr/0049): the stored versions (`GET /api/projects/:projectId/proposals`, `proposals.list`). */
export const proposalsList: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/proposals$`, 'u').test(path);
/** Phase 5: Generate (`POST /api/projects/:projectId/proposals`, `proposals.generate`). */
export const proposalsGenerate: RequestMatch = (method, path) => method === 'POST' && new RegExp(`^/api/projects/${UUID}/proposals$`, 'u').test(path);
/** Phase 5: a stored version (`GET /api/projects/:projectId/proposals/:snapshotId`, `proposals.view`). */
export const proposalVersion: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/proposals/${UUID}$`, 'u').test(path);
/** Phase 5: an export of a stored version (`POST …/proposals/:snapshotId/exports`, `proposals.export`). */
export const proposalExport: RequestMatch = (method, path) => method === 'POST' && new RegExp(`^/api/projects/${UUID}/proposals/${UUID}/exports$`, 'u').test(path);
/** Phase 5: Reports (`GET /api/projects/:projectId/reports`, `reports.list`). */
export const reportsList: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/reports$`, 'u').test(path);
/** Phase 5: the Equipment register's CSV (`GET /api/projects/:projectId/exports/equipment`, `exports.equipment`). */
export const equipmentExport: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/exports/equipment$`, 'u').test(path);
/** Phase 6 (docs/adr/0052): a Metrics page's view (`GET /api/projects/:projectId/metrics/<page>`, `metrics.*`), not its print view. */
export const metricsView: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/metrics/[a-z-]+$`, 'u').test(path);
/** Phase 6: a Metrics page's print view (`GET …/metrics/<page>/print`, `metrics.payback.print`, `metrics.lifecycle.print`). */
export const metricsPrintView: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/metrics/(?:payback|lifecycle)/print$`, 'u').test(path);
/** Phase 6: Export Report (`GET /api/projects/:projectId/exports/metrics/<page>`, `exports.metrics`; R-121). */
export const metricsExport: RequestMatch = (method, path) => method === 'GET' && new RegExp(`^/api/projects/${UUID}/exports/metrics/[a-z]+$`, 'u').test(path);
/**
 * Phase 7 (docs/adr/0053): an admin page's view (`GET /api/admin/accounts`, `/datasets`, `/guardrail-events`;
 * `admin.accounts`, `admin.datasets`, `admin.guardrailEvents`).
 */
export const adminView: RequestMatch = (method, path) => method === 'GET' && /^\/api\/admin\/(?:accounts|datasets|guardrail-events)$/u.test(path);
/** An upload's chunk (`PUT /api/projects/:projectId/uploads/:uploadId`). */
export const uploadChunk: RequestMatch = (method, path) => method === 'PUT' && new RegExp(`^/api/projects/${UUID}/uploads/${UUID}$`, 'u').test(path);

function matches(request: Request, match: RequestMatch): boolean {
  return match(request.method(), new URL(request.url()).pathname);
}

/** A hold on some of the page's requests. */
export interface Hold {
  /** Lets every held request, and every later one, go on. */
  release(): void;
  /** Resolves once a matching request is held. */
  readonly held: Promise<void>;
}

const HOLDS = new WeakMap<Page, Hold>();

/**
 * Holds every request `match` accepts until released, or `releaseAfterMs` (by default indefinitely)
 * after it arrived. Register it after `prepareRenderCheck`, so a released request goes on to the
 * render check's API adapter.
 */
export async function holdRequests(page: Page, match: RequestMatch, options: { readonly releaseAfterMs?: number } = {}): Promise<Hold> {
  let release: () => void = () => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  let heldOne: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    heldOne = resolve;
  });
  await page.route(/\/api\//u, async (route: Route) => {
    if (!matches(route.request(), match)) {
      await route.fallback();
      return;
    }
    heldOne();
    const waits: Promise<void>[] = [released];
    if (options.releaseAfterMs !== undefined) waits.push(new Promise((resolve) => setTimeout(resolve, options.releaseAfterMs)));
    await Promise.race(waits);
    try {
      await route.fallback();
    } catch {
      // The page closed while its request was held: nothing is left to answer.
    }
  });
  const hold: Hold = { release, held };
  HOLDS.set(page, hold);
  return hold;
}

/** The hold a screen's arrange left on the page, if any (the screen is in a loading state until it is released). */
export function heldOn(page: Page): Hold | undefined {
  return HOLDS.get(page);
}

/** Aborts every request `match` accepts, as a failed network request. */
export async function failRequests(page: Page, ...match: readonly RequestMatch[]): Promise<void> {
  await page.route(/\/api\//u, async (route: Route) => {
    if (match.some((one) => matches(route.request(), one))) await route.abort('failed');
    else await route.fallback();
  });
}
