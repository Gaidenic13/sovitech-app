import { defineConfig } from 'vitest/config';
import repoConfig from '../../../../vitest.config.ts';

// Seeded root: the guardrails project's expect settings, read from the repository's
// own config, so this seed proves that config and not a copy of it (README.md).
interface Project {
  test?: { name?: string; expect?: Record<string, unknown> };
}
const projects = (repoConfig.test?.projects ?? []) as Project[];
const guardrails = projects.find((project) => typeof project === 'object' && project.test?.name === 'guardrails');
if (guardrails === undefined) throw new Error('The repository vitest.config.ts has no guardrails project.');
const withoutSetting = process.env['SOVITECH_SEED_WITHOUT_REQUIRE_ASSERTIONS'] === '1';

export default defineConfig({
  test: {
    include: ['tests/guardrails/**/*.test.ts'],
    expect: withoutSetting ? {} : (guardrails.test?.expect ?? {}),
  },
});
