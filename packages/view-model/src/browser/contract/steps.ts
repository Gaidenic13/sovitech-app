/**
 * The step views of the intake wizard, steps 1 to 8 (onboarding-spec 3 as changed by guardrails
 * section 5; PRD R-001 to R-004, R-013 to R-015, R-043 to R-047, R-051; UD-33 to UD-35, UD-45),
 * the "View all extracted data" view (UD-45) and phase 3's proposal page (prompt 3 5.2,
 * "Generate before phase 5").
 *
 * `GET /api/projects/:projectId/steps/:step` answers `StepResponse`: the envelope of common.ts
 * and one view below. A view names values only by value id; every value, count and line with a
 * number is one of the envelope's display objects. Fixed copy (titles, subtitles, question
 * wording, helper lines, option labels, buttons, banners) is the UI catalogue's
 * (apps/web/src/copy/en.json), keyed by the ids served here.
 *
 * Rules every view keeps (the API builder implements them, the view-model's intake planner
 * decides them, the web renders them; each cites its source):
 * - Nobody is blocked except by step 1's four required fields: Continue and Generate are never
 *   disabled (rule 7; G7-6).
 * - A question shows only for a field with no eligible candidate, if rule 6 allows it; a known or
 *   conflicting field shows its value with its badge, source line and Edit, and a confirmation
 *   only when rule 5's three-part test passes within the budget of steps 3 to 7 (rule 5;
 *   F-QUESTION-01, F-QUESTION-02). A question for a known field is a defect and logs
 *   `question_for_known_field` (section 4; GS-1).
 * - "Skip for now" only under an unanswered non-required question with no visible suggestion
 *   (rule 7; G7-3); after a skip, "You can provide this later." once, inline.
 * - A suggestion is a visible, labelled preselection (Suggested with a one-line reason), never a
 *   candidate; Continue writes the visible ones left in place (rule 3; G3-4). Facts (building
 *   type, which systems exist) are never Suggested (rule 3). Until the owner decides D-11 and
 *   D-12, steps 5 to 7 carry no suggestion (PRD R-005, R-006 "Until decided"); step 4 suggests a
 *   system only from a detection, never a life-safety system and, until D-64, neither Access
 *   Control nor Elevators (R-051).
 * - Questions of a step appear in their registered impactRank order (rule 6; US-INTAKE-05 AC11).
 * - No follow-up input, "Other" text field or note field on steps 5 to 7 (onboarding Q11, new Q4;
 *   PRD R-007, R-011 "Until decided"), and no Other card on step 6 (not registered: it changes no
 *   output, rule 6).
 */
import { z } from 'zod';
import { StepNumberSchema, screenEnvelope } from './common';
import { ActionSchema, FieldRefSchema, InputSpecSchema, LineSchema, UuidSchema, ValueIdSchema } from './display';

// ---------------------------------------------------------------------------------------------
// Questions (steps 1, 4 to 7)
// ---------------------------------------------------------------------------------------------

/**
 * One option of a question.
 * - `key`: for a single choice, the option key of the field (`hotel`, `24_7`); for a multi-select,
 *   the decision field's key (`project.goal.reduce_energy`, `project.scope.hvac`).
 * - `selected`: whether the option shows as chosen now: the owner's stored answer, a found value
 *   preselected (a fact: its badge is on `found`), or a visible suggestion.
 * - `valueId`: for a multi-select, the option's decision field display object (Provided by you
 *   once answered); absent on a single choice.
 * - `suggestion`: a visible Suggested preselection with its one-line reason, or null.
 */
export const QuestionOptionSchema = z.strictObject({
  key: z.string().min(1),
  selected: z.boolean(),
  valueId: ValueIdSchema.optional(),
  suggestion: z.strictObject({ reason: LineSchema }).nullable(),
});
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

