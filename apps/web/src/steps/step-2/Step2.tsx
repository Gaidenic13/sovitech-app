/**
 * OB-2 Step 2 Documents, with UD-33's states (US-DOCS-01, US-DOCS-03, US-DOCS-04, US-DOCS-23; PRD
 * R-013, R-014, R-021 "Until decided"; guardrails section 5, step 2: "Each file shows its analysis
 * status and coverage, and its detected stage and revision").
 *
 * - The dropzone (drag-over state; "Browse files" as the keyboard path; several files at once) with
 *   the approved copy and the size-limit line from the render allowlist (US-DOCS-01 AC1 to AC3).
 * - The file list from the step 2 view (steps.ts `FileRow`), each row through the kit:
 *   - the file name as uploaded, bound (`document:<id>.fileName` or, while it uploads,
 *     `upload:<id>.fileName`): a file name is a document value (prompt 3 section 7);
 *   - its status: a progress bar with no number while it uploads, waits or is read (US-DOCS-03 AC1:
 *     no percentage, no size), with its words beside it: "Uploading" (fixed copy) for an upload, and
 *     for a stored file being read the line the API serves with the row (2.8's pending wording,
 *     `status.line`), never words of this app's own; else its coverage as code recorded it or its
 *     2.8 status line ("Partly analysed (<n> of <m> pages)", "Not analysed: <file type> stored, not
 *     analysed", "Analysis failed"), through StatusLine with its numbers bound (AC2 to AC5);
 *   - its stage with its one badge and its revision, through Value (Unknown while no classifier
 *     reads them: AC6; US-DOCS-04 AC7). No Edit on kind or stage (AC7; proposal 7.2.26), no file size
 *     (AC8; proposal 7.2.30), no remove action (AC11: step 2 has no delete until new Q9, R-016).
 *   - the file count and "Still reading <n> files…" as served lines, bound (AC8; rule 7); the count
 *     shows once a file is stored (while nothing is, the empty sentence or the rows in progress say
 *     so, and a count that reads nothing is not drawn).
 * - A file refused on the page (format or size) or by the API (the fixtures-only guard, ADR 0028)
 *   shows on its own row with its reason; the other files go on and Continue stays enabled
 *   (US-DOCS-01 AC4, AC5; rule 7). A refused upload the API names (`upload:<id>.fileName`, served
 *   in its refusal) shows that name through Value, bound; a file refused on the page, which the API
 *   never saw, has no display object and shows no name: its extension is named in words when it is
 *   a short run of letters ("A EXE file was not added"), else "A file was not added".
 * - The five "Common document types (optional)" tiles are hints with no state (US-DOCS-01 AC7).
 * - Continue opens step 3 whether or not files were added or are still being read (US-DOCS-01 AC6,
 *   US-DOCS-03 AC9): uploads live at project level and go on in the background.
 *
 * Undesigned states (UD-33), drawn per the frontend-design skill within the brand: the dropzone at
 * the drawn width (onboarding-spec 2.4, about 745), the file list under it at its width as one ruled
 * list (hairlines, no cards), each row a file
 * glyph, the name, and under it the stage and revision as small labelled values; the status sits at
 * the row's right edge, where a thin mint bar runs while the file is in progress and the served line
 * replaces it once code recorded one. A refused row carries the alert glyph, what happened and a
 * quiet Dismiss. Drag-over lights the dropzone's border in the accent (the kit's Dropzone).
 */
import { Building, ChartColumn, CircleAlert, FileText, Server, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Dropzone, Progress, StatusLine, Value } from '@sovitech/ui';
import type { DisplayObject, FileRow } from '@sovitech/view-model/browser';
import { isSignedOut } from '../../api/client';
import { ACCEPT_ATTRIBUTE, FORMAT_REFUSED, SIZE_REFUSED } from '../../api/uploads';
import { copy } from '../../copy';
import { LoadFailed, Loading } from '../../pages/PageState';
import { useOnSignedOut } from '../../session/SessionProvider';
import { StepHeading, WizardLayout } from '../../shell/WizardLayout';
import { useUploads, type UploadEntry } from '../../wizard/UploadsProvider';
import { WizardFooter } from '../../wizard/WizardFooter';
import { WizardStepper } from '../../wizard/WizardStepper';
import { EMPTY_CONTINUE, continueRefusalMessage, useWizard } from '../../wizard/WizardProvider';
import { useInFlight } from '../../wizard/use-in-flight';
import { useStepView, type Displays } from '../../wizard/use-step-view';

