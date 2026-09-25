/**
 * Config integrity (config-integrity.ts): the repository's Vitest config,
 * package.json, tools/check.ts and .gitlab-ci.yml keep every guard of the
 * guardrail run, and each seeded setting under seeded/config/ is refused (phase 0
 * review, round 2: "The run guard can be removed without any check noticing").
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import repoConfig from '../../vitest.config';
import {
  GUARDRAILS_INCLUDE,
  GUARDRAILS_SUPPORT_EXCLUDE,
  RUN_GUARD_REPORTER,
  SEEDED_CONFIGS,
  SEEDED_CONFIG_DIR,
  checkConfigIntegrity,
  configIntegrityProblems,
  readConfigIntegrityInputs,
  type ConfigIntegrityInputs,
} from './config-integrity';
import { GUARDRAILS_PROJECT_NAME, projectsNamed, testBlockOf, withGuardrailsProject, withRootTest } from './repo-config';
import { STUB_GUARD_SETUP_FILE } from './stub-guard';

describe('config integrity: the repository', () => {
  it('registers the run guard, and runs the guardrails project with its include, exclude, assertions and stub guard', () => {
    const test = testBlockOf(repoConfig) ?? {};
    expect(test['reporters']).toContain(RUN_GUARD_REPORTER);
    const projects = projectsNamed(repoConfig, GUARDRAILS_PROJECT_NAME);
    expect(projects).toHaveLength(1);
    const guardrails = testBlockOf(projects[0]) ?? {};
    expect(guardrails['name']).toBe('guardrails');
    expect(guardrails['include']).toEqual([...GUARDRAILS_INCLUDE]);
    expect(guardrails['exclude']).toContain(GUARDRAILS_SUPPORT_EXCLUDE);
    expect(guardrails['expect']).toEqual({ requireAssertions: true });
    expect(guardrails['setupFiles']).toEqual([STUB_GUARD_SETUP_FILE]);
  });

  it('passes the check: the test script is "vitest run" with no reporter or project override, and pnpm check and CI run it', async () => {
    const inputs = await readConfigIntegrityInputs();
    const scripts = (inputs.packageJson as { scripts: Record<string, string> }).scripts;
    expect(scripts['test']).toBe('vitest run');
    expect(scripts['test']).not.toMatch(/--reporter|--project/);
    expect(configIntegrityProblems(inputs)).toEqual([]);
  });
});

describe('config integrity: settings that lose a guard', () => {
  const repoInputs = (): Promise<ConfigIntegrityInputs> => readConfigIntegrityInputs();

  it.each([
    ['the run guard dropped from the reporters', withRootTest(repoConfig, (test) => ({ ...test, reporters: ['default'] })), 'do not list the run guard'],
    ['the reporters replaced by a tuple of another reporter', withRootTest(repoConfig, (test) => ({ ...test, reporters: [['json', {}]] })), 'do not list the run guard'],
    ['no guardrails project', withRootTest(repoConfig, (test) => ({ ...test, projects: [] })), '0 inline projects named "guardrails"'],
    ['two guardrails projects', withRootTest(repoConfig, (test) => ({ ...test, projects: [...(test['projects'] as unknown[]), ...projectsNamed(repoConfig, 'guardrails')] })), '2 inline projects'],
    ['an include missing .tsx', withGuardrailsProject(repoConfig, (test) => ({ ...test, include: ['tests/guardrails/**/*.test.ts'] })), 'includes ["tests/guardrails/**/*.test.ts"]'],
    ['_support collected', withGuardrailsProject(repoConfig, (test) => ({ ...test, exclude: [] })), 'does not exclude'],
    ['requireAssertions false', withGuardrailsProject(repoConfig, (test) => ({ ...test, expect: { requireAssertions: false } })), 'expect.requireAssertions'],
    ['no setup files', withGuardrailsProject(repoConfig, (test) => ({ ...test, setupFiles: undefined })), 'do not list the stub guard'],
    ['allowOnly at the root', withRootTest(repoConfig, (test) => ({ ...test, allowOnly: true })), 'the root sets allowOnly: true'],
  ])('refuses %s', async (_name, config, problem) => {
    const problems = configIntegrityProblems({ ...(await repoInputs()), config });
    expect(problems.some((line) => line.includes(problem)), problems.join('\n')).toBe(true);
  });

  it.each([
    ['vitest run --reporter=dot', '"--reporter=dot"'],
    ['vitest run --reporter dot', '"--reporter" "dot"'],
    ['vitest run --project unit', '"--project" "unit"'],
    ['vitest run -t G1', '"-t" "G1"'],
    ['vitest run || true', '"||" "true"'],
    ['vitest', 'starts with "vitest run"'],
    ['vitest list', 'starts with "vitest run"'],
  ])('refuses the test script %j', async (script, problem) => {
    const problems = configIntegrityProblems({ ...(await repoInputs()), packageJson: { scripts: { test: script } } });
    expect(problems.some((line) => line.includes(problem)), problems.join('\n')).toBe(true);
  });

  it('refuses a missing test script, a check without the test step, a CI job with an extra argument, and a config that fails to load', async () => {
    const inputs = await repoInputs();
    expect(configIntegrityProblems({ ...inputs, packageJson: { scripts: {} } }).join('\n')).toContain('has no "test" script');
    expect(configIntegrityProblems({ ...inputs, checkScript: "const STEPS = [{ script: 'checks' }];" }).join('\n')).toContain(
      'pnpm check does not run the "test" script',
    );
    expect(configIntegrityProblems({ ...inputs, ci: 'test:\n  script:\n    - pnpm run test -- --project unit\n' }).join('\n')).toContain(
      'no CI job runs "pnpm run test" as written',
    );
    expect(configIntegrityProblems({ ...inputs, config: undefined, configError: 'TEST' }).join('\n')).toContain(
      'the config could not be loaded: TEST',
    );
  });
});

describe('config integrity: the seeded settings', () => {
  it.each(SEEDED_CONFIGS)('fails seeded/config/$name ($seeds)', { timeout: 60_000 }, async ({ name, problem }) => {
    const problems = await checkConfigIntegrity(undefined, join(SEEDED_CONFIG_DIR, name));
    expect(problems.length, problems.join('\n')).toBeGreaterThan(0);
    expect(problems.some((line) => line.includes(problem)), problems.join('\n')).toBe(true);
  });
});
