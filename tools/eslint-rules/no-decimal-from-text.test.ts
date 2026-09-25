/**
 * sovitech/no-decimal-from-text: text becomes a decimal only in the rule 8 number
 * parser (guardrails rule 8, "Parsing"; prompt 3 section 6). Phase 1, the rest of
 * adversarial finding 7 of the phase 0 review, round 2.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin from './index.js';
import { codeRuleTester, typedRuleTester } from './test-helpers';

const rule = plugin.rules['no-decimal-from-text'];
if (rule === undefined) throw new Error('sovitech/no-decimal-from-text is not registered');

const one = [{ messageId: 'text' }];

codeRuleTester().run('sovitech/no-decimal-from-text', rule, {
  valid: [
    "const d = new Decimal('0.1');",
    'const d = new Decimal(`0.1`);',
    'const d = new Decimal(0.1);',
    'const d = new Decimal(candidate.quantity.value);',
    'const d = new Decimal(value);',
    'const d = Decimal.max(a, b);',
    'const d = a.plus(b);',
    'const d = new Other(`${x}`);',
    "import Decimal from 'decimal.js';\nconst d = new Decimal(amount);",
    'const s = String(x);',
  ],
  invalid: [
    { code: 'const d = new Decimal(`${whole}.${fraction}`);', errors: one },
    { code: "const d = new Decimal(whole + '.' + fraction);", errors: one },
    { code: 'const d = new Decimal(String(value));', errors: one },
    { code: 'const d = new Decimal(value.toString());', errors: one },
    { code: 'const d = new Decimal(value.toFixed(2));', errors: one },
    { code: "const d = new Decimal(cell.replace(',', '.'));", errors: one },
    { code: 'const d = new Decimal(excerpt);', errors: one },
    { code: 'const d = new Decimal(evidence.excerpt);', errors: one },
    { code: 'const d = new Decimal(original.text);', errors: one },
    { code: 'const d = new Decimal(cellText);', errors: one },
    { code: 'const d = Decimal(rawValue.trim());', errors: one },
    { code: 'const d = new Big(`${x}`);', errors: one },
    { code: 'const d = new BigNumber(label);', errors: one },
    { code: 'const d = new money.Decimal(text);', errors: one },
    { code: "import D from 'decimal.js';\nconst d = new D(`${x}`);", errors: one },
    { code: "import { Decimal as Dec } from 'decimal.js';\nconst d = new Dec(String(x));", errors: one },
    { code: 'const d = new Decimal(JSON.stringify(x));', errors: one },
    { code: 'const d = new Decimal(flag ? text : value);', errors: one },
    { code: 'const d = new Decimal(text as string);', errors: one },
  ],
});

// With type information (`pnpm lint:eslint`), any argument typed as text, any or unknown.
const typedRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'typed');
const filename = join(typedRoot, 'consumer.ts');

typedRuleTester(typedRoot).run('sovitech/no-decimal-from-text (typed)', rule, {
  valid: [
    { code: "import { cellValue } from './aliases';\ndeclare class Decimal { constructor(v: unknown) }\nexport const d = new Decimal(cellValue);", filename },
  ],
  invalid: [
    { code: "import { cellValue as v } from './aliases';\ndeclare class Decimal { constructor(v: unknown) }\nexport const d = new Decimal(`${v}`);", filename, errors: one },
    { code: "import { cellText as v } from './aliases';\ndeclare class Decimal { constructor(v: unknown) }\nexport const d = new Decimal(v);", filename, errors: one },
    { code: "import { either } from './aliases';\ndeclare class Decimal { constructor(v: unknown) }\nexport const d = new Decimal(either);", filename, errors: one },
    { code: "declare class Decimal { constructor(v: unknown) }\nexport const d = (x: unknown) => new Decimal(x);", filename, errors: one },
  ],
});
