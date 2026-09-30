/**
 * The request the transport sends (docs/adr/0021; build-readiness 3 item 6): the pinned
 * model, structured outputs with the output schema, effort set; no tools, Citations,
 * Files API, fallbacks or thinking settings. And the SDK is imported in transport.ts only.
 * No request is sent here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { REPO_ROOT } from '@sovitech/registry/gates';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiKey } from './key';
import { EFFORT, MAX_TOKENS, MODEL_ID } from './model';
import { AiCallError, anthropicClientOptions, callError, messageParams, outputFormat } from './transport';

/** Every property named `source` in a JSON schema, with its enum. */
function sourceEnums(schema: unknown): unknown[] {
  const found: unknown[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (typeof node === 'object' && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'properties' && typeof value === 'object' && value !== null && 'source' in value) {
          found.push((value as { source: { enum?: unknown } }).source.enum);
        }
        walk(value);
      }
    }
  };
  walk(schema);
  return found;
}

describe('messageParams', () => {
  const params = messageParams({ system: 'TEST system', content: ['TEST block one', 'TEST block two'], output: 'extraction' });

  it('F-EXTRACT-03: names the pinned model, sets effort, and nothing else beyond the message', () => {
    expect(Object.keys(params).sort()).toEqual(['max_tokens', 'messages', 'model', 'output_config', 'system']);
    expect(params.model).toBe(MODEL_ID);
    expect(MODEL_ID).toBe('claude-opus-5-5');
    expect(params.max_tokens).toBe(MAX_TOKENS);
    expect(params.output_config.effort).toBe(EFFORT);
    expect(Object.keys(params.output_config).sort()).toEqual(['effort', 'format']);
  });

  it('F-EXTRACT-02 · F-EXTRACT-03: sends the documents as plain text blocks: no Citations, no Files API', () => {
    expect(params.messages).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'TEST block one' }, { type: 'text', text: 'TEST block two' }] },
    ]);
    expect(params.system).toEqual([{ type: 'text', text: 'TEST system', cache_control: { type: 'ephemeral' } }]);
  });

  it('G2-4 · F-EXTRACT-03: sends a JSON schema whose only sources are document and ai_inference', () => {
    const format = params.output_config.format;
    expect(format.type).toBe('json_schema');
    const enums = sourceEnums(format.schema);
    expect(enums.length).toBeGreaterThan(0);
    for (const values of enums) expect(values).toEqual(['document', 'ai_inference']);
  });

  it('F-EXTRACT-03: sends only keywords structured outputs take, with every object closed', () => {
    const text = JSON.stringify(params.output_config.format.schema);
    for (const keyword of ['"minimum"', '"maximum"', '"$schema"', '"oneOf"', '"pattern"', '"minLength"']) expect(text).not.toContain(keyword);
    const objects: Record<string, unknown>[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (typeof node === 'object' && node !== null) {
        if ((node as Record<string, unknown>)['type'] === 'object') objects.push(node as Record<string, unknown>);
        Object.values(node).forEach(walk);
      }
    };
    walk(params.output_config.format.schema);
    expect(objects.length).toBeGreaterThan(5);
    for (const object of objects) expect(object['additionalProperties']).toBe(false);
    expect(text).toContain('"const":"quantity"');
  });
});

describe('outputFormat', () => {
  it('F-EXTRACT-03: reads the JSON back without judging it: the validator does that', () => {
    const format = outputFormat('drafting');
    expect(format.parse('{"paragraphs": [], "notes": [], "extra": 1}')).toEqual({ read: true, value: { paragraphs: [], notes: [], extra: 1 } });
    expect(format.parse('not JSON')).toEqual({ read: false });
  });
});

describe('callError', () => {
  it('F-EXTRACT-03 · F-AUDIT-01 · rule 13: maps SDK errors to codes and drops their messages', () => {
    const rateLimit = callError(new Anthropic.RateLimitError(429, { type: 'error' }, 'TEST message with request text', new Headers()));
    expect(rateLimit).toBeInstanceOf(AiCallError);
    expect([rateLimit.code, rateLimit.status]).toEqual(['rate_limit', 429]);
    expect(rateLimit.message).not.toContain('TEST message');
    expect(callError(new Anthropic.APIConnectionError({ message: 'TEST' })).code).toBe('connection');
    expect(callError(new Error('TEST')).code).toBe('unexpected');
  });
});

/**
 * Any route to the SDK in source text: a static import or re-export, a dynamic import(), a
 * require() (phase 2 review, adversarial finding "The SDK boundary misses dynamic imports and
 * require"; ESLint's no-restricted-syntax block holds the same line).
 */
