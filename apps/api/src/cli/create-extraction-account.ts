/**
 * `pnpm --filter @sovitech/api extraction-account`: creates the extraction job's service
 * account on the operator's login (audited; ADR 0013) and prints its id for
 * SOVITECH_EXTRACTION_ACCOUNT_ID in `.env`. A service account holds no app role; the
 * owner's upload makes it a member of the project whose file it analyses (ADR 0025).
 */
import { createAppUser, openStore } from '@sovitech/db';
import { localDatabaseUrl, readSettings } from '../config';

const url = localDatabaseUrl(readSettings(), 'sovitech_db_admin');
if (url === undefined) throw new Error('The operator login is not configured (SOVITECH_DB_OPERATOR_PASSWORD; see .env.example).');
const store = openStore(url);
try {
  const id = await createAppUser(store.db, { displayName: 'SOVITECH extraction service', kind: 'service', reason: 'the analysis worker (phase 2)' });
  process.stdout.write(`SOVITECH_EXTRACTION_ACCOUNT_ID=${id}\n`);
} finally {
  await store.close();
}
