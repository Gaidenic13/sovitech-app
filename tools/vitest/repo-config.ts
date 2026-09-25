/**
 * Reads the guardrails project out of a Vitest config object. Used by the
 * config-integrity check (config-integrity.ts) and by the seeded Vitest roots'
 * configs (tools/vitest/seeded/), so each seed runs with the repository's own
 * settings, not a copy of them.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root: this file is tools/vitest/repo-config.ts. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The Vitest project that runs the guardrail cases (vitest.config.ts). */
export const GUARDRAILS_PROJECT_NAME = 'guardrails';

/** A project entry of `test.projects`, as far as the checks read it. */
export interface ProjectLike {
  extends?: unknown;
  test?: Record<string, unknown>;
}

/** The `test` block of a Vitest config object, or undefined. */
export function testBlockOf(config: unknown): Record<string, unknown> | undefined {
  if (typeof config !== 'object' || config === null) return undefined;
  const test = (config as Record<string, unknown>)['test'];
  return typeof test === 'object' && test !== null ? (test as Record<string, unknown>) : undefined;
}

/** The inline projects of a config whose `test.name` is `name`. */
export function projectsNamed(config: unknown, name: string): ProjectLike[] {
  const projects = testBlockOf(config)?.['projects'];
  if (!Array.isArray(projects)) return [];
  return projects.filter(
    (project): project is ProjectLike =>
      typeof project === 'object' &&
      project !== null &&
      testBlockOf(project)?.['name'] === name,
  );
}

/** A value that Vitest reads as a list of strings (a string, or an array of strings). */
export function stringList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * The guardrails project's setup files as absolute paths, for a seeded root's
 * config. Empty when the repository's config has no guardrails project or no
 * setup files, so a seed then runs without them and its expectations fail.
 */
export function guardrailsSetupFiles(config: unknown): string[] {
  const [project] = projectsNamed(config, GUARDRAILS_PROJECT_NAME);
  return stringList(testBlockOf(project)?.['setupFiles']).map((file) => resolve(REPO_ROOT, file));
}

/** A copy of a config whose `test` block is replaced by `update(test)`. For seeds; the original is not changed. */
export function withRootTest(config: unknown, update: (test: Record<string, unknown>) => Record<string, unknown>): unknown {
  const base = typeof config === 'object' && config !== null ? (config as Record<string, unknown>) : {};
  return { ...base, test: update({ ...(testBlockOf(config) ?? {}) }) };
}

/**
 * A copy of a config whose guardrails project's `test` block is replaced by
 * `update(test)`. For seeds; the original is not changed.
 */
export function withGuardrailsProject(
  config: unknown,
  update: (test: Record<string, unknown>) => Record<string, unknown>,
): unknown {
  return withRootTest(config, (test) => {
    const projects = Array.isArray(test['projects']) ? (test['projects'] as unknown[]) : [];
    return {
      ...test,
      projects: projects.map((project) =>
        testBlockOf(project)?.['name'] === GUARDRAILS_PROJECT_NAME
          ? { ...(project as Record<string, unknown>), test: update({ ...(testBlockOf(project) ?? {}) }) }
          : project,
      ),
    };
  });
}
