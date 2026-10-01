/**
 * `pnpm --filter @sovitech/api dev-accounts`: creates (or finds) the development owner account on
 * the operator's login, makes it a member of the demo project when the demo seed has built one,
 * and prints the SOVITECH_DEV_ACCOUNTS line for `.env` (./dev-accounts.ts; docs/adr/0038). It prints
 * ids only: no password exists, and no secret is read or written.
 */
import { openStore } from '@sovitech/db';
import { databaseUrl, readSettings } from '../config';
import { addToDemoProject, ensureDevOwner } from './dev-accounts';

const url = databaseUrl(readSettings(), 'sovitech_db_admin');
if (url === undefined) throw new Error('The operator login is not configured (SOVITECH_DB_OPERATOR_PASSWORD or SOVITECH_DB_OPERATOR_URL; see .env.example).');
const store = openStore(url);
try {
  const ownerId = await ensureDevOwner(store);
  const demo = await addToDemoProject(store, [ownerId]);
  process.stdout.write(
    [
      `SOVITECH_DEV_ACCOUNTS=${ownerId}`,
      demo === undefined ? '# No demo project yet: run `pnpm --filter @sovitech/api seed:demo`, then this command again.' : `# A member of the demo project ${demo}.`,
    ].join('\n') + '\n',
  );
} finally {
  await store.close();
}
