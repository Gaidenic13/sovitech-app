import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NETWORK_UNREACHABLE, call, request, resetCsrfToken } from './client';

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
const ACCOUNT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e90';

interface Seen {
  readonly method: string;
  readonly url: string;
  readonly headers: Headers;
  readonly body: unknown;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** A fake API: answers in order from `answers`, keyed by "METHOD path"; records every request. */
function fakeApi(answers: Record<string, Array<() => Response>>): Seen[] {
  const seen: Seen[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const path = input.split('?')[0] ?? input;
      seen.push({ method, url: input, headers: new Headers(init?.headers), body: init?.body });
      const queue = answers[`${method} ${path}`];
      const next = queue?.shift();
      if (next === undefined) return Promise.resolve(json(500, { code: 'internal_error' }));
      return Promise.resolve(next());
    }),
  );
  return seen;
}

beforeEach(() => resetCsrfToken());
afterEach(() => vi.unstubAllGlobals());

describe('F-AUTH-01 · ADR 0036: the typed API client', () => {
  it('ADR 0036 · prompt 3 section 11: a state-changing route sends the CSRF token, fetched once per page session; a GET sends none', async () => {
    const seen = fakeApi({
      'GET /api/csrf': [() => json(200, { token: 'TEST-token' })],
      'POST /api/auth/dev-sign-in': [
        () => json(200, { user: { userId: ACCOUNT, displayName: 'Development owner', roles: ['owner'] } }),
        () => json(200, { user: { userId: ACCOUNT, displayName: 'Development owner', roles: ['owner'] } }),
      ],
      'GET /api/auth/session': [() => json(200, { user: null })],
    });
    await request('auth.devSignIn', { body: { accountId: ACCOUNT } });
    await request('auth.devSignIn', { body: { accountId: ACCOUNT } });
    await request('auth.session');
    expect(seen.filter((entry) => entry.url === '/api/csrf')).toHaveLength(1);
    const posts = seen.filter((entry) => entry.method === 'POST');
    expect(posts.every((entry) => entry.headers.get('csrf-token') === 'TEST-token')).toBe(true);
    expect(seen.find((entry) => entry.url === '/api/auth/session')?.headers.get('csrf-token')).toBeNull();
  });

  it('ADR 0038: a 403 csrf_invalid fetches a new token and sends the request once more', async () => {
    const seen = fakeApi({
      'GET /api/csrf': [() => json(200, { token: 'TEST-old' }), () => json(200, { token: 'TEST-new' })],
      'POST /api/auth/sign-out': [() => json(403, { code: 'csrf_invalid' }), () => new Response(null, { status: 204 })],
    });
    await expect(request('auth.signOut')).resolves.toBeUndefined();
    const signOuts = seen.filter((entry) => entry.url === '/api/auth/sign-out');
    expect(signOuts.map((entry) => entry.headers.get('csrf-token'))).toEqual(['TEST-old', 'TEST-new']);
  });

  it('G7-6 · US-INTAKE-02 AC2: a refusal reaches the page as ApiError with its code and the required fields left empty', async () => {
    fakeApi({
      'GET /api/csrf': [() => json(200, { token: 'TEST-token' })],
      'POST /api/projects': [() => json(422, { code: 'required_fields_missing', fields: ['city'] })],
    });
    const refused = await request('projects.create', { body: { name: 'TEST project', projectType: 'renovation', countryCode: 'RO' } }).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).status).toBe(422);
    expect((refused as ApiError).code).toBe('required_fields_missing');
    expect((refused as ApiError).body.fields).toEqual(['city']);
  });

  it('ADR 0036 · rule 2: a 2xx body that does not fit the route schema is an error, never handed to a component', async () => {
    fakeApi({ 'GET /api/projects': [() => json(200, { projects: [{ projectId: PROJECT, name: 'a bare name' }] })] });
    await expect(request('projects.list')).rejects.toThrow();
  });

  it('ADR 0036: a request that never reached the API is ApiError status 0, network_unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fetch failed'))));
    const refused = await call('auth.session').catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).status).toBe(0);
    expect((refused as ApiError).code).toBe(NETWORK_UNREACHABLE);
  });

  it('G7-4 · ADR 0039: the late-findings ledger is sent as repeated left= entries, with the route filled from the contract', async () => {
    const seen = fakeApi({
      [`GET /api/projects/${PROJECT}/late-findings`]: [() => json(200, { asOf: '2026-09-30T10:00:00Z', displayObjects: [], dots: [], notice: null })],
    });
    await request('lateFindings', {
      params: { projectId: PROJECT },
      query: { current: '6', left: ['3@2026-09-30T09:00:00Z', '5@2026-09-30T09:30:00Z'] },
    });
    const url = new URL(seen[0]?.url ?? '', 'http://127.0.0.1');
    expect(url.pathname).toBe(`/api/projects/${PROJECT}/late-findings`);
    expect(url.searchParams.get('current')).toBe('6');
    expect(url.searchParams.getAll('left')).toEqual(['3@2026-09-30T09:00:00Z', '5@2026-09-30T09:30:00Z']);
    expect(url.searchParams.has('since')).toBe(false);
  });

  it('ADR 0019: a chunk is sent as raw bytes, application/octet-stream, never as JSON', async () => {
    const seen = fakeApi({
      'GET /api/csrf': [() => json(200, { token: 'TEST-token' })],
      [`PUT /api/projects/${PROJECT}/uploads/${ACCOUNT}`]: [() => json(200, { uploadId: ACCOUNT, received: 4, chunkBytes: 8 })],
    });
    await request('uploads.append', { params: { projectId: PROJECT, uploadId: ACCOUNT }, query: { offset: '0' }, bytes: new Blob(['TEST']) });
    expect(seen[1]?.headers.get('content-type')).toBe('application/octet-stream');
    expect(seen[1]?.body).toBeInstanceOf(Blob);
    expect(seen[1]?.url).toBe(`/api/projects/${PROJECT}/uploads/${ACCOUNT}?offset=0`);
  });
});
