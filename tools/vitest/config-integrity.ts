/**
 * Config integrity for the guardrail run (phase 0 review, round 2: "The run
 * guard can be removed without any check noticing"). The seeded runs pass the
 * run guard on the command line, so they stay green when the repository stops
 * registering it. This module reads the repository's own settings and names every
 * way the blocking run (`pnpm test`, `pnpm check`, CI) would lose a guard:
 *
 * - vitest.config.ts: the run guard among the root reporters; one inline project
 *   named `guardrails`, whose include is the case files, whose exclude keeps
 *   tests/guardrails/_support/ out, whose expect settings require an assertion,
 *   and whose setup files hold the stub guard; no `passWithNoTests` or
 *   `allowOnly` at the root or in the guardrails project;
 * - package.json: the `test` script is `vitest run` with no flag outside the
 *   reviewed list (none now), so no `--reporter` replaces the guard, no
 *   `--project` drops the guardrails project, and no shell operator such as
 *   `|| true` hides a failure;
 * - tools/check.ts runs that script, and .gitlab-ci.yml runs it as written.
 *
 * `pnpm checks` runs it with the index check (tools/checks/index/check.ts), so it
 * holds even when a broken Vitest config would keep the unit tests from running;
 * config-integrity.test.ts runs it in the unit project; seeded settings under
 * seeded/config/ must each fail it (the index check's self-test).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { GUARDRAILS_PROJECT_NAME, REPO_ROOT, projectsNamed, stringList, testBlockOf } from './repo-config';
import { STUB_GUARD_SETUP_FILE } from './stub-guard';

/** The run guard, as the root reporters list it. */
export const RUN_GUARD_REPORTER = './tools/vitest/guardrail-run-guard.ts';

/** The guardrails project's include: every case file, .ts and .tsx (docs/adr/0003). */
export const GUARDRAILS_INCLUDE: readonly string[] = ['tests/guardrails/**/*.test.ts', 'tests/guardrails/**/*.test.tsx'];

/** Support code the guardrails project never collects. */
export const GUARDRAILS_SUPPORT_EXCLUDE = 'tests/guardrails/_support/**';

/**
 * Flags the `test` script may add after `vitest run`. Reviewed: none. A flag
 * added here is listed in docs/build-log.md, and never one that replaces the
 * reporters, filters projects, files or test names, or changes the config.
 */
export const ALLOWED_TEST_SCRIPT_FLAGS: readonly string[] = [];

/** The files this check reads, relative to the root. */
export const INTEGRITY_FILES = {
  config: 'vitest.config.ts',
  packageJson: 'package.json',
  checkScript: 'tools/check.ts',
  ci: '.gitlab-ci.yml',
} as const;

/** What the check reads. A file that cannot be read is undefined, which is a problem. */
export interface ConfigIntegrityInputs {
  /** The default export of vitest.config.ts. */
  config: unknown;
  /** Parsed package.json. */
  packageJson: unknown;
  /** The text of tools/check.ts. */
  checkScript: string | undefined;
  /** The text of .gitlab-ci.yml. */
  ci: string | undefined;
  /** Why vitest.config.ts could not be loaded, if it could not. */
  configError?: string;
}

const KIND = '[run config]';

/** A path as a config lists it, compared without a leading "./". */
function samePath(left: string, right: string): boolean {
  const normal = (path: string): string => posix.normalize(path.replace(/\\/g, '/')).replace(/^\.\//, '');
  return normal(left) === normal(right);
}

/** The reporter names of a `reporters` setting: strings, or the first item of [name, options] tuples. */
function reporterNames(value: unknown): string[] {
  const items = Array.isArray(value) ? (value as unknown[]) : [value];
  return items.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (Array.isArray(item) && typeof item[0] === 'string') return [item[0]];
    return [];
  });
}

