/**
 * The development-only admin area (phase 7; docs/adr/0053-phase-7-scope-and-the-admin-area.md; the build log, phase 7,
 * "Plan"): UD-39 (accounts, roles, projects and processors, read-only), UD-40 (reference datasets and their approval
 * status, read-only) and UD-41 (guardrail event counts, the paired speed and truth metrics, the calibration counts and the
 * erasure log, read-only). Prompt 3 section 9: "UD-39, users, roles and processors (processors read-only: choosing one
 * is build-readiness decision 2), UD-40, datasets read-only, and UD-41, guardrail events and erasure requests: phase 7,
 * as development-only admin that never creates approval records (5.4)".
 *
 * What the PRD's lines allow, and so what these views carry (each quoted in the build log, phase 7, "Plan"):
 * - **R-134** (S1, no gate): roles decide who may do what; holding `sovitech_admin` never permits verification (G10-3).
 *   **R-154 "Until decided"** (D-13): "No page creates accounts or grants roles, and roles come from the development
 *   roles table (US-ADMIN-16 AC1)." So the accounts view lists accounts, their current roles and every role event (each
 *   grant and revoke is an audited event: ADR 0013 decision 2), and offers no control.
 * - **R-143 "Until decided"** (D-09): "The Processors page says that none is chosen, and no owner document or excerpt is
 *   sent to any external service". `processors.state` is `none_chosen`: guardrails rule 13 lists no processor.
 * - **R-150 "Until decided"** (D-47, D-05, D-92): "The page lists each dataset and version with its approval status,
 *   which reads that it has no approval record while no approver is named, and it has no review, approval, edit or
 *   import control". No production dataset is declared ("0 datasets"), so the view lists each dataset the gates wait for
 *   (packages/registry/gates, `kind: dataset`), with no version received and no approval record. TEST datasets never
 *   appear (they load only inside the test runner); no IFC mapping table is listed as a dataset (R-132 "Until decided").
 * - **R-151** (S2, no gate): counts per guardrail event type for each project (and in all), each speed metric next to
 *   its truth metric (guardrails section 4, "Measure it"), and one erasure log entry per erasure job, built from its
 *   `erased` document event: who asked, in which role, when, which document and what was removed, never document text
 *   or an excerpt. **D-34's interim**: "The speed metrics that no event records are reported as 'not counted yet', never
 *   estimated, and every target reads 'Target not set'." No release is recorded with the events, so the split by
 *   release reads "not counted yet" too (a product doc issue).
 * - **R-152 "Until decided"** (D-53): "Corrections are counted per confidence tier and item type, and no tier's wording
 *   changes (US-ADMIN-22 AC1)." The calibration view counts corrections per tier and item type (the field) and shows
 *   that no tier's wording has dropped while the threshold is not set (docs/adr/0054).
 * - **R-155 "Until decided"** (D-25): "Deleting a document is the only erasure action, and no project-wide erasure form
 *   is built". The erasure log lists the jobs; nothing here starts one.
 *
 * **Who may read them.** A person holding `sovitech_admin`, signed in with the development login, and only while the
 * development login is on (ADR 0038 decision 6: the development accounts are set AND the API stores fixtures only).
 * Otherwise the routes answer 404 `admin_off` (the login is off) or 403 `admin_only` (no admin role). The store checks
 * the role again in its own definer functions (migration 0018; ADR 0053), which return ids, codes, counts and times
 * only: no candidate value, evidence, excerpt, extracted text, file name or project name (rule 13, "Project boundary";
 * ADR 0013 decision 5: holding `sovitech_admin` alone gives no access to a project's documents and values). A project is
 * named by its id, and the demo project's row carries 2.8's demo line, served with the row as `demoLine` (R-136's row
 * rule; G10-10 for every other row; added by the phase 7 integrator, P-7-ADMIN-ROW-DEMO-LINE).
 *
 * **Nothing here writes.** No route of this module changes state: no account, role, membership, approval record,
 * dataset, gate, threshold, budget, tolerance or estimation setting is created or changed from the admin area (prompt 3
 * 5.4: "No screen, admin page or script creates approval records or opens gates"; guardrails section 10, "Metrics prompt
 * a review, never an edit"; US-ADMIN-21 AC3; US-ADMIN-22 AC4).
 *
 * **Every number is bound.** Counts, ids, dates and stored texts (an account's name, a role event's reason) are display
 * objects under the value ids below, so the render test reads no digit outside a bound element (rule 2; G2-1). Every
 * value id a view names is among its response's display objects (`servesEveryAdminValueId`).
 *
 * Value ids (the subject kind lower case, every path segment starting with a letter; display.ts VALUE_ID_PATTERN):
 * - `account:<userId>.displayName` (a `record`: the name as created), `account:<userId>.roles.<role>.since` (a `line`:
 *   the date of the grant that holds now);
 * - `role_event:<eventId>.by` (who acted: an account's name, or the operator's login), `.at`, `.reason` (as recorded);
 * - `admin_project:<projectId>.id` (the project's id as text), `.createdOn`;
 * - `dataset:<datasetKey>.name` (what the gate waits for), `.version` ("No version received" while none is),
 *   `.approval` ("No approval record"), `.waitsFor` (the gates and the D id that wait for it);
 * - `guardrail_count:<projectId>.<eventType>` and `guardrail_count:all.<eventType>`; `guardrail_count:all.byRelease`;
 * - `metric:<projectId>.<metric>` and `metric:<projectId>.<metric>.target` for the six metrics of section 4;
 * - `calibration:all.threshold` (the threshold's state: not set while D-53 is open), `calibration:<tier>.wording` (the
 *   tier's wording as shown, and whether it dropped), `calibration:<tier>.items.<fieldKey>.corrections`;
 * - `erasure:<documentEventId>.project`, `.document`, `.by`, `.at`, `.removed`.
 *
 * Skeleton written by the phase 7 planner; the API builder serves it (apps/api/src/admin), the web builder draws it
 * (apps/web/src/admin).
 */
