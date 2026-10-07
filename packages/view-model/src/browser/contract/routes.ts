/**
 * The route table of the API contract (the wizard, phase 3; the workspace, phase 4: workspace.ts,
 * docs/adr/0044-workspace-api-contract.md; the proposal, Reports and exports, phase 5: proposal.ts,
 * docs/adr/0049-proposal-reports-export-contract.md): every route the web calls, with its method,
 * path, whether it needs a session and the CSRF token, its request and response schemas, the
 * refusal codes it may answer, whether its 2xx responses carry display objects, and the stories,
 * functions and cases it serves. apps/api registers exactly these (a unit test of the API
 * builder's compares Fastify's routes with this table); apps/web's client calls only these; the
 * render test reads display objects from exactly the routes marked `servesDisplayObjects`
 * (`isDisplayObjectRequest`, which tests/e2e/render/api-display-objects.ts uses in phase 3).
 *
 * Refusals common to every route, not repeated below:
 * - 401 `not_signed_in` on every route with `session: true` when no session cookie holds a user;
 * - 403 `csrf_invalid` on every route with `csrf: true` when the `csrf-token` header does not
 *   match the CSRF cookie (the API maps @fastify/csrf-protection's errors to this code);
 * - 404 `not_found` for a project, document, upload or candidate the user cannot see (row-level
 *   security: another project reads as not found, rule 13);
 * - 400 `request_invalid` for a body, query or parameter the schema refuses;
 * - 403 with the store's refusal code when the store's guards refuse a write (StoreRefusal);
 * - 500 `internal_error`.
 * Every refusal body is `RefusalBody` (common.ts); logs carry codes and ids only (rule 13).
 */
import type { z } from 'zod';
import { DevAccountsResponseSchema, DevSignInRequestSchema, DevSignInResponseSchema, SessionResponseSchema, CsrfResponseSchema } from './auth';
import {
  AcknowledgeRequestSchema,
  ConcernRequestSchema,
  ConfirmRequestSchema,
  ContinueRequestSchema,
  ContinueResponseSchema,
  EditRequestSchema,
  FieldWriteResponseSchema,
  ResolveConflictRequestSchema,
  SkipRequestSchema,
} from './actions';
import { LateFindingsQuerySchema, LateFindingsResponseSchema } from './late-findings';
import { CreateProjectRequestSchema, CreateProjectResponseSchema, ProjectListResponseSchema } from './projects';
import { ExtractedResponseSchema, ProposalPreviewResponseSchema, StepResponseSchema, StepViewQuerySchema } from './steps';
import { CompleteUploadResponseSchema, CreateUploadRequestSchema, UploadStateSchema } from './uploads';
import {
  AssetResponseSchema,
  ConcernManyRequestSchema,
  DeleteEffectResponseSchema,
  DocumentsResponseSchema,
  EquipmentQuerySchema,
  EquipmentResponseSchema,
  LevelQuerySchema,
  ScopeDecisionsRequestSchema,
  SystemScopeResponseSchema,
  TopologyResponseSchema,
  WorkspaceFrameResponseSchema,
  ZonesQuerySchema,
  ZonesResponseSchema,
} from './workspace';
import {
  EquipmentExportQuerySchema,
  ExportRequestSchema,
  ExportResponseSchema,
  GenerateRequestSchema,
  GenerateResponseSchema,
  ProposalPrintResponseSchema,
  ProposalResponseSchema,
  ProposalVersionsResponseSchema,
  ReportsQuerySchema,
  ReportsResponseSchema,
} from './proposal';
import {
  CapexResponseSchema,
  FinancialOverviewResponseSchema,
  LifecycleResponseSchema,
  MetricsPrintQuerySchema,
  MetricsQuerySchema,
  OpexResponseSchema,
  PaybackResponseSchema,
} from './metrics';
import { AdminAccountsResponseSchema, AdminDatasetsResponseSchema, AdminGuardrailEventsResponseSchema } from './admin';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RouteSpec {
  readonly id: string;
  readonly method: Method;
  /** Fastify's path form: `:name` parameters. */
  readonly path: string;
  readonly session: boolean;
  readonly csrf: boolean;
  readonly request?: z.ZodType;
  readonly query?: z.ZodType;
  /** The 2xx body's schema; absent for a 204, for a file download, and for phase 2 routes the web does not call. */
  readonly response?: z.ZodType;
  /** Refusals beyond the common ones above: `<status> <code>`. */
  readonly refusals: readonly string[];
  /** Whether every 2xx response carries `displayObjects` (the render test reads exactly these). */
  readonly servesDisplayObjects: boolean;
  /** Story, function, requirement and case ids, and screens. */
  readonly serves: readonly string[];
  /**
   * Built in phase 2 (kept as they are), phase 3 (the wizard), phase 4 (the workspace: workspace.ts; docs/adr/0044),
   * phase 5 (the proposal, Reports and exports: proposal.ts; docs/adr/0049), phase 6 (the Metrics pages: metrics.ts;
   * docs/adr/0052) or phase 7 (the development-only admin area: admin.ts; docs/adr/0053).
   */
  readonly phase: 2 | 3 | 4 | 5 | 6 | 7;
}

