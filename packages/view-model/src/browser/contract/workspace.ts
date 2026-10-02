/**
 * The workspace contract (phase 4; docs/adr/0044-workspace-api-contract.md; navigation:
 * docs/adr/0043-workspace-navigation-and-shell.md; the registers under v1.5 and the closed gates:
 * docs/adr/0045-workspace-registers-under-v1-5.md).
 *
 * After the intake, the owner explores the building and the scope (prompt 3 section 10, phase 4):
 * the shell (header, project sidebar with the project switcher and the project card, inspector,
 * 48px status footer with the demo line), Documents (DB-15), System Scope (DB-16), Equipment (DB-17)
 * with the asset detail (UD-08), Zones (DB-20) and Topology's Logical view (DB-08). Every view here
 * names values by value id only; every value, count and line with a number is one of the envelope's
 * display objects (common.ts `screenEnvelope`; display.ts). Fixed copy (titles, column heads, menu
 * items, empty states, the system descriptions) is the UI catalogue's (apps/web/src/copy/en.json,
 * `workspace.*` and `systems.*`).
 *
 * What these views never carry (each with its source; the API builder implements, the view-model
 * builder decides, the web renders):
 * - no model view, model canvas, plan, minimap, key plan, pin, highlight, zone fill, scale bar, north
 *   arrow, orientation word, "From a superseded revision" mark on a view, and no illustrative model:
 *   PRD R-054, R-064, R-070, R-073, R-075, R-078, R-081 to R-084 "Until decided" and R-080; the
 *   `ifc-values` and `view-provenance` gates (prompt 3 5.4); the owner's answer of 2026-10-02 ("Trial
 *   now, decide later": the viewer is a spike, wired nowhere);
 * - no live element: no status, last update, alarm, online/offline, "BMS LIVE", "Last sync",
 *   timeline or playback (rules 1 and 12; R-139; 7.1-r27; D14 for Equipment);
 * - nothing of SOVITECH's proposed design (controllers, automation stations, networks, buses,
 *   protocols, integrations, deliverables, data flow) presented as a fact: the design levels read
 *   "Not available yet" naming what is missing (rule 1; 2.1; proposal 7.2.10; dashboards 8.8; R-058,
 *   R-071); no view is labelled "proposed design";
 * - no supplier, vendor or brand beside a system, integration or line unless a stored supply-split
 *   value names it (R-072; rule 10);
 * - no person's name as a document's uploader or as the author of an event (R-018 "Until decided";
 *   proposals 7.2.6 and 7.2.26): a history entry names a role;
 * - no file size, chip count, page number, "Showing <a>-<b> of <n>" line or numeric chart tick
 *   (R-017 "Until decided"; proposal 7.2.30; prompt 3 section 7);
 * - no count outside the engine: equipment counts are counts by asset type (2.5), which read
 *   "Not available yet: SOVITECH asset taxonomy" while `dataset-asset-taxonomy` is closed, and zone
 *   and level counts are the phase 5 engine's (ADR 0045); a rule 7 open-items count stays a line
 *   derived from stored state, as in phase 3.
 *
 * Writes: System Scope's decisions (one route here), the owner's "Looks right" and "Something's
 * wrong" on a selection of equipment (`fields.acknowledge`, `fields.concernMany`), a zone's
 * corrections (`fields.edit` on the zone's fields), and Documents' upload, revision declaration and
 * delete (the phase 2 routes `uploads.*`, `documents.revisionOf`, `documents.delete`). Every owner
 * write takes the project's write lock (`lockProjectWrites`, ADR 0036 decision 13), and every write
 * button sends one request per press (the web's `useInFlight`).
 */
import { z } from 'zod';
import { IsoTimestampSchema, screenEnvelope } from './common';
import { FieldRefSchema, LineSchema, UuidSchema, ValueIdSchema } from './display';
import { VisibleSuggestionSchema } from './actions';

// ---------------------------------------------------------------------------------------------
// The pages (ADR 0043)
// ---------------------------------------------------------------------------------------------

/**
 * The built workspace pages, in the project sidebar's order (the approved project list of screens
 * 15 to 18 and 20, dashboards-spec 2.4.2 "Project", keeping only built pages: PRD R-146 "Until
 * decided": "Each built workspace page is reachable from the project sidebar, and no tab, sidebar
 * item or link leads to a page that is not built"):
 * - `proposal`: the landing after Generate, in the slot the approved list gives Overview, which is
 *   not built (PRD 10.2: "no separate Overview or Property page is built, and after Generate the
 *   owner sees the stored proposal"); phase 3's proposal page until phase 5 stores a proposal;
 * - `system_scope` (DB-16), `topology` (DB-08, its Logical view only: R-073), `zones` (DB-20, List
 *   only: R-063), `equipment` (DB-17, its list only: R-070, R-084), `documents` (DB-15).
 * Not in the list, with the reason: Overview and Property (R-050, PRD 10.2: not built while D-02 is
 * open), Alarms (operations; the `operations` gate), Reports (phase 5), Metrics (phase 6).
 */
