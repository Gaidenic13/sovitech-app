/**
 * The production hash manifest (2.4 "Formula versions are immutable"; docs/adr/0047 decision 3, as amended in part B
 * and after the final verification). The production manifest is empty and src/bodies/ holds no body: no source defines
 * any declared method. Case G9-11 runs the same check over the TEST bodies and their manifest. A body is hashed with
 * everything it loads (`bodyHashInputOf`; phase 5 part B, V-7): the files its imports name, found by the TypeScript
 * parser, and the one package production allows by name, `decimal.js`, by its locked version; anything the hash cannot
 * cover fails the check (the final verification's item 1: the regex reader missed a second import on one line, a
 * template-literal `import()`, and every package imported by name). Read here from the repository on disk, and from
 * in-memory repositories for the probe shapes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { PRODUCTION_CATALOGUE, formulaRefOf } from './catalogue';
import manifest from './manifest.json' with { type: 'json' };
import {
  PRODUCTION_IMPORT_POLICY,
  bodyClosureDetailsOf,
  bodyClosureOf,
  bodyFilesOf,
  bodyHashInputOf,
  bodyHashOf,
  checkManifest,
  lockedVersionOf,
  packageNameOf,
  valueImportsOf,
  type SourceReader,
} from './manifest';

const BODIES = join(dirname(fileURLToPath(import.meta.url)), 'bodies');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BODIES_PATH = 'packages/engine/src/bodies';

/** The repository's files on disk, by path from its root. */
const disk: SourceReader = (path) => {
  const absolute = join(ROOT, ...path.split('/'));
  return existsSync(absolute) && statSync(absolute).isFile() ? new Uint8Array(readFileSync(absolute)) : undefined;
};

function bodyFiles(): ReadonlyMap<string, Uint8Array> {
  return bodyFilesOf(BODIES_PATH, readdirSync(BODIES), disk);
}

/** An in-memory repository: path to text. */
const memory = (files: Readonly<Record<string, string>>): SourceReader => (path) => (Object.hasOwn(files, path) ? new TextEncoder().encode(files[path]) : undefined);

/** A TEST lockfile in pnpm's layout, locking decimal.js for the engine at `version`. */
const lockfile = (version: string): string =>
  [
    '---',
    "lockfileVersion: '9.0'",
    '',
    'importers:',
    '',
    '  .:',
    '    packageManagerDependencies:',
    '      decimal.js:',
    '        specifier: 0.0.1',
    '        version: 0.0.1',
    '',
    '---',
    "lockfileVersion: '9.0'",
    '',
    'importers:',
    '',
    '  packages/engine:',
    '    dependencies:',
    "      '@sovitech/registry':",
    '        specifier: workspace:*',
    '        version: link:../registry',
    '      decimal.js:',
    `        specifier: ${version}`,
    `        version: ${version}`,
    '',
    'packages:',
    '',
    `  decimal.js@${version}:`,
    '    resolution: {integrity: sha512-TEST}',
    '',
  ].join('\n');

const BODY = 'packages/engine/src/bodies/pointsEstimate@1.ts';
const HELPER = 'packages/engine/src/helper.ts';

/** A TEST repository holding one production body `body` beside a helper, a second module, the engine's package.json and a lockfile. */
const repository = (body: string, extra: Readonly<Record<string, string>> = {}): Record<string, string> => ({
  'packages/engine/package.json': '{ "name": "@sovitech/engine" }\n',
  'pnpm-lock.yaml': lockfile('10.6.0'),
  'packages/engine/src/a.ts': 'export const a = 1;\n',
  [HELPER]: 'export const h = 1;\nexport type T = number;\n',
  [BODY]: body,
  ...extra,
});

/** A repository without one of its files. */
const without = (files: Readonly<Record<string, string>>, path: string): Record<string, string> => Object.fromEntries(Object.entries(files).filter(([key]) => key !== path));

/** The body's hash under the production policy, or the refusal that fails the check. */
function hashOrRefusal(files: Readonly<Record<string, string>>): string {
  try {
    return bodyHashOf(bodyHashInputOf(BODY, memory(files)));
  } catch (error) {
    if (error instanceof RangeError) return `refused: ${error.message}`;
    throw error;
  }
}

/** Whether a change to the repository moves the body's hash, or the check fails before or after it. */
function outcomeOf(body: string, change: Readonly<Record<string, string>>): 'hash_moves' | 'check_fails' | 'missed' {
  const before = hashOrRefusal(repository(body));
  const after = hashOrRefusal({ ...repository(body), ...change });
  if (before.startsWith('refused:') || after.startsWith('refused:')) return 'check_fails';
  return before === after ? 'missed' : 'hash_moves';
}

