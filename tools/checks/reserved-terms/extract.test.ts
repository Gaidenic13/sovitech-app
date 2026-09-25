import { describe, expect, it } from 'vitest';
import {
  closeKeyExposure,
  extractFromCatalogue,
  extractFromCss,
  extractFromData,
  extractFromHtml,
  extractFromScript,
  extractFromSql,
  extractFromText,
  extractFromTextTemplate,
  keyExposure,
  listDeclarations,
  stripJsonComments,
} from './extract';

function texts(fileName: string, source: string, skip: readonly string[] = [], lists: readonly string[] = [], exposed: readonly string[] = []): string[] {
  return extractFromScript(fileName, source, new Set(skip), new Set(lists), new Set(exposed)).map((unit) => unit.text);
}

describe('copy units from TypeScript and JavaScript', () => {
  it('reads string literals and template text, joining template parts with a placeholder', () => {
    const source = "const a = 'Your price';\nconst b = `Checked on ${date} by ${name}`;\n";
    expect(texts('x.ts', source)).toEqual(['Your price', 'Checked on {} by {}']);
  });

  it('skips module specifiers, literal types, member names and key reads', () => {
    const source = [
      "import x from 'final-module';",
      "export { y } from './final';",
      "type Stage = 'final' | 'draft';",
      "const value = record['Final key'];",
      "const has = 'Final key' in record;",
      "const lazy = import('./final');",
      "interface Shape { 'Final prop': string }",
      "class Holder { 'Final member' = 1 }",
    ].join('\n');
    expect(texts('x.ts', source)).toEqual([]);
  });

  it('reads tagged templates, String.raw and SQL tags included (phase 0 round 2 review)', () => {
    const source = [
      'const a = t`Final price, ${amount} verified`;',
      'const b = String.raw`Certified\\ncompliant`;',
      'const c = db.sql`SELECT final FROM t`;',
    ].join('\n');
    expect(texts('x.ts', source)).toEqual(['Final price, {} verified', 'Certified\\ncompliant', 'SELECT final FROM t']);
  });

  it('reads an object key written as display text, wherever the object is (phase 0 round 2 review)', () => {
    const source = "const record = { 'Final key': 1, ['Firm price']: 2, 'machine_key': 3, plain: 4 };\n";
    expect(texts('x.ts', source)).toEqual(['Final key', 'Firm price']);
  });

  it('reads every key of an object whose keys are handed out: Object.keys, entries, values, for-in, spreads', () => {
    const source = [
      'const STAGES = { Final: 1, draft: 2 };',
      'const SHOWN = { verified: 1, nested: { Binding: 2 } };',
      'const BASE = { quote: 1 };',
      'const ALL = { ...BASE, other: 2 };',
      'const HIDDEN = { final: 1 };',
      'export const a = Object.keys(STAGES);',
      'export const b = Object.entries(SHOWN);',
      'for (const k in ALL) use(k);',
      'export const c = Object.values({ Offer: 1 });',
    ].join('\n');
    expect(texts('x.ts', source)).toEqual(['Final', 'draft', 'verified', 'nested', 'Binding', 'quote', 'other', 'Offer']);
    expect(texts('x.ts', 'export const HIDDEN = { final: 1 };\n', [], [], ['HIDDEN'])).toEqual(['final']);
  });

  it('finds objects whose keys are handed out across files, through imports, property chains and spreads', () => {
    const user = [
      "import { LABELS as L } from './labels';",
      "import * as COPY from './copy';",
      'export const a = Object.keys(L);',
      'export const b = Object.entries(COPY.STAGES);',
    ].join('\n');
    const labels = 'export const LABELS = { ...EXTRA };\n';
    const exposed = closeKeyExposure([keyExposure('user.ts', user), keyExposure('labels.ts', labels)]);
    expect([...exposed].sort()).toEqual(['COPY', 'EXTRA', 'L', 'LABELS', 'STAGES']);
  });

  it('reads lower-case keys as copy wherever they could be shown: variables, maps, ternaries, arguments, attributes', () => {
    const source = [
      "const qualifier = 'final';",
      "const event = { type: 'user_confirmed' };",
      "const button = { label: 'final' };",
      "const labels = { done: 'verified' };",
      "const pick = issued ? 'binding' : 'draft';",
      "show('quote');",
      "const tag = 'firm-price';",
    ].join('\n');
    expect(texts('x.ts', source)).toEqual(['final', 'user_confirmed', 'final', 'verified', 'binding', 'draft', 'quote', 'firm-price']);
    const jsx = "export const A = () => <Badge tone='final' />;\n";
    expect(texts('x.tsx', jsx)).toEqual(['final']);
  });

  it('skips lower-case keys only as types, property keys, ===/!== operands, switch cases and registered list elements', () => {
    const source = [
      "type Stage = 'final' | 'draft';",
      "const record = { final: 1, 'verified': 2, ['quote']: 3 };",
      "const hit = record['final'];",
      "const closed = stage === 'final' || 'binding' !== stage;",
      "switch (stage) { case 'offer': break; }",
      "export const STAGES = ['final', 'draft'] as const;",
      "export const FROZEN = Object.freeze(['verified'] as const);",
      "export enum Check { Done = 'confirmed' }",
    ].join('\n');
    expect(texts('x.ts', source, [], ['STAGES', 'FROZEN', 'Check'])).toEqual([]);
    expect(texts('x.ts', source)).toEqual(['final', 'draft', 'verified', 'confirmed']);
  });

  it('exempts only the direct machine-key elements of a registered list', () => {
    const source = [
      "export const STAGES = ['final', 'Final offer', { label: 'quote' }, ['binding']] as const;",
      "export const OTHER = ['final'];",
      "const loose = 'final' == stage;",
    ].join('\n');
    expect(texts('x.ts', source, [], ['STAGES'])).toEqual(['Final offer', 'quote', 'binding', 'final', 'final']);
  });

  it('lists the const array literals and enums a file declares', () => {
    const source = [
      "export const A = ['x'] as const;",
      "export const B = Object.freeze(['y']);",
      "export const C = { x: 'y' };",
      "export const D = (): string[] => ['z'];",
      'export enum E { X = "x" }',
    ].join('\n');
    expect([...listDeclarations('x.ts', source)].sort()).toEqual(['A', 'B', 'E']);
  });

  it('skips only the named list constants', () => {
    const source = "export const LIST = ['final', 'Final offer'] as const;\nexport const note = 'Final offer';\n";
    expect(texts('x.ts', source, ['LIST'])).toEqual(['Final offer']);
    expect(texts('x.ts', source)).toEqual(['final', 'Final offer', 'Final offer']);
  });

  it('joins the text children of a JSX element, with a placeholder for each expression', () => {
    const source = "export const A = () => <p className='final-step'>Price {amount} is <b>final</b> {'and binding'}</p>;\n";
    expect(texts('x.tsx', source)).toEqual(['Price {} is \u0000 and binding', 'final']);
  });

  it('reads copy and data-* attributes of intrinsic elements and skips technical ones', () => {
    const source = "export const A = () => <img alt='Final plan' src='final.svg' data-value-id='final' aria-label='quote' />;\n";
    expect(texts('x.tsx', source)).toEqual(['Final plan', 'final', 'quote']);
  });

  it('reads every attribute of a custom component but key and ref (phase 0 round 2 review)', () => {
    const source = [
      "export const A = () => <Badge key='k-final' ref={r} type='verified' name='Guaranteed' id={on ? 'binding' : 'x'} />;",
      "export const B = () => <ui.Stamp role='Final' />;",
      "export const C = () => <input type='text' name='final' />;",
    ].join('\n');
    expect(texts('x.tsx', source)).toEqual(['verified', 'Guaranteed', 'binding', 'x', 'Final']);
  });

  it('reports one-based line and column numbers', () => {
    const [unit] = extractFromScript('x.ts', "\n  const a = 'Final price';\n", new Set());
    expect(unit).toMatchObject({ line: 2, column: 13, kind: 'string' });
  });
});

