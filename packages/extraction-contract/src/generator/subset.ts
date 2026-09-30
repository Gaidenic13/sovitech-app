/**
 * The JSON Schema subset the extraction contract is written in, and its loader.
 *
 * The generators (emit-zod.ts, emit-python.ts) and the Python validator
 * (services/extractor/src/sovitech_extractor/contract/_validate.py) read only
 * the keywords listed here. The loader refuses every other keyword, so no
 * constraint in the source can be silently ignored by one side: a keyword
 * either reaches both languages or the generator stops.
 *
 * Supported: `$defs`; `$ref` to `#/$defs/<Name>`; `type` object (with
 * `properties`, `required` and `additionalProperties: false`, always: every
 * object is closed), array (`items`, `minItems`, `maxItems`, `uniqueItems` on
 * string or integer items), string (`pattern`, `minLength`, `maxLength` counted
 * in code points, `enum`, `const`), integer (`minimum`, `maximum`, `enum`),
 * number (`minimum`, `maximum`, finite), boolean; `oneOf` of `$ref`s, with an
 * optional `discriminator.propertyName` whose branches each hold it as a
 * `const`; `description`; and the annotations `x-invariants` (checks both
 * languages implement by id), `x-format-rules`, `x-mechanism-rules` and
 * `x-ifc-locator-keys`, which both languages read as data.
 */

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** A schema node after loading: one of the shapes below. */
export type Node =
  | { readonly kind: 'ref'; readonly target: string }
  | {
      readonly kind: 'object';
      readonly properties: readonly { readonly key: string; readonly node: Node; readonly required: boolean }[];
    }
  | {
      readonly kind: 'array';
      readonly items: Node;
      readonly minItems?: number;
      readonly maxItems?: number;
      readonly uniqueItems: boolean;
    }
  | {
      readonly kind: 'string';
      readonly pattern?: string;
      readonly minLength?: number;
      readonly maxLength?: number;
      readonly enumValues?: readonly string[];
      readonly constValue?: string;
    }
  | { readonly kind: 'integer'; readonly minimum?: number; readonly maximum?: number; readonly enumValues?: readonly number[] }
  | { readonly kind: 'number'; readonly minimum?: number; readonly maximum?: number }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'oneOf'; readonly branches: readonly string[]; readonly discriminator?: string };

export interface Def {
  readonly name: string;
  readonly node: Node;
  readonly invariants: readonly string[];
}

export interface ContractSchema {
  readonly version: string;
  readonly entryPoints: readonly string[];
  /** Every def, in dependency order: a def comes after every def it refers to. */
  readonly defs: readonly Def[];
  readonly formatRules: JsonValue;
  readonly mechanismRules: JsonValue;
  /** EvidenceLocator `x-ifc-locator-keys`: keys that would carry an IFC locator, refused with ifc_field. */
  readonly ifcLocatorKeys: readonly string[];
  /** Every invariant id, in the order the schema first names it. */
  readonly invariantIds: readonly string[];
}

export class SchemaSubsetError extends Error {
  override name = 'SchemaSubsetError';
}

const ROOT_KEYS = new Set(['$schema', '$id', 'title', 'description', 'x-contract-version', 'x-entry-points', '$defs']);
const ANNOTATION_KEYS = new Set(['description', 'x-invariants']);
const KEYS_BY_TYPE: Readonly<Record<string, ReadonlySet<string>>> = {
  object: new Set(['type', 'properties', 'required', 'additionalProperties', 'x-format-rules']),
  array: new Set(['type', 'items', 'minItems', 'maxItems', 'uniqueItems']),
  string: new Set(['type', 'pattern', 'minLength', 'maxLength', 'enum', 'const', 'x-mechanism-rules']),
  integer: new Set(['type', 'minimum', 'maximum', 'enum']),
  number: new Set(['type', 'minimum', 'maximum']),
  boolean: new Set(['type']),
};
const DEF_NAME = /^[A-Z][A-Za-z0-9]*$/;
const PROPERTY_KEY = /^[a-z][A-Za-z0-9]*$/;
const INVARIANT_ID = /^[a-z][a-z0-9_]*$/;
const REF = /^#\/\$defs\/([A-Z][A-Za-z0-9]*)$/;

