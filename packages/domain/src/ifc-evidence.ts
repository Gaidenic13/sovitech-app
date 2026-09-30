/**
 * The IFC evidence locator and its verifier: the domain half of the gated IFC value path
 * (prompt 3 section 8, "Output per file", and section 10, phase 2: "The IFC value path behind
 * `ifc-values` and the related gates"; docs/adr/0033-ifc-value-path-api-half.md).
 *
 * None of this is 2.4 as written. Guardrails 2.4's `Evidence.locator` holds a page, a sheet, a
 * cell and a box only, so the strict locator check refuses every IFC key (G1-13), and a value
 * read from a model is never stored while `ifc-values` is closed. The locator here is ifc-input
 * 6.2.1's proposal (GAP-A), which the approver has not approved: the element's GlobalId, the STEP
 * instance ids of the quoted statements, and the path to the value (an attribute, a property or
 * quantity, on the occurrence or through its type object, or a relation), with the schema the
 * document's model record declares. It is built so the value path exists behind its gate
 * (prompt 3 5.4), and only the API's gated module (apps/api/src/ingestion/ifc-values.ts) calls it,
 * after `openIfcValues` read the gate open. Nothing on the live path reaches it: the store's
 * gated writer re-reads the gate, and the 2.4 verifier and `insertCandidate` refuse an IFC key.
 *
 * An IFC evidence entry is a 2.4 `Evidence` with no 2.4 locator at all (no page, sheet, cell or
 * box: prompt 3 section 8, "No locator shortcuts"), and its IFC locator beside it, where 6.2.1
 * would put it. Derive reads only an entry's document and check, so an IFC value takes part in
 * rule 4's conflict test, 2.3's revisions and deletion, and rule 13's erasure like any other.
 *
 * What the verifier checks, in rule 1's order, each over every entry before the next runs:
 * 1. the document belongs to this project;
 * 2. the content hash matches the stored revision, and the locator's schema is the schema the
 *    document's model record declares (6.2.2, a proposal: the record is the engineer's only);
 * 3. the locator exists: the GlobalId is an element of that revision, every STEP id is a
 *    statement of it, and the path re-resolves (an attribute on the element's own statement or
 *    on a type object; a property or quantity statement of that name; a relation statement that
 *    names both elements);
 * 4. the excerpt is the verbatim text of those statements, compared after decoding STEP string
 *    escapes and normalising whitespace and diacritics (6.2.1);
 * 5. for `document`, the value parses from the typed literal at the path's position in its
 *    statement, never from the rest of the line.
 * The statements are the ones the sandboxed reader quoted and the API stored as the model's
 * extracted text, keyed by project id and content hash (rule 13): nothing here opens a model.
 *
 * Code decides the source (2.1; ifc-input 4.1 item 2): a direct read, a tag or a quantity-set
 * area is `document` only when check 5 passes, and is rejected otherwise (it is never re-sourced
 * as an inference); every interpretation (an asset type from an IFC class, a term, a relation
 * read as a flag) is `ai_inference`, whatever the table claimed, with its confidence capped by
 * code (rule 3; an IFC class of a proxy supports no type, ifc-input 6.2.9). An inferred quantity
 * is rejected (rule 1). Every rejection is a guardrail event with codes, never text (rule 13).
 */
import { EVIDENCE_CHECKS, normaliseForExcerpt, type EvidenceCheckName, type QuantityReading } from './evidence';
import type {
  Candidate,
  Confidence,
  DocumentRecord,
  Evidence,
  FieldDefinition,
  GuardrailEvent,
  GuardrailEventType,
  OriginalText,
  ProposedSource,
  Quantity,
} from './model';

// ---------------------------------------------------------------------------
// The locator (ifc-input 6.2.1, proposed)
// ---------------------------------------------------------------------------

export const IFC_PATH_THROUGH = ['occurrence', 'type_object'] as const;
export type IfcPathThrough = (typeof IFC_PATH_THROUGH)[number];

/** The relations an IFC locator may name (the extraction contract's IfcRelationPath). */
export const IFC_RELATIONS = [
  'contained_in_spatial_structure',
  'aggregates',
  'assigns_to_group',
  'defines_by_type',
  'services_buildings',
  'referenced_in_spatial_structure',
  'flow_control_elements',
  'nests',
  'connects_ports',
  'associates_classification',
] as const;
export type IfcRelationKind = (typeof IFC_RELATIONS)[number];

/** Where a value sits, from its element. */
export type IfcEvidencePath =
  | { readonly kind: 'attribute'; readonly through: IfcPathThrough; readonly attribute: string }
  | { readonly kind: 'property'; readonly through: IfcPathThrough; readonly propertySet: string; readonly property: string }
  | { readonly kind: 'quantity'; readonly through: IfcPathThrough; readonly quantitySet: string; readonly quantity: string }
  | { readonly kind: 'relation'; readonly relation: IfcRelationKind; readonly relatedGlobalId: string };

