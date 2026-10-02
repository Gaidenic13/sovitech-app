import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROJECT, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler } from '../../../test/harness';
import { addedOn, deleteEffectResponse, doc, documentsResponse, frameResponse, type TestDocument } from '../../test-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const UPLOAD = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e80';
const CATEGORY_EMPTY = "No document is in this category. Categories read Unknown until a document's kind is set.";
const NEW_DOCUMENT = doc(90);

const THREE: TestDocument[] = [
  { documentId: doc(1), name: 'TEST plan 1.pdf', addedAt: addedOn(1) },
  { documentId: doc(2), name: 'TEST schedule 2.xlsx', addedAt: addedOn(3), format: 'xlsx', category: 'mep', stage: 'TEST technical design' },
  { documentId: doc(3), name: 'TEST model 3.ifc', addedAt: addedOn(2), format: 'ifc' },
];

function api(documents: readonly TestDocument[] | Handler, extra: Readonly<Record<string, Handler>> = {}, options: { readonly demo?: boolean } = {}) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1', demo: options.demo === true }])),
    [`GET /api/projects/${PROJECT}/workspace`]: () => json(200, frameResponse(PROJECT, { demo: options.demo === true })),
    [`GET /api/projects/${PROJECT}/workspace/documents`]: typeof documents === 'function' ? documents : () => json(200, documentsResponse(PROJECT, documents, options)),
    ...extra,
  });
}

async function openPage(path = `/projects/${PROJECT}/documents`) {
  const view = renderAt(path);
  await screen.findByRole('heading', { name: 'Project Documents', level: 1 });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  return view;
}

function table() {
  return screen.getByRole('table', { name: 'Project documents' });
}

function bodyRows() {
  return within(table()).getAllByRole('row').slice(1);
}

function rowOf(name: string) {
  const cell = within(table()).getByText(name);
  const row = cell.closest('tr');
  if (row === null) throw new Error(`no row for ${name}`);
  return row;
}

function names() {
  return bodyRows().map((row) => within(row).getByRole('rowheader').textContent);
}

