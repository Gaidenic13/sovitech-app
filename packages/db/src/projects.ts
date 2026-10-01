/**
 * The project list and a project's subjects (phase 3: UD-37, the wizard's step views; PRD
 * R-136; guardrails rule 13, "Project boundary"). Reads only: nothing here writes.
 *
 * - readUserProjects: the projects the request's own user is a member of, through the one
 *   function that may answer it across projects (migration 0014, `request_user_projects()`,
 *   owned by sovitech_db_access). It needs no project in scope; each project's values are then
 *   read in a request scoped to that project, under row-level security as ever.
 * - readProjectSubjects: the subjects of the project in scope, by kind, oldest first, so the
 *   step views find the building subject without creating one on a read (ensureBuildingSubject
 *   creates it on a write).
 */
import { sql } from 'kysely';
import type { SubjectKind } from '@sovitech/domain';
import { refusing } from './errors';
import { projectOf, type Request } from './request';

/** One project of the request's user, as the list shows it: no value of it, only its id, demo flag and creation time. */
export interface UserProject {
  readonly projectId: string;
  readonly isDemo: boolean;
  readonly createdAt: string;
}

/** The projects the request's own user is a member of, oldest first. */
export async function readUserProjects(request: Pick<Request, 'trx'>): Promise<UserProject[]> {
  const result = await refusing(() =>
    sql<{ project_id: string; is_demo: boolean; created_at: string }>`SELECT project_id, is_demo, created_at FROM sovitech.request_user_projects()`.execute(
      request.trx,
    ),
  );
  return result.rows.map((row) => ({ projectId: row.project_id, isDemo: row.is_demo, createdAt: row.created_at }));
}

/** A subject of the project in scope. */
export interface ProjectSubject {
  readonly id: string;
  readonly kind: SubjectKind;
  readonly createdAt: string;
}

/** The subjects of the project in scope, oldest first (the first building is the project's building, as ensureBuildingSubject reads it). */
export async function readProjectSubjects(request: Request): Promise<ProjectSubject[]> {
  projectOf(request);
  const rows = await request.trx.selectFrom('subjects').select(['id', 'kind', 'created_at']).orderBy('created_at').orderBy('id').execute();
  return rows.map((row) => ({ id: row.id, kind: row.kind, createdAt: row.created_at }));
}
