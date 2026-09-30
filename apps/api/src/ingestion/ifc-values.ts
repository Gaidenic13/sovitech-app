/**
 * The API half of the gated IFC value path (prompt 3 section 8, "Output per file", and section
 * 10, phase 2: "The IFC value path behind `ifc-values` and the related gates, with its tests in
 * `tests/proposed/`"; docs/adr/0033-ifc-value-path-api-half.md).
 *
 * It runs only while `ifc-values` reads open, which it never does outside the test-utils override
 * of tests/proposed/ (prompt 3 5.4): its first step is `openIfcValues`, which reads the gate and
 * hands out nothing while it is closed, and it returns before touching the store. Every write it
 * makes goes through packages/db/src/ifc-evidence.ts, which reads the gate again. Until the
 * owner decides D-01, the live app registers an uploaded model stored-only with no reader job
 * (PRD R-023 and R-024, "Until decided"; the orchestrator's ruling of the phase 2 fix round), so
 * even a reader output never reaches this module outside the tests.
 *
 * What an open gate leads to, per model (ifc-input 4.1, 4.2):
 * 1. The statements the reader quoted are stored as the model's extracted text, keyed by project
 *    id and content hash (`ifc:step:#<id>`), with an index from each GlobalId to the statement
 *    that carries it (`ifc:globalid:<GlobalId>`): the verifier reads these, never the model file,
 *    which only the sandbox opens (prompt 3 section 8). The erasure removes them (rule 13).
 * 2. Subjects: the project's building for the IfcBuilding; a level per storey and a zone per
 *    space or zone, per model (no storey or space is matched across models: the `ifc-identity`
 *    gate; with it open, a model declared a revision of another keeps the other's subject for the
 *    same GlobalId, ifc-input 6.2.4); an asset appearance per element that an opened proposal
 *    names as equipment, joined to the asset of its tag only when a tag-source proposal opened
 *    (`ifc-identity`; one tag, one asset: 2.5), else untagged, listed as a possible duplicate and
 *    never counted (2.5; `ifc-untagged-count`). The containing storey or space of each element is
 *    kept in the element register. Storeys are never floors: no candidate on the floor count
 *    comes from a model (prompt 3 section 8, "Storeys are not floors").
 * 3. Candidates from the opened proposals, each checked against the gates of its mechanism again
 *    (the contract's x-mechanism-rules), built from the facts' STEP tokens (the API reads the
 *    numbers, through the rule 8 parser; a unit the registry does not hold gives no quantity:
 *    `ifc-units`; a value with no declared unit, such as an IfcReal, gives none), verified by the
 *    domain's IFC verifier (rule 1's five checks over the IFC locator of ifc-input 6.2.1), and
 *    stored with their IFC evidence. Values written in the file are `document`; interpretations
 *    are `ai_inference`, capped; nothing is `calculated` here (sums, counts and conversions are
 *    the engine's, phase 5; shapes are `ifc-geometry`, 6.2.7, and no geometry is read). Hidden
 *    content gives nothing (rule 14; `ifc-hidden-content`: no release action exists).
 * 4. Every refusal is a guardrail event with a code (section 8) and a row of the engineer's
 *    refused-values list, with the element's GlobalId and STEP ids: never text (rule 13).
 */
import {
  appendGuardrailEvent,
  assertIfcValuesOpen,
  createSubject,
  ensureBuildingSubject,
  insertIfcCandidate,
  newId,
  readDocumentFindings,
  readDocumentTexts,
  readIfcElements,
  readModelRecords,
  readProjectDocuments,
  recordIfcAppearance,
  recordIfcElement,
  recordIfcValueRefusal,
  storeDocumentTexts,
  type IfcElementKind,
  type Request,
  type TextPart,
} from '@sovitech/db';
import {
  decodeStepString,
  ifcRejectionCode,
  readStepStatement,
  stepLiteral,
  verifyIfcEvidence,
  verifyIfcProposal,
  type DocumentRecord,
  type FieldDefinition,
  type GuardrailEvent,
  type IfcEvidenceContext,
  type IfcProposal,
  type IfcProposalMechanism,
  type ProposedIfcEvidence,
  type Quantity,
  type SubjectKind,
} from '@sovitech/domain';
import {
  gatesOf,
  openIfcValues,
  type DeclaredUnit,
  type ExtractionOutputView,
  type IfcCandidateProposal,
  type IfcFact,
  type WithheldProposal,
} from '@sovitech/extraction-contract';
import { FIELD, parseNumber, parseQuantityText, type UnitCheckedField } from '@sovitech/registry';
import { readGate, type GateSource } from '@sovitech/registry/gates';
import { readQuantities } from './quantities';

/** The extracted-text part of a stored STEP statement. */
export function statementPart(stepId: number | string): string {
  return `ifc:step:#${String(stepId)}`;
}

