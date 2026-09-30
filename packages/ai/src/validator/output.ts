/**
 * The output validator (guardrails section 6, "AI boundary"; prompt 3 section 7: "The
 * output validator checks the schema, value tokens in prose, reserved terms, life-safety
 * verbs, allowed sources and direct counts only (rules 1, 2, 3, 11, 14)"; F-EXTRACT-03,
 * F-EXTRACT-05, F-PROPOSAL-04). It runs on every structured output before anything is
 * stored or shown, in the app and in the eval runner alike (build-readiness 3 item 7).
 *
 * The SDK's parse is not the validator: the output is checked here against the same
 * schema, then item by item. A refused item is dropped with its rules and a guardrail
 * event (section 8: `ai_output_rejected` with its reason, `reserved_term_blocked`); what
 * passes is still only a proposal, which the evidence verifier checks against the stored
 * text before a candidate exists (rule 1; packages/domain verifyProposal). Nothing here
 * decides a source, a confidence or a state: code does that after verification.
 *
 * Rejections and events carry rule codes, field keys and positions, never text (rule 13).
 */
import type { GuardrailEvent } from '@sovitech/domain';
import { locatorKey } from '../blocks';
import type { ExtractionContext, FieldForAi, SentDocument } from '../context';
import {
  DraftingOutputSchema,
  ExtractionOutputSchema,
  type AiCandidate,
  type AiFinding,
  type AiNote,
  type AiNotFound,
  type DraftingOutput,
  type ExtractionOutput,
} from '../schema';
import { identifiersNotInCatalogue, type ProductCatalogue } from './products';
import { proseIssues, type ProseContext, type ProseIssue, type ProseRule } from './prose';
import type { Span } from './text';

/** Why an item was refused, beyond the prose rules. */
export const ITEM_RULES = [
  'schema',
  'field_not_requested',
  'decision_field',
  'subject_kind_mismatch',
  'subject_outside_request',
  'value_kind_mismatch',
  'choice_not_in_options',
  'qualifier_not_registered',
  'unit_not_registered',
  'not_a_finite_number',
  'no_evidence',
  'evidence_outside_request',
  'evidence_in_hidden_text',
  'empty_excerpt',
  'inference_on_document',
  'inference_kind_missing',
  'inference_kind_mismatch',
  'confidence_missing',
  'inferred_quantity_not_direct_count',
  'product_not_in_catalogue',
  'nothing_searched',
  'searched_outside_request',
  'not_found_with_candidate',
  'finding_outside_request',
  'location_outside_request',
  'slot_not_requested',
  'slot_twice',
] as const;
export type ItemRule = (typeof ITEM_RULES)[number];
export type RejectionRule = ItemRule | ProseRule;

/** Which part of the output an issue belongs to. */
export type OutputItem =
  | { readonly kind: 'output' }
  | { readonly kind: 'candidate'; readonly index: number; readonly fieldKey: string }
  | { readonly kind: 'not_found'; readonly index: number; readonly fieldKey: string }
  | { readonly kind: 'missing_field_key'; readonly index: number; readonly fieldKey: string }
  | { readonly kind: 'finding'; readonly index: number }
  | { readonly kind: 'note'; readonly index: number }
  | { readonly kind: 'paragraph'; readonly index: number; readonly slot: string };

export interface Rejection {
  readonly item: OutputItem;
  /** Each rule the item broke, once, in the order the checks ran. */
  readonly rules: readonly RejectionRule[];
  /** Where in the item's text a prose rule fired (positions only). */
  readonly positions?: readonly (Span & { readonly rule: ProseRule })[];
  /** For `schema`: the paths of the schema issues, never the values. */
  readonly schemaPaths?: readonly string[];
}

/** An item for the engineer queue (F-EXTRACT-05: "a flag for the engineer queue on unknown catalogue identifiers"). */
export interface EngineerFlag {
  readonly kind: 'catalogue_identifier_not_in_catalogue';
  readonly fieldKey: string;
  readonly subject: AiCandidate['subject'];
  /** Where the documents show it, as locations only. */
  readonly locations: readonly { readonly documentId: string; readonly locator: AiCandidate['evidence'][number]['locator'] }[];
}

export interface ExtractionValidation {
  /** The output as the schema read it; undefined when it failed the schema. */
  readonly output: ExtractionOutput | undefined;
  readonly accepted: {
    readonly candidates: readonly AiCandidate[];
    readonly notFound: readonly AiNotFound[];
    readonly missingFieldKeys: readonly string[];
    readonly findings: readonly AiFinding[];
    readonly notes: readonly AiNote[];
  };
  readonly rejections: readonly Rejection[];
  readonly engineerFlags: readonly EngineerFlag[];
  readonly guardrailEvents: readonly GuardrailEvent[];
}

