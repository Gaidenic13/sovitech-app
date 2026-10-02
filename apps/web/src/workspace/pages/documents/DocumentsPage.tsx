/**
 * Documents (DB-15; PRD R-016 to R-019, R-022, R-028; US-DOCS-12 to US-DOCS-15, US-DOCS-20, US-DOCS-21;
 * UD-21, UD-22, UD-42, UD-43; dashboards 7.1.1-D1 to D5; docs/adr/0045-workspace-registers-under-v1-5.md
 * decisions 6 to 8).
 *
 * - **The register** (`workspace.documents`, every listed document of the project; a withdrawn or erased
 *   one is not listed, US-DOCS-13 AC6): each row the file name as uploaded (served through
 *   `servedFileName`, G2-14), its category through the fixed kind mapping (Unknown while no classifier
 *   set the kind, so it is listed under All Documents only: G1-26), its revision as written in the
 *   Version column, its stage, the date added, and its analysis status line or coverage (2.8 wording,
 *   bound). Each value through the kit with its one badge on its line. No Uploaded By (R-018), no Size
 *   (R-017), no description (R-019), no model-check line (R-022).
 * - **Chips, search, filters, sort and paging** (./document-list.ts): no count on a chip, previous and next
 *   only with no page number and no "Showing <a>-<b> of <n>" (R-017 "Until decided"); Date Added sorts
 *   newest first by default (US-DOCS-13 AC5). Nothing is written.
 * - **Upload Document** (UD-21; US-DOCS-12): the page's one primary button opens the upload surface inline,
 *   under the title: step 2's dropzone with "Browse files" (the keyboard path), the accepted formats and
 *   the size line, several files at once. Never a dialog, never blocking: the files go on in the project's
 *   uploads (../../../wizard/UploadsProvider.tsx) when the surface closes or the owner leaves, and show
 *   their progress here until the register lists them. `?upload=open` opens it (the `upload_document`
 *   action of other pages, ../../navigation.ts).
 * - **The inspector** (./DocumentInspector.tsx): opened from a row (its open button, or a click on the
 *   row), with its details, Download, the menu and the inline Delete, revision and Replace panels. The row
 *   menu offers Download, Replace, "Mark as a revision of another document" and Delete (US-DOCS-15 AC1);
 *   its panels open in the inspector. `?document=<id>` opens a document's inspector.
 * - **States:** loading (the frame stays, one polite line), failed (what could not be loaded, Try again),
 *   no documents (the empty sentence, with Upload Document above it), nothing matching the filters, and a
 *   file being read (its row's bar with the served words; the register is read again every few seconds
 *   until every row has its line). The demo line is the frame's (the status footer).
 * - **A category chip with no document in it** (DR-14, V-11; rule 12 "Absence of evidence is not evidence of
 *   absence"; rule 1; G1-26; US-DOCS-13 AC3; case G12-12): every category reads Unknown until a document's
 *   kind is set, so the empty sentence says why no document is in the category, never that no document
 *   matches. A row the filters hide takes its inspector with it: the inspector never stays open on a
 *   document the list no longer shows.
 * - **Focus after Delete** (A-6; NP-1; WCAG 2.4.3): once a document is deleted, the focus moves to the open
 *   button of the row after it on the page (or the one before it, when it was the last), or to the page
 *   column (`main#main`) when no row is left, never to the page's body.
 * - **Layout** (DR-2): the page sits in the frame's page column with the kit's page padding (no padding of
 *   its own), and the Name column keeps a narrow floor, so with the inspector open at the 1440 canvas a
 *   row's file name and its controls stay in view.
 * - The register and the frame are read again after an upload is stored, a revision declared or a document
 *   deleted, so the footer's "Still reading" line and the project card follow.
 */
import { Upload } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button, CalendarDate, Dropzone, InlinePanel, InspectorLayout, MenuButton, PageHeader, Pager, RegisterTable, Value, ValueName, type RegisterColumn } from '@sovitech/ui';
import { UUID_PATTERN, type DocumentRow } from '@sovitech/view-model/browser';
import { ACCEPT_ATTRIBUTE } from '../../../api/uploads';
import { copy } from '../../../copy';
import { LoadFailed, Loading } from '../../../pages/PageState';
import { useUploads } from '../../../wizard/UploadsProvider';
import { useWizard } from '../../../wizard/WizardProvider';
import { UPLOAD_OPEN, UPLOAD_PARAM } from '../../navigation';
import { useWorkspaceFrame, useWorkspaceView } from '../../use-workspace';
import { DocumentFilterBar } from './DocumentFilters';
import { DocumentInspector, DocumentStatus, FORMAT_ICONS, downloadPath, type PanelKind } from './DocumentInspector';
import { DEFAULT_SORT, NO_FILTERS, nextSort, pageOfRows, visibleRows, type DocumentFilters, type SortKey, type SortState } from './document-list';
import { UploadsList, shownUploads } from './UploadsList';