/** Python keywords and soft keywords a field name must not become. */
const PYTHON_RESERVED = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'match', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'type', 'while', 'with', 'yield',
]);

/** camelCase to snake_case, the Python attribute name of a JSON key. */
export function snakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** snake_case back to camelCase: the inverse of snakeCase on the keys the loader accepts. */
export function camelCase(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(where: string, message: string): never {
  throw new SchemaSubsetError(`${where}: ${message}`);
}

function checkKeys(where: string, node: Readonly<Record<string, unknown>>, allowed: ReadonlySet<string>): void {
  for (const key of Object.keys(node)) {
    if (!allowed.has(key) && !ANNOTATION_KEYS.has(key)) fail(where, `keyword "${key}" is not in the supported subset`);
  }
}

function nonNegativeInteger(where: string, value: unknown, keyword: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) fail(where, `${keyword} must be a non-negative integer`);
  return value;
}

function finiteNumber(where: string, value: unknown, keyword: string, integer: boolean): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isSafeInteger(value))) {
    fail(where, `${keyword} must be a finite ${integer ? 'safe integer' : 'number'}`);
  }
  return value;
}

function stringList(where: string, value: unknown, keyword: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item): item is string => typeof item === 'string')) {
    fail(where, `${keyword} must be a non-empty list of strings`);
  }
  if (new Set(value).size !== value.length) fail(where, `${keyword} repeats an entry`);
  return value;
}

function checkPattern(where: string, pattern: string): void {
  if (!pattern.startsWith('^') || !pattern.endsWith('$')) fail(where, 'a pattern is anchored with ^ and $');
  if (/\\[dDwWsSbB]/.test(pattern)) fail(where, 'a pattern spells its classes out ([0-9], not \\d): the two regex engines differ on them');
  try {
    new RegExp(pattern, 'u');
  } catch {
    fail(where, 'the pattern is not a valid regular expression in Unicode mode');
  }
}

function toJsonValue(where: string, value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item, index) => toJsonValue(`${where}[${String(index)}]`, item));
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toJsonValue(`${where}.${key}`, item)]));
  }
  return fail(where, 'not JSON');
}

