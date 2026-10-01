/**
 * The display objects: the only thing UI code receives about a value (guardrails rule 2,
 * "UI code receives only resolved field objects, which carry the badge and the source line";
 * 2.8; F-VALUE-10; F-RENDER-01 to F-RENDER-03; PRD R-043). The API builds them with the one
 * resolver of `@sovitech/view-model/server` and serves them in every screen response as
 * `displayObjects`; the UI renders a value, a count or a status line with a number only from
 * one of them, inside an element carrying its `valueId` (tests/e2e/render/README.md).
 *
 * Browser side: this file imports nothing from the domain or the registry (dependency-cruiser,
 * browser-code-reaches-no-server-code). Lists that mirror the registry (badge ids, status-line
 * ids) are checked against it by a server-side unit test (the view-model builder writes it),
 * so they cannot drift.
 *
 * What a display object never carries: a bare engineering number (every figure is already
 * formatted into `text` by the formatting module, rule 9: rounding at display, ranges rounded
 * outward), a candidate, an event, a confidence stored on a candidate (the badge reads the
 * derived tier, G3-18), or copy that is not built from stored state.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------------------------
// Value ids
// ---------------------------------------------------------------------------------------------

/**
 * A value id (prompt 3 section 7; tests/e2e/render/contract.ts VALUE_ID_PATTERN, which this
 * equals and may only narrow): `<subject kind>:<subject id>.<path>`.
 *
 * How the view-model forms them (one value id per value, so one value id with one filter
 * renders identically everywhere, G2-7):
 * - a registry field on its subject: `<subject kind>:<subject id>.<field key without its
 *   subject prefix>`, e.g. `project:<id>.name`, `project:<id>.scope.fire_safety`,
 *   `building:<id>.grossFloorArea`; one fact of a multi-fact field adds its qualifier:
 *   `building:<id>.floors.upper`;
 * - a document record's own shown values: `document:<id>.fileName`, `.coverage`, `.stage`,
 *   `.revision`; an upload still in progress: `upload:<id>.fileName`;
 * - a derived line or count: `project:<id>.documents.count`, `project:<id>.documents.stillReading`,
 *   `project:<id>.openItems.owner`, `project:<id>.openItems.ownerMore`,
 *   `project:<id>.openItems.engineer.<group>`, `project:<id>.confirmations.count`,
 *   `project:<id>.lateFindings.notice`, `project:<id>.outputs.<output>`,
 *   `document:<id>.revisionNotice` ("<revision> changed <n> values"),
 *   `building:<id>.detection.<system>` (step 4 detections).
 *   Every path segment starts with a letter, so an id never follows a dot.
 */
export const VALUE_ID_PATTERN = /^[a-z][a-z0-9_]*:[A-Za-z0-9_-]+(?:\.[A-Za-z][A-Za-z0-9_]*)+$/u;
export const ValueIdSchema = z.string().regex(VALUE_ID_PATTERN);
export type ValueId = z.infer<typeof ValueIdSchema>;

/** A UUID as the store writes it (UUIDv7, lower case), the API's route parameter form. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
export const UuidSchema = z.string().regex(UUID_PATTERN);

// ---------------------------------------------------------------------------------------------
// Badges and lines (2.8)
// ---------------------------------------------------------------------------------------------

/**
 * The badge ids of 2.8, in its table order: a mirror of `BADGE_IDS` in
 * packages/registry/src/copy/badges.ts (a server-side test asserts they are equal). The label
 * is always served with the id (from the registry, never from a UI catalogue): a string
 * catalogue that repeated 2.8's labels would fail the reserved-term check.
 */
export const BADGE_IDS = [
  'two_values',
  'reading_documents',
  'not_applicable',
  'unknown',
  'not_provided_yet',
  'estimated',
  'verified_by_sovitech',
  'confirmed_by_you',
  'provided_by_you',
  'please_check',
  'likely',
  'possible',
  'sovitech_will_check',
  'from_design_drawings',
  'from_document',
  'calculated',
  'reference',
  'suggested',
  'not_found_in_documents',
  'not_available_yet',
] as const;
export const BadgeIdSchema = z.enum(BADGE_IDS);
export type BadgeId = z.infer<typeof BadgeIdSchema>;

/**
 * One badge (2.8 "One badge per value": the first match in 2.8's table order, from the
 * registry's `firstBadge`; on step 4 the section 5 row decides where 2.8's order would hide
 * Not found in documents: PRD R-051 Sources). The UI renders `label` at 12px or larger, on the
 * same line as the figure, with AA contrast, never only on hover (2.8 "Prominence"); a badge
 * holding a reserved term is marked `data-copy-kind="badge"`.
 */
