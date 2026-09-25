/**
 * sovitech/no-colour-literals: colours come only from packages/ui/src/tokens.css
 * (prompt 3 section 6, "Brand assets"; section 14 item 3).
 */
import plugin from './index.js';
import { codeRuleTester, TEST_THEME_COLOURS } from './test-helpers';

const rule = plugin.rules['no-colour-literals'];
if (rule === undefined) throw new Error('sovitech/no-colour-literals is not registered');

const options = [{ themeColours: [...TEST_THEME_COLOURS] }];
const one = (messageId: string) => [{ messageId }];
const valid = (code: string) => ({ code, options });
const invalid = (code: string, errors: Array<{ messageId: string }>) => ({ code, options, errors });

codeRuleTester().run('sovitech/no-colour-literals', rule, {
  valid: [
    valid("const c = 'var(--sov-accent)';"),
    valid('const A = () => <div className="bg-surface text-text-primary border-accent" />;'),
    valid('const A = () => <div className="text-green hover:bg-bg/50" />;'),
    valid('const A = () => <div className="text-2xl bg-transparent fill-current stroke-none from-10%" />;'),
    valid('const A = () => <a href="#add">Add</a>;'),
    valid("const el = document.querySelector('#fade');"),
    valid("import helper from '#add';"),
    valid("const copy = 'The red line marks the plan edge.';"),
    valid("const copy = 'White text on a drawing is a finding.';"),
    valid('const A = () => <path fill="currentColor" stroke="none" />;'),
    valid('const A = () => <rect fill="url(#fade)" />;'),
    valid("const s = { color: 'inherit', background: 'transparent', borderColor: 'currentColor' };"),
    valid("const s = { color: 'var(--sov-text-primary)' };"),
    valid("const url = 'https://example.org/page#fade';"),
    valid("const tag = 'VCV-3.12';"),
    valid("const entity = '&#123;';"),
    valid('const c = new Color(styles.getPropertyValue(token));'),
    valid('const o = { colour: token, fill: tokens.surface };'),
    valid("const font = { fontFamily: 'Inter', transition: 'color 150ms' };"),
    valid("const collab = 'collab(';"),
  ],
  invalid: [
    invalid("const c = '#07201c';", one('literal')),
    invalid("const c = '#fff';", one('literal')),
    invalid("const c = '#FFFA';", one('literal')),
    invalid("const c = '#12345678';", one('literal')),
    invalid("const c = 'rgb(0 0 0)';", one('literal')),
    invalid("const c = 'rgba(0, 0, 0, 0.5)';", one('literal')),
    invalid("const c = 'hsl(120 50% 50%)';", one('literal')),
    invalid("const c = 'oklch(70% 0.1 150)';", one('literal')),
    invalid("const c = 'color(display-p3 1 0 0)';", one('literal')),
    invalid("const A = () => <div style={{ color: 'red' }} />;", one('literal')),
    invalid("const A = () => <div style={{ border: '1px solid white' }} />;", one('literal')),
    invalid("const A = () => <div style={{ backgroundColor: 'Tomato' }} />;", one('literal')),
    invalid("const s = { color: 'var(--sov-accent, green)' };", one('literal')),
    invalid('const A = () => <div className="bg-red-500" />;', one('literal')),
    invalid('const A = () => <div className="hover:text-white" />;', one('literal')),
    invalid('const A = () => <div className="bg-[#07201c]" />;', one('literal')),
    invalid('const A = () => <div className="bg-[red]" />;', one('literal')),
    invalid('const A = () => <div className="border-x-slate-200/50" />;', one('literal')),
    invalid('const A = () => <div className="[color:red]" />;', one('literal')),
    invalid("const c = cn('p-4', active && 'text-black');", one('literal')),
    invalid('const A = () => <path fill="red" />;', one('literal')),
    invalid('const A = () => <stop stopColor="gold" />;', one('literal')),
    invalid('const c = new THREE.Color(0xff0000);', one('literal')),
    invalid("const c = new Color('steelblue');", one('literal')),
    invalid('material.color.setHex(0x00ff00);', one('literal')),
    invalid("material.color.set('red');", one('literal')),
    invalid('const params = { color: 0x07201c };', one('literal')),
    invalid("el.style.color = 'red';", one('literal')),
    invalid("ctx.fillStyle = 'navy';", one('literal')),
    invalid("el.style.setProperty('color', 'red');", one('literal')),
    invalid('const rule = css`color: #fff;`;', one('literal')),
    invalid("const a = '#fff', b = 'rgb(1 2 3)';", [{ messageId: 'literal' }, { messageId: 'literal' }]),
  ],
});
