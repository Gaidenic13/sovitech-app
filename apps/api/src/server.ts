import { GateApprovalError, isStartupCheckedSource, type GateSource } from '@sovitech/registry/gates';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiRoutes } from './routes';
import type { ApiServices } from './services';
import { APPEND_DEADLINE_SECONDS, COMPLETE_LEASE_SECONDS } from './uploads/service';

/**
 * How long the server waits, and how much a parsed body may hold (docs/adr/0034, decision 5; the
 * phase 2 review: none was set, so a request whose body stalled was held open with no end).
 * They keep the resumable upload working (ADR 0019): a chunk is up to 8 MiB and has
 * APPEND_DEADLINE_SECONDS to arrive, after which the upload itself answers 409 `chunk_timeout`
 * and the client resumes; a completion copies and hashes up to 500 MB within
 * COMPLETE_LEASE_SECONDS while its socket is quiet.
 */
export interface ServerLimits {
  /** The whole request, body included, must arrive within this (Node's requestTimeout): past a chunk's own deadline, so the upload's 409 comes first. */
  readonly requestTimeoutMs: number;
  /** A socket quiet this long is closed (Fastify's connectionTimeout, Node's server.timeout): past a completion's lease, while the server answers nothing. */
  readonly connectionTimeoutMs: number;
  /** An idle kept-alive socket waits this long for its next request. */
  readonly keepAliveTimeoutMs: number;
  /** The most a parsed (JSON) body may hold: the routes that take one carry a file name and a size, or a document id. A chunk is a stream, not parsed, and the upload bounds it. */
  readonly bodyLimit: number;
  /** The request's headers must arrive within this (Node's headersTimeout; at most the request wait, or Node checks neither: ADR 0034). */
  readonly headersTimeoutMs: number;
  /** How often Node checks the two waits above (its default, 30 s, said here): a request is cut at most this long after its wait. */
  readonly checkIntervalMs: number;
}

export const SERVER_LIMITS: ServerLimits = {
  requestTimeoutMs: (APPEND_DEADLINE_SECONDS + 30) * 1000,
  connectionTimeoutMs: (COMPLETE_LEASE_SECONDS + 60) * 1000,
  keepAliveTimeoutMs: 10 * 1000,
  bodyLimit: 16 * 1024,
  headersTimeoutMs: 60 * 1000,
  checkIntervalMs: 30 * 1000,
};

declare module 'fastify' {
  interface FastifyInstance {
    /** The start-up checked gate source; routes read gates only through readGate(app.gates, id). */
    readonly gates: GateSource;
  }
}

export interface ServerOptions {
  /**
   * The gate source that assertGatesStartupSafe() returned. Nothing else is
   * accepted: not the plain production source, not a test override, not a
   * look-alike object (prompt 3 section 5.4: the API refuses to start while any
   * gate fails the loosening check).
   */
  gates: GateSource;
  /**
   * The store, the file store, the upload guard, the sessions and the log (./services.ts).
   * Without them the API serves the health check only (phase 0's scaffold).
   */
  services?: ApiServices;
  /** Tests only: other waits and body bound than SERVER_LIMITS (./server-timeouts.test.ts scales them down). */
  limits?: ServerLimits;
}

/**
 * Builds the Fastify API (docs/adr/0002-frontend-vite-fastify.md).
 * It refuses to build without a gate source that passed the start-up check,
 * so no entry point (the server, a worker, the demo seed, a test) can build
 * the app without that check (docs/adr/0005-gates-mechanism.md).
 * Phase 0 has one route: a health check that carries no engineering value. Phase 2
 * adds, with the services, the upload protocol and a project's documents (./routes.ts).
 * Logging stays off here; when it is switched on, logs never carry document
 * text (guardrails rule 13).
 */
export function buildServer(options: ServerOptions): FastifyInstance {
  const gates = (options as Partial<ServerOptions> | undefined)?.gates;
  if (gates === undefined || !isStartupCheckedSource(gates)) {
    throw new GateApprovalError(
      'Refusing to build the API: pass the gate source that assertGatesStartupSafe() returned (prompt 3 section 5.4).',
    );
  }

  const limits = options.limits ?? SERVER_LIMITS;
  const app = Fastify({
    logger: false,
    requestTimeout: limits.requestTimeoutMs,
    connectionTimeout: limits.connectionTimeoutMs,
    keepAliveTimeout: limits.keepAliveTimeoutMs,
    bodyLimit: limits.bodyLimit,
    // Given to Node's server at its creation too: set only afterwards, as Fastify sets it, a request wait shorter than
    // Node's default headers wait (60 s) is never checked (ADR 0034, measured on Node 22.17).
    http: { requestTimeout: limits.requestTimeoutMs, headersTimeout: limits.headersTimeoutMs, connectionsCheckingInterval: limits.checkIntervalMs },
  });
  app.decorate('gates', gates);

  app.get('/health', async () => ({ status: 'ok' as const }));
  const services = options.services;
  if (services !== undefined) {
    void app.register(async (instance) => {
      await registerApiRoutes(instance, services);
    });
    // The PDF printer's browser closes with the server (docs/adr/0050 decision 2).
    const printer = services.printer;
    if (printer !== undefined) {
      app.addHook('onClose', async () => {
        await printer.close();
      });
    }
  }

  return app;
}
