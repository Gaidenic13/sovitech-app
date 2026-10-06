/**
 * The API's settings for local development (prompt 3 section 5.2, "Hosting": local
 * only). They come from the environment, or from the repository's `.env` (git-ignored;
 * see .env.example), of which only the SOVITECH_ settings named here are read: nothing
 * is loaded into the environment, and no password or secret is ever printed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { parseNumber } from '@sovitech/registry';
import { DEFAULT_SESSION_LIFETIMES, type SessionLifetimes } from './auth/sessions';
import { DEFAULT_IFC_READER_IMAGE } from './jobs/sandbox';

/** The repository root: the folder holding fixtures/manifest.json, prompts/ and .env. */
export const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export const SETTING_NAMES = [
  'SOVITECH_DB_PORT',
  'SOVITECH_DB_NAME',
  'SOVITECH_DB_APP_PASSWORD',
  'SOVITECH_DB_OPERATOR_PASSWORD',
  'SOVITECH_DATA_DIR',
  'SOVITECH_SESSION_SECRET',
  'SOVITECH_EXTRACTION_ACCOUNT_ID',
  'SOVITECH_EXTRACTOR_IMAGE',
  'SOVITECH_IFC_READER_IMAGE',
  // Phase 3 (docs/adr/0037-e2e-setup.md): whole connection strings, which win over the port, name
  // and passwords above when set (the e2e setup's TEST database gives them).
  'SOVITECH_DB_APP_URL',
  'SOVITECH_DB_OPERATOR_URL',
  // Phase 3 (docs/adr/0038-development-login.md): the development accounts, comma-separated ids.
  'SOVITECH_DEV_ACCOUNTS',
  // Phase 3 part B (docs/adr/0038 decision 9): how long a session lives unused, in minutes, and in all, in hours.
  'SOVITECH_SESSION_IDLE_MINUTES',
  'SOVITECH_SESSION_ABSOLUTE_HOURS',
  // Phase 5 (docs/adr/0050-exports-print-route-and-pdf.md decision 2): the web origin the API prints the proposal's print
  // route from (dev: Vite's origin; e2e: vite preview's). Unset: exports answer 503 `export_unavailable`.
  'SOVITECH_WEB_ORIGIN',
] as const;
export type SettingName = (typeof SETTING_NAMES)[number];

export type Settings = Partial<Record<SettingName, string>>;

/** The settings: each from the environment, else from `<root>/.env`. Empty values count as unset. */
export function readSettings(environment: NodeJS.ProcessEnv = process.env, root: string = REPOSITORY_ROOT): Settings {
  const file = `${root.replace(/\/$/u, '')}/.env`;
  let fromFile: Record<string, string | undefined> = {};
  if (existsSync(file)) {
    try {
      fromFile = parseEnv(readFileSync(file, 'utf8')) as Record<string, string | undefined>;
    } catch {
      fromFile = {};
    }
  }
  const settings: Settings = {};
  for (const name of SETTING_NAMES) {
    const value = environment[name] ?? fromFile[name];
    if (value !== undefined && value.trim() !== '') settings[name] = value.trim();
  }
  return settings;
}

/** A login role's connection string on the local database, or undefined without its password. */
export function localDatabaseUrl(settings: Settings, role: 'sovitech_db_app' | 'sovitech_db_admin'): string | undefined {
  const password = role === 'sovitech_db_app' ? settings.SOVITECH_DB_APP_PASSWORD : settings.SOVITECH_DB_OPERATOR_PASSWORD;
  if (password === undefined || settings.SOVITECH_DB_PORT === undefined || settings.SOVITECH_DB_NAME === undefined) return undefined;
  const url = new URL('postgres://127.0.0.1');
  url.username = encodeURIComponent(role);
  url.password = encodeURIComponent(password);
  url.port = settings.SOVITECH_DB_PORT;
  url.pathname = `/${settings.SOVITECH_DB_NAME}`;
  return url.toString();
}

/**
 * A login's connection string: the whole URL setting when one is set (SOVITECH_DB_APP_URL,
 * SOVITECH_DB_OPERATOR_URL; ADR 0037), else the local database's from its port, name and
 * password; undefined when neither is configured.
 */
export function databaseUrl(settings: Settings, role: 'sovitech_db_app' | 'sovitech_db_admin'): string | undefined {
  const whole = role === 'sovitech_db_app' ? settings.SOVITECH_DB_APP_URL : settings.SOVITECH_DB_OPERATOR_URL;
  return whole ?? localDatabaseUrl(settings, role);
}

const ACCOUNT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/** A setting that cannot be read as written: the API refuses to start rather than guess (never printing the value). */
export class SettingError extends Error {
  override name = 'SettingError';
}

