/**
 * The phase 3 routes of the wizard contract (packages/view-model/src/browser/contract/routes.ts; docs/adr/
 * 0036): the project list and creation, the step views, Continue, the owner's field writes, UD-45, late
 * findings and the proposal page. Each reads its body or query with the contract's schema (400
 * `request_invalid` otherwise) and answers a body the contract's response schema accepts; each
 * state-changing route checks the CSRF token (prompt 3 section 11); each project route needs a session
 * (401 `not_signed_in`) and reads another project as not found (rule 13).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AcknowledgeRequestSchema,
  ConcernRequestSchema,
  ConfirmRequestSchema,
  ContinueRequestSchema,
  ContinueResponseSchema,
  CreateProjectRequestSchema,
  CreateProjectResponseSchema,
  EditRequestSchema,
  ExtractedResponseSchema,
  FieldWriteResponseSchema,
  LateFindingsQuerySchema,
  LateFindingsResponseSchema,
  ProjectListResponseSchema,
  ProposalPreviewResponseSchema,
  ResolveConflictRequestSchema,
  SkipRequestSchema,
  StepResponseSchema,
  StepViewQuerySchema,
  UUID_PATTERN,
  type StepNumber,
} from '@sovitech/view-model/browser';
import { ApiRefusal } from '../errors';
import { answerWith, parseWith, userOf } from '../http';
import { createProjectFor, listProjects } from '../projects/service';
import type { ApiServices } from '../services';
import {
  acknowledgeItems,
  confirmField,
  continueStep,
  editField,
  extractedView,
  lateFindingsView,
  proposalView,
  raiseConcern,
  resolveConflict,
  skipQuestion,
  stepView,
} from './service';

interface ProjectParams {
  readonly projectId: string;
}
interface StepParams extends ProjectParams {
  readonly step: string;
}

/** The project in scope from the path, or 404 (an id that is no UUID names no project the user can see). */
function projectIdOf(params: ProjectParams): string {
  if (!UUID_PATTERN.test(params.projectId)) throw new ApiRefusal(404, 'not_found');
  return params.projectId;
}

/** The wizard's steps by their path segment (a step number is interface copy, never a value). */
const STEP_BY_TEXT: ReadonlyMap<string, StepNumber> = new Map([
  ['1', 1],
  ['2', 2],
  ['3', 3],
  ['4', 4],
  ['5', 5],
  ['6', 6],
  ['7', 7],
  ['8', 8],
]);

function stepOfText(text: string): StepNumber | undefined {
  return STEP_BY_TEXT.get(text);
}

function stepOf(params: StepParams): StepNumber {
  const step = stepOfText(params.step);
  if (step === undefined) throw new ApiRefusal(404, 'not_found');
  return step;
}

const scopeOf = (request: FastifyRequest<{ Params: ProjectParams }>): { readonly userId: string; readonly projectId: string } => ({
  userId: userOf(request),
  projectId: projectIdOf(request.params),
});

/** `left=<step>@<ISO>` entries as the ledger: the latest time per step. */
function ledgerOf(left: string | readonly string[] | undefined): Map<StepNumber, string> {
  const entries = left === undefined ? [] : typeof left === 'string' ? [left] : left;
  const ledger = new Map<StepNumber, string>();
  for (const entry of entries) {
    const at = entry.indexOf('@');
    const step = stepOfText(entry.slice(0, at));
    if (step !== undefined) ledger.set(step, entry.slice(at + 1));
  }
  return ledger;
}

export function registerWizardRoutes(
  app: FastifyInstance,
  services: ApiServices,
  guarded: { readonly onRequest: FastifyInstance['csrfProtection'] },
): void {
  const gates = app.gates;

  // ---- Projects (UD-37, OB-1) ----------------------------------------------------------------
  app.get('/api/projects', async (request) => answerWith(ProjectListResponseSchema, await listProjects(services, userOf(request))));

  app.post('/api/projects', guarded, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = userOf(request);
    const body = parseWith(CreateProjectRequestSchema, request.body);
    const created = await createProjectFor(services, userId, body);
    return reply.code(201).send(answerWith(CreateProjectResponseSchema, created));
  });

  // ---- Wizard steps -------------------------------------------------------------------------
  app.get<{ Params: StepParams }>('/api/projects/:projectId/steps/:step', async (request) => {
    const scope = scopeOf(request);
    const step = stepOf(request.params);
    // PRD R-012 (G7-11): `add=<field key>` on step 8 serves that first-estimate field's inline ask on the owner's request.
    const query = parseWith(StepViewQuerySchema, request.query);
    if (query.add !== undefined && step !== 8) throw new ApiRefusal(400, 'request_invalid');
    return answerWith(StepResponseSchema, await stepView(services, gates, scope, step, query.add === undefined ? {} : { add: query.add }));
  });

  app.post<{ Params: StepParams }>('/api/projects/:projectId/steps/:step/continue', guarded, async (request) => {
    const scope = scopeOf(request);
    const step = stepOf(request.params);
    const body = parseWith(ContinueRequestSchema, request.body);
    return answerWith(ContinueResponseSchema, await continueStep(services, scope, step, body));
  });

  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/extracted', async (request) =>
    answerWith(ExtractedResponseSchema, await extractedView(services, gates, scopeOf(request))),
  );

  // ---- Field writes -------------------------------------------------------------------------
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/fields/edit', guarded, async (request) =>
    answerWith(FieldWriteResponseSchema, await editField(services, scopeOf(request), parseWith(EditRequestSchema, request.body))),
  );
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/fields/confirm', guarded, async (request) =>
    answerWith(FieldWriteResponseSchema, await confirmField(services, scopeOf(request), parseWith(ConfirmRequestSchema, request.body).candidateId)),
  );
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/fields/acknowledge', guarded, async (request) =>
    answerWith(FieldWriteResponseSchema, await acknowledgeItems(services, scopeOf(request), parseWith(AcknowledgeRequestSchema, request.body).candidateIds)),
  );
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/fields/concern', guarded, async (request) =>
    answerWith(FieldWriteResponseSchema, await raiseConcern(services, scopeOf(request), parseWith(ConcernRequestSchema, request.body).candidateId)),
  );
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/fields/resolve-conflict', guarded, async (request) =>
    answerWith(FieldWriteResponseSchema, await resolveConflict(services, scopeOf(request), parseWith(ResolveConflictRequestSchema, request.body))),
  );
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/fields/skip', guarded, async (request) =>
    answerWith(FieldWriteResponseSchema, await skipQuestion(services, scopeOf(request), parseWith(SkipRequestSchema, request.body))),
  );

  // ---- Late findings and the proposal page ------------------------------------------------
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/late-findings', async (request) => {
    const scope = scopeOf(request);
    const query = parseWith(LateFindingsQuerySchema, request.query);
    const current = stepOfText(query.current);
    if (current === undefined) throw new ApiRefusal(400, 'request_invalid');
    return answerWith(LateFindingsResponseSchema, await lateFindingsView(services, scope, { current, since: query.since, left: ledgerOf(query.left) }));
  });

  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/proposal', async (request) =>
    answerWith(ProposalPreviewResponseSchema, await proposalView(services, gates, scopeOf(request))),
  );
}
