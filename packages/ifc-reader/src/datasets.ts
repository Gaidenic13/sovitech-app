/**
 * The mapping datasets that shape IFC candidate proposals, read only when a request names them.
 *
 * A dataset maps model content to app fields, types or flags (ifc-input 4.2 and 4.4): which
 * property is which field, which class and predefined type is which asset type, which tag
 * prefix or name term the glossary defines, which signals mark an asset as life-safety. Under
 * ifc-input 6.2.10 such a table is a reference dataset that needs the approver, and the
 * `ifc-values` gate holds every proposal back until then; the request names datasets only
 * while that gate is open, and the API mounts only what the gates allow. The reader holds no
 * table of its own: with no dataset, it makes no proposal (prompt 3 section 8; PRD R-027,
 * R-030 "Until decided").
 *
 * Each dataset is one JSON file, `<id>@<version>.json`, read strictly: a key or a value the
 * format does not name refuses the whole dataset (DatasetError with a code, never the content).
 * The format is the one the Python extractor read (ADR 0024), so a table serves either build.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mechanismRule, type IfcGateId, type IfcProposalMechanism } from '@sovitech/extraction-contract';
import { parse } from 'yaml';

/** A dataset the reader refuses. The message is a code. */
export class DatasetError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'DatasetError';
  }
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u;
const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,39}$/u;
const FIELD_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/u;
const CHOICE = /^[a-z][a-z0-9_]{0,63}$/u;
const MECHANISMS = ['direct_read', 'relation', 'tag_source', 'class_mapping', 'name_term', 'quantity_set_area'] as const;
const SUBJECTS = ['project', 'building', 'level', 'zone', 'asset', 'metering_point'] as const;
const SOURCES = ['document', 'ai_inference'] as const;
const CONFIDENCE = ['high', 'medium', 'low'] as const;
const GATES = [
  'ifc-values',
  'ifc-code-inference',
  'ifc-identity',
  'ifc-untagged-count',
  'ifc-areas',
  'ifc-geometry',
  'ifc-units',
  'ifc-hidden-content',
  'dataset-asset-taxonomy',
  'dataset-glossary',
] as const;
const OBJECT_KINDS = ['element', 'space', 'storey', 'building', 'site', 'project', 'zone', 'system'] as const;
const THROUGH = ['occurrence', 'type_object', 'any'] as const;
const RELATIONS = [
  'contained_in_spatial_structure',
  'aggregates',
  'assigns_to_group',
  'defines_by_type',
  'services_buildings',
  'referenced_in_spatial_structure',
  'flow_control_elements',
  'nests',
] as const;
const MATCH_KEYS = new Set([
  'objectKind',
  'ifcClass',
  'predefinedType',
  'attribute',
  'requireLetter',
  'propertySet',
  'property',
  'through',
  'quantitySet',
  'quantity',
  'tagPrefix',
  'nameTerm',
  'relation',
  'groupPredefinedType',
  'groupNameTerm',
  'propertiesTrue',
]);
const RULE_KEYS = new Set(['id', 'mechanism', 'fieldKey', 'subjectKind', 'sourceClaim', 'confidence', 'gates', 'match', 'value']);

export type ObjectKind = (typeof OBJECT_KINDS)[number];
export type MatchThrough = (typeof THROUGH)[number];
export type MatchRelation = (typeof RELATIONS)[number];

export interface Match {
  readonly objectKind: ObjectKind;
  readonly through: MatchThrough;
  readonly ifcClass?: readonly string[];
  readonly predefinedType?: readonly string[];
  readonly tagPrefix?: readonly string[];
  readonly nameTerm?: readonly string[];
  readonly groupPredefinedType?: readonly string[];
  readonly groupNameTerm?: readonly string[];
  readonly attribute?: string;
  readonly propertySet?: string;
  readonly property?: string;
  readonly quantitySet?: string;
  readonly quantity?: string;
  readonly requireLetter?: boolean;
  readonly relation?: MatchRelation;
  readonly propertiesTrue?: readonly (readonly [string, string])[];
}

export interface Rule {
  readonly index: number;
  readonly mechanism: IfcProposalMechanism;
  readonly fieldKey: string;
  readonly subjectKind: (typeof SUBJECTS)[number];
  readonly sourceClaim: (typeof SOURCES)[number];
  readonly confidence: (typeof CONFIDENCE)[number] | undefined;
  readonly gates: readonly IfcGateId[];
  readonly match: Match;
  readonly valueKind: 'fact' | 'choice';
  readonly choice: string | undefined;
}

