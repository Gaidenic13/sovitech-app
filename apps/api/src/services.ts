/**
 * What the API's routes and jobs are built on: the store, the file store, the
 * owner's upload guard, the extraction service account, the sessions and the log.
 * The entry points (src/index.ts, src/worker-main.ts) build them from the
 * environment; tests build them over a TEST database and a TEST data folder.
 */
import type { Store } from '@sovitech/db';
import type { SessionStore } from './auth/sessions';
import type { FileStore } from './storage/file-store';
import type { UploadGuard } from './uploads/fixture-guard';

/** One log record: codes and ids only, never document text, file names or excerpts (rule 13). */
export interface ApiLogRecord {
  readonly event: string;
  readonly code?: string;
  readonly projectId?: string;
  readonly documentId?: string;
  readonly uploadId?: string;
  readonly jobId?: string;
  readonly codes?: readonly string[];
}

export type ApiLog = (record: ApiLogRecord) => void;

/** The default log: one JSON line on standard error. */
export const stderrApiLog: ApiLog = (record) => {
  process.stderr.write(`${JSON.stringify(record)}\n`);
};

export interface ApiServices {
  /** The store on the app's login (sovitech_db_app). */
  readonly store: Store;
  readonly files: FileStore;
  /** The owner's guard: fixtures only (docs/adr/0028). */
  readonly uploadGuard: UploadGuard;
  /**
   * The extraction job's service account (kind `service`). The owner's upload adds it to
   * the project, in the owner's own request, when a file is queued for analysis, so the
   * job can write the document's text and values as the system (2.1; ADR 0013).
   */
  readonly extractionAccountId: string;
  readonly sessions: SessionStore;
  /** The secret that signs the session and CSRF cookies. */
  readonly cookieSecret: string;
  readonly log: ApiLog;
  /**
   * The development accounts the sign-in page offers (SOVITECH_DEV_ACCOUNTS; docs/adr/0038).
   * Absent or empty: the development login is off. It is off too unless `uploadGuard` is the
   * owner's fixtures-only guard (./auth/dev-login.ts).
   */
  readonly devAccounts?: readonly string[];
}
