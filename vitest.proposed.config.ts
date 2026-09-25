import { configDefaults, defineConfig } from 'vitest/config';

/**
 * Proposed-behaviour suite: gated behaviour and the proposed IFC cases
 * (prompt 3 sections 5.4 and 8). Not indexed in docs/guardrails.md section 7,
 * never part of `pnpm check`, and a non-blocking CI job. Only this suite may
 * import the test-utils entry that opens a gate, and only its setup file arms
 * the gate source module for the test file that runs now, so an override works
 * nowhere else (phase 0 review, round 2; docs/adr/0005-gates-mechanism.md).
 */
export default defineConfig({
  test: {
    name: 'proposed',
    environment: 'node',
    include: ['tests/proposed/**/*.test.ts', 'tests/proposed/**/*.test.tsx'],
    exclude: [...configDefaults.exclude, 'company/**', 'tools/**/seeded/**', 'services/**'],
    passWithNoTests: true,
    setupFiles: ['./packages/registry/src/test-utils/proposed-runner-setup.ts'],
    testTimeout: 60_000,
  },
});