import { z } from 'zod';
import { AppRoleSchema, IsoTimestampSchema } from './common';
import { DisplayObjectsSchema, LineSchema, UuidSchema, VALUE_ID_PATTERN, ValueIdSchema } from './display';

// ---------------------------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------------------------

/** The admin pages phase 7 builds: UD-39, UD-40, UD-41, in the admin area's order. */
export const ADMIN_PAGES = ['accounts', 'datasets', 'guardrail_events'] as const;
export const AdminPageSchema = z.enum(ADMIN_PAGES);
export type AdminPage = z.infer<typeof AdminPageSchema>;

/** Section 8's event types, in its order (the domain's GUARDRAIL_EVENT_TYPES; a test keeps the two equal). */
export const ADMIN_GUARDRAIL_EVENT_TYPES = [
  'ai_output_rejected',
  'evidence_not_found',
  'question_for_known_field',
  'owner_corrected_inference',
  'engineer_corrected_accepted_item',
  'conflict_raised',
  'reserved_term_blocked',
  'embedded_instruction',
  'confirmation_budget_exceeded',
  'skipped',
] as const;
export const AdminGuardrailEventTypeSchema = z.enum(ADMIN_GUARDRAIL_EVENT_TYPES);
export type AdminGuardrailEventType = z.infer<typeof AdminGuardrailEventTypeSchema>;

/**
 * Guardrails section 4, "Measure it": each speed metric and the truth metric read next to it, in the table's order.
 * - `questions_per_project` with `owner_correction_rate` ("The owner correction rate on inferences");
 * - `confirmations_per_project` with `engineer_corrections_of_accepted_items` ("How often engineers later correct
 *   accepted items");
 * - `time_to_first_estimate` with `estimated_share_of_first_estimate` ("The share of estimated and provisional values in
 *   that estimate").
 */
export const SPEED_TRUTH_PAIRS = [
  { speed: 'questions_per_project', truth: 'owner_correction_rate' },
  { speed: 'confirmations_per_project', truth: 'engineer_corrections_of_accepted_items' },
  { speed: 'time_to_first_estimate', truth: 'estimated_share_of_first_estimate' },
] as const;
export const ADMIN_METRICS = [
  'questions_per_project',
  'owner_correction_rate',
  'confirmations_per_project',
  'engineer_corrections_of_accepted_items',
  'time_to_first_estimate',
  'estimated_share_of_first_estimate',
] as const;
export const AdminMetricSchema = z.enum(ADMIN_METRICS);
export type AdminMetric = z.infer<typeof AdminMetricSchema>;

