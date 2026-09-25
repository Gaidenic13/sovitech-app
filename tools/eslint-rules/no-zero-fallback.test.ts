/**
 * sovitech/no-zero-fallback: no zero stands in for a missing value
 * (guardrails rule 1, "Unknown propagates"; prompt 3 section 7).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin from './index.js';
import { codeRuleTester, typedRuleTester } from './test-helpers';

const rule = plugin.rules['no-zero-fallback'];
if (rule === undefined) throw new Error('sovitech/no-zero-fallback is not registered');

const one = (messageId: string) => [{ messageId }];

codeRuleTester().run('sovitech/no-zero-fallback', rule, {
  valid: [
    'const a = x ?? 1;',
    'const a = x ?? undefined;',
    'const a = x ?? null;',
    "const a = label || 'Unknown';",
    // An empty list only where no list stands in for a missing one.
    'const a = list ?? [];',
    'const a = items.length > 0 ? items : [];',
    'const floor = Math.max(x, 1);',
    'const top = Math.max(...values);',
    'const least = Math.min(x, 0);',
    'const m = Math.max(a, b);',
    "const a = x ?? '0 items';",
    'let i = 0;',
    'const total = values.reduce((sum, v) => sum.plus(v), start);',
    'const offset = hasHeader ? 1 : 0;',
    'const b = x > limit ? y : 0;',
    'if (count === 0) { report(); }',
    'const d = x ?? new Decimal(1);',
    'function f(x = 1) { return x; }',
    'const { a = 1 } = o;',
    'x &&= 0;',
    'const z = 0 || x;',
    'const w = x ?? y ?? z;',
    'const Cell = () => <td>{value.formatted}</td>;',
    { code: 'function f(tries = 0) { return tries; }', options: [{ defaults: false }] },
    // Names that do not hold a zero, or that are reassigned.
    'const ONE = 1; const a = x ?? ONE;',
    'let i = 0; i += 1; const a = x ?? i;',
    'let start = 0; start = offset; const a = x ?? start;',
    'function f(n: number) { return x ?? n; }',
    "import { NONE } from './constants'; const a = x ?? NONE;",
    'const LIMITS = { floor: 1 }; const a = x ?? LIMITS.floor;',
    'const LIMITS = { floor: 0 }; const a = x ?? LIMITS.ceiling;',
    'const undefinedValue = undefined; const a = x ?? undefinedValue;',
    'const ZERO = 0; if (count === ZERO) { report(); }',
    'const ZERO = 0; const total = values.reduce((sum, v) => sum + v, ZERO);',
    // A flag test is not a presence test of the value read in the other branch.
    'const NONE = 0; const a = props.visible ? props.count : NONE;',
    'const a = isEnabled(props) ? props.count : 0;',
    "const a = mode === 'grid' ? layout.columns : 0;",
  ],
  invalid: [
    { code: 'const a = x ?? 0;', errors: one('nullish') },
    { code: 'const a = x || 0;', errors: one('or') },
    { code: 'const a = x ?? 0.0;', errors: one('nullish') },
    { code: 'const a = x ?? -0;', errors: one('nullish') },
    { code: 'const a = x ?? +0;', errors: one('nullish') },
    { code: 'const a = x ?? 0n;', errors: one('nullish') },
    { code: 'const a = x ?? 0x0;', errors: one('nullish') },
    { code: "const a = x ?? '0';", errors: one('nullish') },
    { code: "const a = x || '0,0';", errors: one('or') },
    { code: 'const a = x ?? `0`;', errors: one('nullish') },
    { code: 'const a = x ?? (0);', errors: one('nullish') },
    { code: 'const a = x ?? y ?? 0;', errors: one('nullish') },
    { code: 'const a = (x ?? 0) + 1;', errors: one('nullish') },
    { code: 'const a: number = building?.area ?? 0;', errors: one('nullish') },
    { code: 'a ??= 0;', errors: one('assignment') },
    { code: 'a ||= 0;', errors: one('assignment') },
    { code: 'function f(area = 0) { return area; }', errors: one('default') },
    { code: 'const f = (area = 0) => area;', errors: one('default') },
    { code: 'const { area = 0 } = building;', errors: one('default') },
    { code: 'const [first = 0] = list;', errors: one('default') },
    { code: 'const [first = 0] = list;', options: [{ defaults: true }], errors: one('default') },
    { code: 'const a = x ?? 0;', options: [{ defaults: false }], errors: one('nullish') },
    { code: 'const Tile = ({ count = 0 }) => <span>{count}</span>;', errors: one('default') },
    { code: 'const v = x != null ? x : 0;', errors: one('conditional') },
    { code: 'const v = x ? x : 0;', errors: one('conditional') },
    { code: 'const v = x === undefined ? 0 : x;', errors: one('conditional') },
    { code: "const v = typeof x === 'number' ? x : 0;", errors: one('conditional') },
    { code: 'const v = a.b !== null && a.b !== undefined ? a.b : 0;', errors: one('conditional') },
    { code: 'const v = x ?? new Decimal(0);', errors: one('nullish') },
    { code: 'const v = x ?? Decimal(0);', errors: one('nullish') },
    { code: "const v = x || new Decimal('0');", errors: one('or') },
    { code: 'const Area = () => <span>{area ?? 0}</span>;', errors: one('nullish') },
    { code: 'const v = { total: parts.sum ?? 0, count: n || 0 };', errors: [{ messageId: 'nullish' }, { messageId: 'or' }] },
    // A name bound to a zero is a zero (adversarial review of phase 0, finding 22).
    { code: 'const NONE = 0; const a = x ?? NONE;', errors: one('nullish') },
    { code: 'const NONE = 0; const a = x || NONE;', errors: one('or') },
    { code: 'const NONE = 0; a ??= NONE;', errors: one('assignment') },
    { code: 'const NONE = 0; function f(area = NONE) { return area; }', errors: one('default') },
    { code: 'const NONE = 0; const v = x === undefined ? NONE : x;', errors: one('conditional') },
    { code: 'const NONE = 0; const v = x !== undefined ? x : NONE;', errors: one('conditional') },
    { code: "const NONE = 0; const v = typeof x === 'number' ? x : NONE;", errors: one('conditional') },
    { code: 'const ZERO = 0; const NONE = ZERO; const a = x ?? NONE;', errors: one('nullish') },
    { code: 'const NONE = 0 as const; const a = x ?? NONE;', errors: one('nullish') },
    { code: 'const NONE = -0; const a = x ?? NONE;', errors: one('nullish') },
    { code: "const NONE = '0'; const a = x ?? NONE;", errors: one('nullish') },
    { code: 'const NONE = new Decimal(0); const a = x ?? NONE;', errors: one('nullish') },
    { code: 'let NONE = 0; const a = x ?? NONE;', errors: one('nullish') },
    { code: 'var NONE = 0; const a = x ?? NONE;', errors: one('nullish') },
    { code: 'const a = x ?? NONE; const NONE = 0;', errors: one('nullish') },
    { code: 'function f() { return x ?? NONE; } const NONE = 0;', errors: one('nullish') },
    { code: 'const NONE = 0; const Area = () => <span>{area ?? NONE}</span>;', errors: one('nullish') },
    { code: 'const DEFAULTS = { area: 0 }; const a = x ?? DEFAULTS.area;', errors: one('nullish') },
    { code: "const DEFAULTS = { 'area': 0 } as const; const a = x ?? DEFAULTS['area'];", errors: one('nullish') },
    { code: 'const DEFAULTS = Object.freeze({ area: 0 }); const a = x ?? DEFAULTS.area;', errors: one('nullish') },
    { code: 'const DEFAULTS = { area: 0 }; const { area = DEFAULTS.area } = building;', errors: one('default') },
    // The other branch reads a property of the value the test checks for being present.
    { code: 'const v = x === undefined ? 0 : x.area;', errors: one('conditional') },
    { code: 'const NONE = 0; const v = building?.area !== undefined ? building.area : NONE;', errors: one('conditional') },
    { code: 'const v = selected ? selected.count : 0;', errors: one('conditional') },
    { code: 'const v = !selected ? 0 : selected.count;', errors: one('conditional') },
    { code: 'const v = x == null ? 0 : x.value.amount;', errors: one('conditional') },
    { code: 'const v = isDefined(x) ? x.area : 0;', errors: one('conditional') },
    // Phase 1 (the rest of adversarial finding 7, phase 0 review round 2): a zero floor and an empty-list fallback.
    { code: 'const v = Math.max(x, 0);', errors: one('zeroFloor') },
    { code: 'const v = Math.max(0, x);', errors: one('zeroFloor') },
    { code: 'const v = Math.max(...deltas, 0);', errors: one('zeroFloor') },
    { code: 'const NONE = 0; const v = Math.max(x, NONE);', errors: one('zeroFloor') },
    { code: 'const v = globalThis.Math.max(x, 0);', errors: one('zeroFloor') },
    { code: 'const Tile = () => <b>{Math.max(area - used, 0)}</b>;', errors: one('zeroFloor') },
    { code: 'const rows = list || [];', errors: one('emptyList') },
    { code: 'const total = (items || []).length;', errors: one('emptyList') },
    { code: 'const rows = list || Array();', errors: one('emptyList') },
    { code: 'const rows = list || new Array();', errors: one('emptyList') },
    { code: 'const rows = list || ([] as number[]);', errors: one('emptyList') },
    { code: 'state.rows ||= [];', errors: one('emptyList') },
  ],
});

// With type information (`pnpm lint:eslint`), a zero constant imported from another
// module is a zero too: its type is the literal type 0. The untyped run (the lint-bans
// check) cannot follow an import; it still sees constants declared in the same file.
const typedRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'typed');
const filename = join(typedRoot, 'consumer.ts');

typedRuleTester(typedRoot).run('sovitech/no-zero-fallback (typed)', rule, {
  valid: [
    { code: "import { ONE } from './zero-constants'; export const a = (x?: number) => x ?? ONE;", filename },
    { code: "import { counter } from './zero-constants'; export const a = (x?: number) => x ?? counter;", filename },
    { code: 'export const a = (x?: number, n = 1) => x ?? n;', filename },
  ],
  invalid: [
    { code: "import { NONE } from './zero-constants'; export const a = (x?: number) => x ?? NONE;", filename, errors: one('nullish') },
    { code: "import { NO_AREA } from './zero-constants'; export const a = (x?: number) => x || NO_AREA;", filename, errors: one('or') },
    { code: "import { LIMITS } from './zero-constants'; export const a = (x?: number) => x ?? LIMITS.floor;", filename, errors: one('nullish') },
    { code: "import * as k from './zero-constants'; export const a = (x?: number) => x ?? k.NONE;", filename, errors: one('nullish') },
    {
      code: "import { NONE } from './zero-constants'; export const a = (x?: number) => (x === undefined ? NONE : x);",
      filename,
      errors: one('conditional'),
    },
    { code: "import { NONE } from './zero-constants'; export function f(area = NONE) { return area; }", filename, errors: one('default') },
  ],
});