const HELPER_CHANGED = { [HELPER]: 'export const h = 2;\nexport type T = number;\n' };

describe('ADR 0047 decision 3 · the production hash manifest', () => {
  test('G9-11 (production) · the manifest matches src/bodies/ and the catalogue: empty, with no body anywhere', () => {
    const declared = new Set(PRODUCTION_CATALOGUE.formulas.map((formula) => formulaRefOf(formula.signature)));
    const withBody = new Set(PRODUCTION_CATALOGUE.formulas.filter((formula) => formula.body !== undefined).map((formula) => formulaRefOf(formula.signature)));
    expect(checkManifest({ manifest, bodyFiles: bodyFiles(), declared, bodiesInCatalogue: withBody })).toEqual([]);
    expect(manifest).toEqual({});
    expect(withBody.size).toBe(0);
  });

  test('a body file added without an entry fails the check', () => {
    const declared = new Set(['pointsEstimate@1']);
    const files = new Map([['pointsEstimate@1', new TextEncoder().encode('export {};\n')]]);
    expect(checkManifest({ manifest: {}, bodyFiles: files, declared })).toEqual([{ formula: 'pointsEstimate@1', problem: 'no_entry' }]);
    const bytes = files.get('pointsEstimate@1') ?? new Uint8Array();
    expect(checkManifest({ manifest: { 'pointsEstimate@1': bodyHashOf(bytes) }, bodyFiles: files, declared })).toEqual([]);
  });

  test('V-7 · valueImportsOf: imports and re-exports found by the parser, packages kept; `import type`, type positions, comments and strings left out', () => {
    const source = [
      "import { a, type B } from '../a';",
      "import type { C } from '../c';",
      "import type D from './d';",
      "import type from './type-default';",
      'import {',
      '  e,',
      '  f,',
      "} from './ef';",
      "import * as g from './g';",
      "import h, { i } from './hi';",
      "import './effects';",
      "import { Decimal } from 'decimal.js';",
      "import { FIELD } from '@sovitech/registry';",
      "export { j } from './j';",
      "export * from './k';",
      "export type { L } from './l';",
      "export type * from './l2';",
      "// import { m } from './commented';",
      "/* import { n } from './block'; */",
      "const text = \"import { o } from './in-a-string'\";",
      "let typed: import('./type-position').T | undefined;",
      "const later = await import('./dynamic');",
      "const loaded = require('./required');",
    ].join('\n');
    expect(valueImportsOf('packages/engine/src/x.ts', source)).toEqual([
      '../a',
      './type-default',
      './ef',
      './g',
      './hi',
      './effects',
      'decimal.js',
      '@sovitech/registry',
      './j',
      './k',
      './dynamic',
      './required',
    ]);
  });

  test('V-7 · G9-11 · a body is hashed with the files it imports, transitively: a helper changed under the same version moves the hash', () => {
    const files = {
      'packages/engine/src/bodies/pointsEstimate@1.ts': "import { helper } from '../helper';\nimport type { T } from '../types';\nexport const body = helper;\n",
      'packages/engine/src/helper.ts': "import { deeper } from './deeper';\nexport const helper = deeper;\n",
      'packages/engine/src/deeper.ts': 'export const deeper = 1;\n',
      'packages/engine/src/types.ts': 'export type T = number;\n',
    };
    const body = 'packages/engine/src/bodies/pointsEstimate@1.ts';
    expect(bodyClosureOf(body, memory(files))).toEqual(['packages/engine/src/bodies/pointsEstimate@1.ts', 'packages/engine/src/deeper.ts', 'packages/engine/src/helper.ts']);
    const declared = new Set(['pointsEstimate@1']);
    const recorded = { 'pointsEstimate@1': bodyHashOf(bodyHashInputOf(body, memory(files))) };
    const check = (read: SourceReader) => checkManifest({ manifest: recorded, bodyFiles: bodyFilesOf('packages/engine/src/bodies', ['pointsEstimate@1.ts'], read), declared });
    expect(check(memory(files))).toEqual([]);
    // The helper two imports away changes; the body's own bytes and version do not.
    expect(check(memory({ ...files, 'packages/engine/src/deeper.ts': 'export const deeper = 2;\n' }))).toEqual([{ formula: 'pointsEstimate@1', problem: 'hash_differs' }]);
    // A type-only import loads nothing at run time: its file is not part of the hash.
    expect(check(memory({ ...files, 'packages/engine/src/types.ts': 'export type T = string;\n' }))).toEqual([]);
    // An import the hash cannot cover fails, never passes.
    expect(() => bodyClosureOf(body, memory({ ...files, 'packages/engine/src/helper.ts': "export { x } from './missing';\n" }))).toThrow(RangeError);
  });
});

