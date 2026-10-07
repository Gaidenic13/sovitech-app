/**
 * The proposal, Reports and export contract (phase 5; docs/adr/0049-proposal-reports-export-contract.md; the engine:
 * docs/adr/0047-calculation-engine.md; the stored proposal: docs/adr/0048-stored-proposal-and-price-stage.md; the
 * exports: docs/adr/0050-exports-print-route-and-pdf.md).
 *
 * What phase 5 serves (prompt 3 section 10, phase 5; PRD R-109 to R-116, R-118, R-119, R-127, R-066's export):
 * - **Generate** stores a preliminary proposal: a snapshot of the candidate ids and formula versions it used, each
 *   output's result (a figure the engine produced, or what was missing), an inputs hash, the documents still being
 *   read, and nothing else (guardrails 2.4 "A generated proposal keeps a snapshot"). It writes no owner answer and
 *   accepts no suggestion (rule 3; US-PROPOSAL-01 AC3). It is never blocked (rule 7): no dialog, no disabled button,
 *   the generating state (UD-07) while the request runs, the failed state (UD-47) when it fails.
 * - **The stored proposal** (UD-06), read as generated, never with newer values mixed in (US-PROPOSAL-03 AC3); a
 *   figure whose inputs changed since carries "Out of date, recalculating" (2.4; 2.8). Its head carries what the
 *   Overview would (UD-01; rule 10 stage 2): the stage label read from stored records, the headline range or
 *   "Not available yet", and the estimate's open items. No separate Overview page is built (PRD R-116 and 10.2
 *   "Until decided", D-14, D-02): the stored proposal is the landing.
 * - **Prices** take their stage only from stored records (rule 10, "Stage 3 is derived, not passed"; R-127): stage 1
 *   "Indicative range" or stage 2 "Preliminary investment estimate" from the engine's output, "Formal quotation" only
 *   from a stored, current quotation record linked to the snapshot (G10-9: the display then names the record), and
 *   "Superseded: inputs changed on <date>" with the stage 2 label when that record's inputs changed (G10-2). No screen
 *   creates a record (PRD R-129 "Until decided"); none exists in the live app, so none is shown.
 * - **Reports** (DB-18): the generated outputs the owner produced (a proposal PDF each time one is exported), never
 *   "+ Generate Report", templates, "View", a Status column or a Compliance Report (R-119, R-120, R-123 "Until
 *   decided"); the proposal itself is not a row of its own (R-119: US-REPORTS-05 AC2 left off, D-02).
 * - **Exports**: the proposal PDF, printed from the print route of its snapshot (badges, ranges and sources inline,
 *   the appendix of every value's source, verification and method, the open items, the demo line on every page,
 *   the brand's light values on white paper, the logo once the approver accepts its render-test review entry, ADR 0050
 *   decision 7; 2.8 "Prominence"; G10-5); the Equipment register as a CSV with each value's badge
 *   and source beside it and Unknown as text (R-066; US-ASSETS-11 AC6; 7.1-r25). Each export is produced from stored
 *   records when it is requested, so erasure reaches it (rule 13; US-REPORTS-03 AC3) and a figure whose inputs changed
 *   carries "Out of date, recalculating" as in the app (US-REPORTS-02 AC5).
 *
 * Value ids added (every path segment starts with a letter; display.ts VALUE_ID_PATTERN):
 * - `proposal:<snapshotId>.generatedOn` (record: the generation date and time, "D MMM YYYY, HH:MM", so versions of one
 *   day read apart: US-PROPOSAL-11 AC3; phase 5 part B, DR-5);
 * - `proposal:<snapshotId>.headline.investment` (a `line` display, only when the head's investment output is an
 *   incomplete total: rule 1's "Incomplete: excludes <item names>" under the output's stage label, with no figure, as
 *   the head's `price.figure`; rule 1 "Material exclusions": "no headline ... is computed from it"; G1-2; phase 5 part
 *   B, V-1);
 * - `proposal:<snapshotId>.outputs.<output>` (the output's figure, with its stage label and any "Superseded" line among
 *   its own lines, or its "Not available yet" line naming what was missing at generation; phase 6, V-11: the
 *   `.stage` and `.superseded` displays of phase 5 are gone), `proposal:<snapshotId>.outputs.<output>.label` (the 2.8
 *   stage label naming an investment output that has no figure; G10-11);
 * - `proposal:<snapshotId>.indicators.<indicator>` (operating cost, payback, NPV, IRR: "Not available yet", naming
 *   what is missing; `financial-indicators`, `units-7.2.22`);
 * - `proposal:<snapshotId>.inputs.<subject kind>.<field path>` (an input as the snapshot used it, e.g.
 *   `inputs.building.grossFloorArea`, `inputs.project.scope.hvac`): never the field's current id, so one value id keeps
 *   one display (G2-7) while the current value differs;
 * - `proposal:<snapshotId>.lifeSafety.<system>` (Fire Safety's monitoring-only sentence) and
 *   `proposal:<snapshotId>.lifeSafety.interfacePoints` (rule 11's interface points, named with no figure);
 * - `proposal:<snapshotId>.drafted.<slot>` (an AI-drafted paragraph's prose, which holds no digit: the validator
 *   refuses one; its figures are value tokens rendered as their own value ids);
 * - `output:<outputId>.name|generatedAt|generatedBy` (Reports' rows and preview; `generatedAt` holds the date and
 *   time, bound; `name` names the snapshot's generation date and time: "Preliminary proposal generated D MMM YYYY,
 *   HH:MM", draft wording);
 * - the open items keep phase 3's ids (`project:<id>.openItems.*`, `project:<id>.documents.stillReading`): they are
 *   the project's now, as step 8 shows them (G2-7).
 */