function loadNode(where: string, raw: unknown, defNames: ReadonlySet<string>): Node {
  if (!isRecord(raw)) fail(where, 'a schema node is an object');
  if ('$ref' in raw) {
    checkKeys(where, raw, new Set(['$ref']));
    const target = typeof raw.$ref === 'string' ? REF.exec(raw.$ref)?.[1] : undefined;
    if (target === undefined || !defNames.has(target)) fail(where, `$ref must name a def as #/$defs/<Name>`);
    return { kind: 'ref', target };
  }
  if ('oneOf' in raw) {
    checkKeys(where, raw, new Set(['oneOf', 'discriminator', 'x-ifc-locator-keys']));
    if (!Array.isArray(raw.oneOf) || raw.oneOf.length < 2) fail(where, 'oneOf lists at least two branches');
    const branches = raw.oneOf.map((branch, index) => {
      const node = loadNode(`${where}.oneOf[${String(index)}]`, branch, defNames);
      if (node.kind !== 'ref') fail(where, 'each oneOf branch is a $ref');
      return node.target;
    });
    if (new Set(branches).size !== branches.length) fail(where, 'oneOf repeats a branch');
    let discriminator: string | undefined;
    if (raw.discriminator !== undefined) {
      if (!isRecord(raw.discriminator) || Object.keys(raw.discriminator).join() !== 'propertyName' || typeof raw.discriminator.propertyName !== 'string') {
        fail(where, 'discriminator is { propertyName }');
      }
      discriminator = raw.discriminator.propertyName;
    }
    return discriminator === undefined ? { kind: 'oneOf', branches } : { kind: 'oneOf', branches, discriminator };
  }
  const type = raw.type;
  if (typeof type !== 'string' || !(type in KEYS_BY_TYPE)) fail(where, 'type is one of object, array, string, integer, number, boolean');
  const allowed = KEYS_BY_TYPE[type];
  if (allowed === undefined) return fail(where, 'unsupported type');
  checkKeys(where, raw, allowed);
  switch (type) {
    case 'object': {
      if (raw.additionalProperties !== false) fail(where, 'every object is closed: additionalProperties is false');
      const rawProperties = raw.properties;
      if (!isRecord(rawProperties)) fail(where, 'an object lists its properties');
      const required: unknown = raw.required;
      if (!Array.isArray(required) || !required.every((key): key is string => typeof key === 'string')) {
        fail(where, 'required lists the required keys (an empty list when none is)');
      }
      const keys = Object.keys(rawProperties);
      for (const key of required) if (!keys.includes(key)) fail(where, `required key "${key}" is not a property`);
      if (new Set(required).size !== required.length) fail(where, 'required repeats a key');
      const properties = keys.map((key) => {
        if (!PROPERTY_KEY.test(key)) fail(where, `property "${key}" is not camelCase`);
        const snake = snakeCase(key);
        if (camelCase(snake) !== key) fail(where, `property "${key}" does not survive the snake_case round trip`);
        if (PYTHON_RESERVED.has(snake)) fail(where, `property "${key}" is a Python keyword`);
        return { key, node: loadNode(`${where}.properties.${key}`, rawProperties[key], defNames), required: required.includes(key) };
      });
      return { kind: 'object', properties };
    }
    case 'array': {
      const items = loadNode(`${where}.items`, raw.items, defNames);
      const minItems = nonNegativeInteger(where, raw.minItems, 'minItems');
      const maxItems = nonNegativeInteger(where, raw.maxItems, 'maxItems');
      if (raw.uniqueItems !== undefined && raw.uniqueItems !== true) fail(where, 'uniqueItems is true or absent');
      return {
        kind: 'array',
        items,
        uniqueItems: raw.uniqueItems === true,
        ...(minItems === undefined ? {} : { minItems }),
        ...(maxItems === undefined ? {} : { maxItems }),
      };
    }
    case 'string': {
      const pattern = raw.pattern;
      if (pattern !== undefined) {
        if (typeof pattern !== 'string') fail(where, 'pattern is a string');
        checkPattern(where, pattern);
      }
      const minLength = nonNegativeInteger(where, raw.minLength, 'minLength');
      const maxLength = nonNegativeInteger(where, raw.maxLength, 'maxLength');
      const enumValues = raw.enum === undefined ? undefined : stringList(where, raw.enum, 'enum');
      if (raw.const !== undefined && typeof raw.const !== 'string') fail(where, 'const is a string');
      const constValue = raw.const;
      if ((enumValues !== undefined || constValue !== undefined) && (pattern !== undefined || minLength !== undefined || maxLength !== undefined)) {
        fail(where, 'an enum or const string takes no pattern or length');
      }
      if (enumValues !== undefined && constValue !== undefined) fail(where, 'enum and const are exclusive');
      return {
        kind: 'string',
        ...(typeof pattern === 'string' ? { pattern } : {}),
        ...(minLength === undefined ? {} : { minLength }),
        ...(maxLength === undefined ? {} : { maxLength }),
        ...(enumValues === undefined ? {} : { enumValues }),
        ...(typeof constValue === 'string' ? { constValue } : {}),
      };
    }
    case 'integer': {
      const minimum = finiteNumber(where, raw.minimum, 'minimum', true);
      const maximum = finiteNumber(where, raw.maximum, 'maximum', true);
      let enumValues: readonly number[] | undefined;
      if (raw.enum !== undefined) {
        if (!Array.isArray(raw.enum) || raw.enum.length === 0 || !raw.enum.every((item): item is number => typeof item === 'number' && Number.isSafeInteger(item))) {
          fail(where, 'an integer enum lists safe integers');
        }
        enumValues = raw.enum;
      }
      return {
        kind: 'integer',
        ...(minimum === undefined ? {} : { minimum }),
        ...(maximum === undefined ? {} : { maximum }),
        ...(enumValues === undefined ? {} : { enumValues }),
      };
    }
    case 'number': {
      const minimum = finiteNumber(where, raw.minimum, 'minimum', false);
      const maximum = finiteNumber(where, raw.maximum, 'maximum', false);
      return { kind: 'number', ...(minimum === undefined ? {} : { minimum }), ...(maximum === undefined ? {} : { maximum }) };
    }
    default:
      return { kind: 'boolean' };
  }
}

