/**
 * The IFC data pass: what a model holds, read with web-ifc in the order ifc-input 2.2 gives.
 *
 * 1. header and schema;
 * 2. units (the project's unit assignment, and units that values name themselves);
 * 3. the spatial tree (project, sites, buildings, storeys, spaces, and how they aggregate);
 * 4. groups and systems (zones, systems, their members, the buildings a system serves);
 * 5. elements with their types and property and quantity sets, containment and control links;
 * 6. geometry last: presentation layers switched off (hidden content, rule 14), and a record
 *    that shapes were not processed. Shapes are phase 4 (the viewer's conversion), so an
 *    element "placed outside the site's extent" (ifc-input 6.2.13) is not checked here, and
 *    coverage says so.
 * In an IFC2X3 model, coverage also records what IFC2X3 cannot express and IFC4 can (ifc-input
 * 5.3, "recorded in coverage"; the phase 2 review): a kind its enumeration lacks, written as
 * USERDEFINED; a class IFC4 split, read by its function; and systems, which have no kind at all
 * (`recordIfc2x3Limits`).
 *
 * The result is a `ModelReading`: every value as web-ifc read it, with the STEP ids that hold
 * it and, through ./model.ts, the literal token the file writes; what could not be read, as
 * codes, GlobalIds and STEP ids (rule 13); and findings. Nothing here is a candidate, and
 * nothing maps model content to an app field: under guardrails v1.6 no value may be stored
 * from a model (ifc-input 6.1; the `ifc-values` gate). Storeys are read as storeys and never
 * counted into floors (rule 8; ifc-input 6.2.8).
 *
 * The stages and their codes follow the reader this replaces (the Python extractor's IFC data
 * pass on its own schema tables, superseded by the owner's decision of 2026-09-26; ADR 0024),
 * so an output reads the same whichever build wrote it.
 */
import * as WebIFC from 'web-ifc';
import { detect } from './instructions';
import { enumName, globalIdOf, refs, textOf, type Entity, type Family, type IfcModel, type Kind, type WebValue } from './model';
import { ifc4Class, resolvedType } from './register';
import type { StepToken } from './step-text';

export type UnitKind = 'si' | 'conversion_based' | 'derived' | 'monetary' | 'context_dependent';
export type Through = 'occurrence' | 'type_object';
export type RelationKind =
  | 'aggregates'
  | 'nests'
  | 'assigns_to_group'
  | 'services_buildings'
  | 'contained_in_spatial_structure'
  | 'referenced_in_spatial_structure'
  | 'defines_by_type'
  | 'flow_control_elements';

const TEXT_ATTRIBUTES = ['Name', 'Description', 'ObjectType', 'LongName'] as const;
const TEXT_TYPES = new Set(['IFCLABEL', 'IFCTEXT', 'IFCIDENTIFIER', 'IFCDESCRIPTIVEMEASURE']);

/** The unit type each quantity class is measured in, when it names no unit of its own. */
export const QUANTITY_UNIT_TYPES: Readonly<Record<string, string>> = {
  IfcQuantityArea: 'AREAUNIT',
  IfcQuantityLength: 'LENGTHUNIT',
  IfcQuantityVolume: 'VOLUMEUNIT',
  IfcQuantityWeight: 'MASSUNIT',
  IfcQuantityTime: 'TIMEUNIT',
};

/**
 * The unit type a measure type is expressed in, for values that name no unit of their own
 * (IFC4 IfcMeasureValue and IfcDerivedMeasureValue against IfcUnitEnum and IfcDerivedUnitEnum).
 */