const P = '/api/projects/:projectId';

export const ROUTES = [
  // ---- Session and sign-in (UD-36) -----------------------------------------------------------
  { id: 'csrf', method: 'GET', path: '/api/csrf', session: false, csrf: false, response: CsrfResponseSchema, refusals: [], servesDisplayObjects: false, serves: ['prompt 3 section 11'], phase: 2 },
  { id: 'auth.devAccounts', method: 'GET', path: '/api/auth/dev-accounts', session: false, csrf: false, response: DevAccountsResponseSchema, refusals: ['404 dev_login_off'], servesDisplayObjects: false, serves: ['UD-36', 'US-ADMIN-01', 'R-133', 'F-AUTH-01'], phase: 3 },
  { id: 'auth.devSignIn', method: 'POST', path: '/api/auth/dev-sign-in', session: false, csrf: true, request: DevSignInRequestSchema, response: DevSignInResponseSchema, refusals: ['404 dev_login_off', '403 not_a_dev_account'], servesDisplayObjects: false, serves: ['UD-36', 'US-ADMIN-01', 'R-133', 'F-AUTH-01'], phase: 3 },
  { id: 'auth.signOut', method: 'POST', path: '/api/auth/sign-out', session: false, csrf: true, refusals: [], servesDisplayObjects: false, serves: ['UD-16', 'US-ADMIN-01 AC4', 'R-133'], phase: 3 },
  { id: 'auth.session', method: 'GET', path: '/api/auth/session', session: false, csrf: false, response: SessionResponseSchema, refusals: [], servesDisplayObjects: false, serves: ['UD-16', 'UD-36', 'R-133'], phase: 3 },

  // ---- Projects (UD-37, OB-1) ----------------------------------------------------------------
  { id: 'projects.list', method: 'GET', path: '/api/projects', session: true, csrf: false, response: ProjectListResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['UD-37', 'US-ADMIN-05', 'US-ADMIN-15', 'R-136', 'R-137', 'F-AUTH-05'], phase: 3 },
  {
    id: 'projects.create',
    method: 'POST',
    path: '/api/projects',
    session: true,
    csrf: true,
    request: CreateProjectRequestSchema,
    response: CreateProjectResponseSchema,
    refusals: ['422 required_fields_missing', '422 project_type_invalid', '422 country_invalid', '422 answer_invalid', '403 owner_only'],
    servesDisplayObjects: false,
    serves: ['OB-1', 'US-INTAKE-02', 'US-INTAKE-03', 'R-001', 'R-136', 'F-QUESTION-05', 'G7-6', 'G7-9', 'G2-13'],
    phase: 3,
  },

  // ---- Wizard steps (OB-1 to OB-8, UD-33 to UD-35, UD-45) -------------------------------------
  {
    id: 'steps.view',
    method: 'GET',
    path: `${P}/steps/:step`,
    session: true,
    csrf: false,
    query: StepViewQuerySchema,
    response: StepResponseSchema,
    refusals: [],
    servesDisplayObjects: true,
    serves: ['OB-1', 'OB-2', 'OB-3', 'OB-4', 'OB-5', 'OB-6', 'OB-7', 'OB-8', 'UD-33', 'UD-34', 'UD-35', 'R-001', 'R-002', 'R-003', 'R-013', 'R-043', 'R-044', 'R-045', 'R-046', 'R-047', 'R-051', 'F-VALUE-10', 'F-QUESTION-01', 'F-QUESTION-02', 'F-QUESTION-07', 'G5-1', 'G5-2', 'G5-3', 'G5-4', 'G7-3', 'G7-5', 'G7-11', 'G7-12', 'G10-11', 'G2-7', 'R-012'],
    phase: 3,
  },
  {
    id: 'steps.continue',
    method: 'POST',
    path: `${P}/steps/:step/continue`,
    session: true,
    csrf: true,
    request: ContinueRequestSchema,
    response: ContinueResponseSchema,
    refusals: ['422 answer_invalid', '422 number_ambiguous', '422 unit_mismatch', '422 qualifier_required', '409 shown_value_changed', '403 owner_only'],
    servesDisplayObjects: true,
    serves: ['US-INTAKE-01 AC3', 'US-INTAKE-06', 'US-INTAKE-07', 'US-INTAKE-08', 'US-INTAKE-09', 'US-INTAKE-10', 'US-SCOPE-02', 'R-002', 'R-051', 'F-VALUE-06', 'F-QUESTION-04', 'F-QUESTION-06', 'G3-4', 'G7-3', 'G4-36', 'G7-9', 'G7-10'],
    phase: 3,
  },
  { id: 'extracted.view', method: 'GET', path: `${P}/extracted`, session: true, csrf: false, response: ExtractedResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['UD-45', 'US-REVIEW-08', 'R-045'], phase: 3 },

  // ---- Field writes (step 3, step 5, step 8) -------------------------------------------------
  { id: 'fields.edit', method: 'POST', path: `${P}/fields/edit`, session: true, csrf: true, request: EditRequestSchema, response: FieldWriteResponseSchema, refusals: ['422 answer_invalid', '422 number_ambiguous', '422 unit_mismatch', '422 qualifier_required', '409 shown_value_changed', '403 owner_only'], servesDisplayObjects: true, serves: ['UD-34', 'US-REVIEW-07', 'US-INTAKE-17', 'R-045', 'R-003', 'F-VALUE-05', 'F-QUESTION-08', 'G4-5', 'G4-19', 'G4-36', 'G7-9', 'G2-13', 'G8-22', 'G8-23', 'UD-09 (a zone\'s corrections, phase 4: R-061)'], phase: 3 },
  { id: 'fields.confirm', method: 'POST', path: `${P}/fields/confirm`, session: true, csrf: true, request: ConfirmRequestSchema, response: FieldWriteResponseSchema, refusals: ['409 confirmation_not_shown', '403 owner_only'], servesDisplayObjects: true, serves: ['US-REVIEW-05', 'US-INTAKE-07 AC5', 'R-045', 'F-QUESTION-02'], phase: 3 },
  { id: 'fields.acknowledge', method: 'POST', path: `${P}/fields/acknowledge`, session: true, csrf: true, request: AcknowledgeRequestSchema, response: FieldWriteResponseSchema, refusals: ['403 not_an_engineer_field', '403 owner_only'], servesDisplayObjects: true, serves: ['US-ASSETS-04', 'F-REVIEW-03', 'G3-3'], phase: 3 },
  { id: 'fields.concern', method: 'POST', path: `${P}/fields/concern`, session: true, csrf: true, request: ConcernRequestSchema, response: FieldWriteResponseSchema, refusals: ['403 not_an_engineer_field', '409 shown_value_changed', '403 owner_only'], servesDisplayObjects: true, serves: ['US-ASSETS-04', 'F-VALUE-05', 'G3-10', 'G3-19'], phase: 3 },
  { id: 'fields.resolveConflict', method: 'POST', path: `${P}/fields/resolve-conflict`, session: true, csrf: true, request: ResolveConflictRequestSchema, response: FieldWriteResponseSchema, refusals: ['409 conflict_not_open', '403 routed_to_engineer', '403 owner_only'], servesDisplayObjects: true, serves: ['US-REVIEW-11', 'R-046', 'F-REVIEW-04'], phase: 3 },
  { id: 'fields.skip', method: 'POST', path: `${P}/fields/skip`, session: true, csrf: true, request: SkipRequestSchema, response: FieldWriteResponseSchema, refusals: ['409 question_answered', '422 question_required', '422 answer_invalid', '403 owner_only'], servesDisplayObjects: true, serves: ['US-INTAKE-06', 'US-INTAKE-17', 'F-QUESTION-04', 'G7-3', 'G7-10'], phase: 3 },

  // ---- Late findings and the proposal page ---------------------------------------------------
  { id: 'lateFindings', method: 'GET', path: `${P}/late-findings`, session: true, csrf: false, query: LateFindingsQuerySchema, response: LateFindingsResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['US-INTAKE-19', 'US-INTAKE-01 AC7', 'R-004', 'F-QUESTION-09', 'G7-4'], phase: 3 },
  { id: 'proposal.preview', method: 'GET', path: `${P}/proposal`, session: true, csrf: false, response: ProposalPreviewResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['UD-07', 'US-INTAKE-16', 'R-003', 'F-PROPOSAL-07', 'prompt 3 5.2 "Generate before phase 5"'], phase: 3 },

  // ---- Phase 4: the workspace (workspace.ts; docs/adr/0043, 0044, 0045) ----------------------
  // Every route below answers the envelope of common.ts with its view; the web parses each 2xx body with its schema.
  // Owner writes take the project's write lock (lockProjectWrites; ADR 0036 decision 13).
  { id: 'workspace.frame', method: 'GET', path: `${P}/workspace`, session: true, csrf: false, response: WorkspaceFrameResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['UD-32', 'R-049', 'R-076', 'R-077', 'R-139', 'R-144', 'R-145', 'R-146', 'US-REVIEW-14', 'US-MODEL-01', 'US-MODEL-02', 'US-MODEL-03', 'US-ADMIN-12', 'US-ADMIN-13', 'F-RENDER-05', 'F-RENDER-09', 'G2-7', 'G7-14', 'G9-6', 'GS-1'], phase: 4 },
  { id: 'workspace.documents', method: 'GET', path: `${P}/workspace/documents`, session: true, csrf: false, response: DocumentsResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['DB-15', 'UD-21', 'UD-22', 'UD-43', 'R-016', 'R-017', 'R-018', 'R-019', 'R-022', 'R-028', 'US-DOCS-12', 'US-DOCS-13', 'US-DOCS-14', 'US-DOCS-15', 'US-DOCS-20', 'F-INGEST-08', 'G1-26', 'G2-14', 'G12-1', 'G12-5'], phase: 4 },
  { id: 'workspace.documents.deleteEffect', method: 'GET', path: `${P}/workspace/documents/:documentId/delete-effect`, session: true, csrf: false, response: DeleteEffectResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['UD-42', 'R-016', 'US-DOCS-21 AC1', '7.1.1-D4', 'G4-39'], phase: 4 },
  { id: 'workspace.systemScope', method: 'GET', path: `${P}/workspace/system-scope`, session: true, csrf: false, query: LevelQuerySchema, response: SystemScopeResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['DB-16', 'R-051', 'R-052', 'R-053', 'R-054', 'R-055', 'R-058', 'R-072', 'US-SCOPE-05', 'US-SCOPE-06', 'US-SCOPE-07', 'US-SCOPE-08', 'US-SCOPE-10', 'F-VALUE-12', 'G2-7', 'G11-10'], phase: 4 },
  {
    id: 'workspace.systemScope.decide',
    method: 'POST',
    path: `${P}/workspace/system-scope/decisions`,
    session: true,
    csrf: true,
    request: ScopeDecisionsRequestSchema,
    response: SystemScopeResponseSchema,
    refusals: ['409 shown_value_changed', '422 answer_invalid', '403 owner_only'],
    servesDisplayObjects: true,
    serves: ['DB-16', 'R-052', 'US-SCOPE-06', 'US-SCOPE-07', '7.1.1-C8', 'F-VALUE-06', 'F-VALUE-12', 'G3-20', 'G4-38', 'G4-40', 'G11-10'],
    phase: 4,
  },
  { id: 'workspace.equipment', method: 'GET', path: `${P}/workspace/equipment`, session: true, csrf: false, query: EquipmentQuerySchema, response: EquipmentResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['DB-17', 'UD-26', 'R-065', 'R-066', 'R-067', 'R-070', 'R-080', 'R-084', 'US-ASSETS-01', 'US-ASSETS-03', 'US-ASSETS-04', 'US-ASSETS-05', 'US-ASSETS-06', 'F-VALUE-08', 'G2-7', 'G3-3', 'G4-17', 'G12-10'], phase: 4 },
  { id: 'workspace.asset', method: 'GET', path: `${P}/workspace/equipment/:assetId`, session: true, csrf: false, response: AssetResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['UD-08', 'UD-26', 'R-067', 'R-068', 'US-ASSETS-07', 'US-ASSETS-08', 'US-ASSETS-09', 'G13-3'], phase: 4 },
  { id: 'workspace.zones', method: 'GET', path: `${P}/workspace/zones`, session: true, csrf: false, query: ZonesQuerySchema, response: ZonesResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['DB-20', 'UD-09', 'UD-27', 'R-060', 'R-061', 'R-062', 'R-063', 'R-064', 'US-ZONES-01', 'US-ZONES-02', 'US-ZONES-03', 'US-ZONES-04', 'G2-7', 'G12-10'], phase: 4 },
  { id: 'workspace.topology', method: 'GET', path: `${P}/workspace/topology`, session: true, csrf: false, query: LevelQuerySchema, response: TopologyResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['DB-08', 'DB-07', 'DB-10', 'R-071', 'R-072', 'R-073', 'R-075', 'US-TOPO-01', 'US-TOPO-03', 'US-TOPO-04', 'US-TOPO-05', 'US-TOPO-06', 'US-TOPO-07', 'US-TOPO-08', 'US-TOPO-10', 'G1-27', 'G2-7', 'G7-15', 'G11-11'], phase: 4 },
  { id: 'fields.concernMany', method: 'POST', path: `${P}/fields/concern-many`, session: true, csrf: true, request: ConcernManyRequestSchema, response: FieldWriteResponseSchema, refusals: ['403 not_an_engineer_field', '409 shown_value_changed', '403 owner_only'], servesDisplayObjects: true, serves: ['DB-17', 'R-065', 'US-ASSETS-04', 'F-REVIEW-03', 'G3-10', 'G3-19'], phase: 4 },

  // ---- Phase 5: the stored proposal, Reports and exports (proposal.ts; docs/adr/0047 to 0050) --------------
  // Generate and the export record take the owner check, then the project's write lock (lockProjectWrites; ADR 0036
  // decision 13); one request per press. `proposal.preview` (phase 3) stays the landing's state for a project with no
  // stored proposal. The two file routes answer a file, not display objects: the PDF is printed from the print route,
  // whose view the render test reads (`proposals.print`), and the CSV holds each value's badge and source beside it.
  { id: 'proposals.list', method: 'GET', path: `${P}/proposals`, session: true, csrf: false, response: ProposalVersionsResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['UD-06', 'R-110', 'US-PROPOSAL-11 AC3', 'F-PROPOSAL-02', 'G4-45'], phase: 5 },
  {
    id: 'proposals.generate',
    method: 'POST',
    path: `${P}/proposals`,
    session: true,
    csrf: true,
    request: GenerateRequestSchema,
    response: GenerateResponseSchema,
    refusals: ['403 owner_only'],
    servesDisplayObjects: false,
    serves: ['OB-8', 'UD-07', 'UD-47', 'R-109', 'R-110', 'US-PROPOSAL-01', 'US-PROPOSAL-02', 'US-PROPOSAL-03', 'US-PROPOSAL-11', 'F-PROPOSAL-01', 'F-PROPOSAL-02', 'F-CALC-02', 'F-CALC-03', 'G3-23', 'G4-45', 'G7-18', 'prompt 3 5.2 "After Generate"'],
    phase: 5,
  },
  {
    id: 'proposals.view',
    method: 'GET',
    path: `${P}/proposals/:snapshotId`,
    session: true,
    csrf: false,
    response: ProposalResponseSchema,
    refusals: [],
    servesDisplayObjects: true,
    serves: ['UD-06', 'UD-01', 'UD-38', 'R-110', 'R-111', 'R-112', 'R-113', 'R-115', 'R-116', 'R-127', 'R-129', 'US-PROPOSAL-03', 'US-PROPOSAL-04', 'US-PROPOSAL-05 AC1', 'US-PROPOSAL-06', 'US-PROPOSAL-08', 'US-PROPOSAL-10', 'US-PROPOSAL-13', 'US-ENGINEER-14', 'F-PRICE-01', 'F-PRICE-05', 'F-PROPOSAL-02', 'F-PROPOSAL-05', 'G1-2', 'G2-7', 'G4-12', 'G7-2a', 'G7-2b', 'G9-1', 'G9-3', 'G9-8', 'G9-10', 'G10-1', 'G10-2', 'G10-7', 'G10-9', 'G10-11', 'G11-1', 'G11-12'],
    phase: 5,
  },
  { id: 'proposals.print', method: 'GET', path: `${P}/proposals/:snapshotId/print`, session: true, csrf: false, response: ProposalPrintResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['UD-06', 'R-118', 'US-REPORTS-01', 'US-REPORTS-02', 'US-REPORTS-03', 'F-EXPORT-01', 'F-EXPORT-02', 'F-EXPORT-03', 'G10-5', 'G10-13', 'G13-12'], phase: 5 },
  { id: 'proposals.export', method: 'POST', path: `${P}/proposals/:snapshotId/exports`, session: true, csrf: true, request: ExportRequestSchema, response: ExportResponseSchema, refusals: ['403 owner_only'], servesDisplayObjects: false, serves: ['R-118', 'R-119', 'US-REPORTS-02', 'US-REPORTS-05', 'F-EXPORT-02', 'F-EXPORT-05'], phase: 5 },
  { id: 'exports.file', method: 'GET', path: `${P}/exports/:outputId/file`, session: true, csrf: false, refusals: ['503 export_unavailable'], servesDisplayObjects: false, serves: ['R-118', 'R-119', 'US-REPORTS-02', 'US-REPORTS-05 AC6', 'F-EXPORT-01', 'F-EXPORT-02', 'G10-5', 'G10-13', 'G13-12', 'docs/adr/0050'], phase: 5 },
  { id: 'reports.list', method: 'GET', path: `${P}/reports`, session: true, csrf: false, query: ReportsQuerySchema, response: ReportsResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['DB-18', 'R-119', 'R-120', 'R-123', 'US-REPORTS-05', 'US-REPORTS-14 AC1', 'US-REPORTS-06 AC1', 'US-REPORTS-07 AC1', 'US-REPORTS-11 AC1', 'F-EXPORT-05', '7.1.1-D6', '7.1.1-D8', 'G2-1'], phase: 5 },
  { id: 'exports.equipment', method: 'GET', path: `${P}/exports/equipment`, session: true, csrf: false, query: EquipmentExportQuerySchema, refusals: [], servesDisplayObjects: false, serves: ['DB-17', 'UD-26', 'R-066', 'US-ASSETS-11 AC6', 'F-EXPORT-01', 'F-EXPORT-04', '7.1-r25', 'G10-14'], phase: 5 },

  // ---- Phase 6: the Metrics pages (metrics.ts; docs/adr/0052; ADR 0043 amended) ------------------------------
  // Reads only, each in the requester's own request on a project the requester may see (rule 13). Financial Overview,
  // CAPEX, Payback and Lifecycle read one stored proposal snapshot (the latest, or `?snapshot=` naming one of the
  // project's: 404 otherwise), and answer "Not available yet: a generated preliminary proposal" while none is stored;
  // OPEX & Savings reads the project's documents and decisions now. The two print routes serve the page's view with no
  // action on any display (a printed page has no button: ADR 0050 decision 1), for the PDF that "Export Report" prints
  // (`exports.metrics`, a direct download of the named snapshot's page: no generated output is recorded, D-06).
  {
    id: 'metrics.financialOverview',
    method: 'GET',
    path: `${P}/metrics/financial-overview`,
    session: true,
    csrf: false,
    query: MetricsQuerySchema,
    response: FinancialOverviewResponseSchema,
    refusals: [],
    servesDisplayObjects: true,
    serves: ['DB-02', 'R-087', 'R-088', 'R-090', 'R-091', 'R-092', 'R-094', 'R-099', 'R-100', 'R-102', 'R-103', 'US-FIN-01', 'US-FIN-03', 'US-FIN-04', 'US-FIN-05', 'US-FIN-06', 'US-FIN-08', 'US-FIN-09', 'G1-5', 'G1-31', 'G2-7', 'G9-8', 'G10-7', 'G10-15'],
    phase: 6,
  },
  {
    id: 'metrics.capex',
    method: 'GET',
    path: `${P}/metrics/capex`,
    session: true,
    csrf: false,
    query: MetricsQuerySchema,
    response: CapexResponseSchema,
    refusals: [],
    servesDisplayObjects: true,
    serves: ['DB-13', 'R-087', 'R-089', 'R-090', 'R-091', 'R-092', 'US-FIN-03', 'US-FIN-05', 'US-FIN-08', 'US-FIN-21', 'G1-5', 'G1-31', 'G2-7', 'G9-8', 'G10-7', 'G10-15', 'G11-1'],
    phase: 6,
  },
  { id: 'metrics.opex', method: 'GET', path: `${P}/metrics/opex`, session: true, csrf: false, response: OpexResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['DB-12', 'R-087', 'R-092', 'R-095', 'US-FIN-12', 'US-FIN-13', 'US-FIN-14', 'G10-7', 'G12-4'], phase: 6 },
  {
    id: 'metrics.payback',
    method: 'GET',
    path: `${P}/metrics/payback`,
    session: true,
    csrf: false,
    query: MetricsQuerySchema,
    response: PaybackResponseSchema,
    refusals: [],
    servesDisplayObjects: true,
    serves: ['DB-21', 'R-087', 'R-090', 'R-092', 'R-096', 'R-099', 'R-100', 'R-101', 'R-102', 'R-103', 'US-FIN-24', 'G1-31', 'G2-7', 'G9-9', 'G10-15'],
    phase: 6,
  },
  {
    id: 'metrics.lifecycle',
    method: 'GET',
    path: `${P}/metrics/lifecycle`,
    session: true,
    csrf: false,
    query: MetricsQuerySchema,
    response: LifecycleResponseSchema,
    refusals: [],
    servesDisplayObjects: true,
    serves: ['DB-22', 'R-087', 'R-090', 'R-092', 'R-097', 'R-105', 'US-FIN-04 AC5', 'US-FIN-26', 'G1-31', 'G10-7'],
    phase: 6,
  },
  { id: 'metrics.payback.print', method: 'GET', path: `${P}/metrics/payback/print`, session: true, csrf: false, query: MetricsPrintQuerySchema, response: PaybackResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['R-121', 'US-REPORTS-13', 'F-EXPORT-01', 'G1-32', 'G10-16'], phase: 6 },
  { id: 'metrics.lifecycle.print', method: 'GET', path: `${P}/metrics/lifecycle/print`, session: true, csrf: false, query: MetricsPrintQuerySchema, response: LifecycleResponseSchema, refusals: [], servesDisplayObjects: true, serves: ['R-121', 'US-REPORTS-13', 'F-EXPORT-01', 'G1-32', 'G10-16'], phase: 6 },
  { id: 'exports.metrics', method: 'GET', path: `${P}/exports/metrics/:page`, session: true, csrf: false, query: MetricsPrintQuerySchema, refusals: ['503 export_unavailable'], servesDisplayObjects: false, serves: ['DB-21', 'DB-22', 'R-121', 'US-REPORTS-13', 'F-EXPORT-01', '7.1-r25', 'G1-32', 'G10-16', 'docs/adr/0050', 'docs/adr/0052'], phase: 6 },

  // ---- Phase 7: the development-only admin area (admin.ts; docs/adr/0053) -------------------------------------------
  // UD-39 to UD-41, read-only: a person holding sovitech_admin, while the development login is on (404 `admin_off`
  // otherwise; 403 `admin_only` without the role). No route here writes anything (prompt 3 5.4; guardrails section 10).
  { id: 'admin.accounts', method: 'GET', path: '/api/admin/accounts', session: true, csrf: false, response: AdminAccountsResponseSchema, refusals: ['404 admin_off', '403 admin_only'], servesDisplayObjects: true, serves: ['UD-39', 'R-134', 'R-143', 'R-154', 'US-ADMIN-03', 'US-ADMIN-16 AC1', 'US-ADMIN-17 AC1', 'US-ADMIN-17 AC2', 'F-AUTH-02', 'F-AUTH-06', 'F-AUDIT-03', 'G10-3', 'G13-16'], phase: 7 },
  { id: 'admin.datasets', method: 'GET', path: '/api/admin/datasets', session: true, csrf: false, response: AdminDatasetsResponseSchema, refusals: ['404 admin_off', '403 admin_only'], servesDisplayObjects: true, serves: ['UD-40', 'R-141', 'R-150', 'R-132', 'US-ADMIN-19 AC1', 'US-ADMIN-19 AC2', 'US-ADMIN-19 AC4', 'US-ENGINEER-12 AC1', 'F-REGISTRY-05', 'F-REGISTRY-06', 'G1-12', 'G1-33'], phase: 7 },
  { id: 'admin.guardrailEvents', method: 'GET', path: '/api/admin/guardrail-events', session: true, csrf: false, response: AdminGuardrailEventsResponseSchema, refusals: ['404 admin_off', '403 admin_only'], servesDisplayObjects: true, serves: ['UD-41', 'R-142', 'R-151', 'R-152', 'R-155', 'US-ADMIN-20', 'US-ADMIN-21', 'US-ADMIN-22 AC1', 'US-ADMIN-22 AC4', 'US-ADMIN-23', 'US-ADMIN-24 AC1', 'F-AUDIT-01', 'F-AUDIT-02', 'F-AUDIT-04', 'F-AUDIT-05', 'G3-24', 'G3-26', 'G13-15', 'G13-16', 'GS-2'], phase: 7 },

  // ---- Uploads (phase 2, ADR 0019; step 2) ---------------------------------------------------
  { id: 'uploads.create', method: 'POST', path: `${P}/uploads`, session: true, csrf: true, request: CreateUploadRequestSchema, response: UploadStateSchema, refusals: ['415 format_not_accepted', '413 file_too_large', '400 file_name_invalid', '400 size_invalid', '403 owner_only'], servesDisplayObjects: false, serves: ['OB-2', 'UD-33', 'US-DOCS-01', 'R-013', 'F-INGEST-01'], phase: 2 },
  { id: 'uploads.status', method: 'GET', path: `${P}/uploads/:uploadId`, session: true, csrf: false, response: UploadStateSchema, refusals: [], servesDisplayObjects: false, serves: ['US-DOCS-01', 'F-INGEST-01'], phase: 2 },
  { id: 'uploads.append', method: 'PUT', path: `${P}/uploads/:uploadId`, session: true, csrf: true, response: UploadStateSchema, refusals: ['409 upload_busy', '409 chunk_timeout', '409 offset_mismatch', '409 chunk_incomplete', '409 request_timeout', '413 chunk_too_large', '415 chunk_not_octet_stream'], servesDisplayObjects: false, serves: ['US-DOCS-01', 'F-INGEST-01', 'G1-23'], phase: 2 },
  { id: 'uploads.complete', method: 'POST', path: `${P}/uploads/:uploadId/complete`, session: true, csrf: true, response: CompleteUploadResponseSchema, refusals: ['409 upload_incomplete', '409 upload_busy', '422 not_a_fixture'], servesDisplayObjects: false, serves: ['US-DOCS-01', 'US-DOCS-23', 'R-013', 'F-INGEST-02', 'ADR 0028'], phase: 2 },
  { id: 'uploads.abort', method: 'DELETE', path: `${P}/uploads/:uploadId`, session: true, csrf: true, refusals: [], servesDisplayObjects: false, serves: ['US-DOCS-01'], phase: 2 },

  // ---- Phase 2 routes (listed so the table is the API's whole surface; phase 4's Documents calls delete, revision-of and file) -
  { id: 'health', method: 'GET', path: '/health', session: false, csrf: false, refusals: [], servesDisplayObjects: false, serves: ['ADR 0002'], phase: 2 },
  { id: 'documents.list', method: 'GET', path: `${P}/documents`, session: true, csrf: false, refusals: [], servesDisplayObjects: false, serves: ['F-INGEST-08 (raw rows for tests and the demo seed; the Documents page reads workspace.documents, phase 4)'], phase: 2 },
  { id: 'documents.delete', method: 'DELETE', path: `${P}/documents/:documentId`, session: true, csrf: true, refusals: ['409 erasure_files_left', '403 owner_only'], servesDisplayObjects: false, serves: ['US-DOCS-21', 'UD-42 (Documents, after workspace.documents.deleteEffect)', 'F-INGEST-07', 'G13-3 (no step 2 delete: US-DOCS-03 AC11)'], phase: 2 },
  { id: 'documents.revisionOf', method: 'POST', path: `${P}/documents/:documentId/revision-of`, session: true, csrf: true, refusals: ['403 owner_only', '422 revision_of_itself'], servesDisplayObjects: false, serves: ['US-DOCS-20', 'UD-43 (Documents: Replace and "Revision of…")', 'F-INGEST-06', 'G4-13', 'G4-14'], phase: 2 },
  { id: 'documents.engineerRecord', method: 'GET', path: `${P}/documents/:documentId/engineer-record`, session: true, csrf: false, refusals: [], servesDisplayObjects: false, serves: ['US-IFC-03', 'R-023 (engineer only)'], phase: 2 },
  { id: 'documents.file', method: 'GET', path: `${P}/documents/:documentId/file`, session: true, csrf: false, refusals: [], servesDisplayObjects: false, serves: ['US-DOCS-14', 'F-INGEST-08'], phase: 2 },
  // The viewer step, part 1 (owner decision D-03, 2026-10-05, display only; docs/build-log.md "The viewer step" item 3): a
  // current IFC model's converted view file, `application/octet-stream`, `Cache-Control: no-store`; 404 for anything else.
  // No live page calls it until part 2 (the model area's display objects come from the step 3 and System Scope views).
  { id: 'documents.modelView', method: 'GET', path: `${P}/documents/:documentId/model-view`, session: true, csrf: false, refusals: [], servesDisplayObjects: false, serves: ['US-MODEL-04', 'US-IFC-08', 'R-025', 'R-078', 'G13-4', 'ifc-input 6.2.16'], phase: 5 },
] as const satisfies readonly RouteSpec[];

export type RouteId = (typeof ROUTES)[number]['id'];

/** The spec of a route by id. */
export function routeById(id: RouteId): RouteSpec {
  const found = ROUTES.find((route) => route.id === id);
  if (found === undefined) throw new Error(`no route ${id}`);
  return found;
}

/** A route's path with its parameters filled (each value URL-encoded). */
export function pathOf(id: RouteId, params: Readonly<Record<string, string | number>> = {}): string {
  return routeById(id).path.replace(/:([A-Za-z]+)/gu, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`route ${id} needs the parameter ${name}`);
    return encodeURIComponent(String(value));
  });
}

function pathPattern(path: string): RegExp {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/:([A-Za-z]+)/gu, '[^/?#]+');
  return new RegExp(`^${escaped}(?:[?#]|$)`, 'u');
}

/**
 * Whether a request is one whose 2xx response carries display objects: its method and path match a
 * route marked `servesDisplayObjects`. The render test intercepts exactly these (phase 3), and fails
 * a 2xx response of one of them that holds no valid `displayObjects`.
 */
export function isDisplayObjectRequest(method: string, pathname: string): boolean {
  return ROUTES.some((route) => route.servesDisplayObjects && route.method === method.toUpperCase() && pathPattern(route.path).test(pathname));
}
