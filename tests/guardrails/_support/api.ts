/**
 * The API over a TEST database and a TEST data folder, for the API's guardrail cases
 * (G1-13, G12-1, G12-3, G12-4, G12-5, G12-6, G13-3, G13-4, G14-3) and its integration
 * tests (tests/api/). Every account, project and value is TEST data; the files uploaded
 * are the generated synthetic fixtures (fixtures/manifest.json), or TEST bytes that exist
 * nowhere else, accepted by a guard the test hands in.
 *
 * - `startTestApi` builds the API with the production gate source (every gate closed,
 *   assertGatesStartupSafe) on a throwaway Postgres, a data folder in the system's temp
 *   folder, and the owner's fixtures-only guard unless the test passes another. With
 *   `readModels`, it carries the tests-only switch that lets an uploaded IFC model be read
 *   (apps/api/src/documents/model-reading.ts): the live app reads no model until the owner
 *   decides D-01 (PRD R-023, R-024), and the cases that prove the reader's path ask for it.
 *   With `devLogin` (phase 3), it creates one TEST development account (a person holding `owner`)
 *   and lists it as the API's development account, with the fixtures-only guard as the live app has
 *   it, so the development login is on (docs/adr/0038).
 * - `signIn` opens a session for a TEST account and fetches a CSRF token.
 * - `upload` drives the real chunk protocol of ADR 0019.
 * - `ScriptedRunner` stands in for the extractor's sandbox (a dependency handed in, not a
 *   test double of the code under test): it writes the output the test scripted into the
 *   job's output folder, as the extractor would, and the worker reads it through the
 *   contract like any other.
 *
 * Nothing here catches an error: a failure fails the case (tools/checks/index, `[support]`).
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { createTestAccount, createTestProject, startTestDatabase, type TestDatabase } from '@sovitech/db/testing';
import { SessionStore, sessionCookieHeader } from '../../../apps/api/src/auth/sessions';
import { AnalysisWorker } from '../../../apps/api/src/jobs/worker';
import type { ExtractorRunner, SandboxJob, SandboxOutcome } from '../../../apps/api/src/jobs/sandbox';
import { buildServer } from '../../../apps/api/src/server';
import { readModelsForTests, type ModelReadingServices } from '../../../apps/api/src/documents/model-reading';
import type { ApiLogRecord, ApiServices } from '../../../apps/api/src/services';
import { FileStore } from '../../../apps/api/src/storage/file-store';
import { fixtureUploadGuard, type UploadGuard } from '../../../apps/api/src/uploads/fixture-guard';
import type { ApiRegistry } from '../../../apps/api/src/wizard/registry';

export const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** The bytes of a generated fixture, by its path from the repository root. */
export function fixtureBytes(path: string): Buffer {
  return readFileSync(join(REPOSITORY_ROOT, path));
}

/** The session secret of every TEST API (TEST text, 32 characters and more). */
const TEST_SECRET = 'TEST session secret: not a real secret, tests only';

export interface TestApi {
  readonly database: TestDatabase;
  readonly app: FastifyInstance;
  readonly services: ApiServices & ModelReadingServices;
  readonly files: FileStore;
  readonly dataDirectory: string;
  /** Every log record the API and the worker wrote: codes and ids only. */
  readonly log: ApiLogRecord[];
  /** The extraction job's TEST service account (no member of any project until an owner's upload adds it). */
  readonly extractionAccountId: string;
  /** With `devLogin`: the TEST development account the development login offers (a person holding `owner`; docs/adr/0038). */
  readonly devAccountIds: readonly string[];
  stop(): Promise<void>;
}

export async function startTestApi(
  options: {
    readonly uploadGuard?: UploadGuard;
    readonly readModels?: boolean;
    readonly devLogin?: boolean;
    readonly registry?: ApiRegistry;
    /** Phase 5: a TEST engine catalogue (the engine refuses it outside the test runner) and a TEST drafting service. */
    readonly engine?: ApiServices['engine'];
    readonly drafting?: ApiServices['drafting'];
    /** The viewer step: where the TEST data folder is made (the system's temp folder by default; under the home folder for a real sandbox run in Colima). */
    readonly dataRoot?: string;
  } = {},
): Promise<TestApi> {
  const database = await startTestDatabase();
  const dataDirectory = mkdtempSync(join(options.dataRoot ?? tmpdir(), 'sovitech-test-data-'));
  const files = new FileStore(dataDirectory);
  const log: ApiLogRecord[] = [];
  const extractionAccountId = await createTestAccount(database, { label: 'extraction service', kind: 'service', roles: [] });
  const devAccountIds = options.devLogin === true ? [await createTestAccount(database, { label: 'development owner', kind: 'person', roles: ['owner'] })] : [];
  const services: ApiServices & ModelReadingServices = {
    ...(options.readModels === true ? { modelReading: readModelsForTests() } : {}),
    store: database.app,
    files,
    uploadGuard: options.uploadGuard ?? fixtureUploadGuard(REPOSITORY_ROOT),
    extractionAccountId,
    sessions: new SessionStore(),
    cookieSecret: TEST_SECRET,
    log: (record) => {
      log.push(record);
    },
    devAccounts: devAccountIds,
    ...(options.registry === undefined ? {} : { registry: options.registry }),
    ...(options.engine === undefined ? {} : { engine: options.engine }),
    ...(options.drafting === undefined ? {} : { drafting: options.drafting }),
  };
  const app = buildServer({ gates: assertGatesStartupSafe(), services });
  await app.ready();
  return {
    database,
    app,
    services,
    files,
    dataDirectory,
    log,
    extractionAccountId,
    devAccountIds,
    stop: async () => {
      await app.close();
      await database.stop();
      await rm(dataDirectory, { recursive: true, force: true });
    },
  };
}

