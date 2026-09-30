/**
 * The sealed IFC section of an output: facts with their IFC locator (and, in ./proposals.ts,
 * the table-driven proposals).
 *
 * Built only when the request asks for IFC values, which the API does only while the
 * `ifc-values` gate reads open (the contract's ExtractionRequest.ifcValues). Under guardrails
 * v1.6 that gate is closed, so none of this reaches a live output; it runs in the
 * proposed-behaviour suite (tests/proposed/) and in this package's tests.
 *
 * A fact is one value read from the model: the element's GlobalId, the STEP id of the line it
 * quotes, the path to the value (an attribute, a property or quantity, on the occurrence or
 * through its type object, or a relation), the value as its STEP literal token, the unit the
 * file declares for it, and the verbatim STEP line (ifc-input 4.1 item 3; 6.2.1). web-ifc read
 * the value; the token and the line are the file's own text, from the in-house reader, and the
 * two agree (./model.ts). The reader reads no number: the API reads the token (prompt 3 section 6).
 * Elements on a switched-off layer give no fact at all: hidden content gives no candidate, and
 * nothing releases it (ifc-input 6.2.13; the `ifc-hidden-content` gate).
 */
import * as WebIFC from 'web-ifc';
import { utf8Length, type DeclaredUnit, type IfcFact, type StepValue } from '@sovitech/extraction-contract';
import type { WebValue } from './model';
import { ElementRead, MEASURE_UNIT_TYPES, QUANTITY_UNIT_TYPES, type ModelReading, type ObjectRead, type PropertyRead, type RelationKind, type Through, type UnitRead } from './reading';
import type { StepToken } from './step-text';

type StepScalar = Exclude<StepValue, { readonly kind: 'list' | 'unset' | 'derived' }>;
type IfcPath = IfcFact['locator']['path'];

const REAL = /^[+-]?[0-9]+\.[0-9]*([Ee][+-]?[0-9]+)?$/u;
const INTEGER = /^[+-]?[0-9]+$/u;
const ENUM = /^\.[A-Z][A-Z0-9_]*\.$/u;
const BINARY = /^"[0-3][0-9A-F]*"$/u;
const IFC_TYPE = /^IFC[A-Z0-9]{1,80}$/u;
const UNIT_TYPE = /^[A-Z][A-Z0-9_]{0,63}$/u;
const PREFIX = /^[A-Z]{1,16}$/u;
const NAME_MAX = 255;
const EXCERPT_MAX = 20000;
const STRING_MAX = 20000;
const LIST_MAX = 10000;
/**
 * The most a list value may take as JSON (UTF-8 bytes). With the contract's own bounds on every
 * other part of a fact (strings of at most 20,000 code points, names of at most 255), it keeps
 * every fact's line of the per-line form below IFC_VALUES_LINE_MAX_BYTES (ADR 0034); a longer
 * list is not representable, like any value the contract cannot hold, and coverage says so.
 */
const LIST_JSON_MAX_BYTES = 256 * 1024;
const ATTRIBUTES = ['Name', 'LongName', 'Description', 'ObjectType', 'Tag', 'Elevation', 'Phase'] as const;
const TYPE_ATTRIBUTES = ['Name', 'ElementType', 'PredefinedType'] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typedName(typeName: string | undefined): string | undefined {
  return typeName !== undefined && IFC_TYPE.test(typeName) ? typeName : undefined;
}

function codePoints(text: string): number {
  return [...text].length;
}

/**
 * Whether a text has more than `max` code points (the contract counts code points). A UTF-16
 * length at most `max` cannot, and one over twice `max` must: only in between are they counted,
 * so a relation line shared by thousands of facts is not counted once per fact.
 */
function longerThan(text: string, max: number): boolean {
  if (text.length <= max) return false;
  if (text.length > max * 2) return true;
  return codePoints(text) > max;
}

/** A scalar literal as the contract's typed token; undefined when the contract cannot hold it. */
function scalar(token: StepToken, web: WebValue, typeName?: string): StepScalar | undefined {
  const ifcType = typedName(typeName);
  if (typeName !== undefined && ifcType === undefined) return undefined;
  const typed = ifcType === undefined ? {} : { ifcType };
  switch (token.kind) {
    case 'real':
      return REAL.test(token.token) && token.token.length <= 64 ? { kind: 'real', token: token.token, ...typed } : undefined;
    case 'integer':
      return INTEGER.test(token.token) && token.token.length <= 32 ? { kind: 'integer', token: token.token, ...typed } : undefined;
    case 'string':
      return !longerThan(token.token, STRING_MAX) && !longerThan(token.text, STRING_MAX) ? { kind: 'string', token: token.token, text: token.text, ...typed } : undefined;
    case 'enum':
      if ((token.token === '.T.' || token.token === '.F.') && ifcType !== 'IFCLOGICAL') return { kind: 'boolean', token: token.token, ...typed };
      if (token.token === '.T.' || token.token === '.F.' || token.token === '.U.') return { kind: 'logical', token: token.token, ...typed };
      return ENUM.test(token.token) && token.token.length <= 128 ? { kind: 'enumeration', token: token.token, ...typed } : undefined;
    case 'binary':
      return BINARY.test(token.token) ? { kind: 'binary', token: token.token, ...typed } : undefined;
    case 'ref':
      // The instance id comes from web-ifc, which read the same reference (./model.ts, agrees).
      return ifcType === undefined && isObject(web) && web['type'] === WebIFC.REF && typeof web['value'] === 'number' ? { kind: 'reference', stepId: web['value'] } : undefined;
    default:
      return undefined;
  }
}

