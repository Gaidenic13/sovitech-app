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
 * - no-number-coercion: Number(), parseFloat(), parseInt(), unary +, bitwise and
 *   arithmetic coercion (`x - 0`, `x * 1`) and aliases of Number outside the rule 8
 *   number parser and the formatting module;
 * - no-decimal-from-text: a decimal built from text outside the rule 8 number parser
 *   (NUMBER_PARSER; guardrails rule 8, "Parsing");
 * - no-json-parse: JSON.parse on text outside the reviewed readers (JSON_PARSE_REVIEWED;
 *   guardrails rules 1 and 8);
 * - no-rounding-outside-formatting: rounding outside the formatting module
 *   (FORMATTING_MODULE; guardrails rule 9, "Rounding");
 * - no-zero-tally: tallies that start every key at zero (guardrails rule 1, "Zero is a value");
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
import noDecimalFromText from './rules/no-decimal-from-text.js';
import noFilteredSum from './rules/no-filtered-sum.js';
import noJsonParse from './rules/no-json-parse.js';
import noNumberCoercion from './rules/no-number-coercion.js';
import noRoundingOutsideFormatting from './rules/no-rounding-outside-formatting.js';
import noShadows from './rules/no-shadows.js';
import noTotalOutsideEngine from './rules/no-total-outside-engine.js';
import noZeroFallback from './rules/no-zero-fallback.js';
import noZeroTally from './rules/no-zero-tally.js';

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

/**
 * The one rule 8 number parser (prompt 3 section 6): the only place text becomes a
 * decimal (no-decimal-from-text). An exempt scope of that rule, recorded in the loosening
 * check's exception-list snapshot (lint-bans.decimal-from-text-exempt).
 */
export const NUMBER_PARSER = 'packages/registry/src/number-parser/**';

/**
 * The formatting module (prompt 3 section 6, view-model server side), which owns rounding
 * at display (guardrails rule 9): the only place a value is rounded
 * (no-rounding-outside-formatting). An exempt scope of that rule, recorded in the loosening
 * check's exception-list snapshot (lint-bans.rounding-exempt).
 */
export const FORMATTING_MODULE = 'packages/view-model/src/formatting/**';

/**
 * The reviewed readers that may call JSON.parse (no-json-parse), each with why what it
 * parses is not document or AI text, or how it validates what comes out. An allow list in
 * the loosening check's exception-list snapshot (lint-bans.json-parse-reviewed): an entry
 * added after the snapshot records the list waits for the approver.
 * @type {ReadonlyArray<{ files: string[]; reason: string }>}
 */
export const JSON_PARSE_REVIEWED = [
  {
    files: ['packages/registry/src/validation/snapshot.ts'],
    reason:
      "Reads the loosening check's own recorded snapshot files (packages/registry/src/snapshots/), written by tools/checks/loosening/write-baseline.ts, and validates them with their schema (snapshotSchema). No document, AI output or owner text passes through it.",
  },
  {
    files: ['packages/registry/src/test-utils/test-utils.test.ts'],
    reason:
      "A unit test reading the result files its own child Vitest run wrote in a temporary folder (TEST outcomes as text). No document, AI output or owner text passes through it.",
  },
];
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
    'no-decimal-from-text': noDecimalFromText,
    'no-json-parse': noJsonParse,
    'no-rounding-outside-formatting': noRoundingOutsideFormatting,
    'no-zero-tally': noZeroTally,
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
    // Phase 1 (the rest of adversarial finding 7, phase 0 review round 2): decimals from text
    // only in the rule 8 parser; JSON.parse only in reviewed readers; rounding only in the
    // formatting module; no tally that starts every key at zero.
    name: 'sovitech/decimals-through-the-parser',
    files: APP_CODE,
    ignores: [NUMBER_PARSER, ...allowlistedFiles('no-decimal-from-text')],
    rules: { 'sovitech/no-decimal-from-text': 'error' },
  },
  {
    name: 'sovitech/text-parsed-by-reviewed-readers',
    files: APP_CODE,
    ignores: [...JSON_PARSE_REVIEWED.flatMap((entry) => entry.files), ...allowlistedFiles('no-json-parse')],
    rules: { 'sovitech/no-json-parse': 'error' },
  },
  {
    name: 'sovitech/rounding-at-display',
    files: APP_CODE,
    ignores: [FORMATTING_MODULE, ...allowlistedFiles('no-rounding-outside-formatting')],
    rules: { 'sovitech/no-rounding-outside-formatting': 'error' },
  },
  {
    name: 'sovitech/no-zero-tallies',
    files: APP_CODE,
    ignores: allowlistedFiles('no-zero-tally'),
    rules: { 'sovitech/no-zero-tally': 'error' },
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
