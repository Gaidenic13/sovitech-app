/**
 * The files being added on Documents (UD-21; US-DOCS-12 AC1, AC2, AC6; US-DOCS-01 AC4, AC5; rule 7): the
 * project's uploads (../../../wizard/UploadsProvider.tsx, which lives at project level, so an upload goes
 * on when the upload surface closes or the owner opens another page), each as step 2 draws it:
 * - a file sent and not yet listed by the register: a progress bar with no number and no size, "Uploading",
 *   and "Stop upload" while its bytes are on their way; its name shows once the register lists it, as
 *   served (no name is shown as typed: prompt 3 section 7);
 * - a file refused on the page (format, size) or by the API (the fixtures-only guard, ADR 0028): what
 *   happened, with Dismiss; the other files go on (rule 7);
 * - a Replace whose revision declaration was refused: what happened and how to declare it from the new
 *   document's menu.
 * Nothing here blocks the page, and nothing opens a dialog.
 */
import { CircleAlert, FileText } from 'lucide-react';
import { Button, Progress, Value } from '@sovitech/ui';
import type { DocumentRow } from '@sovitech/view-model/browser';
import { FORMAT_REFUSED, SIZE_REFUSED } from '../../../api/uploads';
import { copy } from '../../../copy';
import { useUploads, type UploadEntry } from '../../../wizard/UploadsProvider';

type Refused = Extract<UploadEntry, { phase: 'refused' }>;

function refusalMessage(entry: Refused): string {
  if (entry.code === FORMAT_REFUSED) return copy.step2.formatRefused;
  if (entry.code === SIZE_REFUSED) return copy.step2.sizeRefused;
  return entry.message ?? copy.step2.uploadFailed;
}

function RefusedTitle({ entry }: { readonly entry: Refused }) {
  if (entry.fileName !== undefined) {
    return (
      <div className="text-[14px] font-semibold break-words">
        <Value display={entry.fileName} layout="bare" />
      </div>
    );
  }
  return <p className="text-[14px] font-semibold">{entry.extension === undefined ? copy.step2.refusedFile : copy.step2.refusedFileOfType.replace('{extension}', entry.extension)}</p>;
}

/** The entries Documents shows: those not yet listed by the register, refused ones, and Replaces whose declaration was refused. */
export function shownUploads(entries: readonly UploadEntry[], rows: readonly DocumentRow[]): UploadEntry[] {
  const listed = new Set(rows.map((row) => row.documentId));
  return entries.filter(
    (entry) =>
      entry.phase === 'waiting' ||
      entry.phase === 'uploading' ||
      entry.phase === 'refused' ||
      (entry.phase === 'stored' && (entry.revision === 'failed' || entry.revision === 'declaring' || !listed.has(entry.documentId))),
  );
}

export function UploadsList({ rows }: { readonly rows: readonly DocumentRow[] }) {
  const uploads = useUploads();
  const shown = shownUploads(uploads.entries, rows);
  if (shown.length === 0) return null;
  return (
    <section aria-labelledby="documents-uploads" className="flex flex-col gap-2">
      <h2 id="documents-uploads" className="sov-heading-group">
        {copy.workspace.documents.uploadsHeading}
      </h2>
      <ul className="border-t border-(--sov-border)">
        {shown.map((entry) => {
          if (entry.phase === 'refused') {
            return (
              <li key={entry.key} className="flex items-start gap-4 border-b border-(--sov-border) py-3">
                <div role="alert" className="flex flex-1 items-start gap-3">
                  <CircleAlert size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" className="mt-0.5 shrink-0 text-(--sov-text-primary)" />
                  <div className="flex flex-1 flex-col gap-1">
                    <RefusedTitle entry={entry} />
                    <p className="text-[13px] text-(--sov-text-tertiary)">{refusalMessage(entry)}</p>
                    {entry.code === SIZE_REFUSED ? <p className="text-[13px] text-(--sov-text-tertiary)">{copy.step2.maxSize}</p> : null}
                  </div>
                </div>
                <Button variant="quiet" onClick={() => uploads.dismiss(entry.key)}>
                  {copy.step2.dismiss}
                </Button>
              </li>
            );
          }
          if (entry.phase === 'stored' && entry.revision === 'failed') {
            return (
              <li key={entry.key} className="flex items-start gap-4 border-b border-(--sov-border) py-3">
                <p role="alert" className="flex flex-1 items-start gap-3 text-[14px] text-(--sov-text-primary)">
                  <CircleAlert size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" className="mt-0.5 shrink-0" />
                  <span>{copy.workspace.documents.replace.failed}</span>
                </p>
                <Button variant="quiet" onClick={() => uploads.dismiss(entry.key)}>
                  {copy.step2.dismiss}
                </Button>
              </li>
            );
          }
          return (
            <li key={entry.key} className="flex items-center gap-4 border-b border-(--sov-border) py-3">
              <FileText size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />
              <div className="flex-1">
                <Progress label={copy.step2.uploading} />
              </div>
              {entry.phase === 'stored' ? null : (
                <Button variant="quiet" onClick={() => uploads.stop(entry.key)}>
                  {copy.step2.stopUpload}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
