/**
 * The web-ifc data pass matches the ground truth of all four synthetic models (prompt 3 phase 2
 * exit: "The extractor matches the ground truth for all four IFC files").
 *
 * The ground truth (fixtures/ifc/ground-truth/*.json) is written by the fixture generator
 * together with each model and states what the file contains: every GlobalId, STEP id and
 * verbatim STEP line. This checks the reader's data pass against it, stage by stage (ifc-input
 * 2.2): header and schema, units, the spatial tree, zones and systems, types, elements with
 * their property and quantity sets, the layers that hide an element, the classes present, the
 * findings, and the element register. IFC-11: the IFC2X3 copy gives the same register as rev A,
 * except what IFC2X3 cannot express, which its ground truth lists.
 *
 * The generator writes models with its own STEP writer (fixtures/generators/fixturelib/step.py);
 * the reader reads them with web-ifc's schema (owner decision, 2026-09-26), so an attribute out
 * of order on either side fails here. Neither is a schema validator.
 *
 * Ids: F-IFC-01, F-IFC-02, R-023, R-024, ifc-input 5.4 IFC-4, IFC-11, IFC-13 (reader level).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { IfcModel } from './model';
import { ElementRead, readModel, type ModelReading, type ObjectRead } from './reading';
import { register } from './register';
import { readStepText, textOfBytes, type StepText, type StepToken } from './step-text';

const ROOT = new URL('../../../', import.meta.url);
const MODELS = ['demo-hotel-arh', 'demo-hotel-mep-rev-a', 'demo-hotel-mep-rev-b', 'demo-hotel-mep-ifc2x3'] as const;
const MEP = MODELS.slice(1);

// The ground truth's shape, as far as these tests read it.
interface PropertyTruth {
  readonly stepId: number;
  readonly type: string;
  readonly literal: string;
  readonly excerpt: string;
  readonly unit: { readonly source: string; readonly stepId?: number } | null;
}
interface PsetTruth {
  readonly globalId: string;
  readonly stepId: number;
  readonly relStepId?: number;
  readonly properties: Readonly<Record<string, PropertyTruth>>;
}
type Psets = Readonly<Record<string, PsetTruth>>;
interface Truth {
  readonly schema: string;
  readonly header: Readonly<Record<string, string>>;
  readonly instanceCount: number;
  readonly units: Readonly<Record<string, { readonly stepId: number; readonly excerpt: string }>>;
  readonly extraUnits: readonly { readonly stepId: number }[];
  readonly project: { readonly globalId: string; readonly stepId: number; readonly name: string; readonly phase: string | null; readonly excerpt: string };
  readonly site: { readonly globalId: string; readonly stepId: number };
  readonly building: { readonly globalId: string; readonly name: string; readonly psets: Psets };
  readonly storeys: readonly {
    readonly key: string;
    readonly globalId: string;
    readonly stepId: number;
    readonly name: string;
    readonly elevation: { readonly literal: string };
    readonly excerpt: string;
    readonly spaces: readonly string[];
    readonly containedElements: readonly string[];
  }[];
  readonly spaces: readonly {
    readonly globalId: string;
    readonly stepId: number;
    readonly name: string;
    readonly longName: string;
    readonly predefinedType: string;
    readonly storey: string;
    readonly excerpt: string;
    readonly quantitySet?: {
      readonly set: string;
      readonly stepId: number;
      readonly relStepId: number;
      readonly quantities: Readonly<Record<string, { readonly stepId: number; readonly literal: string; readonly excerpt: string }>>;
    } | null;
    readonly psets: Psets;
  }[];
  readonly zones: readonly { readonly globalId: string; readonly name: string; readonly excerpt: string; readonly members: readonly string[] }[];
  readonly systems: readonly {
    readonly globalId: string;
    readonly class: string;
    readonly name: string;
    readonly predefinedType: string | null;
    readonly objectType: string | null;
    readonly excerpt: string;
    readonly members: readonly string[];
    readonly servicesBuildings?: readonly string[];
  }[];
  readonly types: readonly {
    readonly globalId: string;
    readonly class: string;
    readonly name: string;
    readonly predefinedType: string | null;
    readonly elementType: string | null;
    readonly excerpt: string;
    readonly typedElements: readonly string[];
    readonly psets: Psets;
  }[];
  readonly elements: readonly {
    readonly key: string;
    readonly globalId: string;
    readonly stepId: number;
    readonly class: string;
    readonly name: string;
    readonly tag: string | null;
    readonly description?: string | null;
    readonly objectType?: string | null;
    readonly predefinedType?: string | null;
    readonly excerpt: string;
    readonly container: { readonly globalId: string; readonly class: string } | null;
    readonly systems: readonly string[];
    readonly type?: { readonly globalId: string } | null;
    readonly hiddenLayer?: boolean;
    readonly psets: Psets;
  }[];
  readonly layers: readonly { readonly stepId: number; readonly layerOn: boolean; readonly excerpt: string; readonly assignedElements: readonly string[] }[];
  readonly coverage: { readonly entityClassesPresent: readonly string[] };
  readonly findings: readonly { readonly kind: string; readonly globalId: string; readonly stepId: number }[];
  readonly register?: readonly Record<string, unknown>[];
  readonly ifc2x3Limitations?: readonly { readonly globalId: string }[];
  readonly revision?: {
    readonly changedValues: readonly { readonly element: string; readonly path: string; readonly revA: string; readonly revB: string }[];
    readonly removedElements: readonly string[];
    readonly addedElements: readonly string[];
  };
}

const truths = new Map<string, Truth>();
function truth(name: string): Truth {
  let found = truths.get(name);
  if (found === undefined) {
    found = parse(readFileSync(new URL(`fixtures/ifc/ground-truth/${name}.json`, ROOT), 'utf8'), { schema: 'json' }) as Truth;
    truths.set(name, found);
  }
  return found;
}

const readings = new Map<string, Promise<{ readonly reading: ModelReading; readonly text: StepText }>>();
function read(name: string): Promise<{ readonly reading: ModelReading; readonly text: StepText }> {
  let found = readings.get(name);
  if (found === undefined) {
    found = (async () => {
      const bytes = readFileSync(new URL(`fixtures/ifc/${name}.ifc`, ROOT));
      const text = readStepText(textOfBytes(bytes));
      const model = await IfcModel.open(bytes, text);
      if (!(model instanceof IfcModel)) throw new Error(`${name} did not open`);
      return { reading: readModel(model), text };
    })();
    readings.set(name, found);
  }
  return found;
}

function object(reading: ModelReading, globalId: string): ObjectRead {
  const item = reading.objects.get(globalId);
  if (item === undefined) throw new Error(`${globalId} was not read`);
  return item;
}

/** A literal token written back in STEP form, to compare with the ground truth's literal. */
function literal(token: StepToken | undefined): string {
  if (token === undefined) return '<none>';
  if (token.kind === 'typed') return `${token.typeName}(${literal(token.value)})`;
  return 'token' in token ? token.token : token.kind;
}

