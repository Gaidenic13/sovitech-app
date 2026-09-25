/**
 * sovitech/css-no-colour-literals: in CSS, colours come only from
 * packages/ui/src/tokens.css (the config exempts that one file).
 */
import plugin from './index.js';
import { cssRuleTester, TEST_THEME_COLOURS } from './test-helpers';

const rule = plugin.rules['css-no-colour-literals'];
if (rule === undefined) throw new Error('sovitech/css-no-colour-literals is not registered');

const options = [{ themeColours: [...TEST_THEME_COLOURS] }];
const one = [{ messageId: 'literal' }];
const valid = (code: string) => ({ code, options });
const invalid = (code: string, errors = one) => ({ code, options, errors });

cssRuleTester().run('sovitech/css-no-colour-literals', rule, {
  valid: [
    valid('.a { color: var(--sov-text-primary); }'),
    valid('.a { background: transparent; border-color: currentColor; }'),
    valid('.a { font-family: Inter, ui-sans-serif, sans-serif; }'),
    valid('#add { color: inherit; }'),
    valid('@media (forced-colors: active) { .a { outline-color: Highlight; } }'),
    valid('.a { background-image: url(#fade); }'),
    valid('.a { transition: color 150ms ease; }'),
    valid('.a { grid-area: red; }'),
    valid("@import 'tailwindcss' source(none);"),
    valid('@theme { --color-*: initial; }'),
    valid('@theme inline { --color-bg: var(--sov-bg); }'),
    valid('.a { @apply bg-surface text-text-primary text-green; }'),
    valid('.a { content: "#fff"; }'),
  ],
  invalid: [
    invalid('.a { color: #fff; }'),
    invalid('.a { color: #07201C; }'),
    invalid('.a { color: red; }'),
    invalid('.a { border: 1px solid white; }'),
    invalid('.a { background: rgb(0 0 0); }'),
    invalid('.a { fill: oklch(70% 0.1 150); }'),
    invalid('.a { background-image: linear-gradient(red, blue); }', [{ messageId: 'literal' }, { messageId: 'literal' }]),
    invalid('.a { color: var(--x, red); }'),
    invalid(':root { --brand: #07201c; }'),
    invalid(':root { --x: tomato; }'),
    invalid('@theme { --color-brand: #07201c; }'),
    invalid('.a { @apply bg-red-500; }'),
    invalid('.a { @apply hover:text-white; }'),
  ],
});