/** The problems of the Vitest config object. */
function configProblems(config: unknown): string[] {
  const at = `${INTEGRITY_FILES.config}:1: ${KIND}`;
  const test = testBlockOf(config);
  if (test === undefined) return [`${at} the config has no "test" block`];
  const problems: string[] = [];

  if (!reporterNames(test['reporters']).some((name) => samePath(name, RUN_GUARD_REPORTER))) {
    problems.push(
      `${at} the root reporters do not list the run guard (${RUN_GUARD_REPORTER}), so a guardrail case held out, ` +
        'unguarded or not collected no longer fails the run',
    );
  }
  for (const key of ['passWithNoTests', 'allowOnly']) {
    if (test[key] === true) problems.push(`${at} the root sets ${key}: true, which lets a guardrail run pass on less than every case`);
  }

  const guardrails = projectsNamed(config, GUARDRAILS_PROJECT_NAME);
  if (guardrails.length !== 1) {
    problems.push(
      `${at} the config has ${guardrails.length} inline projects named "${GUARDRAILS_PROJECT_NAME}"; the guardrail ` +
        'cases run in exactly one, which the run guard and the stub guard name',
    );
    return problems;
  }
  const project = testBlockOf(guardrails[0]) ?? {};
  const where = `${at} the ${GUARDRAILS_PROJECT_NAME} project`;

  const include = stringList(project['include']);
  const includeMatches =
    include.length === GUARDRAILS_INCLUDE.length && GUARDRAILS_INCLUDE.every((pattern) => include.includes(pattern));
  if (!includeMatches) {
    problems.push(
      `${where} includes ${JSON.stringify(include)}; it includes exactly ${JSON.stringify(GUARDRAILS_INCLUDE)}, every case file`,
    );
  }
  if (!stringList(project['exclude']).includes(GUARDRAILS_SUPPORT_EXCLUDE)) {
    problems.push(`${where} does not exclude ${GUARDRAILS_SUPPORT_EXCLUDE}, so support code would be collected as cases`);
  }
  const expectSettings = project['expect'];
  const requireAssertions =
    typeof expectSettings === 'object' && expectSettings !== null
      ? (expectSettings as Record<string, unknown>)['requireAssertions']
      : undefined;
  if (requireAssertions !== true) {
    problems.push(`${where} does not set expect.requireAssertions: true, so a test that asserts nothing would pass`);
  }
  if (!stringList(project['setupFiles']).some((file) => samePath(file, STUB_GUARD_SETUP_FILE))) {
    problems.push(
      `${where}'s setupFiles do not list the stub guard (${STUB_GUARD_SETUP_FILE}), so a case that exercises ` +
        'an unbuilt stub would pass',
    );
  }
  for (const key of ['passWithNoTests', 'allowOnly']) {
    if (project[key] === true) problems.push(`${where} sets ${key}: true, which lets a guardrail run pass on less than every case`);
  }
  return problems;
}

/** The problems of package.json's `test` script. */
function testScriptProblems(packageJson: unknown): string[] {
  const at = `${INTEGRITY_FILES.packageJson}:1: ${KIND}`;
  const scripts =
    typeof packageJson === 'object' && packageJson !== null ? (packageJson as Record<string, unknown>)['scripts'] : undefined;
  const script = typeof scripts === 'object' && scripts !== null ? (scripts as Record<string, unknown>)['test'] : undefined;
  if (typeof script !== 'string') return [`${at} package.json has no "test" script; pnpm test and pnpm check run it`];
  const tokens = script.trim().split(/\s+/);
  if (tokens[0] !== 'vitest' || tokens[1] !== 'run') {
    return [`${at} the test script is ${JSON.stringify(script)}; it starts with "vitest run" (one run, the configured reporters)`];
  }
  const extra = tokens.slice(2).filter((token) => !ALLOWED_TEST_SCRIPT_FLAGS.includes(token));
  if (extra.length === 0) return [];
  return [
    `${at} the test script adds ${extra.map((token) => JSON.stringify(token)).join(' ')} to "vitest run"; a flag can ` +
      'replace the reporters (--reporter), drop the guardrails project (--project), filter the cases, or hide a failure ' +
      `(|| true), so only the reviewed flags in ALLOWED_TEST_SCRIPT_FLAGS (tools/vitest/config-integrity.ts) may follow it`,
  ];
}

