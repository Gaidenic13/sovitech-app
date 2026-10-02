/**
 * The viewer spike's converter on the synthetic fixture models and on synthetic models built here
 * in memory (docs/adr/0046-viewer-spike.md): web-ifc runs from a local folder, the view profile
 * keeps the shapes, the GlobalIds and the spatial tree, and none of the model's own words or
 * figures, at any length.
 *
 * "No model text" is checked on every string of the converted file, found by walking every field
 * of the Fragments schema, and on every word inside the strings that hold JSON: each must be a
 * GlobalId of the source model or a word of the profile's fixed vocabulary (VIEW_VOCABULARY),
 * listed by name below. Anything else fails, whatever its length, one character included
 * (ADR 0046 Finding 12: a grid's axis tags, mostly one or two characters, were kept).
 *
 * The synthetic models are built as text in this file and handed to the converter from memory:
 * no model file is written (a document-type file outside fixtures/ would fail the fixture check).
 */
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EditUtils, getObject, SingleThreadedFragmentsModel } from '@thatopen/fragments';
import { describe, expect, it } from 'vitest';
import { parseArguments } from './cli';
import { type Conversion, CONVERTED_MODEL_ID, convertFromReader, convertModel, type ModelReader } from './convert';
import { type ConversionProfile, viewerImporter } from './importer';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const wasmDirectory = `${realpathSync(fileURLToPath(new URL('../../node_modules/web-ifc', import.meta.url)))}/`;
const FIXTURES = ['demo-hotel-arh.ifc', 'demo-hotel-mep-rev-a.ifc', 'demo-hotel-mep-ifc2x3.ifc'] as const;

function fixturePath(name: string): string {
  return `${repoRoot}fixtures/ifc/${name}`;
}

function fixtureText(name: string): string {
  return readFileSync(fixturePath(name), 'latin1');
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

/** Every string literal of the model's STEP text, decoded, of any length (the empty one aside: it holds no text). */
function modelLiterals(text: string): Set<string> {
  return new Set(stepStrings(text).map(decodeStep).filter((value) => value.length > 0));
}

/** The model's GlobalIds: the first attribute of every entity that has one, as the STEP text writes it. */
function modelGlobalIds(text: string): Set<string> {
  const ids = new Set<string>();
  for (const match of text.matchAll(/^#\d+\s*=\s*IFC[A-Z0-9]+\(\s*'([0-9A-Za-z_$]{22})'/gm)) {
    if (match[1] !== undefined) ids.add(match[1]);
  }
  return ids;
}

/** JSON's escapes in a string token. */
const JSON_ESCAPES: Readonly<Record<string, string>> = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };

/** A JSON string token's body, its escapes decoded. */
function decodeJsonToken(body: string): string {
  return body.replace(/\\(?:u([0-9a-fA-F]{4})|(.))/g, (_escape, hex: string | undefined, character: string | undefined) =>
    hex !== undefined ? Buffer.from(hex, 'hex').swap16().toString('utf16le') : (JSON_ESCAPES[character ?? ''] ?? ''),
  );
}

/**
 * The string tokens of a text written as a JSON array or object, keys and values alike, decoded;
 * undefined for any other text. Read as tokens, with no JSON.parse (the lint ban, rules 1 and 8):
 * what is left once the tokens, numbers, true, false and null are taken out is JSON's punctuation.
 */
function jsonTokens(text: string): string[] | undefined {
  if (!text.startsWith('[') && !text.startsWith('{')) return undefined;
  const tokens: string[] = [];
  const skeleton = text
    .replace(/"((?:[^"\\]|\\.)*)"/g, (_token, body: string) => {
      tokens.push(decodeJsonToken(body));
      return '';
    })
    .replace(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g, '');
  return /^[\s[\]{},:]*$/.test(skeleton) ? tokens : undefined;
}

/**
 * The words of one string of the file: the string itself, or, when it is JSON with string tokens
 * (an attribute, a relation, an item the library writes for a grid), the words of each token, so
 * a word written inside JSON, or inside JSON inside JSON, is found as itself.
 */
