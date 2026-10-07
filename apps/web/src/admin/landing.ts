/**
 * Where a signed-in user lands, and what the session's roles draw (phase 7; docs/adr/0053 decision 4; prompt 3 5.2
 * "Reviews and roles": "reached by role"; R-144 "Until decided": the header menu holds only the account item, the
 * project list and sign-out, so the admin area is reached by role, not by a menu entry):
 * - a user holding `sovitech_admin` and not `owner` lands on the admin area (UD-39);
 * - everyone else lands on the project list (UD-37). There a user without `owner` sees no "New project" and one line
 *   for each SOVITECH role they hold, saying what it does in this build (the engineer queue waits for D-16; the
 *   commercial review waits for D-20 and D-16; the admin area is open to the admin): `copy.projects.roleLines`.
 *
 * The roles decide only what is drawn and where the user lands. What is read and written is the API's and the store's
 * decision, in the user's own request (ADR 0013; ADR 0053 decision 5): a role the session still names but the roles
 * table no longer holds is refused there.
 */
import type { SessionUser } from '@sovitech/view-model/browser';

export const ADMIN_LANDING = '/admin/accounts';
export const PROJECTS_LANDING = '/projects';

type Roles = Pick<SessionUser, 'roles'>;

export function landingOf(user: Roles): string {
  return user.roles.includes('sovitech_admin') && !user.roles.includes('owner') ? ADMIN_LANDING : PROJECTS_LANDING;
}

/** Whether the user may start a project: the owner's role (the store refuses anyone else's owner answers: ADR 0013). */
export function mayCreateProjects(user: Roles): boolean {
  return user.roles.includes('owner');
}

/** Whether the admin area is drawn for the user (ADR 0053 decision 5): a person holding `sovitech_admin`. */
export function mayReadAdminArea(user: Roles): boolean {
  return user.roles.includes('sovitech_admin');
}

/** The SOVITECH roles that have a line on the project list for a user without `owner`, in the order the lines read. */
export const ROLE_LINE_ROLES = ['sovitech_engineer', 'sovitech_commercial_reviewer', 'sovitech_admin'] as const;
export type RoleLineRole = (typeof ROLE_LINE_ROLES)[number];

/** The lines a user's roles give the project list: one per SOVITECH role held, and none for a user holding `owner`. */
export function roleLinesOf(user: Roles): readonly RoleLineRole[] {
  if (mayCreateProjects(user)) return [];
  return ROLE_LINE_ROLES.filter((role) => user.roles.includes(role));
}