import { z } from 'zod';
import { StepNumberSchema, screenEnvelope } from './common';
import { UuidSchema, ValueIdSchema } from './display';
import { ForYouItemSchema } from './steps';
import { EquipmentQuerySchema } from './workspace';

// ---------------------------------------------------------------------------------------------
// Prices (rule 10; R-127; G10-1, G10-2, G10-9)
// ---------------------------------------------------------------------------------------------

/** Rule 10's three stages, by the 2.8 stage label's registry id (packages/registry/src/copy/status-lines.ts). */
export const PRICE_STAGES = ['indicative_range', 'preliminary_investment_estimate', 'formal_quotation'] as const;
export const PriceStageSchema = z.enum(PRICE_STAGES);
export type PriceStage = z.infer<typeof PriceStageSchema>;

/**
 * An investment figure as the Price component renders it (one component, reading the stage from stored records; the
 * component never takes a stage of its own: rule 10, "Templates read the stage from the record. They never accept it
 * as a parameter"):
 * - `figure`: the figure's display (`proposal:<sid>.outputs.<output>`, or the head's `proposal:<sid>.headline.investment`
 *   over an incomplete total): a range with its Estimated badge, basis, method and status lines, or "Not available
 *   yet" naming what is missing, with its Add action where the owner has one (rule 7). **Each line is served once, in
 *   this display only** (phase 6, V-11 of phase 5 part B): the stage label the engine read from stored records (kind
 *   `stage_label`; none while no figure can be produced, G10-11) and, when a stored quotation record of the snapshot
 *   went stale, "Superseded: inputs changed on <date>" (status line `superseded_inputs_changed`, its date bound among the
 *   display's `parts`; the figure then at stage 2's label, G10-2). The kit's Price component reads both from these
 *   lines by kind and id, never by matching words, and no other display of the response holds either line;
 * - `stageId`: which stage the figure's label names (for layout and tests only; the words come from the display), or
 *   null while no figure can be produced;
 * - `quotationRecordId`: the stored quotation record the stage 3 label was derived from, only at stage 3 (equal to the
 *   figure display's `quotationRecordId`; G10-9), else null.
 * Until phase 6 the stage label and the Superseded line were also served as displays of their own (`stage`,
 * `superseded`), and the web deduplicated them by their words; both fields are gone (ADR 0049, amended in phase 6).
 */