/** The extracted-text part that names the statement carrying a GlobalId. */
export function globalIdPart(globalId: string): string {
  return `ifc:globalid:${globalId}`;
}

/** A field key as the engineer's refused-values list stores it (migration 0013). */
const FIELD_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/u;

/** The prefix every part of the gated path starts with (for the tests' "no row" checks). */
export const IFC_VALUE_PARTS = ['ifc:step:', 'ifc:globalid:'] as const;

// ---------------------------------------------------------------------------
// Numbers and units, as the API reads them (prompt 3 section 6: the extractor never parses numbers)
// ---------------------------------------------------------------------------

const STEP_NUMBER = /^([+-]?)([0-9]+)(?:\.([0-9]*))?(?:[Ee]([+-]?)([0-9]{1,3}))?$/u;

/**
 * A STEP real or integer token (ISO 10303-21: '.' is the decimal mark, an exponent may follow)
 * as a plain decimal text, by moving the decimal point: '430000.' is '430000', '1.5E3' is
 * '1500', '2.50' is '2.5'. Undefined for anything else. No text is read as a number here.
 */
export function stepNumberText(token: string): string | undefined {
  const match = STEP_NUMBER.exec(token);
  if (match === null) return undefined;
  const [, sign = '', whole = '', fraction = '', exponentSign = '', exponentDigits] = match;
  const digits = `${whole}${fraction}`;
  let point = whole.length;
  if (exponentDigits !== undefined) {
    const exponent = parseNumber(exponentDigits);
    const [reading] = exponent.ok ? exponent.readings : [];
    if (reading === undefined || exponent.ok === false || exponent.readings.length !== 1) return undefined;
    point = exponentSign === '-' ? point - reading.value : point + reading.value;
  }
  const padded = point <= 0 ? `${'0'.repeat(1 - point)}${digits}` : point > digits.length ? `${digits}${'0'.repeat(point - digits.length)}` : digits;
  const at = point <= 0 ? 1 : point;
  const integer = padded.slice(0, at).replace(/^0+(?=[0-9])/u, '');
  const part = padded.slice(at).replace(/0+$/u, '');
  const body = part === '' ? integer : `${integer}.${part}`;
  return sign === '-' && /[1-9]/u.test(body) ? `-${body}` : body;
}

/** A STEP number token read through the rule 8 parser, with the '.' decimal mark STEP fixes: one reading, or none. */
export function readStepNumber(token: string): number | undefined {
  const text = stepNumberText(token);
  if (text === undefined) return undefined;
  const parsed = parseNumber(text, { locale: 'en' });
  if (!parsed.ok || parsed.readings.length !== 1) return undefined;
  return parsed.readings[0]?.value;
}

/**
 * The registry unit (2.7) of a unit the file declares: SI units whose name and prefix name one
 * registry entry exactly. Anything else maps to none, so its value gives no quantity (ifc-input
 * 4.1 item 4): m³/s and J are not in the registry (GAP-J), kelvin is absolute, not a difference,
 * and a conversion-based, derived or context-dependent unit is not read (6.2.11, `ifc-units`).
 */
const SI_UNITS: ReadonlyMap<string, string> = new Map([
  ['LENGTHUNIT METRE', 'm'],
  ['LENGTHUNIT MILLI METRE', 'mm'],
  ['AREAUNIT SQUARE_METRE', 'm2'],
  ['VOLUMEUNIT CUBIC_METRE', 'm3'],
  ['POWERUNIT WATT', 'W'],
  ['POWERUNIT KILO WATT', 'kW'],
  ['POWERUNIT MEGA WATT', 'MW'],
  ['THERMODYNAMICTEMPERATUREUNIT DEGREE_CELSIUS', 'degC'],
  ['PRESSUREUNIT PASCAL', 'Pa'],
  ['PRESSUREUNIT KILO PASCAL', 'kPa'],
  ['ELECTRICCURRENTUNIT AMPERE', 'A'],
  ['ELECTRICCURRENTUNIT MILLI AMPERE', 'mA'],
  ['ELECTRICVOLTAGEUNIT VOLT', 'V'],
  ['FREQUENCYUNIT HERTZ', 'Hz'],
  ['ENERGYUNIT GIGA JOULE', 'GJ'],
  ['ILLUMINANCEUNIT LUX', 'lx'],
]);

export function registryUnitOf(declared: DeclaredUnit): string | undefined {
  if (declared.unitKind !== 'si') return undefined;
  return SI_UNITS.get([declared.unitType, ...(declared.prefix === undefined ? [] : [declared.prefix]), declared.name].join(' '));
}

