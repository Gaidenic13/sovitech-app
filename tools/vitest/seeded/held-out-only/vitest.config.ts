import { defineConfig } from 'vitest/config';
import repoConfig from '../../../../vitest.config.ts';
import { guardrailsSetupFiles } from '../../repo-config.ts';

// Seeded root: the guardrails project's setup files (the stub guard), read from the
// repository's own config, so the control case runs as the repository's cases do (README.md).
export default defineConfig({
  test: {
    setupFiles: guardrailsSetupFiles(repoConfig),
  },
});
