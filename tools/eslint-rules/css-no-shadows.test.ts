/**
 * sovitech/css-no-shadows: no shadows in CSS, the tokens file included
 * (prompt 3 sections 5.1 and 6; section 14 item 3).
 */
import plugin from './index.js';
import { cssRuleTester } from './test-helpers';

const rule = plugin.rules['css-no-shadows'];
if (rule === undefined) throw new Error('sovitech/css-no-shadows is not registered');

const one = [{ messageId: 'shadow' }];

cssRuleTester().run('sovitech/css-no-shadows', rule, {
  valid: [
    '.a { box-shadow: none; }',
    '.a { outline: 2px solid var(--sov-accent); outline-offset: 2px; }',
    '@theme { --shadow-*: initial; --inset-shadow-*: initial; --drop-shadow-*: initial; --text-shadow-*: initial; }',
    ':root { --sov-focus-ring: var(--sov-accent); }',
    '.a { filter: blur(2px); }',
    '.a { @apply outline-2 outline-accent; }',
  ],
  invalid: [
    { code: '.a { box-shadow: 0 1px 2px var(--sov-bg); }', errors: one },
    { code: '.a { -webkit-box-shadow: 0 0 1px; }', errors: one },
    { code: '.a { text-shadow: 0 0 1px; }', errors: one },
    { code: '.a { filter: drop-shadow(0 0 2px var(--sov-bg)); }', errors: one },
    { code: ':root { --sov-shadow: 0 1px 2px; }', errors: one },
    { code: '@theme { --shadow-card: 0 1px 2px; }', errors: one },
    { code: '.a { @apply shadow-md; }', errors: one },
    { code: '.a { @apply focus:ring-2; }', errors: one },
  ],
});
