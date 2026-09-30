/**
 * The one place the Anthropic SDK is used (docs/adr/0021-anthropic-sdk-and-model.md;
 * build-readiness 3 "Now" item 6; the claude-api skill was loaded before writing it).
 *
 * - Structured outputs only: `output_config.format` with the output schema (zod's JSON
 *   Schema, with `enum` and `const` kept: strictJsonSchema), and effort set explicitly.
 *   No tools and no server-side tools, no Citations (they cannot be combined with
 *   structured outputs), no Files API (document text goes inline in delimited blocks), no
 *   fallbacks (a candidate always names the one model that produced it), no thinking
 *   settings (adaptive; this model cannot disable it).
 * - The client takes the key only: `apiKey` set, `authToken: null`, no profile, and the
 *   base URL pinned, so no other credential or host is used.
 * - The SDK logs nothing: its log level is `off` and its logger discards, whatever
 *   `ANTHROPIC_LOG` says, because at debug level it prints each request with its body,
 *   which holds document text (rule 13, "Logs and error reports never contain document
 *   text"; phase 2 review, adversarial finding on `ANTHROPIC_LOG`). The boundary's own
 *   log (boundary.ts) records codes and ids only.
 * - Streaming, so a long response is never cut by a request timeout.
 * - The SDK only reads the JSON of the response; it does not decide whether the output is
 *   valid. The output validator does that (validator/output.ts), so a response that does
 *   not match the schema still comes back with the model id the API returned.
 * - Errors are mapped to codes: an SDK error's message is never passed on, and the key
 *   never appears in one.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { ApiKey } from './key';
import { API_BASE_URL, EFFORT, MAX_TOKENS, MODEL_ID } from './model';
import { DraftingOutputSchema, ExtractionOutputSchema } from './schema';

export type OutputKind = 'extraction' | 'drafting';

/** One request: the system prompt, the user message's text blocks, and which output schema applies. */
export interface ModelRequest {
  readonly system: string;
  readonly content: readonly string[];
  readonly output: OutputKind;
}

/** Why a response carries no usable output. */
export type OutputProblem = 'refusal' | 'max_tokens' | 'structured_output_invalid' | 'no_output';

/** A response as the boundary reads it. */
export interface ModelResponse {
  /** The model id the API returned. */
  readonly model: string;
  /** When the response arrived (ISO 8601). */
  readonly receivedAt: string;
  readonly stopReason: string | null;
  /** The output as read from the response's JSON, before any validation; undefined with a problem. */
  readonly output: unknown;
  readonly problem?: OutputProblem;
}

/** Sends one request. The SDK transport is the only production implementation. */
export type ModelTransport = (request: ModelRequest) => Promise<ModelResponse>;

export const AI_CALL_ERROR_CODES = [
  'authentication',
  'permission',
  'rate_limit',
  'bad_request',
  'not_found',
  'server_error',
  'api_error',
  'timeout',
  'connection',
  'unexpected',
] as const;
export type AiCallErrorCode = (typeof AI_CALL_ERROR_CODES)[number];

/** A failed call, as a code and an HTTP status. Carries nothing of the request, the response or the key. */
export class AiCallError extends Error {
  override name = 'AiCallError';

  constructor(
    readonly code: AiCallErrorCode,
    readonly status: number | undefined,
  ) {
    super(`The AI call failed (${code}${status === undefined ? '' : `, HTTP ${status}`}).`);
  }
}

/** What the SDK's `parse` hook returns: the response's JSON, or that it could not be read. */
type ReadJson = { readonly read: true; readonly value: unknown } | { readonly read: false };

/** Reads JSON only: an object schema that lets every key through; the output schema is the validator's to check. */
const JSON_READER = zodOutputFormat(z.looseObject({}));

function readJson(content: string): ReadJson {
  try {
    return { read: true, value: JSON_READER.parse(content) };
  } catch {
    return { read: false };
  }
}

/** JSON Schema keywords structured outputs do not take (the claude-api skill, "JSON Schema Limitations"); the validator checks them in code. */
const UNSUPPORTED_KEYWORDS = new Set([
  '$schema',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'pattern',
  'maxItems',
  'minProperties',
  'maxProperties',
  'uniqueItems',
  'default',
  'examples',
]);

const SUPPORTED_FORMATS = new Set(['date-time', 'time', 'date', 'duration', 'email', 'hostname', 'uri', 'ipv4', 'ipv6', 'uuid']);