async function checkPropertySets(name: string, item: ObjectRead, expected: Psets, through: string, skipClass?: string): Promise<void> {
  const { reading, text } = await read(name);
  const got = new Map(item.propertySets.filter((set) => set.through === through && set.ifcClass !== skipClass).map((set) => [set.name, set]));
  expect([...got.keys()].sort(), `${item.globalId}: property sets`).toEqual(Object.keys(expected).sort());
  for (const [setName, set] of Object.entries(expected)) {
    const read = got.get(setName);
    expect(read?.globalId).toBe(set.globalId);
    expect(read?.stepId).toBe(set.stepId);
    if (set.relStepId !== undefined) expect(read?.relStepId).toBe(set.relStepId);
    const byName = new Map((read?.items ?? []).map((property) => [property.name, property]));
    expect([...byName.keys()].sort()).toEqual(Object.keys(set.properties).sort());
    for (const [propertyName, property] of Object.entries(set.properties)) {
      const readProperty = byName.get(propertyName);
      expect(readProperty?.stepId).toBe(property.stepId);
      const token = readProperty?.entity.token(readProperty.valueAttribute);
      expect(literal(token)).toBe(property.literal);
      expect(token?.kind).toBe('typed');
      if (token?.kind === 'typed') expect(token.typeName).toBe(property.type.toUpperCase());
      expect(text.excerpt(`${property.stepId}`)).toBe(property.excerpt);
      if (property.unit === null) expect(readProperty?.unitStepId).toBeUndefined();
      else if (property.unit.source === 'property Unit') {
        expect(readProperty?.unitStepId).toBe(property.unit.stepId);
        expect(reading.unitByStep.get(readProperty?.unitStepId ?? -1)?.prefix).toBe('KILO');
      } else expect(readProperty?.unitStepId).toBeUndefined();
    }
  }
}

