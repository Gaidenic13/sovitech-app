/**
 * The e2e stack (docs/adr/0037-e2e-setup.md, decision 1), run as its own process by the Playwright
 * global setup (global-setup.ts) through tsx, so the store, the seed and Docker run in plain Node:
 *
 * 1. a TEST database (`startTestDatabase`: Testcontainers, the pinned Postgres image, every migration);
 * 2. the extraction service account (TEST) and the development owner (ADR 0038, `ensureDevOwner`);
 * 3. the demo seed with the extractor in its sandbox (both locally built images), its data folder
 *    under the home folder (Colima shares only that), then the development owner made a member of
 *    the demo (PRD R-136 interim, `addToDemoProject`);
 * 4. the API on 127.0.0.1:4174 and the analysis worker, each a child process with the TEST database's
 *    app login, a random session secret, the extraction account, the data folder, the images and
 *    SOVITECH_DEV_ACCOUNTS; no ANTHROPIC_API_KEY is passed on, so no AI runs (the owner's answers
 *    in force: no key is set);
 * 5. a TEST-only control route on the loopback interface, for what a spec must read from the store or
 *    write into it and no app route serves: the guardrail events of a project (prompt 3 phase 3 exit:
 *    "no `question_for_known_field` events in (a)"), read as the database administrator of this
 *    throwaway database; and the TEST states of control.ts (a document still being read, conflicts put
 *    to the owner, an inference to confirm, a late finding), written into a TEST project, never the
 *    demo, through the store's TEST machinery only (ADR 0037, decision 11). It exists only in this
 *    process;
 * 6. `test-results/e2e/state.json`: the account and project ids and the control route's address.
 *
 * On SIGTERM or SIGINT it stops the worker and the API, stops the database and removes the data
 * folder. Every line it logs goes to test-results/e2e/stack.log (codes and ids only, rule 13).
 */
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestAccount, startTestDatabase, type TestDatabase } from '@sovitech/db/testing';
import { TestStateRefused, isTestState, writeTestState } from './control';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import { addToDemoProject, ensureDevOwner } from '../../../apps/api/src/cli/dev-accounts';
import { DockerExtractorRunner } from '../../../apps/api/src/jobs/sandbox';
import { seedDemo } from '../../../apps/api/src/seed/demo-seed';
import { FileStore } from '../../../apps/api/src/storage/file-store';
import { fixtureUploadGuard } from '../../../apps/api/src/uploads/fixture-guard';
import { API_ORIGIN, API_PORT, E2E_OUTPUT, REPO_ROOT, STATE_FILE, type StackState } from './paths';

/** The two sandbox images (ADR 0018, ADR 0031), built locally. */
const IMAGES = { extractor: 'sovitech-extractor:dev', ifcReader: 'sovitech-ifc-reader:dev' } as const;
const BUILD_COMMANDS = [
  'docker build --target extractor -t sovitech-extractor:dev services/extractor',
  'docker build -f services/ifc-reader/Dockerfile -t sovitech-ifc-reader:dev .',
];

function log(event: string, detail: Record<string, unknown> = {}): void {
  process.stdout.write(`${JSON.stringify({ at: new Date().toISOString(), event, ...detail })}\n`);
}

function imagesPresent(): boolean {
  try {
    execFileSync('docker', ['image', 'inspect', IMAGES.extractor, IMAGES.ifcReader], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** The child processes' environment: this process's, less any API key and any SOVITECH_ setting, plus the stack's own. */
function childEnvironment(own: Record<string, string>): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (name === 'ANTHROPIC_API_KEY' || name.startsWith('SOVITECH_')) continue;
    environment[name] = value;
  }
  return { ...environment, ...own };
}

function startChild(name: string, script: string, environment: NodeJS.ProcessEnv): ChildProcess {
  const child = spawn(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), [script], { cwd: REPO_ROOT, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  const relay = (stream: NodeJS.ReadableStream | null) =>
    stream?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split('\n')) if (line.trim() !== '') process.stdout.write(`[${name}] ${line}\n`);
    });
  relay(child.stdout);
  relay(child.stderr);
  child.on('exit', (code, signal) => log('child_exited', { name, code, signal }));
  return child;
}