export const MEASURE_UNIT_TYPES: Readonly<Record<string, string>> = {
  IFCAREAMEASURE: 'AREAUNIT',
  IFCLENGTHMEASURE: 'LENGTHUNIT',
  IFCPOSITIVELENGTHMEASURE: 'LENGTHUNIT',
  IFCNONNEGATIVELENGTHMEASURE: 'LENGTHUNIT',
  IFCVOLUMEMEASURE: 'VOLUMEUNIT',
  IFCMASSMEASURE: 'MASSUNIT',
  IFCTIMEMEASURE: 'TIMEUNIT',
  IFCPLANEANGLEMEASURE: 'PLANEANGLEUNIT',
  IFCPOSITIVEPLANEANGLEMEASURE: 'PLANEANGLEUNIT',
  IFCTHERMODYNAMICTEMPERATUREMEASURE: 'THERMODYNAMICTEMPERATUREUNIT',
  IFCPOWERMEASURE: 'POWERUNIT',
  IFCENERGYMEASURE: 'ENERGYUNIT',
  IFCPRESSUREMEASURE: 'PRESSUREUNIT',
  IFCELECTRICCURRENTMEASURE: 'ELECTRICCURRENTUNIT',
  IFCELECTRICVOLTAGEMEASURE: 'ELECTRICVOLTAGEUNIT',
  IFCFREQUENCYMEASURE: 'FREQUENCYUNIT',
  IFCILLUMINANCEMEASURE: 'ILLUMINANCEUNIT',
  IFCLUMINOUSFLUXMEASURE: 'LUMINOUSFLUXUNIT',
  IFCVOLUMETRICFLOWRATEMEASURE: 'VOLUMETRICFLOWRATEUNIT',
  IFCMASSFLOWRATEMEASURE: 'MASSFLOWRATEUNIT',
  IFCLINEARVELOCITYMEASURE: 'LINEARVELOCITYUNIT',
  IFCTHERMALTRANSMITTANCEMEASURE: 'THERMALTRANSMITTANCEUNIT',
  IFCHEATFLUXDENSITYMEASURE: 'HEATFLUXDENSITYUNIT',
  IFCSOUNDPOWERMEASURE: 'SOUNDPOWERUNIT',
  IFCSOUNDPRESSUREMEASURE: 'SOUNDPRESSUREUNIT',
  IFCELECTRICRESISTANCEMEASURE: 'ELECTRICRESISTANCEUNIT',
  IFCMONETARYMEASURE: 'MONETARYUNIT',
};

const QUANTITY_CLASSES = new Set(['IfcQuantityArea', 'IfcQuantityLength', 'IfcQuantityVolume', 'IfcQuantityCount', 'IfcQuantityWeight', 'IfcQuantityTime', 'IfcQuantityNumber']);

/** A unit as the file declares it: kind, unit type, prefix and name, as written. */
export interface UnitRead {
  readonly stepId: number;
  readonly kind: UnitKind;
  readonly unitType: string;
  readonly name: string;
  readonly prefix: string | undefined;
}

/** One property or quantity, with the unit it names itself, if any. */
export interface PropertyRead {
  readonly stepId: number;
  readonly ifcClass: string;
  readonly name: string;
  /** The attribute that holds the value (NominalValue, EnumerationValues, ListValues, AreaValue, ...). */
  readonly valueAttribute: string;
  readonly entity: Entity;
  readonly unitStepId: number | undefined;
  readonly isQuantity: boolean;
}

/** A property set or quantity set on an object, directly or through its type object. */
export interface PropertySetRead {
  readonly stepId: number;
  readonly globalId: string | undefined;
  readonly ifcClass: string;
  readonly name: string;
  readonly through: Through;
  readonly relStepId: number | undefined;
  readonly items: readonly PropertyRead[];
}

/** A relationship instance linking this object to another, by GlobalId. */
export interface Relation {
  readonly kind: RelationKind;
  readonly relStepId: number;
  readonly relatedGlobalId: string;
  readonly relatedStepId: number;
}

/** One IfcRoot object the data pass reads: its entity, GlobalId and what hangs off it. */
export class ObjectRead {
  readonly propertySets: PropertySetRead[] = [];
  readonly relations: Relation[] = [];

  constructor(
    readonly entity: Entity,
    readonly globalId: string,
    readonly kind: Kind,
    private readonly family: Family,
  ) {}

  get stepId(): number {
    return this.entity.stepId;
  }

  get ifcClass(): string {
    return this.entity.name;
  }

  text(attribute: string): string | undefined {
    return textOf(this.entity.get(attribute));
  }

  enum(attribute: string): string | undefined {
    return enumName(this.entity.get(attribute));
  }

  /**
   * The attribute that holds the predefined kind: PredefinedType, or in IFC2X3 the classes that
   * call it otherwise (IfcElectricDistributionPoint's DistributionPointFunction,
   * IfcTransportElement's OperationType).
   */
  get predefinedAttribute(): string | undefined {
    if (this.entity.has('PredefinedType')) return 'PredefinedType';
    if (this.family === 'IFC2X3' && this.ifcClass === 'IfcElectricDistributionPoint') return 'DistributionPointFunction';
    if (this.family === 'IFC2X3' && this.ifcClass === 'IfcTransportElement') return 'OperationType';
    return undefined;
  }

  /** The attribute that holds the user-defined kind when the predefined one is USERDEFINED. */
  get userDefinedAttribute(): string | undefined {
    if (this.predefinedAttribute === undefined) return undefined;
    if (this.kind === 'type') return this.entity.has('ElementType') ? 'ElementType' : undefined;
    if (this.ifcClass === 'IfcElectricDistributionPoint') return 'UserDefinedFunction';
    return this.entity.has('ObjectType') ? 'ObjectType' : undefined;
  }

