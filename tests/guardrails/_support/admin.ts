/**
 * TEST helpers for the development-only admin area (phase 7; docs/adr/0053), for tests/api/admin-routes.test.ts and the
 * case files G1-33, G3-24, G3-26, G13-15, G13-16 and GS-2:
 * - `adminOf`: a TEST person holding `sovitech_admin`, member of no project, signed in (as the development login signs
 *   in the development admin; ADR 0038, amended);
 * - `adminGet`: one of the three admin routes, as a user;
 * - `inferredValue`: an `ai_inference` candidate read from pages of a TEST document by the project's TEST extraction
 *   account, through the store's one path (the ingestion path's own writer; no AI call is made, and no recording is
 *   used: the value is a test's own, never a model's output);
 * - `wordsOf`: every string a JSON body holds, for the cases that prove what a response never carries (rule 13).
 * Every account, document and value is TEST data. Nothing here catches an error.
 */
import { insertCandidate, newId, withRequest, type Request } from '@sovitech/db';
import { createTestAccount } from '@sovitech/db/testing';
import type { Confidence, DocumentRecord } from '@sovitech/domain';
import type { RegistryFieldDefinition } from '@sovitech/registry/validation';
import { signIn, type Auth, type TestApi } from './api';

/** A TEST admin (a person holding sovitech_admin, member of no project), signed in. */
export async function adminOf(api: TestApi, label: string): Promise<{ readonly adminId: string; readonly admin: Auth }> {
  const adminId = await createTestAccount(api.database, { label: `${label} admin`, kind: 'person', roles: ['sovitech_admin'] });
  return { adminId, admin: await signIn(api, adminId) };
}

export type AdminPath = 'accounts' | 'datasets' | 'guardrail-events';

/** GET /api/admin/<page> with a user's headers (or none). */
export function adminGet(api: Pick<TestApi, 'app'>, auth: Auth | undefined, page: AdminPath) {
  return api.app.inject({ method: 'GET', url: `/api/admin/${page}`, headers: { ...(auth ?? {}) } });
}

/** An `ai_inference` candidate of the given confidence on a field, its evidence the cited pages of TEST documents. */
export async function inferredValue(
  api: TestApi,
  input: {
    readonly projectId: string;
    readonly serviceId: string;
    readonly subjectId: string;
    readonly field: RegistryFieldDefinition;
    readonly choice: string;
    readonly confidence: Confidence;
    readonly from: readonly { readonly document: DocumentRecord; readonly page: number; readonly excerpt: string }[];
  },
): Promise<string> {
  return withRequest(api.database.app, { userId: input.serviceId, projectId: input.projectId }, async (request: Request) => {
    const id = newId();
    const written = await insertCandidate(
      request,
      {
        id,
        subjectId: input.subjectId,
        fieldKey: input.field.key,
        choice: input.choice,
        source: 'ai_inference',
        confidence: input.confidence,
        evidence: input.from.map((entry) => ({ documentId: entry.document.id, contentHash: entry.document.contentHash, locator: { page: entry.page }, excerpt: entry.excerpt, check: 'text_match' as const })),
        createdBy: input.serviceId,
      },
      input.field,
    );
    if (written.outcome !== 'stored') throw new Error(`the store did not keep the TEST inference: ${written.outcome}`);
    return id;
  });
}

/** Every string a JSON value holds (keys and values), for proving what a response never carries. */
export function wordsOf(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) for (const entry of value) wordsOf(entry, into);
  else if (typeof value === 'object' && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      into.push(key);
      wordsOf(entry, into);
    }
  }
  return into;
}
