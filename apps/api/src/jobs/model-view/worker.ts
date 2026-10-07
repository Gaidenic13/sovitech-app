/**
 * The conversion worker of stored IFC models shown as documents (the viewer step, part 1; the owner's decision of
 * 2026-10-05 on D-03, "1 b", for display only; PRD R-025; docs/build-log.md, "The viewer step", item 3; prompt 3
 * section 8).
 *
 * One step: claim the oldest ready conversion (sovitech_work.model_view_jobs, one per project and content hash), and,
 * in the conversion service account's own requests (the extraction account, a member of the project):
 * 1. Prepare, under the project's write lock: check that this worker still holds the job (the erasure ends a running
 *    one) and find an IFC document of the project, not erased, holding the bytes (neither: the job ends
 *    `document_unavailable`, recording nothing); check the sandbox image (its digest, and the source hash its label
 *    records against the repository's: a differing or missing label records `failed` with `stale_image`, an image the
 *    daemon does not hold is retried and then records `sandbox_unavailable`); make the job's owner-only folder under
 *    the project and content hash, clearing one an earlier run left; and record `started` with the converter and the
 *    image.
 * 2. Convert, outside any transaction: the sandbox runs the image just checked, by its digest, on the stored original,
 *    mounted read-only, and copies its three files into the job's folder (./sandbox.ts). A failure records `failed`
 *    with its code; a failure of the environment (`sandbox_unavailable`, `output_unavailable`, `internal_error`) is
 *    first retried after a pause while attempts are left.
 * 3. Check the files before anything is kept (./outputs.ts): the summary through the reviewed reader, the storey index
 *    byte by byte, the sizes against the summary (`output_refused` otherwise).
 * 4. Keep, under the project's write lock again: check the job is still held and find a document holding the bytes once
 *    more; when the erasure committed while the converter ran (it ended the job, and the bytes may since have been
 *    registered again, with a conversion of their own), keep nothing and record nothing. Otherwise move the view file and the
 *    storey index into the hash's `derived/` folder (never making the hash's folder again: FileStore.moveIntoDerived) and
 *    record `converted` with the sizes and times, in the same transaction. The erasure takes the same lock and removes
 *    `derived/` with the hash's folder, so a conversion ending after an erasure has committed stores nothing, and one
 *    ending before it is erased with it (rule 13; G13-4; ifc-input 6.2.16, the stricter choice).
 * The job's folder is removed whatever happened. One conversion at a time: the worker process alternates it with the
 * analysis job (../../worker-main.ts), so no two 4 GB sandboxes run together on the 8 GiB VM.
 *
 * Nothing is read from the model: no candidate, finding, field event, badge or Documents line comes from a conversion,
 * and the model stays "Not analysed" (R-022, R-025; G1-30, G12-5, G14-5). Every log line and every stored error is a
 * code with ids (rule 13; G13-13): nothing the converter printed, no file name, no message of an error.
 */
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  appendModelViewEvent,
  claimModelViewJob,
  failModelViewJob,
  finishModelViewJob,
  holdsModelViewJob,
  lockProjectWrites,
  projectVisible,
  StoreRefusal,
  withRequest,
  type ModelViewConverter,
  type ModelViewFailure,
  type ModelViewJob,
  type ModelViewMeasures,
  type Request,
} from '@sovitech/db';
import type { DocumentRecord } from '@sovitech/domain';
import { modelHolding, VIEW_FILES } from '../../documents/model-view';
import type { ApiServices } from '../../services';
import { FileStoreError } from '../../storage/file-store';
import { CONVERTER_NAME, type ConverterImage } from './image';
import { readConversionSummary, regularFileBytes, storeyIndexHoldsIdsOnly } from './outputs';
import { CONVERSION_FILES, type ModelConverterRunner } from './sandbox';

export interface ModelViewWorkerOptions {
  /** This worker's name in the queue: lower case letters, digits and hyphens. */
  readonly workerId: string;
  /** The conversion service account (the extraction account), a member of every project it converts for. */
  readonly serviceId: string;
  /** The sandbox image to run. */
  readonly image: string;
  /** The SHA-256 of the converter's sources in this repository (./image.ts, `converterSourceHash`). */
  readonly sourceHash: string;
  /** Reads the image's digest and source label from the daemon (./image.ts, `inspectConverterImage`); undefined: no such image. */
  readonly inspect: (image: string) => Promise<ConverterImage | undefined>;
  /**
   * How many times a conversion the environment stopped (`sandbox_unavailable`, `output_unavailable`, `internal_error`)
   * runs before it is recorded as failed.
   */
  readonly maxAttempts: number;
  readonly retryAfterSeconds: number;
  /** A running conversion whose lock is older than this is claimed again: longer than the sandbox's wall clock. */
  readonly staleAfterSeconds: number;
}

