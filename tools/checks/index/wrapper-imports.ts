/**
 * How a case file reaches the pending wrapper, and whether a text names a case
 * id. Kept apart from case-files.ts, which loads the TypeScript parser, so the
 * Vitest run guard (tools/vitest/guardrail-run-guard.ts) can use it cheaply.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { CASE_DIRS } from './guardrail-index';

/** The pending wrapper, without its extension, relative to the root. */
export const PENDING_WRAPPER = `${CASE_DIRS.T}/_support/pending`;

/** Support code for T cases; Vitest does not collect it (vitest.config.ts). */
export const T_SUPPORT_DIR = `${CASE_DIRS.T}/_support`;

/** Reads a file by its root-relative path; undefined when it does not exist. */
export type ReadFile = (rootRelativePath: string) => string | undefined;

const IMPORT_SPECIFIER = /\b(?:from|import|require)\s*\(?\s*(['"])([^'"\n]+)\1/g;
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/;
const MAX_SUPPORT_DEPTH = 8;

/** A reader for files under `root`. */
export function fileReader(root: string): ReadFile {
  return (path) => {
    const absolute = join(root, path);
    return existsSync(absolute) && statSync(absolute).isFile() ? readFileSync(absolute, 'utf8') : undefined;
  };
}

/** Every module specifier in the text, in order: static and dynamic imports, re-exports, require. */
export function importSpecifiers(text: string): string[] {
  return [...text.matchAll(IMPORT_SPECIFIER)].map((match) => match[2] ?? '').filter((specifier) => specifier !== '');
}

/**
 * True when the file imports the pending wrapper, directly or through other
 * modules under tests/guardrails/_support/. Paths are root-relative.
 */
export function importsPendingWrapper(path: string, text: string, readFile: ReadFile): boolean {
  return reachesPendingWrapper(path, text, readFile, new Set([path]), 0);
}

function reachesPendingWrapper(
  path: string,
  text: string,
  readFile: ReadFile,
  visited: Set<string>,
  depth: number,
): boolean {
  for (const specifier of importSpecifiers(text)) {
    if (!specifier.startsWith('.')) continue;
    const target = posix.normalize(posix.join(posix.dirname(path), specifier));
    const base = target.replace(SOURCE_EXTENSION, '');
    if (base === PENDING_WRAPPER || base === `${PENDING_WRAPPER}/index`) return true;
    if (base !== T_SUPPORT_DIR && !base.startsWith(`${T_SUPPORT_DIR}/`)) continue;
    if (depth >= MAX_SUPPORT_DEPTH) continue;
    for (const candidate of [target, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
      if (visited.has(candidate)) continue;
      const content = readFile(candidate);
      if (content === undefined) continue;
      visited.add(candidate);
      if (reachesPendingWrapper(candidate, content, readFile, visited, depth + 1)) return true;
      break;
    }
  }
  return false;
}

/**
 * The modules under tests/guardrails/_support/ that a file reaches through its
 * relative imports, directly or through other support modules, as root-relative
 * paths of files that exist, in the order first reached. Paths are root-relative.
 */
export function supportModulesReached(path: string, text: string, readFile: ReadFile): string[] {
  const reached: string[] = [];
  const visited = new Set<string>([path]);
  const walk = (from: string, source: string, depth: number): void => {
    for (const specifier of importSpecifiers(source)) {
      if (!specifier.startsWith('.')) continue;
      const target = posix.normalize(posix.join(posix.dirname(from), specifier));
      const base = target.replace(SOURCE_EXTENSION, '');
      if (base !== T_SUPPORT_DIR && !base.startsWith(`${T_SUPPORT_DIR}/`)) continue;
      if (depth >= MAX_SUPPORT_DEPTH) continue;
      for (const candidate of [target, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
        if (visited.has(candidate)) break;
        const content = readFile(candidate);
        if (content === undefined) continue;
        visited.add(candidate);
        reached.push(candidate);
        walk(candidate, content, depth + 1);
        break;
      }
    }
  };
  walk(path, text, 0);
  return reached;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when `text` holds the id as a whole token: G1-1 is not found in G1-10, G7-2 not in G7-2a. */
export function namesId(text: string, id: string): boolean {
  return new RegExp(`(?<![\\w-])${escapeRegExp(id)}(?![\\w-])`).test(text);
}