export const BadgeSchema = z.strictObject({ id: BadgeIdSchema, label: z.string().min(1) });
export type Badge = z.infer<typeof BadgeSchema>;

/**
 * Where a line's words come from, which is also the `data-copy-kind` it is marked with when it
 * holds a reserved term (tests/e2e/render/contract.ts COPY_KINDS):
 * - `status_line`: a 2.8 status line (STATUS_LINES in the registry), "status-line";
 * - `stage_label`: a rule 10 stage label read from stored records, "status-line";
 * - `demo_line`: 2.8's demo line, "status-line";
 * - `generated_sentence`: a 2.8 generated sentence (GENERATED_SENTENCES), "generated-sentence";
 * - `rule_line`: a line the guardrails' rules 4, 5, 7 and 12 write word for word
 *   (RULE_LINES in packages/registry/src/copy/rule-lines.ts), no marker (none holds a reserved term);
 * - `source_line`: a source line built from stored state ("Found in <file>, page <n>"), no marker.
 */
export const LINE_KINDS = ['status_line', 'stage_label', 'demo_line', 'generated_sentence', 'rule_line', 'source_line'] as const;
export const LineKindSchema = z.enum(LINE_KINDS);
export type LineKind = z.infer<typeof LineKindSchema>;

/**
 * A line built from stored state: a status line, a rule line, a stage label, a generated
 * sentence or a source line. `id` is its registry id (for a source line, the kind of source
 * line). `text` is exactly what is shown; a number in it is a slot the view-model filled from
 * stored state. A line that belongs to a value renders inside that value's element; a line that
 * stands alone and holds a number is served as its own display object (kind `line`).
 */
export const LineSchema = z.strictObject({
  id: z.string().min(1),
  kind: LineKindSchema,
  text: z.string().min(1),
});
export type Line = z.infer<typeof LineSchema>;

// ---------------------------------------------------------------------------------------------
// Evidence, units, missing values
// ---------------------------------------------------------------------------------------------

/**
 * An evidence excerpt shown with a value (2.4 `Evidence.excerpt`: verbatim, original language),
 * rendered marked `data-copy-kind="evidence-excerpt"` with its document id and content hash
 * (the render contract's ServedEvidence).
 */
export const EvidenceExcerptSchema = z.strictObject({
  documentId: UuidSchema,
  contentHash: z.string().regex(/^[0-9a-f]{64}$/u),
  excerpt: z.string().min(1),
});
export type EvidenceExcerpt = z.infer<typeof EvidenceExcerptSchema>;

/** A unit from the closed registry (2.7): its ASCII code and display symbol. Never a free string typed by the UI. */
export const UnitSchema = z.strictObject({ code: z.string().min(1), symbol: z.string().min(1) });
export type Unit = z.infer<typeof UnitSchema>;

/**
 * What a value measures (rule 8, "Every value states what it measures"): the field's registered
 * label, and for a quantity or count its unit and the qualifier label (the area basis, what a
 * count counts) when one is stated. "Unknown" names an unstated basis (rule 8: stored with basis
 * `unknown`), never a guessed one.
 */
export const MeasureSchema = z.strictObject({
  label: z.string().min(1),
  unit: UnitSchema.optional(),
  qualifierLabel: z.string().min(1).optional(),
});
export type Measure = z.infer<typeof MeasureSchema>;

/**
 * Why a value has none (guardrails 2.4 field states, 2.8, rules 7 and 12). The display object's
 * `text` is then the missing wording itself (the badge label), shown once:
 * - `unknown`: no eligible candidate and nothing asked ("Unknown");
 * - `not_provided_yet`: a question the owner has not answered or skipped ("Not provided yet",
 *   with the rule 7 line "You can provide this later." once after a skip);
 * - `reading_documents`: analysis that may produce it is still running ("Reading documents…");
 * - `not_found_in_documents`: a completed AI run searched it and did not find it, with the
 *   coverage it searched (rule 12; never over unread pages or stored-only files, G12-4, G12-5,
 *   G12-8). While no AI run exists, this never occurs;
 * - `not_available_yet`: an output missing an input, naming it (rule 7), with the action when
 *   the owner has one (prompt 3 5.3); a missing SOVITECH dataset names the dataset and has no
 *   owner action;
 * - `not_applicable`: only as 2.4 sets it.
 */