export type ModelViewStep =
  | { readonly kind: 'idle' }
  | { readonly kind: 'converted'; readonly job: ModelViewJob }
  | { readonly kind: 'retry' | 'failed' | 'ended'; readonly job: ModelViewJob; readonly code: string };

type Services = Pick<ApiServices, 'store' | 'files' | 'log'>;

/**
 * Failures a second run may mend (the daemon, the volume, the host's disk, an error of the job's own): the job is
 * queued again after `retryAfterSeconds` while attempts are left, and the last is recorded with its code, which the
 * worker's start queues again (../../documents/model-view.ts, RETRIED_AT_START).
 */
const RETRIED: ReadonlySet<ModelViewFailure> = new Set(['sandbox_unavailable', 'output_unavailable', 'internal_error']);

export class ModelViewWorker {
  constructor(
    private readonly services: Services,
    private readonly runner: ModelConverterRunner,
    private readonly options: ModelViewWorkerOptions,
  ) {}

  /** Runs `work` in the service account's request on the job's project, when the account may see it. */
  private inProject<T>(job: ModelViewJob, work: (request: Request) => Promise<T>): Promise<T | undefined> {
    return withRequest(this.services.store, { userId: this.options.serviceId, projectId: job.projectId }, async (request) => {
      if (!(await projectVisible(request))) return undefined;
      return work(request);
    });
  }