/** ifc-input 6.2.1's locator, with the schema of the document's model record (6.2.2). */
export interface IfcEvidenceLocator {
  /** The schema the file header declares, as the model record holds it: 'IFC2X3', 'IFC4'. */
  readonly schema: string;
  /** The element, space, storey, zone, system or type object the value belongs to. */
  readonly globalId: string;
  /** The STEP instance ids of the statements the excerpt quotes, in this content hash. */
  readonly stepIds: readonly number[];
  readonly path: IfcEvidencePath;
}

/** An IFC evidence entry as proposed, before code sets its check. */
export interface ProposedIfcEvidence {
  readonly documentId: string;
  readonly contentHash: string;
  readonly ifc: IfcEvidenceLocator;
  /** The verbatim STEP text of the statements at `ifc.stepIds`, escapes as written (ifc-input 4.1 item 3). */
  readonly excerpt: string;
}

/** No 2.4 locator: a model has no page, sheet, cell or box, and none is borrowed (prompt 3 section 8). */
export interface NoEvidenceLocator {
  readonly page?: undefined;
  readonly sheet?: undefined;
  readonly cell?: undefined;
  readonly bbox?: undefined;
}

/** A verified IFC evidence entry, as the gated store keeps it and derive reads it. */
export interface IfcEvidence extends Evidence {
  readonly locator: NoEvidenceLocator;
  readonly ifc: IfcEvidenceLocator;
  /** The statements matched the stored text of that revision (6.2.1: `text_match` on the STEP line). */
  readonly check: 'text_match';
}

/** Whether an evidence entry is an IFC entry (it carries an IFC locator). */
export function isIfcEvidence(entry: Evidence): entry is IfcEvidence {
  const ifc = (entry as { readonly ifc?: unknown }).ifc;
  return typeof ifc === 'object' && ifc !== null;
}

/** A candidate of the gated IFC value path: every evidence entry an IFC entry. */
export type IfcCandidate = Omit<Candidate, 'evidence'> & { readonly evidence: readonly IfcEvidence[] };

const GLOBAL_ID = /^[0-9A-Za-z_$]{22}$/u;
const SCHEMA = /^IFC[0-9A-Z_]{1,24}$/u;
const NAME_MAX = 255;
const STEP_IDS_MAX = 64;

/** Why an IFC locator's shape is refused, before any stored text is read. */
export function ifcLocatorShapeProblem(locator: unknown): 'shape' | undefined {
  if (typeof locator !== 'object' || locator === null) return 'shape';
  const { schema, globalId, stepIds, path } = locator as Partial<Record<keyof IfcEvidenceLocator, unknown>>;
  if (typeof schema !== 'string' || !SCHEMA.test(schema)) return 'shape';
  if (typeof globalId !== 'string' || !GLOBAL_ID.test(globalId)) return 'shape';
  if (!Array.isArray(stepIds) || stepIds.length === 0 || stepIds.length > STEP_IDS_MAX) return 'shape';
  if (!stepIds.every((id) => Number.isSafeInteger(id) && (id as number) >= 1)) return 'shape';
  if (new Set(stepIds).size !== stepIds.length) return 'shape';
  if (typeof path !== 'object' || path === null) return 'shape';
  const name = (text: unknown): boolean => typeof text === 'string' && text !== '' && [...text].length <= NAME_MAX;
  const through = (value: unknown): boolean => IFC_PATH_THROUGH.includes(value as IfcPathThrough);
  const shaped = path as Record<string, unknown>;
  switch (shaped['kind']) {
    case 'attribute':
      return through(shaped['through']) && typeof shaped['attribute'] === 'string' && /^[A-Z][A-Za-z0-9]{0,63}$/u.test(shaped['attribute']) ? undefined : 'shape';
    case 'property':
      return through(shaped['through']) && name(shaped['propertySet']) && name(shaped['property']) ? undefined : 'shape';
    case 'quantity':
      return through(shaped['through']) && name(shaped['quantitySet']) && name(shaped['quantity']) ? undefined : 'shape';
    case 'relation':
      return IFC_RELATIONS.includes(shaped['relation'] as IfcRelationKind) &&
        typeof shaped['relatedGlobalId'] === 'string' &&
        GLOBAL_ID.test(shaped['relatedGlobalId'])
        ? undefined
        : 'shape';
    default:
      return 'shape';
  }
}

// ---------------------------------------------------------------------------
// STEP statements (ISO 10303-21), read as text only
// ---------------------------------------------------------------------------