export const WORKSPACE_PAGES = ['proposal', 'system_scope', 'topology', 'zones', 'equipment', 'documents'] as const;
export const WorkspacePageSchema = z.enum(WORKSPACE_PAGES);
export type WorkspacePage = z.infer<typeof WorkspacePageSchema>;

/**
 * An owner action a view offers beside a "Not available yet" line or an empty register, each a link
 * to a built page (rule 7: "'Not available yet' never appears alone. It names what is missing and
 * offers the action"; prompt 3 5.3: "with an action where the owner has one"; PRD R-012 "Until
 * decided": an action "opens a built page"). Labels are the catalogue's (`workspace.actions.*`).
 * - `upload_document`: opens Documents with its upload surface open (UD-21);
 * - `enter_floors`: opens step 3, where the floors row has Edit (R-077: "with actions to upload a
 *   document or enter the floors");
 * - `choose_systems`: opens System Scope (R-071: "with the action to choose them").
 */
export const WORKSPACE_ACTIONS = ['upload_document', 'enter_floors', 'choose_systems'] as const;
export const WorkspaceActionSchema = z.enum(WORKSPACE_ACTIONS);
export type WorkspaceAction = z.infer<typeof WorkspaceActionSchema>;

/**
 * What a register page says when it has no row (true copy only, chosen from stored state, never a
 * "not found" claim that no completed AI run supports: rule 12, G12-8; the step 3 `intro` reading of
 * phase 3, ADR 0039):
 * - `no_documents`: on Equipment and Zones, the project never had a document (a document uploaded
 *   and then deleted counts: the copy says none was uploaded, rules 1 and 12; G12-11); on
 *   Documents, no document is listed ("No documents yet");
 * - `reading`: a document is queued or being read;
 * - `none_read`: documents exist and nothing of this register came from them (the copy never says
 *   they were searched);
 * - `listed`: rows exist.
 */
export const REGISTER_STATES = ['no_documents', 'reading', 'none_read', 'listed'] as const;
export const RegisterStateSchema = z.enum(REGISTER_STATES);
export type RegisterState = z.infer<typeof RegisterStateSchema>;

// ---------------------------------------------------------------------------------------------
// The level register (PRD R-076, R-077; rule 8 "Floors"; ADR 0045)
// ---------------------------------------------------------------------------------------------

/**
 * A level of the level register: derived on read, by one function, from the floor structure's
 * facts (`building.floors` by level type), never from a sheet count, a model's storeys, the building
 * type or a mockup (R-076). `key` is `<level type>_<n>` (`below_ground_2`, `ground_1`, `upper_3`),
 * the filter's query value; `label` the value id of its generated label
 * (`building:<id>.levels.<key>`), the same display on every page (G2-7). Until D-18 decides the label
 * scheme, labels follow the document's own notation and numbering (rule 8: "Numbering follows the
 * document"; PRD R-076 interim).
 */
export const LevelOptionSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z_]*_[1-9][0-9]{0,2}$/u),
  label: ValueIdSchema,
});
export type LevelOption = z.infer<typeof LevelOptionSchema>;

/**
 * The floor list and floor filter of every workspace page (R-077):
 * - `known`: the levels in building order (the filter adds "All floors", catalogue copy); `unstated`
 *   names, in one line, the level types no source states (rule 8: "Parts with no source are
 *   Unknown"), or is null;
 * - `unknown`: no floor structure is known: `line` reads "Not available yet: floor structure", with
 *   `actions` upload_document and enter_floors (G7-14);
 * - `conflict`: the floor field is in conflict: no list is built from either value (rule 4: "It
 *   never runs on one of the values"). `line` reads "Not available yet: two values for floors"
 *   (rule 4, "Until a conflict is resolved"), and never appears alone (rule 7): `field` is the
 *   floors field's own display as step 3 resolves it (`building:<id>.floors`, the same display on
 *   every page, G2-7): Two values, both readings with their sources, and, where the conflict is
 *   routed to SOVITECH, rule 4's routing line "Documents disagree on this. A SOVITECH engineer will
 *   check it." (PRD R-077 Guardrail behaviour); `actions` is `enter_floors` (rule 4: "with the
 *   action to resolve it": step 3, where the floors row offers the owner's resolution), or none
 *   when the field's display carries the routing line (the owner does not arbitrate an engineer's
 *   conflict, rule 4 "Routing"; `building.floors` is confirmBy engineer). G7-16.
 */
export const LevelRegisterSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('known'), levels: z.array(LevelOptionSchema).min(1), unstated: ValueIdSchema.nullable() }),
  z.strictObject({ state: z.literal('unknown'), line: ValueIdSchema, actions: z.array(WorkspaceActionSchema) }),
  z.strictObject({ state: z.literal('conflict'), line: ValueIdSchema, field: ValueIdSchema, actions: z.array(WorkspaceActionSchema) }),
]);
export type LevelRegister = z.infer<typeof LevelRegisterSchema>;

// ---------------------------------------------------------------------------------------------
// The frame: project card, footer, levels (GET /api/projects/:projectId/workspace)
// ---------------------------------------------------------------------------------------------

