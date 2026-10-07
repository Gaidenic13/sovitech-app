/**
 * `pnpm --filter @sovitech/api dev-accounts`: creates (or finds) the development accounts on the operator's login, one
 * per app role (owner, SOVITECH engineer, SOVITECH commercial reviewer, SOVITECH admin; phase 7), makes the development
 * owner a member of the demo project when the demo seed has built one, and prints the SOVITECH_DEV_ACCOUNTS line for
 * `.env` (./dev-accounts.ts; docs/adr/0038, amended in phase 7). It prints ids only: no password exists, and no secret is
 * read or written.
 */
import { openStore } from '@sovitech/db';
import { databaseUrl, readSettings } from '../config';
import { DEV_ACCOUNTS, addToDemoProject, ensureDevAccounts } from './dev-accounts';

const url = databaseUrl(readSettings(), 'sovitech_db_admin');
if (url === undefined) throw new Error('The operator login is not configured (SOVITECH_DB_OPERATOR_PASSWORD or SOVITECH_DB_OPERATOR_URL; see .env.example).');
const store = openStore(url);
try {
  const ids = await ensureDevAccounts(store);
  const demo = await addToDemoProject(store, [ids.owner]);
  process.stdout.write(
    [
      `SOVITECH_DEV_ACCOUNTS=${DEV_ACCOUNTS.map((account) => ids[account.role]).join(',')}`,
      `# ${DEV_ACCOUNTS.map((account) => account.name).join(', ')}, in that order.`,
      demo === undefined ? '# No demo project yet: run `pnpm --filter @sovitech/api seed:demo`, then this command again.' : `# The development owner is a member of the demo project ${demo}.`,
    ].join('\n') + '\n',
  );
} finally {
  await store.close();
}
