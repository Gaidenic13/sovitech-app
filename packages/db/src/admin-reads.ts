/**
 * The development-only admin area's reads (phase 7; docs/adr/0053-phase-7-scope-and-the-admin-area.md; PRD R-134,
 * R-143, R-150, R-151, R-152, R-154, R-155 and their "Until decided" lines; UD-39 to UD-41).
 *
 * Why definer functions. The app's login reads no account, role event or other project (ADR 0013 decisions 4 to 6:
 * row-level security on `project_id`; the request views show the request's own account and the members of the project
 * in scope). An admin works across projects but holds no access to a project's documents and values (ADR 0013 decision
 * 5). So the store builder adds, in one admin migration (`0018_admin_reads.admin.sql`, modelled on 0014), guarded
 * definer functions that:
 * - accept only an app request whose user is a person holding `sovitech_admin` now (refusing everyone else with SVR06,
 *   `admin_read_needs_the_admin_role`: the role family's code, since SVA01 already names the append-only refusal; and
 *   every login but the app's, which cannot execute them);
 * - return ids, codes, counts and times only: never a candidate's value, an evidence entry, an excerpt, extracted text,
 *   a file name, a project's name or any other answer an owner gave (rule 13, "Project boundary" and "Isolation"; new
 *   case G13-16), and for the erasure log never document text (rule 13, "Logs and error reports never contain document
 *   text"; new case G13-15);
 * - are registered with the guard (`sovitech_guard.guarded_functions`), owned by the role that may read what they read
 *   across projects, not executable by PUBLIC, executable by the app's login only, and covered by the runner's
 *   invariant check; 0009's event trigger stays on (migrate.test.ts).
 * They write nothing. No function here or in 0018 creates an account, grants a role, adds a member, writes an approval
 * record or changes a setting (prompt 3 5.4; R-154 "Until decided"; guardrails section 10).
 *
 * The types are the phase 7 planner's (the decisions read is the store builder's, for rule 3's agreements as well as its
 * corrections: ADR 0054 decision 3); the functions and migration 0018 are the store builder's, with their tests in
 * ./admin-reads.test.ts and the case files G3-24, G13-15 and G13-16. Each read runs in the admin's own request, with no
 * project in scope, and is refused `admin_read_needs_the_admin_role` (SVR06) for anyone else.
 */
import { sql } from 'kysely';
import { APP_ROLES, GUARDRAIL_EVENT_TYPES, type AppRole, type GuardrailEventType } from '@sovitech/domain';
import { refusing } from './errors';
import type { Request } from './request';
import type { AccountKind } from './schema';

/** One account and its current roles, each with the time of the grant that holds (UD-39). */
export interface AdminAccountRow {
  readonly userId: string;
  readonly displayName: string;
  readonly kind: AccountKind;
  readonly roles: readonly { readonly role: AppRole; readonly since: string }[];
}

/** One audited grant or revoke of an app role (`app_role_events`), with who acted: an account, or the operator's login. */
export interface AdminRoleEventRow {
  readonly eventId: string;
  readonly userId: string;
  readonly role: AppRole;
  readonly change: 'granted' | 'revoked';
  readonly byUserId: string | null;
  readonly byOperator: boolean;
  readonly at: string;
  readonly reason: string;
}

/** One project: its id, demo flag, creation time and members (no name: the name is the owner's answer, a value). */
export interface AdminProjectRow {
  readonly projectId: string;
  readonly isDemo: boolean;
  readonly createdAt: string;
  readonly memberIds: readonly string[];
}

/** One project's count of one guardrail event type (section 8): every type for every project, a count of none included. */
export interface AdminGuardrailCountRow {
  readonly projectId: string;
  readonly isDemo: boolean;
  readonly type: GuardrailEventType;
  readonly count: number;
}

/** Section 8's counts as the store made them: per project and type, and per type in all projects. */
export interface AdminGuardrailCounts {
  readonly projects: readonly AdminGuardrailCountRow[];
  readonly totals: readonly { readonly type: GuardrailEventType; readonly count: number }[];
}

/**
 * One decision on an inference, for rule 3's counts per tier and item type (R-152 "Until decided"; ADR 0054 decision 3):
 * the tier recorded with the decision (the derived tier the person was shown; `unstated` when none was recorded), the
 * field it concerns, whether the person agreed or corrected, who and when. No project, subject, candidate or value.
 */
