import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_FILE_BYTES, UPLOAD_RESUME_ATTEMPTS } from '@sovitech/view-model/browser';
import { resetCsrfToken } from './client';
import { checkFile, uploadFile, type UploadProgress } from './uploads';

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
const UPLOAD = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e90';
const DOCUMENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e91';
const BASE = `/api/projects/${PROJECT}/uploads`;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/**
 * A fake upload server holding `held` bytes; `script` may replace the answer to the n-th append
 * (a timeout, a network error) to test the resume path.
 */
function fakeUploadServer(options: { readonly size: number; readonly chunkBytes: number; readonly appendFaults?: ReadonlyMap<number, () => Response | Error>; readonly complete?: () => Response }) {
  let held = 0;
  let appends = 0;
  const offsets: string[] = [];
  const requests: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const url = new URL(input, 'http://127.0.0.1');
      requests.push(`${method} ${url.pathname}`);
      if (url.pathname === '/api/csrf') return json(200, { token: 'TEST-token' });
      if (method === 'POST' && url.pathname === BASE) return json(201, { uploadId: UPLOAD, received: 0, chunkBytes: options.chunkBytes });
      if (method === 'GET' && url.pathname === `${BASE}/${UPLOAD}`) return json(200, { uploadId: UPLOAD, received: held, chunkBytes: options.chunkBytes });
      if (method === 'PUT' && url.pathname === `${BASE}/${UPLOAD}`) {
        appends += 1;
        const fault = options.appendFaults?.get(appends);
        if (fault !== undefined) {
          const answer = fault();
          if (answer instanceof Error) throw answer;
          return answer;
        }
        const offset = url.searchParams.get('offset');
        offsets.push(offset ?? 'none');
        if (offset !== String(held)) return json(409, { code: 'offset_mismatch', received: held });
        const body = init?.body;
        const length = body instanceof Blob ? body.size : 0;
        held = Math.min(held + length, options.size);
        return json(200, { uploadId: UPLOAD, received: held, chunkBytes: options.chunkBytes });
      }
      if (method === 'POST' && url.pathname === `${BASE}/${UPLOAD}/complete`) {
        if (options.complete !== undefined) return options.complete();
        return json(201, { documentId: DOCUMENT, statusLine: null });
      }
      return json(404, { code: 'not_found' });
    }),
  );
  return { offsets, requests, held: () => held };
}

function testFile(size: number, name = 'TEST-schedule.pdf'): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

beforeEach(() => resetCsrfToken());
afterEach(() => vi.unstubAllGlobals());

describe('US-DOCS-01 · F-INGEST-01 · ADR 0019: the resumable upload client', () => {
  it('US-DOCS-01 AC4, AC5: a format off the accepted list or a file over the per-file limit is refused on the page, before any request', async () => {
    expect(checkFile({ name: 'TEST.exe', size: 10 })).toEqual({ ok: false, reason: 'format' });
    expect(checkFile({ name: 'no-extension', size: 10 })).toEqual({ ok: false, reason: 'format' });
    expect(checkFile({ name: 'TEST.PDF', size: 10 })).toEqual({ ok: true });
    expect(checkFile({ name: 'TEST.jpeg', size: 10 })).toEqual({ ok: true });
    expect(checkFile({ name: 'TEST.ifc', size: MAX_FILE_BYTES })).toEqual({ ok: true });
    expect(checkFile({ name: 'TEST.ifc', size: MAX_FILE_BYTES + 1 })).toEqual({ ok: false, reason: 'size' });

    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const states: UploadProgress[] = [];
    const result = await uploadFile(PROJECT, testFile(4, 'TEST.exe'), (progress) => states.push(progress));
    expect(result).toEqual({ state: 'refused', code: 'format_not_accepted' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ADR 0019 · US-DOCS-03 AC1: chunks go in order from the bytes held, then the upload completes; only states are reported, never a percentage', async () => {
    const server = fakeUploadServer({ size: 10, chunkBytes: 4 });
    const states: UploadProgress[] = [];
    const result = await uploadFile(PROJECT, testFile(10), (progress) => states.push(progress));
    expect(server.offsets).toEqual(['0', '4', '8']);
    expect(result).toEqual({ state: 'stored', documentId: DOCUMENT });
    expect(states).toEqual([{ state: 'uploading', uploadId: UPLOAD }, { state: 'stored', documentId: DOCUMENT }]);
  });

  it('ADR 0019 · phase 2 "Next": after chunk_timeout the client resumes from the bytes the refusal names, never from the start', async () => {
    const server = fakeUploadServer({ size: 10, chunkBytes: 4, appendFaults: new Map([[2, () => json(409, { code: 'chunk_timeout', received: 4 })]]) });
    const result = await uploadFile(PROJECT, testFile(10), () => undefined);
    expect(result.state).toBe('stored');
    expect(server.offsets).toEqual(['0', '4', '8']);
  });

  it('ADR 0019 · phase 2 "Next": after a network error the client asks for the status and resumes from the bytes held', async () => {
    const server = fakeUploadServer({ size: 10, chunkBytes: 4, appendFaults: new Map([[2, () => new TypeError('fetch failed')]]) });
    const result = await uploadFile(PROJECT, testFile(10), () => undefined);
    expect(result.state).toBe('stored');
    expect(server.requests).toContain(`GET ${BASE}/${UPLOAD}`);
    expect(server.offsets).toEqual(['0', '4', '8']);
  });

  it('ADR 0028: a file that is not a synthetic fixture is refused with the served message; only that file', async () => {
    const message = 'TEST refusal message from the API.';
    fakeUploadServer({ size: 4, chunkBytes: 4, complete: () => json(422, { code: 'not_a_fixture', message }) });
    const result = await uploadFile(PROJECT, testFile(4), () => undefined);
    expect(result).toEqual({ state: 'refused', code: 'not_a_fixture', message });
  });

  it('ADR 0019: the client stops resuming after UPLOAD_RESUME_ATTEMPTS failures in a row and reports the file as not uploaded', async () => {
    const faults = new Map<number, () => Response>();
    for (let attempt = 1; attempt <= UPLOAD_RESUME_ATTEMPTS + 2; attempt += 1) faults.set(attempt, () => json(409, { code: 'upload_busy' }));
    fakeUploadServer({ size: 4, chunkBytes: 4, appendFaults: faults });
    const result = await uploadFile(PROJECT, testFile(4), () => undefined);
    expect(result).toEqual({ state: 'refused', code: 'upload_busy' });
  });
});
