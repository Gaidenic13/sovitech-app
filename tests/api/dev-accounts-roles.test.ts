/**
 * The development accounts of phase 7 (docs/adr/0038-development-login.md, amended in phase 7; prompt 3 5.2
 * "Authentication"; PRD R-133, R-153 and R-154 "Until decided"; the phase 7 working rule: "development accounts for the
 * engineer, commercial reviewer and admin roles are synthetic and labelled as such").
 *
 * Over a TEST database (Testcontainers), on the operator's login, as the CLI and the e2e stack call them: one account per
 * app role, each named as a development account, each holding exactly its one role through one audited grant, created
 * once however often the function runs; none of the three SOVITECH accounts is a member of any project (the engineer and
 * the commercial reviewer read through their roles; the admin reads no project's documents or values: ADR 0013 decision
 * 5); and each account's session user, read in its own request as the sign-in does, carries its one role.
 *
 * Phase 7 part B (the adversarial review's finding A-6): an account found by a development account's name that holds
 * another role is never reused (exactly its one role, ADR 0038 decision 10), and a development account whose role was
 * revoked (an audited event, ADR 0013 decision 2) is never granted it again by a later run: each run is refused with
 * the reason, and nothing is granted.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grantAppRole, revokeAppRole } from '@sovitech/db';
import { startTestDatabase, type TestDatabase } from '@sovitech/db/testing';
import { sessionUserOf } from '../../apps/api/src/auth/dev-login';
import { DEV_ACCOUNTS, ensureDevAccounts } from '../../apps/api/src/cli/dev-accounts';

const LONG = { timeout: 120_000 };

let database: TestDatabase;

beforeAll(async () => {
  database = await startTestDatabase();
}, 240_000);

afterAll(async () => {
  await database.stop();
});

describe('ADR 0038 (amended, phase 7): the development accounts of the four app roles', LONG, () => {
  it('ADR 0038 · R-154 "Until decided" · ADR 0013 decision 2: each account is created once, synthetic and named as a development account, and holds exactly its one role through one audited grant', async () => {
    const first = await ensureDevAccounts(database.operator);
    const second = await ensureDevAccounts(database.operator);
    expect(second).toEqual(first);
    expect(new Set(Object.values(first)).size).toBe(DEV_ACCOUNTS.length);
    for (const account of DEV_ACCOUNTS) {
      const userId = first[account.role];
      expect(account.name.startsWith('Development '), account.name).toBe(true);
      const [row] = await database.asAdministrator<{ display_name: string; kind: string }>('SELECT display_name, kind FROM sovitech.app_users WHERE id = $1', [userId]);
      expect(row, account.role).toEqual({ display_name: account.name, kind: 'person' });
      const roles = await database.asAdministrator<{ role: string }>('SELECT role FROM sovitech.app_user_roles WHERE user_id = $1', [userId]);
      expect(roles.map((held) => held.role), account.role).toEqual([account.role]);
      const grants = await database.asAdministrator('SELECT id FROM sovitech.app_role_events WHERE user_id = $1', [userId]);
      expect(grants, account.role).toHaveLength(1);
    }
  });

  it('ADR 0038 · ADR 0013 decision 5: the engineer, the commercial reviewer and the admin are members of no project', async () => {
    const ids = await ensureDevAccounts(database.operator);
    for (const userId of [ids.sovitech_engineer, ids.sovitech_commercial_reviewer, ids.sovitech_admin]) {
      const memberships = await database.asAdministrator('SELECT project_id FROM sovitech.project_members WHERE user_id = $1', [userId]);
      expect(memberships).toEqual([]);
    }
  });

  it('ADR 0038 decision 4 · R-153: each session user, read in the account\'s own request, carries the one role the roles table records', async () => {
    const ids = await ensureDevAccounts(database.operator);
    for (const account of DEV_ACCOUNTS) {
      const user = await sessionUserOf({ store: database.app }, ids[account.role]);
      expect(user, account.role).toEqual({ userId: ids[account.role], displayName: account.name, roles: [account.role] });
    }
  });

  it('A-6 · ADR 0038 decision 10: an account found by a development account\'s name that holds another role is not reused, the run is refused, and nothing is granted', async () => {
    const ids = await ensureDevAccounts(database.operator);
    await grantAppRole(database.operator.db, { userId: ids.sovitech_engineer, role: 'owner', reason: 'TEST A-6: a second role on a development account' });
    const before = await database.asAdministrator('SELECT id FROM sovitech.app_role_events');
    await expect(ensureDevAccounts(database.operator)).rejects.toThrow(/holds exactly its one role/u);
    expect(await database.asAdministrator('SELECT id FROM sovitech.app_role_events')).toHaveLength(before.length);
    await revokeAppRole(database.operator.db, { userId: ids.sovitech_engineer, role: 'owner', reason: 'TEST A-6: the second role taken back' });
    expect(await ensureDevAccounts(database.operator)).toEqual(ids);
  });

  it('A-6 · ADR 0013 decision 2: a development account whose role was revoked is not granted it again; the run is refused with the reason', async () => {
    const ids = await ensureDevAccounts(database.operator);
    await revokeAppRole(database.operator.db, { userId: ids.sovitech_admin, role: 'sovitech_admin', reason: 'TEST A-6: the operator revokes the development admin' });
    const before = await database.asAdministrator('SELECT id FROM sovitech.app_role_events');
    await expect(ensureDevAccounts(database.operator)).rejects.toThrow(/was revoked/u);
    expect(await database.asAdministrator('SELECT id FROM sovitech.app_role_events')).toHaveLength(before.length);
    expect(await database.asAdministrator('SELECT role FROM sovitech.app_user_roles WHERE user_id = $1', [ids.sovitech_admin])).toEqual([]);
  });
});