/**
 * One registered question (packages/registry/src/production/questions.ts), as the question
 * engine rendered it. Its wording and helper line (rule 6's one-line reason) come from the UI
 * catalogue, `questions.<questionId>`.
 * - `state`: `unanswered` (asked), `answered` (the owner's answer stands), `skipped` (skipped:
 *   not prompted again during the intake, rule 7), `found` (a document states the fact: shown,
 *   not asked, with `found` naming its display object, which carries the confirm and edit
 *   actions rule 5 allows).
 * - `skip`: the "Skip for now" action, or null (never on a required field, an answered question,
 *   a found fact or a question with a visible suggestion).
 * - `afterSkip`: "You can provide this later." once, right after a skip (rule 7), else null.
 */
export const QuestionSchema = z.strictObject({
  questionId: z.string().min(1),
  selection: z.enum(['single', 'multi']),
  /** The field of a single choice; the decision fields of a multi-select, one per option. */
  fields: z.array(FieldRefSchema).min(1),
  state: z.enum(['unanswered', 'answered', 'skipped', 'found']),
  options: z.array(QuestionOptionSchema).min(1),
  found: ValueIdSchema.nullable(),
  skip: ActionSchema.nullable(),
  afterSkip: LineSchema.nullable(),
});
export type Question = z.infer<typeof QuestionSchema>;

// ---------------------------------------------------------------------------------------------
// Step 1: Project (OB-1)
// ---------------------------------------------------------------------------------------------

/**
 * Step 1 of an existing project (a project reopened or reached with Back): the four answers
 * through the value component, each with Edit (US-INTAKE-21 AC2: every stored answer shown, none
 * asked again). A new project's step 1 has no API view: it is the form of projects.ts, and
 * nothing is stored until Next sends all four fields (G7-6).
 */
export const Step1ViewSchema = z.strictObject({
  step: z.literal(1),
  name: ValueIdSchema,
  projectType: ValueIdSchema,
  country: ValueIdSchema,
  city: ValueIdSchema,
});

// ---------------------------------------------------------------------------------------------
// Step 2: Documents (OB-2, UD-33)
// ---------------------------------------------------------------------------------------------

/**
 * One row of step 2's file list (US-DOCS-01, US-DOCS-03, US-DOCS-04; R-013, R-014):
 * - a stored document (`documentId`), or an upload still in progress (`uploadId`, from its upload
 *   session, so its name is served bound before it is stored);
 * - `fileName`: the file name as uploaded, bound (a document value; it may hold digits);
 * - `status`: `progress` while queued, analysing or uploading (no text of its own, US-DOCS-03
 *   AC1: no percentage, no size); else the value id of its line: the coverage as code recorded it
 *   ("pages <first>-<last> of <total>") or a 2.8 status line ("Partly analysed (<n> of <m>
 *   pages)", "Not analysed: <file type> stored, not analysed", "Analysis failed");
 * - `stage`, `revision`: through the value component with one badge; with no classifier (US-DOCS-08
 *   not built) the stage reads Unknown and the revision Unknown, never "none stated" (US-DOCS-04
 *   AC7). No Edit on kind or stage (proposal 7.2.26), no file size (7.2.30), no remove action
 *   (US-DOCS-03 AC11: step 2 has no delete until new Q9; R-016).
 * A file the client refused before upload (format or size) is not a row here: the web shows its
 * inline error on its own row, without its name, since an unstored name has no display object.
 */
export const FileRowSchema = z.strictObject({
  documentId: UuidSchema.optional(),
  uploadId: UuidSchema.optional(),
  fileName: ValueIdSchema,
  /**
   * `progress.line` (optional, additive, part B; DR-4): for a stored document being read (queued or analysing),
   * the value id of its progress words, 2.8's pending wording "Reading documents…" (the `reading_documents` badge,
   * bound to `document:<id>.coverage`); absent on an upload still being sent, which has no words of its own.
   */
  status: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('progress'), line: ValueIdSchema.optional() }),
    z.strictObject({ kind: z.literal('line'), valueId: ValueIdSchema }),
  ]),
  stage: ValueIdSchema.nullable(),
  revision: ValueIdSchema.nullable(),
});
export type FileRow = z.infer<typeof FileRowSchema>;

