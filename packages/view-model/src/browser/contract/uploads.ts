/**
 * The upload routes of phase 2 as the web's resumable upload client uses them on step 2
 * (docs/adr/0019-resumable-uploads-chunk-protocol.md; ADR 0028 the fixtures-only guard; PRD
 * R-013, R-014; US-DOCS-01). Restated here for the browser; the API's own schemas stay in
 * apps/api/src/routes.ts, and a server-side test (the API builder's) asserts these constants equal
 * apps/api/src/documents/formats.ts and apps/api/src/uploads/service.ts.
 *
 * The client protocol:
 * 1. Refuse on the page, before any request, a file whose extension is not in ACCEPTED_EXTENSIONS
 *    or whose size is over MAX_FILE_BYTES, with an inline error on its own row; keep the other
 *    files; Continue stays enabled (US-DOCS-01 AC4, AC5).
 * 2. `POST /uploads` {fileName, size} → UploadState. The server refuses the same two cases too
 *    (415 `format_not_accepted`, 413 `file_too_large`).
 * 3. `PUT /uploads/:uploadId?offset=<received>` with `application/octet-stream` bodies of at most
 *    `chunkBytes`, in order, each within 120 s. On 409 `upload_busy`, `chunk_timeout` or
 *    `offset_mismatch`, and on a chunk refused `chunk_incomplete` or `request_timeout`, or a
 *    network error: `GET /uploads/:uploadId` for the bytes held, and resume from `received`
 *    (phase 2 "Next": the upload client resumes, never restarts).
 * 4. `POST /uploads/:uploadId/complete` → 201 {documentId, statusLine}. 422 `not_a_fixture`: this
 *    development build stores only the synthetic fixtures (the owner's decision, ADR 0028); show
 *    the served message on the file's row.
 * 5. `DELETE /uploads/:uploadId` to cancel an upload the owner removes before completion.
 * No percentage, byte count or size is shown (US-DOCS-03 AC1, AC8; proposal 7.2.30): a row shows a
 * progress state with no text of its own until the step 2 view lists the stored document.
 */
import { z } from 'zod';
import { UuidSchema } from './display';

/** The accepted-format line of step 2, "PDF, DWG, IFC, RVT, XLSX, DOCX, JPG, PNG, ZIP", by extension (case ignored; jpeg is jpg). */
export const ACCEPTED_EXTENSIONS = ['pdf', 'dwg', 'ifc', 'rvt', 'xlsx', 'docx', 'jpg', 'jpeg', 'png', 'zip'] as const;

/** The per-file limit shown as "Max file size 500 MB" (prompt 3 5.2: per file; R-021 "Until decided": no total limit). Never shown as a number. */
export const MAX_FILE_BYTES = 500 * 1024 * 1024;

/** How many times the client resumes one upload before it shows the row's error and stops. */
export const UPLOAD_RESUME_ATTEMPTS = 5;

export const CreateUploadRequestSchema = z.strictObject({ fileName: z.string().min(1).max(255), size: z.number().int().positive() });
export const UploadStateSchema = z.strictObject({ uploadId: UuidSchema, received: z.number().int().nonnegative(), chunkBytes: z.number().int().positive() });
export type UploadState = z.infer<typeof UploadStateSchema>;

/** The completion's answer. `statusLine` is phase 2's raw line object: the web does not show it; it refetches the step 2 view, whose rows carry display objects. */
export const CompleteUploadResponseSchema = z.strictObject({ documentId: UuidSchema, statusLine: z.unknown() });

/** Refusals after which the client resumes from the bytes held (step 3 above). */
export const RESUMABLE_UPLOAD_CODES = ['upload_busy', 'chunk_timeout', 'offset_mismatch', 'chunk_incomplete', 'request_timeout'] as const;