/** Rule 3's three tiers as the value model stores them (high: Likely; medium: Possible; low: Please check or SOVITECH will check). */
export const CALIBRATION_TIERS = ['high', 'medium', 'low'] as const;
export const CalibrationTierSchema = z.enum(CALIBRATION_TIERS);
export type CalibrationTier = z.infer<typeof CalibrationTierSchema>;

/** What every admin response carries: when it was read, and the display objects it shows. No project header: no admin page is a project's screen. */
const adminEnvelope = {
  asOf: IsoTimestampSchema,
  displayObjects: DisplayObjectsSchema,
} as const;

/** Every value id a view names, wherever it sits in the view (a value id is the only string of a view that matches VALUE_ID_PATTERN). */
function valueIdsIn(value: unknown, into: Set<string>): Set<string> {
  if (typeof value === 'string') {
    if (VALUE_ID_PATTERN.test(value)) into.add(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) valueIdsIn(entry, into);
  } else if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) valueIdsIn(entry, into);
  }
  return into;
}

/** An admin response serves every value id its view names (as the Metrics responses do: phase 6 part B, A-8). */
function servesEveryAdminValueId(response: { readonly displayObjects: readonly { readonly valueId: string }[]; readonly view: unknown }, context: z.RefinementCtx): void {
  const served = new Set(response.displayObjects.map((display) => display.valueId));
  for (const valueId of valueIdsIn(response.view, new Set())) {
    if (!served.has(valueId)) context.addIssue({ code: 'custom', path: ['view'], message: `the view names ${valueId}, which the response does not serve (rule 7)` });
  }
}

/**
 * A project's row carries 2.8's demo line exactly when it is the demo's (rule 10, "Demo data": "labelled everywhere";
 * G10-10 for every other row), as the project list's rows do (`ProjectRowSchema.demoLine`). The line is the registry's
 * `demo_data` status line, served with the row, so the web holds none of its words (phase 7 integrator; P-7-ADMIN-ROW-DEMO-LINE).
 */
const demoLine = LineSchema.nullable();

function demoLineFollowsTheFlag(row: { readonly isDemo: boolean; readonly demoLine: { readonly id: string } | null }, context: z.RefinementCtx): void {
  if (row.isDemo !== (row.demoLine !== null)) {
    context.addIssue({ code: 'custom', path: ['demoLine'], message: row.isDemo ? "the demo project's row carries no demo line (rule 10)" : 'a row that is not the demo\'s carries a demo line (G10-10)' });
  } else if (row.demoLine !== null && row.demoLine.id !== 'demo_data') {
    context.addIssue({ code: 'custom', path: ['demoLine'], message: `the demo line is 2.8's demo_data status line, not ${row.demoLine.id}` });
  }
}

// ---------------------------------------------------------------------------------------------
// UD-39: accounts, roles, projects and processors (R-134; R-143 and R-154 "Until decided")
// ---------------------------------------------------------------------------------------------

export const AccountKindSchema = z.enum(['person', 'service', 'seed']);

/** One account and the roles it holds now (the latest grant or revoke per role decides: ADR 0013 decision 2). */
export const AdminAccountSchema = z.strictObject({
  userId: UuidSchema,
  /** `account:<userId>.displayName`. */
  name: ValueIdSchema,
  kind: AccountKindSchema,
  /** Each role held now, with the date of the grant that holds (`account:<userId>.roles.<role>.since`). */
  roles: z.array(z.strictObject({ role: AppRoleSchema, since: ValueIdSchema })),
  /** Whether the account is one the development login offers (SOVITECH_DEV_ACCOUNTS): synthetic, labelled as such. */
  development: z.boolean(),
});
export type AdminAccount = z.infer<typeof AdminAccountSchema>;