/**
 * The project card at the foot of the sidebar (PRD R-049; 7.1-r7, 7.1.1-E3; US-REVIEW-14): the
 * building's key facts through the value component, the same value ids as step 3 and step 8 (G2-7):
 * the project type (the step 1 answer, Provided by you), the building type with its badge, the gross
 * floor area with its basis, the rooms with what they count (all spaces never shown as guest rooms:
 * G9-6), and the floors by level type. No photo, no Status or project-phase line, no "BMS Platform"
 * (R-049; proposals 7.2.9, 7.2.10, 7.2.11), no currency while no price exists.
 */
export const ProjectCardSchema = z.strictObject({
  projectType: ValueIdSchema,
  buildingType: ValueIdSchema,
  grossFloorArea: ValueIdSchema,
  rooms: z.array(ValueIdSchema),
  floors: z.array(ValueIdSchema),
});
export type ProjectCard = z.infer<typeof ProjectCardSchema>;

/**
 * The 48px status footer (R-139: a drawn footer "carries only 2.8 status lines, rule 7's 'Still
 * reading <n> files…' notice and, on a project flagged demo, 'Demo data, not an assessment of the
 * real building'"). The demo line is the envelope's `project.demoLine` (set from the flag, rule 10);
 * `stillReading` the bound line while any analysis runs. What else a footer's "data status" says is
 * D-90, open: nothing else is shown.
 */
export const StatusFooterSchema = z.strictObject({ stillReading: ValueIdSchema.nullable() });

export const WorkspaceFrameViewSchema = z.strictObject({
  pages: z.array(WorkspacePageSchema).min(1),
  projectCard: ProjectCardSchema,
  footer: StatusFooterSchema,
  levels: LevelRegisterSchema,
});
export const WorkspaceFrameResponseSchema = z.strictObject({ ...screenEnvelope, view: WorkspaceFrameViewSchema });
export type WorkspaceFrameResponse = z.infer<typeof WorkspaceFrameResponseSchema>;

// ---------------------------------------------------------------------------------------------
// Documents (DB-15; PRD R-016 to R-019, R-022, R-028; UD-21, UD-22, UD-42, UD-43)
// ---------------------------------------------------------------------------------------------

/**
 * The category chips (7.1.1-D3: "Stored as the DocumentRecord kind, shown through a fixed mapping";
 * the mapping is new Q10, D-24: this one is ADR 0045's default, reversible). "All documents" is the
 * catalogue's first chip and lists every row. A document whose kind no classifier set (every
 * document in this build: the upload stores its default and no classifier runs, US-DOCS-08) has
 * `category` null, appears under "All documents" only, and its Category cell reads Unknown (G1-26).
 * No chip shows a count (R-017 "Until decided").
 */
export const DOCUMENT_CATEGORIES = ['architectural', 'mep', 'operational', 'regulatory', 'other'] as const;
export const DocumentCategorySchema = z.enum(DOCUMENT_CATEGORIES);
export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;

/** The fixed mapping from guardrails 2.3's `DocumentRecord.kind` to a chip (ADR 0045; D-24). */
export const KIND_TO_CATEGORY = {
  architectural: 'architectural',
  mep: 'mep',
  electrical: 'mep',
  existing_bms: 'operational',
  energy_bill: 'operational',
  certificate: 'regulatory',
  specification: 'other',
  boq: 'other',
  photo: 'other',
  other: 'other',
} as const satisfies Record<string, DocumentCategory>;

/** The file's format, for its row icon only (a record attribute, never a value; no file size: R-017). */
export const DOCUMENT_FORMATS = ['pdf', 'xlsx', 'ifc', 'rvt', 'dwg', 'docx', 'jpg', 'png', 'zip', 'other'] as const;
export const DocumentFormatSchema = z.enum(DOCUMENT_FORMATS);

/**
 * One row of the Documents register (US-DOCS-12; R-016): the file name as uploaded, served through
 * `servedFileName` (bidirectional and format controls stripped, G2-14; the stored name kept), the
 * category (`document:<id>.kind`: Unknown while unclassified, G1-26; Likely or Possible once an AI
 * classification exists; no Edit, proposal 7.2.26), the revision as written (`document:<id>.revision`:
 * "none stated" for an analysed document with none written, Unknown for one not analysed: US-DOCS-04
 * AC7, US-DOCS-12 AC2), the stage (`document:<id>.stage`: Unknown unless stated; a model's always
 * Unknown, R-022, R-028), the date added (`addedAt`: record metadata shown as a date in a `<time>`,
 * traceability 10.2 item 13; the render allowlist's `date-day-month-year`), and its 2.8 status line
 * or coverage (`status`, as step 2's `FileRow.status`). No Uploaded By (R-018), no size (R-017), no
 * Description (R-019), no model-check, schema or IDS line on any owner row (R-022; ifc-input 6.2.14).
 * A withdrawn or erased document is not listed (US-DOCS-12 AC6).
 */