export interface DraftingValidation {
  readonly output: DraftingOutput | undefined;
  readonly accepted: { readonly paragraphs: readonly DraftingOutput['paragraphs'][number][]; readonly notes: readonly AiNote[] };
  readonly rejections: readonly Rejection[];
  readonly guardrailEvents: readonly GuardrailEvent[];
}

/** What the extraction validator reads besides the output. */
export interface ExtractionValidationContext {
  readonly projectId: string;
  readonly fields: ExtractionContext['fields'];
  readonly documents: ExtractionContext['documents'];
  readonly units: ExtractionContext['units'];
  /** Document names the request carried. */
  readonly names: readonly string[];
  readonly catalogue?: ProductCatalogue;
  readonly standardIdentifiers?: readonly string[];
}

export interface DraftingValidationContext {
  readonly projectId: string;
  readonly slots: ReadonlySet<string>;
  readonly tokens: ReadonlySet<string>;
  readonly names: readonly string[];
  /** Documents the request carried, for note locations (none in a drafting request today). */
  readonly documents?: ReadonlyMap<string, SentDocument>;
  readonly catalogue?: ProductCatalogue;
  readonly standardIdentifiers?: readonly string[];
}

/** Collects the rules of one item, each once. */
class Rules {
  readonly rules: RejectionRule[] = [];
  readonly positions: (Span & { rule: ProseRule })[] = [];

  add(rule: RejectionRule): void {
    if (!this.rules.includes(rule)) this.rules.push(rule);
  }

  prose(issues: readonly ProseIssue[]): void {
    for (const issue of issues) {
      this.add(issue.rule);
      this.positions.push({ rule: issue.rule, index: issue.index, length: issue.length });
    }
  }

  get failed(): boolean {
    return this.rules.length > 0;
  }

  rejection(item: OutputItem): Rejection {
    return this.positions.length > 0 ? { item, rules: this.rules, positions: this.positions } : { item, rules: this.rules };
  }
}

function eventsFor(projectId: string, rejection: Rejection): GuardrailEvent[] {
  const fieldKey = 'fieldKey' in rejection.item ? rejection.item.fieldKey : undefined;
  const base = fieldKey === undefined ? { projectId } : { projectId, fieldKey };
  // One event per rule, its reason the rule's code: the store takes a reason as one code
  // (`^[a-z0-9][a-z0-9_.:-]{0,127}$`, migration 0005), which rules joined by "+" never were.
  const events: GuardrailEvent[] = rejection.rules.map((rule): GuardrailEvent => ({ type: 'ai_output_rejected', ...base, reason: rule }));
  if (rejection.rules.includes('reserved_term')) events.push({ type: 'reserved_term_blocked', ...base, reason: 'reserved_term' });
  return events;
}

function schemaRejection(issues: readonly { readonly path: readonly PropertyKey[] }[]): Rejection {
  return {
    item: { kind: 'output' },
    rules: ['schema'],
    schemaPaths: issues.map((issue) => issue.path.map((part) => (typeof part === 'symbol' ? part.toString() : `${part}`)).join('.') || '(root)'),
  };
}

type Locator = AiCandidate['evidence'][number]['locator'];

/** Whether a locator names a block the request sent of that document; all-null names the whole document. */
function locatorSent(document: SentDocument, locator: Locator): { sent: boolean; hidden: boolean } {
  if (locator.page === null && locator.sheet === null && locator.cell === null) return { sent: true, hidden: false };
  const block = document.blocks.get(locatorKey(locator));
  return block === undefined ? { sent: false, hidden: false } : { sent: true, hidden: block.hidden };
}

function valueKindFits(field: FieldForAi, candidate: AiCandidate): boolean {
  switch (candidate.value.kind) {
    case 'quantity':
      return field.kind === 'quantity' || field.kind === 'count';
    case 'choice':
      return field.kind === 'enum';
    case 'text':
      return field.kind === 'text';
  }
}

function sameSubject(left: AiCandidate['subject'] | null, right: AiCandidate['subject']): boolean {
  return left !== null && left.kind === right.kind && (left.ref ?? '') === (right.ref ?? '');
}

