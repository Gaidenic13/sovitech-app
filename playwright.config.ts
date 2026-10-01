import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright: e2e flows, the render test and accessibility checks
 * (prompt 3 sections 6, 7 and 11).
 *
 * Projects:
 * - render: specs under tests/e2e/render/ (the render-test harness, G2-1 and
 *   G2-8 on screens). `pnpm test:render` runs it, and `pnpm check` includes it.
 * - e2e: every other spec under tests/e2e/.
 *
 * The web server is apps/web, built and served by `vite preview` on a fixed port
 * (the same commands as its `preview:e2e` script). It is built and started for every run
 * and never reused: a server already listening on the port could be an older build or
 * another project, and the render test would then check screens that are not the current
 * code. Playwright's web server is shared by both projects, so this holds for the e2e
 * project too; with the port taken, the run stops with an error instead of reusing it.
 * render.spec.ts fails if this is switched back on (docs/adr/0006-render-test.md).
 * The viewport is the 1440x900 minimum of dashboards-spec 3.4 (prompt 3 section 11).
 * The render check forces hover and focus states through the Chrome DevTools Protocol, so
 * the render project runs in Chromium only.
 *
 * Phase 3 (docs/adr/0037-e2e-setup.md): the global setup starts the e2e stack (a TEST database, the
 * development owner, the demo seed through the extractor's sandbox, the API on 127.0.0.1:4174 and
 * the analysis worker) for both projects; `vite preview` proxies `/api` to it. It needs Docker and
 * both sandbox images built locally. A wizard screen signs in, reads the API and runs the render
 * check's three settle windows, so a test may take up to 90 s.
 */
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const desktop = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1440, height: 900 },
};

export default defineConfig({
  testDir: 'tests/e2e',
  testIgnore: ['**/company/**', '**/node_modules/**'],
  outputDir: 'test-results/playwright',
  fullyParallel: true,
  // `.only` fails every run, local or CI: a render run never checks a subset and reads as
  // the whole (phase 0 round 2 review). The run guard fails skipped, fixme and fail-marked
  // tests, and a render run that did not pass one test per screen of screens.ts.
  forbidOnly: true,
  retries: 0,
  // Phase 3 part B added 32 tests for loading, failure and in-between states (ADR 0037 decision 9), many of
  // which read a page with a request held or a poll due for the render check's full settle windows.
  globalTimeout: 45 * 60 * 1000,
  globalSetup: './tests/e2e/setup/global-setup.ts',
  timeout: 90_000,
  reporter: [['list'], ['./tests/e2e/render/run-guard-reporter.ts']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'render',
      testMatch: /render\/.*\.spec\.ts$/,
      use: desktop,
    },
    {
      name: 'e2e',
      testMatch: /\.spec\.ts$/,
      testIgnore: /render\//,
      use: desktop,
    },
  ],
  webServer: {
    // Vite runs directly, without pnpm in between, so Playwright's shutdown
    // reaches the server process and the run ends when the tests end.
    command: `./node_modules/.bin/vite build && ./node_modules/.bin/vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    cwd: 'apps/web',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
});