/** ifc-input 4.2's IFC area bases (6.2.6, proposed; `ifc-areas`), by the quantity that holds the area. */
const IFC_AREA_BASES: ReadonlyMap<string, string> = new Map([
  ['NetFloorArea', 'ifc_net_floor_area'],
  ['GrossFloorArea', 'ifc_gross_floor_area'],
]);

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

export type IfcProposalOutcome =
  | { readonly proposalId: string; readonly fieldKey: string; readonly outcome: 'stored'; readonly candidateId: string; readonly source: 'document' | 'ai_inference' }
  /** A relation kept in the element register (the containing storey or space), not a candidate. */
  | { readonly proposalId: string; readonly fieldKey: string; readonly outcome: 'registered' }
  | { readonly proposalId: string; readonly fieldKey: string; readonly outcome: 'refused'; readonly code: string };

export interface IfcLinkedElement {
  readonly globalId: string;
  readonly kind: IfcElementKind;
  readonly subjectId?: string;
  readonly appearanceId?: string;
  readonly assetId?: string;
}

export type IfcValuesReport =
  | { readonly open: false; readonly reason: 'gate_closed' | 'absent' | 'not_this_model' }
  | { readonly open: true; readonly reason: 'already_read'; readonly documentId: string }
  | {
      readonly open: true;
      readonly documentId: string;
      readonly statementParts: number;
      readonly elements: readonly IfcLinkedElement[];
      readonly outcomes: readonly IfcProposalOutcome[];
      /** The proposals the gates of their mechanism hold back, with those gates. */
      readonly withheld: readonly WithheldProposal[];
    };

// ---------------------------------------------------------------------------
// The path
// ---------------------------------------------------------------------------

type FieldLookup = (key: string) => (FieldDefinition & UnitCheckedField) | undefined;

const SPATIAL: ReadonlyMap<string, Exclude<IfcElementKind, 'element'>> = new Map([
  ['IFCBUILDING', 'building'],
  ['IFCBUILDINGSTOREY', 'storey'],
  ['IFCSPACE', 'space'],
  ['IFCZONE', 'zone'],
  ['IFCSPATIALZONE', 'zone'],
]);

const SUBJECT_OF_KIND: Readonly<Record<Exclude<IfcElementKind, 'building' | 'element'>, SubjectKind>> = {
  storey: 'level',
  space: 'zone',
  zone: 'zone',
};

const CONTAINERS: ReadonlySet<string> = new Set(['aggregates', 'contained_in_spatial_structure']);

/** One statement as the reader quoted it: its STEP id, its entity, and the GlobalId it carries, if any. */
interface QuotedStatement {
  readonly stepId: number;
  readonly entity: string;
  readonly globalId?: string;
  readonly text: string;
}

/** The statements the facts quote, each once, keyed by STEP id; a fact whose excerpt is not its statements quotes none. */
function quotedStatements(facts: readonly IfcFact[]): Map<number, QuotedStatement> {
  const statements = new Map<number, QuotedStatement>();
  for (const fact of facts) {
    const lines = fact.excerpt.split('\n');
    if (lines.length !== fact.locator.stepIds.length) continue;
    for (const [index, line] of lines.entries()) {
      const stepId = fact.locator.stepIds[index];
      // Each statement is read once, however many facts quote it (a relation's line is quoted by every element it relates).
      if (stepId === undefined || statements.has(stepId)) continue;
      const statement = readStepStatement(line);
      if (statement === undefined || statement.stepId !== String(stepId)) continue;
      const first = decodeStepString(statement.args[0] ?? '');
      const globalId = first !== undefined && /^[0-9A-Za-z_$]{22}$/u.test(first) ? first : undefined;
      statements.set(stepId, { stepId, entity: statement.entity, text: line, ...(globalId === undefined ? {} : { globalId }) });
    }
  }
  return statements;
}

/** The fact's evidence entry, as proposed (its own locator and verbatim statements). */
function evidenceOfFact(documentId: string, fact: IfcFact): ProposedIfcEvidence {
  const path = fact.locator.path;
  return {
    documentId,
    contentHash: fact.locator.contentHash,
    ifc: { schema: fact.locator.schema, globalId: fact.locator.globalId, stepIds: [...fact.locator.stepIds], path: { ...path } },
    excerpt: fact.excerpt,
  };
}

/** What a fact's value becomes on a field, or the code of why it becomes nothing. */
type FactValue =
  | { readonly ok: true; readonly quantity?: Quantity; readonly alternatives?: readonly Quantity[]; readonly text?: string; readonly original?: string }
  | { readonly ok: false; readonly code: string };