/** One statement of an exchange file: `#id=ENTITY(arguments);`. */
export interface StepStatement {
  /** The instance id as written, digits only. */
  readonly stepId: string;
  /** The entity name as written, upper case: 'IFCPROPERTYSINGLEVALUE'. */
  readonly entity: string;
  /** The top-level arguments as written, each trimmed. */
  readonly args: readonly string[];
}

const STATEMENT = /^#([0-9]{1,12})\s*=\s*([A-Z][A-Z0-9_]*)\s*\(([\s\S]*)\)\s*;\s*$/u;

/** Splits an argument list at its top-level commas; undefined when strings or brackets do not close. */
function splitArguments(list: string): string[] | undefined {
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  let index = 0;
  while (index < list.length) {
    const char = list.charAt(index);
    if (char === "'" || char === '"') {
      const close = char;
      index += 1;
      while (index < list.length) {
        if (list.charAt(index) === close) {
          if (close === "'" && list.charAt(index + 1) === "'") {
            index += 2;
            continue;
          }
          break;
        }
        index += 1;
      }
      if (index >= list.length) return undefined;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth < 0) return undefined;
    } else if (char === ',' && depth === 0) {
      args.push(list.slice(start, index).trim());
      start = index + 1;
    }
    index += 1;
  }
  if (depth !== 0) return undefined;
  const last = list.slice(start).trim();
  if (last !== '' || args.length > 0) args.push(last);
  return args;
}

/** A statement's id, entity and top-level arguments, or undefined when it is not one statement. */
export function readStepStatement(text: string): StepStatement | undefined {
  const match = STATEMENT.exec(text.trim());
  const [, stepId, entity, list] = match ?? [];
  if (stepId === undefined || entity === undefined || list === undefined) return undefined;
  const args = splitArguments(list);
  return args === undefined ? undefined : { stepId, entity, args };
}

/** A literal as written: a typed literal `IFCPOWERMEASURE(430000.)` unwrapped to its type and token. */
export interface StepLiteral {
  readonly typeName?: string;
  readonly token: string;
}

const TYPED = /^([A-Z][A-Z0-9_]*)\s*\(([\s\S]*)\)$/u;

export function stepLiteral(argument: string): StepLiteral {
  const typed = TYPED.exec(argument);
  const [, typeName, inner] = typed ?? [];
  return typeName === undefined || inner === undefined ? { token: argument } : { typeName, token: inner.trim() };
}

/** Hex pairs to bytes, built without reading text as a number (the no-number-coercion ban). */
const HEX_BYTE: ReadonlyMap<string, number> = (() => {
  const digits = '0123456789ABCDEF';
  const pairs = new Map<string, number>();
  for (let high = 0; high < 16; high += 1) {
    for (let low = 0; low < 16; low += 1) pairs.set(`${digits.charAt(high)}${digits.charAt(low)}`, high * 16 + low);
  }
  return pairs;
})();

function byteOf(pair: string): number | undefined {
  return HEX_BYTE.get(pair.toUpperCase());
}

/** The code units of a \X2\ run: four hex digits each. */
function utf16Units(hex: string): number[] | undefined {
  const units: number[] = [];
  for (let at = 0; at < hex.length; at += 4) {
    const high = byteOf(hex.slice(at, at + 2));
    const low = byteOf(hex.slice(at + 2, at + 4));
    if (high === undefined || low === undefined) return undefined;
    units.push(high * 256 + low);
  }
  return units;
}

/** The code points of a \X4\ run: eight hex digits each. */
function utf32Points(hex: string): number[] | undefined {
  const points: number[] = [];
  for (let at = 0; at < hex.length; at += 8) {
    const bytes = [0, 2, 4, 6].map((offset) => byteOf(hex.slice(at + offset, at + offset + 2)));
    const [b0, b1, b2, b3] = bytes;
    if (b0 === undefined || b1 === undefined || b2 === undefined || b3 === undefined) return undefined;
    const point = ((b0 * 256 + b1) * 256 + b2) * 256 + b3;
    if (point > 0x10ffff) return undefined;
    points.push(point);
  }
  return points;
}

