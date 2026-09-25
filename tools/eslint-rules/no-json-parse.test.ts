/**
 * sovitech/no-json-parse: text is parsed only by reviewed readers (guardrails rules 1
 * and 8; prompt 3 sections 6 and 7). Phase 1, the rest of adversarial finding 7 of the
 * phase 0 review, round 2.
 */
import plugin from './index.js';
import { codeRuleTester } from './test-helpers';

const rule = plugin.rules['no-json-parse'];
if (rule === undefined) throw new Error('sovitech/no-json-parse is not registered');

codeRuleTester().run('sovitech/no-json-parse', rule, {
  valid: [
    'const text = JSON.stringify(value);',
    'const parsed = schema.parse(value);',
    'const parsed = parser.parse(text);',
    'function f(JSON: { parse: (t: string) => unknown }) { return JSON.parse(t); }',
    "const { stringify } = JSON;",
  ],
  invalid: [
    { code: 'const v = JSON.parse(text);', errors: [{ messageId: 'parse' }] },
    { code: 'const v = globalThis.JSON.parse(text);', errors: [{ messageId: 'parse' }] },
    { code: "const v = JSON['parse'](text);", errors: [{ messageId: 'parse' }] },
    { code: 'const v = JSON[method](text);', errors: [{ messageId: 'parse' }] },
    { code: 'const values = texts.map(JSON.parse);', errors: [{ messageId: 'parse' }] },
    { code: 'const read = JSON.parse;', errors: [{ messageId: 'parse' }] },
    { code: 'const { parse } = JSON; const v = parse(text);', errors: [{ messageId: 'destructured' }] },
    { code: 'const { parse: read } = window.JSON;', errors: [{ messageId: 'destructured' }] },
    { code: 'const Cell = () => <td>{JSON.parse(raw).area}</td>;', errors: [{ messageId: 'parse' }] },
  ],
});