export const DocumentRowSchema = z.strictObject({
  documentId: UuidSchema,
  fileName: ValueIdSchema,
  format: DocumentFormatSchema,
  category: DocumentCategorySchema.nullable(),
  categoryValue: ValueIdSchema,
  revision: ValueIdSchema,
  stage: ValueIdSchema,
  addedAt: IsoTimestampSchema,
  status: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('progress'), line: ValueIdSchema.optional() }),
    z.strictObject({ kind: z.literal('line'), valueId: ValueIdSchema }),
  ]),
  /** The document this one is a declared revision of as the derive applies it (2.3 `supersedes`, set by the owner or an engineer, UD-43; one direction per pair, none on a cycle: G4-44): its file name's value id, or null. */
  revisionOf: ValueIdSchema.nullable(),
  /** Whether the stored original can be downloaded (served only after the project access check: `documents.file`; US-DOCS-14 AC5). */
  downloadable: z.boolean(),
});
export type DocumentRow = z.infer<typeof DocumentRowSchema>;

/**
 * `GET /api/projects/:projectId/workspace/documents`: every listed document (a project holds tens,
 * so the web filters by chip and file name, sorts by column and pages with previous and next, with no
 * page numbers: R-017 "Until decided"). `stillReading`: rule 7's line while any analysis runs. The
 * upload surface (UD-21) reuses step 2's dropzone and the phase 2 upload routes, inline on the page,
 * never a dialog and never blocking (US-DOCS-13). No preview image (US-DOCS-14 AC2 applies only to "a
 * document with a preview"; an image of a page holds digits the render test cannot read, so a preview
 * needs a `render.unreadable` entry, a loosening: proposal P-4-DOCUMENT-PREVIEW).
 */
export const DocumentsViewSchema = z.strictObject({
  state: RegisterStateSchema,
  rows: z.array(DocumentRowSchema),
  stillReading: ValueIdSchema.nullable(),
});
export const DocumentsResponseSchema = z.strictObject({ ...screenEnvelope, view: DocumentsViewSchema });
export type DocumentsResponse = z.infer<typeof DocumentsResponseSchema>;

/**
 * `GET /api/projects/:projectId/workspace/documents/:documentId/delete-effect` (UD-42; 7.1.1-D4;
 * US-DOCS-21 AC1): what Delete will do, stated before anything is removed. `effect` is a `line`
 * display object (`document:<id>.deleteEffect`), "<n> values will return to Unknown" (singular "1
 * value will return to Unknown"), n derived from stored state with the document removed (the one
 * derive and the asset register's, ADR 0045 decision 7 as amended in part B): the fields that hold a
 * value now and none after, and the assets counted now and not after, each tag a value only this
 * document holds (2.3, "Deleting a document"; 2.5; a candidate with evidence from another active
 * document keeps it, US-DOCS-21 AC4; deleting a declared newer revision brings the older value
 * back; G4-39, G4-41, G4-42). The confirmation is an inline region in
 * the inspector or under the row, never a dialog (rule 7, "never blocks"; traceability 10.2 item 15),
 * with Delete and Cancel; Delete then sends `documents.delete` (rule 13's erasure job). Step 2 has no
 * delete and no confirmation (new Q9; US-DOCS-03 AC11).
 */
export const DeleteEffectViewSchema = z.strictObject({ documentId: UuidSchema, fileName: ValueIdSchema, effect: ValueIdSchema });
export const DeleteEffectResponseSchema = z.strictObject({ ...screenEnvelope, view: DeleteEffectViewSchema });
export type DeleteEffectResponse = z.infer<typeof DeleteEffectResponseSchema>;

// ---------------------------------------------------------------------------------------------
// System Scope (DB-16; PRD R-051 to R-055, R-058, R-072; US-SCOPE-05 to US-SCOPE-08, US-SCOPE-10)
// ---------------------------------------------------------------------------------------------

/**
 * One system of the catalogue (the eight of step 4: R-055 "Until decided"; prompt 3 5.2 "Systems
 * catalogue"):
 * - `decision`: the owner's scope decision (`project:<id>.scope.<system>`), the same value id as step
 *   4's card and step 8's row (G2-7): Provided by you, Suggested (while a visible suggestion is not
 *   yet written), or Not provided yet; never drawn as off or excluded when not decided, no "Planned",
 *   no Coverage (R-052; 7.1.1-C4);
 * - `included`: the switch's state (a real input with role switch): the stored decision is include,
 *   or a visible suggestion is shown;
 * - `suggestion`: Suggested with its one-line reason, only from a detection, never on a life-safety
 *   or never-preselected system (rule 11; section 5 step 4; D-64; G11-10); none exists while no
 *   detection field is registered (P-3-DETECTION-FIELDS);
 * - `equipment`: the system's equipment by asset type (`project:<id>.register.<system>`, the same id
 *   as Topology's group: G2-7): "Not available yet: SOVITECH asset taxonomy" while
 *   `dataset-asset-taxonomy` is closed (the gate's closed behaviour; 2.5 "Counts are shown broken down
 *   by asset type");
 * - `points`: "Not available yet: SOVITECH point templates" (R-053 "Until decided"; the item is under
 *   SOVITECH will check), never one priced total, never compared with a typical building;
 * - `levels`, `zones`: the detail panel's register queries (`project:<id>.levels.<system>`,
 *   `project:<id>.zones.<system>`): Unknown while no asset or zone has a location or system (ADR 0045);
 * - Fire Safety's description is the monitoring-only text on every surface (§5-4b; catalogue
 *   `systems.fire_safety.description`), and its fire-alarm input and fire-mode status stay in the
 *   point list whatever its decision (G11-3, phase 5).
 * No Controllers, Network or Integrations tab, INTEGRATION SCOPE or KEY DELIVERABLES (R-058); no
 * canvas, 3D / 2D / Section control or view-mode control (R-054, R-074); no "Edit Scope" button (it
 * repeats the row's switch; listed for the owner).
 */
