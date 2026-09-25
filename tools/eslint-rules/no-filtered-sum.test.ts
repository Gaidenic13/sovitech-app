/**
 * sovitech/no-filtered-sum: a total never drops missing values silently
 * (guardrails rule 1, "Unknown propagates"; adversarial review of phase 0, finding 22;
 * reducers and loops that branch on a missing value: phase 0 review round 2,
 * adversarial finding 7 and the second verification's finding 4).
 */
import plugin from './index.js';
import { codeRuleTester } from './test-helpers';

const rule = plugin.rules['no-filtered-sum'];
if (rule === undefined) throw new Error('sovitech/no-filtered-sum is not registered');

const one = [{ messageId: 'filteredSum' }];
const reducer = [{ messageId: 'reducerSkipsMissing' }];
const loop = [{ messageId: 'loopSkipsMissing' }];

codeRuleTester().run('sovitech/no-filtered-sum', rule, {
  valid: [
    // A filter on a flag, not on presence.
    'const t = items.filter((item) => item.inScope).reduce((sum, item) => sum + item.points, start);',
    'const t = items.filter((item) => item.kind === "ahu").reduce((sum, item) => sum.plus(item.value), start);',
    // A reduce that does no arithmetic.
    'const byId = rows.filter((row) => row !== undefined).reduce((map, row) => map.set(row.id, row), new Map());',
    'const merged = parts.filter(Boolean).reduce((acc, part) => ({ ...acc, ...part }), {});',
    // No filter before the total: the engine helper decides what an unknown does.
    'const t = values.reduce((sum, v) => sum + v, start);',
    'const t = Math.max(...values);',
    // The filter keeps only the missing ones: that lists them, it does not drop them.
    'const missing = values.filter((v) => v === undefined).length;',
    'const t = values.filter((v) => v === undefined).reduce((n, v) => n + 1, start);',
    // A count of present items is not a total of values.
    'const known = values.filter((v) => v !== undefined).length;',
    // A property read alone is a flag test.
    'const t = rows.filter((row) => row.visible).reduce((a, row) => a + row.width, start);',
    // A presence check that is not on the item.
    'const t = rows.filter((row) => lookup !== undefined).reduce((a, row) => a + row.width, start);',
    // A let that is reassigned is not followed.
    'let list = values.filter(isDefined); list = values; const t = list.reduce((a, b) => a + b);',
    // Not an aggregate call.
    'const labels = format(...names.filter(Boolean));',
    // Round 2: reducers and loops that add up without branching on a missing value.
    'const t = values.reduce((sum, v) => (v > limit ? sum + v : sum), start);',
    'function f(xs: number[], start: number) { let s = start; for (const v of xs) s += v; return s; }',
    'function f(rows: Array<{ visible: boolean; width: number }>, start: number) { let s = start; for (const row of rows) { if (row.visible) s += row.width; } return s; }',
    // A presence test that does not reach a running value: a reduce that builds a map, a push.
    'const byId = rows.reduce((map, row) => (row === undefined ? map : map.set(row.id, row)), new Map());',
    'function f(xs: Array<number | undefined>) { const out: number[] = []; for (const v of xs) { if (v === undefined) continue; out.push(v); } return out; }',
    // Counting present items, as .length of a filtered array does.
    'function f(xs: Array<number | undefined>) { let n = 0; for (const v of xs) { if (v === undefined) continue; n += 1; } return n; }',
    'function f(xs: Array<number | undefined>) { let n = 0; for (const v of xs) { if (v !== undefined) n++; } return n; }',
    'function f(groups: Array<{ items?: string[] }>) { let n = 0; for (const g of groups) { if (g.items === undefined) continue; n += g.items.length; } return n; }',
    // Building text.
    "function f(xs: Array<string | undefined>) { let out = ''; for (const v of xs) { if (v === undefined) continue; out += v; } return out; }",
    'function f(xs: Array<string | undefined>) { let out = start; for (const v of xs) { if (v === undefined) continue; out += `${v};`; } return out; }',
    // A running value declared inside the loop lives for one item only.
    'function f(rows: Array<{ a?: number; b: number }>) { for (const row of rows) { let s = row.b; if (row.a !== undefined) s += row.a; use(s); } }',
    // The loop's own test ends the loop; it does not skip items.
    'function f(node: { value: number; next?: typeof node } | undefined, start: number) { let s = start; while (node !== undefined) { s += node.value; node = node.next; } return s; }',
  ],
  invalid: [
    { code: 'const t = values.filter((v) => v !== undefined).reduce((sum, v) => sum + v, start);', errors: one },
    { code: 'const t = values.filter((v) => v != null).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter((v): v is number => v !== undefined).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter((v) => undefined !== v).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter((v) => v !== null && v !== undefined).reduce((a, b) => a + b);', errors: one },
    { code: "const t = values.filter((v) => typeof v === 'number').reduce((a, b) => a + b);", errors: one },
    { code: "const t = values.filter((v) => typeof v !== 'undefined').reduce((a, b) => a + b);", errors: one },
    { code: 'const t = values.filter((v) => !!v).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter((v) => v).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter(Boolean).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter(isDefined).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter(Number.isFinite).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter((v) => Number.isFinite(v)).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter((v) => !isNil(v)).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter((v) => !(v === undefined)).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter((v) => v instanceof Decimal).reduce((a, b) => a.plus(b), start);', errors: one },
    { code: 'const t = values.filter(function (v) { return v !== undefined; }).reduce((a, b) => a + b);', errors: one },
    // A property of the item.
    { code: 'const t = rows.filter((row) => row.area !== undefined).reduce((sum, row) => sum + row.area, start);', errors: one },
    { code: 'const t = rows.filter((row) => row.area?.value != null).reduce((sum, row) => sum + row.area.value, start);', errors: one },
    // Through other array steps, in either order.
    { code: 'const t = rows.filter((row) => row.area !== undefined).map((row) => row.area).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = rows.map((row) => row.area).filter((a) => a !== undefined).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter(isDefined).filter((v) => v > 1).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.flatMap((v) => (v === undefined ? [] : [v])).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.flatMap((v) => v ?? []).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = Array.from(values.filter(isDefined)).reduce((a, b) => a + b);', errors: one },
    { code: 'const t = [...values.filter(isDefined)].reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values?.filter(isDefined)?.reduce((a, b) => a + b);', errors: one },
    { code: 'const t = values.filter(isDefined).reduceRight((a, b) => a + b);', errors: one },
    // Through a name that holds the filtered array.
    { code: 'const known = values.filter((v) => v !== undefined); const t = known.reduce((a, b) => a + b);', errors: one },
    { code: 'const known = values.filter(isDefined); const kept = known; const t = kept.reduce((a, b) => a + b);', errors: one },
    // Decimal arithmetic, compound assignment, block bodies, and a reducer defined elsewhere.
    { code: 'const t = values.filter(isDefined).reduce((a, b) => a.plus(b), new Decimal(1));', errors: one },
    { code: 'const t = values.filter(isDefined).reduce((a, b) => { a += b; return a; });', errors: one },
    { code: 'const t = values.filter(isDefined).reduce(add, start);', errors: one },
    // Aggregate calls that take the filtered array.
    { code: 'const m = Math.max(...values.filter(isDefined));', errors: one },
    { code: 'const m = Decimal.sum(...values.filter((v) => v !== undefined));', errors: one },
    { code: 'const m = sum(values.filter(Boolean));', errors: one },
    { code: 'const m = average(rows.filter((row) => row.area !== undefined).map((row) => row.area));', errors: one },
    { code: 'const Total = ({ values }) => <span>{values.filter(Boolean).reduce((a, b) => a + b)}</span>;', errors: one },
    // Round 2: a reducer that branches on a missing value (the adversarial probe `reduceNoFilter`).
    { code: 'const t = xs.reduce<number>((s, v) => (v === undefined ? s : s + v), 0);', errors: reducer },
    { code: 'const t = xs.reduce((s, v) => (v !== undefined ? s + v : s), start);', errors: reducer },
    { code: 'const t = xs.reduce((s, v) => (v == null ? s : s.plus(v)), start);', errors: reducer },
    { code: 'const t = xs.reduce((s, v) => (Number.isNaN(v) ? s : s + v), start);', errors: reducer },
    { code: 'const t = xs.reduce((s, v) => (isDefined(v) ? s + v : s), start);', errors: reducer },
    { code: 'const t = xs.reduce((s, v) => (v ? s + v : s), start);', errors: reducer },
    { code: 'const t = rows.reduce((s, row) => (row.area === undefined ? s : s + row.area), start);', errors: reducer },
    { code: "const t = xs.reduce((s, v) => (typeof v === 'number' ? s + v : s), start);", errors: reducer },
    { code: 'const t = xs.reduce((s, v) => { if (v === undefined) return s; return s + v; }, start);', errors: reducer },
    { code: 'const t = xs.reduce((s, v) => (v !== v ? s : s + v), start);', errors: reducer },
    { code: 'const m = xs.reduce((a, v) => (v === undefined ? a : Math.max(a, v)), start);', errors: reducer },
    // Loops that skip a missing value (the adversarial probe `forLoopSkip`, and variants.ts line 11 of the second verification).
    { code: 'function f(xs: Array<number | undefined>) { let s = 0; for (const v of xs) { if (v === undefined) continue; s += v; } return s; }', errors: loop },
    { code: 'const h = (xs: Array<number | undefined>) => { let s = 0; for (const v of xs) if (v !== undefined) s += v; return s; };', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; for (let i = 0; i < xs.length; i++) { const v = xs[i]; if (v === undefined) continue; s = s + v; } return s; }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; let i = 0; while (i < xs.length) { const v = xs[i]; i += 1; if (v == null) continue; s += v; } return s; }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; let i = 0; do { const v = xs[i]; if (v !== undefined) s += v; i += 1; } while (i < xs.length); return s; }', errors: loop },
    { code: 'function f(o: Record<string, number | undefined>, start: number) { let s = start; for (const k in o) { const v = o[k]; if (v === undefined) continue; s += v; } return s; }', errors: loop },
    { code: 'function f(xs: number[], start: number) { let s = start; for (const v of xs) { if (Number.isNaN(v)) continue; s += v; } return s; }', errors: loop },
    { code: 'function f(rows: Array<{ area?: number }>, start: number) { let s = start; for (const row of rows) { if (!row.area) continue; s += row.area; } return s; }', errors: loop },
    { code: 'function f(rows: Array<{ area?: { value: number } }>, start: number) { let s = start; for (const row of rows) { if (!row.area) continue; s += row.area.value; } return s; }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; for (const v of xs) { if (!v) continue; s += v; } return s; }', errors: loop },
    { code: "function f(xs: unknown[], start: number) { let s = start; for (const v of xs) { if (typeof v !== 'number') continue; s += v; } return s; }", errors: loop },
    { code: 'function f(xs: Array<Decimal | undefined>, start: Decimal) { let s = start; for (const v of xs) { if (isNil(v)) continue; s = s.plus(v); } return s; }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { let m = start; for (const v of xs) { if (v === undefined) continue; m = Math.max(m, v); } return m; }', errors: loop },
    { code: 'function f(rows: Array<{ k: string; v?: number }>, totals: Record<string, number>) { for (const row of rows) { if (row.v === undefined) continue; totals[row.k] += row.v; } }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; for (const v of xs) { s += v ?? other; } return s; }', errors: loop },
    // Per-item callbacks.
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; xs.forEach((v) => { if (v !== undefined) s += v; }); return s; }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; xs.map((v) => (v === undefined ? v : (s += v))); return s; }', errors: loop },
    // Loops over an array that dropped its missing values.
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; for (const v of xs.filter(isDefined)) s += v; return s; }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { const known = xs.filter((v) => v !== undefined); let s = start; for (const v of known) s += v; return s; }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { const known = xs.filter(isDefined); let s = start; for (let i = 0; i < known.length; i++) s += known[i]; return s; }', errors: loop },
    { code: 'function f(xs: Array<number | undefined>, start: number) { let s = start; xs.filter(Boolean).forEach((v) => { s += v; }); return s; }', errors: loop },
    // A loop inside a loop reports each running total once.
    { code: 'function f(groups: Array<Array<number | undefined>>, start: number) { let s = start; for (const g of groups) { for (const v of g) { if (v === undefined) continue; s += v; } } return s; }', errors: loop },
  ],
});