function addWords(text: string, into: Set<string>): void {
  const tokens = jsonTokens(text);
  if (tokens === undefined || tokens.length === 0) {
    into.add(text);
    return;
  }
  for (const token of tokens) addWords(token, into);
}

function collectStrings(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') addWords(value, into);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, into);
  else if (value !== null && typeof value === 'object') for (const item of Object.values(value)) collectStrings(item, into);
}

/**
 * Every string a converted file holds, and every word inside the JSON ones. The file is read with
 * the library's own FlatBuffers reader and walked by reflection over every accessor of its schema
 * (`getObject`), so a string in a field the view profile does not know of is read too. (A scan of
 * the bytes for anything shaped like a string is not used: it finds one-character "strings" in the
 * geometry's numbers, where an axis tag of one character could not be told apart.)
 */
function fragmentsStrings(fragments: Uint8Array): Set<string> {
  const tree: Record<string, unknown> = {};
  getObject(EditUtils.getModelFromBuffer(fragments, false), tree);
  const strings = new Set<string>();
  collectStrings(tree, strings);
  return strings;
}

/**
 * The fixed vocabulary the view profile writes: with the source model's GlobalIds, the only
 * strings a converted file may hold. Each word is listed by name.
 */
const VIEW_VOCABULARY = {
  /** The IFC classes of the items kept, as the importer names their categories: the fixtures' and the synthetic models' here. */
  classNames: [
    'IFCACTUATOR',
    'IFCAIRTERMINALBOX',
    'IFCALARM',
    'IFCBUILDING',
    'IFCBUILDINGELEMENTPROXY',
    'IFCBUILDINGSTOREY',
    'IFCCHILLER',
    'IFCCONTROLLER',
    'IFCDAMPER',
    'IFCDISTRIBUTIONCONTROLELEMENT',
    'IFCDOOR',
    'IFCELECTRICALELEMENT',
    'IFCELECTRICDISTRIBUTIONBOARD',
    'IFCENERGYCONVERSIONDEVICE',
    'IFCEQUIPMENTELEMENT',
    'IFCFAN',
    'IFCFIRESUPPRESSIONTERMINAL',
    'IFCFLOWCONTROLLER',
    'IFCFLOWMETER',
    'IFCFLOWMOVINGDEVICE',
    'IFCFLOWTERMINAL',
    'IFCGRID',
    'IFCLIGHTFIXTURE',
    'IFCPROJECT',
    'IFCPUMP',
    'IFCSENSOR',
    'IFCSITE',
    'IFCSLAB',
    'IFCSPACE',
    'IFCTRANSPORTELEMENT',
    'IFCUNITARYCONTROLELEMENT',
    'IFCUNITARYEQUIPMENT',
    'IFCVALVE',
    'IFCWALL',
  ],
  /**
   * The inverse attribute names the spatial tree's relations are stored under (VIEW_RELATIONS). The
   * one attribute kept, the GlobalId (VIEW_KEPT_ATTRIBUTES), is stored in the GlobalId table with no name.
   */
  attributeNames: ['ContainedInStructure', 'ContainsElements', 'Decomposes', 'IsDecomposedBy'],
  /** The converter's keys: the fixed model id, and the header metadata as emptied (an empty JSON object). */
  libraryKeys: [CONVERTED_MODEL_ID, '{}'],
} as const satisfies Record<string, readonly string[]>;

const VOCABULARY: ReadonlySet<string> = new Set(Object.values(VIEW_VOCABULARY).flat());

/** The strings of a converted file that are neither a GlobalId of its source model nor a word of the view vocabulary. */
function unexpectedStrings(strings: ReadonlySet<string>, sourceText: string): string[] {
  const globalIds = modelGlobalIds(sourceText);
  return [...strings].filter((value) => !globalIds.has(value) && !VOCABULARY.has(value)).sort();
}

/** The model's own string literals, any length, GlobalIds aside, that the converted file holds. */
function modelTextKept(strings: ReadonlySet<string>, sourceText: string): string[] {
  const globalIds = modelGlobalIds(sourceText);
  return [...modelLiterals(sourceText)].filter((value) => !globalIds.has(value) && strings.has(value)).sort();
}

