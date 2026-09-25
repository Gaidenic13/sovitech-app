/**
 * sovitech/no-zero-tally: no tally starts every key at zero (guardrails rule 1, "Zero is
 * a value"; 2.5 "Counting"; prompt 3 section 7). Phase 1, the rest of adversarial
 * finding 7 of the phase 0 review, round 2.
 */
import plugin from './index.js';
import { codeRuleTester } from './test-helpers';

const rule = plugin.rules['no-zero-tally'];
if (rule === undefined) throw new Error('sovitech/no-zero-tally is not registered');

const one = [{ messageId: 'tally' }];

codeRuleTester().run('sovitech/no-zero-tally', rule, {
  valid: [
    'let i = 0;',
    'const page = { index: 0 };',
    'const row = new Array(n).fill(undefined);',
    'const cells = Array.from({ length: n }, (_, i) => i + 1);',
    'const byType = Object.fromEntries(types.map((t) => [t, []]));',
    'const byId = new Map(ids.map((id) => [id, undefined]));',
    'const counts = new Map(); for (const a of assets) counts.set(a.type, (counts.get(a.type) ?? []).concat(a));',
    'const flag = { [key]: true };',
    'tally[key] = value;',
    "state['count'] = 0;",
    'const buffer = new Float64Array(n);',
    'const seed = values.reduce((a, b) => a.concat(b), []);',
  ],
  invalid: [
    { code: 'const tally = new Array(n).fill(0);', errors: one },
    { code: 'const tally = Array(types.length).fill(0);', errors: one },
    { code: 'const NONE = 0; const tally = new Array(n).fill(NONE);', errors: one },
    { code: 'const tally = Array.from({ length: n }, () => 0);', errors: one },
    { code: 'const tally = Array.from(types, () => 0);', errors: one },
    { code: 'const tally = Object.fromEntries(types.map((t) => [t, 0]));', errors: one },
    { code: 'const tally = Object.fromEntries(types.map((t) => { return [t, 0]; }));', errors: one },
    { code: "const tally = Object.fromEntries([['ahu', 0], ['fan', 0]]);", errors: one },
    { code: 'const tally = new Map(types.map((t) => [t, 0]));', errors: one },
    { code: 'const tally = types.reduce((acc, t) => ({ ...acc, [t]: 0 }), {});', errors: one },
    { code: 'for (const t of types) tally[t] = 0;', errors: one },
    { code: 'for (const t of types) counts.set(t, 0);', errors: one },
    { code: 'const Tile = () => <b>{Object.fromEntries(floors.map((f) => [f, 0]))}</b>;', errors: one },
  ],
});