const STRING_PART =
  /(?<quote>'')|(?<backslash>\\\\)|\\S\\(?<upper>[\x20-\x7e])|\\P(?<page>[A-I])\\|\\X2\\(?<ucs2>(?:[0-9A-Fa-f]{4})*)\\X0\\|\\X4\\(?<ucs4>(?:[0-9A-Fa-f]{8})*)\\X0\\|\\X\\(?<byte>[0-9A-Fa-f]{2})|(?<plain>[^'\\]+)/uy;

/**
 * The text of a STEP string token (quotes and escapes resolved; ISO 10303-21 7.3.3), or undefined
 * when it is not one. `\S\` and `\X\` read in ISO 8859-1 (code-page switches are not followed: a
 * page other than A leaves the token undecoded, so it matches nothing).
 */
export function decodeStepString(token: string): string | undefined {
  if (token.length < 2 || !token.startsWith("'") || !token.endsWith("'")) return undefined;
  const body = token.slice(1, -1);
  const out: string[] = [];
  let position = 0;
  while (position < body.length) {
    STRING_PART.lastIndex = position;
    const part = STRING_PART.exec(body);
    const groups = part?.groups;
    if (part === null || groups === undefined) return undefined;
    position = STRING_PART.lastIndex;
    if (groups['plain'] !== undefined) out.push(groups['plain']);
    else if (groups['quote'] !== undefined) out.push("'");
    else if (groups['backslash'] !== undefined) out.push('\\');
    else if (groups['page'] !== undefined) {
      if (groups['page'] !== 'A') return undefined;
    } else if (groups['upper'] !== undefined) out.push(String.fromCharCode(groups['upper'].charCodeAt(0) + 128));
    else if (groups['byte'] !== undefined) {
      const byte = byteOf(groups['byte']);
      if (byte === undefined) return undefined;
      out.push(String.fromCharCode(byte));
    } else if (groups['ucs2'] !== undefined) {
      const units = utf16Units(groups['ucs2']);
      if (units === undefined) return undefined;
      out.push(String.fromCharCode(...units));
    } else if (groups['ucs4'] !== undefined) {
      const points = utf32Points(groups['ucs4']);
      if (points === undefined) return undefined;
      out.push(String.fromCodePoint(...points));
    }
  }
  return out.join('');
}

/** Every STEP string token of a text decoded in place (6.2.1: excerpts are compared after decoding). */
function decodeStringsIn(text: string): string {
  return text.replace(/'(?:[^']|'')*'/gu, (token) => decodeStepString(token) ?? token);
}

/** A STEP excerpt as check 4 compares it: strings decoded, then whitespace and diacritics normalised. */
export function normaliseStepExcerpt(text: string): string {
  return normaliseForExcerpt(decodeStringsIn(text));
}

// ---------------------------------------------------------------------------
// The proposal and what the verifier reads
// ---------------------------------------------------------------------------

/** How the value was proposed (the extraction contract's mechanisms the API passes on). */
export const IFC_PROPOSAL_MECHANISMS = ['direct_read', 'tag_source', 'quantity_set_area', 'class_mapping', 'name_term', 'relation'] as const;
export type IfcProposalMechanism = (typeof IFC_PROPOSAL_MECHANISMS)[number];

/** The mechanisms that read a value written in the file: `document` when it parses from its literal. */
const DIRECT_MECHANISMS: ReadonlySet<IfcProposalMechanism> = new Set(['direct_read', 'tag_source', 'quantity_set_area']);

/**
 * An IFC candidate proposal as the API builds it from an opened table-driven proposal and its
 * facts. The source is a claim; code decides it.
 */
export interface IfcProposal {
  readonly subjectId: string;
  readonly fieldKey: string;
  readonly mechanism: IfcProposalMechanism;
  readonly source: ProposedSource;
  readonly quantity?: Quantity;
  readonly alternatives?: readonly Quantity[];
  readonly choice?: string;
  readonly text?: string;
  readonly original?: OriginalText;
  readonly confidence?: Confidence;
  readonly evidence: readonly ProposedIfcEvidence[];
  /**
   * For a value read from a literal: which evidence entry's statement holds it, and the literal
   * as the reader typed it (its token, and the IFC type it was wrapped in, if any).
   */
  readonly valueFrom?: { readonly evidenceIndex: number; readonly literal: StepLiteral };
}

/** What the checks of IFC evidence read (checks 1 to 4). Every lookup is read-only and keyed by project, document and content hash. */
export interface IfcEvidenceContext {
  readonly projectId: string;
  /** Any stored document by id; check 1 is the verifier's. */
  readonly document: (documentId: string) => DocumentRecord | undefined;
  /** The schema the document's model record declares for that revision (6.2.2, proposed), if one is stored. */
  readonly modelSchema: (documentId: string, contentHash: string) => string | undefined;
  /** The stored statement at a STEP id of that revision (the model's extracted text), if the reader quoted it. */
  readonly statementAt: (documentId: string, contentHash: string, stepId: number) => string | undefined;
  /** The STEP id of the stored statement whose own GlobalId (its first attribute) is `globalId`, in that revision. */
  readonly elementStep: (documentId: string, contentHash: string, globalId: string) => number | undefined;
}

/** What the IFC verifier reads for a proposal: the evidence lookups, the field, the parsers and the new candidate's stamp. */
export interface IfcProposalContext extends IfcEvidenceContext {
  readonly field: FieldDefinition;
  /** The rule 8 parser, for a quantity written as text (an IfcLabel "1.500 kW"). */
  readonly readQuantities: (text: string) => readonly QuantityReading[];
  /** A STEP real or integer token read as a number, through the rule 8 parser; undefined when it is not one. */
  readonly readStepNumber: (token: string) => number | undefined;
  readonly candidateId: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** Why an IFC proposal's shape is refused before any stored text is read. */
export type IfcShapeProblem =
  | 'source'
  | 'field'
  | 'mechanism'
  | 'value_kind'
  | 'choice_not_listed'
  | 'decision_field'
  | 'value_from'
  | 'several_documents';

export type IfcProposalRejection =
  | { readonly kind: 'no_evidence' }
  | { readonly kind: 'malformed'; readonly problem: IfcShapeProblem }
  | { readonly kind: 'evidence_check_failed'; readonly check: EvidenceCheckName; readonly evidenceIndex: number; readonly locatorProblem?: 'shape' | 'schema' | 'global_id' | 'step_id' | 'path' }
  /** Rule 1: an inferred quantity (no IFC interpretation is a direct count). */
  | { readonly kind: 'inferred_quantity' }
  /** ifc-input 6.2.9 (proposed): an IFC class of a proxy supports no type. */
  | { readonly kind: 'proxy_class' };

export type IfcProposalVerdict =
  | { readonly outcome: 'accepted'; readonly candidate: IfcCandidate; readonly guardrailEvents: readonly GuardrailEvent[] }
  | { readonly outcome: 'rejected'; readonly rejection: IfcProposalRejection; readonly guardrailEvents: readonly GuardrailEvent[] };

/** The reason code a rejection is logged and reported with. */
export function ifcRejectionCode(rejection: IfcProposalRejection): string {
  switch (rejection.kind) {
    case 'evidence_check_failed':
      return rejection.locatorProblem === undefined ? rejection.check : `${rejection.check}.${rejection.locatorProblem}`;
    case 'malformed':
      return `proposal_${rejection.problem}`;
    default:
      return rejection.kind;
  }
}

// ---------------------------------------------------------------------------
// Paths against statements (check 3) and literals (check 5)
// ---------------------------------------------------------------------------

const QUANTITY_ENTITIES = /^IFCQUANTITY(?:LENGTH|AREA|VOLUME|COUNT|WEIGHT|TIME|NUMBER)$/u;
const TYPE_OBJECT = /(?:TYPE|STYLE)$/u;

/**
 * The position of an attribute in an occurrence's or a type object's statement, where the
 * schema fixes it for the classes the reader reads: IfcRoot's Name and Description; IfcObject's
 * ObjectType; IfcElement's Tag and IfcSpatialStructureElement's LongName; IfcBuildingStorey's
 * Elevation; IfcProject's LongName and Phase; IfcElementType's ElementType; and PredefinedType as
 * the last attribute. Undefined for any other: its value is then not read (check 5 fails).
 */
function attributePosition(entity: string, attribute: string, through: IfcPathThrough, argCount: number): number | undefined {
  if (attribute === 'Name') return 2;
  if (attribute === 'Description') return 3;
  if (attribute === 'PredefinedType') return argCount - 1;
  if (through === 'type_object') return attribute === 'ElementType' ? 8 : undefined;
  if (entity === 'IFCPROJECT') return attribute === 'LongName' ? 5 : attribute === 'Phase' ? 6 : attribute === 'ObjectType' ? 4 : undefined;
  if (attribute === 'ObjectType') return 4;
  if (attribute === 'Tag' || attribute === 'LongName') return 7;
  if (attribute === 'Elevation') return entity === 'IFCBUILDINGSTOREY' ? 9 : undefined;
  return undefined;
}

/** The name a property or quantity statement gives itself (its first argument), decoded. */
function statementName(statement: StepStatement): string | undefined {
  const first = statement.args[0];
  return first === undefined ? undefined : decodeStepString(first);
}

/** Whether a statement names a STEP instance by reference (`#id`, as a whole token). */
function references(statement: StepStatement, stepId: number): boolean {
  const pattern = new RegExp(`#${String(stepId)}(?![0-9])`, 'u');
  return statement.args.some((argument) => pattern.test(argument));
}

type PathCheck = 'global_id' | 'step_id' | 'path' | undefined;

/** Check 3's re-resolution of one entry's path against the stored statements of its revision. */
function pathProblem(entry: ProposedIfcEvidence, context: IfcEvidenceContext): PathCheck {
  const { documentId, contentHash } = entry;
  const { globalId, stepIds, path } = entry.ifc;
  const elementStep = context.elementStep(documentId, contentHash, globalId);
  if (elementStep === undefined) return 'global_id';
  const element = readStepStatement(context.statementAt(documentId, contentHash, elementStep) ?? '');
  if (element === undefined || decodeStepString(element.args[0] ?? '') !== globalId) return 'global_id';
  const statements: StepStatement[] = [];
  for (const stepId of stepIds) {
    const statement = readStepStatement(context.statementAt(documentId, contentHash, stepId) ?? '');
    if (statement === undefined || statement.stepId !== String(stepId)) return 'step_id';
    statements.push(statement);
  }
  const [first] = statements;
  if (first === undefined) return 'step_id';
  switch (path.kind) {
    case 'attribute':
      if (path.through === 'occurrence') return first.stepId === element.stepId ? undefined : 'path';
      return TYPE_OBJECT.test(first.entity) ? undefined : 'path';
    case 'property':
      return first.entity.startsWith('IFCPROPERTY') && statementName(first) === path.property ? undefined : 'path';
    case 'quantity':
      return QUANTITY_ENTITIES.test(first.entity) && statementName(first) === path.quantity ? undefined : 'path';
    case 'relation': {
      const relatedStep = context.elementStep(documentId, contentHash, path.relatedGlobalId);
      if (relatedStep === undefined || !first.entity.startsWith('IFCREL')) return 'path';
      return references(first, elementStep) && references(first, relatedStep) ? undefined : 'path';
    }
  }
}

/** The argument at the path's value position in its statement, or undefined when the path holds no literal. */
function valueArgument(statement: StepStatement, path: IfcEvidencePath): string | undefined {
  switch (path.kind) {
    case 'property':
      return statement.entity === 'IFCPROPERTYSINGLEVALUE' ? statement.args[2] : undefined;
    case 'quantity':
      return statement.args[3];
    case 'attribute': {
      const position = attributePosition(statement.entity, path.attribute, path.through, statement.args.length);
      return position === undefined ? undefined : statement.args[position];
    }
    case 'relation':
      return undefined;
  }
}

/** A quantity reading of a proposal matches one read from the literal: the same value and unit. */
function sameReading(proposed: Quantity, read: QuantityReading): boolean {
  return proposed.value === read.value && proposed.unit === read.unit;
}

/** Check 5: the proposed value is the literal at the path's position, read from the stored statement. */
function valueInLiteral(proposal: IfcProposal, statement: StepStatement, path: IfcEvidencePath, context: IfcProposalContext): boolean {
  const argument = valueArgument(statement, path);
  if (argument === undefined || proposal.valueFrom === undefined) return false;
  const literal = stepLiteral(argument);
  const claimed = proposal.valueFrom.literal;
  if (literal.token !== claimed.token || literal.typeName !== claimed.typeName) return false;
  const text = decodeStepString(literal.token);
  if (proposal.quantity !== undefined) {
    const readings = [proposal.quantity, ...(proposal.alternatives ?? [])];
    if (text !== undefined) {
      const found = context.readQuantities(text);
      return readings.every((reading) => found.some((read) => sameReading(reading, read)));
    }
    if (proposal.alternatives !== undefined && proposal.alternatives.length > 0) return false;
    const value = context.readStepNumber(literal.token);
    return value !== undefined && value === proposal.quantity.value;
  }
  if (proposal.text !== undefined) return text !== undefined && normaliseForExcerpt(text) === normaliseForExcerpt(proposal.text);
  return false;
}

// ---------------------------------------------------------------------------
// The shape of a proposal against its field
// ---------------------------------------------------------------------------

type ValueKind = 'quantity' | 'choice' | 'text';

const FIELD_VALUE_KIND: Readonly<Record<FieldDefinition['kind'], ValueKind>> = {
  quantity: 'quantity',
  count: 'quantity',
  enum: 'choice',
  decision: 'choice',
  text: 'text',
};

function valueKinds(proposal: IfcProposal): ValueKind[] {
  return [
    ...(proposal.quantity === undefined ? [] : ['quantity' as const]),
    ...(proposal.choice === undefined ? [] : ['choice' as const]),
    ...(proposal.text === undefined ? [] : ['text' as const]),
  ];
}

function shapeProblem(proposal: IfcProposal, field: FieldDefinition): IfcShapeProblem | undefined {
  const source: unknown = proposal.source;
  if (source !== 'document' && source !== 'ai_inference') return 'source';
  if (!IFC_PROPOSAL_MECHANISMS.includes(proposal.mechanism)) return 'mechanism';
  if (proposal.fieldKey !== field.key) return 'field';
  if (field.kind === 'decision') return 'decision_field';
  const kinds = valueKinds(proposal);
  if (kinds.length !== 1 || kinds[0] !== FIELD_VALUE_KIND[field.kind]) return 'value_kind';
  if (proposal.alternatives !== undefined && proposal.quantity === undefined) return 'value_kind';
  if (proposal.choice !== undefined && field.options !== undefined && !field.options.includes(proposal.choice)) return 'choice_not_listed';
  if (proposal.choice === undefined) {
    const from = proposal.valueFrom;
    if (from === undefined || !Number.isInteger(from.evidenceIndex) || from.evidenceIndex < 0 || from.evidenceIndex >= proposal.evidence.length) return 'value_from';
  }
  if (new Set(proposal.evidence.map((entry) => `${entry.documentId} ${entry.contentHash}`)).size > 1) return 'several_documents';
  return undefined;
}

const CONFIDENCE_ORDER: readonly Confidence[] = ['low', 'medium', 'high'];

function lowerOf(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_ORDER.indexOf(a) <= CONFIDENCE_ORDER.indexOf(b) ? a : b;
}

const PROXY = 'IFCBUILDINGELEMENTPROXY';

// ---------------------------------------------------------------------------
// The verifier
// ---------------------------------------------------------------------------

type LocatorProblem = 'shape' | 'schema' | 'global_id' | 'step_id' | 'path';

/** The outcome of checks 1 to 4 over IFC evidence entries. */
export type IfcEvidenceVerdict =
  | {
      readonly ok: true;
      readonly evidence: readonly IfcEvidence[];
      /** The stored statements of each entry, read, in the entry's order. */
      readonly statements: readonly (readonly StepStatement[])[];
    }
  | { readonly ok: false; readonly check: EvidenceCheckName; readonly evidenceIndex: number; readonly locatorProblem?: LocatorProblem };

/**
 * Rule 1's checks 1 to 4 over IFC evidence entries (the document belongs to the project; the
 * content hash and the schema; the GlobalId, the STEP ids and the path; the excerpt), each over
 * every entry before the next runs. Check 5 is the proposal's (verifyIfcProposal). An asset
 * appearance's evidence passes these four and no fifth: it holds no value.
 */
export function verifyIfcEvidence(entries: readonly ProposedIfcEvidence[], context: IfcEvidenceContext): IfcEvidenceVerdict {
  const failed = (check: EvidenceCheckName, evidenceIndex: number, locatorProblem?: LocatorProblem): IfcEvidenceVerdict => ({
    ok: false,
    check,
    evidenceIndex,
    ...(locatorProblem === undefined ? {} : { locatorProblem }),
  });
  // Check 1 first: another project's document is never read further (rule 13; G13-1).
  for (const [index, entry] of entries.entries()) {
    const record = typeof entry.documentId === 'string' ? context.document(entry.documentId) : undefined;
    if (record === undefined || record.projectId !== context.projectId) return failed('document_in_project', index);
  }
  // Check 2: the content hash is the stored revision's, and the schema the model record's.
  for (const [index, entry] of entries.entries()) {
    const record = context.document(entry.documentId);
    if (record === undefined || entry.contentHash !== record.contentHash) return failed('content_hash_matches', index);
    if (ifcLocatorShapeProblem(entry.ifc) !== undefined) return failed('locator_exists', index, 'shape');
    if (context.modelSchema(entry.documentId, entry.contentHash) !== entry.ifc.schema) return failed('content_hash_matches', index, 'schema');
  }
  // Check 3: the GlobalId, the STEP ids and the path, against the stored statements.
  for (const [index, entry] of entries.entries()) {
    const problem = pathProblem(entry, context);
    if (problem !== undefined) return failed('locator_exists', index, problem);
  }
  // Check 4: the excerpt is the text of those statements (6.2.1: after decoding string escapes, normalised).
  const statements: StepStatement[][] = [];
  for (const [index, entry] of entries.entries()) {
    const texts = entry.ifc.stepIds.map((stepId) => context.statementAt(entry.documentId, entry.contentHash, stepId) ?? '');
    const quoted = normaliseStepExcerpt(texts.join('\n'));
    if (typeof entry.excerpt !== 'string' || quoted === '' || normaliseStepExcerpt(entry.excerpt) !== quoted) return failed('excerpt_at_locator', index);
    statements.push(
      texts.flatMap((text) => {
        const statement = readStepStatement(text);
        return statement === undefined ? [] : [statement];
      }),
    );
  }
  const evidence: IfcEvidence[] = entries.map((entry) => ({
    documentId: entry.documentId,
    contentHash: entry.contentHash,
    locator: {},
    ifc: { schema: entry.ifc.schema, globalId: entry.ifc.globalId, stepIds: [...entry.ifc.stepIds], path: { ...entry.ifc.path } },
    excerpt: entry.excerpt,
    check: 'text_match',
  }));
  return { ok: true, evidence, statements };
}

/** Verifies one IFC proposal with rule 1's five checks over IFC evidence, and decides its source. Pure. */
export function verifyIfcProposal(proposal: IfcProposal, context: IfcProposalContext): IfcProposalVerdict {
  const rejected = (rejection: IfcProposalRejection, type: GuardrailEventType): IfcProposalVerdict => ({
    outcome: 'rejected',
    rejection,
    guardrailEvents: [{ type, projectId: context.projectId, subjectId: proposal.subjectId, fieldKey: proposal.fieldKey, reason: `ifc.${ifcRejectionCode(rejection)}` }],
  });
  const checkFailed = (check: EvidenceCheckName, evidenceIndex: number, locatorProblem?: LocatorProblem): IfcProposalVerdict =>
    rejected({ kind: 'evidence_check_failed', check, evidenceIndex, ...(locatorProblem === undefined ? {} : { locatorProblem }) }, 'evidence_not_found');

  const evidence: unknown = proposal.evidence;
  const entries: readonly ProposedIfcEvidence[] = Array.isArray(evidence) ? (evidence as readonly ProposedIfcEvidence[]) : [];

  // Check 1 first, before anything is read of the proposal: another project's document is never read further.
  for (const [index, entry] of entries.entries()) {
    const record = typeof entry.documentId === 'string' ? context.document(entry.documentId) : undefined;
    if (record === undefined || record.projectId !== context.projectId) return checkFailed('document_in_project', index);
  }
  const shape = shapeProblem(proposal, context.field);
  if (shape !== undefined) return rejected({ kind: 'malformed', problem: shape }, 'ai_output_rejected');
  if (entries.length === 0) return rejected({ kind: 'no_evidence' }, 'evidence_not_found');

  const checked = verifyIfcEvidence(entries, context);
  if (!checked.ok) return checkFailed(checked.check, checked.evidenceIndex, checked.locatorProblem);

  // Code decides the source (2.1; ifc-input 4.1 item 2).
  const direct = DIRECT_MECHANISMS.has(proposal.mechanism) && proposal.choice === undefined;
  if (direct) {
    // Check 5: a value written in the file parses from its literal, or the proposal is refused.
    const from = proposal.valueFrom;
    if (from === undefined) return rejected({ kind: 'malformed', problem: 'value_from' }, 'ai_output_rejected');
    const entry = entries[from.evidenceIndex];
    const statement = checked.statements[from.evidenceIndex]?.[0];
    if (entry === undefined || statement === undefined || !valueInLiteral(proposal, statement, entry.ifc.path, context)) {
      return checkFailed('value_in_excerpt', from.evidenceIndex);
    }
  } else {
    // An interpretation of the file (an IFC class, a term, a relation read as a flag): an inference.
    if (proposal.quantity !== undefined) return rejected({ kind: 'inferred_quantity' }, 'ai_output_rejected');
    if (proposal.mechanism === 'class_mapping' && checked.statements.some((list) => list.some((statement) => statement.entity === PROXY))) {
      return rejected({ kind: 'proxy_class' }, 'ai_output_rejected');
    }
  }
  const source: ProposedSource = direct ? 'document' : 'ai_inference';

  const alternatives =
    source === 'document' && proposal.quantity !== undefined && proposal.alternatives !== undefined && proposal.alternatives.length > 0
      ? [proposal.quantity, ...proposal.alternatives]
      : undefined;
  const confidence: Confidence | undefined =
    source === 'ai_inference' ? lowerOf(proposal.confidence ?? 'low', 'high') : alternatives === undefined ? undefined : 'low';
  const candidate: IfcCandidate = {
    id: context.candidateId,
    subjectId: proposal.subjectId,
    fieldKey: proposal.fieldKey,
    ...(proposal.quantity === undefined ? {} : { quantity: proposal.quantity }),
    ...(proposal.choice === undefined ? {} : { choice: proposal.choice }),
    ...(proposal.text === undefined ? {} : { text: proposal.text }),
    ...(alternatives === undefined ? {} : { alternatives }),
    source,
    evidence: checked.evidence,
    ...(proposal.original === undefined ? {} : { original: proposal.original }),
    ...(confidence === undefined ? {} : { confidence }),
    createdBy: context.createdBy,
    createdAt: context.createdAt,
  };
  return { outcome: 'accepted', candidate, guardrailEvents: [] };
}

/** Rule 1's five checks, as the IFC verifier names them (the same names as the 2.4 verifier's). */
export const IFC_EVIDENCE_CHECKS: readonly EvidenceCheckName[] = EVIDENCE_CHECKS;