export interface Dataset {
  readonly id: string;
  readonly version: string;
  readonly rules: readonly Rule[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

function textsOf(value: unknown, code: string): string[] {
  const items: unknown[] = Array.isArray(value) ? value : [value];
  if (items.length === 0 || !items.every((item): item is string => typeof item === 'string' && item !== '')) throw new DatasetError(code);
  return items;
}

function matchOf(raw: unknown): Match {
  if (!isRecord(raw) || Object.keys(raw).length === 0 || Object.keys(raw).some((key) => !MATCH_KEYS.has(key))) throw new DatasetError('dataset.match');
  const objectKind = raw['objectKind'] ?? 'element';
  if (!oneOf(OBJECT_KINDS, objectKind)) throw new DatasetError('dataset.match');
  const through = raw['through'] ?? 'any';
  if (!oneOf(THROUGH, through)) throw new DatasetError('dataset.match');
  const match: Record<string, unknown> = { objectKind, through };
  for (const key of ['ifcClass', 'predefinedType', 'tagPrefix', 'nameTerm', 'groupPredefinedType', 'groupNameTerm']) {
    if (key in raw) match[key] = textsOf(raw[key], 'dataset.match');
  }
  for (const key of ['attribute', 'propertySet', 'property', 'quantitySet', 'quantity']) {
    if (key in raw) match[key] = textsOf(raw[key], 'dataset.match')[0];
  }
  if ('requireLetter' in raw) {
    if (typeof raw['requireLetter'] !== 'boolean') throw new DatasetError('dataset.match');
    match['requireLetter'] = raw['requireLetter'];
  }
  if ('relation' in raw) {
    if (!oneOf(RELATIONS, raw['relation'])) throw new DatasetError('dataset.match');
    match['relation'] = raw['relation'];
  }
  if ('propertiesTrue' in raw) {
    const pairs = raw['propertiesTrue'];
    const valid =
      Array.isArray(pairs) &&
      pairs.length > 0 &&
      pairs.every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every((part) => typeof part === 'string' && part !== ''));
    if (!valid) throw new DatasetError('dataset.match');
    match['propertiesTrue'] = (pairs as [string, string][]).map(([set, name]) => [set, name] as const);
  }
  if ('propertySet' in match !== 'property' in match) throw new DatasetError('dataset.match');
  if ('quantitySet' in match !== 'quantity' in match) throw new DatasetError('dataset.match');
  return match as unknown as Match;
}

function ruleOf(index: number, raw: unknown): Rule {
  if (!isRecord(raw) || Object.keys(raw).some((key) => !RULE_KEYS.has(key))) throw new DatasetError('dataset.rule');
  const mechanism = raw['mechanism'];
  if (!oneOf(MECHANISMS, mechanism)) throw new DatasetError('dataset.mechanism');
  const fieldKey = raw['fieldKey'];
  if (typeof fieldKey !== 'string' || !FIELD_KEY.test(fieldKey)) throw new DatasetError('dataset.field_key');
  const subject = raw['subjectKind'];
  const source = raw['sourceClaim'];
  const confidence = raw['confidence'];
  if (!oneOf(SUBJECTS, subject) || !oneOf(SOURCES, source)) throw new DatasetError('dataset.rule');
  if ((source === 'ai_inference') !== (confidence !== undefined) || (confidence !== undefined && !oneOf(CONFIDENCE, confidence))) {
    throw new DatasetError('dataset.confidence');
  }
  const gates = raw['gates'] ?? [];
  if (!Array.isArray(gates) || gates.some((gate) => !oneOf(GATES, gate))) throw new DatasetError('dataset.gates');
  const required = mechanismRule(mechanism).gates;
  const allGates = [...new Set([...required, ...(gates as IfcGateId[])])];
  const value = raw['value'];
  if (!isRecord(value) || (value['kind'] !== 'fact' && value['kind'] !== 'choice')) throw new DatasetError('dataset.value');
  const choice = value['choice'];
  if (value['kind'] === 'choice' && (typeof choice !== 'string' || !CHOICE.test(choice))) throw new DatasetError('dataset.value');
  if (Object.keys(value).some((key) => key !== 'kind' && key !== 'choice') || (value['kind'] === 'fact' && choice !== undefined)) throw new DatasetError('dataset.value');
  return {
    index,
    mechanism,
    fieldKey,
    subjectKind: subject,
    sourceClaim: source,
    confidence: confidence as Rule['confidence'],
    gates: allGates,
    match: matchOf(raw['match']),
    valueKind: value['kind'],
    choice: value['kind'] === 'choice' ? (choice as string) : undefined,
  };
}

/** The dataset `<id>@<version>.json` from a folder; throws DatasetError. */
export function loadDataset(folder: string, id: string, version: string): Dataset {
  if (!ID.test(id) || !VERSION.test(version)) throw new DatasetError('dataset.reference');
  let raw: unknown;
  try {
    raw = parse(readFileSync(join(folder, `${id}@${version}.json`), 'utf8'), { schema: 'json', maxAliasCount: 0, uniqueKeys: true });
  } catch {
    throw new DatasetError('dataset.unreadable');
  }
  const keys = isRecord(raw) ? Object.keys(raw).sort().join(',') : '';
  if (!isRecord(raw) || keys !== 'id,kind,rules,version') throw new DatasetError('dataset.shape');
  if (raw['id'] !== id || raw['version'] !== version || raw['kind'] !== 'ifc-mapping') throw new DatasetError('dataset.identity');
  const rules = raw['rules'];
  if (!Array.isArray(rules) || rules.length === 0) throw new DatasetError('dataset.rules');
  return { id, version, rules: rules.map((rule, index) => ruleOf(index, rule)) };
}
