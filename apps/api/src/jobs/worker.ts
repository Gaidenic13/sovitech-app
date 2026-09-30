/**
 * The analysis worker (prompt 3 section 10, phase 2: "A job queue for analysis";
 * section 8; F-INGEST-04; docs/adr/0026-analysis-queue-and-upload-sessions.md).
 *
 * One step: claim the oldest ready job, run the reader of its format on the stored file in
 * its sandbox (the IFC reader for a model, the Python extractor for the rest;
 * ./sandbox.ts), read its output through the contract, and store what it holds in the
 * extraction service account's request (./../ingestion/extraction.ts). A job ends done;
 * or, when the sandbox fails, it is retried and, on its last attempt, the file reads
 * "Analysis failed" (rule 12); an output that breaks the contract or does not answer the
 * request stores nothing and the file reads "Analysis failed". Every error is a code
 * (rule 13): nothing the extractor printed, and no message of an error, is logged.
 *
 * The job's folder lives under the document's project id and content hash, owner-only, and is
 * removed when the step ends, whatever happened. The container never writes it: the runner
 * copies the output file out of the container's own output volume into it (./sandbox.ts), and
 * the worker reads it without following a link or waiting on a FIFO (./read-output.ts), whole
 * and checked before anything is stored (./output-file.ts): the output within its bound, and,
 * only for a job that asked for IFC values, the per-line IFC section, handed line by line to the
 * contract, never read while `ifc-values` is closed (ADR 0034).
 *
 * An IFC model's job runs only where models are read, which the live app does not do until the
 * owner decides D-01 (PRD R-023, R-024 "Until decided"; ../documents/model-reading.ts): a model's
 * job that reaches this worker anyway ends with the code `model_reading_not_decided`, reads
 * nothing, and leaves the model's G12-1 line as it is.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  claimAnalysisJob,
  failAnalysisJob,
  finishAnalysisJob,
  projectVisible,
  readDocumentFiles,
  recordDocumentAnalysis,
  StoreRefusal,
  withRequest,
  type AnalysisJob,
  type StoredFormat,
} from '@sovitech/db';
import type { DocumentRecord } from '@sovitech/domain';
import type { GateSource } from '@sovitech/registry/gates';
import { formatCoverage } from '../documents/coverage';
import { routingOf } from '../documents/formats';
import { readsModels, type ModelReadingSwitch } from '../documents/model-reading';
import { projectDocuments } from '../documents/service';
import { extractionRequestFor, storeExtractionOutput, type IdsReference } from '../ingestion/extraction';
import type { ApiServices } from '../services';
import { readJobOutput } from './output-file';
import { readerFor, type ExtractorRunner } from './sandbox';

export interface WorkerOptions {
  /** This worker's name in the queue: lower case letters, digits and hyphens. */
  readonly workerId: string;
  /** The extraction service account, a member of every project it works on. */
  readonly serviceId: string;
  readonly gates: GateSource;
  /** The draft IDS v0.1 file and its reference, for IFC models; absent, no IDS check is asked for. */
  readonly ids?: IdsReference & { readonly path: string };
  /** How many times a job runs before its file reads "Analysis failed". */
  readonly maxAttempts: number;
  readonly retryAfterSeconds: number;
  /** A running job whose lock is older than this is claimed again: longer than the sandbox's wall clock. */
  readonly staleAfterSeconds: number;
  /** A step after the output is stored, for a PDF or XLSX file: the AI's extraction, when a key is configured. */
  readonly afterStored?: (job: AnalysisJob) => Promise<void>;
  /** Tests only (../documents/model-reading.ts): the switch that lets this worker run a model's job. */
  readonly modelReading?: ModelReadingSwitch;
}

/** Sandbox failures that a second run cannot mend: the job ends at once. */
const NOT_RETRIED: ReadonlySet<string> = new Set(['sandbox_output_refused']);

export type WorkerStep =
  | { readonly kind: 'idle' }
  | { readonly kind: 'done'; readonly job: AnalysisJob }
  | { readonly kind: 'retry' | 'failed'; readonly job: AnalysisJob; readonly code: string };

type Services = Pick<ApiServices, 'store' | 'files' | 'log'>;

/** The document of a job, while the service account may read it and it is not erased. */
async function documentOf(
  services: Services,
  options: WorkerOptions,
  job: AnalysisJob,
): Promise<{ readonly document: DocumentRecord; readonly format: StoredFormat } | undefined> {
  return withRequest(services.store, { userId: options.serviceId, projectId: job.projectId }, async (request) => {
    if (!(await projectVisible(request))) return undefined;
    const { documents, statuses } = await projectDocuments(request);
    const document = documents.find((candidate) => candidate.id === job.documentId);
    const file = (await readDocumentFiles(request)).find((candidate) => candidate.documentId === job.documentId);
    if (document === undefined || file === undefined || document.contentHash !== job.contentHash) return undefined;
    const status = statuses.status(document.id);
    if (status === 'erased' || status === 'withdrawn') return undefined;
    if (file.format !== 'other' && routingOf(file.format).kind === 'analyse' && document.analysis.status === 'queued') {
      await recordDocumentAnalysis(request, { documentId: document.id, status: 'analysing', coverage: formatCoverage({ kind: 'pending' }), actor: options.serviceId });
    }
    return { document, format: file.format };
  });
}