/** The problems of tools/check.ts and .gitlab-ci.yml: both run the test script as written. */
function runnerProblems(checkScript: string | undefined, ci: string | undefined): string[] {
  const problems: string[] = [];
  if (checkScript === undefined || !/\bscript:\s*['"]test['"]/.test(checkScript)) {
    problems.push(
      `${INTEGRITY_FILES.checkScript}:1: ${KIND} pnpm check does not run the "test" script (a step with script: 'test'), ` +
        'so the guardrail cases would not run under the guards',
    );
  }
  if (ci === undefined || !/^\s*-\s*pnpm (?:run )?test\s*$/m.test(ci)) {
    problems.push(
      `${INTEGRITY_FILES.ci}:1: ${KIND} no CI job runs "pnpm run test" as written (a script line with no extra argument), ` +
        'so CI would not run the guardrail cases under the guards',
    );
  }
  return problems;
}

/** Every problem of the inputs; empty when the blocking run keeps every guard. */
export function configIntegrityProblems(inputs: ConfigIntegrityInputs): string[] {
  const loadProblem =
    inputs.configError === undefined
      ? []
      : [`${INTEGRITY_FILES.config}:1: ${KIND} the config could not be loaded: ${inputs.configError}`];
  return [
    ...loadProblem,
    ...(inputs.configError === undefined ? configProblems(inputs.config) : []),
    ...testScriptProblems(inputs.packageJson),
    ...runnerProblems(inputs.checkScript, inputs.ci),
  ];
}

function readIfFile(path: string): string | undefined {
  return existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined;
}

/**
 * Reads the inputs under `root`. With `overlay`, a folder holding some of the
 * same files (a seed), each file found there is read from it instead.
 */
export async function readConfigIntegrityInputs(root: string = REPO_ROOT, overlay?: string): Promise<ConfigIntegrityInputs> {
  const pick = (relative: string): string => {
    const seeded = overlay === undefined ? undefined : join(overlay, relative);
    return seeded !== undefined && existsSync(seeded) ? seeded : join(root, relative);
  };
  let config: unknown;
  let configError: string | undefined;
  try {
    const loaded = (await import(pathToFileURL(pick(INTEGRITY_FILES.config)).href)) as { default?: unknown };
    config = loaded.default;
  } catch (error) {
    configError = error instanceof Error ? error.message.split('\n', 1)[0] : String(error);
  }
  let packageJson: unknown;
  try {
    packageJson = JSON.parse(readIfFile(pick(INTEGRITY_FILES.packageJson)) ?? 'null');
  } catch {
    packageJson = undefined;
  }
  return {
    config,
    packageJson,
    checkScript: readIfFile(pick(INTEGRITY_FILES.checkScript)),
    ci: readIfFile(pick(INTEGRITY_FILES.ci)),
    ...(configError === undefined ? {} : { configError }),
  };
}

/** The config-integrity problems of the repository (or of a seed laid over it). */
export async function checkConfigIntegrity(root: string = REPO_ROOT, overlay?: string): Promise<string[]> {
  return configIntegrityProblems(await readConfigIntegrityInputs(root, overlay));
}

/** Seeded settings, each laid over the repository, each of which the check must fail (seeded/config/<name>/). */
export const SEEDED_CONFIG_DIR = join(REPO_ROOT, 'tools', 'vitest', 'seeded', 'config');

/** Each seed and the text its problem must hold. */
export const SEEDED_CONFIGS: ReadonlyArray<{ name: string; seeds: string; problem: string }> = [
  { name: 'no-run-guard', seeds: 'the run guard taken out of the reporters', problem: 'do not list the run guard' },
  { name: 'no-stub-guard', seeds: 'the guardrails project without the stub guard', problem: 'do not list the stub guard' },
  { name: 'no-require-assertions', seeds: 'expect.requireAssertions dropped', problem: 'expect.requireAssertions' },
  { name: 'support-collected', seeds: 'the _support exclude dropped', problem: `does not exclude ${GUARDRAILS_SUPPORT_EXCLUDE}` },
  { name: 'include-narrowed', seeds: 'an include that misses .ts case files', problem: 'includes ["tests/guardrails/**/*.test.tsx"]' },
  { name: 'project-renamed', seeds: 'the guardrails project renamed', problem: '0 inline projects named "guardrails"' },
  { name: 'pass-with-no-tests', seeds: 'passWithNoTests on the guardrails project', problem: 'sets passWithNoTests: true' },
  { name: 'test-script-reporter', seeds: 'vitest run --reporter=dot', problem: 'adds "--reporter=dot"' },
  { name: 'test-script-project', seeds: 'vitest run --project unit', problem: 'adds "--project" "unit"' },
  { name: 'test-script-or-true', seeds: 'vitest run || true', problem: 'adds "||" "true"' },
  { name: 'check-without-tests', seeds: 'pnpm check without the test step', problem: 'pnpm check does not run the "test" script' },
  { name: 'ci-test-reporter', seeds: 'a CI job that adds a reporter', problem: 'no CI job runs "pnpm run test" as written' },
];