/** A read callback over a model held in memory. */
function memoryReader(bytes: Uint8Array): ModelReader {
  return (offset, size) => bytes.subarray(offset, offset + size);
}

/** Converts a synthetic model given as STEP text, from memory. */
function convertText(text: string, profile: ConversionProfile = 'view'): Promise<Conversion> {
  const bytes = Buffer.from(text, 'latin1');
  return convertFromReader(memoryReader(bytes), bytes.byteLength, wasmDirectory, profile);
}

/** Writes a synthetic STEP file one entity at a time, numbering the entities. */
class StepWriter {
  readonly #entities: string[] = [];
  #globalIds = 0;

  /** Adds an entity and returns its reference. */
  add(entity: string): string {
    this.#entities.push(entity);
    return `#${this.#entities.length}`;
  }

  /** A new synthetic GlobalId (22 characters of IFC's base 64 alphabet). */
  globalId(): string {
    this.#globalIds += 1;
    return `'0VSpikeFinding12${String(this.#globalIds).padStart(6, '0')}'`;
  }

  file(schema: 'IFC4' | 'IFC2X3'): string {
    return [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION(('ViewDefinition [synthetic]'),'2;1');",
      "FILE_NAME('synthetic.ifc','2026-10-03T00:00:00',('Synthetic author'),('Synthetic office'),'viewer-spike test','viewer-spike test','');",
      `FILE_SCHEMA(('${schema}'));`,
      'ENDSEC;',
      'DATA;',
      ...this.#entities.map((entity, index) => `#${index + 1}=${entity};`),
      'ENDSEC;',
      'END-ISO-10303-21;',
      '',
    ].join('\n');
  }
}

/** The units, contexts and spatial tree every synthetic model starts with: one storey. */
function spatialTree(step: StepWriter): { storey: string; storeyPlacement: string; body: string; axes: string; up: string } {
  const origin = step.add('IFCCARTESIANPOINT((0.,0.,0.))');
  const up = step.add('IFCDIRECTION((0.,0.,1.))');
  const axes = step.add(`IFCAXIS2PLACEMENT3D(${origin},$,$)`);
  const context = step.add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${axes},$)`);
  const body = step.add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,${context},$,.MODEL_VIEW.,$)`);
  const metre = step.add('IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)');
  const units = step.add(`IFCUNITASSIGNMENT((${metre}))`);
  const project = step.add(`IFCPROJECT(${step.globalId()},$,'Synthetic project',$,$,$,$,(${context}),${units})`);
  const sitePlacement = step.add(`IFCLOCALPLACEMENT($,${axes})`);
  const site = step.add(`IFCSITE(${step.globalId()},$,'Site',$,$,${sitePlacement},$,$,.ELEMENT.,$,$,$,$,$)`);
  const buildingPlacement = step.add(`IFCLOCALPLACEMENT(${sitePlacement},${axes})`);
  const building = step.add(`IFCBUILDING(${step.globalId()},$,'Bd',$,$,${buildingPlacement},$,$,.ELEMENT.,$,$,$)`);
  const storeyPlacement = step.add(`IFCLOCALPLACEMENT(${buildingPlacement},${axes})`);
  const storey = step.add(`IFCBUILDINGSTOREY(${step.globalId()},$,'L',$,$,${storeyPlacement},$,$,.ELEMENT.,0.)`);
  step.add(`IFCRELAGGREGATES(${step.globalId()},$,$,$,${project},(${site}))`);
  step.add(`IFCRELAGGREGATES(${step.globalId()},$,$,$,${site},(${building}))`);
  step.add(`IFCRELAGGREGATES(${step.globalId()},$,$,$,${building},(${storey}))`);
  return { storey, storeyPlacement, body, axes, up };
}