/** How often the file list is read again while a file is in progress (an upload, or analysis). */
export const FILE_LIST_POLL_MS = 3_000;

const DROPZONE_LABELS = {
  title: copy.step2.dropHere,
  or: copy.step2.or,
  browse: copy.step2.browse,
  formats: copy.step2.formats,
  limit: copy.step2.maxSize,
} as const;

const TILES = [
  { key: 'architectural', icon: Building },
  { key: 'mep', icon: Settings },
  { key: 'existingBms', icon: Server },
  { key: 'energy', icon: ChartColumn },
  { key: 'other', icon: FileText },
] as const;

/** The words the API serves with a stored file being read (`status.line`: 2.8's pending wording, bound), or undefined. */
function progressLineOf(row: FileRow, displays: Displays): DisplayObject | undefined {
  return row.status.kind === 'progress' && row.status.line !== undefined ? displays.get(row.status.line) : undefined;
}

/**
 * A row in progress: the kit's bar with no number and its words beside it (DR-4): "Uploading" for
 * an upload (fixed copy); for a stored file being read, the line the API serves (2.8's pending
 * wording through StatusLine, bound to its value id), never words of this app's own. A stored row
 * with no served line keeps the bar with its name only.
 */
function ProgressStatus({ row, displays }: { readonly row: FileRow; readonly displays: Displays }) {
  if (row.uploadId !== undefined) return <Progress label={copy.step2.uploading} />;
  const line = progressLineOf(row, displays);
  if (line === undefined) return <Progress label={copy.step3.reading} labelDisplay="hidden" />;
  return (
    <span className="flex items-center gap-3">
      {/* The bar's name is fixed copy; the served words beside it are the line, bound. */}
      <Progress label={copy.step3.reading} labelDisplay="hidden" />
      <StatusLine display={line} as="span" />
    </span>
  );
}

function ServerRow({ row, displays, onStop }: { readonly row: FileRow; readonly displays: Displays; readonly onStop: (() => void) | undefined }) {
  const name = displays.get(row.fileName);
  const status = row.status.kind === 'line' ? displays.get(row.status.valueId) : undefined;
  const stage = row.stage === null ? undefined : displays.get(row.stage);
  const revision = row.revision === null ? undefined : displays.get(row.revision);
  return (
    <li className="flex items-start gap-4 border-b border-(--sov-border) py-4" data-file-row={row.documentId ?? row.uploadId}>
      <FileText size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" className="mt-0.5 shrink-0 text-(--sov-text-tertiary)" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {name === undefined ? null : (
          <div className="text-[15px] font-semibold break-words">
            <Value display={name} layout="bare" />
          </div>
        )}
        {stage === undefined && revision === undefined ? null : (
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
            {stage === undefined ? null : <Value display={stage} label={copy.step2.stage} layout="stack" />}
            {revision === undefined ? null : <Value display={revision} label={copy.step2.revision} layout="stack" />}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 pt-1 text-right">
        {row.status.kind === 'progress' ? (
          <ProgressStatus row={row} displays={displays} />
        ) : status === undefined ? null : (
          <StatusLine display={status} />
        )}
        {onStop === undefined ? null : (
          <Button variant="quiet" onClick={onStop}>
            {copy.step2.stopUpload}
          </Button>
        )}
      </div>
    </li>
  );
}

/** A file the page sent but the view does not list yet: its progress, without its name. */
function PendingRow({ onStop }: { readonly onStop: (() => void) | undefined }) {
  return (
    <li className="flex items-center gap-4 border-b border-(--sov-border) py-4">
      <FileText size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-tertiary)" />
      <div className="flex-1">
        <Progress label={copy.step2.uploading} />
      </div>
      {onStop === undefined ? null : (
        <Button variant="quiet" onClick={onStop}>
          {copy.step2.stopUpload}
        </Button>
      )}
    </li>
  );
}

