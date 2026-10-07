/**
 * The conversion of stored IFC models for viewing, over a TEST API (the viewer step, part 1; for G1-30, G13-4, G13-13,
 * G14-5, G12-5 and the tests named after ifc-input 6.2.15 and 6.2.16 in tests/api/).
 *
 * - `ScriptedConverter` stands in for the conversion sandbox (a dependency handed in, not a test double of the code
 *   under test, as `ScriptedRunner` stands in for the extractor's): it writes the converter's three files into the
 *   job's folder as the sandbox's copy-out would (each a new file, never through a folder that is gone: that ends with
 *   `output_unavailable`, the host's side), or ends with a failure code, as the test scripts it; a script may act before
 *   or after the files are written (the owner deleting the model while it runs). Its files are TEST data: TEST bytes for the view file, TEST GlobalIds for the
 *   storey index, and a summary in the converter's one shape. It never reads the model.
 * - `testConverterWorker` is the conversion worker of the TEST API, with a TEST image whose digest and source label the
 *   test gives (the label matches the TEST source hash unless the test says otherwise).
 * - `modelView` asks the serving route for a document's view file.
 *
 * Nothing here catches an error: a failure fails the case (tools/checks/index, `[support]`).
 */
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ModelViewFailure } from '@sovitech/db';
import { testContentHash } from '@sovitech/db/testing';
import type { ConverterImage } from '../../../apps/api/src/jobs/model-view/image';
import type { ConversionJob, ConversionOutcome, ModelConverterRunner } from '../../../apps/api/src/jobs/model-view/sandbox';
import { ModelViewWorker } from '../../../apps/api/src/jobs/model-view/worker';
import type { Auth, TestApi } from './api';

/** The TEST image's tag, digest and source label (they exist nowhere). */
export const TEST_CONVERTER_IMAGE = 'sovitech-model-converter:test';
export const TEST_IMAGE: Required<ConverterImage> = { digest: testContentHash('model converter image'), sourceHash: testContentHash('model converter sources') };

/** TEST GlobalIds (22 characters of IFC's base 64 alphabet) for the scripted storey index. */
export const TEST_STOREY_INDEX_IDS = ['0TESTstoreyGlobalId001', '0TESTelementGlobalId01', '0TESTelementGlobalId02'] as const;

/** The view file a scripted conversion writes: TEST bytes, never anything of the model. */
export const TEST_VIEW_BYTES = Buffer.from('TEST converted view file (no model text)', 'utf8');

/** The converter's files by name (packages/viewer-spike/src/convert/cli.ts, OUTPUT_FILES). */
export type ConverterFile = 'viewer.frag' | 'storeys.json' | 'summary.json';

export interface ConverterScript {
  /** How the conversion ends: `finished` (its three files written; the default) or a failure code. */
  readonly outcome?: 'finished' | ModelViewFailure;
  /** Files written instead of the default ones, by name (a hostile or broken converter's output). */
  readonly files?: Partial<Record<ConverterFile, string | Buffer>>;
  /** Runs before anything is written, while the converter would still be reading (an erasure racing the conversion). */
  readonly beforeWrite?: (job: ConversionJob) => Promise<void>;
  /** Runs once the files are written, before the conversion returns (an erasure racing the conversion). */
  readonly afterWrite?: (job: ConversionJob) => Promise<void>;
}

/** The default storey index: TEST GlobalIds only, one line. */
function defaultIndex(): string {
  const [storey, ...elements] = TEST_STOREY_INDEX_IDS;
  return `${JSON.stringify({ storeys: [{ storey, elements }] })}\n`;
}

/** A summary in the converter's one shape, for files of these sizes. */
export function scriptedSummary(view: string | Buffer, index: string | Buffer, extra: Readonly<Record<string, unknown>> = {}): string {
  return `${JSON.stringify({
    about: 'model conversion: a code, sizes, times and memory only',
    code: 'written',
    profile: 'view',
    inputBytes: 1024,
    fragmentsBytes: Buffer.byteLength(view),
    indexBytes: Buffer.byteLength(index),
    importMs: 12.5,
    metadataMs: 1.25,
    indexMs: 0.5,
    maxRssKiB: 204800,
    ...extra,
  })}\n`;
}

/** The conversion sandbox, scripted: writes the converter's files into the job's folder, or fails with a code. */
export class ScriptedConverter implements ModelConverterRunner {
  readonly jobs: { readonly job: ConversionJob; readonly image: string }[] = [];

  constructor(private readonly script: (job: ConversionJob) => ConverterScript = () => ({})) {}

  async run(job: ConversionJob, image: string): Promise<ConversionOutcome> {
    this.jobs.push({ job, image });
    const script = this.script(job);
    if (script.beforeWrite !== undefined) await script.beforeWrite(job);
    if (script.outcome !== undefined && script.outcome !== 'finished') {
      if (script.afterWrite !== undefined) await script.afterWrite(job);
      return { outcome: 'failed', code: script.outcome, wallMs: 5 };
    }
    // As the sandbox's copy-out: the files land only in the job's folder as it is now, each a new file. A folder that is
    // gone is the host's side, not the model's (`output_unavailable`, as ../../../apps/api/src/jobs/model-view/sandbox.ts).
    if (!existsSync(job.outputDirectory)) return { outcome: 'failed', code: 'output_unavailable', wallMs: 5 };
    const view = script.files?.['viewer.frag'] ?? TEST_VIEW_BYTES;
    const index = script.files?.['storeys.json'] ?? defaultIndex();
    const summary = script.files?.['summary.json'] ?? scriptedSummary(view, index);
    for (const [name, content] of [
      ['viewer.frag', view],
      ['storeys.json', index],
      ['summary.json', summary],
    ] as const) {
      await writeFile(join(job.outputDirectory, name), content, { flag: 'wx', mode: 0o600 });
    }
    if (script.afterWrite !== undefined) await script.afterWrite(job);
    return { outcome: 'finished', wallMs: 10 };
  }
}

/** The conversion worker of a TEST API, with the TEST image (or the inspection the test gives) and a scripted sandbox. */
export function testConverterWorker(
  api: TestApi,
  runner: ModelConverterRunner,
  options: { readonly inspect?: (image: string) => Promise<ConverterImage | undefined>; readonly maxAttempts?: number; readonly retryAfterSeconds?: number } = {},
): ModelViewWorker {
  return new ModelViewWorker({ store: api.services.store, files: api.files, log: api.services.log }, runner, {
    workerId: 'test-converter',
    serviceId: api.extractionAccountId,
    image: TEST_CONVERTER_IMAGE,
    sourceHash: TEST_IMAGE.sourceHash,
    inspect: options.inspect ?? (() => Promise.resolve(TEST_IMAGE)),
    maxAttempts: options.maxAttempts ?? 1,
    retryAfterSeconds: options.retryAfterSeconds ?? 0,
    staleAfterSeconds: 1500,
  });
}

/** The serving route's answer for a document's view file (`documents.modelView`). */
export async function modelView(
  api: TestApi,
  auth: Auth,
  projectId: string,
  documentId: string,
): Promise<{ readonly status: number; readonly headers: Readonly<Record<string, unknown>>; readonly body: Buffer }> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents/${documentId}/model-view`, headers: { ...auth } });
  return { status: response.statusCode, headers: response.headers, body: response.rawPayload };
}
