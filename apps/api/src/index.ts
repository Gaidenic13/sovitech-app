import { openStore } from '@sovitech/db';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { SessionStore } from './auth/sessions';
import { REPOSITORY_ROOT, databaseUrl, devAccountIds, readSettings, sessionLifetimes } from './config';
import { readPort } from './port';
import { buildServer } from './server';
import { stderrApiLog, type ApiServices } from './services';
import { dataDirectoryFromEnvironment } from './storage/data-dir';
import { FileStore } from './storage/file-store';
import { fixtureUploadGuard } from './uploads/fixture-guard';
import { PRODUCTION_API_REGISTRY } from './wizard/registry';

/**
 * The API's services for local development, when the local database is configured
 * (.env.example): without the app login's password, the API serves the health check only.
 */
function localServices(): ApiServices | undefined {
  const settings = readSettings();
  const url = databaseUrl(settings, 'sovitech_db_app');
  const secret = settings.SOVITECH_SESSION_SECRET;
  const extraction = settings.SOVITECH_EXTRACTION_ACCOUNT_ID;
  if (url === undefined || secret === undefined || extraction === undefined) {
    stderrApiLog({ event: 'api_started_without_store', code: 'settings_missing' });
    return undefined;
  }
  if (secret.length < 32) throw new Error('SOVITECH_SESSION_SECRET must be 32 characters or more.');
  return {
    store: openStore(url),
    files: new FileStore(dataDirectoryFromEnvironment(REPOSITORY_ROOT, { ...process.env, ...(settings.SOVITECH_DATA_DIR === undefined ? {} : { SOVITECH_DATA_DIR: settings.SOVITECH_DATA_DIR }) })),
    // The owner's decision of 2026-09-25: this development build stores fixtures only (docs/adr/0028).
    uploadGuard: fixtureUploadGuard(REPOSITORY_ROOT),
    extractionAccountId: extraction,
    // Sessions end when unused or too old (docs/adr/0038 decision 9).
    sessions: new SessionStore({ lifetimes: sessionLifetimes(settings) }),
    cookieSecret: secret,
    log: stderrApiLog,
    // The development login (docs/adr/0038): the accounts `pnpm --filter @sovitech/api dev-accounts` printed.
    devAccounts: devAccountIds(settings),
    // The registry seam (docs/adr/0044 decision 4): the production registry, and nothing else, in the app.
    registry: PRODUCTION_API_REGISTRY,
  };
}

// Prompt 3 section 5.4: the API refuses to start while any gate fails the
// loosening check (docs/adr/0005-gates-mechanism.md). assertGatesStartupSafe()
// throws before anything is built; buildServer() accepts only the source it
// returns, so the check cannot be left out.
const app = buildServer({ gates: assertGatesStartupSafe(), services: localServices() });
await app.listen({ host: '127.0.0.1', port: readPort() });
