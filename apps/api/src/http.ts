/**
 * What every phase 3 route shares: reading a request body, query or parameter with the contract's
 * zod schema (packages/view-model/src/browser/contract; docs/adr/0036), the session's user, and
 * answering with a body the contract's response schema accepts.
 *
 * - A body, query or parameter the schema refuses is 400 `request_invalid` (routes.ts, "Refusals
 *   common to every route"); nothing of the refused input is logged or echoed (rule 13).
 * - The API validates its own answers against the contract before sending (ADR 0036, decision 1):
 *   a display object or view that does not satisfy the contract is never sent; the request is
 *   answered 500 `internal_error` and logged by code (`response_invalid`) and route only.
 */
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { ApiRefusal } from './errors';

/** The value, parsed with the contract's schema, or a 400 `request_invalid` refusal. */
export function parseWith<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiRefusal(400, 'request_invalid');
  return parsed.data;
}

/** A response the contract refused: the route answers 500 and logs the code. */
export class ResponseInvalid extends Error {
  override name = 'ResponseInvalid';

  constructor(readonly paths: readonly string[]) {
    super('a response did not satisfy the contract');
  }
}

/** The response, checked against the contract's schema; throws ResponseInvalid (never sent) when it does not satisfy it. */
export function answerWith<S extends z.ZodType>(schema: S, value: z.infer<S>): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ResponseInvalid(parsed.error.issues.map((issue) => issue.path.map(String).join('.')));
  return parsed.data;
}

/** The user of the request's session, or a 401 `not_signed_in` refusal. */
export function userOf(request: FastifyRequest): string {
  const userId = request.sovitechUserId;
  if (userId === undefined) throw new ApiRefusal(401, 'not_signed_in');
  return userId;
}