describe.each(MODELS)('F-IFC-01 · R-023: the web-ifc data pass matches the ground truth of %s', (name) => {
  it('F-IFC-01: header and schema, as the file writes them, and no problem in the text', async () => {
    const { reading, text } = await read(name);
    const expected = truth(name);
    expect(reading.schemaName).toBe(expected.schema);
    expect(reading.header.name).toBe(expected.header['fileName']);
    expect(reading.header.originatingSystem).toBe(expected.header['originatingSystem']);
    expect(reading.header.preprocessorVersion).toBe(expected.header['preprocessor']);
    expect(reading.header.timeStamp).toBe(expected.header['timeStamp']);
    expect(reading.header.author).toEqual([expected.header['author']]);
    expect(reading.header.organization).toEqual([expected.header['organization']]);
    expect(reading.header.description).toEqual([expected.header['viewDefinition'], expected.header['description']]);
    expect(text.size).toBe(expected.instanceCount);
    expect(reading.model.allIds()).toHaveLength(expected.instanceCount);
    expect(text.problems).toEqual([]);
  });

  it('F-IFC-01: the project units are read as declared', async () => {
    const { reading, text } = await read(name);
    const { units, extraUnits } = truth(name);
    for (const [unitType, unit] of Object.entries(units)) {
      expect(text.excerpt(`${unit.stepId}`)).toBe(unit.excerpt);
      if (unitType === 'assignment') continue;
      expect(reading.units.get(unitType)?.stepId, unitType).toBe(unit.stepId);
    }
    const assigned = new Set([...reading.units.values()].map((unit) => unit.stepId));
    for (const extra of extraUnits) expect(assigned.has(extra.stepId)).toBe(false);
  });

  it('F-IFC-01: the project, the site and the building', async () => {
    const { reading, text } = await read(name);
    const expected = truth(name);
    const project = reading.project;
    expect(project?.globalId).toBe(expected.project.globalId);
    expect(project?.stepId).toBe(expected.project.stepId);
    expect(project?.text('Name')).toBe(expected.project.name);
    expect(project?.text('Phase') ?? null).toBe(expected.project.phase);
    expect(text.excerpt(`${expected.project.stepId}`)).toBe(expected.project.excerpt);
    const site = object(reading, expected.site.globalId);
    expect([site.kind, site.stepId]).toEqual(['site', expected.site.stepId]);
    const building = object(reading, expected.building.globalId);
    expect(building.kind).toBe('building');
    expect(building.text('Name')).toBe(expected.building.name);
    await checkPropertySets(name, building, expected.building.psets, 'occurrence');
  });

  it('IFC-4 · F-IFC-01: storeys are read as storeys, with their elevation token, spaces and contained elements', async () => {
    const { reading, text } = await read(name);
    const expected = truth(name);
    expect(reading.ofKind('storey').map((item) => item.globalId)).toEqual(expected.storeys.map((storey) => storey.globalId));
    for (const storey of expected.storeys) {
      const item = object(reading, storey.globalId);
      expect(item.stepId).toBe(storey.stepId);
      expect(item.text('Name')).toBe(storey.name);
      expect(item.entity.token('Elevation')).toEqual({ kind: 'real', token: storey.elevation.literal });
      expect(text.excerpt(`${storey.stepId}`)).toBe(storey.excerpt);
      expect(reading.ofKind('space').filter((space) => reading.storeyOf(space.globalId) === storey.globalId).map((space) => space.globalId)).toEqual(storey.spaces);
      const contained = reading.elements().filter((element) => element.container?.relatedGlobalId === storey.globalId);
      expect(contained.map((element) => element.globalId).sort()).toEqual([...storey.containedElements].sort());
    }
  });

  it('F-IFC-01: spaces with their quantity sets', async () => {
    const { reading, text } = await read(name);
    const expected = truth(name);
    expect(reading.ofKind('space')).toHaveLength(expected.spaces.length);
    for (const space of expected.spaces) {
      const item = object(reading, space.globalId);
      expect(item.stepId).toBe(space.stepId);
      expect(item.text('Name')).toBe(space.name);
      expect(item.text('LongName')).toBe(space.longName);
      if (reading.family !== 'IFC2X3') expect(item.predefined).toBe(space.predefinedType);
      expect(reading.storeyOf(item.globalId)).toBe(space.storey);
      expect(text.excerpt(`${space.stepId}`)).toBe(space.excerpt);
      const quantitySets = item.propertySets.filter((set) => set.ifcClass === 'IfcElementQuantity');
      if (space.quantitySet === undefined || space.quantitySet === null) expect(quantitySets).toEqual([]);
      else {
        expect(quantitySets).toHaveLength(1);
        const [set] = quantitySets;
        expect([set?.name, set?.stepId, set?.relStepId]).toEqual([space.quantitySet.set, space.quantitySet.stepId, space.quantitySet.relStepId]);
        const byName = new Map((set?.items ?? []).map((quantity) => [quantity.name, quantity]));
        expect([...byName.keys()].sort()).toEqual(Object.keys(space.quantitySet.quantities).sort());
        for (const [quantityName, quantity] of Object.entries(space.quantitySet.quantities)) {
          const read = byName.get(quantityName);
          expect(read?.stepId).toBe(quantity.stepId);
          expect(literal(read?.entity.token(read.valueAttribute))).toBe(quantity.literal);
          expect(text.excerpt(`${quantity.stepId}`)).toBe(quantity.excerpt);
        }
      }
      await checkPropertySets(name, item, space.psets, 'occurrence', 'IfcElementQuantity');
    }
  });

  it('F-IFC-01: zones and their members', async () => {
    const { reading, text } = await read(name);
    const expected = truth(name);
    expect(reading.ofKind('zone').map((zone) => zone.globalId)).toEqual(expected.zones.map((zone) => zone.globalId));
    for (const zone of expected.zones) {
      const item = object(reading, zone.globalId);
      expect(item.text('Name')).toBe(zone.name);
      expect(text.excerpt(`${item.stepId}`)).toBe(zone.excerpt);
      const members = [...reading.objects.values()].filter((member) => member.relations.some((link) => link.kind === 'assigns_to_group' && link.relatedGlobalId === zone.globalId));
      expect(members.map((member) => member.globalId).sort()).toEqual([...zone.members].sort());
    }
  });

  it('F-IFC-01: systems, their members and the buildings they serve', async () => {
    const { reading, text } = await read(name);
    const expected = truth(name);
    expect(reading.ofKind('system').map((system) => system.globalId)).toEqual(expected.systems.map((system) => system.globalId));
    for (const system of expected.systems) {
      const item = object(reading, system.globalId);
      expect(item.ifcClass).toBe(system.class);
      expect(item.text('Name')).toBe(system.name);
      expect(item.predefined ?? null).toBe(system.predefinedType);
      expect(item.text('ObjectType') ?? null).toBe(system.objectType);
      expect(text.excerpt(`${item.stepId}`)).toBe(system.excerpt);
      const members = reading.elements().filter((element) => element.systems.some((link) => link.relatedGlobalId === system.globalId));
      expect(members.map((member) => member.globalId).sort()).toEqual([...system.members].sort());
      expect((reading.services.get(system.globalId) ?? []).map((link) => link.relatedGlobalId)).toEqual(system.servicesBuildings ?? []);
    }
  });

  it('F-IFC-01: type objects with their property sets', async () => {
    const { reading, text } = await read(name);
    for (const type of truth(name).types) {
      const item = object(reading, type.globalId);
      expect(item.kind).toBe('type');
      expect(item.ifcClass).toBe(type.class);
      expect(item.text('Name')).toBe(type.name);
      expect(item.predefined ?? null).toBe(type.predefinedType);
      expect(item.text('ElementType') ?? null).toBe(type.elementType);
      expect(text.excerpt(`${item.stepId}`)).toBe(type.excerpt);
      const typed = reading.elements().filter((element) => element.typeRelation?.relatedGlobalId === type.globalId);
      expect(typed.map((element) => element.globalId).sort()).toEqual([...type.typedElements].sort());
      await checkPropertySets(name, item, type.psets, 'type_object');
    }
  });

  it('F-IFC-01: elements with their attributes, container, systems, type and property sets', async () => {
    const { reading, text } = await read(name);
    const expected = truth(name);
    const elements = new Map(reading.elements().map((element) => [element.globalId, element]));
    expect([...elements.keys()].sort()).toEqual(expected.elements.map((element) => element.globalId).sort());
    for (const element of expected.elements) {
      const item = elements.get(element.globalId);
      if (item === undefined) throw new Error(`${element.key} was not read`);
      expect(item.stepId).toBe(element.stepId);
      expect(item.ifcClass).toBe(element.class);
      expect(item.text('Name')).toBe(element.name);
      expect(item.text('Tag') ?? null).toBe(element.tag);
      expect(item.text('Description') ?? null).toBe(element.description ?? null);
      expect(item.text('ObjectType') ?? null).toBe(element.objectType ?? null);
      if (element.predefinedType !== undefined && element.predefinedType !== null) expect(item.predefined).toBe(element.predefinedType);
      expect(text.excerpt(`${item.stepId}`)).toBe(element.excerpt);
      if (element.container === null) expect(item.container).toBeUndefined();
      else {
        expect(item.container?.relatedGlobalId).toBe(element.container.globalId);
        expect(object(reading, element.container.globalId).ifcClass).toBe(element.container.class);
      }
      const systems = item.systems.map((link) => object(reading, link.relatedGlobalId).text('Name') ?? '');
      expect(systems.sort()).toEqual([...element.systems].sort());
      if (element.type === undefined || element.type === null) expect(item.typeRelation).toBeUndefined();
      else expect(item.typeRelation?.relatedGlobalId).toBe(element.type.globalId);
      expect(item.hiddenLayers.length > 0).toBe(element.hiddenLayer === true);
      await checkPropertySets(name, item, element.psets, 'occurrence');
    }
  });

  it('F-IFC-02 · rule 14: a switched-off layer hides exactly its elements', async () => {
    const { reading, text } = await read(name);
    const off = truth(name).layers.filter((layer) => !layer.layerOn);
    const hidden = reading.elements().filter((element) => element.hiddenLayers.length > 0);
    expect(hidden.map((element) => element.globalId).sort()).toEqual(off.flatMap((layer) => layer.assignedElements).sort());
    for (const layer of off) {
      expect(text.excerpt(`${layer.stepId}`)).toBe(layer.excerpt);
      for (const globalId of layer.assignedElements) {
        const element = reading.objects.get(globalId);
        expect(element instanceof ElementRead ? element.hiddenLayers : undefined).toEqual([layer.stepId]);
      }
    }
  });

  it('R-023: the classes present are named as the schema names them; only geometry and the site extent are not read, and in IFC2X3 what IFC2X3 cannot express', async () => {
    const { reading } = await read(name);
    expect(reading.classesPresent.map((name_) => name_.toUpperCase()).sort()).toEqual([...truth(name).coverage.entityClassesPresent].sort());
    const reasons = reading.model.notReadList().map((entry) => [entry.scope, entry.reason]);
    expect(reasons.filter(([, reason]) => !String(reason).startsWith('ifc2x3.'))).toEqual([
      ['geometry', 'geometry.not_processed'],
      ['geometry', 'hidden_content.site_extent_unknown'],
    ]);
    if (reading.family !== 'IFC2X3') expect(reasons.filter(([, reason]) => String(reason).startsWith('ifc2x3.'))).toEqual([]);
  });

  it('G14-3 · F-IFC-02: the findings are exactly the ground truth findings', async () => {
    const { reading } = await read(name);
    const expected = truth(name).findings.map((item) => `${item.kind} ${item.globalId} ${String(item.stepId)}`);
    const got = reading.findings.map((item) => `${item.kind} ${item.globalId ?? ''} ${String(item.stepIds[0])}`);
    expect(got.sort()).toEqual(expected.sort());
  });
});

