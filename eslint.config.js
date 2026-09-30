// ESLint flat config for the SOVITECH App.
//
// Shared file: the lint builder does not edit it. Lint bans live in the local
// plugin at tools/eslint-rules/index.js, whose `configs.recommended` is spread
// last below. Package boundaries live in .dependency-cruiser.cjs.
// company/** is never linted (build-readiness decision 12; prompt 3 section 6).
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import sovitech from './tools/eslint-rules/index.js';

export default defineConfig(
  globalIgnores([
    'company/**',
    '**/node_modules/**',
    '**/dist/**',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    'services/**',
    // Seeded bad inputs for the checks' self-tests are wrong on purpose.
    'tools/**/seeded/**',
  ]),

  {
    name: 'sovitech/js',
    files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    extends: [js.configs.recommended],
  },

  {
    name: 'sovitech/typescript',
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        // Type information for rules that need it (the lint bans on engineering values).
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    // Files that no tsconfig.json includes are linted without type information.
    name: 'sovitech/typescript-untyped',
    files: ['apps/web/vite.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  {
    name: 'sovitech/node',
    files: [
      '*.{js,cjs,mjs,ts,mts,cts}',
      'apps/api/**/*.{ts,mts,cts}',
      'packages/{domain,registry,engine,view-model,db,ai}/**/*.{ts,mts,cts}',
      'tools/**/*.{js,ts,mts,cts}',
      'tests/**/*.{ts,mts,cts}',
      'evals/**/*.{ts,mts,cts}',
      'fixtures/**/*.{ts,mts,cts}',
      'apps/web/vite.config.ts',
    ],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    name: 'sovitech/commonjs',
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },

  {
    name: 'sovitech/browser',
    files: ['apps/web/src/**/*.{ts,tsx,mts,cts}', 'packages/{ui,viewer}/src/**/*.{ts,tsx,mts,cts}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: { globals: { ...globals.browser } },
  },

  {
    // The Anthropic SDK is imported only by the AI boundary's transport (prompt 3 section 6:
    // packages/ai is "the Anthropic boundary"; ADRs 0021 and 0023), and by that file's own test.
    // dependency-cruiser cannot see the import: its options.exclude hides third-party modules from
    // the boundaries, and narrowing that allow list is an allow-entry change the loosening check
    // refuses without the approver (phase 2). packages/ai/src/transport.test.ts pins the same
    // boundary over the sources; tools/eslint-rules/anthropic-sdk-boundary.test.ts proves this block.
    // A specifier computed at run time is outside this block's sight; in apps/ and packages/
    // sovitech/no-computed-import refuses it, elsewhere only the source-text scan in
    // packages/ai/src/transport.test.ts does (tools/eslint-rules/anthropic-sdk-boundary.test.ts, header).
    name: 'sovitech/anthropic-sdk-boundary',
    files: ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    ignores: ['packages/ai/src/transport.ts', 'packages/ai/src/transport.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@anthropic-ai/*', '@anthropic-ai/**'],
              message: 'The Anthropic SDK is reached only through packages/ai/src/transport.ts (the AI boundary; ADR 0023).',
            },
          ],
        },
      ],
      // no-restricted-imports sees static imports and re-exports only: a dynamic import(), a
      // require() (plain, through module or createRequire) and TypeScript's `import x = require()`
      // reach the SDK too (phase 2 review, adversarial finding "The SDK boundary misses dynamic
      // imports and require").
      'no-restricted-syntax': [
        'error',
        ...[
          "ImportExpression[source.value=/^@anthropic-ai\\W/]",
          "ImportExpression[source.type='TemplateLiteral'][source.quasis.0.value.cooked=/^@anthropic-ai\\W/]",
          "CallExpression[arguments.0.value=/^@anthropic-ai\\W/]",
          "CallExpression[arguments.0.type='TemplateLiteral'][arguments.0.quasis.0.value.cooked=/^@anthropic-ai\\W/]",
          "TSExternalModuleReference[expression.value=/^@anthropic-ai\\W/]",
        ].map((selector) => ({
          selector,
          message: 'The Anthropic SDK is reached only through packages/ai/src/transport.ts (the AI boundary; ADR 0023), by no route: import, import(), require().',
        })),
      ],
    },
  },

  // The SOVITECH lint bans (tools/eslint-rules/index.js). Keep this entry last.
  ...sovitech.configs.recommended,
);