export interface AdminCalibrationDecisionRow {
  readonly tier: 'high' | 'medium' | 'low' | 'unstated';
  readonly fieldKey: string;
  readonly outcome: 'agreed' | 'corrected';
  readonly by: 'owner' | 'sovitech_engineer';
  readonly at: string;
}

/** One owner decision on an inference, for the owner correction rate (guardrails section 4): a confirmation or a correction. */
export interface AdminInferenceDecisionCounts {
  readonly projectId: string;
  readonly confirmations: number;
  readonly corrections: number;
}

/** One erasure job, from its `erased` document event and the erasure's audit record (ids, roles, times, counts). */
export interface AdminErasureRow {
  readonly documentEventId: string;
  readonly projectId: string;
  readonly isDemo: boolean;
  readonly documentId: string;
  readonly role: 'owner' | 'system';
  readonly byUserId: string | null;
  readonly at: string;
  readonly excerptsErased: number;
  readonly textPartsDeleted: number;
  readonly candidatesWithdrawn: number;
}

/** Runs one admin read; the store's refusals leave as StoreRefusal (SVR06 for anyone but an admin), never with the database's text. */
async function rowsOf<Row>(request: Pick<Request, 'trx'>, query: ReturnType<typeof sql<Row>>): Promise<Row[]> {
  const result = await refusing(() => query.execute(request.trx));
  return result.rows;
}

const TIERS: ReadonlySet<string> = new Set(['high', 'medium', 'low', 'unstated']);
const APP_ROLE_SET: ReadonlySet<string> = new Set(APP_ROLES);
const EVENT_TYPES: ReadonlySet<string> = new Set(GUARDRAIL_EVENT_TYPES);

function appRoleOf(role: string): AppRole {
  if (!APP_ROLE_SET.has(role)) throw new Error('the store returned a role that is not an app role');
  return role as AppRole;
}

function accountKindOf(kind: string): AccountKind {
  if (kind !== 'person' && kind !== 'service' && kind !== 'seed') throw new Error('the store returned an account kind it does not hold');
  return kind;
}

/** UD-39: every account with its current roles, oldest first. */
export async function readAdminAccounts(request: Pick<Request, 'trx'>): Promise<readonly AdminAccountRow[]> {
  const rows = await rowsOf(
    request,
    sql<{ user_id: string; display_name: string; kind: string; roles: string[]; roles_since: string[] }>`SELECT user_id, display_name, kind, roles, roles_since FROM sovitech.admin_accounts()`,
  );
  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    kind: accountKindOf(row.kind),
    roles: row.roles.map((role, index) => {
      const since = row.roles_since[index];
      if (since === undefined) throw new Error('the store returned a role without the time of its grant');
      return { role: appRoleOf(role), since };
    }),
  }));
}

/** UD-39: every role event, newest first. */
export async function readAdminRoleEvents(request: Pick<Request, 'trx'>): Promise<readonly AdminRoleEventRow[]> {
  const rows = await rowsOf(
    request,
    sql<{ event_id: string; user_id: string; role: string; change: string; by_user_id: string | null; by_operator: boolean; at: string; reason: string }>`SELECT event_id, user_id, role, change, by_user_id, by_operator, at, reason FROM sovitech.admin_role_events()`,
  );
  return rows.map((row) => {
    if (row.change !== 'granted' && row.change !== 'revoked') throw new Error('the store returned a role event that is neither a grant nor a revoke');
    return { eventId: row.event_id, userId: row.user_id, role: appRoleOf(row.role), change: row.change, byUserId: row.by_user_id, byOperator: row.by_operator, at: row.at, reason: row.reason };
  });
}

/** UD-39: every project by id, with its demo flag, creation time and members, oldest first. */
export async function readAdminProjects(request: Pick<Request, 'trx'>): Promise<readonly AdminProjectRow[]> {
  const rows = await rowsOf(
    request,
    sql<{ project_id: string; is_demo: boolean; created_at: string; member_ids: string[] }>`SELECT project_id, is_demo, created_at, member_ids FROM sovitech.admin_projects()`,
  );
  return rows.map((row) => ({ projectId: row.project_id, isDemo: row.is_demo, createdAt: row.created_at, memberIds: row.member_ids }));
}