function factValue(fact: IfcFact, field: FieldDefinition, gates: GateSource, mechanism: IfcProposalMechanism): FactValue {
  const value = fact.value;
  const quantityField = field.kind === 'quantity' || field.kind === 'count';
  if (value.kind === 'string') {
    if (field.kind === 'text') return { ok: true, text: value.text, original: value.text };
    if (!quantityField) return { ok: false, code: 'value_kind' };
    // A rating written as text (an IfcLabel "1.500 kW"): the rule 8 parser, both readings of an ambiguous number kept.
    const parsed = parseQuantityText(value.text);
    if (!parsed.ok) return { ok: false, code: parsed.reason === 'no_unit' ? 'unit_undeclared' : parsed.reason === 'unit_unknown' ? 'unit_unmapped' : 'text_not_a_quantity' };
    const [first, ...rest] = parsed.readings.map((reading): Quantity => ({ value: reading.value, unit: reading.unit, ...(parsed.approximate ? { approximate: true } : {}) }));
    if (first === undefined) return { ok: false, code: 'text_not_a_quantity' };
    return { ok: true, quantity: first, ...(rest.length === 0 ? {} : { alternatives: rest }), original: value.text };
  }
  if (value.kind !== 'real' && value.kind !== 'integer') return { ok: false, code: value.kind === 'reference' ? 'relation_value' : 'value_kind' };
  if (!quantityField) return { ok: false, code: 'value_kind' };
  const number = readStepNumber(value.token);
  if (number === undefined) return { ok: false, code: 'number_unreadable' };
  const declared = fact.declaredUnit;
  let unit: string | undefined;
  if (declared !== undefined) {
    unit = registryUnitOf(declared);
    // ifc-input 6.2.11 (`ifc-units`) would convert a declared unit the registry lacks by calculation (the engine's, phase 5).
    if (unit === undefined) return { ok: false, code: readGate(gates, 'ifc-units').open ? 'unit_conversion_not_built' : 'unit_unmapped' };
  } else if (field.kind === 'count' && value.kind === 'integer') {
    unit = 'count';
  } else {
    // An IfcReal, IfcLabel or IfcCountMeasure declares no unit: no quantity for a dimensioned field (2.7; ifc-input 4.1 item 4).
    return { ok: false, code: 'unit_undeclared' };
  }
  const path = fact.locator.path;
  const basis = mechanism === 'quantity_set_area' && path.kind === 'quantity' ? IFC_AREA_BASES.get(path.quantity) : undefined;
  const qualifier = basis !== undefined && readGate(gates, 'ifc-areas').open && field.qualifiers?.includes(basis) === true ? basis : undefined;
  return { ok: true, quantity: { value: number, unit, ...(qualifier === undefined ? {} : { qualifier }) }, original: value.token };
}

/**
 * What the IFC verifier reads for one model, from the store: the project's documents, the schema
 * of the model's record, and the statements the value path stored as the model's extracted text
 * (never the model file: prompt 3 section 8). Read in the request, so only the project in scope.
 */
export async function ifcEvidenceContext(request: Request, document: DocumentRecord): Promise<IfcEvidenceContext> {
  const stored = new Map((await readDocumentTexts(request, document.contentHash, 'ifc:')).map((part) => [part.part, part.text]));
  const { documents } = await readProjectDocuments(request);
  const byId = new Map(documents.map((record) => [record.id, record]));
  const schema = (await readModelRecords(request, document.id)).find((record) => record.contentHash === document.contentHash)?.ifcSchema;
  const thisModel = (documentId: string, contentHash: string): boolean => documentId === document.id && contentHash === document.contentHash;
  return {
    projectId: document.projectId,
    document: (documentId) => byId.get(documentId),
    modelSchema: (documentId, contentHash) => (thisModel(documentId, contentHash) ? schema : undefined),
    statementAt: (documentId, contentHash, stepId) => (thisModel(documentId, contentHash) ? stored.get(statementPart(stepId)) : undefined),
    elementStep: (documentId, contentHash, globalId) => {
      const reference = thisModel(documentId, contentHash) ? stored.get(globalIdPart(globalId)) : undefined;
      return reference === undefined || !/^#[0-9]{1,12}$/u.test(reference) ? undefined : readStepNumber(reference.slice(1));
    },
  };
}

/** Where a refused value sits, for the engineer's list (ids only). */
export interface IfcRefusalPlace {
  readonly documentId: string;
  readonly contentHash: string;
  readonly proposalId: string;
  readonly globalId: string;
  readonly stepIds: readonly number[];
}

/**
 * One IFC proposal through the domain's IFC verifier and the gated store, with the guardrail
 * events of a refusal (codes only) and, when `refusal` says where the value sits, a row of the
 * engineer's refused-values list. Only while `ifc-values` reads open (the store throws otherwise).
 */