/** A box shape of `x` by `y` by `z` millimetres, its corner at the placement's origin. */
function box(step: StepWriter, tree: { body: string; axes: string; up: string }, x: number, y: number, z: number): string {
  const centre = step.add(`IFCCARTESIANPOINT((${x / 2}.,${y / 2}.))`);
  const profilePlacement = step.add(`IFCAXIS2PLACEMENT2D(${centre},$)`);
  const profile = step.add(`IFCRECTANGLEPROFILEDEF(.AREA.,$,${profilePlacement},${x}.,${y}.)`);
  const solid = step.add(`IFCEXTRUDEDAREASOLID(${profile},${tree.axes},${tree.up},${z}.)`);
  const representation = step.add(`IFCSHAPEREPRESENTATION(${tree.body},'Body','SweptSolid',(${solid}))`);
  return step.add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${representation}))`);
}

/** The grid's axis tags: U, V and W axes with tags of one, two and three characters (Finding 12). */
const AXIS_TAGS = { u: ['A', 'B2', 'C10'], v: ['7', '12', '305'], w: ['W', 'W4', 'Wx9'] } as const;
const ALL_AXIS_TAGS: readonly string[] = [...AXIS_TAGS.u, ...AXIS_TAGS.v, ...AXIS_TAGS.w];

/** One IfcGridAxis along a straight line, tagged. */
function gridAxis(step: StepWriter, tag: string, from: readonly [number, number], to: readonly [number, number]): string {
  const start = step.add(`IFCCARTESIANPOINT((${from[0]}.,${from[1]}.))`);
  const end = step.add(`IFCCARTESIANPOINT((${to[0]}.,${to[1]}.))`);
  const line = step.add(`IFCPOLYLINE((${start},${end}))`);
  return step.add(`IFCGRIDAXIS('${tag}',${line},.T.)`);
}

/** A synthetic IFC4 model: one storey holding one wall and one IfcGrid with tagged U, V and W axes. */
function gridModel(): string {
  const step = new StepWriter();
  const tree = spatialTree(step);
  const wallPlacement = step.add(`IFCLOCALPLACEMENT(${tree.storeyPlacement},${tree.axes})`);
  const wall = step.add(`IFCWALL(${step.globalId()},$,'Wl',$,$,${wallPlacement},${box(step, tree, 6000, 200, 3000)},'T',$)`);
  const u = AXIS_TAGS.u.map((tag, index) => gridAxis(step, tag, [index * 3000, -1000], [index * 3000, 7000]));
  const v = AXIS_TAGS.v.map((tag, index) => gridAxis(step, tag, [-1000, index * 3000], [7000, index * 3000]));
  const w = AXIS_TAGS.w.map((tag, index) => gridAxis(step, tag, [index * 3000, 0], [index * 3000 + 6000, 6000]));
  const gridPlacement = step.add(`IFCLOCALPLACEMENT(${tree.storeyPlacement},${tree.axes})`);
  const grid = step.add(`IFCGRID(${step.globalId()},$,'G',$,$,${gridPlacement},$,(${u.join(',')}),(${v.join(',')}),(${w.join(',')}),$)`);
  step.add(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${step.globalId()},$,$,$,(${wall},${grid}),${tree.storey})`);
  return step.file('IFC4');
}

