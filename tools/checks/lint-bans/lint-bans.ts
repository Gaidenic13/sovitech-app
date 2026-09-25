/**
 * The lint-bans check: the SOVITECH ESLint bans and the dependency-cruiser
 * boundaries, run so that nothing inside a file can switch them off.
 *
 * - ESLint runs only the `sovitech/*` rules, with inline configuration disabled,
 *   so an `eslint-disable` comment cannot hide a `?? 0`, a colour literal or a
 *   shadow. The only exemptions are the files in tools/eslint-rules/allowlist.js.
 * - HTML pages under apps/ and packages/, which ESLint does not read, are scanned
 *   for colour literals, colour classes and shadows the same way (index.html
 *   could otherwise carry a theme colour or an inline shadow).
 * - dependency-cruiser runs .dependency-cruiser.cjs on the "lint:deps" roots of the
 *   shared scan-roots list (tools/checks/scan-roots/roots.json), as `pnpm lint:deps` does.
 * - A file under apps/ or packages/ with a script or style extension that no ban
 *   reads fails (`lint-bans/unread-extension`; phase 0 review round 2, adversarial
 *   finding 12: a `.mts` module had no ESLint configuration at all, so it was free
 *   of the zero, number and filtered-sum bans).
 *
 * SVG files are not scanned: the brand logos are copied verbatim from the brand
 * with their SHA-256 (prompt 3 section 6, "Brand assets"), so their colours are
 * the brand's own, not new literals.
 *
 * Both functions take a root, so the self-test runs them on seeded inputs.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ESLint, type Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { cruise, depcruiseTargets } from '../../eslint-rules/depcruise-harness';
import sovitech, { SCRIPT_EXTENSIONS } from '../../eslint-rules/index.js';
import { rawDeclarations } from '../../eslint-rules/lib/css.js';
import {
  colourClassProblem,
  findColourLiterals,
  findNamedColours,
  isColourProperty,
  isShadowProperty,
  SHADOW_FREE_VALUES,
  shadowClassProblem,
} from '../../eslint-rules/lib/patterns.js';
import { readThemeColours } from '../../eslint-rules/lib/theme.js';
import { DEFAULT_IGNORES, listFiles, repoRoot } from '../lib';
import { topLevelRoots } from '../scan-roots/roots';

export const NAME = 'lint-bans';

/**
 * The folders the bans cover (tools/eslint-rules/README.md, "Scope"): the "lint-bans"
 * roots of the shared scan-roots list, apps/ and packages/.
 */
export const BAN_ROOTS: readonly string[] = topLevelRoots('lint-bans');

function banConfig(): Linter.Config[] {
  return [
    { name: 'lint-bans/ignores', ignores: [...DEFAULT_IGNORES] },
    { name: 'lint-bans/typescript', files: ['**/*.{ts,tsx,mts,cts}'], languageOptions: { parser: tseslint.parser } },
    ...sovitech.configs.recommended,
  ];
}

/**
 * Extensions of files that carry code or styles a ban must read. ESLint reads the
 * script extensions of the plugin's configuration (SCRIPT_EXTENSIONS) and `.css`, and
 * the markup scan reads `.html`, `.htm` and `.xhtml`; a file under apps/ or packages/
 * with any other extension below is read by no ban, so it fails the check. The list
 * names what Vite, TypeScript and their plugins can compile or run.
 */
export const EXTENSIONS_A_BAN_MUST_READ: readonly string[] = [
  // Scripts and components
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts', 'es', 'es6', 'jsm', 'vue', 'svelte', 'astro', 'mdx', 'marko',
  'coffee', 'litcoffee', 'civet', 'elm', 'res', 'resi', 'wat',
  // Styles
  'css', 'scss', 'sass', 'less', 'styl', 'stylus', 'pcss', 'postcss', 'sss',
  // Markup
  'html', 'htm', 'xhtml',
];

/** The id of a file no ban reads. */
export const UNREAD_ID = 'lint-bans/unread-extension';

/** The extension of a path, lower case: `ts` for `a.d.ts`, `mts` for `total.mts`. */
function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Files under the ban roots whose extension says they carry code, styles or markup,
 * but which no ban read.
 */
export async function unreadFiles(root: string, read: readonly string[]): Promise<string[]> {
  const targets = BAN_ROOTS.filter((folder) => existsSync(join(root, folder)));
  const files = await listFiles(targets.map((folder) => `${folder}/**`), { cwd: root });
  const seen = new Set(read);
  return files
    .filter((file) => EXTENSIONS_A_BAN_MUST_READ.includes(extensionOf(file)) && !seen.has(file))
    .map(
      (file) =>
        `${file}:1:1 ${UNREAD_ID}: no lint ban reads .${extensionOf(file)} files, so a zero fallback, a coercion or a colour literal here would pass. Write it as ${SCRIPT_EXTENSIONS.map((extension) => `.${extension}`).join(', ')}, .css or .html, or extend the bans to read it (tools/eslint-rules/README.md, "Scope").`,
    );
}

export interface BanOutcome {
  /** Files ESLint linted, plus the HTML pages scanned. */
  files: number;
  /** One line per problem: file:line:column rule message. */
  problems: string[];
  /** The files read under each ban root (apps, packages), relative to the root. */
  paths: string[];
}

/** The id of an empty-scope problem (phase 0 review, finding 17). */
export const SCOPE_ID = 'lint-bans/scope';

