/**
 * The phase 5 routes of the contract (packages/view-model/src/browser/contract/proposal.ts and routes.ts; docs/adr/0047
 * to 0050): the stored proposal and its versions, Generate, the print view, the export record and its PDF, Reports and
 * the Equipment register's CSV. Each reads its query or body with the contract's schema (400 `request_invalid`
 * otherwise), answers a body the contract's response schema accepts (the two file routes answer a file), needs a
 * session (401 `not_signed_in`) and reads another project as not found (rule 13); the two writes check the CSRF token
 * (prompt 3 section 11).
 *
 * Skeleton (the phase 5 planner): every handler calls its service in ./service.ts, whose bodies the API builder writes.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
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
  UUID_PATTERN,
} from '@sovitech/view-model/browser';
import { ApiRefusal } from '../errors';
import { answerWith, parseWith, userOf } from '../http';
import type { ApiServices } from '../services';
import {
  equipmentExport,
  exportFile,
  generateProposal,
  listProposals,
  proposalPrintView,
  proposalView,
  recordExport,
  reportsView,
  type FileAnswer,
  type ProposalScope,
} from './service';

interface ProjectParams {
  readonly projectId: string;
}
interface SnapshotParams extends ProjectParams {
  readonly snapshotId: string;
}
interface OutputParams extends ProjectParams {
  readonly outputId: string;
}

/** An id from the path, or 404 (an id that is no UUID names nothing the user can see). */
function idOf(value: string): string {
  if (!UUID_PATTERN.test(value)) throw new ApiRefusal(404, 'not_found');
  return value;
}

const scopeOf = (request: FastifyRequest<{ Params: ProjectParams }>): ProposalScope => ({
  userId: userOf(request),
  projectId: idOf(request.params.projectId),
});

/** The download headers of a file answer (never cached; the name holds no document text: rule 13). */
function fileHeaders(file: FileAnswer): Record<string, string> {
  return {
    'content-type': file.contentType,
    'content-disposition': `attachment; filename="${file.fileName}"`,
    'cache-control': 'private, no-store',
  };
}

export function registerProposalRoutes(
  app: FastifyInstance,
  services: ApiServices,
  guarded: { readonly onRequest: FastifyInstance['csrfProtection'] },
): void {
  const gates = app.gates;

  // ---- The stored proposal (UD-06, UD-01's content, UD-07, UD-47) -------------------------------
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/proposals', async (request) =>
    answerWith(ProposalVersionsResponseSchema, await listProposals(services, gates, scopeOf(request))),
  );
  app.post<{ Params: ProjectParams }>('/api/projects/:projectId/proposals', guarded, async (request, reply) => {
    parseWith(GenerateRequestSchema, request.body ?? {});
    return reply.code(201).send(answerWith(GenerateResponseSchema, await generateProposal(services, gates, scopeOf(request))));
  });
  app.get<{ Params: SnapshotParams }>('/api/projects/:projectId/proposals/:snapshotId', async (request) =>
    answerWith(ProposalResponseSchema, await proposalView(services, gates, scopeOf(request), idOf(request.params.snapshotId))),
  );

  // ---- The print route's view, the export record and its PDF (R-118; ADR 0050) ---------------------
  app.get<{ Params: SnapshotParams }>('/api/projects/:projectId/proposals/:snapshotId/print', async (request) =>
    answerWith(ProposalPrintResponseSchema, await proposalPrintView(services, gates, scopeOf(request), idOf(request.params.snapshotId))),
  );
  app.post<{ Params: SnapshotParams }>('/api/projects/:projectId/proposals/:snapshotId/exports', guarded, async (request, reply) => {
    parseWith(ExportRequestSchema, request.body ?? {});
    return reply.code(201).send(answerWith(ExportResponseSchema, await recordExport(services, scopeOf(request), idOf(request.params.snapshotId))));
  });
  app.get<{ Params: OutputParams }>('/api/projects/:projectId/exports/:outputId/file', async (request, reply) => {
    // The print stops when the requester goes away (the request's connection closed before its answer was sent): a
    // print still waiting never opens a page, a running one closes its context (ADR 0050 decision 2).
    const gone = new AbortController();
    const onClose = (): void => {
      if (!reply.raw.writableEnded) gone.abort();
    };
    reply.raw.once('close', onClose);
    let file: FileAnswer;
    try {
      file = await exportFile(services, scopeOf(request), idOf(request.params.outputId), { cookieHeader: request.headers.cookie ?? '', signal: gone.signal });
    } finally {
      reply.raw.off('close', onClose);
    }
    return reply.headers(fileHeaders(file)).send(Buffer.from(file.body));
  });

  // ---- Reports (DB-18; R-119) ---------------------------------------------------------------------
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/reports', async (request) =>
    answerWith(ReportsResponseSchema, await reportsView(services, gates, scopeOf(request), parseWith(ReportsQuerySchema, request.query))),
  );

  // ---- The Equipment register's export (R-066; US-ASSETS-11 AC6) ----------------------------------
  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/exports/equipment', async (request, reply) => {
    const file = await equipmentExport(services, gates, scopeOf(request), parseWith(EquipmentExportQuerySchema, request.query));
    return reply.headers(fileHeaders(file)).send(Buffer.from(file.body));
  });
}
