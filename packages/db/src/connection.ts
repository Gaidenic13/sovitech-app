/**
 * Opening the store: a Kysely instance on a pg pool, scoped to schema `sovitech`.
 *
 * Every session runs in UTC, and timestamps come back as ISO 8601 strings with
 * six fractional digits, so they order as text and keep the database's
 * microseconds. `date` columns come back as written; `uuid[]` as string arrays.
 */
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './schema';

const TIMESTAMPTZ = 1184;
const DATE = 1082;
const UUID_ARRAY = 2951;
const TEXT_ARRAY = 1009;

const POSTGRES_UTC_TIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?\+00$/;

/** `2026-09-25 10:00:00.12+00` as `2026-09-25T10:00:00.120000Z`. */
export function isoTimestamp(text: string): string {
  const match = POSTGRES_UTC_TIME.exec(text);
  if (match === null) throw new Error(`not a UTC timestamp from the store: ${text}`);
  const [, day, time, fraction] = match;
  return `${day}T${time}.${(fraction ?? '').padEnd(6, '0')}Z`;
}

/** pg's own parsers, by type oid (its declared TypeId list leaves out the array types). */
const builtInParser = pg.types.getTypeParser as unknown as (oid: number, format?: 'text' | 'binary') => (value: string) => unknown;

const types: pg.CustomTypesConfig = {
  getTypeParser: ((oid: number, format?: 'text' | 'binary') => {
    if (oid === TIMESTAMPTZ) return isoTimestamp;
    if (oid === DATE) return (text: string) => text;
    if (oid === UUID_ARRAY) return builtInParser(TEXT_ARRAY, format);
    return builtInParser(oid, format);
  }) as pg.CustomTypesConfig['getTypeParser'],
};

export interface Store {
  readonly db: Kysely<Database>;
  /** Closes the pool. */
  close(): Promise<void>;
}

export interface StoreOptions {
  /** The pool size; pg's default when absent. */
  readonly maxConnections?: number;
}

/** Opens the store on one login role's connection string. */
export function openStore(connectionString: string, options: StoreOptions = {}): Store {
  const pool = new pg.Pool({
    connectionString,
    types,
    options: '-c TimeZone=UTC',
    ...(options.maxConnections === undefined ? {} : { max: options.maxConnections }),
  });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) }).withSchema('sovitech');
  return {
    db,
    close: () => db.destroy(),
  };
}
