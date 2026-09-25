/**
 * sovitech/no-total-outside-engine: totals are made in packages/engine, by the helper
 * that applies a formula's unknownPolicy (guardrails rule 1, "Unknown propagates";
 * 2.1 `calculated`; phase 0 review round 2, adversarial finding 7). Which files the
 * rule covers is tested in config.test.ts.
 */
import plugin from './index.js';
import { codeRuleTester } from './test-helpers';

const rule = plugin.rules['no-total-outside-engine'];
if (rule === undefined) throw new Error('sovitech/no-total-outside-engine is not registered');

const reduce = [{ messageId: 'reduceTotal' }];
const loop = [{ messageId: 'loopTotal' }];

codeRuleTester().run('sovitech/no-total-outside-engine', rule, {
  valid: [
    // Counting, as .length does.
    'const n = rows.filter((row) => row.open).length;',
    'function f(rows: unknown[]) { let n = 0; for (const row of rows) { n += 1; } return n; }',
    'function f(rows: unknown[]) { let n = 0; for (const row of rows) n++; return n; }',
    'function f(groups: Array<{ items: string[] }>) { let n = 0; for (const g of groups) n += g.items.length; return n; }',
    'const n = lists.reduce((count, list) => count + list.length, 0);',
    'const n = lists.reduce((count) => count + 1, 0);',
    // Text.
    "function f(parts: string[]) { let out = ''; for (const part of parts) out += part; return out; }",
    'function f(points: Array<{ x: string; y: string }>) { let d = start; for (const p of points) d += `L ${p.x} ${p.y}`; return d; }',
    "const html = rows.reduce((out, row) => out + row.name, '');",
    "const csv = rows.reduce((out, row) => out + row.name + ',', start);",
    // Reducers that build maps, lists or objects.
    'const byId = rows.reduce((map, row) => map.set(row.id, row), new Map());',
    'const merged = parts.reduce((acc, part) => ({ ...acc, ...part }), {});',
    'const list = rows.reduce(appendRow, []);',
    // Maxima and minima: the conflict test's spread (rule 4).
    'const high = values.reduce((a, b) => Math.max(a, b));',
    'function f(values: number[]) { let low = values[0]; for (const v of values) low = Math.min(low, v); return low; }',
    // Arithmetic that folds no running value.
    'function f(rows: Array<{ a: number; b: number }>) { return rows.map((row) => row.a * row.b); }',
    'function f(xs: number[]) { for (let i = 0; i < xs.length; i += 1) use(xs[i]); }',
    'function f(rows: Array<{ a: number; b: number }>) { for (const row of rows) { let s = row.a; s += row.b; use(s); } }',
    'const next = index + 1;',
    // Loop counters in the for header are not in the body.
    'function f(xs: number[], step: number) { for (let i = 0; i < xs.length; i += step) use(xs[i]); }',
  ],
  invalid: [
    { code: 'const t = values.reduce((a, b) => a + b, 0);', errors: reduce },
    { code: 'const t = values.reduce((a, b) => a + b);', errors: reduce },
    { code: 'const t = rows.reduce((sum, row) => sum + row.area, start);', errors: reduce },
    { code: 'const t = rows.reduce((sum, row) => sum.plus(row.area), new Decimal(0));', errors: reduce },
    { code: 'const t = rows.reduce((sum, row) => Decimal.add(sum, row.area), start);', errors: reduce },
    { code: 'const t = rows.reduce((sum, row) => { sum += row.area; return sum; }, start);', errors: reduce },
    { code: 'const t = rows.reduce((acc, row) => { acc.total += row.area; return acc; }, { total: start });', errors: reduce },
    { code: 'const t = values.reduceRight((a, b) => a - b, start);', errors: reduce },
    { code: 'const t = values.reduce(add, 0);', errors: reduce },
    { code: 'const t = values.reduce(add);', errors: reduce },
    { code: 'const t = values.reduce(add, start);', errors: reduce },
    { code: 'function f(rows: Array<{ area: number }>, start: number) { let total = start; for (const row of rows) total += row.area; return total; }', errors: loop },
    { code: 'function f(rows: Array<{ area: number }>, start: number) { let total = start; for (const row of rows) total = total + row.area; return total; }', errors: loop },
    { code: 'function f(rows: Array<{ area: Decimal }>, start: Decimal) { let total = start; for (const row of rows) total = total.plus(row.area); return total; }', errors: loop },
    { code: 'function f(rows: Array<{ area: number }>, start: number) { let left = start; for (const row of rows) left -= row.area; return left; }', errors: loop },
    { code: 'function f(xs: number[], start: number) { let s = start; for (let i = 0; i < xs.length; i++) s += xs[i]; return s; }', errors: loop },
    { code: 'function f(xs: number[], start: number) { let s = start; let i = 0; while (i < xs.length) { s += xs[i]; i += 1; } return s; }', errors: loop },
    { code: 'function f(o: Record<string, number>, start: number) { let s = start; for (const k in o) s += o[k]; return s; }', errors: loop },
    { code: 'function f(rows: Array<{ k: string; v: number }>, totals: Record<string, number>) { for (const row of rows) totals[row.k] += row.v; }', errors: loop },
    { code: 'function f(rows: Array<{ area: number }>, start: number) { let total = start; rows.forEach((row) => { total += row.area; }); return total; }', errors: loop },
    { code: 'function f(segments: Array<{ width: number }>, start: number) { let offset = start; for (const s of segments) { draw(offset); offset += s.width; } }', errors: loop },
    { code: 'const Summary = ({ parts, start }) => <span>{parts.reduce((sum, part) => sum + part, start)}</span>;', errors: reduce },
    { code: 'const t = Decimal.sum(...values);', errors: [{ messageId: 'librarySum' }] },
    { code: 'const t = Math.sumPrecise(values);', errors: [{ messageId: 'librarySum' }] },
  ],
});