/** A STEP literal as the contract's typed token; undefined when the contract cannot hold it. */
export function stepValue(token: StepToken, web: WebValue): StepValue | undefined {
  if (token.kind === 'unset') return { kind: 'unset' };
  if (token.kind === 'derived') return { kind: 'derived' };
  if (token.kind === 'typed') {
    if (token.value.kind === 'list') {
      const ifcType = typedName(token.typeName);
      const items = listItems(token.value.items, web);
      return ifcType === undefined || items === undefined ? undefined : { kind: 'list', items, ifcType };
    }
    return scalar(token.value, web, token.typeName);
  }
  if (token.kind === 'list') {
    const items = listItems(token.items, web);
    return items === undefined ? undefined : { kind: 'list', items };
  }
  return scalar(token, web);
}

function listItems(tokens: readonly StepToken[], web: WebValue): StepScalar[] | undefined {
  if (tokens.length > LIST_MAX || !Array.isArray(web)) return undefined;
  const items: StepScalar[] = [];
  for (const [index, item] of tokens.entries()) {
    const converted = scalar(item, web[index]);
    if (converted === undefined) return undefined;
    items.push(converted);
  }
  return utf8Length(JSON.stringify(items)) > LIST_JSON_MAX_BYTES ? undefined : items;
}

function declared(unit: UnitRead, source: DeclaredUnit['source']): DeclaredUnit | undefined {
  const length = codePoints(unit.name);
  if (!UNIT_TYPE.test(unit.unitType) || length < 1 || length > NAME_MAX) return undefined;
  const prefix = unit.prefix !== undefined && PREFIX.test(unit.prefix) ? { prefix: unit.prefix } : {};
  return { source, stepId: unit.stepId, unitKind: unit.kind, unitType: unit.unitType, name: unit.name, ...prefix };
}

/**
 * The unit the file declares for a value: its own Unit, else the project's unit for its
 * measure type (ifc-input 4.1 item 4). A value typed IfcReal, IfcLabel or IfcCountMeasure
 * declares none.
 */
export function declaredUnit(reading: ModelReading, property: PropertyRead): DeclaredUnit | undefined {
  if (property.unitStepId !== undefined) {
    const unit = reading.unitByStep.get(property.unitStepId);
    return unit === undefined ? undefined : declared(unit, 'value_unit');
  }
  const token = property.entity.token(property.valueAttribute);
  const unitType = QUANTITY_UNIT_TYPES[property.ifcClass] ?? (token?.kind === 'typed' ? MEASURE_UNIT_TYPES[token.typeName] : undefined);
  if (unitType === undefined) return undefined;
  const unit = reading.units.get(unitType);
  return unit === undefined ? undefined : declared(unit, 'project_unit_assignment');
}

/** The facts of one output, and where each came from (for the proposals). */
export interface FactIndex {
  readonly facts: IfcFact[];
  /** `${globalId} ${through} ${attribute}` to its fact. */
  readonly attribute: Map<string, string>;
  /** `${globalId} ${through} ${set} ${name}` to its facts. */
  readonly property: Map<string, string[]>;
  /** `${globalId} ${relation}` to its facts and the related GlobalIds. */
  readonly relation: Map<string, { readonly factId: string; readonly relatedGlobalId: string }[]>;
  /** A fact's literal token (unwrapped from its type), for the matchers that read a flag. */
  readonly tokens: Map<string, string | undefined>;
}

export const attributeKey = (globalId: string, through: Through, attribute: string): string => `${globalId}\u0000${through}\u0000${attribute}`;
export const propertyKey = (globalId: string, through: Through, set: string, name: string): string => `${globalId}\u0000${through}\u0000${set}\u0000${name}`;
export const relationKey = (globalId: string, relation: RelationKind): string => `${globalId}\u0000${relation}`;

function unwrapped(token: StepToken): string | undefined {
  const inner = token.kind === 'typed' ? token.value : token;
  return 'token' in inner ? inner.token : undefined;
}

