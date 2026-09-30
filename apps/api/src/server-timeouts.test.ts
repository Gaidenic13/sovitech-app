/**
 * The API server's waits and parsed-body bound (./server.ts, SERVER_LIMITS; docs/adr/0034,
 * decision 5). The phase 2 review found none set: a request whose body stalled was held open
 * with no end. The production values keep the resumable upload working (ADR 0019): a chunk has
 * its own deadline before the server's, and a completion its lease before the socket's. The
 * behaviour is shown on a real socket with the same server built with the waits scaled down.
 * Every value is TEST data.
 *
 * Ids: US-DOCS-01 and F-INGEST-01 (the resumable upload), prompt 3 section 11 (security basics).
 */
import { request as httpRequest } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import type { Readable } from 'node:stream';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SERVER_LIMITS, buildServer, type ServerLimits } from './server';
import { APPEND_DEADLINE_SECONDS, CHUNK_BYTES, COMPLETE_LEASE_SECONDS } from './uploads/service';

describe('US-DOCS-01 · F-INGEST-01 · ADR 0034: the production waits keep the resumable upload working', () => {
  it('US-DOCS-01 · F-INGEST-01: a chunk has its own deadline before the server\'s, a completion its lease before the socket\'s, and a chunk is not a parsed body', async () => {
    // A chunk that has not arrived within APPEND_DEADLINE_SECONDS gets the upload's own 409 chunk_timeout, which the client resumes from.
    expect(SERVER_LIMITS.requestTimeoutMs).toBeGreaterThan(APPEND_DEADLINE_SECONDS * 1000);
    // A completion copies and hashes up to 500 MB within COMPLETE_LEASE_SECONDS while its socket is quiet.
    expect(SERVER_LIMITS.connectionTimeoutMs).toBeGreaterThan(COMPLETE_LEASE_SECONDS * 1000);
    expect(SERVER_LIMITS.keepAliveTimeoutMs).toBeLessThan(SERVER_LIMITS.connectionTimeoutMs);
    expect(SERVER_LIMITS.headersTimeoutMs).toBeLessThanOrEqual(SERVER_LIMITS.requestTimeoutMs);
    expect(SERVER_LIMITS.bodyLimit).toBeLessThan(CHUNK_BYTES);
    const app = buildServer({ gates: assertGatesStartupSafe() });
    await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      expect(app.server.requestTimeout).toBe(SERVER_LIMITS.requestTimeoutMs);
      expect(app.server.headersTimeout).toBe(SERVER_LIMITS.headersTimeoutMs);
      expect(app.server.timeout).toBe(SERVER_LIMITS.connectionTimeoutMs);
      expect(app.server.keepAliveTimeout).toBe(SERVER_LIMITS.keepAliveTimeoutMs);
      expect(app.initialConfig.bodyLimit).toBe(SERVER_LIMITS.bodyLimit);
    } finally {
      await app.close();
    }
  });
});

/** The same waits, scaled down so a test can wait them out. */
const SCALED: ServerLimits = { requestTimeoutMs: 1000, connectionTimeoutMs: 2500, keepAliveTimeoutMs: 300, bodyLimit: 1024, headersTimeoutMs: 500, checkIntervalMs: 100 };

/** Server work longer than the request wait, shorter than the socket wait (as a completion), and longer than both. */
const PAST_REQUEST_WAIT_MS = SCALED.requestTimeoutMs + 600;
const PAST_SOCKET_WAIT_MS = SCALED.connectionTimeoutMs + 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** What a raw socket gets back: the text the server wrote, and how long until the server closed it. */
function rawExchange(port: number, send: (write: (text: string) => void) => Promise<void>, waitMs: number): Promise<{ readonly text: string; readonly closedAfterMs?: number }> {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = connect(port, '127.0.0.1');
    let text = '';
    let closedAfterMs: number | undefined;
    socket.on('data', (chunk: Buffer) => {
      text += chunk.toString('latin1');
    });
    socket.on('error', () => undefined);
    socket.on('close', () => {
      closedAfterMs = Date.now() - started;
    });
    void send((part) => socket.write(part)).then(async () => {
      const deadline = Date.now() + waitMs;
      while (closedAfterMs === undefined && Date.now() < deadline) await sleep(20);
      socket.destroy();
      resolve({ text, ...(closedAfterMs === undefined ? {} : { closedAfterMs }) });
    });
  });
}

