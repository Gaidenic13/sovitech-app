/**
 * The API key reader (docs/adr/0021, decision 5): the environment first, then the
 * repository root's `.env`; only that variable; never printed.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspect } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { API_KEY_VARIABLE, ApiKey, KEY_NOT_SET, readApiKey } from './key';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function rootWithEnv(text: string | undefined): string {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-ai-key-'));
  roots.push(root);
  if (text !== undefined) writeFileSync(join(root, '.env'), text);
  return root;
}

const TEST_KEY = 'TEST-not-a-key-0000';

describe('readApiKey', () => {
  it('F-EXTRACT-03: reads the key from the environment first', () => {
    const root = rootWithEnv(`${API_KEY_VARIABLE}=TEST-from-file\n`);
    const reading = readApiKey({ env: { [API_KEY_VARIABLE]: TEST_KEY }, root });
    expect(reading.present).toBe(true);
    if (reading.present) {
      expect(reading.from).toBe('environment');
      expect(reading.key.reveal()).toBe(TEST_KEY);
    }
  });

  it('F-EXTRACT-03: reads the key from the root .env when the environment has none, and loads nothing else', () => {
    const root = rootWithEnv(`SOVITECH_DB_APP_PASSWORD=TEST-secret\n${API_KEY_VARIABLE}=${TEST_KEY}\n`);
    const environment: Record<string, string | undefined> = {};
    const reading = readApiKey({ env: environment, root });
    expect(reading.present && reading.from).toBe('dotenv');
    expect(reading.present && reading.key.reveal()).toBe(TEST_KEY);
    expect(environment).toEqual({});
    expect(process.env['SOVITECH_DB_APP_PASSWORD']).toBeUndefined();
  });

  it('F-EXTRACT-03: reports "ANTHROPIC_API_KEY not set" with no key, an empty one, or no .env', () => {
    expect(readApiKey({ env: {}, root: rootWithEnv(undefined) })).toEqual({ present: false, reason: KEY_NOT_SET });
    expect(readApiKey({ env: { [API_KEY_VARIABLE]: '  ' }, root: rootWithEnv(`${API_KEY_VARIABLE}=\n`) })).toEqual({ present: false, reason: KEY_NOT_SET });
    expect(KEY_NOT_SET).toBe('ANTHROPIC_API_KEY not set');
  });
});

describe('ApiKey', () => {
  it('F-EXTRACT-03: never prints itself', () => {
    const key = new ApiKey(TEST_KEY);
    for (const printed of [String(key), `${key}`, JSON.stringify({ key }), inspect(key), inspect({ nested: { key } })]) {
      expect(printed).not.toContain(TEST_KEY);
      expect(printed).toContain('redacted');
    }
  });

  it('F-EXTRACT-03: refuses an empty key', () => {
    expect(() => new ApiKey(' ')).toThrow(TypeError);
  });
});