export const PriceSchema = z.strictObject({
  figure: ValueIdSchema,
  stageId: PriceStageSchema.nullable(),
  quotationRecordId: UuidSchema.nullable(),
});
export type Price = z.infer<typeof PriceSchema>;

// ---------------------------------------------------------------------------------------------
// The stored proposal (UD-06, with UD-01's content at its head)
// ---------------------------------------------------------------------------------------------

/**
 * One output of the stored proposal, as its snapshot recorded it (2.4): the registry's output id
 * (`packages/registry/src/production/formulas.ts` OUTPUT), the formula and version that gave it or would have given
 * it, its display, and:
 * - `availability`: `figure` (the engine produced a calculated or estimated candidate, which the snapshot holds) or
 *   `not_available_yet` (what was missing at generation, named in the display: a SOVITECH dataset, a method no source
 *   defines yet, a unit, or an owner input with its Add action; rule 7);
 * - `incomplete`: a total the engine computed with material exclusions ("Incomplete: excludes <item names>", with the
 *   same prominence as the figure; rule 1; G1-2): no headline is taken from it;
 * - `outOfDate`: an input it read changed after generation; its display carries "Out of date, recalculating" and is
 *   never shown as current (2.4; US-PROPOSAL-10 AC2);
 * - `price`: investment outputs only (rule 10);
 * - `label` (optional, additive; the integrator, phase 5 part A; G10-11): for an investment output with no figure, the
 *   value id of the 2.8 stage label that names it beside its "Not available yet: …" line (`proposal:<sid>.outputs.
 *   <output>.label`, a `line` display: "Indicative range" for the benchmark output, "Preliminary investment estimate"
 *   for the output from this project's data; 2.8: "They are also the only ones used"), as step 8 names it (phase 3's
 *   `OutputAvailability.label`). It names the output and states no stage of a figure: `price.stageId` stays null, the
 *   figure's display carries no stage label, and the head shows none (G10-11: "The Proposal card names no stage while no investment figure can be produced"). Absent on
 *   an output with a figure (its Price shows the stage the engine read from stored records) and on every other output;
 *   never "Formal quotation".
 */
export const ProposalOutputSchema = z.strictObject({
  output: z.string().min(1),
  formula: z.strictObject({ id: z.string().min(1), version: z.string().min(1) }),
  display: ValueIdSchema,
  availability: z.enum(['figure', 'not_available_yet']),
  incomplete: z.boolean(),
  outOfDate: z.boolean(),
  price: PriceSchema.nullable(),
  label: ValueIdSchema.optional(),
});
export type ProposalOutput = z.infer<typeof ProposalOutputSchema>;

/**
 * The financial indicators the proposal names while their method and units are missing (R-111; US-PROPOSAL-04 AC5;
 * dashboards 7.1.1 "Missing units come first"; prompt 3 5.4 `financial-indicators`, `units-7.2.22`): each reads
 * "Not available yet", naming what is missing. ROI is not listed (dashboards 7.1 row "02 payback ...": "Drop 'ROI'
 * unless it has a registered formula").
 */
export const FINANCIAL_INDICATORS = ['operating_cost', 'payback', 'npv', 'irr'] as const;
export const FinancialIndicatorSchema = z.enum(FINANCIAL_INDICATORS);

/**
 * One system of the scope the snapshot holds (the owner's decisions, rule 3): its decision as used (`inputs.project.
 * scope.<system>`), whether the catalogue marks it life-safety (rule 11; the served flag, as System Scope reads it),
 * and its life-safety sentence where one applies (Fire Safety: "monitoring only (read-only); fire logic and fire-mode
 * interlocks remain in the fire system", G11-1's words, generated from stored state, never by the AI: R-113).
 */
