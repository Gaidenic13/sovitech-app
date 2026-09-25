/**
 * Path and glob helpers for the config-exclusion check. Every path here is
 * relative to the repository root, with forward slashes; '' is the root.
 * Globs use Node's path.matchesGlob, which follows minimatch closely enough
 * for the patterns these configs use.
 */
import { posix } from 'node:path';

export const COMPANY = 'company';

/** Files that could sit under company/: sources, tests, specs, styles, Python, docs. */
export const COMPANY_FILE_PROBES: readonly string[] = [
  'company/package.json',
  'company/README.md',
  'company/website/src/index.ts',
  'company/website/src/app/page.tsx',
  'company/website/src/lib/util.js',
  'company/website/src/lib/util.test.ts',
  'company/website/src/app/page.test.tsx',
  'company/website/tests/e2e/home.spec.ts',
  'company/brand/tokens.css',
  'company/tools/script.py',
  'company/tools/tests/test_script.py',
];

/** Folders under company/ that a workspace pattern could pick up. */
export const COMPANY_DIR_PROBES: readonly string[] = ['company', 'company/website', 'company/products/tools'];

const GLOB_CHARACTERS = /[*?[\]{}!+@()]/;

export function hasGlob(pattern: string): boolean {
  return GLOB_CHARACTERS.test(pattern);
}

/** Drops leading './' and a trailing '/'; '.' becomes '' (the base folder itself). */
export function cleanPattern(pattern: string): string {
  let clean = pattern.trim();
  while (clean.startsWith('./')) clean = clean.slice(2);
  if (clean === '.') return '';
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
  return clean;
}

/**
 * True when `path` is matched by `pattern`. A pattern with no glob character
 * names a file or a folder, and a folder holds everything under it.
 */
export function matches(path: string, pattern: string): boolean {
  const clean = cleanPattern(pattern);
  if (!hasGlob(clean)) return clean === '' || path === clean || path.startsWith(`${clean}/`);
  if (posix.matchesGlob(path, clean)) return true;
  // 'dir/**' also names the folder itself.
  return clean.endsWith('/**') && path === clean.slice(0, -3);
}

/**
 * Resolves `pattern`, written relative to `base`, to a repository-relative
 * pattern. Undefined when it points outside the repository root.
 */
export function resolveFrom(base: string, pattern: string, rootAbsolute?: string): string | undefined {
  const clean = pattern.trim();
  if (clean.startsWith('/')) {
    if (rootAbsolute === undefined) return undefined;
    const relative = posix.relative(rootAbsolute.split('\\').join('/'), clean);
    return relative.startsWith('..') ? undefined : relative;
  }
  const joined = posix.normalize(posix.join(base === '' ? '.' : base, clean));
  const tidy = cleanPattern(joined);
  if (tidy === '..' || tidy.startsWith('../')) return undefined;
  return tidy;
}

/** True when the path is company/ or lies under it. */
export function isInCompany(path: string): boolean {
  const clean = cleanPattern(path);
  return clean === COMPANY || clean.startsWith(`${COMPANY}/`);
}

/** True when the folder holds company/: the repository root. */
export function holdsCompany(directory: string): boolean {
  return cleanPattern(directory) === '';
}

/** The folder of a repository-relative file path, '' for the root. */
export function folderOf(path: string): string {
  const folder = posix.dirname(path);
  return folder === '.' ? '' : folder;
}

/** String items of an array, or of a single string; undefined for anything else. */
export function strings(value: unknown): string[] | undefined {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value as string[];
  return undefined;
}

export function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