function checkCandidate(
  candidate: AiCandidate,
  context: ExtractionValidationContext,
  prose: ProseContext,
): { rules: Rules; flag: EngineerFlag | undefined } {
  const rules = new Rules();
  const field = context.fields.get(candidate.fieldKey);
  if (field === undefined) rules.add('field_not_requested');
  else {
    if (field.kind === 'decision') rules.add('decision_field');
    if (field.subject !== candidate.subject.kind) rules.add('subject_kind_mismatch');
    if (!valueKindFits(field, candidate)) rules.add('value_kind_mismatch');
  }
  if (candidate.subject.kind === 'document' && (candidate.subject.ref === null || !context.documents.has(candidate.subject.ref))) {
    rules.add('subject_outside_request');
  }

  const value = candidate.value;
  if (value.kind === 'quantity') {
    for (const quantity of [value.quantity, ...value.alternatives]) {
      if (!Number.isFinite(quantity.value)) rules.add('not_a_finite_number');
      if (!context.units.has(quantity.unit)) rules.add('unit_not_registered');
      if (field?.qualifiers !== undefined && quantity.qualifier !== null && !field.qualifiers.includes(quantity.qualifier)) rules.add('qualifier_not_registered');
    }
  }
  if (value.kind === 'choice' && field?.options !== undefined && !field.options.includes(value.choice)) rules.add('choice_not_in_options');

  // Evidence: every entry cites a block the request sent of that revision, and none a hidden one (rules 1, 13, 14).
  if (candidate.evidence.length === 0) rules.add('no_evidence');
  for (const entry of candidate.evidence) {
    const document = context.documents.get(entry.documentId);
    if (document === undefined || document.contentHash !== entry.contentHash) {
      rules.add('evidence_outside_request');
      continue;
    }
    const where = locatorSent(document, entry.locator);
    if (!where.sent) rules.add('evidence_outside_request');
    if (where.hidden) rules.add('evidence_in_hidden_text');
    if (entry.excerpt.trim() === '') rules.add('empty_excerpt');
  }

  // Sources and inferences (2.1; rule 1 "Values not written literally become inferences, and the AI never derives quantities").
  if (candidate.source === 'document' && candidate.inference !== null) rules.add('inference_on_document');
  if (candidate.source === 'ai_inference') {
    if (candidate.inference === null) rules.add('inference_kind_missing');
    if (candidate.confidence === null) rules.add('confidence_missing');
    if (value.kind === 'quantity') {
      const quantity = value.quantity;
      const directCount =
        candidate.inference === 'direct_count' &&
        field?.kind === 'count' &&
        quantity.unit === 'count' &&
        Number.isSafeInteger(quantity.value) &&
        quantity.value >= 0 &&
        value.alternatives.length === 0;
      if (!directCount) rules.add('inferred_quantity_not_direct_count');
    }
  }
  if (candidate.inference === 'direct_count' && (value.kind !== 'quantity' || candidate.source !== 'ai_inference')) rules.add('inference_kind_mismatch');

  // Product identifiers in the value (G1-3), then the prose rules for text the AI wrote itself.
  let flag: EngineerFlag | undefined;
  const written = value.kind === 'text' ? value.text : value.kind === 'choice' ? value.choice : undefined;
  if (written !== undefined && identifiersNotInCatalogue(written, context.catalogue).length > 0) {
    rules.add('product_not_in_catalogue');
    flag = {
      kind: 'catalogue_identifier_not_in_catalogue',
      fieldKey: candidate.fieldKey,
      subject: candidate.subject,
      locations: candidate.evidence.map((entry) => ({ documentId: entry.documentId, locator: entry.locator })),
    };
  }
  if (value.kind === 'text' && candidate.source === 'ai_inference') rules.prose(proseIssues(value.text, prose));
  return { rules, flag };
}

function checkLocations(
  locations: readonly { readonly documentId: string; readonly locator: Locator }[],
  documents: ReadonlyMap<string, SentDocument>,
): boolean {
  return locations.every((location) => {
    const document = documents.get(location.documentId);
    return document !== undefined && locatorSent(document, location.locator).sent;
  });
}

function checkNote(note: AiNote, documents: ReadonlyMap<string, SentDocument>, prose: ProseContext): Rules {
  const rules = new Rules();
  rules.prose(proseIssues(note.text, prose));
  if (note.wouldChange !== null) rules.prose(proseIssues(note.wouldChange, prose));
  if (!checkLocations(note.locations, documents)) rules.add('location_outside_request');
  return rules;
}

