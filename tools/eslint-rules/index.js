/**
 * The SOVITECH ESLint plugin: the lint bans of prompt 3 sections 7 and 10
 * ("Phase 0"). eslint.config.js spreads `configs.recommended` last.
 *
 * Rules (each documented in tools/eslint-rules/README.md, each with a RuleTester
 * test next to it):
 * - no-zero-fallback: `?? 0`, `|| 0` and the other ways of putting a zero where a
 *   value may be missing, zero constants included (guardrails rule 1, "Unknown propagates");
 * - no-filtered-sum: totals that drop missing values first and add up the rest,
 *   and loops and reducers that branch on a missing value while they add up
 *   (guardrails rule 1, "Unknown propagates"); totals go through the engine's
 *   unknownPolicy helper (phase 5);
 * - no-total-outside-engine: any total outside packages/engine, which is where
 *   that helper lives (guardrails rule 1; 2.1 `calculated`);
 * - no-computed-import: module paths computed at run time, which dependency-cruiser
 *   cannot see (prompt 3 sections 5.4 and 6);
 * - no-number-coercion: Number(), parseFloat(), parseInt(), unary + and bitwise
 *   coercion outside the rule 8 number parser and the formatting module;
 * - no-colour-literals, css-no-colour-literals: colours only from
 *   packages/ui/src/tokens.css;
 * - no-shadows, css-no-shadows: box-shadow and the Tailwind shadow and ring utilities.
 *
 * Scope: all JS and TS in apps/ and packages/ (engineering values cannot be told
 * apart from other numbers at lint time), and all CSS there. The only exemptions
 * are the files in allowlist.js. tools/checks/lint-bans/ runs the same bans with
 * inline `eslint-disable` comments switched off.
 */
import css from '@eslint/css';
import { allowlistedFiles } from './allowlist.js';
import { readThemeColours } from './lib/theme.js';
import cssNoColourLiterals from './rules/css-no-colour-literals.js';
import cssNoShadows from './rules/css-no-shadows.js';
import noColourLiterals from './rules/no-colour-literals.js';
import noComputedImport from './rules/no-computed-import.js';
import noFilteredSum from './rules/no-filtered-sum.js';
import noNumberCoercion from './rules/no-number-coercion.js';
import noShadows from './rules/no-shadows.js';
import noTotalOutsideEngine from './rules/no-total-outside-engine.js';
import noZeroFallback from './rules/no-zero-fallback.js';

/**
 * Code in the app and its packages, in every script extension the toolchain runs.
 * `.mts` and `.cts` were added after the phase 0 review round 2 (adversarial
 * finding 12): TypeScript and Vite accept them, and they had no ESLint configuration.
 * The lint-bans check fails on any other script extension under apps/ or packages/.
 */
export const SCRIPT_EXTENSIONS = ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts'];
const APP_CODE = [`apps/**/*.{${SCRIPT_EXTENSIONS.join(',')}}`, `packages/**/*.{${SCRIPT_EXTENSIONS.join(',')}}`];

/** Where totals are made: the engine, with its unknownPolicy helper (prompt 3 section 6). */
export const ENGINE = 'packages/engine/**';
const APP_CSS = ['apps/**/*.css', 'packages/**/*.css'];

/** Colour names the Tailwind theme defines, so `bg-surface` reads as a token. */
const themeColours = readThemeColours();

/** @type {import('eslint').ESLint.Plugin & { rules: Record<string, import('eslint').Rule.RuleModule>, configs: Record<string, import('eslint').Linter.Config[]> }} */
const plugin = {
  meta: { name: 'eslint-plugin-sovitech', version: '0.1.0' },
  rules: {
    'no-zero-fallback': noZeroFallback,
    'no-filtered-sum': noFilteredSum,
    'no-total-outside-engine': noTotalOutsideEngine,
    'no-computed-import': noComputedImport,
    'no-number-coercion': noNumberCoercion,
    'no-colour-literals': noColourLiterals,
    'no-shadows': noShadows,
    'css-no-colour-literals': cssNoColourLiterals,
    'css-no-shadows': cssNoShadows,
  },
  configs: {},
};

plugin.configs.recommended = [
  {
    name: 'sovitech/recommended',
    plugins: { sovitech: plugin },
  },
  {
    // The shared config parses .ts and .tsx; .jsx needs JSX switched on for espree.
    name: 'sovitech/jsx',
    files: ['**/*.jsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  {
    name: 'sovitech/unknown-stays-unknown',
    files: APP_CODE,
    ignores: allowlistedFiles('no-zero-fallback'),
    rules: { 'sovitech/no-zero-fallback': 'error' },
  },
  {
    name: 'sovitech/totals-keep-unknowns',
    files: APP_CODE,
    ignores: allowlistedFiles('no-filtered-sum'),
    rules: { 'sovitech/no-filtered-sum': 'error' },
  },
  {
    name: 'sovitech/totals-in-the-engine',
    files: APP_CODE,
    ignores: [ENGINE, ...allowlistedFiles('no-total-outside-engine')],
    rules: { 'sovitech/no-total-outside-engine': 'error' },
  },
  {
    name: 'sovitech/module-paths-in-the-code',
    files: APP_CODE,
    ignores: allowlistedFiles('no-computed-import'),
    rules: { 'sovitech/no-computed-import': 'error' },
  },
  {
    name: 'sovitech/numbers-through-the-parser',
    files: APP_CODE,
    ignores: allowlistedFiles('no-number-coercion'),
    rules: { 'sovitech/no-number-coercion': 'error' },
  },
  {
    name: 'sovitech/brand-code',
    files: APP_CODE,
    ignores: [...allowlistedFiles('no-colour-literals'), ...allowlistedFiles('no-shadows')],
    rules: {
      'sovitech/no-colour-literals': ['error', { themeColours }],
      'sovitech/no-shadows': ['error', { themeColours }],
    },
  },
  {
    // Tailwind's at-rules are not standard CSS, so CSS is parsed in tolerant mode;
    // the CSS rules read what the parser leaves raw (lib/css.js).
    name: 'sovitech/brand-css',
    files: APP_CSS,
    plugins: { css },
    language: 'css/css',
    languageOptions: { tolerant: true },
    rules: { 'sovitech/css-no-shadows': 'error' },
  },
  {
    name: 'sovitech/brand-css-colours',
    files: APP_CSS,
    ignores: allowlistedFiles('css-no-colour-literals'),
    rules: { 'sovitech/css-no-colour-literals': ['error', { themeColours }] },
  },
];

export default plugin;
