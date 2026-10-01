/**
 * The typed API client over the wizard contract (`@sovitech/view-model/browser`, routes.ts). The only
 * way the web talks to the API.
 *
 * - Every call names a route id of the contract; the path comes from `pathOf`, so the web can call
 *   no route the contract does not list.
 * - Same origin (`/api`, proxied by Vite to the API in development and in the e2e run: ADR 0037),
 *   `credentials: 'same-origin'`, so the signed session cookie travels (ADR 0038).
 * - A route with `csrf: true` sends the token from `GET /api/csrf` in the `csrf-token` header; the
 *   token is fetched once per page session and fetched again after a 403 `csrf_invalid` (one retry).
 * - Every 2xx body is parsed with the route's response schema before a component sees it; a body
 *   that does not fit is an error, never shown (rule 2: UI code receives only resolved field objects).
 * - A refusal is thrown as `ApiError` with its code and, where the API gives one, the owner-facing
 *   message and the required fields left empty (G7-6). A request that never reached the API is an
 *   `ApiError` with status 0 and the code `network_unreachable`. Nothing is retried silently except
 *   the CSRF token; uploads resume through ./uploads.ts.
 */
import {
  CSRF_HEADER,
  CsrfResponseSchema,
  RefusalBodySchema,
  pathOf,
  routeById,
  type ROUTES,
  type RefusalBody,
  type RouteId,
} from '@sovitech/view-model/browser';

export class ApiError extends Error {
  override name = 'ApiError';

  constructor(
    readonly status: number,
    readonly body: RefusalBody,
  ) {
    super(body.code);
  }

  get code(): string {
    return this.body.code;
  }
}

/** The code of a request that never reached the API (offline, the API down, the request aborted by the network). */
export const NETWORK_UNREACHABLE = 'network_unreachable';

/** Whether an error means the session is gone: the page should show sign-in (rule 13: nothing of a project without a session). */
export function isSignedOut(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Whether an error is the request's own abort (a page left before its answer came). */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export interface CallOptions {
  /** Route parameters (`projectId`, `step`, `uploadId`). */
  readonly params?: Readonly<Record<string, string | number>>;
  /** Query parameters; repeated keys as arrays. */
  readonly query?: Readonly<Record<string, string | readonly string[] | undefined>>;
  /** The JSON body of a POST. */
  readonly body?: unknown;
  /** Raw bytes sent as `application/octet-stream` (an upload chunk), instead of a JSON body. */
  readonly bytes?: Blob;
  readonly signal?: AbortSignal;
}

// ---------------------------------------------------------------------------------------------
// Types read from the route table
// ---------------------------------------------------------------------------------------------

type Route = (typeof ROUTES)[number];
type RouteWith<Id extends RouteId> = Extract<Route, { readonly id: Id }>;
type Parsed<Schema> = Schema extends { parse(data: unknown): infer Output } ? Output : never;

/** The parsed 2xx body of a route: its response schema's output, or `undefined` for a route with none (a 204). */
export type ResponseOf<Id extends RouteId> = RouteWith<Id> extends { readonly response: infer Schema } ? Parsed<Schema> : undefined;
/** The JSON body a route takes, as its request schema reads it. */
export type RequestOf<Id extends RouteId> = RouteWith<Id> extends { readonly request: infer Schema } ? Parsed<Schema> : undefined;

// ---------------------------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------------------------

let csrfToken: Promise<string> | undefined;

async function fetchCsrfToken(): Promise<string> {
  const response = await send('/api/csrf', { method: 'GET', headers: { accept: 'application/json' } });
  if (!response.ok) throw await refusalOf(response);
  return CsrfResponseSchema.parse(await response.json()).token;
}

function csrf(): Promise<string> {
  if (csrfToken === undefined) {
    const pending = fetchCsrfToken();
    csrfToken = pending;
    // A failed fetch is not kept: the next state-changing request asks again.
    pending.catch(() => {
      if (csrfToken === pending) csrfToken = undefined;
    });
  }
  return csrfToken;
}

/** Forgets the CSRF token (after sign-out, and in tests). */
export function resetCsrfToken(): void {
  csrfToken = undefined;
}

// ---------------------------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------------------------

async function send(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { credentials: 'same-origin', ...init });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ApiError(0, { code: NETWORK_UNREACHABLE });
  }
}

async function refusalOf(response: Response): Promise<ApiError> {
  let body: RefusalBody = { code: response.status >= 500 ? 'internal_error' : 'request_refused' };
  try {
    const parsed = RefusalBodySchema.safeParse(await response.json());
    if (parsed.success) body = parsed.data;
  } catch {
    // A refusal without a JSON body keeps the generic code above.
  }
  return new ApiError(response.status, body);
}

function urlOf(route: RouteId, options: CallOptions): string {
  const path = pathOf(route, options.params ?? {});
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined) continue;
    if (typeof value === 'string') search.append(key, value);
    else for (const item of value) search.append(key, item);
  }
  const query = search.toString();
  return query === '' ? path : `${path}?${query}`;
}

async function attempt(route: RouteId, options: CallOptions, freshToken: boolean): Promise<Response> {
  const spec = routeById(route);
  const headers: Record<string, string> = { accept: 'application/json' };
  let body: BodyInit | undefined;
  if (options.bytes !== undefined) {
    headers['content-type'] = 'application/octet-stream';
    body = options.bytes;
  } else if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (spec.csrf) {
    if (freshToken) resetCsrfToken();
    headers[CSRF_HEADER] = await csrf();
  }
  return send(urlOf(route, options), {
    method: spec.method,
    headers,
    ...(body === undefined ? {} : { body }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
}

/**
 * Calls a route of the contract and returns its 2xx body, parsed with the route's response
 * schema (`undefined` for a 204 or a route with no response schema). Refusals throw `ApiError`.
 */
export async function call<T>(route: RouteId, options: CallOptions = {}): Promise<T> {
  const spec = routeById(route);
  let response = await attempt(route, options, false);
  if (response.status === 403 && spec.csrf) {
    const refusal = await refusalOf(response.clone());
    if (refusal.code === 'csrf_invalid') response = await attempt(route, options, true);
  }
  if (!response.ok) throw await refusalOf(response);
  if (response.status === 204 || spec.response === undefined) return undefined as T;
  const json: unknown = await response.json();
  return spec.response.parse(json) as T;
}

/** `call`, with the request and response types read from the route table. */
export function request<Id extends RouteId>(route: Id, options: Omit<CallOptions, 'body'> & { readonly body?: RequestOf<Id> } = {}): Promise<ResponseOf<Id>> {
  return call<ResponseOf<Id>>(route, options);
}