function refusalMessage(entry: Extract<UploadEntry, { phase: 'refused' }>): string {
  if (entry.code === FORMAT_REFUSED) return copy.step2.formatRefused;
  if (entry.code === SIZE_REFUSED) return copy.step2.sizeRefused;
  return entry.message ?? copy.step2.uploadFailed;
}

/**
 * What a refused row is called: the name the API's refusal serves (`upload:<id>.fileName`, through
 * Value, bound), else the refused file's extension in words when the page read one, else the generic
 * sentence. A name the API did not serve is never shown as typed.
 */
function RefusedTitle({ entry }: { readonly entry: Extract<UploadEntry, { phase: 'refused' }> }) {
  if (entry.fileName !== undefined) {
    return (
      <div className="text-[15px] font-semibold break-words">
        <Value display={entry.fileName} layout="bare" />
      </div>
    );
  }
  return <p className="text-[15px] font-semibold">{entry.extension === undefined ? copy.step2.refusedFile : copy.step2.refusedFileOfType.replace('{extension}', entry.extension)}</p>;
}

function RefusedRow({ entry, onDismiss }: { readonly entry: Extract<UploadEntry, { phase: 'refused' }>; readonly onDismiss: () => void }) {
  return (
    <li className="flex items-start gap-4 border-b border-(--sov-border) py-4">
      {/* The alert sits inside the list item: a list holds list items only (axe "list"; phase 3 integration). */}
      <div role="alert" className="flex flex-1 items-start gap-4">
        <CircleAlert size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" className="mt-0.5 shrink-0 text-(--sov-text-primary)" />
        <div className="flex flex-1 flex-col gap-1">
          <RefusedTitle entry={entry} />
          <p className="text-[13px] text-(--sov-text-tertiary)">{refusalMessage(entry)}</p>
          {entry.code === SIZE_REFUSED ? <p className="text-[13px] text-(--sov-text-tertiary)">{copy.step2.maxSize}</p> : null}
        </div>
      </div>
      <Button variant="quiet" onClick={onDismiss}>
        {copy.step2.dismiss}
      </Button>
    </li>
  );
}

function FileList({ rows, displays }: { readonly rows: readonly FileRow[]; readonly displays: Displays }) {
  const uploads = useUploads();
  const byUpload = new Map<string, UploadEntry>();
  for (const entry of uploads.entries) if (entry.phase === 'uploading') byUpload.set(entry.uploadId, entry);
  const listedUploads = new Set(rows.flatMap((row) => (row.uploadId === undefined ? [] : [row.uploadId])));
  const listedDocuments = new Set(rows.flatMap((row) => (row.documentId === undefined ? [] : [row.documentId])));

  const pending = uploads.entries.filter(
    (entry) =>
      entry.phase === 'waiting' ||
      (entry.phase === 'uploading' && !listedUploads.has(entry.uploadId)) ||
      (entry.phase === 'stored' && !listedDocuments.has(entry.documentId)),
  );
  const refused = uploads.entries.filter((entry): entry is Extract<UploadEntry, { phase: 'refused' }> => entry.phase === 'refused');

  if (rows.length === 0 && pending.length === 0 && refused.length === 0) {
    return <p className="border-t border-(--sov-border) py-5 text-[15px] text-(--sov-text-tertiary)">{copy.step2.filesEmpty}</p>;
  }
  return (
    <ul className="border-t border-(--sov-border)">
      {rows.map((row) => {
        const entry = row.uploadId === undefined ? undefined : byUpload.get(row.uploadId);
        return (
          <ServerRow
            key={row.documentId ?? row.uploadId ?? row.fileName}
            row={row}
            displays={displays}
            onStop={entry === undefined ? undefined : () => uploads.stop(entry.key)}
          />
        );
      })}
      {pending.map((entry) => (
        <PendingRow key={entry.key} onStop={entry.phase === 'stored' ? undefined : () => uploads.stop(entry.key)} />
      ))}
      {refused.map((entry) => (
        <RefusedRow key={entry.key} entry={entry} onDismiss={() => uploads.dismiss(entry.key)} />
      ))}
    </ul>
  );
}