export const SystemScopeRowSchema = z.strictObject({
  systemId: z.string().min(1),
  lifeSafety: z.boolean(),
  neverPreselected: z.boolean(),
  decision: ValueIdSchema,
  included: z.boolean(),
  suggestion: z.strictObject({ reason: LineSchema }).nullable(),
  equipment: ValueIdSchema,
  points: ValueIdSchema,
  levels: ValueIdSchema,
  zones: ValueIdSchema,
});
export type SystemScopeRow = z.infer<typeof SystemScopeRowSchema>;

/**
 * `GET /api/projects/:projectId/workspace/system-scope` (R-052 "Until decided": reached from the
 * sidebar and from "← Back to System Scope" on Equipment and Zones; "Save and Continue →" opens
 * Zones; "← Back to Topology" shown, since Topology's Logical view is built in this phase).
 * `questionId` is the scope question (`q.project.systemsInScope`).
 */
export const SystemScopeViewSchema = z.strictObject({
  questionId: z.string().min(1),
  systems: z.array(SystemScopeRowSchema).length(8),
});
export const SystemScopeResponseSchema = z.strictObject({ ...screenEnvelope, view: SystemScopeViewSchema });
export type SystemScopeResponse = z.infer<typeof SystemScopeResponseSchema>;

/**
 * One owner decision from System Scope's switch: the decision field (`project.scope.<system>` on the
 * project subject), `include` or `exclude`, and `corrects`, the candidates the screen showed as the
 * field's value (rule 4: "A correction is a resolution"; ADR 0036 decision 11: an answer must name
 * every value the field shows now, else 409 `shown_value_changed` and nothing is stored, G4-36).
 */
export const ScopeDecisionSchema = z.strictObject({
  field: FieldRefSchema,
  choice: z.enum(['include', 'exclude']),
  corrects: z.array(UuidSchema),
});

/**
 * `POST /api/projects/:projectId/workspace/system-scope/decisions` (CSRF; R-052; 7.1.1-C8; one
 * request per press). The server, under the project's write lock:
 * 1. writes each decision that differs from the stored one as a new `user` candidate with
 *    `user_confirmed` (2.1: an owner field); one equal to the stored decision writes nothing
 *    (7.1.1-C8: "Continue writes nothing for decisions already recorded and unchanged"); the earlier
 *    candidate stays in the history (rule 4; G4-40); a life-safety system may be included by the owner
 *    (opt-in) and is never included by the app;
 * 2. on "Save and Continue", accepts each visible suggestion the page reports that the server also
 *    makes now, as a new `user` candidate with `user_confirmed` and `accepted_suggestion` events
 *    naming what suggested it (rule 3; G3-20, as G3-4 for automation areas); any other is ignored and
 *    logged;
 * 3. answers the System Scope view as it now stands (derived on read, 2.4; dependent stored
 *    calculated values would read "Out of date, recalculating" until the engine appends their new
 *    result: none exists before phase 5).
 * No question, confirmation or required field is added (R-052); no dialog opens.
 */
export const ScopeDecisionsRequestSchema = z.strictObject({
  decisions: z.array(ScopeDecisionSchema).max(8),
  visibleSuggestions: z.array(VisibleSuggestionSchema).max(8),
});
export type ScopeDecisionsRequest = z.infer<typeof ScopeDecisionsRequestSchema>;

// ---------------------------------------------------------------------------------------------
// Equipment (DB-17; PRD R-065 to R-068; US-ASSETS-01 to US-ASSETS-11; UD-08, UD-26)
// ---------------------------------------------------------------------------------------------

/**
 * The query of `GET /api/projects/:projectId/workspace/equipment` (filters write nothing: R-066):
 * `system` (a catalogue system id), `level` (a `LevelOption.key`), `zone` (a zone subject id),
 * `badge` (a 2.8 badge id), `search` (the tag as written, up to 80 characters) and `page` (from 1;
 * 50 rows a page, previous and next only, no page numbers: R-017's reading for registers, ADR 0045;
 * the 5,000-row budget of prompt 3 section 11 is met by paging on the server, so no table or
 * virtual-list package is added).
 */
