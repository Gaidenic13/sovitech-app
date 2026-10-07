/**
 * The phase 6 routes of the contract (packages/view-model/src/browser/contract/metrics.ts and routes.ts;
 * docs/adr/0052-metrics-pages-and-series.md): the Metrics pages, their two print views and "Export Report". Each reads
 * its query with the contract's schema (400 `request_invalid` otherwise), answers a body the contract's response schema
 * accepts (the export answers a file), needs a session (401 `not_signed_in`) and reads another project as not found
 * (rule 13). All are reads: no CSRF token (prompt 3 section 11 checks it on state-changing routes).
 *
 * Skeleton (the phase 6 planner): every handler calls its service in ./service.ts, whose bodies the API builder writes.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  CapexResponseSchema,
  FinancialOverviewResponseSchema,
  LifecycleResponseSchema,
  MetricsExportPageSchema,
  MetricsPrintQuerySchema,
  MetricsQuerySchema,
  OpexResponseSchema,
  PaybackResponseSchema,
  UUID_PATTERN,
} from '@sovitech/view-model/browser';
import { ApiRefusal } from '../errors';
import { answerWith, parseWith, userOf } from '../http';
import type { FileAnswer, ProposalScope } from '../proposal/service';
import type { ApiServices } from '../services';
import { capex, financialOverview, lifecycle, metricsExport, opex, payback } from './service';

interface ProjectParams {
  readonly projectId: string;
}
interface PageParams extends ProjectParams {
  readonly page: string;
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

export function registerMetricsRoutes(app: FastifyInstance, services: ApiServices): void {
  const gates = app.gates;
  const P = '/api/projects/:projectId';

  app.get<{ Params: ProjectParams }>(`${P}/metrics/financial-overview`, async (request) =>
    answerWith(FinancialOverviewResponseSchema, await financialOverview(services, gates, scopeOf(request), parseWith(MetricsQuerySchema, request.query))),
  );
  app.get<{ Params: ProjectParams }>(`${P}/metrics/capex`, async (request) =>
    answerWith(CapexResponseSchema, await capex(services, gates, scopeOf(request), parseWith(MetricsQuerySchema, request.query))),
  );
  app.get<{ Params: ProjectParams }>(`${P}/metrics/opex`, async (request) => answerWith(OpexResponseSchema, await opex(services, gates, scopeOf(request))));
  app.get<{ Params: ProjectParams }>(`${P}/metrics/payback`, async (request) =>
    answerWith(PaybackResponseSchema, await payback(services, gates, scopeOf(request), parseWith(MetricsQuerySchema, request.query), false)),
  );
  app.get<{ Params: ProjectParams }>(`${P}/metrics/lifecycle`, async (request) =>
    answerWith(LifecycleResponseSchema, await lifecycle(services, gates, scopeOf(request), parseWith(MetricsQuerySchema, request.query), false)),
  );

  // ---- The print views and "Export Report" (R-121; ADR 0050, extended) ---------------------------
  app.get<{ Params: ProjectParams }>(`${P}/metrics/payback/print`, async (request) =>
    answerWith(PaybackResponseSchema, await payback(services, gates, scopeOf(request), parseWith(MetricsPrintQuerySchema, request.query), true)),
  );
  app.get<{ Params: ProjectParams }>(`${P}/metrics/lifecycle/print`, async (request) =>
    answerWith(LifecycleResponseSchema, await lifecycle(services, gates, scopeOf(request), parseWith(MetricsPrintQuerySchema, request.query), true)),
  );
  app.get<{ Params: PageParams }>(`${P}/exports/metrics/:page`, async (request, reply) => {
    const page = MetricsExportPageSchema.safeParse(request.params.page);
    if (!page.success) throw new ApiRefusal(404, 'not_found');
    const query = parseWith(MetricsPrintQuerySchema, request.query);
    // The print stops when the requester goes away, as the proposal's export does (ADR 0050 decision 2).
    const gone = new AbortController();
    const onClose = (): void => {
      if (!reply.raw.writableEnded) gone.abort();
    };
    reply.raw.once('close', onClose);
    let file: FileAnswer;
    try {
      file = await metricsExport(services, scopeOf(request), page.data, query, { cookieHeader: request.headers.cookie ?? '', signal: gone.signal });
    } finally {
      reply.raw.off('close', onClose);
    }
    return reply.headers(fileHeaders(file)).send(Buffer.from(file.body));
  });
}