/** UD-41: section 8's counts, every type for every project (a count of none included), and per type in all projects. */
export async function readAdminGuardrailCounts(request: Pick<Request, 'trx'>): Promise<AdminGuardrailCounts> {
  const rows = await rowsOf(
    request,
    sql<{ project_id: string | null; is_demo: boolean | null; type: string; count: number }>`SELECT project_id, is_demo, type, count FROM sovitech.admin_guardrail_counts()`,
  );
  const projects: AdminGuardrailCountRow[] = [];
  const totals: { type: GuardrailEventType; count: number }[] = [];
  for (const row of rows) {
    if (!EVENT_TYPES.has(row.type)) throw new Error('the store returned an event type section 8 does not list');
    const type = row.type as GuardrailEventType;
    if (row.project_id === null) totals.push({ type, count: row.count });
    else if (row.is_demo === null) throw new Error('the store returned a project count without the project\'s demo flag');
    else projects.push({ projectId: row.project_id, isDemo: row.is_demo, type, count: row.count });
  }
  return { projects, totals };
}

/** UD-41: every decision on an inference, oldest first, for rule 3's counts per tier and item type (ADR 0054). */
export async function readAdminCalibrationDecisions(request: Pick<Request, 'trx'>): Promise<readonly AdminCalibrationDecisionRow[]> {
  const rows = await rowsOf(
    request,
    sql<{ tier: string; field_key: string; outcome: string; by_role: string; at: string }>`SELECT tier, field_key, outcome, by_role, at FROM sovitech.admin_calibration_decisions()`,
  );
  return rows.map((row) => {
    if (!TIERS.has(row.tier) || (row.outcome !== 'agreed' && row.outcome !== 'corrected') || (row.by_role !== 'owner' && row.by_role !== 'sovitech_engineer')) {
      throw new Error('the store returned a decision outside rule 3\'s shape');
    }
    return { tier: row.tier as AdminCalibrationDecisionRow['tier'], fieldKey: row.field_key, outcome: row.outcome, by: row.by_role, at: row.at };
  });
}

/** UD-41: the owner's confirmations and corrections of inferences per project (every project), for the owner correction rate. */
export async function readAdminInferenceDecisions(request: Pick<Request, 'trx'>): Promise<readonly AdminInferenceDecisionCounts[]> {
  const rows = await rowsOf(
    request,
    sql<{ project_id: string; confirmations: number; corrections: number }>`SELECT project_id, confirmations, corrections FROM sovitech.admin_inference_decisions()`,
  );
  return rows.map((row) => ({ projectId: row.project_id, confirmations: row.confirmations, corrections: row.corrections }));
}

/** UD-41: every erasure job, newest first. An erased event without its audit record (which 0008 writes with it) is an error, never a count of none. */
export async function readAdminErasures(request: Pick<Request, 'trx'>): Promise<readonly AdminErasureRow[]> {
  const rows = await rowsOf(
    request,
    sql<{
      document_event_id: string;
      project_id: string;
      is_demo: boolean;
      document_id: string;
      role: string;
      by_user_id: string | null;
      at: string;
      excerpts_erased: number | null;
      text_parts_deleted: number | null;
      candidates_withdrawn: number | null;
    }>`SELECT document_event_id, project_id, is_demo, document_id, role, by_user_id, at, excerpts_erased, text_parts_deleted, candidates_withdrawn FROM sovitech.admin_erasures()`,
  );
  return rows.map((row) => {
    if (row.role !== 'owner' && row.role !== 'system') throw new Error('the store returned an erasure by a role 2.3 does not allow');
    if (row.excerpts_erased === null || row.text_parts_deleted === null || row.candidates_withdrawn === null) {
      throw new Error('an erased document event has no erasure audit record');
    }
    return {
      documentEventId: row.document_event_id,
      projectId: row.project_id,
      isDemo: row.is_demo,
      documentId: row.document_id,
      role: row.role,
      byUserId: row.by_user_id,
      at: row.at,
      excerptsErased: row.excerpts_erased,
      textPartsDeleted: row.text_parts_deleted,
      candidatesWithdrawn: row.candidates_withdrawn,
    };
  });
}