describe('V-7 · the final verification\'s item 1: the closure fails closed, each probe shape moves the hash or fails the check', () => {
  test('G9-11 · V-7 · two imports on one line: the second one\'s helper changed moves the hash (the regex reader missed it)', () => {
    const body = "import { a } from '../a'; import { h } from '../helper';\nexport const body = a + h;\n";
    expect(bodyClosureOf(BODY, memory(repository(body)))).toContain(HELPER);
    expect(outcomeOf(body, HELPER_CHANGED)).toBe('hash_moves');
    // After a comment on the same line, too.
    expect(outcomeOf("/* note */ import { h } from '../helper';\nexport const body = h;\n", HELPER_CHANGED)).toBe('hash_moves');
  });

  test('G9-11 · V-7 · an import split over lines, and `export * from` (with and without a name): the helper changed moves the hash', () => {
    expect(outcomeOf("import {\n  h,\n}\n  from\n  '../helper';\nexport const body = h;\n", HELPER_CHANGED)).toBe('hash_moves');
    expect(outcomeOf("export * from '../helper';\n", HELPER_CHANGED)).toBe('hash_moves');
    expect(outcomeOf("export * as helper from '../helper';\n", HELPER_CHANGED)).toBe('hash_moves');
    expect(outcomeOf("export { h } from '../helper';\n", HELPER_CHANGED)).toBe('hash_moves');
  });

  test('G9-11 · V-7 · a dynamic import() or require() names its module by a plain string literal, or the check fails', () => {
    // A plain string literal is followed like a static import.
    expect(outcomeOf("const { h } = await import('../helper');\nexport const body = h;\n", HELPER_CHANGED)).toBe('hash_moves');
    expect(outcomeOf("const { h } = require('../helper');\nexport const body = h;\n", HELPER_CHANGED)).toBe('hash_moves');
    // A template literal (even with no substitution), a variable, a concatenation: refused.
    for (const body of [
      'const { h } = await import(`../helper`);\nexport const body = h;\n',
      "const name = '../helper';\nconst { h } = await import(name);\nexport const body = h;\n",
      "const { h } = await import('../' + 'helper');\nexport const body = h;\n",
      'const { h } = require(`../helper`);\nexport const body = h;\n',
      "const name = '../helper';\nconst { h } = require(name);\nexport const body = h;\n",
    ]) {
      expect(outcomeOf(body, HELPER_CHANGED), body).toBe('check_fails');
      expect(() => bodyClosureOf(BODY, memory(repository(body)))).toThrow(/by something other than a plain string literal/u);
    }
    // `require` used in any other way (an alias, module.require, require.resolve): refused.
    for (const body of ["const load = require;\nexport const body = load('../helper');\n", "export const body = module.require('../helper');\n", "export const where = require.resolve('../helper');\n"]) {
      expect(() => bodyClosureOf(BODY, memory(repository(body))), body).toThrow(/uses require other than as a call/u);
    }
    // A source that does not parse: refused (two statements run together on one line).
    expect(() => bodyClosureOf(BODY, memory(repository("import { a } from '../a' import { h } from '../helper';\n")))).toThrow(/does not parse/u);
  });

  test('G9-11 · V-7 · a type-only import is left out, by design: it loads nothing at run time (an `import { type T }` is kept)', () => {
    const typeOnly = "import type { T } from '../helper';\nexport const body: T = 1;\n";
    expect(bodyClosureOf(BODY, memory(repository(typeOnly)))).toEqual([BODY]);
    expect(outcomeOf(typeOnly, HELPER_CHANGED)).toBe('missed');
    const inlineType = "import { type T } from '../helper';\nexport const body: T = 1;\n";
    expect(bodyClosureOf(BODY, memory(repository(inlineType)))).toContain(HELPER);
    expect(outcomeOf(inlineType, HELPER_CHANGED)).toBe('hash_moves');
  });

  test('G9-11 · V-7 · a package imported by name: decimal.js alone, by its exact locked version (a new version moves the hash); any other name, or no exact locked version, fails the check', () => {
    expect(PRODUCTION_IMPORT_POLICY).toEqual({ locked: ['decimal.js'] });
    const decimal = "import { Decimal } from 'decimal.js';\nexport const body = new Decimal(1);\n";
    expect(bodyClosureDetailsOf(BODY, memory(repository(decimal)))).toEqual({ files: [BODY], packages: ['decimal.js@10.6.0'], unhashed: [] });
    expect(outcomeOf(decimal, { 'pnpm-lock.yaml': lockfile('10.6.1') })).toBe('hash_moves');
    // Reached through a helper, as a body reaches it through ../interval.
    const throughHelper = "import { h } from '../helper';\nexport const body = h;\n";
    const helperWithDecimal = { [HELPER]: "import { Decimal } from 'decimal.js';\nexport const h = new Decimal(1);\n" };
    expect(outcomeOf(throughHelper, { ...helperWithDecimal, 'pnpm-lock.yaml': lockfile('10.6.0') })).toBe('hash_moves');
    expect(hashOrRefusal({ ...repository(throughHelper), ...helperWithDecimal })).not.toBe(hashOrRefusal({ ...repository(throughHelper), ...helperWithDecimal, 'pnpm-lock.yaml': lockfile('10.6.1') }));
    // Not locked at one exact version for the importing package: refused.
    for (const lock of [lockfile('^10.6.0'), lockfile('link:../decimal'), lockfile('10.6.0').replace('  packages/engine:', '  packages/other:'), '']) {
      expect(hashOrRefusal({ ...repository(decimal), 'pnpm-lock.yaml': lock }), lock).toMatch(/^refused: .*does not lock at a single release version/u);
    }
    // No lockfile, or no package.json for the importing file: refused.
    expect(hashOrRefusal(without(repository(decimal), 'pnpm-lock.yaml'))).toMatch(/^refused: .*no pnpm-lock\.yaml/u);
    expect(hashOrRefusal(without(repository(decimal), 'packages/engine/package.json'))).toMatch(/^refused: .*belongs to no package\.json/u);
    // Every other name: a workspace package, a Node built-in, another package, a subpath of one: refused.
    for (const specifier of ['@sovitech/registry', '@sovitech/domain', 'node:fs', 'fs', 'zod', 'yaml/util', '#internal']) {
      const body = `import * as other from '${specifier}';\nexport const body = other;\n`;
      expect(hashOrRefusal(repository(body)), specifier).toMatch(/^refused: .*by name, which the import policy does not allow/u);
    }
    // Absolute or out-of-repository paths: refused.
    expect(hashOrRefusal(repository("import { h } from '/etc/helper';\nexport const body = h;\n"))).toMatch(/^refused:/u);
    expect(hashOrRefusal(repository("import { h } from '../../../../../helper';\nexport const body = h;\n"))).toMatch(/^refused: .*outside the repository/u);
  });

  test('G9-11 · an unhashed name (TEST policies only) is recorded by name: adding one moves the hash, a name off the policy still fails', () => {
    const policy = { locked: ['decimal.js'], unhashed: { 'node:path': 'TEST reason' } };
    const body = "import { posix } from 'node:path';\nexport const body = posix.sep;\n";
    expect(bodyClosureDetailsOf(BODY, memory(repository(body)), policy)).toEqual({ files: [BODY], packages: [], unhashed: ['node:path'] });
    const plain = "export const body = '/';\n";
    expect(bodyHashOf(bodyHashInputOf(BODY, memory(repository(body)), policy))).not.toBe(bodyHashOf(bodyHashInputOf(BODY, memory(repository(plain)), policy)));
    expect(() => bodyClosureOf(BODY, memory(repository("import { readFileSync } from 'node:fs';\nexport const body = readFileSync;\n")), policy)).toThrow(/import policy does not allow/u);
  });

  test('G9-11 · V-7 · the lockfile reader (every importers section; one exact version or none) and the package names', () => {
    const lock = lockfile('10.6.0');
    expect(lockedVersionOf(lock, 'packages/engine', 'decimal.js')).toBe('10.6.0');
    expect(lockedVersionOf(lock, 'packages/engine', '@sovitech/registry')).toBe('link:../registry');
    // The root's packageManagerDependencies are not dependencies of the root package.
    expect(lockedVersionOf(lock, '.', 'decimal.js')).toBeUndefined();
    expect(lockedVersionOf(lock, 'packages/other', 'decimal.js')).toBeUndefined();
    expect(lockedVersionOf(`${lock}\nimporters:\n\n  packages/engine:\n    devDependencies:\n      decimal.js:\n        specifier: 10.6.1\n        version: 10.6.1\n`, 'packages/engine', 'decimal.js')).toBeUndefined();
    expect(packageNameOf('@sovitech/registry/validation')).toBe('@sovitech/registry');
    expect(packageNameOf('decimal.js')).toBe('decimal.js');
    expect(packageNameOf('yaml/util')).toBe('yaml');
    expect(packageNameOf('node:fs')).toBe('node:fs');
    // The repository's own lockfile locks the engine's decimal.js at one exact version.
    const repositoryLock = new TextDecoder().decode(disk('pnpm-lock.yaml'));
    expect(lockedVersionOf(repositoryLock, 'packages/engine', 'decimal.js')).toMatch(/^\d+\.\d+\.\d+$/u);
  });
});
