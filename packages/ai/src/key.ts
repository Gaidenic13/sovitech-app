/**
 * The Anthropic API key, and only the key (docs/adr/0021-anthropic-sdk-and-model.md,
 * decision 5; the owner's answer of 2026-09-25: the key may be used for fixture-only
 * evals and AI recordings, and may sit in the git-ignored `.env` at the repository root).
 *
 * - Read from the environment variable, else from `.env` at the repository root, parsed
 *   with node:util's parseEnv; only that one variable is taken, nothing is loaded into
 *   the environment.
 * - Never logged, written, put in a URL or included in an error: an ApiKey prints as a
 *   redaction in every form (string, JSON, util.inspect), and only the SDK client's
 *   constructor reads the value (transport.ts).
 * - With no key, callers report "not running: ANTHROPIC_API_KEY not set", build no
 *   client and write no record.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inspect, parseEnv } from 'node:util';

export const API_KEY_VARIABLE = 'ANTHROPIC_API_KEY';

/** The reason every eval reports while no key is configured. */
export const KEY_NOT_SET = `${API_KEY_VARIABLE} not set`;

const REDACTED = `[${API_KEY_VARIABLE} redacted]`;

/** An API key that never prints itself. */
export class ApiKey {
  readonly #value: string;

  constructor(value: string) {
    if (value.trim() === '') throw new TypeError(`${API_KEY_VARIABLE} is empty`);
    this.#value = value.trim();
  }

  /** The key itself, for the SDK client's constructor only (transport.ts). */
  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return REDACTED;
  }

  toJSON(): string {
    return REDACTED;
  }

  [inspect.custom](): string {
    return REDACTED;
  }
}

export type ApiKeyReading =
  | { readonly present: true; readonly key: ApiKey; readonly from: 'environment' | 'dotenv' }
  | { readonly present: false; readonly reason: string };

export interface ReadApiKeyOptions {
  /** The environment to read (process.env in the app). */
  readonly env: Readonly<Record<string, string | undefined>>;
  /** The repository root, whose `.env` is read when the environment has no key. */
  readonly root: string;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Reads the key from the environment, else from `<root>/.env`. An empty value counts
 * as not set. A `.env` that cannot be read or parsed counts as not set, and the reason
 * says so without quoting the file.
 */
export function readApiKey(options: ReadApiKeyOptions): ApiKeyReading {
  const fromEnvironment = options.env[API_KEY_VARIABLE];
  if (nonEmpty(fromEnvironment)) return { present: true, key: new ApiKey(fromEnvironment), from: 'environment' };

  const file = join(options.root, '.env');
  if (!existsSync(file) || !statSync(file).isFile()) return { present: false, reason: KEY_NOT_SET };
  let parsed: object;
  try {
    parsed = parseEnv(readFileSync(file, 'utf8'));
  } catch {
    // The file's text is never repeated: it may hold other secrets.
    return { present: false, reason: `${KEY_NOT_SET} (the .env file at the repository root could not be read)` };
  }
  const fromFile: unknown = (parsed as Record<string, unknown>)[API_KEY_VARIABLE];
  if (nonEmpty(fromFile)) return { present: true, key: new ApiKey(fromFile), from: 'dotenv' };
  return { present: false, reason: KEY_NOT_SET };
}
