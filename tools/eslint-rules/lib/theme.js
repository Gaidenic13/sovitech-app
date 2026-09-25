/**
 * Reads the colour names the app theme defines for Tailwind (`--color-<name>` in
 * an @theme block), so a class such as `bg-surface` counts as a token and a
 * class such as `bg-red-500` does not.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** The files that may declare theme colours: the tokens file and the web app's Tailwind entry. */
export const THEME_FILES = ['packages/ui/src/tokens.css', 'apps/web/src/styles.css'];

/**
 * @param {string} root
 * @returns {string[]} sorted, distinct colour names
 */
export function readThemeColours(root = repoRoot) {
  const names = new Set();
  for (const file of THEME_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const match of text.matchAll(/--color-([a-z0-9][a-z0-9-]*)\s*:/gi)) {
      if (match[1] !== undefined) names.add(match[1].toLowerCase());
    }
  }
  return [...names].sort();
}