  get predefined(): string | undefined {
    const attribute = this.predefinedAttribute;
    return attribute === undefined ? undefined : this.enum(attribute);
  }
}

/** An element occurrence, with its container, systems, type and the layers hiding it. */
export class ElementRead extends ObjectRead {
  container: Relation | undefined;
  readonly systems: Relation[] = [];
  typeRelation: Relation | undefined;
  readonly hiddenLayers: number[] = [];
}

/** A finding for the engineer: kind, code, and where (GlobalId, STEP ids, class). */
export interface Finding {
  readonly kind: 'embedded_instruction' | 'hidden_content' | 'schema_error';
  readonly code: string;
  readonly globalId: string | undefined;
  readonly stepIds: readonly number[];
  readonly ifcClass: string | undefined;
  readonly inHeader: boolean;
}

/** The header as web-ifc read it (ISO 10303-21 section 8). */
export interface FileHeader {
  readonly description: readonly string[];
  readonly name: string | undefined;
  readonly timeStamp: string | undefined;
  readonly author: readonly string[];
  readonly organization: readonly string[];
  readonly preprocessorVersion: string | undefined;
  readonly originatingSystem: string | undefined;
}

/** Everything the data pass read from one model. */
export class ModelReading {
  project: ObjectRead | undefined;
  readonly objects = new Map<string, ObjectRead>();
  readonly units = new Map<string, UnitRead>();
  readonly unitByStep = new Map<number, UnitRead>();
  readonly aggregates = new Map<string, Relation>();
  readonly flowControls: { readonly relStepId: number; readonly controls: readonly string[]; readonly flow: string }[] = [];
  readonly services = new Map<string, Relation[]>();
  readonly findings: Finding[] = [];
  classesPresent: string[] = [];

  constructor(
    readonly model: IfcModel,
    readonly header: FileHeader,
  ) {}

  get schemaName(): string {
    return this.model.schemaName;
  }

  get family(): Family {
    return this.model.family;
  }

  ofKind(kind: Kind): ObjectRead[] {
    return [...this.objects.values()].filter((item) => item.kind === kind);
  }

  elements(): ElementRead[] {
    return [...this.objects.values()].filter((item): item is ElementRead => item instanceof ElementRead);
  }

  /** The storey an object sits in: itself, or up its aggregation (a space in a storey). */
  storeyOf(globalId: string): string | undefined {
    const seen = new Set<string>();
    let current: string | undefined = globalId;
    while (current !== undefined && !seen.has(current)) {
      seen.add(current);
      const item = this.objects.get(current);
      if (item?.kind === 'storey') return current;
      current = this.aggregates.get(current)?.relatedGlobalId;
    }
    return undefined;
  }
}

const KIND_ORDER: readonly Kind[] = ['project', 'site', 'building', 'storey', 'space', 'zone', 'system', 'type', 'element'];

function texts(value: WebValue): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => {
    const text = textOf(item);
    return text === undefined ? [] : [text];
  });
}

function header(model: IfcModel): FileHeader {
  const description = model.headerArguments(WebIFC.FILE_DESCRIPTION);
  const name = model.headerArguments(WebIFC.FILE_NAME);
  return {
    description: texts(description[0]),
    name: textOf(name[0]),
    timeStamp: textOf(name[1]),
    author: texts(name[2]),
    organization: texts(name[3]),
    preprocessorVersion: textOf(name[4]),
    originatingSystem: textOf(name[5]),
  };
}

function readObjects(reading: ModelReading, model: IfcModel): void {
  const byKind = new Map<Kind, number[]>(KIND_ORDER.map((kind) => [kind, []]));
  for (const id of model.allIds()) {
    const kind = model.kindOf(id);
    if (kind !== undefined) byKind.get(kind)?.push(id);
  }
  for (const kind of KIND_ORDER) {
    for (const id of byKind.get(kind) ?? []) {
      const entity = model.entity(id);
      if (entity === undefined) continue;
      const globalId = globalIdOf(entity);
      if (globalId === undefined) {
        model.notRead('element', 'globalid.invalid', entity.name).add(undefined, entity.stepId);
        continue;
      }
      if (reading.objects.has(globalId)) {
        model.notRead('element', 'globalid.duplicate', entity.name).add(globalId, entity.stepId);
        continue;
      }
      const item = kind === 'element' ? new ElementRead(entity, globalId, kind, model.family) : new ObjectRead(entity, globalId, kind, model.family);
      reading.objects.set(globalId, item);
    }
  }
  const projects = reading.ofKind('project');
  const [only] = projects;
  reading.project = projects.length === 1 ? only : undefined;
  if (projects.length !== 1) model.notRead('header', 'project.count', 'IfcProject').add(undefined, only?.stepId);
}

