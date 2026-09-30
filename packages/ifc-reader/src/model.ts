/**
 * The model as web-ifc reads it (owner decision, 2026-09-26: "web-ifc instead";
 * docs/adr/0018, docs/adr/0031), with the record of what could not be read.
 *
 * web-ifc (MPL-2.0, pinned) reads the file: the schema, each instance's class, its attributes
 * by name in schema order, their values, and the classes' inheritance. That is what the data
 * pass reads. The in-house STEP text reader (./step-text.ts) is used beside it for the
 * word-for-word evidence only: each instance's verbatim statement and literal tokens. An
 * instance is read only when both readers see the same statement: the same number of
 * attributes, and each literal the same (a real's token, an integer's digits, a string's
 * decoded text, an enumeration, a reference). Anything else is not read and is recorded with
 * codes, GlobalIds and STEP ids only (prompt 3 section 8; guardrails rule 13).
 *
 * Nothing here maps model content to an app field, a type or a flag: those are datasets the
 * approver must approve (ifc-input 6.2.10), reaching the reader only through the request,
 * behind the `ifc-values` gate.
 */
import * as WebIFC from 'web-ifc';
import { StepSyntaxError, type StepText, type StepToken } from './step-text';

export type Family = 'IFC2X3' | 'IFC4' | 'IFC4X3';
export type Kind = 'project' | 'site' | 'building' | 'storey' | 'space' | 'zone' | 'system' | 'type' | 'element';
export type Scope = 'header' | 'class' | 'element' | 'property_set' | 'geometry';

/** A value as web-ifc hands it out (a handle, a typed value, an array, or null). */
export type WebValue = unknown;

const MAX_IDS = 1000;

/** A part of the model that was not read: codes, GlobalIds and STEP ids only. */
export class NotRead {
  readonly globalIds: string[] = [];
  readonly stepIds: number[] = [];

  constructor(
    readonly scope: Scope,
    readonly reason: string,
    readonly ifcClass: string | undefined,
  ) {}

  add(globalId: string | undefined, stepId: number | undefined): void {
    if (globalId !== undefined && !this.globalIds.includes(globalId) && this.globalIds.length < MAX_IDS) this.globalIds.push(globalId);
    if (stepId !== undefined && !this.stepIds.includes(stepId) && this.stepIds.length < MAX_IDS) this.stepIds.push(stepId);
  }
}

/** One instance as web-ifc read it, with its literal tokens from the text. */
export interface Entity {
  /** The STEP instance id (#n): an identifier, as web-ifc gives it. */
  readonly stepId: number;
  /** The class as the schema names it (IfcPump). */
  readonly name: string;
  readonly typeCode: number;
  /** The attribute names in schema order. */
  readonly attributes: readonly string[];
  get(attribute: string): WebValue;
  has(attribute: string): boolean;
  /** The attribute's literal token, as the file writes it. */
  token(attribute: string): StepToken | undefined;
}

const GLOBAL_ID = /^[0-9A-Za-z_$]{22}$/u;
const UNKNOWN_TYPE = '<web-ifc-type-unknown>';