export const ProposalScopeSystemSchema = z.strictObject({
  systemId: z.string().regex(/^[a-z][a-z_]*$/u),
  decision: ValueIdSchema,
  lifeSafety: z.boolean(),
  sentence: ValueIdSchema.nullable(),
});

/**
 * An AI-drafted paragraph (R-115; US-PROPOSAL-12), stored with the snapshot only after the output validator accepted
 * it, rendered by code: prose segments (no digit: the validator refuses one, G2-3) and value segments (a token the
 * request named, rendered as that value's own display, with its badge; rule 2 "Numbers in prose are references").
 * Empty while no key is set or the `ai-processor-route` gate allows no drafting for the project.
 */
export const DraftedParagraphSchema = z.strictObject({
  slot: z.string().regex(/^[a-z][A-Za-z0-9_]*$/u),
  segments: z.array(
    z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('prose'), text: z.string().min(1) }),
      z.strictObject({ kind: z.literal('value'), valueId: ValueIdSchema }),
    ]),
  ),
});

/** The open items, the project's now (rule 7, "Open items are short, and say who acts"; the same displays as step 8). */
export const OpenItemsSchema = z.strictObject({
  /** "<n> things for you to check" (G7-5), or null when none. */
  count: ValueIdSchema.nullable(),
  /** The top three "For you" items, ordered by their effect on the estimate. */
  items: z.array(ForYouItemSchema).max(3),
  /** "and <n> more", or null. */
  more: ValueIdSchema.nullable(),
  /** "SOVITECH will check" groups, one line each (G7-5, G1-7's "Site survey needed"). */
  sovitechWillCheck: z.array(ValueIdSchema),
});

/**
 * The stored proposal (UD-06), read from one snapshot. Every figure, breakdown and total comes from this snapshot's
 * id (G9-8); every value renders through the Value or Price component (R-111; 2.8). Sections:
 * - `headline` (UD-01's content, R-116 "Until decided"; rule 10 stage 2): the investment output that carries the stage
 *   (stage 2, or its stage 1 fallback where rule 7 allows one: G7-2a), the open items, and "Still reading <n> files.
 *   Your estimate will update when they finish." while analysis runs (rule 7). When that output is an incomplete total,
 *   its price's `figure` is `proposal:<sid>.headline.investment`, which reads "Incomplete: excludes <item names>" under
 *   the stage label and holds no figure (rule 1; G1-2); the Investment section keeps the figure with that line;
 * - `investment`: rule 10's outputs (stage 1 and stage 2) with the exclusions (G10-7) and the provisional-inputs lines
 *   in their displays;
 * - `points`: hardware I/O, integration and virtual, never one priced total (rule 8; G9-3), and rule 11's interface
 *   points named with no figure (R-112; G11-12);
 * - `energy`: annual energy and savings, always Estimated when shown (rule 10, "could save");
 * - `indicators`: operating cost, payback, NPV, IRR ("Not available yet");
 * - `measures`: the measures' priority order (the SOVITECH function set; rule 9);
 * - `scope`: the systems in scope and the exclusions, as the snapshot holds the decisions;
 * - `basis`: the inputs the outputs read, as the snapshot used them;
 * - `basisGroups` (phase 6, DR-12): the same inputs in `basis`'s order, in groups by intake step (`step`, which the page
 *   names by that step's own title; null for an input no intake step shows, none in production): together the groups
 *   hold every basis value once, in order;
 * - `whatWeStillNeed`: the open items once (rule 7, "In the proposal document. Open items appear once");
 * - `drafted`: AI-drafted paragraphs (none in the live app: no key);
 * - `versions`: every stored version, newest first (US-PROPOSAL-11 AC3), and whether this is the latest.
 */