function readUnit(reading: ModelReading, model: IfcModel, stepId: number): UnitRead | undefined {
  const known = reading.unitByStep.get(stepId);
  if (known !== undefined) return known;
  const entity = model.entity(stepId);
  if (entity === undefined) return undefined;
  const unitType = enumName(entity.get('UnitType'));
  let unit: UnitRead | undefined;
  if (entity.name === 'IfcSIUnit' && unitType !== undefined) {
    const name = enumName(entity.get('Name'));
    if (name !== undefined) unit = { stepId, kind: 'si', unitType, name, prefix: enumName(entity.get('Prefix')) };
  } else if ((entity.name === 'IfcConversionBasedUnit' || entity.name === 'IfcConversionBasedUnitWithOffset') && unitType !== undefined) {
    const name = textOf(entity.get('Name'));
    if (name !== undefined) unit = { stepId, kind: 'conversion_based', unitType, name, prefix: undefined };
  } else if (entity.name === 'IfcContextDependentUnit' && unitType !== undefined) {
    const name = textOf(entity.get('Name'));
    if (name !== undefined) unit = { stepId, kind: 'context_dependent', unitType, name, prefix: undefined };
  } else if (entity.name === 'IfcDerivedUnit' && unitType !== undefined) {
    const parts = refs(entity.get('Elements')).map((element) => derivedPart(reading, model, element));
    if (parts.length > 0 && parts.every((part) => part !== undefined)) unit = { stepId, kind: 'derived', unitType, name: parts.join(' '), prefix: undefined };
  } else if (entity.name === 'IfcMonetaryUnit') {
    const currency = textOf(entity.get('Currency')) ?? enumName(entity.get('Currency'));
    if (currency !== undefined) unit = { stepId, kind: 'monetary', unitType: 'MONETARYUNIT', name: currency, prefix: undefined };
  } else {
    return undefined;
  }
  if (unit === undefined) {
    model.notRead('element', 'unit.unreadable', entity.name).add(undefined, stepId);
    return undefined;
  }
  reading.unitByStep.set(stepId, unit);
  return unit;
}

/** One factor of a derived unit, as written: its unit's prefix and name, and the exponent's token. */
function derivedPart(reading: ModelReading, model: IfcModel, elementId: number): string | undefined {
  const element = model.entity(elementId);
  if (element?.name !== 'IfcDerivedUnitElement') return undefined;
  const [base] = refs(element.get('Unit'));
  const unit = base === undefined ? undefined : readUnit(reading, model, base);
  const exponent: StepToken | undefined = element.token('Exponent');
  if (unit === undefined || exponent?.kind !== 'integer') return undefined;
  return `${unit.prefix ?? ''}${unit.name}^${exponent.token}`;
}

function readUnits(reading: ModelReading, model: IfcModel): void {
  const project = reading.project;
  if (project === undefined) return;
  const [assignmentId] = refs(project.entity.get('UnitsInContext'));
  if (assignmentId === undefined) {
    model.notRead('header', 'units.no_assignment', 'IfcProject').add(project.globalId, project.stepId);
    return;
  }
  const assignment = model.entity(assignmentId);
  if (assignment?.name !== 'IfcUnitAssignment') {
    model.notRead('header', 'units.no_assignment', 'IfcUnitAssignment').add(undefined, assignmentId);
    return;
  }
  for (const unitId of refs(assignment.get('Units'))) {
    const unit = readUnit(reading, model, unitId);
    if (unit !== undefined && !reading.units.has(unit.unitType)) reading.units.set(unit.unitType, unit);
  }
}

/** The objects a relation names, when the data pass read them (the same instance, by GlobalId). */
function targets(reading: ModelReading, model: IfcModel, ids: readonly number[]): ObjectRead[] {
  return ids.flatMap((stepId) => {
    const entity = model.entity(stepId);
    if (entity === undefined) return [];
    const globalId = globalIdOf(entity);
    const item = globalId === undefined ? undefined : reading.objects.get(globalId);
    return item !== undefined && item.stepId === stepId ? [item] : [];
  });
}