const DOC = copy.workspace.documents;

/** How often the register is read again while a file is being uploaded or read. */
export const DOCUMENTS_POLL_MS = 3_000;

/** The search parameter that opens a document's inspector. */
export const DOCUMENT_PARAM = 'document';

const DROPZONE_LABELS = {
  title: copy.step2.dropHere,
  or: copy.step2.or,
  browse: copy.step2.browse,
  formats: copy.step2.formats,
  limit: copy.step2.maxSize,
} as const;

/** Starts a download of the stored original with its served name (a link, as the inspector's Download). */
function download(projectId: string, row: DocumentRow, name: string | undefined): void {
  const link = document.createElement('a');
  link.href = downloadPath(projectId, row.documentId);
  link.download = name ?? '';
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
}

/**
 * Why the register shows no row: no document at all; a category chip no document is in (every category
 * reads Unknown until a document's kind is set, so the sentence says that, never that nothing matches:
 * rule 12, G12-12); or the search and filters leaving none.
 */
export function emptySentence(rows: readonly DocumentRow[], filters: DocumentFilters): string {
  if (rows.length === 0) return DOC.empty.no_documents;
  if (filters.category !== 'all' && !rows.some((row) => row.category === filters.category)) return DOC.empty.category;
  return DOC.empty.filtered;
}