/** One audited grant or revoke (`app_role_events`), newest first. */
export const AdminRoleEventSchema = z.strictObject({
  eventId: UuidSchema,
  userId: UuidSchema,
  role: AppRoleSchema,
  change: z.enum(['granted', 'revoked']),
  /** `role_event:<eventId>.by`: the acting account's name, or the operator's login. */
  by: ValueIdSchema,
  /** `role_event:<eventId>.at`. */
  at: ValueIdSchema,
  /** `role_event:<eventId>.reason`, as recorded. */
  reason: ValueIdSchema,
});
export type AdminRoleEvent = z.infer<typeof AdminRoleEventSchema>;

/** One project, by its id only (no name: a project's name is the owner's step 1 answer, a value). */
export const AdminProjectSchema = z.strictObject({
  projectId: UuidSchema,
  /** `admin_project:<projectId>.id`: the id as text. */
  id: ValueIdSchema,
  /** The demo flag: the demo project's row carries the demo line, and no other row does (G10-10). */
  isDemo: z.boolean(),
  /** 2.8's demo line on the demo's row, `null` on every other (rule 10). */
  demoLine,
  /** `admin_project:<projectId>.createdOn`. */
  createdOn: ValueIdSchema,
  /** The members, by account id (each named by its account's display). */
  members: z.array(UuidSchema),
}).superRefine(demoLineFollowsTheFlag);
export type AdminProject = z.infer<typeof AdminProjectSchema>;

export const AccountsViewSchema = z.strictObject({
  accounts: z.array(AdminAccountSchema),
  roleEvents: z.array(AdminRoleEventSchema),
  projects: z.array(AdminProjectSchema),
  /** R-143 "Until decided" (D-09): no processor is chosen; guardrails rule 13 lists none. */
  processors: z.strictObject({ state: z.literal('none_chosen') }),
});
export type AccountsView = z.infer<typeof AccountsViewSchema>;

/** `GET /api/admin/accounts` (UD-39). */
export const AdminAccountsResponseSchema = z.strictObject({ ...adminEnvelope, view: AccountsViewSchema }).superRefine(servesEveryAdminValueId);
export type AdminAccountsResponse = z.infer<typeof AdminAccountsResponseSchema>;

// ---------------------------------------------------------------------------------------------
// UD-40: datasets (R-150 "Until decided"; R-141; R-132 "Until decided")
// ---------------------------------------------------------------------------------------------

/** A dataset key as the gates name it (`waitsFor[].dataset`), e.g. `sovitech-cost-ranges`. */
export const DatasetKeySchema = z.string().regex(/^[a-z][a-z0-9-]*$/u);

/** One reference dataset the app waits for or declares, read-only. */
export const AdminDatasetSchema = z.strictObject({
  datasetKey: DatasetKeySchema,
  /** `dataset:<datasetKey>.name`: what the gate's item names ("SOVITECH cost ranges and benchmarks"). */
  name: ValueIdSchema,
  /** `dataset:<datasetKey>.version`: the declared version, or the missing wording while none is received. */
  version: ValueIdSchema,
  /** `dataset:<datasetKey>.approval`: read from stored approval records; "No approval record" while no approver is named. */
  approval: ValueIdSchema,
  /** `dataset:<datasetKey>.waitsFor`: the gates that wait for it and the D id. */
  waitsFor: ValueIdSchema,
});
export type AdminDataset = z.infer<typeof AdminDatasetSchema>;

export const DatasetsViewSchema = z.strictObject({
  datasets: z.array(AdminDatasetSchema),
});
export type DatasetsView = z.infer<typeof DatasetsViewSchema>;

/** `GET /api/admin/datasets` (UD-40). */
export const AdminDatasetsResponseSchema = z.strictObject({ ...adminEnvelope, view: DatasetsViewSchema }).superRefine(servesEveryAdminValueId);
export type AdminDatasetsResponse = z.infer<typeof AdminDatasetsResponseSchema>;

// ---------------------------------------------------------------------------------------------
// UD-41: guardrail events, paired metrics, calibration counts, erasure log (R-151; R-152 and R-155 "Until decided")
// ---------------------------------------------------------------------------------------------

/** One project's counts per event type (`guardrail_count:<projectId>.<type>`), every type of section 8 present. */
export const GuardrailCountRowSchema = z.strictObject({
  projectId: UuidSchema,
  /** `admin_project:<projectId>.id`. */
  id: ValueIdSchema,
  isDemo: z.boolean(),
  demoLine,
  counts: z.array(z.strictObject({ type: AdminGuardrailEventTypeSchema, count: ValueIdSchema })),
}).superRefine(demoLineFollowsTheFlag);

