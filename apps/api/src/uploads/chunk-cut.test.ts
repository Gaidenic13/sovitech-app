/**
 * A chunk whose body ends early (docs/adr/0019-resumable-uploads-chunk-protocol.md; docs/adr/0034, decision 6): cut
 * by the client mid-body, or stalled and answered 408 by the server's request wait. The phase 2 verifier's closing
 * check (verify2d/server/resume.out) found both logged as the generic `internal_error`; the upload now logs each with
 * its own code (`chunk_incomplete`, `request_timeout`) and keeps nothing of the chunk, and the client resumes from the
 * bytes the server holds. The log carries codes and ids only (rule 13).
 *
 * Over real sockets, with the API's own error handler (./../routes.ts) and the real file store on TEST bytes in a
 * temporary folder, and the server's waits scaled down as in ../server-timeouts.test.ts. The route under test is a
 * probe that writes through `writeChunk`, the function the upload route calls under the upload's lease; the lease and
 * the session need the store, which the TEST database tests prove (tests/api/uploads-one-writer.test.ts).
 *
 * Ids: US-DOCS-01 and F-INGEST-01 (the resumable upload), ADR 0034.
 */
import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { assertGatesStartupSafe } from '@sovitech/registry/gates';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SessionStore } from '../auth/sessions';
import { registerApiRoutes } from '../routes';
import { buildServer, type ServerLimits } from '../server';
import type { ApiLogRecord, ApiServices } from '../services';
import { FileStore } from '../storage/file-store';
import { writeChunk } from './service';

const PROJECT = '0192f0a0-0000-7000-8000-00000000c5b1';
/** The session secret of this TEST server (TEST text, 32 characters and more). */
const TEST_SECRET = 'TEST session secret: not a real secret, tests only';
/** The server's waits, scaled down so a test can wait them out (../server-timeouts.test.ts). */
const SCALED: ServerLimits = { requestTimeoutMs: 1000, connectionTimeoutMs: 2500, keepAliveTimeoutMs: 300, bodyLimit: 1024, headersTimeoutMs: 500, checkIntervalMs: 100 };
/** TEST bytes the upload already holds before the chunk under test. */
const HELD = Buffer.alloc(4096, 0x54);
/** The room left for the chunk (TEST). */
const ROOM = 64 * 1024;

const root = mkdtempSync(join(tmpdir(), 'sovitech-test-chunk-cut-'));
const files = new FileStore(root);
const log: ApiLogRecord[] = [];
const services: ApiServices = {
  // The probe reaches no store: `writeChunk` takes the file store and the log only.
  store: undefined as unknown as ApiServices['store'],
  files,
  uploadGuard: { accepts: () => false } as unknown as ApiServices['uploadGuard'],
  extractionAccountId: 'TEST-extraction-account',
  sessions: new SessionStore(),
  cookieSecret: TEST_SECRET,
  log: (record) => {
    log.push(record);
  },
};

let app: FastifyInstance;
let port: number;
let uploads = 0;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** A new staged upload holding HELD, as an append would have left it. */
async function stagedUpload(): Promise<string> {
  uploads += 1;
  const uploadId = `0192f0a0-0000-7000-8000-${String(uploads).padStart(12, '0')}`;
  await files.startStaging(PROJECT, uploadId);
  await files.appendChunk(PROJECT, uploadId, Readable.from([HELD]), ROOM);
  return uploadId;
}

/** Sends a chunk's headers and part of its body on a raw socket, then cuts the socket or waits for the server to close it. */
function partialChunk(uploadId: string, declared: number, part: Buffer, mode: 'cut' | 'stall'): Promise<{ readonly text: string }> {
  return new Promise((resolve) => {
    const socket = connect(port, '127.0.0.1');
    let text = '';
    let closed = false;
    socket.on('data', (chunk: Buffer) => {
      text += chunk.toString('latin1');
    });
    socket.on('error', () => undefined);
    socket.on('close', () => {
      closed = true;
    });
    socket.write(`PUT /probe/uploads/${uploadId} HTTP/1.1\r\nHost: test\r\nContent-Type: application/octet-stream\r\nContent-Length: ${String(declared)}\r\n\r\n`);
    socket.write(part);
    void (async () => {
      if (mode === 'cut') {
        await sleep(100);
        socket.destroy();
      } else {
        const deadline = Date.now() + SCALED.requestTimeoutMs * 4;
        while (!closed && Date.now() < deadline) await sleep(20);
        socket.destroy();
      }
      resolve({ text });
    })();
  });
}

