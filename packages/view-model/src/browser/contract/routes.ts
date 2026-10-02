/**
 * The route table of the API contract (the wizard, phase 3; the workspace, phase 4: workspace.ts,
 * docs/adr/0044-workspace-api-contract.md): every route the web calls, with its method,
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
  /** Built in phase 2 (kept as they are), phase 3 (the wizard) or phase 4 (the workspace: workspace.ts; docs/adr/0044). */
  readonly phase: 2 | 3 | 4;
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
  { id: 'documents.revisionOf', method: 'POST', path: `${P}/documents/:documentId/revision-of`, session: true, csrf: true, refusals: ['422 revision_of_itself'], servesDisplayObjects: false, serves: ['US-DOCS-20', 'UD-43 (Documents: Replace and "Revision of…")', 'F-INGEST-06', 'G4-13', 'G4-14'], phase: 2 },
  { id: 'documents.engineerRecord', method: 'GET', path: `${P}/documents/:documentId/engineer-record`, session: true, csrf: false, refusals: [], servesDisplayObjects: false, serves: ['US-IFC-03', 'R-023 (engineer only)'], phase: 2 },
  { id: 'documents.file', method: 'GET', path: `${P}/documents/:documentId/file`, session: true, csrf: false, refusals: [], servesDisplayObjects: false, serves: ['US-DOCS-14', 'F-INGEST-08'], phase: 2 },
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