function strictNode(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictNode);
  if (typeof node !== 'object' || node === null) return node;
  const out: Record<string, unknown> = {};
  for (const [keyword, value] of Object.entries(node)) {
    if (UNSUPPORTED_KEYWORDS.has(keyword)) continue;
    if (keyword === 'minItems' && value !== 1 && value !== 0) continue;
    if (keyword === 'format' && (typeof value !== 'string' || !SUPPORTED_FORMATS.has(value))) continue;
    if (keyword === 'properties' || keyword === '$defs') {
      out[keyword] = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, schema]) => [name, strictNode(schema)]));
    } else out[keyword === 'oneOf' ? 'anyOf' : keyword] = strictNode(value);
  }
  if (out['type'] === 'object') out['additionalProperties'] = false;
  return out;
}

/**
 * The output schema as sent: zod's JSON Schema with the keywords structured outputs do not
 * take removed, and `enum` and `const` kept, so the API itself holds `source` to
 * `document` and `ai_inference` (rule 2, "The schema"; G2-4). The SDK's own helper moves
 * `enum` and `const` into descriptions (checked on SDK 0.128.0), which would leave the
 * sources to the validator alone.
 */
export function strictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return strictNode(z.toJSONSchema(schema)) as Record<string, unknown>;
}

/** The structured-output format of a request: the output schema is sent; the SDK only reads the JSON back. */
export function outputFormat(kind: OutputKind) {
  const schema = strictJsonSchema(kind === 'extraction' ? ExtractionOutputSchema : DraftingOutputSchema);
  return { type: 'json_schema' as const, schema, parse: readJson };
}

/** The parameters of one request. Pure: the transport adds nothing to them. */
export function messageParams(request: ModelRequest) {
  return {
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text' as const, text: request.system, cache_control: { type: 'ephemeral' as const } }],
    messages: [{ role: 'user' as const, content: request.content.map((text) => ({ type: 'text' as const, text })) }],
    output_config: { effort: EFFORT, format: outputFormat(request.output) },
  };
}

/** Maps an SDK error to a code, most specific first; the error's own message is dropped. */
export function callError(error: unknown): AiCallError {
  if (error instanceof Anthropic.AuthenticationError) return new AiCallError('authentication', error.status);
  if (error instanceof Anthropic.PermissionDeniedError) return new AiCallError('permission', error.status);
  if (error instanceof Anthropic.RateLimitError) return new AiCallError('rate_limit', error.status);
  if (error instanceof Anthropic.BadRequestError) return new AiCallError('bad_request', error.status);
  if (error instanceof Anthropic.NotFoundError) return new AiCallError('not_found', error.status);
  if (error instanceof Anthropic.InternalServerError) return new AiCallError('server_error', error.status);
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new AiCallError('timeout', undefined);
  if (error instanceof Anthropic.APIConnectionError) return new AiCallError('connection', undefined);
  if (error instanceof Anthropic.APIError) return new AiCallError('api_error', error.status);
  return new AiCallError('unexpected', undefined);
}

/** A logger that writes nowhere: the SDK's own log never reaches the console (rule 13). */
const SILENT_LOGGER = Object.freeze({ error: () => undefined, warn: () => undefined, info: () => undefined, debug: () => undefined });

/** The client's options: the key only, the base URL pinned, and no SDK logging at any `ANTHROPIC_LOG` level. */
export function anthropicClientOptions(key: ApiKey) {
  return {
    apiKey: key.reveal(),
    authToken: null,
    baseURL: API_BASE_URL,
    maxRetries: 2,
    logLevel: 'off' as const,
    logger: SILENT_LOGGER,
  };
}

/** Builds the SDK transport for a key. Nothing else in the app builds an Anthropic client. */
export function createAnthropicTransport(key: ApiKey): ModelTransport {
  const client = new Anthropic(anthropicClientOptions(key));
  return async (request) => {
    let message;
    try {
      message = await client.messages.stream(messageParams(request)).finalMessage();
    } catch (error) {
      throw callError(error);
    }
    const receivedAt = new Date().toISOString();
    const base = { model: message.model, receivedAt, stopReason: message.stop_reason };
    if (message.stop_reason === 'refusal') return { ...base, output: undefined, problem: 'refusal' };
    if (message.stop_reason === 'max_tokens') return { ...base, output: undefined, problem: 'max_tokens' };
    const parsed = message.parsed_output;
    if (parsed === null) return { ...base, output: undefined, problem: 'no_output' };
    if (!parsed.read) return { ...base, output: undefined, problem: 'structured_output_invalid' };
    return { ...base, output: parsed.value };
  };
}