/** One metric of section 4 for one project: its value (or "not counted yet") and its target ("Target not set"). */
export const MetricCellSchema = z.strictObject({
  metric: AdminMetricSchema,
  /** `metric:<projectId>.<metric>`. */
  value: ValueIdSchema,
  /** `metric:<projectId>.<metric>.target`. */
  target: ValueIdSchema,
});

/** One project's three pairs, each speed metric next to its truth metric (SPEED_TRUTH_PAIRS' order). */
export const MetricRowSchema = z.strictObject({
  projectId: UuidSchema,
  id: ValueIdSchema,
  isDemo: z.boolean(),
  demoLine,
  pairs: z.array(z.strictObject({ speed: MetricCellSchema, truth: MetricCellSchema })).length(SPEED_TRUTH_PAIRS.length),
}).superRefine(demoLineFollowsTheFlag);

/** Rule 3's calibration counts (R-152): corrections per tier and item type, and each tier's wording as shown. */
export const CalibrationViewSchema = z.strictObject({
  /** `calibration:all.threshold`: the threshold's state (not set while D-53 is open; ADR 0054). */
  threshold: ValueIdSchema,
  tiers: z.array(
    z.strictObject({
      tier: CalibrationTierSchema,
      /** `calibration:<tier>.wording`: the tier's wording as the owner sees it, and whether it dropped one step. */
      wording: ValueIdSchema,
      /** Whether the tier's wording reads one step lower now (never while the threshold is not set). */
      dropped: z.boolean(),
      /** Corrections per item type (`calibration:<tier>.items.<fieldKey>.corrections`). */
      items: z.array(z.strictObject({ fieldKey: z.string().min(1), corrections: ValueIdSchema })),
    }),
  ).length(CALIBRATION_TIERS.length),
});

/** One erasure job, from its `erased` document event and the erasure's audit record: ids, roles, times and counts only. */
export const ErasureEntrySchema = z.strictObject({
  documentEventId: UuidSchema,
  projectId: UuidSchema,
  isDemo: z.boolean(),
  demoLine,
  /** `erasure:<documentEventId>.project`: the project's id as text. */
  project: ValueIdSchema,
  /** `erasure:<documentEventId>.document`: the document's id as text (never its file name). */
  document: ValueIdSchema,
  /** Who asked, in which role: the owner (an account) or the system (2.3's `DocumentEvent` roles). */
  role: z.enum(['owner', 'system']),
  /** `erasure:<documentEventId>.by`: the owner's account name, or the system. */
  by: ValueIdSchema,
  /** `erasure:<documentEventId>.at`. */
  at: ValueIdSchema,
  /** `erasure:<documentEventId>.removed`: what was removed, as counts (excerpts erased, text parts deleted, values withdrawn). */
  removed: ValueIdSchema,
}).superRefine(demoLineFollowsTheFlag);
export type ErasureEntry = z.infer<typeof ErasureEntrySchema>;

export const GuardrailEventsViewSchema = z.strictObject({
  /** Counts per project, every project the store holds, demo included. */
  projects: z.array(GuardrailCountRowSchema),
  /** Counts in all (`guardrail_count:all.<type>`). */
  totals: z.array(z.strictObject({ type: AdminGuardrailEventTypeSchema, count: ValueIdSchema })),
  /** `guardrail_count:all.byRelease`: the split by release ("not counted yet": no release is recorded with the events). */
  byRelease: ValueIdSchema,
  metrics: z.array(MetricRowSchema),
  calibration: CalibrationViewSchema,
  /** One entry per erasure job, newest first. */
  erasures: z.array(ErasureEntrySchema),
});
export type GuardrailEventsView = z.infer<typeof GuardrailEventsViewSchema>;

/** `GET /api/admin/guardrail-events` (UD-41). */
export const AdminGuardrailEventsResponseSchema = z.strictObject({ ...adminEnvelope, view: GuardrailEventsViewSchema }).superRefine(servesEveryAdminValueId);
export type AdminGuardrailEventsResponse = z.infer<typeof AdminGuardrailEventsResponseSchema>;
