/**
 * The request scope. Every read and write of project data runs inside one
 * transaction that names the authenticated user and the project in scope
 * (sovitech.user_id, sovitech.project_id, transaction-local). Row-level security
 * shows the request only that project's rows, and only when the user is a member
 * of it or holds a SOVITECH review role (migrations 0006 and 0007). The guarded
 * functions read the same two settings.
 */
import { sql, type Transaction } from 'kysely';
import type { Store } from './connection';
import { scrubbed } from './errors';
import type { Database } from './schema';

export interface RequestScope {
  /** The authenticated user (app_users.id), as the API's sign-in established it. */
  readonly userId: string;
  /** The project in scope; absent for requests that touch no project's rows. */
  readonly projectId?: string;
}

/** An open request: its transaction and scope. Write and read functions take one. */
export interface Request {
  readonly trx: Transaction<Database>;
  readonly userId: string;
  readonly projectId: string | null;
}

/**
 * Runs `work` in one transaction with the request's scope set; commits when
 * `work` resolves. A database error, from `work` or from the commit (the
 * deferred evidence checks run there), leaves as a StoreRefusal or a StoreError,
 * never with the database's DETAIL or input text (rule 13; errors.ts).
 */
export async function withRequest<T>(store: Store, scope: RequestScope, work: (request: Request) => Promise<T>): Promise<T> {
  try {
    return await store.db.transaction().execute(async (trx) => {
      await sql`SELECT pg_catalog.set_config('sovitech.user_id', ${scope.userId}, true), pg_catalog.set_config('sovitech.project_id', ${scope.projectId ?? ''}, true)`.execute(trx);
      return work({ trx, userId: scope.userId, projectId: scope.projectId ?? null });
    });
  } catch (error) {
    throw scrubbed(error);
  }
}

/** The project in scope, or an error for a write that needs one. */
export function projectOf(request: Request): string {
  if (request.projectId === null) throw new Error('this request has no project in scope');
  return request.projectId;
}
