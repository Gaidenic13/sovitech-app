/**
 * Shared helpers for the checks under tools/checks/. Owned by the scaffold;
 * a check keeps any helper of its own inside its own folder.
 */
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'tinyglobby';
import type { CheckResult } from './types';

/** Absolute path of the repository root. */
export const repoRoot: string = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Paths no check scans: company/ is never an input (build-readiness decision 12;
 * prompt 3 section 6), seeded bad inputs are wrong on purpose, and generated or
 * installed files are not the repository's own content.
 */
export const DEFAULT_IGNORES: readonly string[] = [
  'company/**',
  '**/node_modules/**',
  '.git/**',
  'services/extractor/.venv/**',
  '**/__pycache__/**',
  '**/dist/**',
  'coverage/**',
  'test-results/**',
  'playwright-report/**',
  'fixtures/ifc/perf/**',
  'tools/**/seeded/**',
];

export interface ListOptions {
  /** Directory the patterns are relative to. Defaults to the repository root. */
  cwd?: string;
  /** Extra ignore patterns, added to DEFAULT_IGNORES. */
  ignore?: readonly string[];
  /** Include dotfiles. Defaults to true. */
  dot?: boolean;
}

/** Lists files matching the patterns, as sorted paths relative to `cwd`. */
export async function listFiles(patterns: string | readonly string[], options: ListOptions = {}): Promise<string[]> {
  const cwd = options.cwd ?? repoRoot;
  const files = await glob(typeof patterns === 'string' ? [patterns] : [...patterns], {
    cwd,
    ignore: [...DEFAULT_IGNORES, ...(options.ignore ?? [])],
    dot: options.dot ?? true,
    onlyFiles: true,
  });
  return files.sort();
}

/** Reads a UTF-8 text file; `path` is relative to the repository root unless absolute. */
export function readText(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

/** The path relative to the repository root, with forward slashes. */
export function repoRelative(path: string): string {
  return relative(repoRoot, resolve(repoRoot, path)).split('\\').join('/');
}

/** A passing result. */
export function pass(name: string, summary: string, details: string[] = []): CheckResult {
  return { name, ok: true, summary, details };
}

/** A failing result. `details` should name each file and line at fault. */
export function fail(name: string, summary: string, details: string[] = []): CheckResult {
  return { name, ok: false, summary, details };
}