export const Step2ViewSchema = z.strictObject({
  step: z.literal(2),
  files: z.array(FileRowSchema),
  /** The number of files stored, bound (`project:<id>.documents.count`; US-DOCS-03 AC8). */
  documentCount: ValueIdSchema,
  /** "Still reading <n> files. Your estimate will update when they finish." while any analysis runs (rule 7), else null. */
  stillReading: ValueIdSchema.nullable(),
});

// ---------------------------------------------------------------------------------------------
// Step 3: Building (OB-3, UD-34, UD-45)
// ---------------------------------------------------------------------------------------------

/**
 * Step 3 (R-045, R-047; guardrails section 5, step 3 rows):
 * - `intro`: which intro copy is true (US-REVIEW-04 AC13): `values_found` keeps the drawn copy
 *   ("We've analyzed your documents and found …") only when at least one fact has a value from a
 *   document; `reading` while analysis runs; `no_documents` when none was uploaded (each fact then
 *   reads Not provided yet with Edit, R-047 "Until decided"); `none_found` when documents exist
 *   and no fact came from them (the copy never says documents were searched unless a completed
 *   AI run searched them: rule 12, G12-8).
 * - `summary` and `details`: the facts, each one display object used in both places (G2-7):
 *   gross floor area with its basis, floors by level type (parts no document states read Unknown;
 *   a plan-sheet count never sets floors), rooms and zones with what they count, the HVAC assets
 *   count (Calculated from the asset register, by type; while `dataset-asset-taxonomy` is closed:
 *   "Not available yet" naming the missing taxonomy, with "Looks right" and "Something's wrong"
 *   on the engineer items when there are assets, never "Confirm all": §5-3b), and Systems only as
 *   a calculated count with its basis when detections exist (§5-3e; US-REVIEW-04 AC10).
 * - `confirmationCount`: the status pill, counting only rows showing a confirmation, in the form
 *   "<n> things for you to check" (US-REVIEW-05 AC3), or null; `forYouRow`: the warning row that
 *   leads to them (never "before we continue": US-REVIEW-06 AC3), or null.
 * - `files`: the 2.8 lines of files not fully read (US-REVIEW-09 AC3, AC5 to AC7).
 * - `viewer`: no model viewer, view toggle or floor selector (US-REVIEW-04 AC14; prompt 3 5.2 "No
 *   IFC uploaded"): with no IFC model stored, "Not available yet" naming the missing model with
 *   the action to add one on step 2; with a model stored, its 2.8 line "Not analysed: IFC model
 *   stored, not analysed". Never an illustrative or mockup building.
 * - No "Building data extracted" success banner: 2.8's status lines "are also the only ones used"
 *   (PRD R-045 leaves US-REVIEW-04 AC12 off; prompt 3 section 4).
 */
export const Step3ViewSchema = z.strictObject({
  step: z.literal(3),
  intro: z.enum(['values_found', 'reading', 'no_documents', 'none_found']),
  summary: z.array(ValueIdSchema),
  details: z.array(ValueIdSchema),
  confirmationCount: ValueIdSchema.nullable(),
  forYouRow: ValueIdSchema.nullable(),
  files: z.array(ValueIdSchema),
  viewer: z.strictObject({ state: z.enum(['no_model', 'model_stored']), line: LineSchema, addModelOnStep: z.literal(2).nullable() }),
});

/** UD-45, `GET /api/projects/:projectId/extracted`: every fact found about the building, each with Edit and, where rule 5 allows, a confirmation counted in the same budget (US-REVIEW-08). */
export const ExtractedViewSchema = z.strictObject({
  facts: z.array(ValueIdSchema),
  confirmationCount: ValueIdSchema.nullable(),
});

// ---------------------------------------------------------------------------------------------
// Step 4: Systems (OB-4)
// ---------------------------------------------------------------------------------------------