function readSpatialTree(reading: ModelReading, model: IfcModel): void {
  for (const rel of model.entitiesOf(['IfcRelAggregates', 'IfcRelNests'])) {
    const [parent] = targets(reading, model, refs(rel.get('RelatingObject')));
    if (parent === undefined) continue;
    const kind: RelationKind = rel.name === 'IfcRelAggregates' ? 'aggregates' : 'nests';
    for (const child of targets(reading, model, refs(rel.get('RelatedObjects')))) {
      const link: Relation = { kind, relStepId: rel.stepId, relatedGlobalId: parent.globalId, relatedStepId: parent.stepId };
      child.relations.push(link);
      if (kind === 'aggregates' && !reading.aggregates.has(child.globalId)) reading.aggregates.set(child.globalId, link);
    }
  }
}

function readGroups(reading: ModelReading, model: IfcModel): void {
  for (const rel of model.entitiesOf(['IfcRelAssignsToGroup', 'IfcRelAssignsToGroupByFactor'])) {
    const [group] = targets(reading, model, refs(rel.get('RelatingGroup')));
    if (group === undefined) continue;
    for (const member of targets(reading, model, refs(rel.get('RelatedObjects')))) {
      const link: Relation = { kind: 'assigns_to_group', relStepId: rel.stepId, relatedGlobalId: group.globalId, relatedStepId: group.stepId };
      member.relations.push(link);
      if (member instanceof ElementRead && group.kind === 'system') member.systems.push(link);
    }
  }
  for (const rel of model.entitiesOf(['IfcRelServicesBuildings'])) {
    const [system] = targets(reading, model, refs(rel.get('RelatingSystem')));
    if (system === undefined) continue;
    for (const building of targets(reading, model, refs(rel.get('RelatedBuildings')))) {
      const link: Relation = { kind: 'services_buildings', relStepId: rel.stepId, relatedGlobalId: building.globalId, relatedStepId: building.stepId };
      system.relations.push(link);
      const served = reading.services.get(system.globalId) ?? [];
      served.push(link);
      reading.services.set(system.globalId, served);
    }
  }
}

function readProperty(model: IfcModel, stepId: number): PropertyRead | undefined {
  const entity = model.entity(stepId);
  if (entity === undefined) {
    model.notRead('property_set', 'property.not_read', model.className(stepId)).add(undefined, stepId);
    return undefined;
  }
  const name = textOf(entity.get('Name'));
  if (name === undefined) {
    model.notRead('property_set', 'property.no_name', entity.name).add(undefined, stepId);
    return undefined;
  }
  const [unit] = refs(entity.get('Unit'));
  if (entity.name === 'IfcPropertySingleValue') return { stepId, ifcClass: entity.name, name, valueAttribute: 'NominalValue', entity, unitStepId: unit, isQuantity: false };
  if (entity.name === 'IfcPropertyEnumeratedValue') return { stepId, ifcClass: entity.name, name, valueAttribute: 'EnumerationValues', entity, unitStepId: undefined, isQuantity: false };
  if (entity.name === 'IfcPropertyListValue') return { stepId, ifcClass: entity.name, name, valueAttribute: 'ListValues', entity, unitStepId: unit, isQuantity: false };
  const valueAttribute = entity.attributes[3];
  if (QUANTITY_CLASSES.has(entity.name) && valueAttribute !== undefined) {
    return { stepId, ifcClass: entity.name, name, valueAttribute, entity, unitStepId: unit, isQuantity: true };
  }
  model.notRead('property_set', 'property.kind_not_read', entity.name).add(undefined, stepId);
  return undefined;
}

function readPropertySet(model: IfcModel, stepId: number, through: Through, relStepId: number | undefined): PropertySetRead | undefined {
  const entity = model.entity(stepId);
  const kind = entity === undefined ? undefined : model.isA(entity, 'IFCPROPERTYSET') ? 'property_set' : model.isA(entity, 'IFCELEMENTQUANTITY') ? 'quantity_set' : undefined;
  if (entity === undefined || kind === undefined) {
    model.notRead('property_set', 'property_set.not_read', entity?.name ?? model.className(stepId)).add(undefined, stepId);
    return undefined;
  }
  const name = textOf(entity.get('Name'));
  if (name === undefined) {
    model.notRead('property_set', 'property_set.no_name', entity.name).add(undefined, stepId);
    return undefined;
  }
  const members = refs(entity.get(kind === 'property_set' ? 'HasProperties' : 'Quantities'));
  const items = members.flatMap((member) => {
    const item = readProperty(model, member);
    return item === undefined ? [] : [item];
  });
  return { stepId, globalId: globalIdOf(entity), ifcClass: entity.name, name, through, relStepId, items };
}

