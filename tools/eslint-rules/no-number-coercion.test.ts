/**
 * sovitech/no-number-coercion: numbers are read only by the rule 8 parser and
 * shown only by the formatting module (guardrails rules 1, 8 and 9; prompt 3 section 7).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin from './index.js';
import { codeRuleTester, typedRuleTester } from './test-helpers';

const rule = plugin.rules['no-number-coercion'];
if (rule === undefined) throw new Error('sovitech/no-number-coercion is not registered');

const one = (messageId: string) => [{ messageId }];

codeRuleTester().run('sovitech/no-number-coercion', rule, {
  valid: [
    'const ok = Number.isFinite(x);',
    'const ok = Number.isInteger(x) && Number.isSafeInteger(x);',
    'const max = Number.MAX_SAFE_INTEGER;',
    'const e = Number.EPSILON;',
    'let n: Number;',
    'type N = typeof Number;',
    'function f(n: number): Number { return n; }',
    'const neg = -x;',
    'const one = +1;',
    'const sum = x + y;',
    "const s = String(x) + '';",
    'const d = new Decimal(x);',
    'const bits = a | b;',
    'const masked = x | 1;',
    'const r = parser.parseFloat(x);',
    'const o = { Number: 1, parseInt: 2 };',
    'const v = o.Number;',
    'function g() { const Number = (v: string) => v; return Number(y); }',
    "import { parseInt } from './number-parser';\nparseInt(x);",
    'class A { parseFloat() { return 1; } }',
    "const t = typeof x === 'number';",
    // Arithmetic that changes a number, and literal arithmetic.
    'const d = x - 1;',
    'const e = x * 2;',
    'const f = 1 + 1;',
    'const g = 2 - 0;',
    'const h = x / 2;',
    'const i = index + 1;',
    'function k(self: { Number: number }) { return self.Number; }',
    "const o = { Number: 1 }; const { Number: n } = o;",
  ],
  invalid: [
    { code: 'const n = Number(x);', errors: one('call') },
    { code: 'const n = new Number(x);', errors: one('call') },
    { code: 'const n = parseFloat(x);', errors: one('call') },
    { code: 'const n = parseInt(x, 10);', errors: one('call') },
    { code: 'const n = Number.parseFloat(x);', errors: one('member') },
    { code: 'const n = Number.parseInt(x, 10);', errors: one('member') },
    { code: 'const n = +x;', errors: one('unaryPlus') },
    { code: "const n = +'34.5';", errors: one('unaryPlus') },
    { code: 'const n = +new Date();', errors: one('unaryPlus') },
    { code: 'const ns = list.map(Number);', errors: one('reference') },
    { code: 'const ns = list.map(parseFloat);', errors: one('reference') },
    { code: 'const toNumber = Number;', errors: one('reference') },
    { code: 'const n = globalThis.Number(x);', errors: one('global') },
    { code: 'const n = window.parseFloat(x);', errors: one('global') },
    { code: "const n = globalThis['parseInt'](x);", errors: one('global') },
    { code: 'const n = x | 0;', errors: one('bitwise') },
    { code: 'const n = 0 | x;', errors: one('bitwise') },
    { code: 'const n = x >>> 0;', errors: one('bitwise') },
    { code: 'const n = ~~x;', errors: one('bitwise') },
    { code: 'const Cell = () => <td>{Number(value)}</td>;', errors: one('call') },
    {
      code: 'const a = Number(x) + parseInt(y, 10);',
      errors: [{ messageId: 'call' }, { messageId: 'call' }],
    },
    // Phase 1 (the rest of adversarial finding 7, phase 0 review round 2): coercion by arithmetic
    // that changes no number, and Number reached by another name.
    { code: 'const n = x - 0;', errors: one('identity') },
    { code: 'const n = x * 1;', errors: one('identity') },
    { code: 'const n = 1 * x;', errors: one('identity') },
    { code: 'const n = x / 1;', errors: one('identity') },
    { code: 'const n = x + 0;', errors: one('identity') },
    { code: 'const n = 0 + x;', errors: one('identity') },
    { code: 'const n = x ** 1;', errors: one('identity') },
    { code: 'const Cell = () => <td>{value * 1}</td>;', errors: one('identity') },
    { code: 'const n = Number.call(null, x);', errors: one('alias') },
    { code: 'const n = Number.apply(null, [x]);', errors: one('alias') },
    { code: 'const toNumber = Number.bind(null);', errors: one('alias') },
    { code: 'const n = parseFloat.call(null, x);', errors: one('alias') },
    { code: 'const n = globalThis.Number.call(null, x);', errors: one('alias') },
    { code: 'const { Number: N } = globalThis; const n = N(x);', errors: one('alias') },
    { code: 'const { parseFloat: pf } = window;', errors: one('alias') },
    { code: "const name = 'Num' + 'ber'; const n = globalThis[name](x);", errors: one('computedGlobal') },
    { code: 'const n = Number[method](x);', errors: one('alias') },
  ],
});

// With type information (`pnpm lint:eslint`), a callee whose type is the Number constructor is
// flagged under any name, so an alias imported from another module is caught at the call.
const typedRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'typed');
const filename = join(typedRoot, 'consumer.ts');

typedRuleTester(typedRoot).run('sovitech/no-number-coercion (typed)', rule, {
  valid: [
    { code: "import { ONE } from './zero-constants'; export const a = (x: number) => x + ONE;", filename },
    { code: 'export const a = (x: string) => x.length;', filename },
  ],
  invalid: [
    { code: "import { toNumber } from './aliases'; export const a = (x: string) => toNumber(x);", filename, errors: one('alias') },
  ],
});
