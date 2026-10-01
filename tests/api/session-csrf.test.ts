/**
 * Sessions and CSRF tokens (phase 3 part B, finding A-11; prompt 3 section 11, "Security basics": session cookies
 * with CSRF protection on state-changing routes; docs/adr/0038 decision 9).
 *
 * Over a TEST database, through the API's own routes:
 * - a CSRF token is bound to the session it was issued for: another user's token and CSRF cookie are refused on
 *   this user's session (403 `csrf_invalid`);
 * - the token of before sign-in no longer passes after sign-in, and signing in clears the CSRF cookie;
 * - a token of an ended session (signed out) does not pass on the next session, and signing out clears the CSRF
 *   cookie;
 * - a session ends when unused past its idle lifetime, and past its absolute lifetime however much it is used:
 *   it then reads as signed out (401 `not_signed_in` on project routes; the session route answers null).
 *
 * A guarded write that passes the CSRF check answers its own refusal (POST /api/projects with nothing filled in:
 * 422 `required_fields_missing`, and nothing is created), so each case tells "token refused" from "token taken".
 * TEST accounts only; a TEST clock stands in for time in the lifetime cases.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { createTestAccount } from '@sovitech/db/testing';
import { SessionResponseSchema } from '@sovitech/view-model/browser';
import { SessionStore, sessionCookieHeader } from '../../apps/api/src/auth/sessions';
import { buildServer } from '../../apps/api/src/server';
import { signIn, startTestApi, type Auth, type TestApi } from '../guardrails/_support/api';

/** Each test reads and writes a TEST database; under a loaded full run a request can take seconds. */
const LONG = { timeout: 60_000 };
const MINUTE = 60 * 1000;

let api: TestApi;

beforeAll(async () => {
  api = await startTestApi({ devLogin: true });
}, 180_000);

afterAll(async () => {
  await api.stop();
});

/** The value of a Set-Cookie the response carries, or undefined. */
function setCookie(response: { readonly cookies: readonly { readonly name: string; readonly value: string; readonly expires?: Date; readonly maxAge?: number }[] }, name: string) {
  return response.cookies.find((cookie) => cookie.name === name);
}

/** A token and its CSRF cookie, fetched with the given cookies (none: before sign-in). */
async function csrfFor(app: FastifyInstance, cookie?: string): Promise<{ readonly token: string; readonly csrfCookie: string }> {
  const response = await app.inject({ method: 'GET', url: '/api/csrf', ...(cookie === undefined ? {} : { headers: { cookie } }) });
  const csrf = setCookie(response, '_csrf');
  if (csrf === undefined) throw new Error('the API set no CSRF cookie');
  return { token: (response.json() as { token: string }).token, csrfCookie: `_csrf=${encodeURIComponent(csrf.value)}` };
}

/** A guarded write that changes nothing when the token passes: 422 then, 403 when the token is refused. */
function guardedWrite(app: FastifyInstance, headers: Record<string, string>) {
  return app.inject({ method: 'POST', url: '/api/projects', headers, payload: {} });
}