function readElements(reading: ModelReading, model: IfcModel): void {
  for (const rel of model.entitiesOf(['IfcRelContainedInSpatialStructure', 'IfcRelReferencedInSpatialStructure'])) {
    const [structure] = targets(reading, model, refs(rel.get('RelatingStructure')));
    if (structure === undefined) continue;
    const kind: RelationKind = rel.name === 'IfcRelContainedInSpatialStructure' ? 'contained_in_spatial_structure' : 'referenced_in_spatial_structure';
    for (const element of targets(reading, model, refs(rel.get('RelatedElements')))) {
      const link: Relation = { kind, relStepId: rel.stepId, relatedGlobalId: structure.globalId, relatedStepId: structure.stepId };
      element.relations.push(link);
      if (element instanceof ElementRead && kind === 'contained_in_spatial_structure') {
        if (element.container === undefined) element.container = link;
        else model.notRead('element', 'containment.more_than_one', element.ifcClass).add(element.globalId, rel.stepId);
      }
    }
  }
  for (const rel of model.entitiesOf(['IfcRelDefinesByType'])) {
    const [typeObject] = targets(reading, model, refs(rel.get('RelatingType')));
    if (typeObject?.kind !== 'type') continue;
    for (const element of targets(reading, model, refs(rel.get('RelatedObjects')))) {
      const link: Relation = { kind: 'defines_by_type', relStepId: rel.stepId, relatedGlobalId: typeObject.globalId, relatedStepId: typeObject.stepId };
      element.relations.push(link);
      if (element instanceof ElementRead && element.typeRelation === undefined) element.typeRelation = link;
    }
  }
  for (const rel of model.entitiesOf(['IfcRelDefinesByProperties'])) {
    const [definition] = refs(rel.get('RelatingPropertyDefinition'));
    if (definition === undefined) continue;
    const propertySet = readPropertySet(model, definition, 'occurrence', rel.stepId);
    if (propertySet === undefined) continue;
    for (const item of targets(reading, model, refs(rel.get('RelatedObjects')))) item.propertySets.push(propertySet);
  }
  for (const typeObject of reading.ofKind('type')) {
    for (const psetId of refs(typeObject.entity.get('HasPropertySets'))) {
      const propertySet = readPropertySet(model, psetId, 'type_object', undefined);
      if (propertySet !== undefined) typeObject.propertySets.push(propertySet);
    }
  }
  for (const rel of model.entitiesOf(['IfcRelFlowControlElements'])) {
    const [flow] = targets(reading, model, refs(rel.get('RelatingFlowElement')));
    const controls = targets(reading, model, refs(rel.get('RelatedControlElements')));
    if (flow === undefined || controls.length === 0) continue;
    reading.flowControls.push({ relStepId: rel.stepId, controls: controls.map((item) => item.globalId), flow: flow.globalId });
    for (const control of controls) {
      control.relations.push({ kind: 'flow_control_elements', relStepId: rel.stepId, relatedGlobalId: flow.globalId, relatedStepId: flow.stepId });
    }
  }
}

/** The units that property and quantity values name themselves (ifc-input 4.1 item 4). */
function readValueUnits(reading: ModelReading, model: IfcModel): void {
  for (const item of reading.objects.values()) {
    for (const propertySet of item.propertySets) {
      for (const property of propertySet.items) {
        if (property.unitStepId !== undefined) readUnit(reading, model, property.unitStepId);
      }
    }
  }
}

/** Elements whose shapes sit on a presentation layer that is switched off (rule 14). */
function readLayers(reading: ModelReading, model: IfcModel): void {
  const off = new Map<number, number[]>();
  for (const layer of model.entitiesOf(['IfcPresentationLayerWithStyle'])) {
    if (enumName(layer.get('LayerOn')) !== 'F') continue;
    for (const itemId of refs(layer.get('AssignedItems'))) off.set(itemId, [...(off.get(itemId) ?? []), layer.stepId]);
  }
  if (off.size === 0) return;
  const shapeOfRepresentation = new Map<number, number>();
  for (const shape of model.entitiesOf(['IfcProductDefinitionShape'])) {
    for (const representationId of refs(shape.get('Representations'))) shapeOfRepresentation.set(representationId, shape.stepId);
  }
  const representationOfItem = new Map<number, number>();
  for (const representation of model.entitiesOf(['IfcShapeRepresentation'])) {
    for (const itemId of refs(representation.get('Items'))) {
      if (off.has(itemId)) representationOfItem.set(itemId, representation.stepId);
    }
  }
  const hiddenShapes = new Map<number, number[]>();
  for (const [itemId, layers] of off) {
    const representationId = representationOfItem.get(itemId) ?? itemId;
    const shapeId = shapeOfRepresentation.get(representationId);
    if (shapeId !== undefined) hiddenShapes.set(shapeId, [...(hiddenShapes.get(shapeId) ?? []), ...layers]);
  }
  for (const element of reading.elements()) {
    for (const shapeId of refs(element.entity.get('Representation'))) {
      for (const layerId of hiddenShapes.get(shapeId) ?? []) {
        if (!element.hiddenLayers.includes(layerId)) element.hiddenLayers.push(layerId);
      }
    }
  }
}