function readable(reading: ModelReading): ObjectRead[] {
  return [...reading.objects.values()].filter((item) => item.kind !== 'type' && !(item instanceof ElementRead && item.hiddenLayers.length > 0));
}

/** Every fact of the model's readable objects (hidden elements and type objects excluded). */
export function buildFacts(reading: ModelReading, contentHash: string): FactIndex {
  const { model } = reading;
  const index: FactIndex = { facts: [], attribute: new Map(), property: new Map(), relation: new Map(), tokens: new Map() };

  const add = (factId: string, globalId: string, stepId: number, path: IfcPath, token: StepToken | undefined, web: WebValue, unit: DeclaredUnit | undefined): boolean => {
    const value = token === undefined ? undefined : stepValue(token, web);
    const excerpt = model.text.excerpt(`${String(stepId)}`);
    if (token === undefined || value === undefined || longerThan(excerpt, EXCERPT_MAX)) {
      model.notRead('property_set', 'value.not_representable').add(globalId, stepId);
      return false;
    }
    index.facts.push({
      id: factId,
      locator: { contentHash, schema: reading.schemaName, globalId, stepIds: [stepId], path },
      value,
      excerpt,
      ...(unit === undefined ? {} : { declaredUnit: unit }),
    });
    index.tokens.set(factId, unwrapped(token));
    return true;
  };

  for (const item of readable(reading)) {
    const names: string[] = [...ATTRIBUTES];
    const predefined = item.predefinedAttribute;
    if (predefined !== undefined && !names.includes(predefined)) names.push(predefined);
    for (const attribute of names) {
      if (!item.entity.has(attribute)) continue;
      const token = item.entity.token(attribute);
      if (token === undefined || token.kind === 'unset') continue;
      const factId = `f${String(item.stepId)}-${attribute.toLowerCase()}`;
      const length = reading.units.get('LENGTHUNIT');
      const unit = attribute === 'Elevation' && length !== undefined ? declared(length, 'project_unit_assignment') : undefined;
      if (add(factId, item.globalId, item.stepId, { kind: 'attribute', through: 'occurrence', attribute }, token, item.entity.get(attribute), unit)) {
        index.attribute.set(attributeKey(item.globalId, 'occurrence', attribute), factId);
      }
    }
    const typeObject = item instanceof ElementRead && item.typeRelation !== undefined ? reading.objects.get(item.typeRelation.relatedGlobalId) : undefined;
    if (typeObject !== undefined) {
      for (const attribute of TYPE_ATTRIBUTES) {
        if (!typeObject.entity.has(attribute)) continue;
        const token = typeObject.entity.token(attribute);
        if (token === undefined || token.kind === 'unset') continue;
        const factId = `f${String(item.stepId)}-t-${attribute.toLowerCase()}`;
        if (add(factId, item.globalId, typeObject.stepId, { kind: 'attribute', through: 'type_object', attribute }, token, typeObject.entity.get(attribute), undefined)) {
          index.attribute.set(attributeKey(item.globalId, 'type_object', attribute), factId);
        }
      }
    }
    for (const propertySet of [...item.propertySets, ...(typeObject?.propertySets ?? [])]) {
      if (longerThan(propertySet.name, NAME_MAX)) continue;
      for (const property of propertySet.items) {
        if (longerThan(property.name, NAME_MAX)) continue;
        const path: IfcPath = property.isQuantity
          ? { kind: 'quantity', through: propertySet.through, quantitySet: propertySet.name, quantity: property.name }
          : { kind: 'property', through: propertySet.through, propertySet: propertySet.name, property: property.name };
        const factId = `f${String(item.stepId)}-p${String(property.stepId)}`;
        const token = property.entity.token(property.valueAttribute);
        if (add(factId, item.globalId, property.stepId, path, token, property.entity.get(property.valueAttribute), declaredUnit(reading, property))) {
          const key = propertyKey(item.globalId, propertySet.through, propertySet.name, property.name);
          index.property.set(key, [...(index.property.get(key) ?? []), factId]);
        }
      }
    }
    for (const link of item.relations) {
      const factId = `f${String(item.stepId)}-r${String(link.relStepId)}-${String(link.relatedStepId)}`;
      const reference: StepToken = { kind: 'ref', id: `${String(link.relatedStepId)}` };
      const web = { type: WebIFC.REF, value: link.relatedStepId };
      if (add(factId, item.globalId, link.relStepId, { kind: 'relation', relation: link.kind, relatedGlobalId: link.relatedGlobalId }, reference, web, undefined)) {
        const key = relationKey(item.globalId, link.kind);
        index.relation.set(key, [...(index.relation.get(key) ?? []), { factId, relatedGlobalId: link.relatedGlobalId }]);
      }
    }
  }
  return index;
}
