/**
 * The development accounts (docs/adr/0038-development-login.md, amended in phase 7; prompt 3 5.2 "Authentication";
 * PRD R-133, R-136 interim, R-153 and R-154 "Until decided"), on the operator's login only:
 *
 * - one person account per app role, each synthetic and named as a development account ("Development owner",
 *   "Development engineer", "Development commercial reviewer", "Development admin"), each holding exactly its one role,
 *   each creation and grant audited (0006; ADR 0013 decision 2: "App roles are events"). A second run finds and reuses
 *   each, and grants nothing twice;
 * - `sovitech_engineer` and `sovitech_commercial_reviewer` are granted here because this is the operator's login, the
 *   only place they may be granted until PRD D-13 decides who grants them (`SVR04`); no screen grants a role (R-154
 *   "Until decided");
 * - only the development owner is made a member of the demo project (PRD R-136, "Proposed (PRD interim, reversible): in
 *   S1 (proposed) it is listed, with its demo line, for every development account"; D-13): the engineer and the
 *   commercial reviewer read projects through their roles, not as members (ADR 0013 decision 5), and the admin reads no
 *   project's documents or values (ADR 0013 decision 5). The seed itself still decides no membership.
 *
 * Phase 7 part B (the adversarial review's finding A-6): an account found by a development account's name is reused
 * only while it holds no role but its own (exactly its one role, ADR 0038 decision 10), and a development account
 * whose role was revoked is never granted it again here: an operator's audited revocation stands (ADR 0013 decision
 * 2). Either way the run is refused with the reason, before anything is granted.
 *
 * Phase 7 (ADR 0038, amended): the engineer, commercial reviewer and admin accounts are added. No engineer page is built
 * (PRD R-128 "Until decided", D-16) and no quotation record is created (R-129 "Until decided", D-20, D-16), so the
 * engineer and the commercial reviewer land on the project list with a line saying so; the admin lands on the
 * development-only admin area (ADR 0053). Nothing here writes a value, an approval, a verification or a quotation record.
 */
import type { AppRole } from '@sovitech/domain';
import { addProjectMember, createAppUser, grantAppRole, type Store } from '@sovitech/db';
import { findDemoProject } from '../seed/demo-seed';

/** The development owner's display name: synthetic, never a real person's. */
export const DEV_OWNER_NAME = 'Development owner';

/** The development account of each app role: synthetic names, each saying it is a development account (ADR 0038, amended in phase 7). */
export const DEV_ACCOUNTS = [
  { role: 'owner', name: DEV_OWNER_NAME },
  { role: 'sovitech_engineer', name: 'Development engineer' },
  { role: 'sovitech_commercial_reviewer', name: 'Development commercial reviewer' },
  { role: 'sovitech_admin', name: 'Development admin' },
] as const satisfies readonly { readonly role: AppRole; readonly name: string }[];

export type DevAccountRole = (typeof DEV_ACCOUNTS)[number]['role'];

const REASON = 'the development login (prompt 3 5.2 "Authentication"; docs/adr/0038)';

/** The oldest person account with a development account's name, if any. */
function findDevAccount(operator: Store, name: string): Promise<{ readonly id: string } | undefined> {
  return operator.db.selectFrom('app_users').select('id').where('kind', '=', 'person').where('display_name', '=', name).orderBy('created_at').executeTakeFirst();
}

/**
 * Why an existing account cannot serve as the development account of its role, or undefined when it can: it holds
 * another role (a development account holds exactly its one role), or its own role was revoked (an audited event a
 * later run never reverses).
 */
async function refusalOf(operator: Store, userId: string, account: { readonly role: AppRole; readonly name: string }): Promise<string | undefined> {
  const held = (await operator.db.selectFrom('app_user_roles').select('role').where('user_id', '=', userId).execute()).map((row) => row.role);
  const others = held.filter((role) => role !== account.role);
  if (others.length > 0) {
    return `the account "${account.name}" also holds ${others.join(', ')}, and a development account holds exactly its one role (docs/adr/0038 decision 10)`;
  }
  if (held.includes(account.role)) return undefined;
  const revoked = await operator.db
    .selectFrom('app_role_events')
    .select('id')
    .where('user_id', '=', userId)
    .where('role', '=', account.role)
    .where('type', '=', 'revoked')
    .executeTakeFirst();
  return revoked === undefined ? undefined : `the ${account.role} role of "${account.name}" was revoked (an audited event, docs/adr/0013 decision 2), and this command never grants it again`;
}

/**
 * The development account of one role, created when missing, holding that role. Returns its id. Refused, before anything
 * is granted, when the account found by that name holds another role or its role was revoked (A-6).
 */
export async function ensureDevAccount(operator: Store, account: { readonly role: AppRole; readonly name: string }): Promise<string> {
  const existing = await findDevAccount(operator, account.name);
  if (existing !== undefined) {
    const refusal = await refusalOf(operator, existing.id, account);
    if (refusal !== undefined) throw new Error(`Development accounts not ensured: ${refusal}. Nothing was granted.`);
  }
  const userId = existing?.id ?? (await createAppUser(operator.db, { displayName: account.name, kind: 'person', reason: REASON }));
  const holds = await operator.db.selectFrom('app_user_roles').select('role').where('user_id', '=', userId).where('role', '=', account.role).executeTakeFirst();
  if (holds === undefined) await grantAppRole(operator.db, { userId, role: account.role, reason: REASON });
  return userId;
}

/** The development owner account, created when missing, holding `owner`. Returns its id. */
export async function ensureDevOwner(operator: Store): Promise<string> {
  return ensureDevAccount(operator, { role: 'owner', name: DEV_OWNER_NAME });
}

/**
 * Every development account, created when missing, each holding its one role, by role. Each existing account is checked
 * first (A-6), so a refused run grants nothing to any of them.
 */
export async function ensureDevAccounts(operator: Store): Promise<Readonly<Record<DevAccountRole, string>>> {
  for (const account of DEV_ACCOUNTS) {
    const existing = await findDevAccount(operator, account.name);
    const refusal = existing === undefined ? undefined : await refusalOf(operator, existing.id, account);
    if (refusal !== undefined) throw new Error(`Development accounts not ensured: ${refusal}. Nothing was granted.`);
  }
  const ids: Partial<Record<DevAccountRole, string>> = {};
  for (const account of DEV_ACCOUNTS) ids[account.role] = await ensureDevAccount(operator, account);
  return {
    owner: required(ids.owner),
    sovitech_engineer: required(ids.sovitech_engineer),
    sovitech_commercial_reviewer: required(ids.sovitech_commercial_reviewer),
    sovitech_admin: required(ids.sovitech_admin),
  };
}

function required(id: string | undefined): string {
  if (id === undefined) throw new Error('a development account was not created');
  return id;
}

/** Adds each account as a member of the demo project, when one exists and it is not one yet. Returns the demo project's id, or undefined. */
export async function addToDemoProject(operator: Store, userIds: readonly string[]): Promise<string | undefined> {
  const projectId = await findDemoProject(operator);
  if (projectId === undefined) return undefined;
  for (const userId of userIds) {
    const member = await operator.db
      .selectFrom('audit_events')
      .select('id')
      .where('type', '=', 'project_member_added')
      .where('project_id', '=', projectId)
      .where('target_user_id', '=', userId)
      .executeTakeFirst();
    if (member === undefined) await addProjectMember(operator.db, { projectId, userId });
  }
  return projectId;
}
