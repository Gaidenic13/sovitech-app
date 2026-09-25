import { configDefaults, defineConfig } from 'vitest/config';
import repoConfig from '../../../../vitest.config.ts';
import { guardrailsSetupFiles } from '../../repo-config.ts';

// Seeded root: the config excludes one case file, which the run guard must report as not collected.
// The guardrails project's setup files (the stub guard) come from the repository's own config.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/guardrails/G1-2.test.ts'],
    setupFiles: guardrailsSetupFiles(repoConfig),
  },
});