/**
 * One system card (US-SCOPE-01 to US-SCOPE-03; R-051; the catalogue of the eight step 4 systems):
 * - `detection`: the detection display object (From document, Likely, Possible, Please check or
 *   SOVITECH will check by `confirmBy`, From design drawings, Reading documents…, Not found in
 *   documents with "Not found in the analysed documents (<coverage>). You can still include it."
 *   only over what a completed AI run searched, or Unknown). No "Detected" or "Optional" (§5-4a).
 *   While the registry declares no detection field, every card reads Unknown (US-SCOPE-01 AC8).
 * - `decision`: the owner's scope decision for the system (`project.scope.<id>`), its display
 *   object; `selected` the checkbox state (a real checkbox input): the stored decision, or a
 *   visible suggestion;
 * - `suggestion`: Suggested with its one-line reason, only from a detection, never on a life-safety
 *   system or while `neverPreselected` (Fire Safety; Access Control and Elevators until D-64);
 * - Fire Safety's card reads "monitoring only (read-only); fire logic and fire-mode interlocks
 *   remain in the fire system" (§5-4b; UI catalogue), and ticking or not never removes the
 *   fire-alarm input and fire-mode status points (G11-3; the engine's, phase 5).
 */
export const SystemCardSchema = z.strictObject({
  systemId: z.string().min(1),
  lifeSafety: z.boolean(),
  neverPreselected: z.boolean(),
  detection: ValueIdSchema,
  decision: ValueIdSchema,
  selected: z.boolean(),
  suggestion: z.strictObject({ reason: LineSchema }).nullable(),
});

export const Step4ViewSchema = z.strictObject({
  step: z.literal(4),
  /**
   * Which subheading is true (US-SCOPE-01 AC10): "We've detected the following systems in your documents." only when a
   * document names or shows one; `none_named` when documents exist and none names a system; `no_documents` (added in
   * phase 3 part B, DR-25; ADR 0036 decision 11) when the project has no active document, so the page never speaks of
   * what its documents say (rule 12).
   */
  subtitle: z.enum(['systems_named', 'none_named', 'no_documents']),
  /** The scope question (`q.project.systemsInScope`) with its skip state (G7-3; US-SCOPE-02 AC3, AC4). */
  question: z.strictObject({ questionId: z.string().min(1), state: z.enum(['unanswered', 'answered', 'skipped']), skip: ActionSchema.nullable(), afterSkip: LineSchema.nullable() }),
  systems: z.array(SystemCardSchema).length(8),
});

// ---------------------------------------------------------------------------------------------
// Steps 5 to 7: Operations, Goals, Automation (OB-5 to OB-7)
// ---------------------------------------------------------------------------------------------

/**
 * Step 5 (US-INTAKE-07, US-INTAKE-08): building type as a found fact (Likely, Possible or Please
 * check with its evidence, and "Yes, it's a hotel" when rule 5's test passes within the budget;
 * never Suggested; with no evidence, asked, with "Skip for now"), then the operating schedule and
 * the occupancy in impactRank order. "Seasonal" only on the schedule question (§5-5b).
 */
export const Step5ViewSchema = z.strictObject({ step: z.literal(5), questions: z.array(QuestionSchema).min(1) });
/** Step 6 (US-INTAKE-09): the seven registered goals as one multi-select, one decision field per goal. */
export const Step6ViewSchema = z.strictObject({ step: z.literal(6), question: QuestionSchema });
/** Step 7 (US-INTAKE-10, US-INTAKE-11 "Until decided"): the six automation areas as one multi-select, with no preselection. */
export const Step7ViewSchema = z.strictObject({ step: z.literal(7), question: QuestionSchema });

// ---------------------------------------------------------------------------------------------
// Step 8: Review (OB-8, UD-35)
// ---------------------------------------------------------------------------------------------

/**
 * A summary card (US-INTAKE-15): each row a display object under the field's registered label (the
 * measure's label), with the card's Edit opening `editStep`. Skipped answers read "Not provided
 * yet" with "You can provide this later." (AC5). The Documents card's file count is bound (AC4);
 * the Building card's area is the same value id as on step 3 (AC3; G2-7). A scope decision that
 * departs from a detected fact shows as information, not a conflict (AC6; rule 4).
 */