/** Validates an extraction output. Pure. */
export function validateExtractionOutput(raw: unknown, context: ExtractionValidationContext): ExtractionValidation {
  const parsed = ExtractionOutputSchema.safeParse(raw);
  if (!parsed.success) {
    const rejection = schemaRejection(parsed.error.issues);
    return {
      output: undefined,
      accepted: { candidates: [], notFound: [], missingFieldKeys: [], findings: [], notes: [] },
      rejections: [rejection],
      engineerFlags: [],
      guardrailEvents: eventsFor(context.projectId, rejection),
    };
  }
  const output = parsed.data;
  const prose: ProseContext = {
    names: context.names,
    ...(context.catalogue === undefined ? {} : { catalogue: context.catalogue }),
    ...(context.standardIdentifiers === undefined ? {} : { standardIdentifiers: context.standardIdentifiers }),
  };
  const rejections: Rejection[] = [];
  const engineerFlags: EngineerFlag[] = [];

  const candidates: AiCandidate[] = [];
  output.candidates.forEach((candidate, index) => {
    const { rules, flag } = checkCandidate(candidate, context, prose);
    if (flag !== undefined) engineerFlags.push(flag);
    if (rules.failed) rejections.push(rules.rejection({ kind: 'candidate', index, fieldKey: candidate.fieldKey }));
    else candidates.push(candidate);
  });

  const notFound: AiNotFound[] = [];
  output.notFound.forEach((answer, index) => {
    const rules = new Rules();
    if (!context.fields.has(answer.fieldKey)) rules.add('field_not_requested');
    if (answer.searched.length === 0) rules.add('nothing_searched');
    for (const searched of answer.searched) {
      const document = context.documents.get(searched.documentId);
      if (document === undefined || !searched.locators.every((locator) => locatorSent(document, locator).sent)) rules.add('searched_outside_request');
    }
    const answered = candidates.some(
      (candidate) => candidate.fieldKey === answer.fieldKey && (answer.subject === null || sameSubject(answer.subject, candidate.subject)),
    );
    if (answered) rules.add('not_found_with_candidate');
    if (rules.failed) rejections.push(rules.rejection({ kind: 'not_found', index, fieldKey: answer.fieldKey }));
    else notFound.push(answer);
  });

  const missingFieldKeys: string[] = [];
  output.missingFieldKeys.forEach((fieldKey, index) => {
    if (context.fields.has(fieldKey)) missingFieldKeys.push(fieldKey);
    else rejections.push({ item: { kind: 'missing_field_key', index, fieldKey }, rules: ['field_not_requested'] });
  });

  const findings: AiFinding[] = [];
  output.findings.forEach((finding, index) => {
    if (checkLocations([finding], context.documents)) findings.push(finding);
    else rejections.push({ item: { kind: 'finding', index }, rules: ['finding_outside_request'] });
  });

  const notes: AiNote[] = [];
  output.notes.forEach((note, index) => {
    const rules = checkNote(note, context.documents, prose);
    if (rules.failed) rejections.push(rules.rejection({ kind: 'note', index }));
    else notes.push(note);
  });

  const guardrailEvents: GuardrailEvent[] = [
    ...rejections.flatMap((rejection) => eventsFor(context.projectId, rejection)),
    ...findings
      .filter((finding) => finding.kind === 'embedded_instruction')
      .map((): GuardrailEvent => ({ type: 'embedded_instruction', projectId: context.projectId, reason: 'embedded_instruction' })),
  ];
  return { output, accepted: { candidates, notFound, missingFieldKeys, findings, notes }, rejections, engineerFlags, guardrailEvents };
}

/** Validates a drafting output. Pure. */
export function validateDraftingOutput(raw: unknown, context: DraftingValidationContext): DraftingValidation {
  const parsed = DraftingOutputSchema.safeParse(raw);
  if (!parsed.success) {
    const rejection = schemaRejection(parsed.error.issues);
    return { output: undefined, accepted: { paragraphs: [], notes: [] }, rejections: [rejection], guardrailEvents: eventsFor(context.projectId, rejection) };
  }
  const output = parsed.data;
  const prose: ProseContext = {
    tokens: context.tokens,
    names: context.names,
    ...(context.catalogue === undefined ? {} : { catalogue: context.catalogue }),
    ...(context.standardIdentifiers === undefined ? {} : { standardIdentifiers: context.standardIdentifiers }),
  };
  const rejections: Rejection[] = [];
  const paragraphs: DraftingOutput['paragraphs'][number][] = [];
  const seen = new Set<string>();
  output.paragraphs.forEach((paragraph, index) => {
    const rules = new Rules();
    if (!context.slots.has(paragraph.slot)) rules.add('slot_not_requested');
    if (seen.has(paragraph.slot)) rules.add('slot_twice');
    seen.add(paragraph.slot);
    rules.prose(proseIssues(paragraph.text, prose));
    if (rules.failed) rejections.push(rules.rejection({ kind: 'paragraph', index, slot: paragraph.slot }));
    else paragraphs.push(paragraph);
  });
  const notes: AiNote[] = [];
  const documents = context.documents ?? new Map<string, SentDocument>();
  output.notes.forEach((note, index) => {
    const rules = checkNote(note, documents, { ...prose, tokens: new Set() });
    if (rules.failed) rejections.push(rules.rejection({ kind: 'note', index }));
    else notes.push(note);
  });
  return {
    output,
    accepted: { paragraphs, notes },
    rejections,
    guardrailEvents: rejections.flatMap((rejection) => eventsFor(context.projectId, rejection)),
  };
}