/** Records "Analysis failed" for a file the extractor analyses; a model keeps its G12-1 line (G12-5). */
async function recordFailed(services: Services, options: WorkerOptions, job: AnalysisJob, analysed: boolean): Promise<void> {
  if (!analysed) return;
  await withRequest(services.store, { userId: options.serviceId, projectId: job.projectId }, (request) =>
    recordDocumentAnalysis(request, { documentId: job.documentId, status: 'failed', coverage: formatCoverage({ kind: 'none' }), actor: options.serviceId }),
  );
}

export class AnalysisWorker {
  constructor(
    private readonly services: Services,
    private readonly runner: ExtractorRunner,
    private readonly options: WorkerOptions,
  ) {}

  /** Claims and runs one job, if one is ready. */
  async runOnce(): Promise<WorkerStep> {
    const { services, options } = this;
    const job = await claimAnalysisJob(services.store.db, { workerId: options.workerId, staleAfterSeconds: options.staleAfterSeconds });
    if (job === undefined) return { kind: 'idle' };
    const workDirectory = services.files.workDirectory(job.projectId, job.contentHash, job.id);
    let analysed = false;
    const fail = async (code: string, retry: boolean): Promise<WorkerStep> => {
      const again = retry && job.attempts < options.maxAttempts;
      if (!again) await recordFailed(services, options, job, analysed).catch(() => undefined);
      const state = await failAnalysisJob(services.store.db, { jobId: job.id, workerId: options.workerId, errorCode: code, retry: again, retryAfterSeconds: options.retryAfterSeconds });
      services.log({ event: 'analysis_job_ended', code, projectId: job.projectId, documentId: job.documentId, jobId: job.id });
      return { kind: state === 'queued' ? 'retry' : 'failed', job, code };
    };
    try {
      const found = await documentOf(services, options, job);
      if (found === undefined) return await fail('document_unavailable', false);
      const format = found.format === 'other' ? undefined : found.format;
      if (format === undefined) return await fail('format_unknown', false);
      // Until D-01 is decided, no model is read (PRD R-023, R-024): nothing runs, and the model's line stays.
      if (format === 'ifc' && !readsModels(options)) return await fail('model_reading_not_decided', false);
      analysed = routingOf(format).kind === 'analyse';

      const request = extractionRequestFor(job, format, options.gates, options.ids);
      const requestPath = join(workDirectory, 'request.json');
      const outputDirectory = join(workDirectory, 'output');
      // Owner-only: the container never writes here (its output is copied out of its own volume).
      await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
      await writeFile(requestPath, JSON.stringify(request), { encoding: 'utf8', mode: 0o600 });

      const ran = await this.runner.run({
        jobId: job.id,
        // An IFC model goes to the IFC reader (web-ifc), every other file to the Python extractor.
        reader: readerFor(format),
        inputPath: services.files.originalPath(job.projectId, job.contentHash),
        requestPath,
        outputDirectory,
        // The output volume and the copy's bound follow what was asked: the per-line IFC section only with IFC values (ADR 0034).
        ifcValues: request.ifcValues,
        ...(request.ids !== undefined && options.ids !== undefined ? { idsPath: options.ids.path } : {}),
      });
      if (ran.outcome === 'failed') return await fail(ran.code, !NOT_RETRIED.has(ran.code));

      // Read and checked whole before anything is stored: a refused line refuses the output.
      const checked = await readJobOutput(join(outputDirectory, 'output.json'), request, options.gates);
      if (!checked.ok) {
        if (checked.problems.length > 0) {
          services.log({ event: 'extractor_output_refused', code: checked.code, jobId: job.id, codes: checked.problems.slice(0, 64).map((problem) => `${problem.code}@${problem.path}`) });
        }
        return await fail(checked.code, false);
      }
      await withRequest(services.store, { userId: options.serviceId, projectId: job.projectId }, (store) =>
        storeExtractionOutput(store, { document: found.document, output: checked.output, serviceId: options.serviceId, gates: options.gates }),
      );
      if (analysed && options.afterStored !== undefined) await options.afterStored(job);
      await finishAnalysisJob(services.store.db, { jobId: job.id, workerId: options.workerId });
      services.log({ event: 'analysis_job_ended', code: 'done', projectId: job.projectId, documentId: job.documentId, jobId: job.id });
      return { kind: 'done', job };
    } catch (error) {
      if (error instanceof StoreRefusal) return await fail(error.refusal === 'document_erased' ? 'document_erased' : 'store_refused', error.refusal !== 'document_erased');
      return await fail('internal_error', true);
    } finally {
      // A folder that will not go is logged by code; the step's own end stands, and the erasure checks again.
      await rm(workDirectory, { recursive: true, force: true }).catch(() => {
        services.log({ event: 'analysis_job_folder_left', code: 'work_folder_left', projectId: job.projectId, documentId: job.documentId, jobId: job.id });
      });
    }
  }

  /** Runs steps until the queue is empty (for tests and one-shot runs). */
  async drain(limit = 100): Promise<WorkerStep[]> {
    const steps: WorkerStep[] = [];
    for (let step = 0; step < limit; step += 1) {
      const result = await this.runOnce();
      if (result.kind === 'idle') break;
      steps.push(result);
    }
    return steps;
  }
}
