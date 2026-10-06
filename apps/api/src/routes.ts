/**
 * The API routes: phase 2's sessions and CSRF, the upload protocol, and a project's
 * documents (docs/adr/0019, 0024, 0025), phase 3's routes of the wizard contract
 * (packages/view-model/src/browser/contract/routes.ts; docs/adr/0036, 0038): the
 * development login (./auth/dev-login.ts), the project list and creation, and the
 * wizard (./wizard/routes.ts), phase 4's workspace (./workspace/routes.ts;
 * docs/adr/0043, 0044, 0045), and phase 5's stored proposal, Reports and exports
 * (./proposal/routes.ts; docs/adr/0047 to 0050). The phase 2 routes return records and 2.8 status lines;
 * every phase 3 route that shows a value answers display objects (prompt 3 section 6).
 *
 * - Every project route reads the session's user from a signed, HTTP-only cookie and
 *   answers 401 without one; the store decides, in the user's own request, what that
 *   user may see and write (row-level security; the guards). Another project reads as
 *   not found.
 * - Every state-changing route checks the CSRF token (prompt 3 section 11).
 * - Errors are codes: a store refusal keeps its code, anything else is `internal_error`,
 *   and nothing logged or answered carries a file name, document text or an excerpt
 *   (rule 13).
 */
import { createHmac } from 'node:crypto';
import cookie from '@fastify/cookie';
import csrf from '@fastify/csrf-protection';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { StoreRefusal } from '@sovitech/db';
import { registerAuthRoutes } from './auth/dev-login';
import { CSRF_COOKIE, SESSION_COOKIE } from './auth/sessions';
import { statusLineOf } from './documents/coverage';
import {
  declareRevision,
  deleteDocument,
  downloadableDocument,
  engineerDocumentRecord,
  inProject,
  ownerDocumentList,
} from './documents/service';
import { ApiRefusal, notFound } from './errors';
import { ResponseInvalid } from './http';
import { IntakeRefusal } from '@sovitech/view-model/server';
import type { ApiServices } from './services';
import { FileStoreError } from './storage/file-store';
import { abortUpload, appendUpload, completeUpload, createUpload, uploadStatus } from './uploads/service';
import { registerWizardRoutes } from './wizard/routes';
import { registerWorkspaceRoutes } from './workspace/routes';
import { registerProposalRoutes } from './proposal/routes';

const UUID = { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' } as const;
const PROJECT_PARAMS = { type: 'object', properties: { projectId: UUID }, required: ['projectId'] } as const;
const UPLOAD_PARAMS = { type: 'object', properties: { projectId: UUID, uploadId: UUID }, required: ['projectId', 'uploadId'] } as const;
const DOCUMENT_PARAMS = { type: 'object', properties: { projectId: UUID, documentId: UUID }, required: ['projectId', 'documentId'] } as const;

/** The HTTP status of each of the question engine's refusal codes (contract routes.ts). */
const INTAKE_STATUS: Readonly<Record<IntakeRefusal['code'], 403 | 409 | 422>> = {
  answer_invalid: 422,
  number_ambiguous: 422,
  unit_mismatch: 422,
  qualifier_required: 422,
  question_answered: 409,
  question_required: 422,
  confirmation_not_shown: 409,
  not_an_engineer_field: 403,
  conflict_not_open: 409,
  routed_to_engineer: 403,
  shown_value_changed: 409,
};

interface ProjectParams {
  readonly projectId: string;
}
interface UploadParams extends ProjectParams {
  readonly uploadId: string;
}
interface DocumentParams extends ProjectParams {
  readonly documentId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** The session's app user, set by the project routes' session check. */
    sovitechUserId?: string;
    /** The id of the request's live session (the signed cookie's value), set with `sovitechUserId`: what a CSRF token is bound to. */
    sovitechSessionId?: string;
  }
}

/** What a CSRF token is bound to: the request's live session, or none (before sign-in). */
function csrfUserInfo(request: FastifyRequest): string {
  return request.sovitechSessionId === undefined ? 'no-session' : `session:${request.sovitechSessionId}`;
}

/** The key the CSRF tokens' HMAC takes, derived from the cookie secret so no second secret is needed. */
function csrfHmacKey(cookieSecret: string): string {
  return createHmac('sha256', cookieSecret).update('sovitech csrf token key').digest('base64url');
}

/** The user of the request's session, or a 401 refusal. */
function userOf(request: FastifyRequest): string {
  const userId = request.sovitechUserId;
  if (userId === undefined) throw new ApiRefusal(401, 'not_signed_in');
  return userId;
}

