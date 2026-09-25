import { GateApprovalError, isStartupCheckedSource, type GateSource } from '@sovitech/registry/gates';
import Fastify, { type FastifyInstance } from 'fastify';

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
}

/**
 * Builds the Fastify API (docs/adr/0002-frontend-vite-fastify.md).
 * It refuses to build without a gate source that passed the start-up check,
 * so no entry point (the server, a worker, the demo seed, a test) can build
 * the app without that check (docs/adr/0005-gates-mechanism.md).
 * Phase 0 has one route: a health check that carries no engineering value.
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

  const app = Fastify({ logger: false });
  app.decorate('gates', gates);

  app.get('/health', async () => ({ status: 'ok' as const }));

  return app;
}
