/**
 * The Documents inspector and its inline panels (DB-15's right panel; PRD R-016, R-017, R-018, R-019,
 * R-022, R-028; US-DOCS-14, US-DOCS-15, US-DOCS-20, US-DOCS-21; UD-22, UD-42, UD-43).
 *
 * - **Details** (US-DOCS-14 AC1): the file name as served (bound; bidirectional and format controls
 *   stripped by the API, G2-14), the file type, the category (Unknown while no classifier set the kind,
 *   G1-26), the revision as written ("none stated", or Unknown for a file not analysed), the stage
 *   (Unknown unless stated; a model's always Unknown, R-022, R-028), the date added (a date in a
 *   `<time>`, no time of day), the analysis status line or coverage, and the document it was declared a
 *   revision of. Each value through the kit's Value with its one badge on its line.
 * - **Not shown:** no preview (proposal P-4-DOCUMENT-PREVIEW: an image of a page holds digits the render
 *   test cannot read), no file size (R-017), no uploader (R-018), no description (R-019), no model-check,
 *   schema or IDS line (R-022), no Edit on kind or stage (proposal 7.2.26).
 * - **Download** (AC5): a link to the stored original, served only after the project access check
 *   (`documents.file`); nothing is converted. As approved screen 15 draws it (DR-15): a wide outline
 *   Download filling the footer row, beside the menu as a 40px square (../../../styles.css).
 * - **The menu** (US-DOCS-15 AC1): Replace, "Mark as a revision of another document" and Delete, each
 *   opening its inline panel here. No panel is a dialog: each is a region of the inspector, Escape and
 *   Cancel close it, and nothing else on the page waits for it (rule 7).
 * - **Delete** (UD-42; 7.1.1-D4; US-DOCS-21 AC1): the panel first reads what deleting changes
 *   (`workspace.documents.deleteEffect`: "<n> values will return to Unknown", its count bound) and shows
 *   it before anything is removed; Delete then runs rule 13's erasure job (`documents.delete`). Until the
 *   effect is stated, the panel offers no Delete (a control with nowhere to go is not drawn).
 * - **Mark as a revision** (UD-43; US-DOCS-20 AC2): the owner chooses the older document; Save declares
 *   this one its revision (`documents.revisionOf`). Nothing is deleted, and no value is read from the
 *   choice: code never links revisions by itself (2.3 "Revisions are declared, never guessed"). A document
 *   whose served revision chain reaches this one through another document is not offered (A-5): choosing
 *   it would close a cycle (A revises C revises B revises A), which the derive ignores whole. The reverse of
 *   a direct pair is offered: declaring A a revision of B after B a revision of A corrects the first, as
 *   the derive applies it (NP-2; ADR 0016 decision 17); ./revisions.ts.
 * - **Replace** (US-DOCS-20 AC1): the step 2 dropzone for one file, uploaded as a declared revision of
 *   this document (the project's uploads, ../../../wizard/UploadsProvider.tsx); the older file stays.
 * - Every write sends one request per press (`useInFlight`), says so with `aria-busy` and is never
 *   disabled; a refusal says what happened and keeps everything else as it was.
 *
 * Undesigned (UD-22, UD-42, UD-43): drawn per the frontend-design skill within the brand: the panels sit
 * under the inspector's actions on the surface colour with a hairline, the heading in the group role,
 * the bound effect line on its own, the action and Cancel at the panel's foot.
 */
import { Download, File, FileArchive, FileImage, FileSpreadsheet, FileText, Box, type LucideIcon } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Button, CalendarDate, Choice, Dropzone, InlinePanel, Inspector, MenuButton, Progress, StatusLine, Value, ValueName } from '@sovitech/ui';
import { pathOf, type DocumentRow } from '@sovitech/view-model/browser';
import { ApiError, call, isSignedOut, request } from '../../../api/client';
import { ACCEPT_ATTRIBUTE } from '../../../api/uploads';
import { useLoad } from '../../../api/use-load';
import { copy } from '../../../copy';
import { useOnSignedOut } from '../../../session/SessionProvider';
import { useUploads } from '../../../wizard/UploadsProvider';
import { useWizard } from '../../../wizard/WizardProvider';
import { useInFlight } from '../../../wizard/use-in-flight';
import { indexDisplays, type Displays } from '../../../wizard/use-step-view';
import { revisionCandidates } from './revisions';