const SDK_REFERENCE = /(?:from|import\s*\(|require\s*\(|import)\s*['"`]@anthropic-ai\//u;

describe('the SDK boundary', () => {
  it('F-EXTRACT-03 · ADR 0021: reads every route to the SDK in source text', () => {
    for (const code of [
      "import Anthropic from '@anthropic-ai/sdk';",
      "export * from '@anthropic-ai/sdk';",
      "const sdk = await import('@anthropic-ai/sdk');",
      'const sdk = await import(`@anthropic-ai/sdk`);',
      "const sdk = require('@anthropic-ai/sdk');",
      "import sdk = require('@anthropic-ai/sdk');",
      "import '@anthropic-ai/sdk/shims/node';",
    ]) {
      expect(SDK_REFERENCE.test(code), code).toBe(true);
    }
    expect(SDK_REFERENCE.test("import { z } from 'zod';")).toBe(false);
  });

  it('F-EXTRACT-03 · ADR 0021: imports @anthropic-ai/sdk in packages/ai/src/transport.ts only, among app and package sources', () => {
    const importers: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.[cm]?[jt]sx?$/.test(name) && !/\.test\.[cm]?[jt]sx?$/.test(name) && SDK_REFERENCE.test(readFileSync(path, 'utf8'))) {
          importers.push(relative(REPO_ROOT, path));
        }
      }
    };
    for (const top of ['apps', 'packages']) walk(join(REPO_ROOT, top));
    expect(importers).toEqual(['packages/ai/src/transport.ts']);
  });

  // Phase 2 fix round 3, the verifier's note "a computed specifier is not flagged": a name built at
  // run time ("'@anthropic-ai/' + 'sdk'") has no import for ESLint to read, and outside apps/ and
  // packages/ no lint rule refuses a computed specifier. Its text is still in the source.
  it('F-EXTRACT-03 · ADR 0023: writes the SDK package scope in packages/ai/src/transport.ts only, among every script outside test files, so no other script can build the name', () => {
    const writers: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name.startsWith('.')) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.[cm]?[jt]sx?$/.test(name) && !/\.test\.[cm]?[jt]sx?$/.test(name) && /anthropic-ai/iu.test(readFileSync(path, 'utf8'))) {
          writers.push(relative(REPO_ROOT, path));
        }
      }
    };
    for (const top of ['apps', 'packages', 'tools', 'tests', 'evals', 'fixtures']) walk(join(REPO_ROOT, top));
    expect(writers).toEqual(['packages/ai/src/transport.ts']);
  });
});

describe('the SDK logs nothing (rule 13)', () => {
  const saved = process.env['ANTHROPIC_LOG'];
  afterEach(() => {
    vi.restoreAllMocks();
    if (saved === undefined) delete process.env['ANTHROPIC_LOG'];
    else process.env['ANTHROPIC_LOG'] = saved;
  });

  /** A fetch that answers every request with a TEST 400, so no request leaves the process. */
  const refusingFetch = async () =>
    new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'TEST' } }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  const request = messageParams({ system: 'TEST system', content: ['TEST document text that must never be logged'], output: 'extraction' });

  it('F-EXTRACT-03 · rule 13: writes nothing with ANTHROPIC_LOG=debug, where the options without the fix log the request', async () => {
    process.env['ANTHROPIC_LOG'] = 'debug';
    // Control: the same client with the SDK's own log settings logs the request at debug level.
    const captured: unknown[][] = [];
    const capture = { error: (...args: unknown[]) => captured.push(args), warn: (...args: unknown[]) => captured.push(args), info: (...args: unknown[]) => captured.push(args), debug: (...args: unknown[]) => captured.push(args) };
    const options = anthropicClientOptions(new ApiKey('TEST-key-not-real'));
    const control = new Anthropic({ ...options, logLevel: undefined, logger: capture, fetch: refusingFetch, maxRetries: 0 });
    expect(control.logLevel).toBe('debug');
    await expect(control.messages.stream(request).finalMessage()).rejects.toBeInstanceOf(Anthropic.BadRequestError);
    expect(captured.length).toBeGreaterThan(0);

    // The transport's options: nothing reaches the console or the process's output.
    const writes = [
      vi.spyOn(console, 'debug'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'log'),
      vi.spyOn(process.stdout, 'write'),
      vi.spyOn(process.stderr, 'write'),
    ];
    const client = new Anthropic({ ...options, fetch: refusingFetch, maxRetries: 0 });
    expect(client.logLevel).toBe('off');
    await expect(client.messages.stream(request).finalMessage()).rejects.toBeInstanceOf(Anthropic.BadRequestError);
    for (const spy of writes) expect(spy).not.toHaveBeenCalled();
  });
});
