/**
 * The plugin's `configs.recommended`: which files each ban covers, the
 * allowlist, and the real theme and CSS files. The rules themselves are tested
 * one by one in the other *.test.ts files of this folder.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint, type Linter } from 'eslint';
import ts from 'typescript';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { allowlist } from './allowlist.js';
import plugin, { FORMATTING_MODULE, JSON_PARSE_REVIEWED, NUMBER_PARSER, SCRIPT_EXTENSIONS } from './index.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const config: Linter.Config[] = [
  { files: ['**/*.{ts,tsx,mts,cts}'], languageOptions: { parser: tseslint.parser } },
  ...plugin.configs.recommended,
];

const eslint = new ESLint({ cwd: repoRoot, overrideConfigFile: true, overrideConfig: config });

async function sovitechRules(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: join(repoRoot, filePath) });
  if (result === undefined) throw new Error(`no lint result for ${filePath}`);
  const fatal = result.messages.filter((message) => message.fatal === true);
  if (fatal.length > 0) throw new Error(`${filePath}: ${fatal.map((message) => message.message).join('; ')}`);
  return result.messages.map((message) => message.ruleId ?? 'none').sort();
}

/** The top-level statements of a module, one line each: `export FunctionDeclaration readPort`. */
function topLevelShape(path: string, text: string): string[] {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  return source.statements.map((statement) => {
    const exported = ts.canHaveModifiers(statement) && (ts.getModifiers(statement) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    const name = ts.isFunctionDeclaration(statement) ? (statement.name?.text ?? '') : '';
    return `${exported ? 'export ' : ''}${ts.SyntaxKind[statement.kind]} ${name}`.trim();
  });
}

describe('configs.recommended scope', () => {
  const zero = 'export const a = (x?: number) => x ?? 0;';
  const coercion = 'export const a = (x: string) => Number(x);';
  const filteredSum = 'export const total = (xs: Array<number | undefined>) => xs.filter((x) => x !== undefined).reduce((a, b) => a + b);';

  it.each([
    'apps/web/src/Area.tsx',
    'apps/api/src/routes.ts',
    'apps/api/src/port.ts',
    'packages/engine/src/totals.ts',
    'packages/engine/test-formulas/points.ts',
    'packages/registry/src/number-parser/parse.ts',
    'packages/view-model/src/formatting/round.ts',
  ])('bans a zero fallback in %s', async (filePath) => {
    expect(await sovitechRules(zero, filePath)).toEqual(['sovitech/no-zero-fallback']);
  });

  it.each(['packages/engine/src/totals.ts', 'packages/engine/test-formulas/points.ts'])(
    'bans a total that drops missing values in the engine file %s',
    async (filePath) => {
      expect(await sovitechRules(filteredSum, filePath)).toEqual(['sovitech/no-filtered-sum']);
    },
  );

  // Outside packages/engine the same total is also a total made outside the engine.
  it.each(['apps/web/src/Totals.tsx', 'apps/api/src/routes.ts', 'packages/view-model/src/formatting/round.ts'])(
    'bans a total that drops missing values in %s, twice',
    async (filePath) => {
      expect(await sovitechRules(filteredSum, filePath)).toEqual(['sovitech/no-filtered-sum', 'sovitech/no-total-outside-engine']);
    },
  );

  // Phase 0 review round 2 (adversarial finding 7): totals go through the engine helper.
  const plainTotal = 'export const total = (xs: number[], start: number) => xs.reduce((a, b) => a + b, start);';
  const loopSkip =
    'export function total(xs: Array<number | undefined>, start: number) { let s = start; for (const v of xs) { if (v === undefined) continue; s += v; } return s; }';

  it.each([
    'apps/web/src/Summary.tsx',
    'apps/api/src/routes.ts',
    'packages/view-model/src/server.ts',
    'packages/view-model/src/formatting/round.ts',
    'packages/domain/src/derive.ts',
    'packages/registry/src/number-parser/parse.ts',
    'packages/ui/src/Chart.tsx',
    'packages/db/migrations/seed.ts',
  ])('bans a total made outside packages/engine in %s', async (filePath) => {
    expect(await sovitechRules(plainTotal, filePath)).toEqual(['sovitech/no-total-outside-engine']);
  });

  it.each(['packages/engine/src/totals.ts', 'packages/engine/test-formulas/points.ts'])(
    'lets the engine file %s make a total that does not branch on a missing value',
    async (filePath) => {
      expect(await sovitechRules(plainTotal, filePath)).toEqual([]);
    },
  );

  it('bans a loop that skips a missing value in the engine too', async () => {
    expect(await sovitechRules(loopSkip, 'packages/engine/src/variants.ts')).toEqual(['sovitech/no-filtered-sum']);
    expect(await sovitechRules(loopSkip, 'apps/web/src/Totals.tsx')).toEqual(['sovitech/no-filtered-sum', 'sovitech/no-total-outside-engine']);
  });

  // Phase 0 review round 2 (the second verification's finding 0): computed module paths.
  it.each(['apps/api/src/load.ts', 'apps/web/src/lazy.tsx', 'packages/engine/src/load.ts', 'packages/registry/gates/load.ts'])(
    'bans a computed import in %s',
    async (filePath) => {
      const code = "const dir = '../../../packages/registry/src/gates/'; export const load = () => import(dir + 'source');";
      expect(await sovitechRules(code, filePath)).toEqual(['sovitech/no-computed-import']);
    },
  );

  // Phase 0 review round 2 (adversarial finding 12): .mts and .cts had no ESLint configuration.
  it.each([
    ['packages/engine/src/total.mts', zero],
    ['apps/api/src/area.cts', zero],
    ['packages/ui/src/tile.mjs', 'export const a = (x) => x ?? 0;'],
    ['apps/web/src/tile.cjs', 'module.exports = (x) => x ?? 0;'],
  ])('reads %s', async (filePath, code) => {
    expect(await sovitechRules(code, filePath)).toEqual(['sovitech/no-zero-fallback']);
  });

  it('covers every script extension it names, in apps/ and in packages/', () => {
    for (const extension of SCRIPT_EXTENSIONS) {
      for (const folder of ['apps/web/src', 'packages/engine/src']) {
        const covered = plugin.configs.recommended.some(
          (block) => block.rules?.['sovitech/no-zero-fallback'] !== undefined && (block.files ?? []).some((pattern) => typeof pattern === 'string' && pattern.includes(extension)),
        );
        expect(covered, `${folder}/x.${extension}`).toBe(true);
      }
    }
    expect([...SCRIPT_EXTENSIONS].sort()).toEqual(['cjs', 'cts', 'js', 'jsx', 'mjs', 'mts', 'ts', 'tsx']);
  });

  it.each(['tools/checks/example.ts', 'tests/guardrails/G1-8.test.ts', 'evals/runner.ts', 'fixtures/generate.ts'])(
    'leaves %s to the other checks',
    async (filePath) => {
      expect(
        await sovitechRules(
          `${zero}\n${coercion}\n${filteredSum}\nexport const read = (text: string): unknown => JSON.parse(text);\nexport const r = (x: number) => Math.round(x);`,
          filePath,
        ),
      ).toEqual([]);
    },
  );

  it.each([
    'packages/registry/src/fields.ts',
    'packages/view-model/src/server.ts',
    'apps/web/src/Cell.tsx',
    'apps/api/src/config.ts',
    // The API entry was allowlisted whole until 2026-09-25; only its port function is now.
    'apps/api/src/index.ts',
    'apps/api/src/routes.ts',
  ])(
    'bans Number() in %s',
    async (filePath) => {
      expect(await sovitechRules(coercion, filePath)).toEqual(['sovitech/no-number-coercion']);
    },
  );

  it.each(['packages/registry/src/number-parser/parse.ts', 'packages/view-model/src/formatting/round.ts', 'apps/api/src/port.ts'])(
    'allows Number() only in the allowlisted %s',
    async (filePath) => {
      expect(await sovitechRules(coercion, filePath)).toEqual([]);
    },
  );

  // Phase 1 (the rest of adversarial finding 7, phase 0 review round 2): each ban's exempt scope.
  const decimalFromText = 'export const d = (whole: string) => new Decimal(`${whole}.5`);';
  const jsonParse = 'export const read = (text: string): unknown => JSON.parse(text);';
  const rounding = 'export const r = (x: number) => Math.round(x);';
  const zeroTally = 'export const t = (n: number) => new Array(n).fill(1).fill(0);';

  it.each(['apps/api/src/ingest.ts', 'packages/engine/src/points.ts', 'packages/view-model/src/formatting/round.ts', 'packages/domain/src/conflict.ts'])(
    'bans a decimal built from text in %s',
    async (filePath) => {
      expect(await sovitechRules(decimalFromText, filePath)).toEqual(['sovitech/no-decimal-from-text']);
    },
  );

  it('lets only the rule 8 parser build a decimal from text', async () => {
    expect(await sovitechRules(decimalFromText, 'packages/registry/src/number-parser/parse.ts')).toEqual([]);
  });

  it.each(['apps/api/src/ai.ts', 'packages/ai/src/validate.ts', 'packages/registry/src/production/load.ts', 'packages/view-model/src/formatting/round.ts'])(
    'bans JSON.parse in %s',
    async (filePath) => {
      expect(await sovitechRules(jsonParse, filePath)).toEqual(['sovitech/no-json-parse']);
    },
  );

  it.each(JSON_PARSE_REVIEWED.flatMap((entry) => entry.files))('lets the reviewed reader %s call JSON.parse', async (filePath) => {
    expect(await sovitechRules(jsonParse, filePath)).toEqual([]);
  });

  it.each(['apps/web/src/Tile.tsx', 'packages/engine/src/points.ts', 'packages/registry/src/number-parser/parse.ts', 'packages/view-model/src/server.ts'])(
    'bans rounding in %s',
    async (filePath) => {
      expect(await sovitechRules(rounding, filePath)).toEqual(['sovitech/no-rounding-outside-formatting']);
    },
  );

  it('lets only the formatting module round', async () => {
    expect(await sovitechRules(rounding, 'packages/view-model/src/formatting/round.ts')).toEqual([]);
  });

  it.each(['apps/web/src/Tile.tsx', 'packages/engine/src/counts.ts', 'packages/view-model/src/formatting/round.ts'])(
    'bans a zero-initialised tally in %s, the engine included',
    async (filePath) => {
      expect(await sovitechRules(zeroTally, filePath)).toEqual(['sovitech/no-zero-tally']);
    },
  );

  it('names each exempt scope as its own exported constant', () => {
    expect(NUMBER_PARSER).toBe('packages/registry/src/number-parser/**');
    expect(FORMATTING_MODULE).toBe('packages/view-model/src/formatting/**');
    for (const entry of JSON_PARSE_REVIEWED) {
      expect(entry.files.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(40);
    }
  });

  it('bans colour literals and shadows in app and package code, not in tests', async () => {
    const code = "export const A = () => <div className=\"bg-red-500 shadow-md\" style={{ color: '#fff' }} />;";
    expect(await sovitechRules(code, 'apps/web/src/A.tsx')).toEqual([
      'sovitech/no-colour-literals',
      'sovitech/no-colour-literals',
      'sovitech/no-shadows',
    ]);
    expect(await sovitechRules(code, 'packages/ui/src/A.tsx')).toHaveLength(3);
    expect(await sovitechRules(code, 'tests/e2e/render/page.tsx')).toEqual([]);
  });

  it('reads the theme colour names from the real theme files', async () => {
    const code = 'export const A = () => <main className="bg-bg bg-surface text-text-primary text-accent" />;';
    expect(await sovitechRules(code, 'apps/web/src/A.tsx')).toEqual([]);
  });

  it('parses JSX in .jsx files', async () => {
    expect(await sovitechRules('export const A = () => <b>{x ?? 0}</b>;', 'apps/web/src/A.jsx')).toEqual([
      'sovitech/no-zero-fallback',
    ]);
  });
});

describe('CSS', () => {
  it('allows colour literals only in packages/ui/src/tokens.css', async () => {
    const code = ':root { --sov-x: #07201c; }';
    expect(await sovitechRules(code, 'packages/ui/src/tokens.css')).toEqual([]);
    expect(await sovitechRules(code, 'packages/ui/src/other.css')).toEqual(['sovitech/css-no-colour-literals']);
    expect(await sovitechRules(code, 'apps/web/src/styles.css')).toEqual(['sovitech/css-no-colour-literals']);
  });

  it('bans shadows in the tokens file too', async () => {
    expect(await sovitechRules(':root { --sov-shadow: 0 1px 2px; }', 'packages/ui/src/tokens.css')).toEqual([
      'sovitech/css-no-shadows',
    ]);
  });

  it.each(['apps/web/src/styles.css', 'packages/ui/src/tokens.css'])('the real %s passes', async (filePath) => {
    const code = readFileSync(join(repoRoot, filePath), 'utf8');
    expect(await sovitechRules(code, filePath)).toEqual([]);
  });
});

describe('allowlist', () => {
  it('names a rule of this plugin and gives a reason for every entry', () => {
    for (const entry of allowlist) {
      expect(Object.keys(plugin.rules)).toContain(entry.rule);
      expect(entry.files.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });

  it('is documented in the README, path by path', () => {
    const readme = readFileSync(join(here, 'README.md'), 'utf8');
    for (const entry of allowlist) {
      for (const file of entry.files) expect(readme).toContain(`\`${file}\``);
    }
  });

  it('keeps the allowlisted port module to its one function', () => {
    // The no-number-coercion entry for apps/api/src/port.ts is narrow only while the
    // module holds readPort and nothing else (allowlist.js).
    const path = 'apps/api/src/port.ts';
    expect(topLevelShape(path, readFileSync(join(repoRoot, path), 'utf8'))).toEqual(['export FunctionDeclaration readPort']);
    // Seeded: the module grows a second export, which the exemption would then cover too.
    const grown = `${readFileSync(join(repoRoot, path), 'utf8')}\nexport const floors = (raw: string) => Number(raw);\n`;
    expect(topLevelShape(path, grown)).not.toEqual(['export FunctionDeclaration readPort']);
  });

  it('enables every rule of the plugin at error level', () => {
    const enabled = new Map<string, unknown>();
    for (const block of plugin.configs.recommended) {
      for (const [name, setting] of Object.entries(block.rules ?? {})) enabled.set(name, setting);
    }
    for (const name of Object.keys(plugin.rules)) {
      const setting = enabled.get(`sovitech/${name}`);
      expect(Array.isArray(setting) ? setting[0] : setting, name).toBe('error');
    }
  });
});