describe('copy units from HTML, CSS and catalogues', () => {
  it('reads HTML text and copy attributes, not scripts, styles or comments', () => {
    const html = [
      '<!doctype html>',
      '<html><head><title>Certified savings</title>',
      '<meta name="description" content="Final report">',
      '<style>.final { color: inherit }</style>',
      '<script>const final = 1;</script>',
      '<!-- a final comment -->',
      '</head><body><p title="Quote">Tom &amp; Jerry</p></body></html>',
    ].join('\n');
    expect(extractFromHtml(html).map((unit) => unit.text)).toEqual(['Certified savings', 'Final report', 'Quote', 'Tom & Jerry']);
    expect(extractFromHtml(html)[0]).toMatchObject({ line: 2 });
  });

  it('reads text before and after the tags, form values and data-* values; skips the doctype', () => {
    const html = 'Leading final text\n<!doctype html><input value="Firm price" data-label="Quote"><text>VERIFIED</text>\ntrailing offer';
    expect(extractFromHtml(html).map((unit) => unit.text)).toEqual(['Leading final text', 'Firm price', 'Quote', 'VERIFIED', 'trailing offer']);
  });

  it('reads CSS content strings', () => {
    const css = ".a::after { content: 'Final'; }\n.b { color: inherit; }\n";
    expect(extractFromCss(css).map((unit) => unit.text)).toEqual(['Final']);
  });

  it('reads every string value of a JSON or YAML catalogue', () => {
    const json = '{\n  "step8": { "cta": "Request your quote", "count": 3 },\n  "list": ["Final"]\n}\n';
    expect(extractFromCatalogue(json, 'json').map((unit) => unit.text)).toEqual(['Request your quote', 'Final']);
    expect(extractFromCatalogue(json, 'json')[0]).toMatchObject({ line: 2 });
    const yaml = 'step8:\n  cta: Request your quote\n';
    expect(extractFromCatalogue(yaml, 'yaml').map((unit) => unit.text)).toEqual(['Request your quote']);
  });

  it('reads data files: string values and every key that is not a machine key, with JSON comments allowed', () => {
    const json = '{\n  // a comment: final\n  "stage": "Formal quotation",\n  "Final offer": 1,\n  "list": ["x",],\n}\n';
    expect(extractFromData(json, 'json').map((unit) => `${unit.kind}:${unit.text}`)).toEqual(['data:Formal quotation', 'data-key:Final offer', 'data:x']);
    expect(JSON.parse(stripJsonComments('{ "a": "b,}", /* c */ "d": [1,], }'))).toEqual({ a: 'b,}', d: [1] });
  });

  it('reads SQL string literals, not comments', () => {
    const sql = "-- final comment\nINSERT INTO t VALUES ('Final quotation', 'It''s firm'); /* verified */\n";
    expect(extractFromSql(sql).map((unit) => `${unit.line}:${unit.text}`)).toEqual(['2:Final quotation', "2:It's firm"]);
  });

  it('reads text templates: markup text, text outside tags and quoted helper arguments, not comments', () => {
    const hbs = '{{!-- final comment --}}\n<h1>Firm price {{stage}}</h1>\n{{t "Final offer"}}\nThis estimate is binding.\n';
    expect(extractFromTextTemplate(hbs).map((unit) => unit.text)).toEqual(['Firm price {}', '{}\nThis estimate is binding.', 'Final offer']);
  });

  it('reads every line of a text or Markdown file', () => {
    expect(extractFromText('# Title\n\n  guaranteed savings\n').map((unit) => `${unit.line}:${unit.column}:${unit.text}`)).toEqual(['1:1:# Title', '3:3:guaranteed savings']);
  });
});