export const ReviewCardSchema = z.strictObject({
  cardId: z.enum(['project', 'documents', 'building', 'systems', 'operations', 'goals', 'automation']),
  editStep: StepNumberSchema,
  /** The rows; on a multi-select's card (systems, goals, automation), the chosen options first, then those not chosen, then those not provided (part B; V-6). */
  rows: z.array(ValueIdSchema),
  /**
   * Optional, additive (part B; G7-12): each multi-select of the card the owner skipped, with rule 7's "You can
   * provide this later." once for the question ("The question then shows 'You can provide this later.' once,
   * inline"); no option's own display repeats it. A skipped question of one field keeps the line on its own row.
   */
  skippedQuestions: z.array(z.strictObject({ questionId: z.string().min(1), line: LineSchema })).optional(),
});

/**
 * An output the proposal will carry and whether it will be a range or "Not available yet"
 * (US-INTAKE-16 AC3; F-PROPOSAL-07): `line` is its display object, which names what is missing
 * and, for an owner input, carries the `add` action that opens this step's inline ask. While the
 * dataset gates are closed, every output reads "Not available yet" naming the missing SOVITECH
 * dataset (prompt 3 5.4), with no owner action (5.3).
 */
export const OutputAvailabilitySchema = z.strictObject({
  output: z.string().min(1),
  availability: z.enum(['range', 'not_available_yet']),
  line: ValueIdSchema,
  /**
   * Optional, additive (part B; G10-11): for an investment output, the value id of its rule 10 stage label, a
   * `line` display object whose text is 2.8's "Indicative range" (the benchmark output) or "Preliminary
   * investment estimate" (the output from this project's data), with its own line of the stage-label kind (2.8:
   * "They are also the only ones used"). Absent on other outputs; never "Formal quotation".
   */
  label: ValueIdSchema.optional(),
});
export type OutputAvailability = z.infer<typeof OutputAvailabilitySchema>;

/**
 * A step 8 inline ask (rule 7; US-INTAKE-17; F-QUESTION-08): once, for each first-estimate field
 * with no eligible candidate, read from the registry's first-estimate set, in the form "To show
 * your investment estimate we need <field>. [ <input> ] · Generate without it" (`ask` is the
 * served sentence). "Generate without it" records a second skip; after it, the ask is gone.
 */
export const InlineAskSchema = z.strictObject({
  questionId: z.string().min(1),
  fields: z.array(FieldRefSchema).min(1),
  ask: LineSchema,
  input: InputSpecSchema,
});

/**
 * One "For you" item (rule 7; US-REVIEW-12; F-QUESTION-07): only what the owner can resolve,
 * ordered by its effect on the estimate. `concerns` is the field display (its actions resolve it:
 * a confirmation, a conflict put to the owner, "Source document removed", a first-estimate field
 * still missing).
 */
export const ForYouItemSchema = z.strictObject({
  itemId: z.string().min(1),
  reason: z.enum(['confirmation', 'conflict', 'source_document_removed', 'first_estimate_missing']),
  concerns: ValueIdSchema,
});

