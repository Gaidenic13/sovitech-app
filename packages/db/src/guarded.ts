/**
 * Calls to the store's guarded functions (migrations 0006 and 0008). Each check
 * lives in the database, so no caller can skip it: this module only names the
 * call and turns a refusal into a StoreRefusal.
 *
 * - verifyCandidate: the one writer of engineer_verified (rule 10). The review
 *   endpoint (phase 7) is its caller.
 * - eraseDocument: the one audited erasure (rule 13). The erasure job (phase 2)
 *   removes the files around it.
 * - The account, role and project functions: every grant is audited.
 */
import { sql, type Kysely, type Transaction } from 'kysely';
import type { AppRole, CandidateEvent } from '@sovitech/domain';
import { refusing } from './errors';
import { newId } from './ids';
import type { Request } from './request';
import type { AccountKind, Database } from './schema';

type Executor = Kysely<Database> | Transaction<Database>;

function executorOf(target: Request | Executor): Executor {
  return 'trx' in target ? target.trx : target;
}

/** Records that the requesting engineer opened a candidate with its evidence (rule 10; PRD D-55). */
export async function openReviewItem(
  request: Request,
  input: { readonly candidateId: string; readonly openId?: string },
): Promise<{ readonly openId: string; readonly openedAt: string }> {
  const openId = input.openId ?? newId();
  const result = await refusing(() =>
    sql<{ opened_at: string }>`SELECT sovitech.open_review_item(${openId}, ${input.candidateId}) AS opened_at`.execute(request.trx),
  );
  const [row] = result.rows;
  if (row === undefined) throw new Error('sovitech.open_review_item returned no row');
  return { openId, openedAt: row.opened_at };
}

/**
 * Writes engineer_verified on one candidate, through the database's one guarded
 * function. The store refuses unless the request's user is a person holding
 * sovitech_engineer who opened this candidate, in a project that is not a demo.
 */
export async function verifyCandidate(
  request: Request,
  input: { readonly candidateId: string; readonly reason?: string; readonly eventId?: string },
): Promise<CandidateEvent> {
  const eventId = input.eventId ?? newId();
  const result = await refusing(() =>
    sql<{ at: string }>`SELECT sovitech.verify_candidate(${eventId}, ${input.candidateId}, ${input.reason ?? null}) AS at`.execute(
      request.trx,
    ),
  );
  const [row] = result.rows;
  if (row === undefined) throw new Error('sovitech.verify_candidate returned no row');
  return {
    candidateId: input.candidateId,
    type: 'engineer_verified',
    by: request.userId,
    role: 'sovitech_engineer',
    at: row.at,
    ...(input.reason === undefined ? {} : { reason: input.reason }),
  };
}

/** What one erasure did, as recorded in its audit event. Ids and counts only. */
export interface ErasureReport {
  readonly auditEventId: string;
  readonly documentEventId: string;
  readonly role: 'owner' | 'system';
  readonly excerptsErased: number;
  readonly textPartsDeleted: number;
  readonly textKeptForAnotherDocument: boolean;
  readonly candidatesWithdrawn: number;
}

