/**
 * The resumable upload client of step 2 (docs/adr/0019-resumable-uploads-chunk-protocol.md; the
 * protocol as the contract states it: `@sovitech/view-model/browser` uploads.ts). One upload per
 * file; the page runs at most `PARALLEL_UPLOADS` at a time and stays usable while they run (prompt 3
 * section 11, "The wizard stays usable during upload and analysis").
 *
 * - `checkFile` refuses on the page, before any request, a format off the accepted list or a file
 *   over the per-file limit (US-DOCS-01 AC4, AC5).
 * - `uploadFile` creates the upload, sends chunks of `chunkBytes` from the bytes the server holds,
 *   and on a resumable refusal (RESUMABLE_UPLOAD_CODES, a 409 that names the bytes held) or a
 *   network error asks for the status and resumes from the bytes held, up to
 *   UPLOAD_RESUME_ATTEMPTS times in a row; then completes it. It reports states, never a percentage
 *   or a byte count (US-DOCS-03 AC1). A refusal is the file's own: the other files go on (rule 7).
 * - `cancelUpload` aborts an upload the owner leaves before completion.
 *
 * Nothing here logs or shows the file's name: the name is shown only as the API serves it, bound
 * (`upload:<id>.fileName`, `document:<id>.fileName`; prompt 3 section 7): in the step 2 view, or, for
 * an upload the API refused after creating it, in the refusal (`fileName` naming one of its
 * `displayObjects`; DR-10), which the refused state carries.
 */
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, RESUMABLE_UPLOAD_CODES, UPLOAD_RESUME_ATTEMPTS, type DisplayObject } from '@sovitech/view-model/browser';
import { ApiError, NETWORK_UNREACHABLE, isAbort, isSignedOut, request } from './client';

/** How many uploads the page runs at once. */
export const PARALLEL_UPLOADS = 2;

export type FileCheck = { readonly ok: true } | { readonly ok: false; readonly reason: 'format' | 'size' };

export type UploadProgress =
  | { readonly state: 'uploading'; readonly uploadId: string }
  | { readonly state: 'stored'; readonly documentId: string }
  | { readonly state: 'refused'; readonly code: string; readonly message?: string; readonly fileName?: DisplayObject };

/** The refusal codes of the two checks made on the page (and made again by the server). */
export const FORMAT_REFUSED = 'format_not_accepted';
export const SIZE_REFUSED = 'file_too_large';

const ACCEPTED: ReadonlySet<string> = new Set(ACCEPTED_EXTENSIONS);

/** The file's extension, lower case, or '' when it has none. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase();
}

/** The `accept` attribute of the file input: the accepted extensions. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(',');

export function checkFile(file: { readonly name: string; readonly size: number }): FileCheck {
  if (!ACCEPTED.has(extensionOf(file.name))) return { ok: false, reason: 'format' };
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}

const RESUMABLE: ReadonlySet<string> = new Set<string>([...RESUMABLE_UPLOAD_CODES, NETWORK_UNREACHABLE]);

function resumable(error: unknown): error is ApiError {
  return error instanceof ApiError && RESUMABLE.has(error.code);
}

/** The file's own refusal: its code, the served message, and the served name when the refusal carries one (DR-10). */
function refusal(error: ApiError): UploadProgress {
  const { fileName, displayObjects, message } = error.body;
  const name = fileName === undefined ? undefined : displayObjects?.find((display) => display.valueId === fileName);
  return { state: 'refused', code: error.code, ...(message === undefined ? {} : { message }), ...(name === undefined ? {} : { fileName: name }) };
}

/** Errors that are not the file's own refusal: the page handles them (a left page, a lost session). */
function rethrowIfNotTheFiles(error: unknown): asserts error is ApiError {
  if (isAbort(error) || isSignedOut(error) || !(error instanceof ApiError)) throw error;
}

/** The bytes the server holds: from the refusal when it names them, else from the upload's status. */
async function heldBytes(projectId: string, uploadId: string, error: ApiError, signal?: AbortSignal): Promise<number> {
  if (error.body.received !== undefined) return error.body.received;
  const state = await request('uploads.status', { params: { projectId, uploadId }, ...(signal === undefined ? {} : { signal }) });
  return state.received;
}

/**
 * Uploads one file of the project and reports its states. Resolves with the last state: `stored`
 * or `refused`. Rejects only when the page was left (abort) or the session is gone.
 */
export async function uploadFile(
  projectId: string,
  file: File,
  onProgress: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<UploadProgress> {
  const withSignal = signal === undefined ? {} : { signal };
  const check = checkFile(file);
  if (!check.ok) {
    const refused: UploadProgress = { state: 'refused', code: check.reason === 'format' ? FORMAT_REFUSED : SIZE_REFUSED };
    onProgress(refused);
    return refused;
  }

  let uploadId: string;
  let chunkBytes: number;
  let received: number;
  try {
    const created = await request('uploads.create', { params: { projectId }, body: { fileName: file.name, size: file.size }, ...withSignal });
    uploadId = created.uploadId;
    chunkBytes = created.chunkBytes;
    received = created.received;
  } catch (error) {
    rethrowIfNotTheFiles(error);
    const refused = refusal(error);
    onProgress(refused);
    return refused;
  }
  onProgress({ state: 'uploading', uploadId });

  let failures = 0;
  for (;;) {
    try {
      if (received < file.size) {
        const end = Math.min(received + chunkBytes, file.size);
        const next = await request('uploads.append', {
          params: { projectId, uploadId },
          query: { offset: String(received) },
          bytes: file.slice(received, end),
          ...withSignal,
        });
        received = next.received;
        failures = 0;
        continue;
      }
      const completed = await request('uploads.complete', { params: { projectId, uploadId }, ...withSignal });
      const stored: UploadProgress = { state: 'stored', documentId: completed.documentId };
      onProgress(stored);
      return stored;
    } catch (error) {
      rethrowIfNotTheFiles(error);
      const incomplete = error.code === 'upload_incomplete';
      if ((!resumable(error) && !incomplete) || failures >= UPLOAD_RESUME_ATTEMPTS) {
        const refused = refusal(error);
        onProgress(refused);
        return refused;
      }
      failures += 1;
      try {
        received = await heldBytes(projectId, uploadId, error, signal);
      } catch (statusError) {
        rethrowIfNotTheFiles(statusError);
        if (!resumable(statusError) || failures >= UPLOAD_RESUME_ATTEMPTS) {
          const refused = refusal(statusError);
          onProgress(refused);
          return refused;
        }
      }
    }
  }
}

/** Aborts an upload the owner leaves before it completes. A failure is not the owner's concern: an abandoned upload is swept by the server (ADR 0019). */
export async function cancelUpload(projectId: string, uploadId: string): Promise<void> {
  try {
    await request('uploads.abort', { params: { projectId, uploadId } });
  } catch (error) {
    if (isSignedOut(error)) throw error;
  }
}