/** A TEST owner and their TEST project (the owner a member holding `owner`). */
export async function ownerWithProject(api: TestApi, label: string): Promise<{ readonly ownerId: string; readonly projectId: string }> {
  const ownerId = await createTestAccount(api.database, { label: `${label} owner`, kind: 'person', roles: ['owner'] });
  const projectId = await createTestProject(api.database, { ownerId, isDemo: false });
  return { ownerId, projectId };
}

/** The headers of a signed-in TEST user: the session cookie, the CSRF cookie and its token. */
export interface Auth {
  readonly cookie: string;
  readonly 'csrf-token': string;
}

export async function signIn(api: TestApi, userId: string): Promise<Auth> {
  const session = sessionCookieHeader(api.services.sessions.create(userId), api.services.cookieSecret);
  const response = await api.app.inject({ method: 'GET', url: '/api/csrf', headers: { cookie: session } });
  const token = (response.json() as { token: string }).token;
  const csrf = response.cookies.find((cookie) => cookie.name === '_csrf');
  if (csrf === undefined) throw new Error('the API set no CSRF cookie');
  return { cookie: `${session}; _csrf=${encodeURIComponent(csrf.value)}`, 'csrf-token': token };
}

export interface Uploaded {
  readonly status: number;
  readonly body: { readonly documentId?: string; readonly code?: string; readonly message?: string; readonly statusLine?: unknown };
}

/** Uploads bytes through the chunk protocol (create, append chunk by chunk, complete). */
export async function upload(api: TestApi, auth: Auth, projectId: string, fileName: string, bytes: Uint8Array, chunkBytes = 1024 * 1024): Promise<Uploaded> {
  const created = await api.app.inject({
    method: 'POST',
    url: `/api/projects/${projectId}/uploads`,
    headers: { ...auth },
    payload: { fileName, size: bytes.length },
  });
  if (created.statusCode !== 201) return { status: created.statusCode, body: created.json() };
  const { uploadId } = created.json() as { uploadId: string };
  for (let offset = 0; offset < bytes.length; offset += chunkBytes) {
    const chunk = await api.app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/uploads/${uploadId}?offset=${offset}`,
      headers: { ...auth, 'content-type': 'application/octet-stream' },
      payload: Buffer.from(bytes.subarray(offset, offset + chunkBytes)),
    });
    if (chunk.statusCode !== 200) return { status: chunk.statusCode, body: chunk.json() };
  }
  const completed = await api.app.inject({ method: 'POST', url: `/api/projects/${projectId}/uploads/${uploadId}/complete`, headers: { ...auth } });
  return { status: completed.statusCode, body: completed.json() };
}

/** The owner's document list, as the API serves it. */
export async function documentList(api: TestApi, auth: Auth, projectId: string): Promise<readonly Record<string, unknown>[]> {
  const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/documents`, headers: { ...auth } });
  if (response.statusCode !== 200) throw new Error(`the document list answered ${String(response.statusCode)}`);
  return (response.json() as { documents: Record<string, unknown>[] }).documents;
}

/** What the scripted extractor writes for a job: an output value, given the job and the request's job and declared format. */
export type Script = (job: SandboxJob, request: { readonly projectId: string; readonly documentId: string; readonly contentHash: string }, declaredFormat: string) => unknown;

/** The extractor's sandbox, scripted: writes the output the test gives into the job's output folder. */
export class ScriptedRunner implements ExtractorRunner {
  readonly jobs: SandboxJob[] = [];

  constructor(private readonly script: Script) {}

  async run(job: SandboxJob): Promise<SandboxOutcome> {
    this.jobs.push(job);
    const request = JSON.parse(readFileSync(job.requestPath, 'utf8')) as { declaredFormat: string; job: { projectId: string; documentId: string; contentHash: string } };
    const output = this.script(job, request.job, request.declaredFormat);
    await mkdir(job.outputDirectory, { recursive: true });
    await writeFile(join(job.outputDirectory, 'output.json'), JSON.stringify(output), 'utf8');
    return { outcome: 'finished' };
  }
}

/** The analysis worker of a TEST API, with a scripted extractor, the draft IDS when a case asks for it, and the API's model-reading switch when it has one. */
export function testWorker(
  api: TestApi,
  runner: ExtractorRunner,
  options: { readonly ids?: { id: string; version: string; draft: boolean; sha256: string; path: string }; readonly maxAttempts?: number } = {},
): AnalysisWorker {
  return new AnalysisWorker({ store: api.services.store, files: api.files, log: api.services.log }, runner, {
    workerId: 'test-worker',
    serviceId: api.extractionAccountId,
    gates: assertGatesStartupSafe(),
    ...(options.ids === undefined ? {} : { ids: options.ids }),
    ...(api.services.modelReading === undefined ? {} : { modelReading: api.services.modelReading }),
    maxAttempts: options.maxAttempts ?? 1,
    retryAfterSeconds: 0,
    staleAfterSeconds: 600,
  });
}

/** The producer every scripted output names (a TEST version). */
export const TEST_PRODUCER = { name: 'sovitech-extractor', version: '0.0.0-test', libraries: [] } as const;
