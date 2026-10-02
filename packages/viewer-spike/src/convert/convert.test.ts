/**
 * The viewer spike's converter on the synthetic fixture models (docs/adr/0046-viewer-spike.md):
 * web-ifc runs from a local folder, the view profile keeps the shapes, the GlobalIds and the
 * spatial tree, and none of the model's own words or figures.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { SingleThreadedFragmentsModel } from '@thatopen/fragments';
import { describe, expect, it } from 'vitest';
import { parseArguments } from './cli';
import { convertModel } from './convert';
import { viewerImporter } from './importer';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const wasmDirectory = `${realpathSync(fileURLToPath(new URL('../../node_modules/web-ifc', import.meta.url)))}/`;
const FIXTURES = ['demo-hotel-arh.ifc', 'demo-hotel-mep-rev-a.ifc', 'demo-hotel-mep-ifc2x3.ifc'] as const;

function fixturePath(name: string): string {
  return `${repoRoot}fixtures/ifc/${name}`;
}

/** STEP's \X2\ escapes (UTF-16 code units in hex), as web-ifc decodes them. */
function decodeStep(text: string): string {
  return text.replace(/\\X2\\([0-9A-F]+)\\X0\\/g, (_match, hex: string) => Buffer.from(hex, 'hex').swap16().toString('utf16le'));
}

/** A GlobalId: 22 characters of IFC's base 64 alphabet. */
const GLOBAL_ID = /^[0-9A-Za-z_$]{22}$/;

/** Every quoted string of the STEP text, in order: a quote opens and closes one, and STEP doubles a quote inside it. */
function stepStrings(text: string): string[] {
  const strings: string[] = [];
  const pattern = /'((?:[^']|'')*)'/y;
  for (let index = text.indexOf("'"); index >= 0; index = text.indexOf("'", pattern.lastIndex)) {
    pattern.lastIndex = index;
    const match = pattern.exec(text);
    if (match === null) break;
    strings.push((match[1] ?? '').replaceAll("''", "'"));
  }
  return strings;
}

/** Every quoted string of the model's STEP text with a letter in it, decoded: the model's own words. */
function modelStrings(path: string): Set<string> {
  const strings = new Set<string>();
  for (const raw of stepStrings(readFileSync(path, 'latin1'))) {
    const value = decodeStep(raw);
    if (value.length >= 3 && /\p{L}/u.test(value)) strings.add(value);
  }
  return strings;
}

function inflatedText(fragments: Uint8Array): string {
  return inflateSync(fragments).toString('utf8');
}

describe('the viewer spike converter', () => {
  it('ADR 0046 · refuses a web-ifc folder that is not an absolute local path (never the library default or a CDN)', () => {
    expect(() => viewerImporter('/node_modules/web-ifc')).toThrow();
    expect(() => viewerImporter('node_modules/web-ifc/')).toThrow();
    expect(() => viewerImporter('https://unpkg.com/web-ifc@0.0.78/')).toThrow();
    expect(viewerImporter(wasmDirectory).wasm).toEqual({ path: wasmDirectory, absolute: true });
  });

  it('ADR 0046 · the ARH fixture converts in the view profile and keeps its storeys, shapes and GlobalIds, with empty header metadata', async () => {
    const conversion = await convertModel(fixturePath('demo-hotel-arh.ifc'), wasmDirectory);
    const model = new SingleThreadedFragmentsModel('test-arh', conversion.fragments);
    try {
      const storeys = model.getItemsOfCategories([/^IFCBUILDINGSTOREY$/]).IFCBUILDINGSTOREY ?? [];
      expect(storeys).toHaveLength(6);
      expect(model.getItemsIdsWithGeometry().length).toBeGreaterThan(20);
      expect(model.getGuidsByLocalIds(storeys).every((guid) => typeof guid === 'string' && GLOBAL_ID.test(guid))).toBe(true);
      expect(model.getMetadata()).toEqual({});
    } finally {
      model.dispose();
    }
  });

  it('ADR 0046 · the conversion is reproducible: the same model and settings give the same bytes', async () => {
    const first = await convertModel(fixturePath('demo-hotel-mep-rev-a.ifc'), wasmDirectory);
    const second = await convertModel(fixturePath('demo-hotel-mep-rev-a.ifc'), wasmDirectory);
    expect(Buffer.from(second.fragments).equals(Buffer.from(first.fragments))).toBe(true);
  });

  it.each(FIXTURES)('ADR 0046 · rule 13 · the view profile of %s holds no model text: of the strings its STEP text quotes, only GlobalIds remain', async (name) => {
    const path = fixturePath(name);
    const conversion = await convertModel(path, wasmDirectory);
    const text = inflatedText(conversion.fragments);
    const kept = [...modelStrings(path)].filter((value) => text.includes(value));
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.filter((value) => !GLOBAL_ID.test(value))).toEqual([]);
  });

  it("ADR 0046 · the library's defaults would copy the model's names, header and property values (why the view profile exists)", async () => {
    const path = fixturePath('demo-hotel-arh.ifc');
    const conversion = await convertModel(path, wasmDirectory, 'library-defaults');
    const text = inflatedText(conversion.fragments);
    const kept = [...modelStrings(path)].filter((value) => !GLOBAL_ID.test(value) && text.includes(value));
    expect(kept.length).toBeGreaterThan(20);
  });

  it('ADR 0046 · the command line takes one form only', () => {
    expect(parseArguments(['--input', '/input/model.ifc', '--out', '/output', '--wasm', '/w/'])).toEqual({
      input: '/input/model.ifc',
      out: '/output',
      wasm: '/w/',
      profile: 'view',
      plans: false,
    });
    expect(parseArguments(['--input', '/i', '--out', '/o', '--wasm', '/w/', '--plans', 'yes'])?.plans).toBe(true);
    expect(parseArguments(['--input', '/i', '--out', '/o', '--wasm', '/w/', '--plans', 'maybe'])).toBeUndefined();
    expect(parseArguments(['--input', '/i', '--out', '/o', '--wasm', '/w/', '--profile', 'library-defaults'])?.profile).toBe('library-defaults');
    expect(parseArguments(['--input', '/i', '--out', '/o'])).toBeUndefined();
    expect(parseArguments(['--input', '/i', '--out', '/o', '--wasm', '/w/', '--url', 'https://example.test/'])).toBeUndefined();
    expect(parseArguments(['--input', '/i', '--out', '/o', '--wasm', '/w/', '--profile', 'other'])).toBeUndefined();
    expect(parseArguments(['--input', '/i', '--input', '/j', '--out', '/o', '--wasm', '/w/'])).toBeUndefined();
  });
});