/**
 * The development accounts (ADR 0038): the ids in SOVITECH_DEV_ACCOUNTS, comma-separated, as
 * `pnpm --filter @sovitech/api dev-accounts` prints them. Unset or empty: none, and the
 * development login is off. An entry that is not an account id stops the start.
 */
export function devAccountIds(settings: Settings): readonly string[] {
  const raw = settings.SOVITECH_DEV_ACCOUNTS;
  if (raw === undefined) return [];
  const ids = raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '');
  if (ids.some((id) => !ACCOUNT_ID.test(id))) throw new SettingError('SOVITECH_DEV_ACCOUNTS holds an entry that is not an account id (see .env.example).');
  return [...new Set(ids)];
}

/** A whole number of minutes or hours as a setting writes it, within its bounds; anything else stops the start (never printing the value). */
function wholeSetting(settings: Settings, name: 'SOVITECH_SESSION_IDLE_MINUTES' | 'SOVITECH_SESSION_ABSOLUTE_HOURS', bounds: { readonly min: number; readonly max: number }): number | undefined {
  const raw = settings[name];
  if (raw === undefined) return undefined;
  if (!/^[0-9]{1,5}$/u.test(raw)) throw new SettingError(`${name} is not a whole number (see .env.example).`);
  // Digits only, read by the one number parser (rule 8's; the lint bans reading numbers by hand).
  const parsed = parseNumber(raw);
  const [reading] = parsed.ok && !parsed.ambiguous && parsed.readings.length === 1 ? parsed.readings : [];
  if (reading === undefined || !Number.isInteger(reading.value)) throw new SettingError(`${name} is not a whole number (see .env.example).`);
  if (reading.value < bounds.min || reading.value > bounds.max) throw new SettingError(`${name} is outside ${String(bounds.min)} to ${String(bounds.max)} (see .env.example).`);
  return reading.value;
}

/**
 * The sessions' lifetimes (ADR 0038 decision 9; part B, A-11): SOVITECH_SESSION_IDLE_MINUTES, how long a session
 * lives unused (1 to 1,440 minutes; default 30), and SOVITECH_SESSION_ABSOLUTE_HOURS, how long it lives in all
 * (1 to 168 hours; default 12). The idle lifetime never exceeds the absolute one.
 */
export function sessionLifetimes(settings: Settings): SessionLifetimes {
  const idleMinutes = wholeSetting(settings, 'SOVITECH_SESSION_IDLE_MINUTES', { min: 1, max: 1440 });
  const absoluteHours = wholeSetting(settings, 'SOVITECH_SESSION_ABSOLUTE_HOURS', { min: 1, max: 168 });
  const idleMs = idleMinutes === undefined ? DEFAULT_SESSION_LIFETIMES.idleMs : idleMinutes * 60 * 1000;
  const absoluteMs = absoluteHours === undefined ? DEFAULT_SESSION_LIFETIMES.absoluteMs : absoluteHours * 60 * 60 * 1000;
  if (idleMs > absoluteMs) throw new SettingError('SOVITECH_SESSION_IDLE_MINUTES is longer than SOVITECH_SESSION_ABSOLUTE_HOURS (see .env.example).');
  return { idleMs, absoluteMs };
}

/** The extractor image (ADR 0018's `extractor` target), built locally. */
export function extractorImage(settings: Settings): string {
  return settings.SOVITECH_EXTRACTOR_IMAGE ?? 'sovitech-extractor:dev';
}

/** The IFC reader image (services/ifc-reader/Dockerfile; ADR 0031), built locally. */
export function ifcReaderImage(settings: Settings): string {
  return settings.SOVITECH_IFC_READER_IMAGE ?? DEFAULT_IFC_READER_IMAGE;
}

/**
 * The web origin the PDF printer opens the print route on (ADR 0050 decision 2): an http origin on the loopback
 * interface only (local development and e2e: prompt 3 5.2 "Hosting": local only), with no path, query or credentials.
 * Unset: undefined, and exports answer 503 `export_unavailable` (the owner is told the PDF could not be prepared).
 * Anything else stops the start (never printing the value).
 */
export function webOrigin(settings: Settings): string | undefined {
  const raw = settings.SOVITECH_WEB_ORIGIN;
  if (raw === undefined) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SettingError('SOVITECH_WEB_ORIGIN is not an origin (see .env.example).');
  }
  const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !loopback || url.username !== '' || url.password !== '' || url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new SettingError('SOVITECH_WEB_ORIGIN must be an http origin on the loopback interface, with no path (see .env.example).');
  }
  return url.origin;
}