async function chooseMenu(row: HTMLElement, item: string) {
  fireEvent.click(within(row).getByRole('button', { name: 'More actions' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
}

describe('DB-15 · R-016 · US-DOCS-13: the Documents register', () => {
  it('US-DOCS-13 AC1 · AC4 · R-017 · R-018 · R-019 · G2-14 · G1-26 (rendered half): each row shows the served file name, its category (Unknown while unclassified), its revision, stage, the date added in a <time> and its status line, each value bound; no Uploaded By or Size column', async () => {
    api(THREE);
    await openPage();
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers.slice(0, 6)).toEqual(['Name', 'Category', 'Version', 'Stage', 'Date Added', 'Analysis']);
    expect(headers.join(' ')).not.toMatch(/Uploaded By|Size|Description/u);
    const row = rowOf('TEST plan 1.pdf');
    expect(within(row).getByText('TEST plan 1.pdf').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`document:${doc(1)}.fileName`);
    const category = row.querySelector(`[data-value-id="document:${doc(1)}.kind"]`);
    expect(category?.textContent).toContain('Unknown');
    expect(row.querySelector(`[data-value-id="document:${doc(1)}.revision"]`)?.textContent).toContain('TEST rev 2');
    expect(row.querySelector(`[data-value-id="document:${doc(1)}.stage"]`)?.textContent).toContain('Unknown');
    const time = row.querySelector('time');
    expect(time?.getAttribute('datetime')).toBe('2026-09-01');
    expect(time?.textContent).toBe('1 Sep 2026');
    expect(within(row).getByText('TEST read, pages 1 to 4').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`document:${doc(1)}.coverage`);
  });

  it('US-DOCS-13 AC5 · R-017: Date Added sorts newest first by default; the chips show no count', async () => {
    api(THREE);
    await openPage();
    expect(names()).toEqual(['TEST schedule 2.xlsx', 'TEST model 3.ifc', 'TEST plan 1.pdf']);
    const added = within(table()).getByRole('columnheader', { name: /Date Added/u });
    expect(added.getAttribute('aria-sort')).toBe('descending');
    const chips = screen.getByRole('group', { name: 'Document category' });
    expect(within(chips).getAllByRole('radio')).toHaveLength(6);
    expect(chips.textContent).not.toMatch(/\d/u);
  });

  it('US-DOCS-13 AC3 · G1-26 (rendered half) · ADR 0045 decision 6 · DR-14 · V-11 · rule 12: a chip keeps only the documents whose kind maps to it; an unclassified document is listed under All Documents only, and a chip no document is in says why, never that nothing matches', async () => {
    api(THREE);
    await openPage();
    fireEvent.click(screen.getByRole('radio', { name: 'MEP' }));
    expect(names()).toEqual(['TEST schedule 2.xlsx']);
    fireEvent.click(screen.getByRole('radio', { name: 'Architectural' }));
    expect(within(table()).getByText(CATEGORY_EMPTY)).toBeTruthy();
    expect(within(table()).queryByText('No document matches this filter.')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Other' }));
    expect(within(table()).getByText(CATEGORY_EMPTY)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'All Documents' }));
    expect(names()).toHaveLength(3);
    // A search that hides the documents a chip holds still says that nothing matches.
    fireEvent.click(screen.getByRole('radio', { name: 'MEP' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search documents' }), { target: { value: 'TEST plan' } });
    expect(within(table()).getByText('No document matches this filter.')).toBeTruthy();
  });

  it('DR-14 · US-DOCS-14: a chip that hides the document whose inspector is open closes the inspector, and it stays closed when the chip changes back', async () => {
    api(THREE);
    await openPage();
    fireEvent.click(within(rowOf('TEST plan 1.pdf')).getByRole('button', { name: 'Show details' }));
    await screen.findByRole('region', { name: /TEST plan 1\.pdf/u });
    fireEvent.click(screen.getByRole('radio', { name: 'Architectural' }));
    expect(screen.queryByRole('region', { name: /TEST plan 1\.pdf/u })).toBeNull();
    expect(document.querySelector('[data-document-inspector]')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'All Documents' }));
    expect(names()).toHaveLength(3);
    expect(document.querySelector('[data-document-inspector]')).toBeNull();
    // A filter that keeps the document keeps its inspector.
    fireEvent.click(within(rowOf('TEST schedule 2.xlsx')).getByRole('button', { name: 'Show details' }));
    await screen.findByRole('region', { name: /TEST schedule 2\.xlsx/u });
    fireEvent.click(screen.getByRole('radio', { name: 'MEP' }));
    expect(screen.getByRole('region', { name: /TEST schedule 2\.xlsx/u })).toBeTruthy();
  });

  it('DR-2 · DR-8 · DR-15: the page sets no padding of its own (the frame\'s page column does), the Name column keeps a narrow floor, the inspector\'s values wrap by the kit\'s rule only, and Download fills the footer row beside the menu', async () => {
    api(THREE);
    await openPage();
    const root = screen.getByRole('heading', { name: 'Project Documents', level: 1 }).closest('.sov-page-header')?.parentElement as HTMLElement;
    expect(root.className).not.toMatch(/(^|\s)(p|px|py|pt|pb|pl|pr)-/u);
    expect(rowOf('TEST plan 1.pdf').querySelector('[data-document-row]')?.className).not.toContain('min-w-[200px]');
    fireEvent.click(within(rowOf('TEST plan 1.pdf')).getByRole('button', { name: 'Show details' }));
    const inspector = await screen.findByRole('region', { name: /TEST plan 1\.pdf/u });
    for (const detail of inspector.querySelectorAll('dd')) expect(detail.className).not.toContain('break-words');
    const actions = inspector.querySelector('[data-inspector-actions]') as HTMLElement;
    expect(actions.className).toContain('w-full');
    const download = within(actions).getByRole('link', { name: 'Download' });
    expect(download.className).toContain('flex-1');
    expect(download.getAttribute('data-variant')).toBe('secondary');
    expect(within(actions.querySelector('[data-inspector-menu]') as HTMLElement).getByRole('button', { name: 'More actions' })).toBeTruthy();
  });

  it('US-DOCS-13 AC5: the search filters by the served file name, and a column head sorts by its column, ascending then descending (aria-sort)', async () => {
    api(THREE);
    await openPage();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search documents' }), { target: { value: 'SCHEDULE' } });
    expect(names()).toEqual(['TEST schedule 2.xlsx']);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search documents' }), { target: { value: '' } });
    const nameHead = within(table()).getByRole('columnheader', { name: /Name/u });
    fireEvent.click(within(nameHead).getByRole('button'));
    expect(nameHead.getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(['TEST model 3.ifc', 'TEST plan 1.pdf', 'TEST schedule 2.xlsx']);
    fireEvent.click(within(nameHead).getByRole('button'));
    expect(nameHead.getAttribute('aria-sort')).toBe('descending');
    expect(names()).toEqual(['TEST schedule 2.xlsx', 'TEST plan 1.pdf', 'TEST model 3.ifc']);
  });

  it('R-017 "Until decided": more documents than a page holds page with Previous and Next only; no page number and no "Showing" line', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ documentId: doc(index + 1), name: `TEST file ${String(index + 1)}.pdf`, addedAt: addedOn(index + 1) }));
    api(many);
    await openPage();
    expect(bodyRows()).toHaveLength(10);
    const pager = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pager).getAllByRole('button').map((button) => button.textContent)).toEqual(['Next']);
    expect(pager.textContent).not.toMatch(/\d/u);
    expect(document.body.textContent).not.toMatch(/Showing/u);
    fireEvent.click(within(pager).getByRole('button', { name: 'Next' }));
    expect(bodyRows()).toHaveLength(2);
    expect(within(screen.getByRole('navigation', { name: 'Pages' })).getAllByRole('button').map((button) => button.textContent)).toEqual(['Previous']);
  });

  it('US-DOCS-15 AC4 · UD-22: the filter panel filters by stored record fields only (the stage, the file type), and each active filter is shown on the page with its remove control; nothing is sent', async () => {
    const seen = api(THREE);
    await openPage();
    const reads = seen.length;
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const panel = screen.getByRole('group', { name: 'Filter documents' });
    expect(screen.queryByRole('dialog')).toBeNull();
    const types = within(panel).getByRole('listbox', { name: 'File type' });
    fireEvent.click(within(types).getByRole('option', { name: 'IFC' }));
    expect(names()).toEqual(['TEST model 3.ifc']);
    const active = screen.getByRole('list', { name: 'Active filters' });
    expect(active.textContent).toContain('File type');
    expect(active.textContent).toContain('IFC');
    fireEvent.click(within(active).getByRole('button', { name: 'Remove this filter' }));
    expect(names()).toHaveLength(3);
    const stages = within(panel).getByRole('listbox', { name: 'Stage' });
    fireEvent.click(within(stages).getByRole('option', { name: /TEST technical design/u }));
    expect(names()).toEqual(['TEST schedule 2.xlsx']);
    expect(seen.length).toBe(reads);
  });

  it('prompt 3 section 11 (states): no documents shows the empty sentence; a failed load says so with Try again', async () => {
    api([]);
    await openPage();
    expect(within(table()).getByText('No documents yet. Upload your drawings, schedules and other files to start.')).toBeTruthy();
    cleanup();
    vi.unstubAllGlobals();
    let fail = true;
    api(() => (fail ? json(500, { code: 'internal_error' }) : json(200, documentsResponse(PROJECT, THREE))));
    renderAt(`/projects/${PROJECT}/documents`);
    await screen.findByText('This page could not be loaded. Nothing you entered is lost.');
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
    fail = false;
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0] as HTMLElement);
    await screen.findByText('TEST plan 1.pdf');
  });

  it('US-DOCS-13 · rule 12: a file being read shows the bar with no number until its line is served', async () => {
    api([{ documentId: doc(1), name: 'TEST reading.pdf', addedAt: addedOn(1), reading: true }]);
    await openPage();
    const bar = within(rowOf('TEST reading.pdf')).getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.textContent).toBe('');
  });
});

