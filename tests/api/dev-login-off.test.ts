/**
 * The development login is never on where real owner documents could be stored (PRD R-133, "Guardrail
 * behaviour": "The development login is never enabled where real owner documents are stored"; R-159
 * condition 4; traceability 10.3 near miss 43; docs/adr/0038; owner decision 2026-09-25, ADR 0028: this
 * development build stores the synthetic fixtures only).
 *
 * Over a TEST database: with development accounts listed but an upload guard that is not the owner's
 * fixtures-only guard (one that would let any file in, as an environment for real documents would),
 * every development-login route answers 404 `dev_login_off` and no session starts; with no development
 * account listed, the same. The session route still answers (null).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SessionResponseSchema } from '@sovitech/view-model/browser';
import { startTestApi, type TestApi } from '../guardrails/_support/api';

/** Each test reads and writes a TEST database; under a loaded full run a read can take seconds. */
const LONG = { timeout: 60_000 };

async function csrfOf(api: TestApi): Promise<{ readonly token: string; readonly cookie: string }> {
  const response = await api.app.inject({ method: 'GET', url: '/api/csrf' });
  const csrf = response.cookies.find((cookie) => cookie.name === '_csrf');
  return { token: (response.json() as { token: string }).token, cookie: `_csrf=${encodeURIComponent(csrf?.value ?? '')}` };
}

async function assertOff(api: TestApi, accountId: string): Promise<void> {
  const accounts = await api.app.inject({ method: 'GET', url: '/api/auth/dev-accounts' });
  expect(accounts.statusCode).toBe(404);
  expect(accounts.json()).toEqual({ code: 'dev_login_off' });
  const { token, cookie } = await csrfOf(api);
  const signIn = await api.app.inject({ method: 'POST', url: '/api/auth/dev-sign-in', headers: { 'csrf-token': token, cookie }, payload: { accountId } });
  expect(signIn.statusCode).toBe(404);
  expect(signIn.json()).toEqual({ code: 'dev_login_off' });
  expect(signIn.cookies.find((entry) => entry.name === 'sovitech_session')).toBeUndefined();
  expect(SessionResponseSchema.parse((await api.app.inject({ method: 'GET', url: '/api/auth/session' })).json()).user).toBeNull();
}

describe('R-133 · ADR 0038 · traceability near miss 43: the development login where real owner documents could be stored', LONG, () => {
  let api: TestApi;

  beforeAll(async () => {
    // An upload guard that is not the fixtures-only guard: any file would be stored.
    api = await startTestApi({ devLogin: true, uploadGuard: { accepts: () => true } });
  }, 180_000);

  afterAll(async () => {
    await api.stop();
  });

  it('R-133 · R-159 condition 4: with accounts listed, every development-login route answers dev_login_off, and no session starts', async () => {
    const [accountId] = api.devAccountIds;
    if (accountId === undefined) throw new Error('no TEST development account');
    await assertOff(api, accountId);
  });
});

describe('ADR 0038: with no development account listed', LONG, () => {
  let api: TestApi;

  beforeAll(async () => {
    api = await startTestApi();
  }, 180_000);

  afterAll(async () => {
    await api.stop();
  });

  it('ADR 0038 decision 1: the development login is off', async () => {
    await assertOff(api, '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f');
  });
});