/**
 * Geometry, last: not processed in this phase (the viewer's conversion is phase 4). The site's
 * extent is not read either, so no element is judged "placed outside the site's extent"
 * (ifc-input 6.2.13, whose distance the approver sets): coverage says which of the two
 * applies, that no site extent is written, or that it was not checked.
 */
function recordGeometry(reading: ModelReading, model: IfcModel): void {
  model.notRead('geometry', 'geometry.not_processed');
  const sites = reading.ofKind('site');
  const withShape = sites.filter((site) => refs(site.entity.get('Representation')).length > 0);
  const entry = model.notRead('geometry', withShape.length > 0 ? 'hidden_content.site_extent_not_checked' : 'hidden_content.site_extent_unknown', 'IfcSite');
  for (const site of sites) entry.add(site.globalId, site.stepId);
}

/** A user-defined kind written as an enumeration value (COSENSOR), not as prose (Ventiloconvector). */
const ENUMERATION_WRITTEN = /^[A-Z][A-Z0-9_]*$/u;

/**
 * What IFC2X3 cannot express, in coverage for the engineer (ifc-input 5.3 and 5.4 IFC-11): the
 * IFC2X3 copy of a model reads as the IFC4 one except for these, and the reader cannot know the
 * author's IFC4 intent, so it names each place where it may differ, never guessing the value.
 * - `ifc2x3.kind_written_as_user_defined`: an element whose kind is USERDEFINED with its
 *   user-defined kind written as an enumeration value: how an exporter writes a kind the IFC2X3
 *   enumeration lacks (a CO sensor, a programmable controller, security lighting).
 * - `ifc2x3.class_not_expressible`: an IfcElectricDistributionPoint whose function is a control
 *   panel's, a class IFC4 splits off (IfcUnitaryControlElement), which IFC2X3 does not have.
 * - `ifc2x3.system_kind_not_expressible`: every system, an IfcSystem with no kind (IFC2X3 has no
 *   IfcDistributionSystem).
 * Codes, classes, GlobalIds and STEP ids only (rule 13). Nothing else changes: these are
 * coverage entries, never values.
 */
function recordIfc2x3Limits(reading: ModelReading, model: IfcModel): void {
  if (reading.family !== 'IFC2X3') return;
  for (const element of reading.elements()) {
    const kind = resolvedType(reading, element);
    if (kind.predefined === 'USERDEFINED' && kind.userDefined !== undefined && ENUMERATION_WRITTEN.test(kind.userDefined)) {
      const holder = element.predefinedAttribute === undefined && element.typeRelation !== undefined ? reading.objects.get(element.typeRelation.relatedGlobalId) : element;
      model.notRead('element', 'ifc2x3.kind_written_as_user_defined', holder?.ifcClass ?? element.ifcClass).add(element.globalId, element.stepId);
    }
    if (element.ifcClass === 'IfcElectricDistributionPoint' && ifc4Class(reading, element) !== 'IfcElectricDistributionBoard') {
      model.notRead('element', 'ifc2x3.class_not_expressible', element.ifcClass).add(element.globalId, element.stepId);
    }
  }
  const systems = reading.ofKind('system').filter((system) => system.ifcClass === 'IfcSystem');
  if (systems.length > 0) {
    const entry = model.notRead('class', 'ifc2x3.system_kind_not_expressible', 'IfcSystem');
    for (const system of systems) entry.add(system.globalId, system.stepId);
  }
}

/** The object's free text: its text attributes and its text property values, by STEP id. */
function textValues(item: ObjectRead): { readonly stepId: number; readonly text: string }[] {
  const found: { stepId: number; text: string }[] = [];
  for (const attribute of TEXT_ATTRIBUTES) {
    const text = item.text(attribute);
    if (text !== undefined && text !== '') found.push({ stepId: item.stepId, text });
  }
  for (const propertySet of item.propertySets) {
    for (const property of propertySet.items) {
      const value = property.entity.get(property.valueAttribute);
      for (const single of Array.isArray(value) ? value : [value]) {
        const typeName = typeof single === 'object' && single !== null && 'name' in single && typeof single.name === 'string' ? single.name.toUpperCase() : undefined;
        const text = textOf(single);
        if (typeName !== undefined && TEXT_TYPES.has(typeName) && text !== undefined && text !== '') found.push({ stepId: property.stepId, text });
      }
    }
  }
  return found;
}