describe('DB-15 · US-DOCS-14 · US-DOCS-15: the inspector and the menus', () => {
  it('US-DOCS-14 AC1 · AC2 · AC5 · R-017 · R-018 · R-019 · P-4-DOCUMENT-PREVIEW: a row opens the inspector with its details, no preview, size, uploader or description, and Download links to the stored original after the access check', async () => {
    api(THREE);
    await openPage();
    fireEvent.click(within(rowOf('TEST plan 1.pdf')).getByRole('button', { name: 'Show details' }));
    const inspector = await screen.findByRole('region', { name: /TEST plan 1\.pdf/u });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(within(inspector).getByRole('button', { name: 'Close' }));
    expect(inspector.textContent).toContain('PDF');
    for (const label of ['Category', 'Version', 'Stage', 'Date Added', 'Analysis']) expect(within(inspector).getByText(label)).toBeTruthy();
    for (const absent of ['Uploaded By', 'Size', 'Description', 'MB']) expect(inspector.textContent).not.toContain(absent);
    expect(inspector.querySelector('img, canvas, svg[data-render-unreadable]')).toBeNull();
    const download = within(inspector).getByRole('link', { name: 'Download' });
    expect(download.getAttribute('href')).toBe(`/api/projects/${PROJECT}/documents/${doc(1)}/file`);
    expect(rowOf('TEST plan 1.pdf').getAttribute('aria-current')).toBe('true');
  });

  it('US-DOCS-14 AC6: closing the inspector keeps the filter and the sort, and returns the focus to the row', async () => {
    api(THREE);
    await openPage();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search documents' }), { target: { value: 'TEST' } });
    fireEvent.click(within(rowOf('TEST plan 1.pdf')).getByRole('button', { name: 'Show details' }));
    const inspector = await screen.findByRole('region', { name: /TEST plan 1\.pdf/u });
    fireEvent.click(within(inspector).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: /TEST plan 1\.pdf/u })).toBeNull();
    expect((screen.getByRole('searchbox', { name: 'Search documents' }) as HTMLInputElement).value).toBe('TEST');
    await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Show details'));
  });

  it('US-DOCS-15 AC1: the row menu offers Download, Replace, the revision declaration and Delete, and is not a dialog', async () => {
    api(THREE);
    await openPage();
    fireEvent.click(within(rowOf('TEST plan 1.pdf')).getByRole('button', { name: 'More actions' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Download', 'Replace', 'Mark as a revision of another document', 'Delete']);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('G4-39 (page half) · UD-42 · 7.1.1-D4 · US-DOCS-21 AC1 · rule 7: Delete opens an inline confirmation, never a dialog, that states the served effect, bound, before anything is removed; Delete then sends one request per press, and the register is read again', async () => {
    const effect = heldHandler(() => json(200, deleteEffectResponse(PROJECT, doc(1))));
    const erase = heldHandler(() => json(200, { documentId: doc(1), filesKeptForAnotherDocument: false }));
    let documents = THREE;
    const seen = api(() => json(200, documentsResponse(PROJECT, documents)), {
      [`GET /api/projects/${PROJECT}/workspace/documents/${doc(1)}/delete-effect`]: effect.handler,
      [`DELETE /api/projects/${PROJECT}/documents/${doc(1)}`]: erase.handler,
    });
    await openPage();
    await chooseMenu(rowOf('TEST plan 1.pdf'), 'Delete');
    const panel = await screen.findByRole('region', { name: 'Delete this document?' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    // While the effect is being worked out, nothing offers to delete.
    expect(within(panel).queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(sentTo(seen, 'DELETE', `/documents/${doc(1)}`)).toBe(0);
    effect.answer();
    const line = await within(panel).findByText('TEST 3 values will return to Unknown');
    expect(line.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`document:${doc(1)}.deleteEffect`);
    const confirm = within(panel).getByRole('button', { name: 'Delete' });
    pressTwice(confirm);
    await settle();
    expect(confirm.getAttribute('aria-busy')).toBe('true');
    expect(confirm.hasAttribute('disabled')).toBe(false);
    expect(sentTo(seen, 'DELETE', `/documents/${doc(1)}`)).toBe(1);
    documents = THREE.slice(1);
    erase.answer();
    await waitFor(() => expect(within(table()).queryByText('TEST plan 1.pdf')).toBeNull());
    expect(document.querySelector('[data-document-inspector]')).toBeNull();
  });

  it('A-6 · WCAG 2.4.3: once a document is deleted, the focus moves to the open button of the row after it, never to the page\'s body', async () => {
    let documents = THREE;
    api(() => json(200, documentsResponse(PROJECT, documents)), {
      [`GET /api/projects/${PROJECT}/workspace/documents/${doc(3)}/delete-effect`]: () => json(200, deleteEffectResponse(PROJECT, doc(3))),
      [`DELETE /api/projects/${PROJECT}/documents/${doc(3)}`]: () => {
        documents = THREE.filter((document) => document.documentId !== doc(3));
        return json(200, { documentId: doc(3), filesKeptForAnotherDocument: false });
      },
    });
    await openPage();
    // Newest first: schedule 2, model 3, plan 1. The model is deleted; plan 1 comes after it.
    expect(names()).toEqual(['TEST schedule 2.xlsx', 'TEST model 3.ifc', 'TEST plan 1.pdf']);
    await chooseMenu(rowOf('TEST model 3.ifc'), 'Delete');
    const panel = await screen.findByRole('region', { name: 'Delete this document?' });
    await within(panel).findByText('TEST 3 values will return to Unknown');
    const confirm = within(panel).getByRole('button', { name: 'Delete' });
    confirm.focus();
    fireEvent.click(confirm);
    await waitFor(() => expect(within(table()).queryByText('TEST model 3.ifc')).toBeNull());
    const next = within(rowOf('TEST plan 1.pdf')).getByRole('button', { name: 'Show details' });
    await waitFor(() => expect(document.activeElement).toBe(next));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('A-6 · WCAG 2.4.3: once the last document left is deleted, the focus moves to the page column (the register no longer scrolls, so it is no tab stop), never to the page\'s body', async () => {
    let documents: readonly TestDocument[] = [THREE[0] as TestDocument];
    api(() => json(200, documentsResponse(PROJECT, documents)), {
      [`GET /api/projects/${PROJECT}/workspace/documents/${doc(1)}/delete-effect`]: () => json(200, deleteEffectResponse(PROJECT, doc(1))),
      [`DELETE /api/projects/${PROJECT}/documents/${doc(1)}`]: () => {
        documents = [];
        return json(200, { documentId: doc(1), filesKeptForAnotherDocument: false });
      },
    });
    await openPage();
    await chooseMenu(rowOf('TEST plan 1.pdf'), 'Delete');
    const panel = await screen.findByRole('region', { name: 'Delete this document?' });
    await within(panel).findByText('TEST 3 values will return to Unknown');
    const confirm = within(panel).getByRole('button', { name: 'Delete' });
    confirm.focus();
    fireEvent.click(confirm);
    await within(table()).findByText('No documents yet. Upload your drawings, schedules and other files to start.');
    const register = screen.getByRole('region', { name: 'Project documents' });
    // A region that does not scroll is no tab stop (DR-12), so it cannot hold the focus in a browser: the page column does.
    expect(register.hasAttribute('tabindex')).toBe(false);
    const main = document.getElementById('main');
    expect(main?.tagName).toBe('MAIN');
    await waitFor(() => expect(document.activeElement).toBe(main));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('NP-1 · A-6 · WCAG 2.4.3: when the last document is deleted while the open inspector makes the register overflow (a tab stop then, DR-12), the focus goes to the page column, which keeps its focusability, never to the register that loses its tab stop once the inspector closes', async () => {
    // happy-dom lays nothing out and keeps the focus on an element that loses its tab index, so the register's widths are
    // set by hand and the region's observer is told of them, as Chromium's layout would; there the focus fell to <body>
    // about 11 ms after the region lost its tab stop (the final verifier's focus trace).
    const observers: TestResizeObserver[] = [];
    class TestResizeObserver {
      readonly observed: Element[] = [];
      constructor(private readonly callback: ResizeObserverCallback) {
        observers.push(this);
      }
      observe(target: Element): void {
        this.observed.push(target);
      }
      unobserve(): void {}
      disconnect(): void {
        this.observed.length = 0;
      }
      report(): void {
        act(() => this.callback([], this as unknown as ResizeObserver));
      }
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    const layOut = (region: HTMLElement, scrollWidth: number, clientWidth: number) => {
      Object.defineProperty(region, 'scrollWidth', { configurable: true, get: () => scrollWidth });
      Object.defineProperty(region, 'clientWidth', { configurable: true, get: () => clientWidth });
      for (const observer of observers.filter((each) => each.observed.includes(region))) observer.report();
    };
    let documents: readonly TestDocument[] = [THREE[0] as TestDocument];
    api(() => json(200, documentsResponse(PROJECT, documents)), {
      [`GET /api/projects/${PROJECT}/workspace/documents/${doc(1)}/delete-effect`]: () => json(200, deleteEffectResponse(PROJECT, doc(1))),
      [`DELETE /api/projects/${PROJECT}/documents/${doc(1)}`]: () => {
        documents = [];
        return json(200, { documentId: doc(1), filesKeptForAnotherDocument: false });
      },
    });
    await openPage();
    await chooseMenu(rowOf('TEST plan 1.pdf'), 'Delete');
    const panel = await screen.findByRole('region', { name: 'Delete this document?' });
    await within(panel).findByText('TEST 3 values will return to Unknown');
    const register = screen.getByRole('region', { name: 'Project documents' });
    // The inspector open beside it: the table is wider than the region, which is then a tab stop (DR-12).
    layOut(register, 852, 812);
    expect(register.getAttribute('tabindex')).toBe('0');
    const confirm = within(panel).getByRole('button', { name: 'Delete' });
    confirm.focus();
    fireEvent.click(confirm);
    await within(table()).findByText('No documents yet. Upload your drawings, schedules and other files to start.');
    const main = document.getElementById('main');
    expect(main?.tagName).toBe('MAIN');
    expect(main?.getAttribute('tabindex')).toBe('-1');
    await waitFor(() => expect(document.activeElement).toBe(main));
    // The inspector closed: the region no longer scrolls and is no tab stop; the page column keeps the focus.
    layOut(register, 1184, 1184);
    expect(register.hasAttribute('tabindex')).toBe(false);
    expect(document.activeElement).toBe(main);
    expect(document.activeElement).not.toBe(register);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('US-DOCS-21 · rule 13: Cancel and Escape close the confirmation and remove nothing', async () => {
    const seen = api(THREE, { [`GET /api/projects/${PROJECT}/workspace/documents/${doc(1)}/delete-effect`]: () => json(200, deleteEffectResponse(PROJECT, doc(1))) });
    await openPage();
    await chooseMenu(rowOf('TEST plan 1.pdf'), 'Delete');
    let panel = await screen.findByRole('region', { name: 'Delete this document?' });
    await within(panel).findByText('TEST 3 values will return to Unknown');
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('region', { name: 'Delete this document?' })).toBeNull();
    await chooseMenu(screen.getByRole('region', { name: /TEST plan 1\.pdf/u }), 'Delete');
    panel = await screen.findByRole('region', { name: 'Delete this document?' });
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Delete this document?' })).toBeNull();
    expect(sentTo(seen, 'DELETE', `/documents/${doc(1)}`)).toBe(0);
    expect(within(table()).getByText('TEST plan 1.pdf')).toBeTruthy();
  });

  it('UD-42 · rule 7: an effect that cannot be worked out says so with Try again, offers no Delete, and removes nothing', async () => {
    const seen = api(THREE, { [`GET /api/projects/${PROJECT}/workspace/documents/${doc(1)}/delete-effect`]: () => json(500, { code: 'internal_error' }) });
    await openPage();
    await chooseMenu(rowOf('TEST plan 1.pdf'), 'Delete');
    const panel = await screen.findByRole('region', { name: 'Delete this document?' });
    await within(panel).findByText('What deleting this document changes could not be worked out. Nothing was removed. Try again.');
    expect(within(panel).queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(sentTo(seen, 'DELETE', `/documents/${doc(1)}`)).toBe(0);
  });

  it('UD-43 · US-DOCS-20 AC2 · 2.3 "Revisions are declared, never guessed": the owner chooses the older document and Save declares this one its revision, one request per press; nothing is deleted', async () => {
    const declare = heldHandler(() => new Response(null, { status: 204 }));
    const seen = api(THREE, { [`POST /api/projects/${PROJECT}/documents/${doc(2)}/revision-of`]: declare.handler });
    await openPage();
    await chooseMenu(rowOf('TEST schedule 2.xlsx'), 'Mark as a revision of another document');
    const panel = await screen.findByRole('region', { name: 'Which document does this file revise?' });
    const choices = within(panel).getAllByRole('radio');
    expect(choices).toHaveLength(2);
    expect(within(panel).queryByText('TEST schedule 2.xlsx')).toBeNull();
    // Save with nothing chosen asks for the choice and sends nothing.
    fireEvent.click(within(panel).getByRole('button', { name: 'Save' }));
    expect(within(panel).getByText('Choose the older document first.')).toBeTruthy();
    fireEvent.click(within(panel).getByRole('radio', { name: /TEST plan 1\.pdf/u }));
    pressTwice(within(panel).getByRole('button', { name: 'Save' }));
    await settle();
    expect(sentTo(seen, 'POST', `/documents/${doc(2)}/revision-of`)).toBe(1);
    expect(seen.find((request) => request.path.endsWith('/revision-of'))?.body).toEqual({ revisionOf: doc(1) });
    declare.answer();
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Which document does this file revise?' })).toBeNull());
    expect(sentTo(seen, 'DELETE', '/documents/')).toBe(0);
  });

  it('A-5 · NP-2 · 2.3 "Revisions are declared, never guessed" · ADR 0016 decision 17: the revision panel never offers a document whose served revision chain reaches this one through another document, so no cycle can be declared; the reverse of a direct pair, a correction the derive applies, is offered', async () => {
    // TEST chain: plan 1 <- schedule 2 <- model 3 (each declared a revision of the one before); notes 4 stands alone.
    const chain: TestDocument[] = [
      { documentId: doc(1), name: 'TEST plan 1.pdf', addedAt: addedOn(1) },
      { documentId: doc(2), name: 'TEST schedule 2.xlsx', addedAt: addedOn(2), format: 'xlsx', revisionOf: doc(1) },
      { documentId: doc(3), name: 'TEST model 3.ifc', addedAt: addedOn(3), format: 'ifc', revisionOf: doc(2) },
      { documentId: doc(4), name: 'TEST notes 4.pdf', addedAt: addedOn(4) },
    ];
    api(chain);
    await openPage();
    const offered = async (row: string) => {
      await chooseMenu(rowOf(row), 'Mark as a revision of another document');
      const panel = await screen.findByRole('region', { name: 'Which document does this file revise?' });
      const options = within(panel)
        .queryAllByRole('radio')
        .map((radio) => radio.closest('label')?.textContent ?? '');
      fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
      // Cancel returns the focus to the inspector's menu, where the panel was opened from.
      await waitFor(() => expect(document.activeElement?.closest('[data-inspector-menu]')).not.toBeNull());
      return options;
    };
    // plan 1: model 3 (A <- B <- C) reaches it through schedule 2, so declaring plan 1 a revision of model 3 would close a
    // cycle; schedule 2 (A <- B) is offered: on one pair the later declaration replaces the earlier one (NP-2).
    const first = await offered('TEST plan 1.pdf');
    expect(first).toHaveLength(2);
    expect(first.join(' ')).toContain('TEST schedule 2.xlsx');
    expect(first.join(' ')).toContain('TEST notes 4.pdf');
    expect(first.join(' ')).not.toContain('TEST model 3.ifc');
    // schedule 2: plan 1 is offered (declaring it again closes none), and model 3, its direct revision (a correction).
    const second = await offered('TEST schedule 2.xlsx');
    expect(second).toHaveLength(3);
    expect(second.join(' ')).toContain('TEST plan 1.pdf');
    expect(second.join(' ')).toContain('TEST model 3.ifc');
    expect(second.join(' ')).toContain('TEST notes 4.pdf');
    // model 3 and notes 4: no chain reaches them, so every other document is offered.
    expect(await offered('TEST model 3.ifc')).toHaveLength(3);
    expect(await offered('TEST notes 4.pdf')).toHaveLength(3);
  });

  it('US-DOCS-20 AC1 · UD-43: Replace uploads the new file and, once it is stored, declares it a revision of the document; the older file stays listed', async () => {
    let documents: readonly TestDocument[] = THREE;
    const seen = api(() => json(200, documentsResponse(PROJECT, documents)), {
      [`POST /api/projects/${PROJECT}/uploads`]: () => json(201, { uploadId: UPLOAD, received: 0, chunkBytes: 1024 }),
      [`PUT /api/projects/${PROJECT}/uploads/${UPLOAD}`]: () => json(200, { uploadId: UPLOAD, received: 4, chunkBytes: 1024 }),
      [`POST /api/projects/${PROJECT}/uploads/${UPLOAD}/complete`]: () => {
        documents = [...THREE, { documentId: NEW_DOCUMENT, name: 'TEST plan 1 rev.pdf', addedAt: addedOn(9), revisionOf: doc(1) }];
        return json(201, { documentId: NEW_DOCUMENT, statusLine: null });
      },
      [`POST /api/projects/${PROJECT}/documents/${NEW_DOCUMENT}/revision-of`]: () => new Response(null, { status: 204 }),
    });
    await openPage();
    await chooseMenu(rowOf('TEST plan 1.pdf'), 'Replace');
    const panel = await screen.findByRole('region', { name: 'Upload a new revision of this document' });
    const input = panel.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const file = new File([new Uint8Array(4)], 'TEST plan 1 rev.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input as HTMLInputElement);
    await waitFor(() => expect(sentTo(seen, 'POST', `/documents/${NEW_DOCUMENT}/revision-of`)).toBe(1));
    expect(seen.find((request) => request.path.endsWith(`${NEW_DOCUMENT}/revision-of`))?.body).toEqual({ revisionOf: doc(1) });
    await within(table()).findByText('TEST plan 1 rev.pdf');
    expect(within(table()).getByText('TEST plan 1.pdf')).toBeTruthy();
    expect(sentTo(seen, 'DELETE', '/documents/')).toBe(0);
  });
});

describe('UD-21 · US-DOCS-12: Upload Document after the intake', () => {
  it('US-DOCS-12 AC1 · AC2 · rule 7: Upload Document opens step 2\'s dropzone inline, never a dialog, with Browse files, the formats and the size line; closing it keeps the page', async () => {
    api(THREE);
    await openPage();
    const button = screen.getByRole('button', { name: 'Upload Document' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    const panel = await screen.findByRole('region', { name: 'Upload documents' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(panel).getByRole('button', { name: 'Browse files' })).toBeTruthy();
    expect(within(panel).getByText('Max file size 500 MB')).toBeTruthy();
    expect(panel.querySelector('input[type="file"]')?.hasAttribute('multiple')).toBe(true);
    fireEvent.click(within(panel).getByRole('button', { name: 'Close the upload panel' }));
    expect(screen.queryByRole('region', { name: 'Upload documents' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Upload Document' }));
  });

  it('ADR 0043 decision 4 · the upload_document action: ?upload=open opens Documents with its upload surface open', async () => {
    api(THREE);
    await openPage(`/projects/${PROJECT}/documents?upload=open`);
    expect(await screen.findByRole('region', { name: 'Upload documents' })).toBeTruthy();
  });

  it('US-DOCS-01 AC4 · rule 7: a file refused on the page shows its reason in the uploads list, and nothing is sent', async () => {
    const seen = api(THREE);
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Upload Document' }));
    const panel = await screen.findByRole('region', { name: 'Upload documents' });
    const input = panel.querySelector<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(input, 'files', { value: [new File([new Uint8Array(4)], 'TEST.exe')], configurable: true });
    fireEvent.change(input as HTMLInputElement);
    const uploads = await screen.findByRole('region', { name: 'Uploads' });
    expect(within(uploads).getByRole('alert').textContent).toContain('EXE');
    expect(sentTo(seen, 'POST', '/uploads')).toBe(0);
  });
});