export const ProposalViewSchema = z.strictObject({
  snapshotId: UuidSchema,
  generatedOn: ValueIdSchema,
  latest: z.boolean(),
  headline: z.strictObject({
    investment: z.strictObject({ output: z.string().min(1), price: PriceSchema }),
    openItems: OpenItemsSchema,
    stillReading: ValueIdSchema.nullable(),
  }),
  investment: z.strictObject({ outputs: z.array(ProposalOutputSchema), exclusions: z.array(ValueIdSchema) }),
  points: z.strictObject({ outputs: z.array(ProposalOutputSchema), interfacePoints: ValueIdSchema }),
  energy: z.strictObject({ outputs: z.array(ProposalOutputSchema) }),
  indicators: z.array(z.strictObject({ indicator: FinancialIndicatorSchema, display: ValueIdSchema })),
  measures: z.strictObject({ outputs: z.array(ProposalOutputSchema) }),
  scope: z.strictObject({ systems: z.array(ProposalScopeSystemSchema), exclusions: z.array(z.string().regex(/^[a-z][a-z_]*$/u)) }),
  lifeSafety: z.array(ValueIdSchema),
  basis: z.array(ValueIdSchema),
  basisGroups: z.array(z.strictObject({ step: StepNumberSchema.nullable(), values: z.array(ValueIdSchema).min(1) })),
  whatWeStillNeed: OpenItemsSchema,
  drafted: z.array(DraftedParagraphSchema),
  versions: z.array(z.strictObject({ snapshotId: UuidSchema, generatedOn: ValueIdSchema })),
});
export type ProposalView = z.infer<typeof ProposalViewSchema>;

/** `GET /api/projects/:projectId/proposals/:snapshotId` (`proposals.view`). */
export const ProposalResponseSchema = z.strictObject({ ...screenEnvelope, view: ProposalViewSchema });
export type ProposalResponse = z.infer<typeof ProposalResponseSchema>;

/**
 * `GET /api/projects/:projectId/proposals` (`proposals.list`): the stored versions, newest first, each with its
 * generation date (a `record` display). Empty when no proposal was generated: the landing then shows phase 3's
 * preview (`proposal.preview`: what each output still needs) and the way to generate (step 8).
 */
export const ProposalVersionsResponseSchema = z.strictObject({
  ...screenEnvelope,
  view: z.strictObject({ versions: z.array(z.strictObject({ snapshotId: UuidSchema, generatedOn: ValueIdSchema })) }),
});
export type ProposalVersionsResponse = z.infer<typeof ProposalVersionsResponseSchema>;

/**
 * `POST /api/projects/:projectId/proposals` (`proposals.generate`, CSRF): Generate (R-109). The body names nothing:
 * generation reads stored state only and writes no answer (rule 3; US-PROPOSAL-01 AC3). Answers the new snapshot's id
 * (201). One request per press (the web's `useInFlight`); two presses store two versions, neither changing the other
 * (2.4; G4-45).
 */
export const GenerateRequestSchema = z.strictObject({});
export const GenerateResponseSchema = z.strictObject({ snapshotId: UuidSchema });
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

// ---------------------------------------------------------------------------------------------
// The print route and the exports (R-118; ADR 0050)
// ---------------------------------------------------------------------------------------------

/**
 * `GET /api/projects/:projectId/proposals/:snapshotId/print` (`proposals.print`): what the print route renders and
 * the PDF prints. The proposal as `proposals.view` serves it, with no action on any display (a printed page has no
 * button), a cover (the project's name, bound; the demo line comes with the envelope's project header and is printed
 * on every page), and the appendix: every value the proposal shows, each with its source, verification (its 2.8
 * badge) and method (calculated and estimated: formula, version, assumptions and range; rule 9), excerpts as stored
 * ("[erased]" after erasure, G13-3), followed by the open items (2.8 "Prominence"; G10-5; US-REPORTS-03).
 */
export const ProposalPrintViewSchema = z.strictObject({
  proposal: ProposalViewSchema,
  cover: z.strictObject({ projectName: ValueIdSchema }),
  appendix: z.strictObject({ values: z.array(ValueIdSchema), openItems: OpenItemsSchema }),
});
export const ProposalPrintResponseSchema = z.strictObject({ ...screenEnvelope, view: ProposalPrintViewSchema });
export type ProposalPrintResponse = z.infer<typeof ProposalPrintResponseSchema>;