export function Step2() {
  const { back, continueFrom } = useWizard();
  const onSignedOut = useOnSignedOut();
  const uploads = useUploads();
  const { state, view, displays, asOf, reload } = useStepView(2);
  // One Continue per press (../../wizard/use-in-flight.ts): a press while it is on its way is ignored, never refused.
  const continuing = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);

  // The list follows the uploads: a new upload, a stored document or a refusal is read again at once.
  const version = uploads.version;
  useEffect(() => {
    if (version > 0) void reload({ quiet: true });
  }, [version, reload]);

  // While a file is in progress (sent, waiting, uploading, queued or being read), the list is read
  // again every few seconds, so its row moves from the progress bar to its status line.
  const inProgress =
    (view?.files.some((row) => row.status.kind === 'progress') ?? false) ||
    uploads.entries.some((entry) => entry.phase === 'waiting' || entry.phase === 'uploading');
  useEffect(() => {
    if (!inProgress) return;
    const timer = window.setInterval(() => void reload({ quiet: true }), FILE_LIST_POLL_MS);
    return () => window.clearInterval(timer);
  }, [inProgress, reload]);

  const onContinue = () => {
    if (!continuing.claim()) return;
    setFailure(null);
    continueFrom(2, asOf, EMPTY_CONTINUE).catch((error: unknown) => {
      continuing.release();
      if (isSignedOut(error)) {
        onSignedOut();
        return;
      }
      setFailure(continueRefusalMessage(error));
    });
  };

  // The bound count shows once a file is stored: while none is, the empty sentence or the rows in
  // progress say what is there, and a count that reads nothing is not drawn (DR-23).
  const anyStored = view?.files.some((row) => row.documentId !== undefined) ?? false;
  const count = view === undefined || !anyStored ? undefined : displays.get(view.documentCount);
  const stillReading = view === undefined || view.stillReading === null ? undefined : displays.get(view.stillReading);

  return (
    <WizardLayout
      stepper={<WizardStepper step={2} />}
      footer={<WizardFooter onBack={() => back(2, asOf)} primaryLabel={copy.nav.continue} onPrimary={onContinue} busy={continuing.busy} error={failure} />}
    >
      <section aria-labelledby="step-title" className="flex flex-col gap-10">
        <StepHeading title={copy.step2.title} subtitle={copy.step2.subtitle} />
        <div className="mx-auto flex w-full max-w-[745px] flex-col gap-10">
          <Dropzone labels={DROPZONE_LABELS} accept={ACCEPT_ATTRIBUTE} onFiles={uploads.addFiles} />
          <section aria-labelledby="step2-files" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="step2-files" className="sov-heading-section">
                {copy.step2.filesHeading}
              </h2>
              {count === undefined ? null : <StatusLine display={count} as="span" />}
            </div>
            {stillReading === undefined ? null : <StatusLine display={stillReading} />}
            {state.status === 'loading' ? (
              // The list's frame while it loads (DR-12): the hairline and the height of the empty
              // list's sentence, so the tiles and the footer below do not move when it answers.
              <div className="border-t border-(--sov-border) py-5" data-loading-frame="files">
                <Loading label={copy.step8.loading} align="start" />
              </div>
            ) : null}
            {state.status === 'failed' ? <LoadFailed message={copy.step2.listFailed} onRetry={() => void reload()} /> : null}
            {view === undefined ? null : <FileList rows={view.files} displays={displays} />}
          </section>
        </div>
        <section aria-labelledby="step2-types" className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
          <h2 id="step2-types" className="sov-heading-group">
            {copy.step2.commonTypes}
          </h2>
          <ul className="grid grid-cols-5 gap-5">
            {TILES.map(({ key, icon: Glyph }) => (
              <li key={key} className="flex items-start gap-3 rounded-(--sov-radius-surface) border border-(--sov-border) px-5 py-4">
                <Glyph size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" className="shrink-0 text-(--sov-text-primary)" />
                <div className="flex flex-col gap-1">
                  <p className="text-[13px] font-medium">{copy.step2.tiles[key].title}</p>
                  <p className="text-[12px] text-(--sov-text-muted)">{copy.step2.tiles[key].description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </WizardLayout>
  );
}
