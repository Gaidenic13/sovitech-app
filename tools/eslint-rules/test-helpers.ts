/**
 * Shared set-up for the RuleTester tests of the SOVITECH lint bans. Not a test
 * file itself: the unit Vitest project collects only *.test.ts.
 */
import css from '@eslint/css';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/** A RuleTester for TypeScript and TSX code (JSX switched on). */
export function codeRuleTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });
}

/**
 * A RuleTester with type information, as `pnpm lint:eslint` lints (projectService),
 * rooted at a folder with its own tsconfig.json. Each case sets `filename` to a file
 * in that folder, so that its imports resolve.
 */
export function typedRuleTester(tsconfigRootDir: string): RuleTester {
  return new RuleTester({
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir },
    },
  });
}

/** A RuleTester for CSS, parsed as the repository parses it (tolerant, for Tailwind at-rules). */
export function cssRuleTester(): RuleTester {
  return new RuleTester({
    plugins: { css },
    language: 'css/css',
    languageOptions: { tolerant: true },
  });
}

/** The theme colour names the tests pass as the rule option, shaped like the real theme. */
export const TEST_THEME_COLOURS: readonly string[] = ['bg', 'surface', 'accent', 'text-primary', 'green'];