const DOC = copy.workspace.documents;

export type PanelKind = 'delete' | 'revision' | 'replace';

/** The row icon of a file's format (decorative: the inspector names the file type in words). */
export const FORMAT_ICONS: Readonly<Record<DocumentRow['format'], LucideIcon>> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  ifc: Box,
  rvt: Box,
  dwg: File,
  jpg: FileImage,
  png: FileImage,
  zip: FileArchive,
  other: File,
};

/** The stored original's address (`documents.file`: served only after the project access check). */
export function downloadPath(projectId: string, documentId: string): string {
  return pathOf('documents.file', { projectId, documentId });
}

/** A row's analysis: the bar with the served words while it is read, else its 2.8 status line or coverage, bound. */
export function DocumentStatus({ row, displays }: { readonly row: DocumentRow; readonly displays: Displays }) {
  if (row.status.kind === 'line') {
    const line = displays.get(row.status.valueId);
    return line === undefined ? null : <StatusLine display={line} />;
  }
  const line = row.status.line === undefined ? undefined : displays.get(row.status.line);
  return (
    <span className="flex flex-col gap-1">
      <Progress label={copy.step3.reading} labelDisplay="hidden" />
      {line === undefined ? null : <StatusLine display={line} as="span" />}
    </span>
  );
}

/** A labelled line of the inspector's details: the label on the left, the value or fixed copy on the right. */
function Detail({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-4 py-2 text-[14px]">
      <dt className="text-(--sov-text-tertiary)">{label}</dt>
      <dd className="min-w-0 text-(--sov-text-primary)">{children}</dd>
    </div>
  );
}

function ValueDetail({ label, valueId, displays }: { readonly label: string; readonly valueId: string | null; readonly displays: Displays }) {
  const display = valueId === null ? undefined : displays.get(valueId);
  if (display === undefined) return null;
  return (
    <Detail label={label}>
      <Value display={display} layout="bare" />
    </Detail>
  );
}

export interface DocumentInspectorProps {
  readonly row: DocumentRow;
  readonly rows: readonly DocumentRow[];
  readonly displays: Displays;
  readonly panel: PanelKind | null;
  readonly onPanel: (panel: PanelKind | null) => void;
  readonly onClose: () => void;
  /** After a delete or a declared revision: the page reads the register (and the frame) again. */
  readonly onChanged: (change: { readonly deleted?: string }) => void;
  /** The inspector's container (the page moves the focus to its close button when the owner opens it). */
  readonly closeRef?: (element: HTMLDivElement | null) => void;
  /** The inspector's id, for the register rows' `aria-controls`. */
  readonly inspectorId?: string;
}

