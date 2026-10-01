/**
 * Writes the UI kit's render harness pages (tests/e2e/pages/ui/*.html) from kit.tsx, or, with
 * `--check`, fails when a file on disk differs from what it would write or the harness list
 * (kit-pages.ts) does not name exactly the generated pages. ui-kit.spec.ts runs the check, so the
 * pages always show the kit's current markup.
 *
 *   pnpm exec tsx --tsconfig tests/e2e/pages/ui/tsconfig.generate.json tests/e2e/pages/ui/generate.ts [--check]
 *
 * It runs under tsx, not in the Playwright runner: Playwright compiles JSX into its component-test
 * form, which react-dom/server cannot render.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIT_PAGES, kitPageHtml } from './kit';
import { UI_KIT_PAGES } from './kit-pages';

const PAGES = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const problems: string[] = [];

const generated = KIT_PAGES.map((page) => page.file).sort();
const listed = UI_KIT_PAGES.map((page) => page.file).sort();
if (JSON.stringify(generated) !== JSON.stringify(listed)) {
  problems.push(`kit-pages.ts lists ${listed.join(', ')}; kit.tsx generates ${generated.join(', ')}`);
}

for (const page of KIT_PAGES) {
  const path = join(PAGES, page.file);
  const html = kitPageHtml(page);
  if (check) {
    if (!existsSync(path)) problems.push(`tests/e2e/pages/${page.file} is missing`);
    else if (readFileSync(path, 'utf8') !== html) problems.push(`tests/e2e/pages/${page.file} is not the generator's current output`);
  } else {
    writeFileSync(path, html);
    process.stdout.write(`wrote tests/e2e/pages/${page.file}\n`);
  }
}

if (problems.length > 0) {
  process.stderr.write(`${problems.join('\n')}\nRegenerate: pnpm exec tsx --tsconfig tests/e2e/pages/ui/tsconfig.generate.json tests/e2e/pages/ui/generate.ts\n`);
  process.exitCode = 1;
} else if (check) {
  process.stdout.write(`${String(KIT_PAGES.length)} UI kit pages match kit.tsx\n`);
}
