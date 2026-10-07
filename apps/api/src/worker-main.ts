/**
 * `pnpm --filter @sovitech/api worker`: the analysis worker for local development
 * (docs/adr/0026-analysis-queue-and-upload-sessions.md). It claims queued jobs, runs the
 * reader of each file in its sandbox (docs/adr/0018: the Python extractor for PDF and XLSX;
 * docs/adr/0031: the IFC reader on web-ifc for models), stores what it produced, and, with
 * an API key configured, runs the AI's extraction of PDF and XLSX documents through the
 * one ingestion path. It also removes abandoned uploads. Every log line is codes and ids.
 *
 * The viewer step (owner decision D-03, 2026-10-05, display only): the same loop runs the
 * conversions of stored IFC models for viewing (./jobs/model-view/worker.ts), one step of
 * each queue in turn, so no two 4 GB sandboxes run at once. At start it queues the
 * conversions current models still need (./jobs/model-view/backfill.ts), and reads the hash
 * of the converter's sources the image's label must match (`stale_image` otherwise).
 *
 * Like the API, it refuses to start while any gate fails the loosening check (prompt 3 5.4).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  KEY_NOT_SET,
  createAnthropicTransport,
  loadFixtureManifest,
  loadSystemPrompt,
  readApiKey,
  sha256Hex,
  type BoundaryDeps,
} from '@sovitech/ai';
import { openStore } from '@sovitech/db';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { REPOSITORY_ROOT, extractorImage, ifcReaderImage, databaseUrl, modelConverterImage, readSettings } from './config';
import { extractWithAi } from './ingestion/ai-extraction';
import { AnalysisWorker } from './jobs/worker';
import { queueMissingConversions } from './jobs/model-view/backfill';
import { converterSourceHash, inspectConverterImage } from './jobs/model-view/image';
import { CONVERSION_LIMITS, DockerModelConverter } from './jobs/model-view/sandbox';
import { ModelViewWorker } from './jobs/model-view/worker';
import { regenerateAfterAnalysis } from './proposal/service';
import { PRODUCTION_API_REGISTRY } from './wizard/registry';
import { DockerExtractorRunner } from './jobs/sandbox';
import { stderrApiLog } from './services';
import { dataDirectoryFromEnvironment } from './storage/data-dir';
import { FileStore } from './storage/file-store';
import { ABANDONED_UPLOAD_SECONDS, sweepAbandonedUploads } from './uploads/service';

const gates = assertGatesStartupSafe();
const settings = readSettings();
const url = databaseUrl(settings, 'sovitech_db_app');
const serviceId = settings.SOVITECH_EXTRACTION_ACCOUNT_ID;
if (url === undefined || serviceId === undefined) {
  throw new Error('The worker needs the local database settings and SOVITECH_EXTRACTION_ACCOUNT_ID (see .env.example).');
}
const store = openStore(url);
const files = new FileStore(
  dataDirectoryFromEnvironment(REPOSITORY_ROOT, { ...process.env, ...(settings.SOVITECH_DATA_DIR === undefined ? {} : { SOVITECH_DATA_DIR: settings.SOVITECH_DATA_DIR }) }),
);

/**
 * The draft IDS v0.1, when the fixture is present (prompt 3 5.2: the IDS check, engineer's view
 * only). The IFC reader checks the mounted file's hash and runs no check: the IDS model check
 * waits (owner decision 2026-09-26, D-36), so no IDS result arises.
 */
const idsPath = join(REPOSITORY_ROOT, 'fixtures', 'ids', 'sovitech-ifc-minimum-v0.1.ids');
const ids = existsSync(idsPath)
  ? { id: 'sovitech-ifc-minimum', version: '0.1', draft: true, sha256: `sha256:${createHash('sha256').update(readFileSync(idsPath)).digest('hex')}`, path: idsPath }
  : undefined;