/** A synthetic IFC2X3 model: one storey holding an IfcElectricalElement and an IfcEquipmentElement, each a box. */
function ifc2x3ElementsModel(): string {
  const step = new StepWriter();
  const tree = spatialTree(step);
  const electricalPlacement = step.add(`IFCLOCALPLACEMENT(${tree.storeyPlacement},${tree.axes})`);
  const electrical = step.add(`IFCELECTRICALELEMENT(${step.globalId()},$,'E',$,$,${electricalPlacement},${box(step, tree, 600, 300, 1800)},$)`);
  const equipmentOrigin = step.add('IFCCARTESIANPOINT((2000.,0.,0.))');
  const equipmentAxes = step.add(`IFCAXIS2PLACEMENT3D(${equipmentOrigin},$,$)`);
  const equipmentPlacement = step.add(`IFCLOCALPLACEMENT(${tree.storeyPlacement},${equipmentAxes})`);
  const equipment = step.add(`IFCEQUIPMENTELEMENT(${step.globalId()},$,'Q',$,$,${equipmentPlacement},${box(step, tree, 1200, 800, 1500)},$)`);
  step.add(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${step.globalId()},$,$,$,(${electrical},${equipment}),${tree.storey})`);
  return step.file('IFC2X3');
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

  it.each(FIXTURES)(
    'ADR 0046 · rule 13 · rule 2 / ifc-input 6.2.15 · the view profile of %s holds no model text: every string of the converted file, of any length, is a GlobalId of the model or a word of the view vocabulary',
    async (name) => {
      const text = fixtureText(name);
      const conversion = await convertModel(fixturePath(name), wasmDirectory);
      const strings = fragmentsStrings(conversion.fragments);
      const model = new SingleThreadedFragmentsModel(`test-${name}`, conversion.fragments);
      try {
        // The reading finds the format's strings: every category the file names is among them.
        expect(model.getCategories().filter((category) => !strings.has(category))).toEqual([]);
      } finally {
        model.dispose();
      }
      expect([...modelGlobalIds(text)].some((id) => strings.has(id))).toBe(true);
      expect(modelTextKept(strings, text)).toEqual([]);
      expect(unexpectedStrings(strings, text)).toEqual([]);
    },
  );

  it("ADR 0046 · the library's defaults would copy the model's names, header and property values (why the view profile exists)", async () => {
    const conversion = await convertModel(fixturePath('demo-hotel-arh.ifc'), wasmDirectory, 'library-defaults');
    expect(modelTextKept(fragmentsStrings(conversion.fragments), fixtureText('demo-hotel-arh.ifc')).length).toBeGreaterThan(20);
  });

  it('ADR 0046 · Finding 12 · rule 2 / ifc-input 6.2.15, no text from the model in a view derivative: a grid whose U, V and W axes carry tags of 1, 2 and 3 characters keeps none of them in the converted file, at any length', async () => {
    const text = gridModel();
    // The importer reads the grid: with the library's defaults every tag is in the converted file,
    // in the item it writes for the grid (ThatOpenGrid), outside the attribute exclusion.
    const defaults = fragmentsStrings((await convertText(text, 'library-defaults')).fragments);
    expect(ALL_AXIS_TAGS.filter((tag) => defaults.has(tag))).toEqual(ALL_AXIS_TAGS);

    const conversion = await convertText(text);
    const strings = fragmentsStrings(conversion.fragments);
    expect(ALL_AXIS_TAGS.filter((tag) => strings.has(tag))).toEqual([]);
    expect(modelTextKept(strings, text)).toEqual([]);
    expect(unexpectedStrings(strings, text)).toEqual([]);
    const model = new SingleThreadedFragmentsModel('test-grid', conversion.fragments);
    try {
      // The wall keeps its shape, and the grid stays an IFC item with its GlobalId and nothing else.
      expect(model.getItemsIdsWithGeometry().length).toBeGreaterThan(0);
      expect(model.getCategories().sort()).toEqual(['IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCGRID', 'IFCPROJECT', 'IFCSITE', 'IFCWALL']);
    } finally {
      model.dispose();
    }
  });

  it("ADR 0046 · the view profile converts the shapes of IFC2X3's IfcElectricalElement and IfcEquipmentElement, which the importer's own list leaves out", async () => {
    const text = ifc2x3ElementsModel();
    const conversion = await convertText(text);
    const model = new SingleThreadedFragmentsModel('test-ifc2x3-elements', conversion.fragments);
    try {
      const withShape = new Set(model.getItemsIdsWithGeometry());
      const items = model.getItemsOfCategories([/^IFCELECTRICALELEMENT$/, /^IFCEQUIPMENTELEMENT$/]);
      expect((items.IFCELECTRICALELEMENT ?? []).filter((id) => withShape.has(id))).toHaveLength(1);
      expect((items.IFCEQUIPMENTELEMENT ?? []).filter((id) => withShape.has(id))).toHaveLength(1);
    } finally {
      model.dispose();
    }
    expect(unexpectedStrings(fragmentsStrings(conversion.fragments), text)).toEqual([]);
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
