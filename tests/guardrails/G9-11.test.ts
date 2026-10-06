/**
 * G9-11 (proposed for docs/guardrails.md section 7 in phase 5; 2.4 "Recalculation": "Formula versions are immutable";
 * prompt 3 section 6: "Versioned formulas with unknownPolicy, a hash manifest").
 * Situation: a formula body changes while its version stays.
 * Expected: the hash manifest check fails.
 *
 * Engine case (the engine builder): `checkManifest` over the TEST bodies (packages/engine/test-formulas/bodies/, one
 * file per `<id>@<version>`) and their manifest (test-manifest.json) passes as committed, and fails when a body's bytes
 * change under the same version, when a body has no entry, when an entry has no body, when an entry names a formula no
 * catalogue declares or the wrong kind of id, and when a catalogue's body is not a file of the bodies folder. The
 * production manifest is empty and the production catalogue carries no body (no source defines any method).
 *
 * Extended in phase 5 part B (V-7, for the integrator; Expected unchanged): a body's hash covers the body with every
 * file it loads through relative value imports, transitively (the engine's `bodyHashInputOf`), so a helper a body
 * imports (`test-formulas/lib.ts`, `engine-lib.ts`, `src/interval.ts`) changed under the same version fails the check
 * too. The changes are made in memory, over the repository's files (`testSourceReader`'s overlay), never in the
 * repository.
 *
 * Extended again when phase 5 closed (the final verification's item 1; Expected unchanged): the closure is found by the
 * TypeScript parser and fails closed (the engine's `@sovitech/engine/manifest`; its unit test proves each probe shape),
 * so a helper imported on the same line as another import, which the earlier reader missed, changed under the same
 * version fails the check too. The TEST bodies are read under `TEST_IMPORT_POLICY` (test-formulas/engine.ts).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PRODUCTION_CATALOGUE, formulaRefOf } from '@sovitech/engine';
import { bodyClosureOf, bodyHashInputOf, bodyHashOf, checkManifest, type FormulaManifest } from '@sovitech/engine/manifest';
import { TEST_BODIES_DIR, TEST_BODIES_PATH, TEST_IMPORT_POLICY, testBodyFiles, testBodyRefs, testDeclaredRefs, testSourceReader } from '../../packages/engine/test-formulas/engine';

const ENGINE = join(import.meta.dirname, '..', '..', 'packages', 'engine');
const readManifest = (path: string): FormulaManifest => JSON.parse(readFileSync(path, 'utf8')) as FormulaManifest;
const TEST_MANIFEST = readManifest(join(ENGINE, 'test-formulas', 'test-manifest.json'));

const check = (manifest: FormulaManifest, bodyFiles: ReadonlyMap<string, Uint8Array>) =>
  checkManifest({ manifest, bodyFiles, declared: testDeclaredRefs(), kind: 'test', bodiesInCatalogue: testBodyRefs() });

describe('G9-11 · a body changed under the same version fails the hash manifest check', () => {
  test('G9-11 · the TEST bodies match their manifest as committed', () => {
    expect(Object.keys(TEST_MANIFEST).sort()).toEqual([...testBodyRefs()].sort());
    expect(check(TEST_MANIFEST, testBodyFiles())).toEqual([]);
  });

  test('G9-11 · one changed byte in a body, its version unchanged: hash_differs', () => {
    const ref = 'TEST-capexLineItems@1.0.0';
    const path = `${TEST_BODIES_PATH}/${ref}.ts`;
    const original = testSourceReader()(path);
    if (original === undefined) throw new Error(`no body file for ${ref}`);
    const files = testBodyFiles(testSourceReader(new Map([[path, new Uint8Array([...original, 0x20])]])));
    expect(check(TEST_MANIFEST, files)).toEqual([{ formula: ref, problem: 'hash_differs' }]);
  });

  test.each(['packages/engine/test-formulas/lib.ts', 'packages/engine/test-formulas/engine-lib.ts', 'packages/engine/src/interval.ts'])(
    'G9-11 · V-7 · a helper a body imports (%s) changes while every version stays the same: hash_differs for each body that loads it',
    (helper) => {
      const read = testSourceReader();
      const original = read(helper);
      if (original === undefined) throw new Error(`no file ${helper}`);
      const loading = [...testBodyRefs()].filter((ref) => bodyClosureOf(`${TEST_BODIES_PATH}/${ref}.ts`, read, TEST_IMPORT_POLICY).includes(helper)).sort();
      expect(loading.length).toBeGreaterThan(0);
      const changed = testBodyFiles(testSourceReader(new Map([[helper, new Uint8Array([...original, 0x20])]])));
      expect(check(TEST_MANIFEST, changed)).toEqual(loading.map((formula) => ({ formula, problem: 'hash_differs' })));
    },
  );

  test('G9-11 · V-7 · a helper imported on the same line as another import changes while every version stays the same: hash_differs for each body that loads it, that body among them', () => {
    const ref = 'TEST-capexLineItems@1.0.0';
    const path = `${TEST_BODIES_PATH}/${ref}.ts`;
    const helper = 'packages/engine/test-formulas/fields.ts';
    const read = testSourceReader();
    const body = read(path);
    const helperBytes = read(helper);
    if (body === undefined || helperBytes === undefined) throw new Error(`no file ${path} or ${helper}`);
    expect(bodyClosureOf(path, read, TEST_IMPORT_POLICY)).not.toContain(helper);
    // In memory: the helper imported after the body's first import, on that import's own line.
    const text = new TextDecoder().decode(body);
    const sameLine = text.replace(/^(import [^\n]*;)$/mu, "$1 import { TEST_FIELDS as SAME_LINE_HELPER } from '../fields';");
    expect(sameLine).not.toBe(text);
    const overlay = new Map([[path, new TextEncoder().encode(sameLine)]]);
    const withSameLine = testSourceReader(overlay);
    expect(bodyClosureOf(path, withSameLine, TEST_IMPORT_POLICY)).toContain(helper);
    const manifest = { ...TEST_MANIFEST, [ref]: bodyHashOf(bodyHashInputOf(path, withSameLine, TEST_IMPORT_POLICY)) };
    expect(check(manifest, testBodyFiles(withSameLine))).toEqual([]);
    const loading = [...testBodyRefs()].filter((entry) => bodyClosureOf(`${TEST_BODIES_PATH}/${entry}.ts`, withSameLine, TEST_IMPORT_POLICY).includes(helper)).sort();
    expect(loading).toContain(ref);
    const changed = testBodyFiles(testSourceReader(new Map([...overlay, [helper, new Uint8Array([...helperBytes, 0x20])]])));
    expect(check(manifest, changed)).toEqual(loading.map((formula) => ({ formula, problem: 'hash_differs' })));
  });

  test('G9-11 · a body with no entry, an entry with no body, and a catalogue body outside the folder each fail', () => {
    const files = new Map(testBodyFiles());
    files.delete('TEST-pumpPoints@1.0.0');
    const manifest: Record<string, string> = { ...TEST_MANIFEST };
    delete manifest['TEST-levelsTotal@1.0.0'];
    expect(check(manifest, files)).toEqual([
      { formula: 'TEST-levelsTotal@1.0.0', problem: 'no_entry' },
      { formula: 'TEST-pumpPoints@1.0.0', problem: 'body_outside_bodies' },
      { formula: 'TEST-pumpPoints@1.0.0', problem: 'no_file' },
    ]);
  });

  test('G9-11 · an undeclared formula, or a TEST id in the production manifest, fails', () => {
    const bytes = new TextEncoder().encode('export {};\n');
    const forged = new Map([['TEST-forged@9.9.9', bytes]]);
    expect(checkManifest({ manifest: { 'TEST-forged@9.9.9': bodyHashOf(bytes) }, bodyFiles: forged, declared: testDeclaredRefs(), kind: 'test' })).toEqual([
      { formula: 'TEST-forged@9.9.9', problem: 'undeclared' },
    ]);
    const declared = new Set(PRODUCTION_CATALOGUE.formulas.map((formula) => formulaRefOf(formula.signature)));
    expect(checkManifest({ manifest: { 'TEST-forged@9.9.9': bodyHashOf(bytes) }, bodyFiles: forged, declared })).toEqual([
      { formula: 'TEST-forged@9.9.9', problem: 'test_id' },
      { formula: 'TEST-forged@9.9.9', problem: 'undeclared' },
    ]);
  });

  test('G9-11 · the production manifest is empty: no body file, and no production formula carries a body', () => {
    expect(readManifest(join(ENGINE, 'src', 'manifest.json'))).toEqual({});
    expect(readdirSync(join(ENGINE, 'src', 'bodies')).filter((name) => name.endsWith('.ts'))).toEqual([]);
    expect(PRODUCTION_CATALOGUE.formulas.every((formula) => formula.body === undefined)).toBe(true);
    expect(TEST_BODIES_DIR.endsWith(join('test-formulas', 'bodies'))).toBe(true);
  });
});