/** Runs the SOVITECH lint bans on `root`'s apps/ and packages/ folders, with inline configuration off. */
export async function lintBans(root: string): Promise<BanOutcome> {
  const targets = BAN_ROOTS.filter((folder) => existsSync(join(root, folder)));
  if (targets.length === 0) return { files: 0, problems: [], paths: [] };
  const [code, markup] = await Promise.all([lintCode(root, targets), scanMarkup(root)]);
  const paths = [...code.paths, ...markup.paths];
  return {
    files: code.files + markup.files,
    problems: [...code.problems, ...markup.problems, ...(await unreadFiles(root, paths))],
    paths,
  };
}

/**
 * The check never passes on nothing (phase 0 review, finding 17): each ban root
 * (apps/, packages/) must hold at least one file the bans read, and the boundary
 * run, when given, must have read at least one module. Before the review, a tree
 * without apps/ and packages/ passed with 0 files.
 */
export function scopeProblems(bans: Pick<BanOutcome, 'paths'>, boundaryModules?: number): string[] {
  const problems = BAN_ROOTS.filter((folder) => !bans.paths.some((path) => path.startsWith(`${folder}/`))).map(
    (folder) => `${folder}/: ${SCOPE_ID}: no file was read under ${folder}/; the bans cover apps/ and packages/ and never pass on nothing.`,
  );
  if (boundaryModules === 0) problems.push(`dependency-cruiser: ${SCOPE_ID}: no module was read on the lint:deps roots.`);
  return problems;
}

async function lintCode(root: string, targets: string[]): Promise<BanOutcome> {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: banConfig(),
    allowInlineConfig: false,
    errorOnUnmatchedPattern: false,
    cache: false,
  });
  const results = await eslint.lintFiles(targets);
  const problems: string[] = [];
  const paths: string[] = [];
  for (const result of results) {
    const file = relative(root, result.filePath).split('\\').join('/');
    paths.push(file);
    for (const message of result.messages) {
      if (message.severity !== 2 && message.fatal !== true) continue;
      problems.push(`${file}:${message.line}:${message.column} ${message.ruleId ?? 'parse error'}: ${message.message}`);
    }
  }
  return { files: results.length, problems, paths };
}

const MARKUP = BAN_ROOTS.map((folder) => `${folder}/**/*.{html,htm,xhtml}`);
const COLOUR_ID = 'lint-bans/html-colour-literals';
const SHADOW_ID = 'lint-bans/html-shadows';

/** Replaces HTML comments with spaces, keeping every offset and line in place. */
function blankComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ' '));
}

function position(text: string, index: number): string {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  return `${line}:${index - before.lastIndexOf('\n')}`;
}

/** Scans HTML pages for colour literals, colour classes and shadows. */
export async function scanMarkup(root: string): Promise<BanOutcome> {
  const files = await listFiles(MARKUP, { cwd: root });
  const themeColours = new Set(readThemeColours());
  const problems: string[] = [];
  for (const file of files) {
    const text = blankComments(readFileSync(join(root, file), 'utf8'));
    const at = (index: number, id: string, message: string) => problems.push(`${file}:${position(text, index)} ${id}: ${message}`);

    for (const found of findColourLiterals(text)) {
      if (/(?:href|src|action|xlink:href)\s*=\s*["']?$/i.test(text.slice(0, found.index))) continue;
      at(found.index, COLOUR_ID, `Colour literal \`${found.literal}\` outside packages/ui/src/tokens.css (prompt 3 section 6, "Brand assets").`);
    }

    const styles = [
      ...text.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi),
      ...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi),
    ];
    for (const match of styles) {
      const content = match[1] ?? match[2] ?? '';
      for (const { property, value } of rawDeclarations(content)) {
        if (isColourProperty(property) && !isShadowProperty(property)) {
          for (const colour of findNamedColours(value)) {
            at(match.index, COLOUR_ID, `Colour literal \`${colour}\` outside packages/ui/src/tokens.css (prompt 3 section 6, "Brand assets").`);
          }
        }
        const shadowFree = SHADOW_FREE_VALUES.has(value.trim().toLowerCase());
        if ((isShadowProperty(property) && !shadowFree) || /\bdrop-shadow\(/i.test(value)) {
          at(match.index, SHADOW_ID, `\`${property}\` draws a shadow. The brand has no shadows (prompt 3 section 5.1).`);
        }
      }
    }

    for (const match of text.matchAll(/\sclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      for (const token of (match[1] ?? match[2] ?? '').split(/\s+/).filter((part) => part !== '')) {
        const colour = colourClassProblem(token, themeColours);
        if (colour !== undefined) at(match.index, COLOUR_ID, `\`${colour}\` names a colour outside the theme tokens (prompt 3 section 6, "Brand assets").`);
        const shadow = shadowClassProblem(token, true, themeColours);
        if (shadow !== undefined) at(match.index, SHADOW_ID, `\`${shadow}\` draws a shadow; focus rings use outline (prompt 3 section 6).`);
      }
    }
  }
  return { files: files.length, problems, paths: [...files] };
}

export interface BoundaryOutcome {
  /** Modules dependency-cruiser read. */
  modules: number;
  /** One line per violation: rule: from -> to. */
  problems: string[];
}

/** Runs the dependency-cruiser boundaries on the repository's `lint:deps` scan roots. */
export async function checkBoundaries(root: string = repoRoot, targets: readonly string[] = depcruiseTargets()): Promise<BoundaryOutcome> {
  const outcome = await cruise(root, targets);
  return {
    modules: outcome.modules.length,
    problems: outcome.violations.map((violation) => `${violation.rule}: ${violation.from} -> ${violation.to}`),
  };
}