describe('US-DOCS-01 · F-INGEST-01 · prompt 3 section 11 · ADR 0034: the waits at work (scaled down)', () => {
  let app: FastifyInstance;
  let port: number;

  beforeAll(async () => {
    app = buildServer({ gates: assertGatesStartupSafe(), limits: SCALED });
    // Probe routes: a chunk read as a stream (as routes.ts reads one), a JSON body, and server work of a given length.
    app.addContentTypeParser('application/octet-stream', (_request, payload, done) => {
      done(null, payload);
    });
    app.put('/probe/chunk', async (request) => {
      let received = 0;
      for await (const chunk of request.body as Readable) received += (chunk as Buffer).length;
      return { received };
    });
    app.post('/probe/json', async () => ({ ok: true }));
    app.post('/probe/work/past-request-wait', async () => {
      await sleep(PAST_REQUEST_WAIT_MS);
      return { ok: true };
    });
    app.post('/probe/work/past-socket-wait', async () => {
      await sleep(PAST_SOCKET_WAIT_MS);
      return { ok: true };
    });
    await app.listen({ port: 0, host: '127.0.0.1' });
    port = (app.server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await app.close();
  });

  it('US-DOCS-01: a request whose body stalls is answered 408 and closed once the request wait is over, not held open', async () => {
    const result = await rawExchange(
      port,
      async (write) => {
        write('PUT /probe/chunk HTTP/1.1\r\nHost: test\r\nContent-Type: application/octet-stream\r\nContent-Length: 1000000\r\n\r\nTEST ');
        await Promise.resolve();
      },
      SCALED.requestTimeoutMs * 4,
    );
    expect(result.text).toMatch(/^HTTP\/1\.1 408 /u);
    expect(result.closedAfterMs).toBeGreaterThanOrEqual(SCALED.requestTimeoutMs - 50);
    expect(result.closedAfterMs).toBeLessThan(SCALED.requestTimeoutMs * 3);
  });

  it('US-DOCS-01 · F-INGEST-01: a chunk of the upload\'s full size that keeps arriving within the wait is taken whole: it is a stream, not a parsed body', async () => {
    const received = await new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
      const request = httpRequest({ host: '127.0.0.1', port, method: 'PUT', path: '/probe/chunk', headers: { 'content-type': 'application/octet-stream', 'content-length': CHUNK_BYTES } }, (response) => {
        let body = '';
        response.on('data', (chunk: Buffer) => {
          body += chunk.toString('utf8');
        });
        response.on('end', () => resolve({ status: response.statusCode, body }));
      });
      request.on('error', reject);
      void (async () => {
        const piece = Buffer.alloc(CHUNK_BYTES / 8, 0x54);
        for (let index = 0; index < 8; index += 1) {
          request.write(piece);
          await sleep(50);
        }
        request.end();
      })();
    });
    expect(received).toEqual({ status: 200, body: JSON.stringify({ received: CHUNK_BYTES }) });
  });

  it('F-INGEST-01: a parsed body past its bound is refused (413)', async () => {
    const response = await app.inject({ method: 'POST', url: '/probe/json', headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ TEST: 'x'.repeat(SCALED.bodyLimit) }) });
    expect(response.statusCode).toBe(413);
    expect((await app.inject({ method: 'POST', url: '/probe/json', headers: { 'content-type': 'application/json' }, payload: '{"TEST":"small"}' })).statusCode).toBe(200);
  });

  it('US-DOCS-01: server work longer than the request wait still answers (a completion is not cut by it); work longer than the socket wait is cut', async () => {
    const answer = (path: string, ms: number): Promise<{ readonly text: string; readonly closedAfterMs?: number }> =>
      rawExchange(
        port,
        async (write) => {
          write(`POST ${path} HTTP/1.1\r\nHost: test\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`);
          await Promise.resolve();
        },
        ms + SCALED.connectionTimeoutMs * 2,
      );
    const withinSocketWait = await answer('/probe/work/past-request-wait', PAST_REQUEST_WAIT_MS);
    expect(withinSocketWait.text).toMatch(/^HTTP\/1\.1 200 /u);
    const pastSocketWait = await answer('/probe/work/past-socket-wait', PAST_SOCKET_WAIT_MS);
    expect(pastSocketWait.text).toBe('');
    expect(pastSocketWait.closedAfterMs).toBeLessThan(PAST_SOCKET_WAIT_MS);
  });

  it('F-INGEST-01: an idle kept-alive socket is closed after its wait', async () => {
    const result = await rawExchange(
      port,
      async (write) => {
        write('POST /probe/json HTTP/1.1\r\nHost: test\r\nContent-Type: application/json\r\nContent-Length: 2\r\n\r\n{}');
        await Promise.resolve();
      },
      SCALED.keepAliveTimeoutMs * 10,
    );
    expect(result.text).toMatch(/^HTTP\/1\.1 200 /u);
    expect(result.closedAfterMs).toBeLessThan(SCALED.keepAliveTimeoutMs * 8);
  });
});