export function DocumentInspector({ row, rows, displays, panel, onPanel, onClose, onChanged, closeRef, inspectorId }: DocumentInspectorProps) {
  const { projectId } = useWizard();
  const name = displays.get(row.fileName);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closePanel = () => {
    onPanel(null);
    // The focus returns to the inspector's menu, where the panel was opened from.
    window.setTimeout(() => menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus(), 0);
  };

  const menuItems = [
    { id: 'replace', label: DOC.menu.replace, onSelect: () => onPanel('replace') },
    { id: 'declareRevision', label: DOC.menu.declareRevision, onSelect: () => onPanel('revision') },
    { id: 'delete', label: DOC.menu.delete, onSelect: () => onPanel('delete') },
  ];

  return (
    <div ref={closeRef} data-document-inspector={row.documentId}>
      <Inspector
        id={inspectorId}
        heading={name === undefined ? DOC.inspector.heading : <ValueName display={name} />}
        subheading={
          <>
            <span className="sr-only">{DOC.inspector.type}: </span>
            {DOC.formatNames[row.format]}
          </>
        }
        closeLabel={copy.workspace.frame.inspectorClose}
        onClose={onClose}
        footer={
          <div className="flex w-full items-center gap-3" data-inspector-actions="">
            {row.downloadable ? (
              <a
                href={downloadPath(projectId, row.documentId)}
                download={name === undefined || name.shape === 'missing' ? '' : name.text}
                className="sov-button flex-1"
                data-variant="secondary"
                data-size="default"
                data-icon="true"
                data-copy-kind="action-label"
              >
                <Download size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" />
                <span>{DOC.inspector.download}</span>
              </a>
            ) : null}
            <div ref={menuRef} data-inspector-menu="">
              <MenuButton label={DOC.moreActions} items={menuItems} />
            </div>
          </div>
        }
      >
        <dl className="flex flex-col">
          <ValueDetail label={DOC.inspector.category} valueId={row.categoryValue} displays={displays} />
          <ValueDetail label={DOC.inspector.version} valueId={row.revision} displays={displays} />
          <ValueDetail label={DOC.inspector.stage} valueId={row.stage} displays={displays} />
          <Detail label={DOC.inspector.added}>
            <CalendarDate date={new Date(row.addedAt)} />
          </Detail>
          <Detail label={DOC.inspector.status}>
            <DocumentStatus row={row} displays={displays} />
          </Detail>
          <ValueDetail label={DOC.inspector.revisionOf} valueId={row.revisionOf} displays={displays} />
        </dl>
        {panel === 'delete' ? <DeletePanel row={row} onClose={closePanel} onDeleted={() => onChanged({ deleted: row.documentId })} /> : null}
        {panel === 'revision' ? (
          <RevisionPanel
            row={row}
            rows={rows}
            displays={displays}
            onClose={closePanel}
            onSaved={() => {
              closePanel();
              onChanged({});
            }}
          />
        ) : null}
        {panel === 'replace' ? <ReplacePanel key={row.documentId} row={row} onClose={closePanel} /> : null}
      </Inspector>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Delete (UD-42)
// ---------------------------------------------------------------------------------------------

function DeletePanel({ row, onClose, onDeleted }: { readonly row: DocumentRow; readonly onClose: () => void; readonly onDeleted: () => void }) {
  const { projectId } = useWizard();
  const onSignedOut = useOnSignedOut();
  const deleting = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);
  const effect = useLoad(
    (signal) => request('workspace.documents.deleteEffect', { params: { projectId, documentId: row.documentId }, signal }),
    [projectId, row.documentId],
  );
  const data = effect.state.data;
  const line = data === undefined ? undefined : indexDisplays(data.displayObjects).get(data.view.effect);

  const onDelete = () => {
    setFailure(null);
    void deleting.run(async () => {
      try {
        await call<unknown>('documents.delete', { params: { projectId, documentId: row.documentId } });
        onDeleted();
      } catch (error) {
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        // A document already gone (another tab deleted it) reads as done: the register is read again.
        if (error instanceof ApiError && error.code === 'not_found') {
          onDeleted();
          return;
        }
        setFailure(DOC.delete.failed);
      }
    });
  };

  return (
    <InlinePanel heading={DOC.delete.heading} headingLevel={3} onClose={onClose}>
      <div className="mt-3 flex flex-col gap-3" data-delete-confirmation={row.documentId}>
        <p className="text-[14px] text-(--sov-text-tertiary)">{DOC.delete.explain}</p>
        {effect.state.status === 'loading' ? (
          <p role="status" aria-live="polite" className="text-[14px] text-(--sov-text-muted)">
            {DOC.delete.loading}
          </p>
        ) : null}
        {line !== undefined ? (
          <div role="status" aria-live="polite" className="text-[15px] font-medium text-(--sov-text-primary)">
            <StatusLine display={line} />
          </div>
        ) : null}
        {effect.state.status === 'failed' && line === undefined ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p className="text-[14px] text-(--sov-text-primary)">{DOC.delete.effectFailed}</p>
            <Button variant="link" onClick={() => void effect.reload()}>
              {copy.app.retry}
            </Button>
          </div>
        ) : null}
        {failure === null ? null : (
          <p role="alert" className="text-[14px] text-(--sov-text-primary)">
            {failure}
          </p>
        )}
        <div className="mt-1 flex items-center gap-4">
          {line === undefined ? null : (
            <Button variant="secondary" aria-busy={deleting.busy} onClick={onDelete}>
              {DOC.delete.confirm}
            </Button>
          )}
          <Button variant="quiet" onClick={onClose}>
            {DOC.delete.cancel}
          </Button>
        </div>
      </div>
    </InlinePanel>
  );
}

