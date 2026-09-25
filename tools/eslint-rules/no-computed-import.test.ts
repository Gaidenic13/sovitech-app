/**
 * sovitech/no-computed-import: every module path is written in the code, so
 * dependency-cruiser sees every edge the package boundaries check (prompt 3
 * sections 5.4 and 6; phase 0 review round 2, the second verification's finding 0,
 * where `await import(dir + 'source')` reached the gate issuer unseen).
 */
import plugin from './index.js';
import { codeRuleTester } from './test-helpers';

const rule = plugin.rules['no-computed-import'];
if (rule === undefined) throw new Error('sovitech/no-computed-import is not registered');

const one = (messageId: string) => [{ messageId }];

codeRuleTester().run('sovitech/no-computed-import', rule, {
  valid: [
    "import { a } from './a';",
    "export { a } from './a';",
    "const m = await import('./a');",
    'const m = await import(`./a`);',
    "const m = require('./a');",
    "const path = require.resolve('./a');",
    // A local function named require or eval is not the loader.
    'function require(name: string) { return name; } const m = require(dir + name);',
    'const evaluate = (eval_: (x: string) => number) => eval_(text);',
    "import { evaluate as eval2 } from './formula'; const v = eval2(x);",
    'type R = typeof import("./a");',
    "const meta = import.meta.url;",
  ],
  invalid: [
    // The second verification's probe (verify0b/deps/ws/apps/api/src/probe-bypass-dynamic.ts).
    { code: "const dir = '../../../packages/registry/src/gates/'; export async function f() { const m = await import(dir + 'source'); return m.issueTestOverrideSource; }", errors: one('computedImport') },
    { code: 'const m = await import(path);', errors: one('computedImport') },
    { code: 'const m = await import(`./locales/${lang}.ts`);', errors: one('computedImport') },
    { code: "const p = './a'; const m = await import(p);", errors: one('computedImport') },
    { code: "const m = await import(/* @vite-ignore */ base + '/a');", errors: one('computedImport') },
    { code: 'const m = require(path);', errors: one('computedRequire') },
    { code: "const m = require('./' + name);", errors: one('computedRequire') },
    { code: 'const m = module.require(path);', errors: one('computedRequire') },
    { code: 'const load = require; const m = load(path);', errors: one('computedRequire') },
    { code: "import { createRequire } from 'node:module'; const load = createRequire(import.meta.url); const m = load('./a');", errors: one('createRequire') },
    { code: "import module from 'node:module'; const load = module.createRequire(import.meta.url);", errors: one('createRequire') },
    { code: "const modules = import.meta.glob('./gates/*.ts');", errors: one('globImport') },
    { code: "const modules = import.meta.globEager('./gates/*.ts');", errors: one('globImport') },
    { code: 'const v = eval(text);', errors: one('codeFromText') },
    { code: 'const v = globalThis.eval(text);', errors: one('codeFromText') },
    { code: "const load = new Function('p', 'return import(p)');", errors: one('codeFromText') },
    { code: "const load = Function('p', 'return import(p)');", errors: one('codeFromText') },
  ],
});
