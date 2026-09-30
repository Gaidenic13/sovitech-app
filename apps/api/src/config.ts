/**
 * The API's settings for local development (prompt 3 section 5.2, "Hosting": local
 * only). They come from the environment, or from the repository's `.env` (git-ignored;
 * see .env.example), of which only the SOVITECH_ settings named here are read: nothing
 * is loaded into the environment, and no password or secret is ever printed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
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

/** The extractor image (ADR 0018's `extractor` target), built locally. */
export function extractorImage(settings: Settings): string {
  return settings.SOVITECH_EXTRACTOR_IMAGE ?? 'sovitech-extractor:dev';
}

/** The IFC reader image (services/ifc-reader/Dockerfile; ADR 0031), built locally. */
export function ifcReaderImage(settings: Settings): string {
  return settings.SOVITECH_IFC_READER_IMAGE ?? DEFAULT_IFC_READER_IMAGE;
}
