/**
 * The development accounts (docs/adr/0038-development-login.md; prompt 3 5.2 "Authentication";
 * PRD R-133, R-136 interim, R-153 "Until decided"), on the operator's login only:
 *
 * - one person account "Development owner" (synthetic, labelled as the development login's), with
 *   the app role `owner`, each creation and grant audited (0006). A second run finds and reuses it;
 * - made a member of the demo project when the demo seed has built one (PRD R-136, "Proposed (PRD
 *   interim, reversible): in S1 (proposed) it is listed, with its demo line, for every development
 *   account"; D-13). The seed itself still decides no membership.
 *
 * No engineer account: phase 7 builds the engineer's work, and granting `sovitech_engineer` stays
 * on the operator's login (D-13). Nothing here writes a value, an approval or a verification.
 */
import { addProjectMember, createAppUser, grantAppRole, type Store } from '@sovitech/db';
import { findDemoProject } from '../seed/demo-seed';

/** The development account's display name: synthetic, never a real person's. */
export const DEV_OWNER_NAME = 'Development owner';

const REASON = 'the development login (prompt 3 5.2 "Authentication"; docs/adr/0038)';

/** The development owner account, created when missing, holding `owner`. Returns its id. */
export async function ensureDevOwner(operator: Store): Promise<string> {
  const existing = await operator.db
    .selectFrom('app_users')
    .select('id')
    .where('kind', '=', 'person')
    .where('display_name', '=', DEV_OWNER_NAME)
    .orderBy('created_at')
    .executeTakeFirst();
  const userId = existing?.id ?? (await createAppUser(operator.db, { displayName: DEV_OWNER_NAME, kind: 'person', reason: REASON }));
  const holds = await operator.db.selectFrom('app_user_roles').select('role').where('user_id', '=', userId).where('role', '=', 'owner').executeTakeFirst();
  if (holds === undefined) await grantAppRole(operator.db, { userId, role: 'owner', reason: REASON });
  return userId;
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