async function waitForHealth(deadlineMs: number): Promise<void> {
  const until = Date.now() + deadlineMs;
  for (;;) {
    try {
      const response = await fetch(`${API_ORIGIN}/health`);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    if (Date.now() > until) throw new Error(`the API did not answer ${API_ORIGIN}/health within ${String(deadlineMs)} ms`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/**
 * The TEST-only control route, on the loopback interface (ADR 0037, decisions 8 and 11):
 * - `GET /guardrail-events?projectId=<uuid>[&type=<type>]` answers [{ type, fieldKey, subjectId }];
 * - `POST /test-states/<name>?projectId=<uuid>` writes one TEST state of control.ts into that TEST
 *   project (204), refuses the demo project (403 `demo_project`) and an unknown project (404).
 * Answers carry codes and ids only (rule 13).
 */
function startControl(database: TestDatabase): Promise<Server> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const answer = (status: number, body?: unknown) => {
      if (body === undefined) {
        response.writeHead(status);
        response.end();
        return;
      }
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    };
    const projectId = url.searchParams.get('projectId') ?? '';
    const state = /^\/test-states\/(?<name>[a-z-]+)$/u.exec(url.pathname)?.groups?.['name'];
    if (request.method === 'POST' && state !== undefined) {
      if (!isTestState(state) || !UUID.test(projectId)) return answer(400, { code: 'request_invalid' });
      writeTestState(database, state, projectId)
        .then(() => {
          log('test_state_written', { state, projectId });
          answer(204);
        })
        .catch((error: unknown) => {
          if (error instanceof TestStateRefused) return answer(error.code === 'demo_project' ? 403 : 404, { code: error.code });
          log('test_state_failed', { state, projectId });
          return answer(500, { code: 'internal_error' });
        });
      return;
    }
    if (request.method !== 'GET' || url.pathname !== '/guardrail-events') return answer(404, { code: 'not_found' });
    const type = url.searchParams.get('type');
    if (!UUID.test(projectId)) return answer(400, { code: 'request_invalid' });
    const text =
      type === null
        ? 'SELECT type, field_key AS "fieldKey", subject_id AS "subjectId" FROM sovitech.guardrail_events WHERE project_id = $1 ORDER BY at, id'
        : 'SELECT type, field_key AS "fieldKey", subject_id AS "subjectId" FROM sovitech.guardrail_events WHERE project_id = $1 AND type = $2 ORDER BY at, id';
    database
      .asAdministrator(text, type === null ? [projectId] : [projectId, type])
      .then((rows) => answer(200, rows))
      .catch(() => answer(500, { code: 'internal_error' }));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Whether something already answers on the API's port: the stack would then check another API's screens. */
async function apiPortTaken(): Promise<boolean> {
  try {
    await fetch(`${API_ORIGIN}/health`, { signal: AbortSignal.timeout(2_000) });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  mkdirSync(E2E_OUTPUT, { recursive: true });
  rmSync(STATE_FILE, { force: true });
  if (await apiPortTaken()) {
    throw new Error(`${API_ORIGIN} already answers: stop the API or the e2e stack that holds port ${String(API_PORT)} (the stack never reuses one).`);
  }
  if (!imagesPresent()) {
    throw new Error(`The e2e stack needs both sandbox images, built locally from the repository root:\n  ${BUILD_COMMANDS.join('\n  ')}`);
  }
  const children: ChildProcess[] = [];
  let database: TestDatabase | undefined;
  let control: Server | undefined;
  // Under the home folder: Colima shares it with its virtual machine; the temp folder it does not.
  const dataDirectory = mkdtempSync(join(process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches') : tmpdir(), 'sovitech-e2e-'));
  let stopping = false;
  const stop = async (code: number) => {
    if (stopping) return;
    stopping = true;
    log('stack_stopping');
    for (const child of children) child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 500));
    control?.close();
    await database?.stop().catch(() => undefined);
    rmSync(dataDirectory, { recursive: true, force: true });
    rmSync(STATE_FILE, { force: true });
    log('stack_stopped');
    process.exit(code);
  };
  process.on('SIGTERM', () => void stop(0));
  process.on('SIGINT', () => void stop(0));
  try {
    log('database_starting');
    database = await startTestDatabase();
    const extractionAccountId = await createTestAccount(database, { label: 'e2e extraction service', kind: 'service', roles: [] });
    const devOwnerId = await ensureDevOwner(database.operator);
    log('accounts_ready', { extractionAccountId, devOwnerId });

    log('demo_seeding');
    const report = await seedDemo({
      gates: assertGatesStartupSafe(),
      app: database.app,
      operator: database.operator,
      files: new FileStore(dataDirectory),
      uploadGuard: fixtureUploadGuard(REPO_ROOT),
      extractionAccountId,
      repositoryRoot: REPO_ROOT,
      runner: new DockerExtractorRunner(IMAGES),
      log: (record) => log('seed', { record }),
    });
    const demoProjectId = await addToDemoProject(database.operator, [devOwnerId]);
    if (demoProjectId !== report.projectId) throw new Error('the development owner could not be added to the demo project');
    log('demo_seeded', { demoProjectId, analysis: report.analysis.map((step) => step.kind) });

    const environment = childEnvironment({
      SOVITECH_API_PORT: String(API_PORT),
      SOVITECH_DB_APP_URL: database.url('app'),
      SOVITECH_DB_OPERATOR_URL: database.url('operator'),
      SOVITECH_SESSION_SECRET: randomBytes(24).toString('hex'),
      SOVITECH_EXTRACTION_ACCOUNT_ID: extractionAccountId,
      SOVITECH_DATA_DIR: dataDirectory,
      SOVITECH_EXTRACTOR_IMAGE: IMAGES.extractor,
      SOVITECH_IFC_READER_IMAGE: IMAGES.ifcReader,
      SOVITECH_DEV_ACCOUNTS: devOwnerId,
    });
    children.push(startChild('api', 'apps/api/src/index.ts', environment));
    children.push(startChild('worker', 'apps/api/src/worker-main.ts', environment));
    await waitForHealth(60_000);
    control = await startControl(database);
    const state: StackState = { devOwnerId, demoProjectId, controlOrigin: `http://127.0.0.1:${String((control.address() as AddressInfo).port)}` };
    writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
    log('stack_ready', { ...state });
  } catch (error) {
    log('stack_failed', { message: error instanceof Error ? error.message : String(error) });
    await stop(1);
  }
}

await main();