export const Step8ViewSchema = z.strictObject({
  step: z.literal(8),
  cards: z.array(ReviewCardSchema).length(7),
  proposal: z.strictObject({
    /** The stage label its investment figure will carry, from stored state (rule 10); null while no figure can be produced. */
    stage: LineSchema.nullable(),
    /**
     * Optional, additive (part B; US-INTAKE-16 AC2; G10-11): the value id of the stage the rules give for the
     * investment figure (rule 10; rule 7's `first_estimate` row), derived from stored state
     * (`project:<id>.proposal.stage`, a `line` display object with its stage-label line): "Indicative range" only
     * where a first-estimate input is missing, the registry allows an Indicative range for it and its dataset is
     * approved; otherwise "Preliminary investment estimate". Never "Formal quotation". The Proposal card names it
     * only while the investment output carrying that stage is served as a range (or `stage` is non-null), and
     * otherwise shows that output's "Not available yet" line; the page reads this id to find that output.
     */
    stageLabel: ValueIdSchema.optional(),
    outputs: z.array(OutputAvailabilitySchema),
    inlineAsks: z.array(InlineAskSchema),
  }),
  forYou: z.strictObject({
    /** "<n> things for you to check" (G7-5), or null when none. */
    count: ValueIdSchema.nullable(),
    /** The top three. */
    items: z.array(ForYouItemSchema).max(3),
    /** "and <n> more", or null. */
    more: ValueIdSchema.nullable(),
  }),
  /** "SOVITECH will check" groups, one line each ("SOVITECH will check <n> equipment classifications"; "Site survey needed"; G7-5, G1-7). */
  sovitechWillCheck: z.array(ValueIdSchema),
  /**
   * One notice per declared revision that changed values (2.3, "Changes are announced": "Rev B
   * changed 3 values"; R-048; G4-13), listing the changed values' display objects; empty when none.
   */
  revisionNotices: z.array(z.strictObject({ notice: ValueIdSchema, changed: z.array(ValueIdSchema) })),
  stillReading: ValueIdSchema.nullable(),
});

// ---------------------------------------------------------------------------------------------
// The step response
// ---------------------------------------------------------------------------------------------

export const StepViewSchema = z.discriminatedUnion('step', [
  Step1ViewSchema,
  Step2ViewSchema,
  Step3ViewSchema,
  Step4ViewSchema,
  Step5ViewSchema,
  Step6ViewSchema,
  Step7ViewSchema,
  Step8ViewSchema,
]);
export type StepView = z.infer<typeof StepViewSchema>;

/**
 * The query of `GET /api/projects/:projectId/steps/:step` (additive, phase 3 part B; PRD R-012 "Until decided":
 * a "Not available yet" action "opens a built page (at least the step 8 inline ask for that field)"; G7-11):
 * `add=<field key>` on step 8 only, sent by an `add` action (the proposal page's "Add <field>"). When the field is
 * a first-estimate field with no eligible candidate, step 8 serves its inline ask whatever its skip count,
 * because the owner asked for it: it is not the app asking again (no skip limit; no `question_for_known_field`).
 * Any other field key serves no extra ask. On another step the query is refused `request_invalid`.
 */
export const StepViewQuerySchema = z.strictObject({ add: z.string().regex(/^[a-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/u).optional() });
export type StepViewQuery = z.infer<typeof StepViewQuerySchema>;

export const StepResponseSchema = z.strictObject({ ...screenEnvelope, view: StepViewSchema });
export type StepResponse = z.infer<typeof StepResponseSchema>;

export const ExtractedResponseSchema = z.strictObject({ ...screenEnvelope, view: ExtractedViewSchema });
export type ExtractedResponse = z.infer<typeof ExtractedResponseSchema>;

// ---------------------------------------------------------------------------------------------
// Phase 3's proposal page (prompt 3 5.2 "Generate before phase 5"; UD-07, UD-06)
// ---------------------------------------------------------------------------------------------

/**
 * `GET /api/projects/:projectId/proposal`. Generate is never disabled (rule 7): it shows the
 * generating state (UD-07) while this loads, with only "Still reading <n> files…" and no figure,
 * then this page. Phase 3 stores nothing on Generate: no proposal snapshot exists before the
 * phase 5 engine, and none is invented. The page states that no investment figure is available
 * yet and names, for each output, what is missing (the SOVITECH datasets behind the closed gates;
 * an owner input with its `add` action back to step 8's inline ask). No separate Overview (UD-01)
 * is built (PRD 10.4 "Until … no separate Overview is built", stricter than 5.2's default, logged).
 * Phase 5 replaces it with the stored proposal (US-PROPOSAL-04).
 */
export const ProposalPreviewResponseSchema = z.strictObject({
  ...screenEnvelope,
  view: z.strictObject({ outputs: z.array(OutputAvailabilitySchema), stillReading: ValueIdSchema.nullable() }),
});
export type ProposalPreviewResponse = z.infer<typeof ProposalPreviewResponseSchema>;