/** The longest array written as a fixed tuple (a Box is four coordinates). */
export const MAX_TUPLE_LENGTH = 8;

/** An array of a fixed, small length: a tuple in both languages' types (the rules are the same as for any array). */
export function isFixedTuple(node: Extract<Node, { kind: 'array' }>): boolean {
  return (
    node.minItems !== undefined &&
    node.minItems === node.maxItems &&
    node.minItems > 1 &&
    node.minItems <= MAX_TUPLE_LENGTH &&
    !node.uniqueItems
  );
}

/** The length of a fixed tuple (isFixedTuple). */
export function tupleLength(node: Extract<Node, { kind: 'array' }>): number {
  if (!isFixedTuple(node) || node.maxItems === undefined) throw new SchemaSubsetError('not a fixed tuple');
  return node.maxItems;
}

/** The defs a node refers to directly. */
export function refsOf(node: Node): readonly string[] {
  switch (node.kind) {
    case 'ref':
      return [node.target];
    case 'object':
      return node.properties.flatMap((property) => refsOf(property.node));
    case 'array':
      return refsOf(node.items);
    case 'oneOf':
      return node.branches;
    default:
      return [];
  }
}

/** Resolves a node through refs to the node that is not a ref. */
export function resolve(node: Node, defs: ReadonlyMap<string, Def>): Node {
  let current = node;
  const seen = new Set<string>();
  while (current.kind === 'ref') {
    if (seen.has(current.target)) throw new SchemaSubsetError(`$ref cycle through ${current.target}`);
    seen.add(current.target);
    const def = defs.get(current.target);
    if (def === undefined) throw new SchemaSubsetError(`unknown def ${current.target}`);
    current = def.node;
  }
  return current;
}

function checkDiscriminators(defs: ReadonlyMap<string, Def>): void {
  for (const def of defs.values()) {
    const node = def.node;
    if (node.kind !== 'oneOf') continue;
    const values = new Set<string>();
    for (const branch of node.branches) {
      const target = defs.get(branch)?.node;
      if (target?.kind !== 'object') fail(def.name, `oneOf branch ${branch} is an object def`);
      if (node.discriminator === undefined) continue;
      const property = target.properties.find((candidate) => candidate.key === node.discriminator);
      const value = property?.node.kind === 'string' ? property.node.constValue : undefined;
      if (property === undefined || !property.required || value === undefined) {
        fail(def.name, `branch ${branch} holds the discriminator "${node.discriminator}" as a required const`);
      }
      if (values.has(value)) fail(def.name, `two branches share the discriminator value "${value}"`);
      values.add(value);
    }
  }
}

function checkUniqueItems(defs: ReadonlyMap<string, Def>): void {
  const visit = (where: string, node: Node): void => {
    if (node.kind === 'array') {
      if (node.uniqueItems) {
        const item = resolve(node.items, defs);
        if (item.kind !== 'string' && item.kind !== 'integer') fail(where, 'uniqueItems applies to string or integer items only');
      }
      visit(where, node.items);
    } else if (node.kind === 'object') {
      for (const property of node.properties) visit(`${where}.${property.key}`, property.node);
    }
  };
  for (const def of defs.values()) visit(def.name, def.node);
}

