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

  // The SOVITECH lint bans (tools/eslint-rules/index.js). Keep this entry last.
  ...sovitech.configs.recommended,
);