/** Waits until the log holds a record for the upload (the route ends after the socket does). */
async function recordFor(uploadId: string): Promise<ApiLogRecord | undefined> {
  const deadline = Date.now() + 3000;
  for (;;) {
    const found = log.find((record) => record.uploadId === uploadId);
    if (found !== undefined || Date.now() > deadline) return found;
    await sleep(20);
  }
}

beforeAll(async () => {
  app = buildServer({ gates: assertGatesStartupSafe(), limits: SCALED });
  // The probe sits beside the API's routes, under the same error handler and the same chunk parser (a stream, never parsed).
  void app.register(async (instance) => {
    await registerApiRoutes(instance, services);
    instance.put<{ Params: { uploadId: string } }>('/probe/uploads/:uploadId', async (request) => ({
      received: await writeChunk(services, { userId: 'TEST-owner', projectId: PROJECT }, request.params.uploadId, HELD.length, ROOM, request.body as Readable),
    }));
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  port = (app.server.address() as AddressInfo).port;
});

afterAll(async () => {
  await app.close();
  await rm(root, { recursive: true, force: true });
});

describe('US-DOCS-01 · F-INGEST-01 · ADR 0034: a chunk whose body ends early is logged with its own code, and nothing of it is kept', () => {
  it('US-DOCS-01 · F-INGEST-01: a chunk the client cuts mid-body is logged as chunk_incomplete, not internal_error, and the upload still holds only its earlier bytes', async () => {
    const uploadId = await stagedUpload();
    await partialChunk(uploadId, 20_000, Buffer.alloc(5000, 0x54), 'cut');
    expect(await recordFor(uploadId)).toEqual({ event: 'upload_chunk_cut', code: 'chunk_incomplete', projectId: PROJECT, uploadId });
    expect(log.filter((record) => record.code === 'internal_error')).toEqual([]);
    expect(await files.stagedSize(PROJECT, uploadId)).toBe(HELD.length);
  });

  it('US-DOCS-01 · F-INGEST-01: a chunk that stalls is answered 408 by the request wait, logged as request_timeout, not internal_error, and nothing of it is kept', async () => {
    const uploadId = await stagedUpload();
    const answered = await partialChunk(uploadId, 20_000, Buffer.alloc(5000, 0x54), 'stall');
    expect(answered.text).toMatch(/^HTTP\/1\.1 408 /u);
    expect(await recordFor(uploadId)).toEqual({ event: 'upload_chunk_cut', code: 'request_timeout', projectId: PROJECT, uploadId });
    expect(log.filter((record) => record.code === 'internal_error')).toEqual([]);
    expect(await files.stagedSize(PROJECT, uploadId)).toBe(HELD.length);
  });

  it('US-DOCS-01 · F-INGEST-01 (control): a whole chunk is kept and logs nothing', async () => {
    const uploadId = await stagedUpload();
    const body = Buffer.alloc(3000, 0x54);
    const answer = await new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
      const request = httpRequest(
        { host: '127.0.0.1', port, method: 'PUT', path: `/probe/uploads/${uploadId}`, headers: { 'content-type': 'application/octet-stream', 'content-length': body.length } },
        (response) => {
          let text = '';
          response.on('data', (chunk: Buffer) => {
            text += chunk.toString('utf8');
          });
          response.on('end', () => resolve({ status: response.statusCode, body: text }));
        },
      );
      request.on('error', reject);
      request.end(body);
    });
    expect(answer).toEqual({ status: 200, body: JSON.stringify({ received: HELD.length + body.length }) });
    expect(log.filter((record) => record.uploadId === uploadId)).toEqual([]);
  });
});