export const EquipmentQuerySchema = z.strictObject({
  system: z.string().regex(/^[a-z][a-z_]*$/u).optional(),
  level: z.string().regex(/^[a-z][a-z_]*_[1-9][0-9]{0,2}$/u).optional(),
  zone: UuidSchema.optional(),
  badge: z.string().regex(/^[a-z][a-z_]*$/u).optional(),
  search: z.string().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});
export type EquipmentQuery = z.infer<typeof EquipmentQuerySchema>;

/**
 * One asset of the register (2.5: one tag, one asset; untagged appearances are never listed as
 * assets or counted, they are for the engineer, G4-17): every cell a display object with its one
 * badge on its line (2.8 "Prominence"; the dense list's badge column is the type's badge):
 * - `tag` (`asset:<id>.tag`): the tag as written, From document with its source line;
 * - `type` (`asset:<id>.type`): Unknown, under SOVITECH will check, while `dataset-asset-taxonomy` is
 *   closed (R-067 "Until decided"); then Likely, Possible or SOVITECH will check (rule 3);
 * - `system`, `location`, `level`, `zone` (`asset:<id>.system|location|level|zone`): the registered
 *   asset fields' displays, or Unknown while the field is not registered (ADR 0045: asset attributes
 *   are registered together with the AI request that fills them, D-09); never blank, a dash or zero;
 *   the level named by the level register's label and the zone by its name, never the stored key or
 *   the zone's id (rule 8 "Floors"; G8-24); the tag without bidirectional or format controls (G2-15).
 * No Status, Last Update, Alarms, commissioning date or product photo (D14; R-066; proposal 7.2.9).
 * An asset whose type is Unknown or unverified is treated as possibly life-safety for every purpose:
 * nothing beyond view, log and documents is offered on it (prompt 3 5.2; rule 11); the owner sees no
 * new label.
 */
export const EquipmentRowSchema = z.strictObject({
  assetId: UuidSchema,
  tag: ValueIdSchema,
  type: ValueIdSchema,
  system: ValueIdSchema,
  location: ValueIdSchema,
  level: ValueIdSchema,
  zone: ValueIdSchema,
});
export type EquipmentRow = z.infer<typeof EquipmentRowSchema>;

/**
 * The Equipment view (R-066 "Until decided": DB-17's whole-building list, reached from the sidebar,
 * Zones' "View Equipment in Zone →" and System Scope; "← Back to System Scope").
 * - `total` (`project:<id>.register.total[...]`): the list's count line, naming the active filters;
 *   by asset type (2.5), so "Not available yet: SOVITECH asset taxonomy" while the gate is closed;
 * - `filters`: the options each filter offers (systems: the catalogue; levels: the level register;
 *   zones: the zone register's names; badges: those present) and the active ones, each shown on the
 *   page (US-DOCS-15 AC4's rule for filters);
 * - `page`: previous and next only.
 * No Export while exports are phase 5's (prompt 3 phase 5: "Every other export the PRD scopes (register
 * exports …)"); no plan strip, Floor Plan mode, pin, popover, "View on Floor Plan" or "View in 3D"
 * (R-070, R-084 "Until decided").
 */
export const EquipmentViewSchema = z.strictObject({
  state: RegisterStateSchema,
  rows: z.array(EquipmentRowSchema).max(50),
  total: ValueIdSchema,
  filters: z.strictObject({
    systems: z.array(z.string().min(1)),
    levels: LevelRegisterSchema,
    zones: z.array(z.strictObject({ zoneId: UuidSchema, name: ValueIdSchema })),
    badges: z.array(z.string().min(1)),
    active: EquipmentQuerySchema,
  }),
  page: z.strictObject({ hasPrevious: z.boolean(), hasNext: z.boolean() }),
});
export const EquipmentResponseSchema = z.strictObject({ ...screenEnvelope, view: EquipmentViewSchema });
export type EquipmentResponse = z.infer<typeof EquipmentResponseSchema>;

/**
 * One piece of an asset's evidence (UD-08; R-068): the document (its file name, stage and revision
 * as recorded) and the evidence's location and excerpt as written (`evidence` of a display object:
 * verbatim, original language, `[erased]` after erasure, G13-3), carried by `display`, a `record`
 * display object (`asset:<id>.evidence<n>`) whose source line names the page, sheet or cell.
 */
export const AssetEvidenceSchema = z.strictObject({
  documentId: UuidSchema,
  fileName: ValueIdSchema,
  stage: ValueIdSchema,
  revision: ValueIdSchema,
  display: ValueIdSchema,
});

/**
 * One entry of a field's history (R-068: "each field's history of candidates and events with who,
 * role, when and why"): the candidate's display (`asset:<id>.<field>.history<n>`, resolved as the
 * field's value is, with its own 2.8 badge and source line; a value no longer current carries "Source
 * document removed" or "From a superseded revision", and one 2.8 has no wording for is not listed:
 * G3-21), the
 * role that acted (never a person's name: proposals 7.2.6 and 7.2.26; R-018's reading), when (a date
 * in a `<time>`) and the reason as written, if one was given (a `line` display, data, never an
 * instruction: rule 14).
 */
