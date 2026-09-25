import { defineConfig } from 'vitest/config';
import repoConfig from '../../../../vitest.config.ts';
import { guardrailsSetupFiles } from '../../repo-config.ts';

// Seeded root: the guardrails project's setup files (the stub guard), read from the
// repository's own config, so these seeds prove that config and not a copy of it (README.md).
export default defineConfig({
  test: {
    setupFiles: guardrailsSetupFiles(repoConfig),
  },
});