export function DocumentsPage() {
  const { projectId } = useWizard();
  const frame = useWorkspaceFrame();
  const uploads = useUploads();
  const [search] = useSearchParams();
  const { state, data, displays, reload } = useWorkspaceView('workspace.documents');
  const rows = useMemo(() => data?.view.rows ?? [], [data]);

  const [filters, setFilters] = useState<DocumentFilters>(NO_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(() => search.get(UPLOAD_PARAM) === UPLOAD_OPEN);
  const [selected, setSelected] = useState<string | null>(() => {
    const asked = search.get(DOCUMENT_PARAM);
    return asked !== null && UUID_PATTERN.test(asked) ? asked : null;
  });
  const [panel, setPanel] = useState<PanelKind | null>(null);
  const uploadButton = useRef<HTMLDivElement>(null);
  const inspectorBox = useRef<HTMLDivElement | null>(null);
  const focusInspector = useRef(false);
  const inspectorId = useId();

  // A focus the page moves itself (WCAG 2.4.3): the page's main region when it opens.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  // The register follows the uploads: a new upload, a stored document or a refusal reads it again, and the frame too.
  const version = uploads.version;
  const { reload: reloadFrame } = frame;
  useEffect(() => {
    if (version === 0) return;
    void reload({ quiet: true });
    void reloadFrame({ quiet: true });
  }, [version, reload, reloadFrame]);

  // A stored upload the register now lists is done here: its entry goes (a Replace once its declaration is made).
  const { entries, dismiss } = uploads;
  useEffect(() => {
    const listed = new Set(rows.map((row) => row.documentId));
    for (const entry of entries) {
      if (entry.phase === 'stored' && listed.has(entry.documentId) && (entry.revision === undefined || entry.revision === 'declared')) dismiss(entry.key);
    }
  }, [rows, entries, dismiss]);

  // While a file is uploaded or read, the register is read again every few seconds, so each row moves from its bar to its line.
  const inProgress =
    rows.some((row) => row.status.kind === 'progress') ||
    shownUploads(entries, rows).some((entry) => entry.phase === 'waiting' || entry.phase === 'uploading' || (entry.phase === 'stored' && entry.revision !== 'failed'));
  useEffect(() => {
    if (!inProgress) return;
    const timer = window.setInterval(() => void reload({ quiet: true }), DOCUMENTS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [inProgress, reload]);

  const visible = useMemo(() => visibleRows(rows, displays, filters, sort), [rows, displays, filters, sort]);
  const shown = pageOfRows(visible, page);
  // The inspector shows a document the list shows: a row the filters hide takes its inspector with it (DR-14).
  const current = selected === null ? undefined : visible.find((row) => row.documentId === selected);

  // An inspector opened by the owner takes the focus to its close button, so the keyboard continues there.
  useEffect(() => {
    if (current === undefined || !focusInspector.current) return;
    focusInspector.current = false;
    inspectorBox.current?.querySelector<HTMLButtonElement>('.sov-inspector__close')?.focus();
  }, [current]);

  const closeUpload = () => {
    setUploadOpen(false);
    uploadButton.current?.querySelector('button')?.focus();
  };
  const changeFilters = (next: DocumentFilters) => {
    setFilters(next);
    setPage(1);
    // A selected document the new filters hide closes its inspector, so it does not open again when they change back.
    if (selected !== null && !visibleRows(rows, displays, next, sort).some((row) => row.documentId === selected)) {
      setSelected(null);
      setPanel(null);
    }
  };
  const open = (row: DocumentRow, nextPanel: PanelKind | null = null) => {
    focusInspector.current = nextPanel === null;
    setSelected(row.documentId);
    setPanel(nextPanel);
  };
  const closeInspector = () => {
    const closed = selected;
    setSelected(null);
    setPanel(null);
    // The focus returns to the row's open button (US-DOCS-14 AC6: the list keeps its filter and sort).
    window.setTimeout(() => {
      if (closed === null) return;
      const row = document.querySelector(`[data-document-row="${closed}"]`)?.closest('tr');
      row?.querySelector<HTMLElement>('[data-register-cell="open"] button')?.focus();
    }, 0);
  };
  /**
   * After a delete, the focus goes to the open button of the row after the deleted one on this page (the
   * one before it when it was the last), or to the page column, `main#main`, when no row is left (A-6;
   * NP-1; WCAG 2.4.3). The neighbour is the same element once the register is read again (rows are keyed
   * by document), so the focus stays on it.
   */
  const focusAfterDelete = (deleted: string) => {
    const at = shown.rows.findIndex((row) => row.documentId === deleted);
    const neighbour = at < 0 ? undefined : (shown.rows[at + 1] ?? shown.rows[at - 1]);
    window.setTimeout(() => {
      const button =
        neighbour === undefined
          ? null
          : document.querySelector(`[data-document-row="${neighbour.documentId}"]`)?.closest('tr')?.querySelector<HTMLElement>('[data-register-cell="open"] button');
      // No row left: the page column, `main#main` (tabIndex -1 always, ADR 0043 decision 5), which keeps its
      // focusability. Never the register's region: it is a tab stop only while it scrolls (DR-12), which the open
      // inspector causes; once the inspector closes the region loses its tab index, and Chromium's focus fixup then
      // moved the focus to <body> (NP-1, the final verifier's focus trace).
      (button ?? document.getElementById('main'))?.focus();
    }, 0);
  };
  const onChanged = ({ deleted }: { readonly deleted?: string }) => {
    if (deleted !== undefined) {
      for (const entry of entries) if (entry.phase === 'stored' && entry.documentId === deleted) dismiss(entry.key);
      setSelected(null);
      setPanel(null);
      focusAfterDelete(deleted);
    }
    void reload({ quiet: true });
    void reloadFrame({ quiet: true });
  };

  const sortOf = (key: SortKey) => ({
    direction: sort.key === key ? sort.direction : ('none' as const),
    onSort: () => setSort((previous) => nextSort(previous, key)),
  });

  const columns: RegisterColumn<DocumentRow>[] = [
    {
      kind: 'content',
      id: 'name',
      header: DOC.columns.name,
      rowHeader: true,
      sort: sortOf('name'),
      cell: (row) => {
        const Glyph = FORMAT_ICONS[row.format];
        const name = displays.get(row.fileName);
        return (
          <span className="flex min-w-[128px] items-start gap-3" data-document-row={row.documentId}>
            <Glyph size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" className="mt-0.5 shrink-0 text-(--sov-text-tertiary)" />
            <span className="min-w-0 break-words">{name === undefined ? DOC.formatNames[row.format] : <ValueName display={name} />}</span>
          </span>
        );
      },
    },
    { kind: 'content', id: 'category', header: DOC.columns.category, sort: sortOf('category'), cell: (row) => valueCell(row.categoryValue) },
    { kind: 'content', id: 'version', header: DOC.columns.version, sort: sortOf('version'), cell: (row) => valueCell(row.revision) },
    { kind: 'content', id: 'stage', header: DOC.columns.stage, sort: sortOf('stage'), cell: (row) => valueCell(row.stage) },
    { kind: 'content', id: 'added', header: DOC.columns.added, sort: sortOf('added'), cell: (row) => <CalendarDate date={new Date(row.addedAt)} /> },
    { kind: 'content', id: 'status', header: DOC.columns.status, sort: sortOf('status'), cell: (row) => <DocumentStatus row={row} displays={displays} /> },
  ];

  /** A value cell: the served display through the kit's Value, its badge on its line (every value id of a row is served with it: the contract). */
  function valueCell(valueId: string) {
    const display = displays.get(valueId);
    return display === undefined ? null : <Value display={display} layout="bare" />;
  }

  const rowMenu = (row: DocumentRow) => {
    const name = displays.get(row.fileName);
    const items = [
      ...(row.downloadable ? [{ id: 'download', label: DOC.menu.download, onSelect: () => download(projectId, row, name?.shape === 'missing' ? undefined : name?.text) }] : []),
      { id: 'replace', label: DOC.menu.replace, onSelect: () => open(row, 'replace') },
      { id: 'declareRevision', label: DOC.menu.declareRevision, onSelect: () => open(row, 'revision') },
      { id: 'delete', label: DOC.menu.delete, onSelect: () => open(row, 'delete') },
    ];
    return <MenuButton label={DOC.moreActions} items={items} />;
  };

  const empty = <p className="py-6 text-[15px] text-(--sov-text-tertiary)">{emptySentence(rows, filters)}</p>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={DOC.eyebrow}
        title={DOC.title}
        subtitle={DOC.subtitle}
        actions={
          <div ref={uploadButton}>
            <Button variant="primary" icon={Upload} aria-expanded={uploadOpen} onClick={() => setUploadOpen((previous) => !previous)}>
              {DOC.upload}
            </Button>
          </div>
        }
      />
      {uploadOpen ? (
        <InlinePanel heading={DOC.uploadHeading} closeLabel={DOC.uploadClose} onClose={closeUpload}>
          <div className="mt-4">
            <Dropzone labels={DROPZONE_LABELS} accept={ACCEPT_ATTRIBUTE} onFiles={(files) => uploads.addFiles(files)} />
          </div>
        </InlinePanel>
      ) : null}
      <UploadsList rows={rows} />
      <InspectorLayout
        inspector={
          current === undefined ? null : (
            <DocumentInspector
              row={current}
              rows={rows}
              displays={displays}
              panel={panel}
              onPanel={setPanel}
              onClose={closeInspector}
              onChanged={onChanged}
              closeRef={(element) => {
                inspectorBox.current = element;
              }}
              inspectorId={inspectorId}
            />
          )
        }
      >
        <div className="flex min-w-0 flex-col gap-4 [&>*]:min-w-0">
          <DocumentFilterBar rows={rows} displays={displays} filters={filters} onChange={changeFilters} />
          {state.status === 'loading' ? (
            <div className="border-t border-(--sov-border) py-5" data-loading-frame="documents">
              <Loading label={copy.app.loading} align="start" />
            </div>
          ) : null}
          {state.status === 'failed' && data === undefined ? <LoadFailed message={copy.workspace.frame.loadFailed} onRetry={() => void reload()} /> : null}
          {data === undefined ? null : (
            <div className="flex min-w-0 flex-col gap-4">
              <RegisterTable
                label={DOC.tableLabel}
                columns={columns}
                rows={shown.rows}
                rowKey={(row) => row.documentId}
                open={{ onOpen: (row) => open(row), label: DOC.openDetails, header: DOC.columns.details, inspectorId }}
                current={selected}
                rowAction={{ header: DOC.columns.actions, render: rowMenu }}
                empty={empty}
              />
              <Pager
                label={copy.workspace.pagination.label}
                previousLabel={copy.workspace.pagination.previous}
                nextLabel={copy.workspace.pagination.next}
                hasPrevious={shown.hasPrevious}
                hasNext={shown.hasNext}
                onPrevious={() => setPage(shown.page - 1)}
                onNext={() => setPage(shown.page + 1)}
              />
            </div>
          )}
        </div>
      </InspectorLayout>
    </div>
  );
}