export const MISSING_KINDS = ['unknown', 'not_provided_yet', 'reading_documents', 'not_found_in_documents', 'not_available_yet', 'not_applicable'] as const;
export const MissingKindSchema = z.enum(MISSING_KINDS);
export type MissingKind = z.infer<typeof MissingKindSchema>;

// ---------------------------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------------------------

/**
 * How an owner's input is taken for a field (Edit, a step 8 inline ask, an "Add" action). Option
 * and qualifier keys come from the registry; their labels come from the UI catalogue
 * (apps/web/src/copy/en.json, `options.<field key>.<key>` and `qualifiers.<field key>.<key>`).
 * A quantity is typed as text and parsed on the server by the rule 8 parser with the dimension
 * check (US-REVIEW-07 AC6, US-INTAKE-17 AC7): an entry that reads two ways is refused with
 * `number_ambiguous`, never stored as one reading.
 */
export const InputSpecSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('choice'), options: z.array(z.string().min(1)).min(1) }),
  z.strictObject({ kind: z.literal('text'), maxLength: z.number().int().positive() }),
  /** A multi-select answered as one decision field per option (2.6): `options` are the decision fields' keys (the systems in scope at step 8's inline ask). */
  z.strictObject({ kind: z.literal('multi'), options: z.array(z.string().min(1)).min(1) }),
  z.strictObject({
    kind: z.literal('quantity'),
    unit: UnitSchema,
    /** The qualifiers the registry lists; the owner picks one where the registry requires one (rule 8). */
    qualifiers: z.array(z.string().min(1)),
    qualifierRequired: z.boolean(),
  }),
]);
export type InputSpec = z.infer<typeof InputSpecSchema>;

/** Which field an action writes to: the subject and the registry field key. */
export const FieldRefSchema = z.strictObject({ subjectId: UuidSchema, fieldKey: z.string().min(1) });
export type FieldRef = z.infer<typeof FieldRefSchema>;

/**
 * What the owner can do on a value (rules 3, 4, 5 and 7). Each maps to one route of the contract
 * (routes.ts). Labels: fixed ones from the UI catalogue (`actions.<kind>`), the "Add <field>"
 * label and the confirmation wording served by the API from the rule lines.
 * - `edit`: Edit on a shown value (guardrails section 5 step 3; US-REVIEW-07); `shownCandidateIds`
 *   are the candidates the screen showed, which a correction rejects (rule 4, "A correction is a
 *   resolution"; G4-5), or, on an engineer_verified value, puts in conflict (G4-19).
 * - `confirm`: "Is this right? Yes · Edit" on a value that passes rule 5's test within the budget
 *   (F-QUESTION-02); `wording` is the served sentence naming what was found and where.
 * - `acknowledge`: "Looks right" on engineer items (rule 3): `owner_acknowledged`, which never
 *   clears Provisional and never raises the badge (G3-3).
 * - `concern`: "Something's wrong" on an engineer item: the owner's rejection with no value of
 *   their own, which goes to the engineer queue (rule 3; G3-10).
 * - `resolve_conflict`: the owner's choice on a conflict routed to the owner (rule 4; US-REVIEW-11).
 * - `add`: the action of a "Not available yet" line for an owner input (rule 7), which opens the
 *   step 8 inline ask for that field (US-INTAKE-22 AC6).
 * - `skip`: "Skip for now" under an unanswered non-required question (rule 7; never on a question
 *   with an answer or a visible suggestion, G7-3).
 */
export const ActionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('edit'), field: FieldRefSchema, input: InputSpecSchema, shownCandidateIds: z.array(UuidSchema) }),
  z.strictObject({ kind: z.literal('confirm'), candidateId: UuidSchema, wording: LineSchema }),
  z.strictObject({ kind: z.literal('acknowledge'), candidateIds: z.array(UuidSchema).min(1) }),
  z.strictObject({ kind: z.literal('concern'), candidateId: UuidSchema }),
  z.strictObject({
    kind: z.literal('resolve_conflict'),
    field: FieldRefSchema,
    /** Each value in conflict, as its own display object (its source line shown with it). */
    choices: z.array(z.strictObject({ candidateId: UuidSchema, valueId: ValueIdSchema })).min(2),
  }),
  z.strictObject({ kind: z.literal('add'), field: FieldRefSchema, label: z.string().min(1), step: z.literal(8) }),
  z.strictObject({ kind: z.literal('skip'), questionId: z.string().min(1) }),
]);
export type Action = z.infer<typeof ActionSchema>;

// ---------------------------------------------------------------------------------------------
// The display object
// ---------------------------------------------------------------------------------------------