export async function ingestIfcProposal(
  request: Request,
  input: {
    readonly gates: GateSource;
    readonly serviceId: string;
    readonly context: IfcEvidenceContext;
    readonly field: FieldDefinition & UnitCheckedField;
    readonly proposal: IfcProposal;
    readonly refusal?: IfcRefusalPlace;
  },
): Promise<{ readonly outcome: 'stored'; readonly candidateId: string; readonly source: 'document' | 'ai_inference' } | { readonly outcome: 'refused'; readonly code: string }> {
  const { gates, serviceId, proposal, field } = input;
  assertIfcValuesOpen(gates);
  const refused = async (code: string, events: readonly GuardrailEvent[]): Promise<{ readonly outcome: 'refused'; readonly code: string }> => {
    for (const event of events) {
      await appendGuardrailEvent(request, {
        type: event.type,
        subjectId: proposal.subjectId,
        ...(event.fieldKey === undefined ? {} : { fieldKey: event.fieldKey }),
        ...(event.reason === undefined ? {} : { reason: event.reason }),
        actor: serviceId,
      });
    }
    if (input.refusal !== undefined && FIELD_KEY.test(proposal.fieldKey)) {
      await recordIfcValueRefusal(request, gates, { ...input.refusal, fieldKey: proposal.fieldKey, code, createdBy: serviceId });
    }
    return { outcome: 'refused', code };
  };
  const verdict = verifyIfcProposal(proposal, {
    ...input.context,
    field,
    readQuantities,
    readStepNumber,
    candidateId: newId(),
    createdBy: serviceId,
    createdAt: new Date().toISOString(),
  });
  if (verdict.outcome === 'rejected') return refused(ifcRejectionCode(verdict.rejection), verdict.guardrailEvents);
  const written = await insertIfcCandidate(request, gates, verdict.candidate, field);
  if (written.outcome === 'stored') {
    return { outcome: 'stored', candidateId: written.candidate.id, source: verdict.candidate.source === 'document' ? 'document' : 'ai_inference' };
  }
  if (written.outcome === 'rejected') return { outcome: 'refused', code: `ifc.${written.refusal}` };
  const code = `unit_${written.refusal}`;
  return refused(code, [{ type: 'ai_output_rejected', projectId: input.context.projectId, fieldKey: proposal.fieldKey, reason: `ifc.${code}` }]);
}

/**
 * Stores what an open `ifc-values` gate lets through from one model's output, in the extraction
 * service account's request (the system: 2.1). Returns before it touches the store while the
 * gate reads closed. A model already read is not read again.
 */
