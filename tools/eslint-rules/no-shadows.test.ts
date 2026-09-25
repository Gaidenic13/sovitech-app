/**
 * sovitech/no-shadows: the brand has no shadows, and focus rings use outline,
 * because Tailwind's ring-* is built on box-shadow (prompt 3 sections 5.1 and 6).
 */
import plugin from './index.js';
import { codeRuleTester } from './test-helpers';

const rule = plugin.rules['no-shadows'];
if (rule === undefined) throw new Error('sovitech/no-shadows is not registered');

const one = (messageId: string) => [{ messageId }];

codeRuleTester().run('sovitech/no-shadows', rule, {
  valid: [
    'const A = () => <div className="outline-2 outline-accent outline-offset-2" />;',
    'const A = () => <button className="focus-visible:outline-2 focus-visible:outline-accent" />;',
    "const s = { boxShadow: 'none' };",
    "el.style.boxShadow = 'none';",
    "el.style.setProperty('box-shadow', 'none');",
    "const copy = 'A ring-fenced budget for the shadow areas.';",
    "const copy = 'shadowed';",
    "const copy = 'ring';",
    "const rule = css`box-shadow: none;`;",
    "const f = { filter: 'blur(2px)' };",
    'const mesh = { castShadow: false };',
  ],
  invalid: [
    { code: 'const A = () => <div className="shadow" />;', errors: one('class') },
    { code: 'const A = () => <div className="shadow-md" />;', errors: one('class') },
    { code: 'const A = () => <div className="ring" />;', errors: one('class') },
    {
      code: 'const A = () => <div className="focus:ring-2 ring-accent" />;',
      errors: [{ messageId: 'class' }, { messageId: 'class' }],
    },
    { code: 'const A = () => <div className="drop-shadow-lg" />;', errors: one('class') },
    { code: 'const A = () => <div className="inset-shadow-sm" />;', errors: one('class') },
    { code: 'const A = () => <div className="text-shadow-xs" />;', errors: one('class') },
    { code: 'const A = () => <div className="shadow-[0_0_2px_black]" />;', errors: one('class') },
    { code: 'const A = () => <div className="hover:!shadow-none" />;', errors: one('class') },
    { code: "const c = cn('p-2', 'ring-offset-2');", errors: one('class') },
    { code: "const cls = 'p-2 shadow-sm';", errors: one('class') },
    { code: "const buttonClass = 'ring';", errors: one('class') },
    { code: "const A = () => <div style={{ boxShadow: '0 1px 2px var(--sov-bg)' }} />;", errors: one('property') },
    { code: 'const s = { textShadow: x };', errors: one('property') },
    { code: "const s = { WebkitBoxShadow: '0 0 1px' };", errors: one('property') },
    { code: "const s = { 'box-shadow': '0 0 1px' };", errors: one('property') },
    { code: 'el.style.boxShadow = v;', errors: one('property') },
    { code: "el.style.setProperty('box-shadow', v);", errors: one('property') },
    { code: 'const rule = css`box-shadow: 0 0 1px;`;', errors: one('css') },
    { code: "const f = { filter: 'drop-shadow(0 0 2px)' };", errors: one('css') },
    { code: 'const A = () => <filter><feDropShadow dx="1" /></filter>;', errors: one('svg') },
  ],
});