/**
 * `POST /api/projects/:projectId/proposals/:snapshotId/exports` (`proposals.export`, CSRF): records a generated
 * output (a proposal PDF of this snapshot, started by the requesting user) and answers its id (201); the web then
 * downloads `exports.file`. Downloading is never disabled for missing data (US-REPORTS-02 AC6).
 */
export const ExportRequestSchema = z.strictObject({});
export const ExportResponseSchema = z.strictObject({ outputId: UuidSchema });
export type ExportResponse = z.infer<typeof ExportResponseSchema>;

// ---------------------------------------------------------------------------------------------
// Reports (DB-18; R-119)
// ---------------------------------------------------------------------------------------------

/** The kinds of generated output phase 5 produces: the proposal PDF only (the register exports are direct downloads). */
export const OUTPUT_KINDS = ['proposal_pdf'] as const;
export const OutputKindSchema = z.enum(OUTPUT_KINDS);

/** Reports' toolbar (US-REPORTS-05 AC14's search, category and date sort; no status filter: R-119). */
export const ReportsQuerySchema = z.strictObject({
  search: z.string().min(1).max(80).optional(),
  category: OutputKindSchema.optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});
export type ReportsQuery = z.infer<typeof ReportsQuerySchema>;

/**
 * One generated output (R-119): its name, generation date and time and who started it (`record` displays, bound; the
 * account's name, never implying review: 7.1.1-D8; a demo account on the demo, never a real person: 7.1.1-D6), its
 * category (the kind; the catalogue names it), the snapshot it prints, and "Superseded: inputs changed on <date>"
 * where that snapshot's quotation record's inputs changed (US-REPORTS-05 AC15; none in the live app). No Status
 * column, "⋯" menu or "View" (R-119; US-REPORTS-14 AC1; R-123 "Until decided").
 */
export const ReportRowSchema = z.strictObject({
  outputId: UuidSchema,
  kind: OutputKindSchema,
  snapshotId: UuidSchema,
  name: ValueIdSchema,
  generatedAt: ValueIdSchema,
  generatedBy: ValueIdSchema,
  superseded: ValueIdSchema.nullable(),
});
export type ReportRow = z.infer<typeof ReportRowSchema>;

/** `GET /api/projects/:projectId/reports` (`reports.list`): the rows of one page, previous and next only (no page numbers or "Showing" line: proposal 7.2.30). */
export const ReportsResponseSchema = z.strictObject({
  ...screenEnvelope,
  view: z.strictObject({
    state: z.enum(['none_generated', 'listed']),
    rows: z.array(ReportRowSchema),
    page: z.strictObject({ hasPrevious: z.boolean(), hasNext: z.boolean() }),
  }),
});
export type ReportsResponse = z.infer<typeof ReportsResponseSchema>;

// ---------------------------------------------------------------------------------------------
// The Equipment register's export (R-066; US-ASSETS-11 AC6; 7.1-r25; ADR 0050)
// ---------------------------------------------------------------------------------------------

/**
 * `GET /api/projects/:projectId/exports/equipment` (`exports.equipment`; not under `workspace/equipment/`, where the path would read as an asset's: `workspace.asset`): the register as the page's
 * filters narrow it, every row (no paging), as `text/csv` (UTF-8): for each cell its shown text, its badge and its source
 * line in three columns (7.1-r25: "keeps each badge on the same line as its figure", as columns in a tabular export), a
 * missing value as its missing wording ("Unknown", never 0 or blank: rule 1), the demo line as the file's first line on
 * the demo project (rule 10), and no count outside the engine. A direct download from current state, not a generated
 * output on Reports (ADR 0050).
 */
export const EquipmentExportQuerySchema = EquipmentQuerySchema.omit({ page: true });
export type EquipmentExportQuery = z.infer<typeof EquipmentExportQuerySchema>;

