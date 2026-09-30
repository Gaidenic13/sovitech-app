/**
 * The API routes of phase 2: sessions and CSRF, the upload protocol, and a project's
 * documents (docs/adr/0019, 0024, 0025). The screens are phase 3 and 4: these routes
 * return records and 2.8 status lines, and the view-model turns them into display
 * objects there (prompt 3 section 6).
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
import cookie from '@fastify/cookie';
import csrf from '@fastify/csrf-protection';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import { StoreRefusal } from '@sovitech/db';
import { SESSION_COOKIE } from './auth/sessions';
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
import type { ApiServices } from './services';
import { FileStoreError } from './storage/file-store';
import { abortUpload, appendUpload, completeUpload, createUpload, uploadStatus } from './uploads/service';

const UUID = { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' } as const;
const PROJECT_PARAMS = { type: 'object', properties: { projectId: UUID }, required: ['projectId'] } as const;
const UPLOAD_PARAMS = { type: 'object', properties: { projectId: UUID, uploadId: UUID }, required: ['projectId', 'uploadId'] } as const;
const DOCUMENT_PARAMS = { type: 'object', properties: { projectId: UUID, documentId: UUID }, required: ['projectId', 'documentId'] } as const;

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
  }
}

/** The user of the request's session, or a 401 refusal. */
function userOf(request: FastifyRequest): string {
  const userId = request.sovitechUserId;
  if (userId === undefined) throw new ApiRefusal(401, 'not_signed_in');
  return userId;
}

export async function registerApiRoutes(app: FastifyInstance, services: ApiServices): Promise<void> {
  await app.register(cookie, { secret: services.cookieSecret });
  await app.register(csrf, {
    sessionPlugin: '@fastify/cookie',
    cookieOpts: { signed: true, httpOnly: true, sameSite: 'strict', path: '/' },
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
      });
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
    if (userId !== undefined) request.sovitechUserId = userId;
  };
  app.addHook('onRequest', signedIn);
  const guarded = { onRequest: app.csrfProtection };

  app.get('/api/csrf', async (_request, reply) => ({ token: reply.generateCsrf() }));

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