/** Orders defs so that each comes after the defs it refers to (the schema has no cycle). */
function dependencyOrder(defs: ReadonlyMap<string, Def>): readonly Def[] {
  const ordered: Def[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (name: string, trail: readonly string[]): void => {
    const current = state.get(name);
    if (current === 'done') return;
    if (current === 'visiting') fail(name, `reference cycle: ${[...trail, name].join(' -> ')}`);
    state.set(name, 'visiting');
    const def = defs.get(name);
    if (def === undefined) fail(name, 'unknown def');
    for (const target of refsOf(def.node)) visit(target, [...trail, name]);
    state.set(name, 'done');
    ordered.push(def);
  };
  for (const name of defs.keys()) visit(name, []);
  return ordered;
}

/** Loads and checks the contract schema. Throws SchemaSubsetError on anything outside the subset. */
export function loadContractSchema(source: unknown): ContractSchema {
  if (!isRecord(source)) fail('schema', 'the schema is an object');
  for (const key of Object.keys(source)) if (!ROOT_KEYS.has(key)) fail('schema', `root keyword "${key}" is not in the supported subset`);
  const version = source['x-contract-version'];
  if (typeof version !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) fail('schema', 'x-contract-version is a semantic version');
  if (source.$id !== `urn:sovitech:extraction-contract:${version}`) fail('schema', '$id names the contract version');
  const rawDefs = source.$defs;
  if (!isRecord(rawDefs)) fail('schema', '$defs is an object');
  const names = Object.keys(rawDefs);
  for (const name of names) if (!DEF_NAME.test(name)) fail('schema', `def "${name}" is not PascalCase`);
  const defNames = new Set(names);
  const defs = new Map<string, Def>();
  const invariantIds: string[] = [];
  let formatRules: JsonValue = null;
  let mechanismRules: JsonValue = null;
  let ifcLocatorKeys: readonly string[] | undefined;
  for (const name of names) {
    const raw = rawDefs[name];
    const node = loadNode(name, raw, defNames);
    const rawInvariants: unknown = isRecord(raw) ? raw['x-invariants'] : undefined;
    const invariants = rawInvariants === undefined ? [] : stringList(name, rawInvariants, 'x-invariants');
    for (const id of invariants) {
      if (!INVARIANT_ID.test(id)) fail(name, `invariant id "${id}" is not snake_case`);
      if (invariantIds.includes(id)) fail(name, `invariant id "${id}" is used twice`);
      invariantIds.push(id);
    }
    if (isRecord(raw) && raw['x-format-rules'] !== undefined) {
      if (name !== 'ExtractionOutput') fail(name, 'x-format-rules belongs to ExtractionOutput');
      formatRules = toJsonValue(`${name}.x-format-rules`, raw['x-format-rules']);
    }
    if (isRecord(raw) && raw['x-ifc-locator-keys'] !== undefined) {
      if (name !== 'EvidenceLocator') fail(name, 'x-ifc-locator-keys belongs to EvidenceLocator');
      ifcLocatorKeys = stringList(name, raw['x-ifc-locator-keys'], 'x-ifc-locator-keys');
    }
    if (isRecord(raw) && raw['x-mechanism-rules'] !== undefined) {
      if (name !== 'IfcProposalMechanism') fail(name, 'x-mechanism-rules belongs to IfcProposalMechanism');
      mechanismRules = toJsonValue(`${name}.x-mechanism-rules`, raw['x-mechanism-rules']);
    }
    defs.set(name, { name, node, invariants });
  }
  const entryPoints = stringList('schema', source['x-entry-points'], 'x-entry-points');
  for (const entry of entryPoints) if (!defNames.has(entry)) fail('schema', `entry point ${entry} is not a def`);
  if (formatRules === null) fail('schema', 'ExtractionOutput carries x-format-rules');
  if (mechanismRules === null) fail('schema', 'IfcProposalMechanism carries x-mechanism-rules');
  if (ifcLocatorKeys === undefined) fail('schema', 'EvidenceLocator carries x-ifc-locator-keys');
  checkDiscriminators(defs);
  checkUniqueItems(defs);
  return { version, entryPoints, defs: dependencyOrder(defs), formatRules, mechanismRules, ifcLocatorKeys, invariantIds };
}
