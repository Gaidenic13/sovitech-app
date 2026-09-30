/**
 * Refusals the API answers with: an HTTP status, a code, and, where the owner sees
 * it, a clear message. A message never holds a file name, document text or an
 * excerpt (rule 13); a store refusal keeps only its code.
 */
export class ApiRefusal extends Error {
  override name = 'ApiRefusal';

  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422,
    readonly code: string,
    readonly ownerMessage?: string,
    /** For a resumable upload: the bytes the server holds, so the client resumes from there. */
    readonly received?: number,
  ) {
    super(code);
  }
}

/**
 * A chunk whose body did not arrive whole: cut by the client (`chunk_incomplete`), or answered 408 by the
 * server's request wait (`request_timeout`; ADR 0034 decision 6). The upload logs it with this code, never
 * as `internal_error`, and the client resumes from the bytes the server holds (phase 2 fix round 4).
 */
export const CHUNK_CUT_CODES = ['chunk_incomplete', 'request_timeout'] as const;
export type ChunkCutCode = (typeof CHUNK_CUT_CODES)[number];

export const notFound = (): ApiRefusal => new ApiRefusal(404, 'not_found');
export const forbidden = (code = 'not_allowed'): ApiRefusal => new ApiRefusal(403, code);