function find(reading: ModelReading): void {
  const { header: fileHeader } = reading;
  const headerTexts = [
    ...fileHeader.description,
    ...[fileHeader.name, fileHeader.originatingSystem, fileHeader.preprocessorVersion].flatMap((text) => (text === undefined || text === '' ? [] : [text])),
    ...fileHeader.author,
    ...fileHeader.organization,
  ];
  for (const text of headerTexts) {
    const code = detect(text);
    if (code !== undefined) reading.findings.push({ kind: 'embedded_instruction', code, globalId: undefined, stepIds: [], ifcClass: undefined, inHeader: true });
  }
  for (const item of reading.objects.values()) {
    const seen = new Set<string>();
    for (const { stepId, text } of textValues(item)) {
      const code = detect(text);
      const key = `${String(stepId)} ${code ?? ''}`;
      if (code !== undefined && !seen.has(key)) {
        seen.add(key);
        reading.findings.push({ kind: 'embedded_instruction', code, globalId: item.globalId, stepIds: [stepId], ifcClass: item.ifcClass, inHeader: false });
      }
    }
  }
  for (const element of reading.elements()) {
    if (element.hiddenLayers.length > 0) {
      reading.findings.push({
        kind: 'hidden_content',
        code: 'hidden_content.layer_off',
        globalId: element.globalId,
        stepIds: [element.stepId, ...element.hiddenLayers],
        ifcClass: element.ifcClass,
        inHeader: false,
      });
    }
  }
}

/**
 * The classes the file holds, as the schema names them, and the statements whose class web-ifc
 * does not know (listed in coverage, never guessed into a name).
 */
function classes(reading: ModelReading, model: IfcModel): void {
  reading.classesPresent = [...new Set(model.classesPresent())].sort();
  for (const id of model.allIds()) {
    const textId = `${String(id)}`;
    // A complex instance is the text reader's problem (step.complex_instance), not an unknown class.
    const complex = model.text.has(textId) && model.text.keyword(textId) === undefined;
    if (model.className(id) === undefined && !complex) model.notRead('class', 'class.not_recognised').add(undefined, id);
  }
}

/**
 * The text reader's problems (./step-text.ts): coverage entries, and schema_error findings with
 * their codes, stored with the document for the engineer (prompt 3 section 8: problems are never
 * hidden). A problem's STEP ids are the ids web-ifc read for the same statements.
 */
function textProblems(reading: ModelReading, model: IfcModel): void {
  const problems = model.text.problems;
  if (problems.length === 0) return;
  const byText = new Map<string, number>();
  if (problems.some((problem) => problem.stepIds.length > 0)) {
    for (const id of model.allIds()) byText.set(`${String(id)}`, id);
  }
  const byCode = new Map<string, number[]>();
  for (const problem of problems) {
    const known = byCode.get(problem.code) ?? [];
    byCode.set(problem.code, known);
    for (const textId of problem.stepIds) {
      const found = byText.get(textId);
      if (found !== undefined && !known.includes(found)) known.push(found);
    }
  }
  for (const [code, stepIds] of byCode) {
    const entry = model.notRead('element', code);
    for (const stepId of stepIds) entry.add(undefined, stepId);
    reading.findings.push({ kind: 'schema_error', code, globalId: undefined, stepIds: stepIds.slice(0, 64), ifcClass: undefined, inHeader: stepIds.length === 0 });
  }
}

/** The instances web-ifc read that the data pass could not agree on: schema_error findings. */
function readerProblems(reading: ModelReading, model: IfcModel): void {
  for (const entry of model.notReadList()) {
    if (!['step.syntax', 'step.attribute_count', 'step.readers_disagree', 'step.not_read_by_web_ifc'].includes(entry.reason)) continue;
    reading.findings.push({ kind: 'schema_error', code: entry.reason, globalId: undefined, stepIds: entry.stepIds.slice(0, 64), ifcClass: entry.ifcClass, inHeader: false });
  }
}

/** Reads a model's data (stages 1 to 5) and notes what was not processed (stage 6). */
export function readModel(model: IfcModel): ModelReading {
  const reading = new ModelReading(model, header(model));
  readObjects(reading, model);
  readUnits(reading, model);
  readSpatialTree(reading, model);
  readGroups(reading, model);
  readElements(reading, model);
  readValueUnits(reading, model);
  readLayers(reading, model);
  recordIfc2x3Limits(reading, model);
  recordGeometry(reading, model);
  find(reading);
  classes(reading, model);
  textProblems(reading, model);
  readerProblems(reading, model);
  return reading;
}
