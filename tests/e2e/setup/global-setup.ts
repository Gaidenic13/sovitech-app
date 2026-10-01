/**
 * Playwright's global setup (docs/adr/0037-e2e-setup.md, decision 1): starts the e2e stack
 * (stack.ts: the TEST database, the development owner, the demo seed through the extractor's
 * sandbox, the API on 4174 and the analysis worker) as its own process through tsx, waits for its
 * state file, and returns the teardown that stops it. Playwright starts the web server (the built
 * app, `vite preview`, which proxies `/api` to the API) before this runs; no test starts before the
 * stack is ready.
 *
 * The stack runs in its own process so the store, Testcontainers and Docker run in plain Node, not
 * in Playwright's test loader. Its log goes to test-results/e2e/stack.log; a failure shows its tail.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { E2E_OUTPUT, REPO_ROOT, STACK_LOG, STATE_FILE } from './paths';

/** The seed reads ten documents through the sandbox; allow for a cold Docker. */
const READY_WITHIN_MS = 10 * 60 * 1000;

function tail(file: string, lines = 40): string {
  if (!existsSync(file)) return '(no log)';
  return readFileSync(file, 'utf8').split('\n').slice(-lines).join('\n');
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  mkdirSync(E2E_OUTPUT, { recursive: true });
  rmSync(STATE_FILE, { force: true });
  const logStream = createWriteStream(STACK_LOG, { flags: 'w' });
  const stack = spawn(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), ['tests/e2e/setup/stack.ts'], { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  stack.stdout.pipe(logStream, { end: false });
  stack.stderr.pipe(logStream, { end: false });
  let exited: number | null | undefined;
  stack.on('exit', (code) => {
    exited = code;
  });

  const until = Date.now() + READY_WITHIN_MS;
  while (!existsSync(STATE_FILE)) {
    if (exited !== undefined) throw new Error(`The e2e stack stopped before it was ready (exit ${String(exited)}). ${STACK_LOG}:\n${tail(STACK_LOG)}`);
    if (Date.now() > until) {
      stack.kill('SIGTERM');
      throw new Error(`The e2e stack was not ready within ${String(READY_WITHIN_MS / 1000)} s. ${STACK_LOG}:\n${tail(STACK_LOG)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return async () => {
    if (exited === undefined) {
      const done = new Promise<void>((resolve) => stack.on('exit', () => resolve()));
      stack.kill('SIGTERM');
      await Promise.race([done, new Promise((resolve) => setTimeout(resolve, 30_000))]);
    }
    logStream.end();
  };
}
