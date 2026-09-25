import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POSTGRES_IMAGE, RYUK_IMAGE } from './images';

const DIGEST = /@sha256:[0-9a-f]{64}$/;

describe('pinned images', () => {
  it('pins Postgres and the Testcontainers reaper by digest', () => {
    expect(POSTGRES_IMAGE).toMatch(DIGEST);
    expect(RYUK_IMAGE).toMatch(DIGEST);
  });

  it('runs the same Postgres image in docker-compose.yml as in the tests', () => {
    const compose = readFileSync(new URL('../../../docker-compose.yml', import.meta.url), 'utf8');
    const images = [...compose.matchAll(/^\s*image:\s*(\S+)\s*$/gm)].map((match) => match[1]);
    expect(images).toEqual([POSTGRES_IMAGE]);
  });

  it('publishes the local database on the loopback address only', () => {
    const compose = readFileSync(new URL('../../../docker-compose.yml', import.meta.url), 'utf8');
    const ports = [...compose.matchAll(/^\s*-\s*"([^"]*):5432"\s*$/gm)].map((match) => match[1]);
    expect(ports).toEqual(['127.0.0.1:${SOVITECH_DB_PORT:?set SOVITECH_DB_PORT in .env}']);
  });
});
