/**
 * The API's routes are exactly the wizard contract's route table (docs/adr/0036 decision 6; the
 * contract's routes.ts: "apps/api registers exactly these (a unit test of the API builder's compares
 * Fastify's routes with this table)"), and every state-changing route checks the CSRF token (prompt 3
 * section 11). No database is reached: the routes are only registered.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '@sovitech/db';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { ROUTES } from '@sovitech/view-model/browser';
import { afterAll, describe, expect, it } from 'vitest';
import { SessionStore } from './auth/sessions';
import { buildServer } from './server';
import { FileStore } from './storage/file-store';

const folder = mkdtempSync(join(tmpdir(), 'sovitech-route-table-'));
// A store that is never reached: a pg pool connects only on its first query.
const store = openStore('postgres://route-table-test@127.0.0.1:9/none');
const app = buildServer({
  gates: assertGatesStartupSafe(),
  services: {
    store,
    files: new FileStore(folder),
    uploadGuard: { accepts: () => false },
    extractionAccountId: '00000000-0000-7000-8000-000000000000',
    sessions: new SessionStore(),
    cookieSecret: 'TEST route table secret: not a real secret, tests only',
    log: () => undefined,
  },
});
const registered: { method: string; url: string; csrf: boolean }[] = [];
app.addHook('onRoute', (route) => {
  const methods = Array.isArray(route.method) ? route.method : [route.method];
  const hooks = route.onRequest === undefined ? [] : Array.isArray(route.onRequest) ? route.onRequest : [route.onRequest];
  for (const method of methods) {
    if (method === 'HEAD') continue;
    registered.push({ method, url: route.url, csrf: hooks.length > 0 });
  }
});

afterAll(async () => {
  await app.close();
  await store.close();
  rmSync(folder, { recursive: true, force: true });
});

describe('ADR 0036 · F-RENDER-06: the API serves exactly the contract\'s routes', () => {
  it('ADR 0036: Fastify\'s routes equal ROUTES, method and path', async () => {
    await app.ready();
    // /health is registered before the hook can see it (buildServer registers it at once).
    const seen = [...registered.map((route) => `${route.method} ${route.url}`), ...(app.hasRoute({ method: 'GET', url: '/health' }) ? ['GET /health'] : [])];
    expect(new Set(seen)).toEqual(new Set(ROUTES.map((route) => `${route.method} ${route.path}`)));
    expect(seen).toHaveLength(ROUTES.length);
  });

  it('ADR 0036 · prompt 3 section 11: exactly the routes the table marks CSRF check the token on request', async () => {
    await app.ready();
    for (const route of ROUTES) {
      if (route.id === 'health') continue;
      const found = registered.find((entry) => entry.method === route.method && entry.url === route.path);
      expect(found?.csrf, `${route.method} ${route.path}`).toBe(route.csrf);
    }
  });
});