/**
 * The three kinds of display object:
 * - `field`: a registry field's value on its subject (or one fact of it), resolved from its
 *   derived state (2.4) with one badge, its source line, its status lines and its actions;
 * - `record`: a document record's own shown value (file name as uploaded, coverage as code
 *   recorded it, stage, revision) or an upload's file name; stage carries its one badge;
 * - `line`: a standalone status line, rule line or count that holds a number (rule 7 counts,
 *   "Still reading <n> files…", the late-findings notice, a document's coverage line, an
 *   output's "Not available yet" line): it renders through the StatusLine component in its own
 *   element with this value id (prompt 3 section 7).
 */
export const DISPLAY_KINDS = ['field', 'record', 'line'] as const;

export const DisplayObjectSchema = z.strictObject({
  valueId: ValueIdSchema,
  kind: z.enum(DISPLAY_KINDS),
  /**
   * What the value element shows, exactly: the formatted value or range ("about 5,800 (5,200 to
   * 6,400)"), a text value as written, the missing wording, or the whole line. Never empty, never
   * a zero or a dash standing in for a missing value (rule 1).
   */
  text: z.string().min(1),
  /** Pieces of `text` or of a line that the component renders in separate elements (the figure and its unit). */
  parts: z.array(z.string().min(1)).optional(),
  /** `value`: one value; `range`: a range with its basis (rule 1, "Ranges need a basis"); `missing`: none, see `missing`. */
  shape: z.enum(['value', 'range', 'missing']),
  missing: MissingKindSchema.optional(),
  /** Field and record displays: the one 2.8 badge. Absent on a `line`. */
  badge: BadgeSchema.optional(),
  /** What it measures (rule 8). Field displays of quantities, counts and enums. */
  measure: MeasureSchema.optional(),
  /** The source line below the value (2.8: "The source always shows in the line below the value"). */
  sourceLine: LineSchema.optional(),
  /** The 2.8 status lines and rule lines that belong to this value, in order, shown with it. */
  lines: z.array(LineSchema).optional(),
  /** Evidence excerpts shown with the value. */
  evidence: z.array(EvidenceExcerptSchema).optional(),
  /** What the owner can do on it. */
  actions: z.array(ActionSchema).optional(),
  /** For a field display: the field it resolves (for the actions and the late-findings map), never a value. */
  field: FieldRefSchema.optional(),
  /**
   * A stage 3 price only: the stored quotation record it was derived from (rule 10, "Stage 3 is
   * derived, not passed"; G10-9). Never present in phase 3.
   */
  quotationRecordId: UuidSchema.optional(),
});
export type DisplayObject = z.infer<typeof DisplayObjectSchema>;

/** Every screen response carries the display objects it shows. */
export const DisplayObjectsSchema = z.array(DisplayObjectSchema);

// ---------------------------------------------------------------------------------------------
// The render test's view of a display object
// ---------------------------------------------------------------------------------------------

/**
 * What the render test compares a value element with (tests/e2e/render/contract.ts
 * ServedDisplay): the same shape, restated here so the browser side does not import tests.
 */
export interface ServedDisplay {
  text: string;
  lines?: readonly string[];
  parts?: readonly string[];
  evidence?: readonly { documentId: string; contentHash: string; excerpt: string }[];
  quotationRecordId?: string;
}

/**
 * The one projection of a display object onto what its element may show: `text`, then every
 * line the element renders (the badge label when it differs from the text, the source line, the
 * status and rule lines, a confirmation's wording, an "Add" action's label), the parts and the
 * evidence. The Value and StatusLine components render nothing with a number that this
 * projection leaves out, and tests/e2e/render/api-display-objects.ts reads served responses
 * through it (phase 3), so the component and the render test agree by construction.
 *
 * Pure and total; no formatting happens here.
 */
export function servedDisplayOf(display: DisplayObject): ServedDisplay {
  const lines: string[] = [];
  if (display.badge !== undefined && display.badge.label !== display.text) lines.push(display.badge.label);
  if (display.sourceLine !== undefined) lines.push(display.sourceLine.text);
  for (const line of display.lines ?? []) lines.push(line.text);
  for (const action of display.actions ?? []) {
    if (action.kind === 'confirm') lines.push(action.wording.text);
    if (action.kind === 'add') lines.push(action.label);
  }
  return {
    text: display.text,
    ...(lines.length === 0 ? {} : { lines }),
    ...(display.parts === undefined ? {} : { parts: display.parts }),
    ...(display.evidence === undefined ? {} : { evidence: display.evidence }),
    ...(display.quotationRecordId === undefined ? {} : { quotationRecordId: display.quotationRecordId }),
  };
}
