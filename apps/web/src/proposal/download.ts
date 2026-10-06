/**
 * Saving a file the API produces (phase 5; docs/adr/0050-exports-print-route-and-pdf.md): the proposal PDF
 * (`exports.file`, printed again from its stored record on every download, decision 3) and the Equipment register's
 * CSV (`exports.equipment`, decision 4).
 *
 * The file is read with the session cookie (same origin, as every request of ../api/client.ts), then handed to the
 * browser as a download under the name the API gave it (`content-disposition`; a name that holds no document text,
 * rule 13). Reading it first, rather than following a link, lets the page say plainly when the file could not be
 * prepared (the printer's `503 export_unavailable`, a refusal, the API unreachable) and keep the owner where they
 * are (rule 7: nothing is blocked; the control takes presses again), and a signed-out session shows sign-in (rule 13).
 * The paths come from the contract's route table (`pathOf`), so the web can fetch no route the contract does not list.
 */
import { RefusalBodySchema, pathOf, type RefusalBody } from '@sovitech/view-model/browser';
import { ApiError, NETWORK_UNREACHABLE, isAbort } from '../api/client';

/** The file name a `content-disposition` header gives (`attachment; filename="…"`), or undefined. */
export function fileNameOf(disposition: string | null): string | undefined {
  if (disposition === null) return undefined;
  const quoted = /filename="([^"]+)"/u.exec(disposition)?.[1];
  if (quoted !== undefined && quoted.trim() !== '') return quoted;
  const bare = /filename=([^;]+)/u.exec(disposition)?.[1]?.trim();
  return bare === undefined || bare === '' ? undefined : bare;
}

async function refusalOf(response: Response): Promise<ApiError> {
  let body: RefusalBody = { code: response.status >= 500 ? 'internal_error' : 'request_refused' };
  try {
    const parsed = RefusalBodySchema.safeParse(await response.json());
    if (parsed.success) body = parsed.data;
  } catch {
    // A refusal without a JSON body keeps the generic code above.
  }
  return new ApiError(response.status, body);
}

/** How long the saved file's object URL is kept for the browser to read it. */
const OBJECT_URL_LIFETIME_MS = 60_000;

/**
 * Reads the file at a contract route's path and saves it. Throws `ApiError` (status 0 `network_unreachable` when the
 * request never reached the API), as the client does; a 401 means the session is gone.
 */
export async function saveFile(url: string, options: { readonly signal?: AbortSignal } = {}): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: 'same-origin', headers: { accept: '*/*' }, ...(options.signal === undefined ? {} : { signal: options.signal }) });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ApiError(0, { code: NETWORK_UNREACHABLE });
  }
  if (!response.ok) throw await refusalOf(response);
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileNameOf(response.headers.get('content-disposition')) ?? '';
  link.rel = 'noopener';
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), OBJECT_URL_LIFETIME_MS);
}

/** The path of a generated output's file (`exports.file`). */
export function exportFilePath(projectId: string, outputId: string): string {
  return pathOf('exports.file', { projectId, outputId });
}

/** The path of the Equipment register's CSV with the page's filters (`exports.equipment`; undefined ones not sent). */
export function equipmentExportPath(projectId: string, query: Readonly<Record<string, string | undefined>>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') search.set(key, value);
  const path = pathOf('exports.equipment', { projectId });
  const text = search.toString();
  return text === '' ? path : `${path}?${text}`;
}