  /** Claims and runs one conversion, if one is ready. */
  async runOnce(): Promise<ModelViewStep> {
    const { services, options } = this;
    const job = await claimModelViewJob(services.store.db, { workerId: options.workerId, staleAfterSeconds: options.staleAfterSeconds });
    if (job === undefined) return { kind: 'idle' };
    const workDirectory = services.files.workDirectory(job.projectId, job.contentHash, job.id);
    const log = (code: string): void => {
      services.log({ event: 'model_view_job_ended', code, projectId: job.projectId, documentId: job.documentId, jobId: job.id });
    };
    /**
     * Under the project's write lock (which the erasure takes too): whether this worker still holds the job (the erasure
     * ends a running one) and which document of the project, not erased, holds its bytes. Neither: nothing is recorded
     * or kept for this run.
     */
    const holding = async (request: Request): Promise<DocumentRecord | undefined> => {
      await lockProjectWrites(request);
      if (!(await holdsModelViewJob(request.trx, { jobId: job.id, workerId: options.workerId }))) return undefined;
      return modelHolding(request, job.contentHash, job.documentId);
    };
    /** Ends the job with a code and no record (nothing left to record it for, or the erasure ended it). */
    const end = async (code: string): Promise<ModelViewStep> => {
      await failModelViewJob(services.store.db, { jobId: job.id, workerId: options.workerId, errorCode: code, retry: false, retryAfterSeconds: 0 });
      log(code);
      return { kind: 'ended', job, code };
    };
    let converter: ModelViewConverter | undefined;
    /**
     * A failure: queued again after its pause while a retry is left (RETRIED), with no record; otherwise recorded as
     * `failed` with its code, against the document that holds the bytes, and the job ended.
     */
    const fail = async (code: ModelViewFailure, measures: ModelViewMeasures = {}): Promise<ModelViewStep> => {
      const again = RETRIED.has(code) && job.attempts < options.maxAttempts;
      const outcome = await this.inProject(job, async (request) => {
        const model = await holding(request);
        if (model === undefined) return 'gone' as const;
        if (again) return 'again' as const;
        await appendModelViewEvent(request, {
          documentId: model.id,
          contentHash: job.contentHash,
          type: 'failed',
          code,
          jobId: job.id,
          ...(converter === undefined ? {} : { converter }),
          ...measures,
          createdBy: options.serviceId,
        });
        return 'recorded' as const;
      });
      if (outcome === undefined || outcome === 'gone') return end('document_unavailable');
      const state = await failModelViewJob(services.store.db, { jobId: job.id, workerId: options.workerId, errorCode: code, retry: again, retryAfterSeconds: options.retryAfterSeconds });
      log(code);
      return { kind: state === 'queued' ? 'retry' : 'failed', job, code };
    };

    try {
      // 1. The image, then the document, the job's folder and `started`, under the project's write lock.
      const image = await options.inspect(options.image);
      if (image === undefined) return await fail('sandbox_unavailable');
      if (image.sourceHash !== options.sourceHash) return await fail('stale_image');
      const checked: ModelViewConverter = { name: CONVERTER_NAME, version: image.sourceHash, imageDigest: image.digest };
      converter = checked;
      const prepared = await this.inProject(job, async (request) => {
        const model = await holding(request);
        if (model === undefined) return undefined;
        // Owner-only, under the bytes' own folder, which exists while a document holds them; the container never writes
        // here. A folder an earlier run of this job left (its worker stopped part-way) goes first: the copy-out never
        // writes over a file (the review of part 1, A-4).
        await rm(workDirectory, { recursive: true, force: true });
        await mkdir(join(workDirectory, 'output'), { recursive: true, mode: 0o700 });
        await appendModelViewEvent(request, { documentId: model.id, contentHash: job.contentHash, type: 'started', jobId: job.id, converter: checked, createdBy: options.serviceId });
        return model;
      });
      if (prepared === undefined) return await end('document_unavailable');

      // 2. The conversion, in its sandbox, outside any transaction: the image just checked, by its digest (A-7).
      const outputDirectory = join(workDirectory, 'output');
      const ran = await this.runner.run({ jobId: job.id, inputPath: services.files.originalPath(job.projectId, job.contentHash), outputDirectory }, image.digest);
      if (ran.outcome === 'failed') return await fail(ran.code, { wallMs: ran.wallMs });

      // 3. The files, checked whole before anything is kept.
      const paths = {
        fragments: join(outputDirectory, CONVERSION_FILES.fragments.name),
        storeys: join(outputDirectory, CONVERSION_FILES.storeys.name),
        summary: join(outputDirectory, CONVERSION_FILES.summary.name),
      };
      const summary = await readConversionSummary(paths.summary);
      const viewBytes = await regularFileBytes(paths.fragments);
      const indexBytes = await regularFileBytes(paths.storeys);
      if (
        summary === undefined ||
        viewBytes === undefined ||
        indexBytes === undefined ||
        viewBytes !== summary.fragmentsBytes ||
        indexBytes !== summary.indexBytes ||
        viewBytes === 0 ||
        !(await storeyIndexHoldsIdsOnly(paths.storeys))
      ) {
        return await fail('output_refused', { wallMs: ran.wallMs });
      }
      const measures: ModelViewMeasures = {
        inputBytes: summary.inputBytes,
        viewBytes,
        indexBytes,
        peakRssKib: summary.maxRssKiB,
        importMs: summary.importMs,
        derivativeMs: summary.metadataMs,
        indexMs: summary.indexMs,
        wallMs: ran.wallMs,
      };

      // 4. Kept under the project's write lock, only while this worker holds the job and a document holds the bytes.
      const kept = await this.inProject(job, async (request) => {
        const model = await holding(request);
        if (model === undefined) return false;
        await appendModelViewEvent(request, { documentId: model.id, contentHash: job.contentHash, type: 'converted', jobId: job.id, converter: checked, ...measures, createdBy: options.serviceId });
        await services.files.moveIntoDerived(job.projectId, job.contentHash, VIEW_FILES.fragments, paths.fragments);
        await services.files.moveIntoDerived(job.projectId, job.contentHash, VIEW_FILES.storeys, paths.storeys);
        return true;
      });
      if (kept !== true) return await end('document_unavailable');
      await finishModelViewJob(services.store.db, { jobId: job.id, workerId: options.workerId });
      log('converted');
      return { kind: 'converted', job };
    } catch (error) {
      if (error instanceof StoreRefusal && error.refusal === 'document_erased') return await end('document_unavailable');
      // The view files could not be moved into `derived/` (a folder or file not there), or the job failed in a way it
      // does not name (the host's disk, the store): the environment's, not the model's. Retried after its pause while
      // attempts are left, then recorded (the review of part 1, V-2, A-5 and A-6). Nothing of the error is logged.
      const code: ModelViewFailure = error instanceof FileStoreError && error.code === 'missing' ? 'output_unavailable' : 'internal_error';
      try {
        return await fail(code);
      } catch {
        // The store itself failed: the job is ended or requeued if the queue answers, and otherwise claimed again once
        // its lock is stale; the worker's start queues a record left "being prepared" (conversionWanted).
        const state = await failModelViewJob(services.store.db, {
          jobId: job.id,
          workerId: options.workerId,
          errorCode: code,
          retry: job.attempts < options.maxAttempts,
          retryAfterSeconds: options.retryAfterSeconds,
        }).catch(() => undefined);
        log(code);
        return { kind: state === 'queued' ? 'retry' : 'failed', job, code };
      }
    } finally {
      // A folder that will not go is logged by code; the erasure checks again.
      await rm(workDirectory, { recursive: true, force: true }).catch(() => {
        services.log({ event: 'model_view_job_folder_left', code: 'work_folder_left', projectId: job.projectId, documentId: job.documentId, jobId: job.id });
      });
    }
  }

  /** Runs steps until the queue is empty (for tests, the demo seed and one-shot runs). */
  async drain(limit = 100): Promise<ModelViewStep[]> {
    const steps: ModelViewStep[] = [];
    for (let step = 0; step < limit; step += 1) {
      const result = await this.runOnce();
      if (result.kind === 'idle') break;
      steps.push(result);
    }
    return steps;
  }
}