export async function storeIfcValues(
  request: Request,
  input: {
    readonly document: DocumentRecord;
    readonly output: ExtractionOutputView;
    readonly serviceId: string;
    readonly gates: GateSource;
    readonly field: FieldLookup;
  },
): Promise<IfcValuesReport> {
  const { document, output, serviceId, gates } = input;
  const reading = openIfcValues(output.ifcValues, gates);
  if (!reading.open) return { open: false, reason: reading.reason };
  assertIfcValuesOpen(gates);
  if (output.format !== 'ifc' || output.job.documentId !== document.id || output.job.contentHash !== document.contentHash) {
    return { open: false, reason: 'not_this_model' };
  }
  if ((await readIfcElements(request, document.id)).length > 0) return { open: true, reason: 'already_read', documentId: document.id };

  const facts = reading.facts.filter((fact) => fact.locator.contentHash === document.contentHash);
  const factById = new Map(facts.map((fact) => [fact.id, fact]));

  // 1. The quoted statements, as the model's extracted text, and the GlobalId index.
  const statements = quotedStatements(facts);
  const existing = new Set((await readDocumentTexts(request, document.contentHash, 'ifc:')).map((part) => part.part));
  const byGlobalId = new Map<string, QuotedStatement>();
  for (const statement of statements.values()) {
    if (statement.globalId !== undefined && !byGlobalId.has(statement.globalId)) byGlobalId.set(statement.globalId, statement);
  }
  const parts: TextPart[] = [
    ...[...statements.values()].map((statement) => ({ part: statementPart(statement.stepId), text: statement.text })),
    ...[...byGlobalId.entries()].map(([globalId, statement]) => ({ part: globalIdPart(globalId), text: `#${String(statement.stepId)}` })),
  ].filter((part) => !existing.has(part.part));
  await storeDocumentTexts(request, { contentHash: document.contentHash, parts, createdBy: serviceId });

  // What the verifier reads: the stored text of this revision, and the schema of its model record.
  const evidenceContext = await ifcEvidenceContext(request, document);
  const { events } = await readProjectDocuments(request);

  const outcomes: IfcProposalOutcome[] = [];
  const linked: IfcLinkedElement[] = [];
  const refuse = async (proposal: IfcCandidateProposal, code: string, subjectId: string | undefined, verdictEvents: readonly GuardrailEvent[] = []): Promise<void> => {
    const logged = verdictEvents.length > 0 ? verdictEvents : [{ type: 'ai_output_rejected' as const, projectId: document.projectId, fieldKey: proposal.fieldKey, reason: `ifc.${code}` }];
    for (const event of logged) {
      await appendGuardrailEvent(request, {
        type: event.type,
        ...(subjectId === undefined ? {} : { subjectId }),
        ...(event.fieldKey === undefined ? {} : { fieldKey: event.fieldKey }),
        ...(event.reason === undefined ? {} : { reason: event.reason }),
        actor: serviceId,
      });
    }
    const valueFact = proposal.value.kind === 'fact' ? factById.get(proposal.value.factId) : undefined;
    const fact = valueFact ?? proposal.evidenceFactIds.map((id) => factById.get(id)).find((found) => found !== undefined);
    if (fact !== undefined && FIELD_KEY.test(proposal.fieldKey)) {
      await recordIfcValueRefusal(request, gates, {
        documentId: document.id,
        contentHash: document.contentHash,
        proposalId: proposal.id,
        globalId: proposal.subject.elementGlobalId,
        fieldKey: proposal.fieldKey,
        stepIds: fact.locator.stepIds,
        code,
        createdBy: serviceId,
      });
    }
    outcomes.push({ proposalId: proposal.id, fieldKey: proposal.fieldKey, outcome: 'refused', code });
  };

  // 2. Subjects: the building, a level per storey, a zone per space or zone (per model), and the element register.
  const hidden = new Set(
    (await readDocumentFindings(request, document.id))
      .filter((finding) => finding.kind === 'hidden_content')
      .flatMap((finding) => (typeof finding.locator['globalId'] === 'string' ? [finding.locator['globalId']] : [])),
  );
  const identityOpen = readGate(gates, 'ifc-identity').open;
  const revised = new Set(events.filter((event) => event.type === 'declared_revision_of' && event.documentId === document.id).flatMap((event) => (event.revisionOf === undefined ? [] : [event.revisionOf])));
  // The earlier revision's subjects, by kind and GlobalId (ifc-identity: a declared revision chain only, ifc-input 6.2.4).
  const earlier = new Map<string, string>();
  if (identityOpen && revised.size > 0) {
    for (const element of await readIfcElements(request)) {
      if (!revised.has(element.documentId) || element.subjectId === undefined) continue;
      const key = `${element.kind} ${element.appearanceId === undefined ? 'subject' : 'appearance'} ${element.globalId}`;
      if (!earlier.has(key)) earlier.set(key, element.subjectId);
    }
  }
  // One pass over the facts: each element's containing storey or space, and its first own attribute.
  const containers = new Map<string, { readonly globalId: string; readonly stepId: number }>();
  const ownAttribute = new Map<string, IfcFact>();
  for (const fact of facts) {
    const path = fact.locator.path;
    const [stepId] = fact.locator.stepIds;
    if (path.kind === 'relation' && CONTAINERS.has(path.relation) && stepId !== undefined && !containers.has(fact.locator.globalId)) {
      containers.set(fact.locator.globalId, { globalId: path.relatedGlobalId, stepId });
    }
    if (path.kind === 'attribute' && path.through === 'occurrence' && !ownAttribute.has(fact.locator.globalId)) ownAttribute.set(fact.locator.globalId, fact);
  }
  const containerOf = (globalId: string): { readonly globalId: string; readonly stepId: number } | undefined => containers.get(globalId);
  const subjectOfElement = new Map<string, { readonly subjectId: string; readonly kind: SubjectKind }>();
  let buildingSubject: string | undefined;
  for (const [globalId, statement] of byGlobalId) {
    const kind = SPATIAL.get(statement.entity);
    if (kind === undefined || hidden.has(globalId)) continue;
    let subjectId: string;
    if (kind === 'building') {
      buildingSubject ??= await ensureBuildingSubject(request, serviceId);
      subjectId = buildingSubject;
    } else {
      const reused = earlier.get(`${kind} subject ${globalId}`);
      subjectId = reused ?? (await createSubject(request, { kind: SUBJECT_OF_KIND[kind] as Exclude<SubjectKind, 'project'>, createdBy: serviceId })).id;
    }
    const container = containerOf(globalId);
    await recordIfcElement(request, gates, {
      documentId: document.id,
      contentHash: document.contentHash,
      globalId,
      stepId: statement.stepId,
      ifcClass: statement.entity,
      kind,
      subjectId,
      ...(container === undefined ? {} : { container }),
      createdBy: serviceId,
    });
    subjectOfElement.set(globalId, { subjectId, kind: kind === 'building' ? 'building' : SUBJECT_OF_KIND[kind] });
    linked.push({ globalId, kind, subjectId });
  }

  // Asset appearances: one per element an opened proposal names as equipment; tagged only by an opened tag-source proposal.
  const proposals = reading.candidateProposals;
  const equipment = [...new Set(proposals.filter((proposal) => proposal.subject.kind === 'asset').map((proposal) => proposal.subject.elementGlobalId))];
  const tagFactOf = new Map<string, IfcFact>();
  for (const proposal of proposals) {
    const fact = proposal.mechanism === 'tag_source' && proposal.value.kind === 'fact' ? factById.get(proposal.value.factId) : undefined;
    if (fact !== undefined && !tagFactOf.has(proposal.subject.elementGlobalId)) tagFactOf.set(proposal.subject.elementGlobalId, fact);
  }
  for (const globalId of equipment) {
    const statement = byGlobalId.get(globalId);
    if (statement === undefined || hidden.has(globalId) || SPATIAL.has(statement.entity)) continue;
    const tagFact = tagFactOf.get(globalId);
    const shown = tagFact ?? ownAttribute.get(globalId);
    if (shown === undefined) continue;
    const checked = verifyIfcEvidence([evidenceOfFact(document.id, shown)], evidenceContext);
    if (!checked.ok) continue;
    // The tag as the verified statement writes it (the Tag attribute's literal), never the proposal's claim.
    const tagStatement = checked.statements[0]?.[0];
    const tagLiteral = tagFact === undefined || tagStatement === undefined ? undefined : tagStatement.args[7];
    const tag = tagLiteral === undefined ? undefined : decodeStepString(stepLiteral(tagLiteral).token);
    const appearance = await recordIfcAppearance(request, gates, { ...(tag === undefined ? {} : { tagAsWritten: tag }), evidence: checked.evidence, createdBy: serviceId });
    const container = containerOf(globalId);
    await recordIfcElement(request, gates, {
      documentId: document.id,
      contentHash: document.contentHash,
      globalId,
      stepId: statement.stepId,
      ifcClass: statement.entity,
      kind: 'element',
      appearanceId: appearance.appearanceId,
      ...(appearance.assetId === null ? {} : { subjectId: appearance.assetId }),
      ...(container === undefined ? {} : { container }),
      createdBy: serviceId,
    });
    if (appearance.assetId !== null) subjectOfElement.set(globalId, { subjectId: appearance.assetId, kind: 'asset' });
    linked.push({ globalId, kind: 'element', appearanceId: appearance.appearanceId, ...(appearance.assetId === null ? {} : { subjectId: appearance.assetId, assetId: appearance.assetId }) });
  }

  // Metering points: a subject per element, per model (as levels and zones).
  for (const proposal of proposals.filter((item) => item.subject.kind === 'metering_point')) {
    const globalId = proposal.subject.elementGlobalId;
    const statement = byGlobalId.get(globalId);
    if (statement === undefined || hidden.has(globalId) || subjectOfElement.has(globalId)) continue;
    const reused = earlier.get(`element subject ${globalId}`);
    const subjectId = reused ?? (await createSubject(request, { kind: 'metering_point', createdBy: serviceId })).id;
    await recordIfcElement(request, gates, { documentId: document.id, contentHash: document.contentHash, globalId, stepId: statement.stepId, ifcClass: statement.entity, kind: 'element', subjectId, createdBy: serviceId });
    subjectOfElement.set(globalId, { subjectId, kind: 'metering_point' });
    linked.push({ globalId, kind: 'element', subjectId });
  }

  // 3. Candidates from the opened proposals.
  const registered = new Set(linked.map((element) => element.globalId));
  for (const proposal of proposals) {
    const closed = gatesOf(proposal).filter((gate) => !readGate(gates, gate).open);
    if (closed.length > 0) {
      await refuse(proposal, `gate_closed.${closed.map((gate) => gate.replace(/-/gu, '_')).join('.')}`, undefined);
      continue;
    }
    if (proposal.mechanism === 'geometry' || proposal.sourceClaim === 'calculated') {
      await refuse(proposal, 'geometry_not_built', undefined);
      continue;
    }
    // Prompt 3 section 8, "Storeys are not floors": no floor count comes from a model.
    if (proposal.fieldKey === FIELD.floors) {
      await refuse(proposal, 'storey_count_not_floor_count', undefined);
      continue;
    }
    if (hidden.has(proposal.subject.elementGlobalId)) {
      // Rule 14: hidden content gives no value. `ifc-hidden-content` (6.2.13) would let an engineer's release
      // through; no release action is built, so an open gate changes only the code the refusal carries.
      await refuse(proposal, readGate(gates, 'ifc-hidden-content').open ? 'hidden_content_not_released' : 'hidden_content', undefined);
      continue;
    }
    const field = input.field(proposal.fieldKey);
    if (field === undefined) {
      await refuse(proposal, 'unknown_field', undefined);
      continue;
    }
    const valueFact = proposal.value.kind === 'fact' ? factById.get(proposal.value.factId) : undefined;
    if (valueFact?.locator.path.kind === 'relation' && CONTAINERS.has(valueFact.locator.path.relation) && registered.has(proposal.subject.elementGlobalId)) {
      // A containing storey or space: kept in the element register (with an untagged element too), not a candidate.
      outcomes.push({ proposalId: proposal.id, fieldKey: proposal.fieldKey, outcome: 'registered' });
      continue;
    }
    // ifc-input 4.1 item 7: the project's own fields come from the owner, never from a model.
    if (proposal.subject.kind === 'project') {
      await refuse(proposal, 'project_fields_are_the_owners', undefined);
      continue;
    }
    const subject =
      proposal.subject.kind === 'building'
        ? (buildingSubject ??= await ensureBuildingSubject(request, serviceId))
        : subjectOfElement.get(proposal.subject.elementGlobalId)?.subjectId;
    const subjectKind: SubjectKind | undefined = proposal.subject.kind === 'building' ? 'building' : subjectOfElement.get(proposal.subject.elementGlobalId)?.kind;
    if (subject === undefined || subjectKind === undefined || subjectKind !== proposal.subject.kind) {
      // 2.5: an untagged appearance belongs to no asset, so no value of it is stored.
      await refuse(proposal, 'subject_unresolved', undefined);
      continue;
    }
    if (field.subject !== subjectKind) {
      await refuse(proposal, 'subject_kind', subject);
      continue;
    }
    const evidenceFacts = proposal.evidenceFactIds.map((id) => factById.get(id));
    if (evidenceFacts.some((fact) => fact === undefined) || (proposal.value.kind === 'fact' && valueFact === undefined)) {
      await refuse(proposal, 'fact_missing', subject);
      continue;
    }
    const entries = evidenceFacts.flatMap((fact) => (fact === undefined ? [] : [evidenceOfFact(document.id, fact)]));
    const mechanism = proposal.mechanism as IfcProposalMechanism;
    let domainProposal: IfcProposal;
    if (proposal.value.kind === 'choice') {
      domainProposal = {
        subjectId: subject,
        fieldKey: proposal.fieldKey,
        mechanism,
        source: 'ai_inference',
        choice: proposal.value.choice,
        ...(proposal.confidence === undefined ? {} : { confidence: proposal.confidence }),
        evidence: entries,
      };
    } else {
      if (valueFact === undefined) continue;
      const read = factValue(valueFact, field, gates, mechanism);
      if (!read.ok) {
        await refuse(proposal, read.code, subject);
        continue;
      }
      const evidenceIndex = proposal.evidenceFactIds.indexOf(valueFact.id);
      const withValue = evidenceIndex >= 0 ? entries : [...entries, evidenceOfFact(document.id, valueFact)];
      const literal = 'token' in valueFact.value ? stepLiteral(valueFact.value.ifcType === undefined ? valueFact.value.token : `${valueFact.value.ifcType}(${valueFact.value.token})`) : undefined;
      if (literal === undefined) {
        await refuse(proposal, 'value_kind', subject);
        continue;
      }
      domainProposal = {
        subjectId: subject,
        fieldKey: proposal.fieldKey,
        mechanism,
        source: proposal.sourceClaim === 'ai_inference' ? 'ai_inference' : 'document',
        ...(read.quantity === undefined ? {} : { quantity: read.quantity }),
        ...(read.alternatives === undefined ? {} : { alternatives: read.alternatives }),
        ...(read.text === undefined ? {} : { text: read.text }),
        ...(read.original === undefined ? {} : { original: { text: read.original } }),
        ...(proposal.confidence === undefined ? {} : { confidence: proposal.confidence }),
        evidence: withValue,
        valueFrom: { evidenceIndex: evidenceIndex >= 0 ? evidenceIndex : withValue.length - 1, literal },
      };
    }
    const valueFactForRow = valueFact ?? evidenceFacts.find((fact) => fact !== undefined);
    const outcome = await ingestIfcProposal(request, {
      gates,
      serviceId,
      context: evidenceContext,
      field,
      proposal: domainProposal,
      ...(valueFactForRow === undefined
        ? {}
        : {
            refusal: {
              documentId: document.id,
              contentHash: document.contentHash,
              proposalId: proposal.id,
              globalId: proposal.subject.elementGlobalId,
              stepIds: valueFactForRow.locator.stepIds,
            },
          }),
    });
    outcomes.push({ proposalId: proposal.id, fieldKey: proposal.fieldKey, ...outcome });
  }

  return {
    open: true,
    documentId: document.id,
    statementParts: parts.length,
    elements: linked,
    outcomes,
    withheld: reading.withheld,
  };
}
