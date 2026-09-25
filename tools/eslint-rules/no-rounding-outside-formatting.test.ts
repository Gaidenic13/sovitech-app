/**
 * sovitech/no-rounding-outside-formatting: rounding happens only at display, in the
 * formatting module (guardrails rule 9, "Rounding"; prompt 3 sections 6 and 7). Phase 1,
 * the rest of adversarial finding 7 of the phase 0 review, round 2.
 */
import plugin from './index.js';
import { codeRuleTester } from './test-helpers';

const rule = plugin.rules['no-rounding-outside-formatting'];
if (rule === undefined) throw new Error('sovitech/no-rounding-outside-formatting is not registered');

const one = [{ messageId: 'rounding' }];

codeRuleTester().run('sovitech/no-rounding-outside-formatting', rule, {
  valid: [
    'const m = Math.max(a, b);',
    'const a = Math.abs(x);',
    'const s = value.toString();',
    'const d = new Intl.DateTimeFormat("en-GB");',
    'const r = amount.plus(1);',
    'const f = format.round;',
    'function g(Math: { round: (x: number) => number }) { return Math.round; }',
  ],
  invalid: [
    { code: 'const r = Math.round(x);', errors: one },
    { code: 'const r = Math.floor(x);', errors: one },
    { code: 'const r = Math.ceil(x);', errors: one },
    { code: 'const r = Math.trunc(x);', errors: one },
    { code: 'const r = Math.fround(x);', errors: one },
    { code: 'const r = globalThis.Math.round(x);', errors: one },
    { code: 'const round = Math.round; const r = round(x);', errors: one },
    { code: 'const { floor } = Math;', errors: one },
    { code: 'const r = Math[name](x);', errors: one },
    { code: 'const s = x.toFixed(2);', errors: one },
    { code: 'const s = x.toPrecision(3);', errors: one },
    { code: "const s = x.toLocaleString('ro-RO');", errors: one },
    { code: "const f = new Intl.NumberFormat('ro-RO');", errors: one },
    { code: "const f = Intl.NumberFormat('en-GB');", errors: one },
    { code: 'const { NumberFormat } = Intl;', errors: one },
    { code: 'const d = amount.toDecimalPlaces(2);', errors: one },
    { code: 'const d = amount.toDP(2);', errors: one },
    { code: 'const d = amount.toSignificantDigits(2);', errors: one },
    { code: 'const d = amount.toSD(2);', errors: one },
    { code: 'const d = amount.toNearest(100);', errors: one },
    { code: 'const d = Decimal.round(x);', errors: one },
    { code: 'const d = amount.floor();', errors: one },
    { code: 'const Tile = () => <b>{area.toFixed(0)}</b>;', errors: one },
  ],
});