describe.each(MEP)('IFC-11 · F-IFC-01: the element register of %s', (name) => {
  it('IFC-11: the register matches the ground truth', async () => {
    const { reading } = await read(name);
    const expected = truth(name);
    const storeys = new Map(expected.storeys.map((storey) => [storey.globalId, storey.key]));
    const got = register(reading).map((row) => ({
      globalId: row.globalId,
      engineeringTag: row.engineeringTag ?? null,
      ifc4Class: row.ifc4Class,
      resolvedPredefinedType: row.resolvedPredefined ?? null,
      userDefinedType: row.userDefined ?? null,
      storey: row.storey === undefined ? null : (storeys.get(row.storey) ?? null),
      systems: [...row.systems].sort(),
    }));
    const wanted: Record<string, unknown>[] = (expected.register ?? []).map((row) => ({ ...row, systems: [...(row['systems'] as string[])].sort() }));
    const byId = (rows: readonly Record<string, unknown>[]) => [...rows].sort((a, b) => String(a['globalId']).localeCompare(String(b['globalId'])));
    expect(byId(got)).toEqual(byId(wanted));
  });
});

describe('ifc-input 5.4: cases at the reader level (proposed, not indexed)', () => {
  it('IFC-11: the IFC2X3 copy gives the same register as rev A, except its listed limits', async () => {
    const revA = new Map(register((await read('demo-hotel-mep-rev-a')).reading).map((row) => [row.globalId, row]));
    const copy = new Map(register((await read('demo-hotel-mep-ifc2x3')).reading).map((row) => [row.globalId, row]));
    expect([...copy.keys()].sort()).toEqual([...revA.keys()].sort());
    const limited = new Set((truth('demo-hotel-mep-ifc2x3').ifc2x3Limitations ?? []).map((entry) => entry.globalId));
    for (const [globalId, row] of revA) {
      const other = copy.get(globalId);
      expect([other?.engineeringTag, other?.ifc4Class, other?.storey, [...(other?.systems ?? [])].sort()]).toEqual([row.engineeringTag, row.ifc4Class, row.storey, [...row.systems].sort()]);
      const sameType = other?.resolvedPredefined === row.resolvedPredefined && other?.userDefined === row.userDefined;
      if (!sameType) {
        const proxy = row.ifc4Class === 'IfcBuildingElementProxy';
        expect(limited.has(globalId) || (proxy && other?.resolvedPredefined === undefined), globalId).toBe(true);
      }
    }
  });

  it('IFC-11 · ifc-input 5.3: the IFC2X3 copy\'s coverage records each limit its ground truth lists, and no element IFC2X3 expresses (the phase 2 review)', async () => {
    const { reading } = await read('demo-hotel-mep-ifc2x3');
    const entries = reading.model.notReadList().filter((entry) => entry.reason.startsWith('ifc2x3.'));
    const recorded = new Set(entries.flatMap((entry) => entry.globalIds));
    const limits = truth('demo-hotel-mep-ifc2x3').ifc2x3Limitations ?? [];
    const named = limits.flatMap((entry) => (entry.globalId === null ? [] : [entry.globalId]));
    expect(named.length).toBeGreaterThan(0);
    for (const globalId of named) expect(recorded.has(globalId), globalId).toBe(true);
    // The limit with no element (IFC2X3 has no IfcDistributionSystem) is one class entry naming every system.
    expect(limits.some((entry) => entry.globalId === null)).toBe(true);
    const systems = entries.find((entry) => entry.reason === 'ifc2x3.system_kind_not_expressible');
    expect(systems?.scope).toBe('class');
    expect([...(systems?.globalIds ?? [])].sort()).toEqual(truth('demo-hotel-mep-ifc2x3').systems.map((system) => system.globalId).sort());
    // Nothing else: the element entries are exactly the listed limits (the VCV fan coils' prose kind is IFC2X3's own).
    expect(entries.filter((entry) => entry.scope === 'element').flatMap((entry) => entry.globalIds).sort()).toEqual([...named].sort());
  });

  it('IFC-13: rev B keeps every other GlobalId, and its one changed value is a different token on the same path', async () => {
    const revision = truth('demo-hotel-mep-rev-b').revision;
    if (revision === undefined) throw new Error('rev B has no revision record');
    const revA = new Set((await read('demo-hotel-mep-rev-a')).reading.elements().map((element) => element.globalId));
    const revB = new Set((await read('demo-hotel-mep-rev-b')).reading.elements().map((element) => element.globalId));
    expect([...revA].filter((id) => !revB.has(id))).toEqual(revision.removedElements);
    expect([...revB].filter((id) => !revA.has(id))).toEqual(revision.addedElements);
    const [change] = revision.changedValues;
    if (change === undefined) throw new Error('rev B changes no value');
    const [setName, propertyName] = change.path.split('.');
    const tokens: string[] = [];
    for (const name of ['demo-hotel-mep-rev-a', 'demo-hotel-mep-rev-b']) {
      const element = object((await read(name)).reading, change.element);
      const property = element.propertySets.find((set) => set.name === setName)?.items.find((item) => item.name === propertyName);
      tokens.push(literal(property?.entity.token(property.valueAttribute)));
    }
    expect(tokens.map((token) => token.replace(/^IFCPOWERMEASURE\((.*)\)$/u, '$1').replace(/\.$/u, ''))).toEqual([change.revA, change.revB]);
  });

  it('IFC-4 · R-033: storeys are never counted into floors: the only storey count is the file\'s own property value', async () => {
    const { reading } = await read('demo-hotel-arh');
    expect(reading.ofKind('storey')).toHaveLength(truth('demo-hotel-arh').storeys.length);
    const counts = [...reading.objects.values()].flatMap((item) => item.propertySets.flatMap((set) => set.items.filter((property) => property.name.toLowerCase().includes('storey')).map((property) => property.name)));
    expect(counts).toEqual(['NumberOfStoreys']);
    expect('floors' in reading || 'floorCount' in reading).toBe(false);
  });
});