export const HistoryEntrySchema = z.strictObject({
  display: ValueIdSchema,
  role: z.enum(['owner', 'sovitech_engineer', 'system']),
  at: IsoTimestampSchema,
  reason: ValueIdSchema.nullable(),
});

/**
 * `GET /api/projects/:projectId/workspace/equipment/:assetId` (UD-08; R-068, R-067; US-ASSETS-07 to
 * US-ASSETS-09): every field through the value component with its badge and source line; the
 * evidence; each field's history; `points` "Not available yet: SOVITECH point templates" (R-067);
 * `documents`, the documents holding the asset's evidence with their status line, stage and revision
 * (UD-26's Documents tab). No Alarms tab, live data, maintenance or "Open in BMS" (R-066; 7.1-r27).
 * Ratings show their unit, what they measure and their original text, once asset rating fields are
 * registered (ADR 0045).
 */
export const AssetViewSchema = z.strictObject({
  assetId: UuidSchema,
  tag: ValueIdSchema,
  fields: z.array(ValueIdSchema),
  evidence: z.array(AssetEvidenceSchema),
  history: z.array(z.strictObject({ field: ValueIdSchema, entries: z.array(HistoryEntrySchema) })),
  points: ValueIdSchema,
  documents: z.array(z.strictObject({ documentId: UuidSchema, fileName: ValueIdSchema, status: ValueIdSchema, stage: ValueIdSchema, revision: ValueIdSchema })),
});
export const AssetResponseSchema = z.strictObject({ ...screenEnvelope, view: AssetViewSchema });
export type AssetResponse = z.infer<typeof AssetResponseSchema>;

/**
 * `POST /api/projects/:projectId/fields/concern-many` (CSRF): "Something's wrong" on a selection of
 * equipment (R-065: "alone or for a selection"; rule 3): each candidate's concern as `fields.concern`
 * records it (the owner's rejection with no value of their own, for the engineer queue; G3-10;
 * refused on an engineer_verified value, G3-19), in one request under the project's write lock; a
 * candidate already rejected by the owner records nothing again. "Looks right" on a selection is the
 * existing `fields.acknowledge`, which takes many candidates (G3-3).
 */
export const ConcernManyRequestSchema = z.strictObject({ candidateIds: z.array(UuidSchema).min(1).max(500) });

// ---------------------------------------------------------------------------------------------
// Zones (DB-20; PRD R-060 to R-063; US-ZONES-01 to US-ZONES-04; UD-09, UD-27)
// ---------------------------------------------------------------------------------------------

/** The query of `GET /api/projects/:projectId/workspace/zones` (writes nothing: R-061). */
export const ZonesQuerySchema = z.strictObject({
  level: z.string().regex(/^[a-z][a-z_]*_[1-9][0-9]{0,2}$/u).optional(),
  system: z.string().regex(/^[a-z][a-z_]*$/u).optional(),
  search: z.string().min(1).max(80).optional(),
});
export type ZonesQuery = z.infer<typeof ZonesQuerySchema>;

/**
 * One zone of the zone register (R-060; 2.2: zones are subjects): its id and name as written, its
 * level label from the level register, what it is (HVAC control zone, lighting zone, fire compartment
 * or Unknown), its area with basis (or basis unknown with its original text; a drawn outline gives no
 * area, R-060), and the systems serving it as register queries (`zone:<id>.code|name|level|kind|area|
 * systems`). No Status column, status dot, "Active", Alarms or Environment tab, live reading, photo or
 * Schedules tab (R-061). With no zone field registered in production (ADR 0045), no zone exists in
 * this build; the register and its editor are proven with TEST registries through the API's registry
 * seam (ADR 0044).
 */
export const ZoneRowSchema = z.strictObject({
  zoneId: UuidSchema,
  code: ValueIdSchema,
  name: ValueIdSchema,
  level: ValueIdSchema,
  kind: ValueIdSchema,
  area: ValueIdSchema,
  systems: ValueIdSchema,
});
export type ZoneRow = z.infer<typeof ZoneRowSchema>;

/**
 * A zone's details (R-061's ZONE DETAILS): the row's fields with their Edit actions (UD-09: each
 * correction is `fields.edit` on the zone's field, appended in the owner's name; the shown candidate
 * gets the owner's rejection, G4-5, or, when engineer_verified, the field goes into conflict for the
 * engineer, G4-19; nothing is required; leaving or saving unchanged writes nothing), in the order
 * code, name, level, kind, area and description (`zone:<id>.description`: the description as a text
 * value with its source, US-ZONES-03 AC1, R-061; Unknown while the field is not registered; stored
 * text is data only, rule 14; not a column of the row); the system chips as their scope decisions'
 * display objects (`decision`, the same id as System Scope's row, G2-7), each with its catalogue
 * system id and its `lifeSafety` flag from the catalogue (rule 11; 7.1.1-L1; R-051: Fire Safety's
 * chip carries the monitoring-only wording, as System Scope's rows and Topology's groups do);
 * `equipment` the register query naming the zone (with "View Equipment in Zone →" opening Equipment
 * filtered by `zone`); `points` "Not available yet: SOVITECH point templates"; `documents` those
 * holding the zone's evidence.
 */