/** The AI boundary, with a key; without one the AI step reports "not running" (the owner's answer, 2026-09-25). */
function boundary(): BoundaryDeps | { readonly notRunning: string } {
  const key = readApiKey({ env: process.env, root: REPOSITORY_ROOT });
  if (!key.present) return { notRunning: KEY_NOT_SET };
  return {
    transport: createAnthropicTransport(key.key),
    gates,
    manifest: loadFixtureManifest(REPOSITORY_ROOT),
    systemPrompt: loadSystemPrompt(REPOSITORY_ROOT),
    root: REPOSITORY_ROOT,
    log: (record) => stderrApiLog({ event: record.event, codes: record.codes, projectId: record.projectId }),
  };
}
const ai = boundary();

const runner = new DockerExtractorRunner({ extractor: extractorImage(settings), ifcReader: ifcReaderImage(settings) });
const worker = new AnalysisWorker({ store, files, log: stderrApiLog }, runner, {
  workerId: `worker-${process.pid}`,
  serviceId,
  gates,
  ...(ids === undefined || sha256Hex(ids.sha256) === undefined ? {} : { ids }),
  maxAttempts: 3,
  retryAfterSeconds: 30,
  staleAfterSeconds: 900,
  afterStored: async (job) => {
    const step = await extractWithAi({ store, serviceId, projectId: job.projectId, documentId: job.documentId }, ai);
    stderrApiLog({ event: 'ai_extraction', code: step.outcome, projectId: job.projectId, documentId: job.documentId, ...('codes' in step ? { codes: step.codes } : {}) });
  },
  // Phase 5 (docs/adr/0048 decision 5): the stored proposal is generated again, as the system, once every document it
  // recorded as still being read has finished (rule 7). The production registry and catalogue; no drafting (no key).
  afterJobEnded: async (job) => {
    await regenerateAfterAnalysis({ store, registry: PRODUCTION_API_REGISTRY, extractionAccountId: serviceId, log: stderrApiLog }, gates, { projectId: job.projectId, systemAccountId: serviceId });
  },
});

/**
 * The conversions of stored IFC models for viewing (the viewer step): the model conversion image, checked against this
 * repository's converter sources before each conversion; a running conversion is claimed again only once its lock is
 * older than the sandbox's wall clock and the docker steps around it.
 */
const converterImage = modelConverterImage(settings);
const converter = new ModelViewWorker({ store, files, log: stderrApiLog }, new DockerModelConverter(), {
  workerId: `converter-${process.pid}`,
  serviceId,
  image: converterImage,
  sourceHash: await converterSourceHash(REPOSITORY_ROOT),
  inspect: (image) => inspectConverterImage(image),
  maxAttempts: 3,
  retryAfterSeconds: 60,
  staleAfterSeconds: CONVERSION_LIMITS.wallClockSeconds + 600,
});
try {
  const backfill = await queueMissingConversions({ store, log: stderrApiLog }, serviceId);
  stderrApiLog({ event: 'model_view_backfill', code: 'done', codes: [`projects:${String(backfill.projects)}`, `queued:${String(backfill.queued.length)}`, `failed:${String(backfill.failed.length)}`] });
} catch {
  stderrApiLog({ event: 'model_view_backfill', code: 'backfill_failed' });
}

/**
 * Abandoned uploads (no append or completion for ABANDONED_UPLOAD_SECONDS, and no lease held) go
 * with their staged bytes, sealed copy and file name: the same sweep the API process runs when an
 * upload is opened (ADR 0019, ADR 0028). A failure is logged as a code and never ends the loop.
 */
async function sweepUploads(): Promise<void> {
  try {
    await sweepAbandonedUploads({ store, files }, ABANDONED_UPLOAD_SECONDS);
  } catch {
    stderrApiLog({ event: 'upload_sweep_failed', code: 'sweep_failed' });
  }
}

let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});

let lastSweep = 0;
while (!stopping) {
  const step = await worker.runOnce();
  // One conversion between analysis steps: one sandbox at a time, and neither queue waits on the other's backlog.
  const conversion = stopping ? { kind: 'idle' as const } : await converter.runOnce().catch(() => {
    stderrApiLog({ event: 'model_view_job_ended', code: 'worker_error' });
    return { kind: 'idle' as const };
  });
  if (Date.now() - lastSweep > 10 * 60 * 1000) {
    await sweepUploads();
    lastSweep = Date.now();
  }
  if (step.kind === 'idle' && conversion.kind === 'idle') await new Promise((resolve) => setTimeout(resolve, 2000));
}
await store.close();