/** The kinds the data pass reads, each from its root class and every subtype (checked in this order). */
const KIND_ROOTS: readonly (readonly [Kind, string])[] = [
  ['project', 'IFCPROJECT'],
  ['site', 'IFCSITE'],
  ['building', 'IFCBUILDING'],
  ['storey', 'IFCBUILDINGSTOREY'],
  ['space', 'IFCSPACE'],
  ['zone', 'IFCZONE'],
  ['system', 'IFCSYSTEM'],
  ['type', 'IFCTYPEOBJECT'],
  ['element', 'IFCELEMENT'],
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The decoded text of a web-ifc string value; undefined for anything else. */
export function textOf(value: WebValue): string | undefined {
  if (isObject(value) && value['type'] === WebIFC.STRING && typeof value['value'] === 'string') return value['value'];
  return undefined;
}

/**
 * The name of an enumeration value (.SPACE. is SPACE; .T. is T, .F. is F, .U. is U). web-ifc
 * hands a logical or boolean out wrapped (IFC4) or bare (IFC2X3: true, false, or nothing for .U.).
 */
export function enumName(value: WebValue): string | undefined {
  if (value === true) return 'T';
  if (value === false) return 'F';
  if (!isObject(value) || value['type'] !== WebIFC.ENUM) return undefined;
  const inner = value['value'];
  if (typeof inner === 'string') return inner.toUpperCase();
  if (inner === true) return 'T';
  if (inner === false) return 'F';
  if (inner === undefined && typeof value['name'] === 'string') return 'U';
  return undefined;
}

/** The instances a value refers to: one reference, or the references of an aggregate. */
export function refs(value: WebValue): number[] {
  if (Array.isArray(value)) return value.flatMap((item) => (isRef(item) ? [item.value] : []));
  return isRef(value) ? [value.value] : [];
}

function isRef(value: unknown): value is { readonly type: number; readonly value: number } {
  return isObject(value) && value['type'] === WebIFC.REF && typeof value['value'] === 'number' && value['value'] > 0;
}

/** An integer token without its sign's "+" and its leading zeros, to compare with web-ifc's integer. */
function integerDigits(token: string): string {
  const negative = token.startsWith('-');
  const digits = token.replace(/^[+-]/u, '').replace(/^0+(?=[0-9])/u, '');
  return negative && digits !== '0' ? `-${digits}` : digits;
}

function scalarAgrees(token: StepToken, web: WebValue): boolean {
  // web-ifc hands some values out bare: an integer or a real inside an aggregate, and in IFC2X3
  // a logical (true, false, or nothing for .U.).
  if (typeof web === 'number') return (token.kind === 'integer' && `${String(web)}` === integerDigits(token.token)) || token.kind === 'real';
  if (typeof web === 'boolean') return token.kind === 'enum' && enumName(web) === token.token.slice(1, -1);
  if (web === undefined) return token.kind === 'enum' && token.token === '.U.';
  if (!isObject(web)) return false;
  const type = web['type'];
  switch (token.kind) {
    case 'ref':
      return type === WebIFC.REF && `${String(web['value'])}` === integerDigits(token.id);
    case 'string':
      return type === WebIFC.STRING && web['value'] === token.text;
    case 'real':
      return type === WebIFC.REAL && web['internalValue'] === token.token;
    case 'integer':
      return type === WebIFC.INTEGER && `${String(web['internalValue'])}` === integerDigits(token.token);
    case 'enum': {
      if (type !== WebIFC.ENUM) return false;
      const name = token.token.slice(1, -1);
      return enumName(web) === name;
    }
    case 'binary':
      return type === WebIFC.BINARY && typeof web['value'] === 'string' && `"${web['value'].toUpperCase()}"` === token.token;
    default:
      return false;
  }
}

/** Whether web-ifc read a value as the text writes it (the two readers see the same statement). */
export function agrees(token: StepToken, web: WebValue): boolean {
  switch (token.kind) {
    case 'unset':
      // web-ifc hands an unset attribute out as nothing, or (IFC2X3) as a reference with no value.
      return web === null || web === undefined || (isObject(web) && web['type'] === WebIFC.REF && web['value'] === null);
    case 'derived':
      // web-ifc hands a derived attribute (*) out as nothing, or as a reference to instance 0.
      return web === null || web === undefined || (isObject(web) && web['type'] === WebIFC.REF && (web['value'] === 0 || web['value'] === null));
    case 'list': {
      // An aggregate comes as an array, or wrapped with its defined type ({ value: [...] }).
      const items = Array.isArray(web) ? web : isObject(web) && Array.isArray(web['value']) ? (web['value'] as unknown[]) : undefined;
      return items !== undefined && items.length === token.items.length && token.items.every((item, index) => agrees(item, items[index]));
    }
    case 'typed':
      if (!isObject(web)) return false;
      if (typeof web['name'] === 'string' && web['name'].toUpperCase() !== token.typeName) return false;
      return token.value.kind === 'list' ? agrees(token.value, web) : scalarAgrees(token.value, web);
    default:
      return scalarAgrees(token, web);
  }
}

/** Whether an error is web-ifc's WebAssembly running out of memory (it is wasm32: 4 GB at most). */
export function isMemoryError(error: unknown): boolean {
  return error instanceof RangeError || (error instanceof Error && /memory|OOM|Aborted/iu.test(error.message));
}

let api: Promise<WebIFC.IfcAPI> | undefined;

/** The one web-ifc instance of the process, its WebAssembly loaded once, its own logging off. */
export function webIfc(): Promise<WebIFC.IfcAPI> {
  api ??= (async () => {
    const instance = new WebIFC.IfcAPI();
    await instance.Init(undefined, true);
    instance.SetLogLevel(WebIFC.LogLevel.LOG_LEVEL_OFF);
    return instance;
  })();
  return api;
}

/** The web-ifc version the data pass runs on (the producer's library line). */
export async function webIfcVersion(): Promise<string> {
  const version: unknown = (await webIfc()).GetVersion();
  return typeof version === 'string' ? version : 'unknown';
}

/** The schema family web-ifc reads a FILE_SCHEMA name with, or undefined when it reads none. */
function familyOf(schemaName: string): Family | undefined {
  const names = WebIFC.SchemaNames;
  const index = names.findIndex((list) => Array.isArray(list) && list.includes(schemaName));
  if (index === 1) return 'IFC2X3';
  if (index === 2) return 'IFC4';
  if (index === 3) return 'IFC4X3';
  return undefined;
}

const SCHEMA_INDEX: Readonly<Record<Family, number>> = { IFC2X3: 1, IFC4: 2, IFC4X3: 3 };

/** A model web-ifc could not open with a schema it reads. */
export interface Unopened {
  readonly unopened: 'schema.unsupported';
  readonly schemaName: string | undefined;
}

/** The first FILE_SCHEMA name as the header writes it, from web-ifc's header line. */
function headerSchema(ifc: WebIFC.IfcAPI, modelId: number): string | undefined {
  const line: unknown = ifc.GetHeaderLine(modelId, WebIFC.FILE_SCHEMA);
  if (!isObject(line) || !Array.isArray(line['arguments'])) return undefined;
  const [first] = line['arguments'] as unknown[];
  const [name] = Array.isArray(first) ? first : [];
  return textOf(name);
}

export class IfcModel {
  private readonly entities = new Map<number, Entity | undefined>();
  private readonly notReadEntries = new Map<string, NotRead>();
  private readonly kinds = new Map<number, Kind | undefined>();
  private readonly subtypes: ReadonlyMap<string, ReadonlySet<number>>;
  readonly classesRead = new Set<string>();

  private constructor(
    private readonly ifc: WebIFC.IfcAPI,
    private readonly modelId: number,
    readonly schemaName: string,
    readonly family: Family,
    readonly text: StepText,
  ) {
    const inheritance = (WebIFC.InheritanceDef as Record<number, Record<number, readonly number[]> | undefined>)[SCHEMA_INDEX[family]] ?? {};
    const subtypes = new Map<string, ReadonlySet<number>>();
    for (const [, root] of KIND_ROOTS) {
      const code = ifc.GetTypeCodeFromName(root);
      subtypes.set(root, new Set([code, ...(inheritance[code] ?? [])]));
    }
    for (const root of ['IFCPROPERTYSET', 'IFCELEMENTQUANTITY', 'IFCPHYSICALSIMPLEQUANTITY', 'IFCPROPERTYSINGLEVALUE', 'IFCPROPERTYENUMERATEDVALUE', 'IFCPROPERTYLISTVALUE']) {
      const code = ifc.GetTypeCodeFromName(root);
      subtypes.set(root, new Set([code, ...(inheritance[code] ?? [])]));
    }
    this.subtypes = subtypes;
  }

  /** Opens the file's bytes with web-ifc; a schema web-ifc does not read gives no model. */
  static async open(bytes: Uint8Array, text: StepText): Promise<IfcModel | Unopened> {
    const ifc = await webIfc();
    let modelId: number;
    try {
      modelId = ifc.OpenModel(bytes, { COORDINATE_TO_ORIGIN: false });
    } catch (error) {
      if (isMemoryError(error)) throw error;
      return { unopened: 'schema.unsupported', schemaName: text.declaredSchema() };
    }
    if (modelId < 0) return { unopened: 'schema.unsupported', schemaName: text.declaredSchema() };
    const schemaName = headerSchema(ifc, modelId);
    const family = schemaName === undefined ? undefined : familyOf(schemaName);
    if (schemaName === undefined || family === undefined) {
      ifc.CloseModel(modelId);
      return { unopened: 'schema.unsupported', schemaName };
    }
    return new IfcModel(ifc, modelId, schemaName, family, text);
  }

  close(): void {
    this.ifc.CloseModel(this.modelId);
  }

  /** The header line's arguments as web-ifc read them (FILE_DESCRIPTION, FILE_NAME). */
  headerArguments(line: number): readonly WebValue[] {
    try {
      const header: unknown = this.ifc.GetHeaderLine(this.modelId, line);
      return isObject(header) && Array.isArray(header['arguments']) ? (header['arguments'] as WebValue[]) : [];
    } catch {
      return [];
    }
  }

  /** The coverage entry for one scope, reason and class (created on first use). */
  notRead(scope: Scope, reason: string, ifcClass?: string): NotRead {
    const key = `${scope} ${reason} ${ifcClass ?? ''}`;
    let entry = this.notReadEntries.get(key);
    if (entry === undefined) {
      entry = new NotRead(scope, reason, ifcClass);
      this.notReadEntries.set(key, entry);
    }
    return entry;
  }

  notReadList(): readonly NotRead[] {
    return [...this.notReadEntries.values()];
  }

  /** Every instance id web-ifc read, in file order. */
  allIds(): number[] {
    const vector = this.ifc.GetAllLines(this.modelId);
    const ids: number[] = [];
    for (let index = 0; index < vector.size(); index += 1) ids.push(vector.get(index));
    return ids;
  }

  /** The schema's name of an instance's class (IfcPump), or undefined when web-ifc does not know it. */
  className(stepId: number): string | undefined {
    const name = this.ifc.GetNameFromTypeCode(this.ifc.GetLineType(this.modelId, stepId));
    return typeof name === 'string' && name !== '' && name !== UNKNOWN_TYPE ? name : undefined;
  }

  /** The classes present in the file, as the schema names them. */
  classesPresent(): string[] {
    return this.ifc
      .GetAllTypesOfModel(this.modelId)
      .map((type) => type.typeName)
      .filter((name) => name !== '' && name !== UNKNOWN_TYPE);
  }

  /** The kind of an instance's class, from web-ifc's inheritance, or undefined for the others. */
  kindOf(stepId: number): Kind | undefined {
    const code = this.ifc.GetLineType(this.modelId, stepId);
    if (this.kinds.has(code)) return this.kinds.get(code);
    const found = KIND_ROOTS.find(([, root]) => this.subtypes.get(root)?.has(code) === true)?.[0];
    this.kinds.set(code, found);
    return found;
  }

  /** Whether an entity is of a class or one of its subtypes (roots listed in the constructor). */
  isA(entity: Entity, root: string): boolean {
    return this.subtypes.get(root)?.has(entity.typeCode) === true;
  }

  /** The ids of the instances of the named classes, per class in the order given, in file order. */
  idsOf(classNames: readonly string[]): number[] {
    return classNames.flatMap((name) => {
      const vector = this.ifc.GetLineIDsWithType(this.modelId, this.ifc.GetTypeCodeFromName(name.toUpperCase()), false);
      const ids: number[] = [];
      for (let index = 0; index < vector.size(); index += 1) ids.push(vector.get(index));
      return ids;
    });
  }

  /** The readable instances of the named classes (schema names), per class, in file order. */
  entitiesOf(classNames: readonly string[]): Entity[] {
    return this.idsOf(classNames).flatMap((id) => {
      const entity = this.entity(id);
      return entity === undefined ? [] : [entity];
    });
  }

  /** The instance as both readers read it, or undefined (recorded) when they cannot agree on it. */
  entity(stepId: number): Entity | undefined {
    if (this.entities.has(stepId)) return this.entities.get(stepId);
    const entity = this.read(stepId);
    this.entities.set(stepId, entity);
    if (entity !== undefined) this.classesRead.add(entity.name);
    return entity;
  }

  private read(stepId: number): Entity | undefined {
    const textId = `${String(stepId)}`;
    if (!this.text.has(textId)) {
      this.notRead('element', 'step.unresolved_reference').add(undefined, stepId);
      return undefined;
    }
    const name = this.className(stepId);
    if (name === undefined) return undefined;
    let line: Record<string, unknown>;
    try {
      const read: unknown = this.ifc.GetLine(this.modelId, stepId, false, false);
      if (!isObject(read)) throw new StepSyntaxError('step.syntax');
      line = read;
    } catch {
      this.notRead('element', 'step.not_read_by_web_ifc', name).add(undefined, stepId);
      return undefined;
    }
    const attributes = Object.keys(line).filter((key) => key !== 'expressID' && key !== 'type');
    let tokens: readonly StepToken[];
    try {
      tokens = this.text.attributes(textId);
    } catch (error) {
      if (!(error instanceof StepSyntaxError)) throw error;
      this.notRead('element', 'step.syntax', name).add(undefined, stepId);
      return undefined;
    }
    if (tokens.length !== attributes.length) {
      this.notRead('element', 'step.attribute_count', name).add(undefined, stepId);
      return undefined;
    }
    const disagree = attributes.some((attribute, index) => {
      const token = tokens[index];
      return token === undefined || !agrees(token, line[attribute]);
    });
    if (disagree) {
      this.notRead('element', 'step.readers_disagree', name).add(undefined, stepId);
      return undefined;
    }
    const typeCode = this.ifc.GetLineType(this.modelId, stepId);
    return {
      stepId,
      name,
      typeCode,
      attributes,
      get: (attribute) => line[attribute],
      has: (attribute) => attributes.includes(attribute),
      token: (attribute) => {
        const index = attributes.indexOf(attribute);
        return index < 0 ? undefined : tokens[index];
      },
    };
  }
}

/** The entity's GlobalId when it is a valid one (22 characters of the IFC base-64 alphabet). */
export function globalIdOf(entity: Entity): string | undefined {
  const text = textOf(entity.get('GlobalId'));
  return text !== undefined && GLOBAL_ID.test(text) ? text : undefined;
}