// ---------------------------------------------------------------------------------------------
// Mark as a revision of another document (UD-43)
// ---------------------------------------------------------------------------------------------

function RevisionPanel({
  row,
  rows,
  displays,
  onClose,
  onSaved,
}: {
  readonly row: DocumentRow;
  readonly rows: readonly DocumentRow[];
  readonly displays: Displays;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const { projectId } = useWizard();
  const onSignedOut = useOnSignedOut();
  const saving = useInFlight();
  const [chosen, setChosen] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const others = revisionCandidates(row, rows);

  const onSave = () => {
    if (chosen === null) {
      setMessage(DOC.revision.chooseFirst);
      return;
    }
    setMessage(null);
    void saving.run(async () => {
      try {
        await call<undefined>('documents.revisionOf', { params: { projectId, documentId: row.documentId }, body: { revisionOf: chosen } });
        onSaved();
      } catch (error) {
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        setMessage(DOC.revision.failed);
      }
    });
  };

  return (
    <InlinePanel heading={DOC.revision.heading} headingLevel={3} onClose={onClose}>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-[14px] text-(--sov-text-tertiary)">{DOC.revision.explain}</p>
        {others.length === 0 ? (
          <p className="text-[14px] text-(--sov-text-primary)">{DOC.revision.none}</p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold text-(--sov-text-primary)">{DOC.revision.choose}</legend>
            {others.map((other) => {
              const otherName = displays.get(other.fileName);
              return (
                <Choice
                  key={other.documentId}
                  type="radio"
                  name={`revision-of-${row.documentId}`}
                  value={other.documentId}
                  checked={chosen === other.documentId}
                  onChange={(checked) => {
                    if (checked) setChosen(other.documentId);
                  }}
                  label={otherName === undefined ? DOC.formatNames[other.format] : <ValueName display={otherName} />}
                />
              );
            })}
          </fieldset>
        )}
        {message === null ? null : (
          <p role="alert" className="text-[14px] text-(--sov-text-primary)">
            {message}
          </p>
        )}
        <div className="mt-1 flex items-center gap-4">
          {others.length === 0 ? null : (
            <Button variant="secondary" aria-busy={saving.busy} onClick={onSave}>
              {DOC.revision.save}
            </Button>
          )}
          <Button variant="quiet" onClick={onClose}>
            {DOC.revision.cancel}
          </Button>
        </div>
      </div>
    </InlinePanel>
  );
}

// ---------------------------------------------------------------------------------------------
// Replace (US-DOCS-20 AC1)
// ---------------------------------------------------------------------------------------------

const DROPZONE_LABELS = {
  title: copy.step2.dropHere,
  or: copy.step2.or,
  browse: copy.step2.browse,
  formats: copy.step2.formats,
  limit: copy.step2.maxSize,
} as const;

function ReplacePanel({ row, onClose }: { readonly row: DocumentRow; readonly onClose: () => void }) {
  const uploads = useUploads();
  const [firstOnly, setFirstOnly] = useState(false);
  return (
    <InlinePanel heading={DOC.replace.heading} headingLevel={3} onClose={onClose}>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-[14px] text-(--sov-text-tertiary)">{DOC.replace.explain}</p>
        <Dropzone
          labels={DROPZONE_LABELS}
          accept={ACCEPT_ATTRIBUTE}
          onFiles={(files) => {
            const [first] = files;
            if (first === undefined) return;
            uploads.addFiles([first], { revisionOf: row.documentId });
            if (files.length > 1) {
              setFirstOnly(true);
              return;
            }
            onClose();
          }}
        />
        {firstOnly ? (
          <p role="status" className="text-[14px] text-(--sov-text-primary)">
            {DOC.replace.firstOnly}
          </p>
        ) : null}
        <div>
          <Button variant="quiet" onClick={onClose}>
            {DOC.replace.cancel}
          </Button>
        </div>
      </div>
    </InlinePanel>
  );
}
