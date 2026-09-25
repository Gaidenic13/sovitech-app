/**
 * Types for index.js (the SOVITECH ESLint plugin), for the TypeScript tests and
 * the lint-bans check that import it.
 */
import type { ESLint, Linter, Rule } from 'eslint';

declare const plugin: ESLint.Plugin & {
  meta: { name: string; version: string };
  rules: Record<string, Rule.RuleModule>;
  configs: { recommended: Linter.Config[] };
};

export default plugin;

/** The script extensions the bans read under apps/ and packages/. */
export declare const SCRIPT_EXTENSIONS: readonly string[];

/** The glob of packages/engine, where totals are made. */
export declare const ENGINE: string;

/** The glob of the rule 8 number parser, the one place text becomes a decimal (no-decimal-from-text). */
export declare const NUMBER_PARSER: string;

/** The glob of the formatting module, the one place a value is rounded (no-rounding-outside-formatting). */
export declare const FORMATTING_MODULE: string;

/** The reviewed readers that may call JSON.parse (no-json-parse), each with its reason. */
export declare const JSON_PARSE_REVIEWED: ReadonlyArray<{ files: string[]; reason: string }>;
