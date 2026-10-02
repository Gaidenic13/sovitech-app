/**
 * The phase 4 routes of the workspace contract (packages/view-model/src/browser/contract/workspace.ts and
 * routes.ts; docs/adr/0043, 0044, 0045): the frame (project card, footer, level register), Documents with the
 * delete effect, System Scope and its decisions, Equipment and the asset detail, Zones, Topology's Logical
 * view, and "Something's wrong" on a selection. Each reads its query or body with the contract's schema
 * (400 `request_invalid` otherwise), answers a body the contract's response schema accepts, needs a session
 * (401 `not_signed_in`) and reads another project as not found (rule 13); the one write checks the CSRF
 * token (prompt 3 section 11).
 *
 * Skeleton (the phase 4 planner): every handler calls its service in ./service.ts, whose bodies the API
 * builder writes. Documents' upload, revision declaration, download and delete stay the phase 2 routes
 * (apps/api/src/routes.ts).
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AssetResponseSchema,
  ConcernManyRequestSchema,
  DeleteEffectResponseSchema,
  DocumentsResponseSchema,
  EquipmentQuerySchema,
  EquipmentResponseSchema,
  FieldWriteResponseSchema,
  LevelQuerySchema,
  ScopeDecisionsRequestSchema,
  SystemScopeResponseSchema,
  TopologyResponseSchema,
  UUID_PATTERN,
  WorkspaceFrameResponseSchema,
  ZonesQuerySchema,
  ZonesResponseSchema,
} from '@sovitech/view-model/browser';
import { ApiRefusal } from '../errors';
import { answerWith, parseWith, userOf } from '../http';
import type { ApiServices } from '../services';
import {
  assetView,
  concernMany,
  decideScope,
  deleteEffectView,
  documentsView,
  equipmentView,
  frameView,
  systemScopeView,
  topologyView,
  zonesView,
  type WorkspaceScope,
} from './service';

interface ProjectParams {
  readonly projectId: string;
}
interface DocumentParams extends ProjectParams {
  readonly documentId: string;
}
interface AssetParams extends ProjectParams {
  readonly assetId: string;
}

/** An id from the path, or 404 (an id that is no UUID names nothing the user can see). */
function idOf(value: string): string {
  if (!UUID_PATTERN.test(value)) throw new ApiRefusal(404, 'not_found');
  return value;
}

const scopeOf = (request: FastifyRequest<{ Params: ProjectParams }>): WorkspaceScope => ({
  userId: userOf(request),
  projectId: idOf(request.params.projectId),
});

export function registerWorkspaceRoutes(
  app: FastifyInstance,
  services: ApiServices,
  guarded: { readonly onRequest: FastifyInstance['csrfProtection'] },
): void {
  const gates = app.gates;

  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/workspace', async (request) =>
    answerWith(WorkspaceFrameResponseSchema, await frameView(services, gates, scopeOf(request))),
  );

  // ---- Documents (DB-15) ----------------------------------------------------------------------
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/workspace/documents', async (request) =>
    answerWith(DocumentsResponseSchema, await documentsView(services, gates, scopeOf(request))),
  );
  app.get<{ Params: DocumentParams }>('/api/projects/:projectId/workspace/documents/:documentId/delete-effect', async (request) =>
    answerWith(DeleteEffectResponseSchema, await deleteEffectView(services, gates, scopeOf(request), idOf(request.params.documentId))),
  );

  // ---- System Scope (DB-16) ---------------------------------------------------------------------
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/workspace/system-scope', async (request) =>
    answerWith(SystemScopeResponseSchema, await systemScopeView(services, gates, scopeOf(request), parseWith(LevelQuerySchema, request.query))),
  );
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/workspace/system-scope/decisions', guarded, async (request) =>
    answerWith(SystemScopeResponseSchema, await decideScope(services, gates, scopeOf(request), parseWith(ScopeDecisionsRequestSchema, request.body))),
  );

  // ---- Equipment (DB-17, UD-08) -----------------------------------------------------------------
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/workspace/equipment', async (request) =>
    answerWith(EquipmentResponseSchema, await equipmentView(services, gates, scopeOf(request), parseWith(EquipmentQuerySchema, request.query))),
  );
  app.get<{ Params: AssetParams }>('/api/projects/:projectId/workspace/equipment/:assetId', async (request) =>
    answerWith(AssetResponseSchema, await assetView(services, gates, scopeOf(request), idOf(request.params.assetId))),
  );
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/fields/concern-many', guarded, async (request) =>
    answerWith(FieldWriteResponseSchema, await concernMany(services, scopeOf(request), parseWith(ConcernManyRequestSchema, request.body).candidateIds)),
  );

  // ---- Zones (DB-20) and Topology (DB-08) -------------------------------------------------------
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/workspace/zones', async (request) =>
    answerWith(ZonesResponseSchema, await zonesView(services, gates, scopeOf(request), parseWith(ZonesQuerySchema, request.query))),
  );
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/workspace/topology', async (request) =>
    answerWith(TopologyResponseSchema, await topologyView(services, gates, scopeOf(request), parseWith(LevelQuerySchema, request.query))),
  );
}
