/**
 * The API scaffold, and its start-up gate check (prompt 3 section 5.4: the
 * API server refuses to start while any gate fails the loosening check).
 * Phase 0 review: buildServer() used to build the app with no gate check, so
 * any entry point other than src/index.ts could skip it.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGatesStartupSafe, productionGateSource, readGate, type GateSource } from '@sovitech/registry/gates';
import { afterAll, describe, expect, it } from 'vitest';
import { buildServer, type ServerOptions } from './server';

describe('api scaffold', () => {
  const app = buildServer({ gates: assertGatesStartupSafe() });
  afterAll(async () => {
    await app.close();
  });

  it('answers the health route', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('keeps the start-up checked gate source for its routes, every gate closed', () => {
    expect(readGate(app.gates, 'ifc-values').open).toBe(false);
  });
});

describe('buildServer refuses to build without the start-up gate check', () => {
  it('refuses no options at all', () => {
    expect(() => buildServer(undefined as unknown as ServerOptions)).toThrow(/assertGatesStartupSafe/);
    expect(() => buildServer({} as ServerOptions)).toThrow(/assertGatesStartupSafe/);
  });

  it('refuses the plain production source, which skipped the start-up check', () => {
    expect(() => buildServer({ gates: productionGateSource() })).toThrow(/assertGatesStartupSafe/);
  });

  it('refuses a look-alike object', () => {
    const forged = Object.freeze({ kind: 'production' }) as GateSource;
    expect(() => buildServer({ gates: forged })).toThrow(/assertGatesStartupSafe/);
  });

  it('is started from src/index.ts only with the source that assertGatesStartupSafe() returns', () => {
    const index = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.ts'), 'utf8');
    expect(index).toMatch(/buildServer\(\{\s*gates:\s*assertGatesStartupSafe\(\)\s*\}\)/);
  });
});