function countOf(details: Record<string, unknown>, key: string): number {
  const value = details[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error(`the erasure record has no count ${key}`);
  return value;
}

/**
 * Erases one document's stored text and evidence (rule 13, "Erasure"): the one
 * path that alters stored evidence, and it never changes a value. The erased
 * event names the owner who asked or the system (2.3).
 */
export async function eraseDocument(
  request: Request,
  input: {
    readonly documentId: string;
    readonly role: 'owner' | 'system';
    readonly reason?: string;
    readonly auditEventId?: string;
    readonly documentEventId?: string;
  },
): Promise<ErasureReport> {
  const auditEventId = input.auditEventId ?? newId();
  const documentEventId = input.documentEventId ?? newId();
  const result = await refusing(() =>
    sql<{ details: Record<string, unknown> }>`SELECT sovitech.erase_document(${auditEventId}, ${documentEventId}, ${input.documentId}, ${input.role}, ${input.reason ?? null}) AS details`.execute(
      request.trx,
    ),
  );
  const [row] = result.rows;
  if (row === undefined) throw new Error('sovitech.erase_document returned no row');
  return {
    auditEventId,
    documentEventId,
    role: input.role,
    excerptsErased: countOf(row.details, 'excerpts_erased'),
    textPartsDeleted: countOf(row.details, 'text_parts_deleted'),
    textKeptForAnotherDocument: row.details['text_kept_for_another_document'] === true,
    candidatesWithdrawn: countOf(row.details, 'candidates_withdrawn'),
  };
}

/**
 * Creates a project with its project subject, and makes the requesting user a
 * member (audited). Rule 10, "Demo data": the demo seed account creates only
 * demo projects and nobody else creates one; the store refuses any other flag
 * (`demo_flag_follows_the_account`).
 */
export async function createProject(
  request: Request,
  input: { readonly isDemo: boolean; readonly projectId?: string; readonly auditEventId?: string },
): Promise<string> {
  const projectId = input.projectId ?? newId();
  await refusing(() =>
    sql`SELECT sovitech.create_project(${projectId}, ${input.auditEventId ?? newId()}, ${input.isDemo})`.execute(request.trx),
  );
  return projectId;
}

/**
 * Adds a member to a project (audited): by an existing member of it, in an app
 * request, or on the operator's login. Nobody adds themself
 * (`self_administration`): holding sovitech_admin alone gives no access to a
 * project's documents and values (ADR 0013).
 */
export async function addProjectMember(
  target: Request | Executor,
  input: { readonly projectId: string; readonly userId: string; readonly auditEventId?: string },
): Promise<void> {
  await refusing(() =>
    sql`SELECT sovitech.add_project_member(${input.projectId}, ${input.userId}, ${input.auditEventId ?? newId()})`.execute(
      executorOf(target),
    ),
  );
}

/**
 * Makes the requests of one project that may add a member wait for each other until each one's
 * transaction ends (a transaction-level advisory lock keyed by the project). Two uploads completing
 * at once in a new project both read the extraction service account as no member, and the second
 * `add_project_member` then failed on the members' key (phase 3 integration; the e2e flow (b)).
 * Under READ COMMITTED, the member read that follows the lock sees the other request's committed
 * member. It writes nothing and reads no row.
 */
export async function lockProjectMembership(request: Request): Promise<void> {
  if (request.projectId === null) throw new Error('lockProjectMembership needs a request scoped to a project');
  await sql`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${`sovitech.project_members:${request.projectId}`}, 0))`.execute(request.trx);
}

/**
 * Creates an account (audited). Allowed on the operator's login, or in an app
 * request by a person holding sovitech_admin.
 */
export async function createAppUser(
  executor: Executor,
  input: { readonly displayName: string; readonly kind: AccountKind; readonly reason: string; readonly userId?: string },
): Promise<string> {
  const userId = input.userId ?? newId();
  await refusing(() =>
    sql`SELECT sovitech.create_app_user(${userId}, ${newId()}, ${input.displayName}, ${input.kind}, ${input.reason})`.execute(executor),
  );
  return userId;
}

/**
 * Grants an app role (an audited event). Holding sovitech_admin never permits
 * verification: nobody grants their own role (`self_administration`), and
 * sovitech_engineer and sovitech_commercial_reviewer are granted on the
 * operator's login only until PRD D-13 decides who grants them
 * (`role_granted_on_the_operator_login_only`).
 */
export async function grantAppRole(
  executor: Executor,
  input: { readonly userId: string; readonly role: AppRole; readonly reason: string },
): Promise<string> {
  const eventId = newId();
  await refusing(() =>
    sql`SELECT sovitech.grant_app_role(${eventId}, ${newId()}, ${input.userId}, ${input.role}, ${input.reason})`.execute(executor),
  );
  return eventId;
}

/** Revokes an app role (an audited event). Nobody revokes their own (`self_administration`). */
export async function revokeAppRole(
  executor: Executor,
  input: { readonly userId: string; readonly role: AppRole; readonly reason: string },
): Promise<string> {
  const eventId = newId();
  await refusing(() =>
    sql`SELECT sovitech.revoke_app_role(${eventId}, ${newId()}, ${input.userId}, ${input.role}, ${input.reason})`.execute(executor),
  );
  return eventId;
}
