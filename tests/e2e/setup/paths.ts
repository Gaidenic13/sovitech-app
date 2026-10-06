/**
 * Where the e2e stack (docs/adr/0037-e2e-setup.md) and the specs meet: the fixed ports, and the
 * state file the stack writes once the API, the worker and the demo are ready. Plain constants and
 * a reader: no store, no secret, so every spec may import this file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** The API the stack starts; `vite preview` proxies `/api` here (apps/web/vite.config.ts). */
export const API_PORT = 4174;
export const API_ORIGIN = `http://127.0.0.1:${String(API_PORT)}`;

/**
 * The web app `vite preview` serves (playwright.config.ts's web server). Phase 5: the API prints the proposal's print
 * route from this origin (SOVITECH_WEB_ORIGIN; docs/adr/0050 decision 2), so "Download PDF" works in the e2e run.
 */
export const WEB_PORT = 4173;
export const WEB_ORIGIN = `http://127.0.0.1:${String(WEB_PORT)}`;

/** What the stack writes for the specs (git-ignored under test-results/). */
export const E2E_OUTPUT = join(REPO_ROOT, 'test-results', 'e2e');
export const STATE_FILE = join(E2E_OUTPUT, 'state.json');
export const STACK_LOG = join(E2E_OUTPUT, 'stack.log');

/** The stack's state: account and project ids, and the loopback address of its TEST-only control route. No secret, no password. */
export interface StackState {
  /** The development owner's account id (the sign-in page lists it as "Development owner"). */
  readonly devOwnerId: string;
  /** The demo project the seed built, with its analysis done in the extractor's sandbox. */
  readonly demoProjectId: string;
  /**
   * The stack's TEST-only control route, on the loopback interface: guardrail events read by the database
   * administrator, and the TEST states of control.ts written into a TEST project (ADR 0037, decision 11).
   */
  readonly controlOrigin: string;
}

/** The stack's state; throws when the global setup has not written it. */
export function readStackState(): StackState {
  if (!existsSync(STATE_FILE)) throw new Error(`No e2e stack state at ${STATE_FILE}: the Playwright global setup (tests/e2e/setup/global-setup.ts) did not run.`);
  return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as StackState;
}