export async function registerApiRoutes(app: FastifyInstance, services: ApiServices): Promise<void> {
  await app.register(cookie, { secret: services.cookieSecret });
  // Prompt 3 section 11; part B, A-11 (ADR 0038 decision 9): a CSRF token is bound to the session it was issued for
  // (its HMAC takes the live session's id, or "no-session" before sign-in), so another browser's token, a token from
  // before sign-in, or one from an ended session is refused 403 `csrf_invalid` on this session; and the secret itself
  // is cleared on sign-in and sign-out (./auth/dev-login.ts), so the next token comes from a new one.
  await app.register(csrf, {
    sessionPlugin: '@fastify/cookie',
    cookieKey: CSRF_COOKIE,
    cookieOpts: { signed: true, httpOnly: true, sameSite: 'strict', path: '/' },
    getUserInfo: csrfUserInfo,
    csrfOpts: { hmacKey: csrfHmacKey(services.cookieSecret) },
  });

  // A chunk arrives as raw bytes: handed to the route as a stream, never buffered or parsed.
  app.addContentTypeParser('application/octet-stream', (_request, payload, done) => {
    done(null, payload);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiRefusal) {
      return reply.code(error.status).send({
        code: error.code,
        ...(error.ownerMessage === undefined ? {} : { message: error.ownerMessage }),
        ...(error.received === undefined ? {} : { received: error.received }),
        ...(error.fields === undefined ? {} : { fields: [...error.fields] }),
        ...(error.named === undefined ? {} : { fileName: error.named.fileName, displayObjects: [...error.named.displayObjects] }),
      });
    }
    // The question engine's refusals, each with the status routes.ts names for its code.
    if (error instanceof IntakeRefusal) return reply.code(INTAKE_STATUS[error.code]).send({ code: error.code });
    // @fastify/csrf-protection's refusals (a missing or wrong token or secret): 403 `csrf_invalid` (contract routes.ts).
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.startsWith('FST_CSRF_')) return reply.code(403).send({ code: 'csrf_invalid' });
    if (error instanceof ResponseInvalid) {
      services.log({ event: 'api_error', code: 'response_invalid', ...(request.routeOptions.url === undefined ? {} : { codes: [request.routeOptions.url] }) });
      return reply.code(500).send({ code: 'internal_error' });
    }
    if (error instanceof StoreRefusal) return reply.code(403).send({ code: error.refusal });
    if (error instanceof FileStoreError) return reply.code(error.code === 'bad_key' ? 404 : 409).send({ code: error.code });
    const validation = (error as { validation?: unknown }).validation;
    if (validation !== undefined) return reply.code(400).send({ code: 'request_invalid' });
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) return reply.code(status).send({ code: 'request_refused' });
    services.log({ event: 'api_error', code: 'internal_error', ...(request.routeOptions.url === undefined ? {} : { codes: [request.routeOptions.url] }) });
    return reply.code(500).send({ code: 'internal_error' });
  });

  const signedIn = async (request: FastifyRequest): Promise<void> => {
    const raw = request.cookies[SESSION_COOKIE];
    if (raw === undefined) return;
    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid || unsigned.value === null) return;
    const userId = services.sessions.userOf(unsigned.value);
    if (userId !== undefined) {
      request.sovitechUserId = userId;
      request.sovitechSessionId = unsigned.value;
    }
  };
  app.addHook('onRequest', signedIn);
  const guarded = { onRequest: app.csrfProtection };

  app.get('/api/csrf', async (request, reply) => ({ token: reply.generateCsrf({ userInfo: csrfUserInfo(request) }) }));

  // ---- Phase 3: sign-in, projects and the wizard (docs/adr/0036, 0038) ----------------

  registerAuthRoutes(app, services, guarded);
  registerWizardRoutes(app, services, guarded);

  // ---- Phase 4: the workspace (docs/adr/0043, 0044, 0045) ---------------------------------

  registerWorkspaceRoutes(app, services, guarded);

  // ---- Phase 5: the stored proposal, Reports and exports (docs/adr/0047 to 0050) -------------------

  registerProposalRoutes(app, services, guarded);

  // ---- Uploads (ADR 0019) --------------------------------------------------------------

  app.post<{ Params: ProjectParams; Body: { fileName: string; size: number } }>(
    '/api/projects/:projectId/uploads',
    {
      ...guarded,
      schema: {
        params: PROJECT_PARAMS,
        body: { type: 'object', properties: { fileName: { type: 'string' }, size: { type: 'integer' } }, required: ['fileName', 'size'], additionalProperties: false },
      },
    },
    async (request, reply) => {
      const state = await createUpload(services, { userId: userOf(request), projectId: request.params.projectId }, request.body);
      return reply.code(201).send(state);
    },
  );

  app.get<{ Params: UploadParams }>('/api/projects/:projectId/uploads/:uploadId', { schema: { params: UPLOAD_PARAMS } }, async (request) =>
    uploadStatus(services, { userId: userOf(request), projectId: request.params.projectId }, request.params.uploadId),
  );

  app.put<{ Params: UploadParams; Querystring: { offset: number } }>(
    '/api/projects/:projectId/uploads/:uploadId',
    {
      ...guarded,
      schema: {
        params: UPLOAD_PARAMS,
        querystring: { type: 'object', properties: { offset: { type: 'integer', minimum: 0 } }, required: ['offset'] },
      },
    },
    async (request) => {
      const body = request.body as Readable | undefined;
      if (body === undefined || typeof body.pipe !== 'function') throw new ApiRefusal(415, 'chunk_not_octet_stream');
      return appendUpload(services, { userId: userOf(request), projectId: request.params.projectId }, request.params.uploadId, request.query.offset, body);
    },
  );

  app.post<{ Params: UploadParams }>('/api/projects/:projectId/uploads/:uploadId/complete', { ...guarded, schema: { params: UPLOAD_PARAMS } }, async (request, reply) => {
    const completed = await completeUpload(services, { userId: userOf(request), projectId: request.params.projectId }, request.params.uploadId);
    return reply.code(201).send({ documentId: completed.document.id, statusLine: statusLineOf(completed.document.analysis) });
  });

  app.delete<{ Params: UploadParams }>('/api/projects/:projectId/uploads/:uploadId', { ...guarded, schema: { params: UPLOAD_PARAMS } }, async (request, reply) => {
    await abortUpload(services, { userId: userOf(request), projectId: request.params.projectId }, request.params.uploadId);
    return reply.code(204).send();
  });

  // ---- Documents (ADR 0025) ------------------------------------------------------------

  app.get<{ Params: ProjectParams }>('/api/projects/:projectId/documents', { schema: { params: PROJECT_PARAMS } }, async (request) => ({
    documents: await inProject(services, { userId: userOf(request), projectId: request.params.projectId }, ownerDocumentList),
  }));

  app.delete<{ Params: DocumentParams }>('/api/projects/:projectId/documents/:documentId', { ...guarded, schema: { params: DOCUMENT_PARAMS } }, async (request) => {
    const report = await deleteDocument(services, { userId: userOf(request), projectId: request.params.projectId }, request.params.documentId);
    return { documentId: report.documentId, filesKeptForAnotherDocument: report.filesKeptForAnotherDocument };
  });

  app.post<{ Params: DocumentParams; Body: { revisionOf: string } }>(
    '/api/projects/:projectId/documents/:documentId/revision-of',
    {
      ...guarded,
      schema: { params: DOCUMENT_PARAMS, body: { type: 'object', properties: { revisionOf: UUID }, required: ['revisionOf'], additionalProperties: false } },
    },
    async (request, reply) => {
      const userId = userOf(request);
      await inProject(services, { userId, projectId: request.params.projectId }, (store) =>
        declareRevision(store, { userId, documentId: request.params.documentId, revisionOf: request.body.revisionOf }),
      );
      return reply.code(204).send();
    },
  );

  app.get<{ Params: DocumentParams }>('/api/projects/:projectId/documents/:documentId/engineer-record', { schema: { params: DOCUMENT_PARAMS } }, async (request) =>
    inProject(services, { userId: userOf(request), projectId: request.params.projectId }, (store) => engineerDocumentRecord(store, request.params.documentId)),
  );

  app.get<{ Params: DocumentParams }>('/api/projects/:projectId/documents/:documentId/file', { schema: { params: DOCUMENT_PARAMS } }, async (request, reply) => {
    const projectId = request.params.projectId;
    const found = await inProject(services, { userId: userOf(request), projectId }, (store) => downloadableDocument(store, request.params.documentId));
    if (!(await services.files.exists(services.files.originalPath(projectId, found.contentHash)))) throw notFound();
    return reply
      .header('content-type', 'application/octet-stream')
      .header('content-disposition', 'attachment')
      .header('cache-control', 'private, no-store')
      .send(services.files.openOriginal(projectId, found.contentHash));
  });
}

