import { configDefaults, defineConfig } from 'vitest/config';

/**
 * The blocking Vitest run used by `pnpm test` and `pnpm check`.
 *
 * Three projects:
 * - unit: tests next to the code, in packages, apps and tools (.ts, in Node);
 * - components: React component tests next to the code (.test.tsx under packages and
 *   apps), in happy-dom (phase 3);
 * - guardrails: one file per indexed case id, tests/guardrails/<ID>.test.ts
 *   (docs/guardrails.md section 7). Support code lives in tests/guardrails/_support/.
 *
 * tests/proposed/ is not part of this run: it has its own config and a
 * non-blocking script (prompt 3 section 5.4). company/** is never collected
 * (build-readiness decision 12). Seeded bad inputs under tools/**\/seeded/ are
 * never collected either.
 */
const sharedExclude = [
  ...configDefaults.exclude,
  'company/**',
  'tests/proposed/**',
  'tests/e2e/**',
  'tools/**/seeded/**',
  'services/**',
];

export default defineConfig({
  test: {
    // The guardrail run guard fails the run when a guardrail case was held out
    // other than by the pending wrapper, or ran no test (tools/vitest/README.md).
    reporters: ['default', './tools/vitest/guardrail-run-guard.ts'],
    exclude: sharedExclude,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'packages/*/src/**/*.test.ts',
            'apps/*/src/**/*.test.ts',
            'tools/**/*.test.ts',
            // The API's integration tests over a TEST database (phase 2): outside tests/guardrails,
            // so they are not case files, and under tests/, where the store's test machinery may be
            // reached (dependency-cruiser's db-testing-only-from-tests).
            'tests/api/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          // Component tests of the UI (phase 3; docs/adr/0035-phase-3-frontend-dependencies.md):
          // React components rendered in happy-dom with @testing-library/react. Every .test.tsx
          // under packages and apps runs here, never in the node project above.
          name: 'components',
          environment: 'happy-dom',
          include: ['packages/*/src/**/*.test.tsx', 'apps/*/src/**/*.test.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'guardrails',
          environment: 'node',
          include: ['tests/guardrails/**/*.test.ts', 'tests/guardrails/**/*.test.tsx'],
          // Added to the root exclude list, which every project inherits.
          exclude: ['tests/guardrails/_support/**'],
          // A guardrail test that makes no assertion fails (phase 0 review, finding 9).
          expect: { requireAssertions: true },
          // A guardrail test that reaches an unbuilt domain stub fails unless the pending
          // wrapper holds it out (phase 0 review, round 2; tools/vitest/README.md).
          setupFiles: ['./tools/vitest/guardrail-stub-guard.ts'],
          // Some cases launch Chromium (the render cases G2-1 and G2-8).
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
