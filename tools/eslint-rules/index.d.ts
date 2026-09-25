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