describe('A-11 · prompt 3 section 11 · ADR 0038 decision 9: a CSRF token is bound to its session', LONG, () => {
  it('A-11: another user\'s CSRF cookie and token are refused on this user\'s session; this user\'s own pass', async () => {
    const [accountA] = api.devAccountIds;
    if (accountA === undefined) throw new Error('no TEST development owner');
    const accountB = await createTestAccount(api.database, { label: 'A-11 second owner', kind: 'person', roles: ['owner'] });
    const a: Auth = await signIn(api, accountA);
    const b: Auth = await signIn(api, accountB);
    const sessionOfA = a.cookie.split('; ').find((part) => part.startsWith('sovitech_session=')) ?? '';
    const csrfOfB = b.cookie.split('; ').find((part) => part.startsWith('_csrf=')) ?? '';

    const crossed = await guardedWrite(api.app, { cookie: `${sessionOfA}; ${csrfOfB}`, 'csrf-token': b['csrf-token'] });
    expect(crossed.statusCode).toBe(403);
    expect(crossed.json()).toEqual({ code: 'csrf_invalid' });
    const tokenOnly = await guardedWrite(api.app, { cookie: a.cookie, 'csrf-token': b['csrf-token'] });
    expect(tokenOnly.statusCode).toBe(403);
    expect(tokenOnly.json()).toEqual({ code: 'csrf_invalid' });

    const own = await guardedWrite(api.app, { ...a });
    expect(own.statusCode, own.body).toBe(422);
    expect(own.json()).toMatchObject({ code: 'required_fields_missing' });
  });

  it('A-11: the token of before sign-in does not pass after sign-in, and signing in clears the CSRF cookie', async () => {
    const before = await csrfFor(api.app);
    const signedIn = await api.app.inject({
      method: 'POST',
      url: '/api/auth/dev-sign-in',
      headers: { 'csrf-token': before.token, cookie: before.csrfCookie },
      payload: { accountId: api.devAccountIds[0] },
    });
    expect(signedIn.statusCode, signedIn.body).toBe(200);
    const cleared = setCookie(signedIn, '_csrf');
    expect(cleared?.value).toBe('');
    const session = setCookie(signedIn, 'sovitech_session');
    if (session === undefined) throw new Error('no session cookie');
    const sessionCookie = `sovitech_session=${encodeURIComponent(session.value)}`;

    const reused = await guardedWrite(api.app, { cookie: `${sessionCookie}; ${before.csrfCookie}`, 'csrf-token': before.token });
    expect(reused.statusCode).toBe(403);
    expect(reused.json()).toEqual({ code: 'csrf_invalid' });

    const fresh = await csrfFor(api.app, sessionCookie);
    const taken = await guardedWrite(api.app, { cookie: `${sessionCookie}; ${fresh.csrfCookie}`, 'csrf-token': fresh.token });
    expect(taken.statusCode, taken.body).toBe(422);
  });

  it('A-11: after sign-out and a new sign-in, the token of the ended session does not pass, and signing out clears the CSRF cookie', async () => {
    const [account] = api.devAccountIds;
    if (account === undefined) throw new Error('no TEST development owner');
    const first = await signIn(api, account);
    const out = await api.app.inject({ method: 'POST', url: '/api/auth/sign-out', headers: { ...first } });
    expect(out.statusCode).toBe(204);
    expect(setCookie(out, '_csrf')?.value).toBe('');
    expect((await api.app.inject({ method: 'GET', url: '/api/projects', headers: { cookie: first.cookie } })).statusCode).toBe(401);

    const second = await signIn(api, account);
    const sessionOfSecond = second.cookie.split('; ').find((part) => part.startsWith('sovitech_session=')) ?? '';
    const csrfOfFirst = first.cookie.split('; ').find((part) => part.startsWith('_csrf=')) ?? '';
    const reused = await guardedWrite(api.app, { cookie: `${sessionOfSecond}; ${csrfOfFirst}`, 'csrf-token': first['csrf-token'] });
    expect(reused.statusCode).toBe(403);
    expect(reused.json()).toEqual({ code: 'csrf_invalid' });
    const own = await guardedWrite(api.app, { ...second });
    expect(own.statusCode, own.body).toBe(422);
  });
});

describe('A-11 · ADR 0038 decision 9: a session ends when unused, and when too old', LONG, () => {
  let at = 0;
  let app: FastifyInstance;
  let sessions: SessionStore;

  beforeAll(async () => {
    sessions = new SessionStore({ lifetimes: { idleMs: 30 * MINUTE, absoluteMs: 120 * MINUTE }, now: () => at });
    app = buildServer({ gates: assertGatesStartupSafe(), services: { ...api.services, sessions } });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function signedIn(cookie: string): Promise<boolean> {
    const session = SessionResponseSchema.parse((await app.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie } })).json());
    return session.user !== null;
  }

  it('A-11: a session unused past its idle lifetime reads as signed out (401 on project routes); one in use lives on', async () => {
    const [account] = api.devAccountIds;
    if (account === undefined) throw new Error('no TEST development owner');
    at = 0;
    const cookie = sessionCookieHeader(sessions.create(account), api.services.cookieSecret);
    at += 29 * MINUTE;
    expect((await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie } })).statusCode).toBe(200);
    at += 29 * MINUTE;
    expect(await signedIn(cookie)).toBe(true);
    at += 31 * MINUTE;
    const expired = await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie } });
    expect(expired.statusCode).toBe(401);
    expect(expired.json()).toEqual({ code: 'not_signed_in' });
    expect(await signedIn(cookie)).toBe(false);
  });

  it('A-11: a session past its absolute lifetime reads as signed out, however often it was used', async () => {
    const [account] = api.devAccountIds;
    if (account === undefined) throw new Error('no TEST development owner');
    at = 0;
    const cookie = sessionCookieHeader(sessions.create(account), api.services.cookieSecret);
    for (let used = 0; used < 6; used += 1) {
      at += 20 * MINUTE;
      expect((await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie } })).statusCode).toBe(200);
    }
    at += 1;
    expect((await app.inject({ method: 'GET', url: '/api/projects', headers: { cookie } })).statusCode).toBe(401);
  });
});
