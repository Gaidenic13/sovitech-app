/**
 * The conversion backfill at worker start (the viewer step, part 1; docs/build-log.md, "The viewer step", item 3: "When
 * the worker starts, each stored, current IFC document with no conversion record is queued once").
 *
 * For every project the conversion service account is a member of (it reads them through the store's own list,
 * `request_user_projects`, migration 0014), in that account's own request: each current IFC model (stored, not
 * withdrawn, erased or superseded) whose bytes have no conversion record is queued, with its `queued` record; and so is
 * one whose conversion failed for a reason of the environment (`stale_image`, `sandbox_unavailable`: the image rebuilt,
 * the daemon back), never one that failed on the model itself (../../documents/model-view.ts, `conversionWanted`). A
 * second start queues nothing more: the open job, or the record, is there.
 *
 * Not reached: a project the service account is not a member of. The account becomes a member with the project's first
 * upload that is analysed or, since the viewer step, any IFC model; a project whose models were all stored before the
 * viewer step, with no analysed file, gets its conversions when its next IFC model is uploaded (the owner adds no member
 * here, and the account cannot add itself: SVR03). Logs carry codes and ids only (rule 13).
 */
import { projectVisible, readUserProjects, withRequest } from '@sovitech/db';
import { currentModels, queueConversion } from '../../documents/model-view';
import type { ApiServices } from '../../services';

export interface BackfillReport {
  /** The projects looked at. */
  readonly projects: number;
  /** The conversions queued, by job id. */
  readonly queued: readonly string[];
  /** The projects whose backfill failed (logged by code), by id. */
  readonly failed: readonly string[];
}

/** Queues the conversions every current IFC model the service account can see still needs. */
export async function queueMissingConversions(services: Pick<ApiServices, 'store' | 'log'>, serviceId: string): Promise<BackfillReport> {
  const projects = await withRequest(services.store, { userId: serviceId }, (request) => readUserProjects(request));
  const queued: string[] = [];
  const failed: string[] = [];
  for (const { projectId } of projects) {
    try {
      const jobs = await withRequest(services.store, { userId: serviceId, projectId }, async (request) => {
        if (!(await projectVisible(request))) return [];
        const added: string[] = [];
        for (const model of await currentModels(request)) {
          const job = await queueConversion(request, { documentId: model.id, contentHash: model.contentHash, createdBy: serviceId });
          if (job !== undefined) added.push(job);
        }
        return added;
      });
      queued.push(...jobs);
      if (jobs.length > 0) services.log({ event: 'model_view_backfill', code: 'queued', projectId, codes: [`conversions:${String(jobs.length)}`] });
    } catch {
      failed.push(projectId);
      services.log({ event: 'model_view_backfill', code: 'backfill_failed', projectId });
    }
  }
  return { projects: projects.length, queued, failed };
}