export const ZoneSystemDecisionSchema = z.strictObject({
  decision: ValueIdSchema,
  systemId: z.string().min(1),
  lifeSafety: z.boolean(),
});
export type ZoneSystemDecision = z.infer<typeof ZoneSystemDecisionSchema>;

export const ZoneDetailSchema = z.strictObject({
  zoneId: UuidSchema,
  fields: z.array(ValueIdSchema),
  systemDecisions: z.array(ZoneSystemDecisionSchema),
  equipment: ValueIdSchema,
  points: ValueIdSchema,
  documents: z.array(z.strictObject({ documentId: UuidSchema, fileName: ValueIdSchema, status: ValueIdSchema })),
});

/**
 * `GET /api/projects/:projectId/workspace/zones` (R-061 "Until decided": DB-20's layout, List (UD-27)
 * its only mode, the zone editor (UD-09) plain; reached from the sidebar and System Scope's "Save and
 * Continue →"; "← Back to System Scope"). No zone count while counts are the engine's (ADR 0045); no
 * "+ Add Zone" (R-062 interim), Matrix (R-063) or Floor Plan (R-064, R-084).
 */
export const ZonesViewSchema = z.strictObject({
  state: RegisterStateSchema,
  rows: z.array(ZoneRowSchema),
  details: z.array(ZoneDetailSchema),
  levels: LevelRegisterSchema,
  active: ZonesQuerySchema,
});
export const ZonesResponseSchema = z.strictObject({ ...screenEnvelope, view: ZonesViewSchema });
export type ZonesResponse = z.infer<typeof ZonesResponseSchema>;

// ---------------------------------------------------------------------------------------------
// Topology's Logical view (DB-08; DB-07 and DB-10 hold no mode in this build; PRD R-071 to R-073,
// R-075; US-TOPO-01 to US-TOPO-11)
// ---------------------------------------------------------------------------------------------

/**
 * One system group of the Logical view: one per system whose recorded decision is include (a
 * Suggested preselection not yet accepted adds no group, R-071): its decision display (the same id
 * as System Scope, G2-7), its documented equipment by asset type (`project:<id>.register.<system>`,
 * the same id as System Scope's row: G2-7; "Not available yet: SOVITECH asset taxonomy" while the gate
 * is closed), and, for a life-safety system, `monitoringOnly`: Fire Safety is drawn as its own system
 * with "monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system"
 * and a link in the monitoring direction only, never labelled or styled as a control command, and
 * never joined to another system's group (rule 11; 7.1-r18; 7.1.1-L4; R-072; G11-11). An asset's
 * interface shows a protocol only where a document names it (rule 1; G1-6, G1-27).
 */
export const TopologyGroupSchema = z.strictObject({
  systemId: z.string().min(1),
  decision: ValueIdSchema,
  equipment: ValueIdSchema,
  monitoringOnly: z.boolean(),
});

/**
 * `GET /api/projects/:projectId/workspace/topology` (R-071, S3, built in this phase; R-073 "Until
 * decided": the Logical view with no view-mode control and no separate LOGICAL tab; no Hybrid; no 3D
 * or 2D mode while the overlays and per-level plans are not built, R-075, R-084):
 * - `design` (`project:<id>.topology.design`): "Not available yet: SOVITECH's design of the
 *   controllers, networks and integrations" (proposal 7.2.10; dashboards 8.8): the management and
 *   automation levels, buses, protocols and data flow are not drawn (G1-27);
 * - `groups`: the field level, one group per included system, in the catalogue's order;
 * - `noDecision`: with no include decision recorded, "Not available yet" naming the systems in scope,
 *   with `choose_systems` (rule 7; G7-15), and no group.
 * No STATISTICS panel, "SYSTEM VIEW ● Live" bar, transport controls, "BMS LIVE" chip, KEY METRICS
 * counts or SYSTEM INTEGRATION STATUS ("Planned", "In Progress" and "Under Review" are not 2.8
 * wording) (R-071; 7.1-r27). Filters and links write nothing (rule 3).
 */
export const TopologyViewSchema = z.strictObject({
  design: ValueIdSchema,
  groups: z.array(TopologyGroupSchema),
  noDecision: z.strictObject({ line: ValueIdSchema, actions: z.array(WorkspaceActionSchema) }).nullable(),
  levels: LevelRegisterSchema,
});
export const TopologyResponseSchema = z.strictObject({ ...screenEnvelope, view: TopologyViewSchema });
export type TopologyResponse = z.infer<typeof TopologyResponseSchema>;

/** The query of `GET /api/projects/:projectId/workspace/topology` and `.../system-scope` (a shared floor selection, a view state that writes nothing: prompt 3 phase 4 "Shared floor selection"). */
export const LevelQuerySchema = z.strictObject({ level: z.string().regex(/^[a-z][a-z_]*_[1-9][0-9]{0,2}$/u).optional() });
