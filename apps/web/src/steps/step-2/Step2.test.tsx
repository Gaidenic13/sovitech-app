import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { AS_OF, PROJECT, envelope, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle } from '../../test/harness';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const DOCUMENT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e91';
const UPLOAD = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e92';

function display(valueId: string, text: string, extra: Partial<DisplayObject> = {}): DisplayObject {
  return { valueId, kind: 'record', text, shape: 'value', ...extra };
}

const DISPLAYS: DisplayObject[] = [
  display(`document:${DOCUMENT}.fileName`, 'TEST-schedule.pdf'),
  display(`document:${DOCUMENT}.coverage`, 'TEST coverage line', { kind: 'line' }),
  display(`document:${DOCUMENT}.stage`, 'TEST unknown', { shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'TEST unknown' } }),
  display(`document:${DOCUMENT}.revision`, 'TEST unknown', { shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'TEST unknown' } }),
  display(`upload:${UPLOAD}.fileName`, 'TEST-model.ifc'),
  display(`project:${PROJECT}.documents.count`, 'TEST files line', { kind: 'line' }),
  display(`project:${PROJECT}.documents.stillReading`, 'TEST still reading line', { kind: 'line' }),
];

function stepTwo(options: { readonly files?: boolean; readonly demo?: boolean } = {}) {
  const files = options.files === false ? [] : [
    {
      documentId: DOCUMENT,
      fileName: `document:${DOCUMENT}.fileName`,
      status: { kind: 'line', valueId: `document:${DOCUMENT}.coverage` },
      stage: `document:${DOCUMENT}.stage`,
      revision: `document:${DOCUMENT}.revision`,
    },
    { uploadId: UPLOAD, fileName: `upload:${UPLOAD}.fileName`, status: { kind: 'progress' }, stage: null, revision: null },
  ];
  return {
    ...envelope(PROJECT, DISPLAYS, { demo: options.demo === true }),
    view: {
      step: 2,
      files,
      documentCount: `project:${PROJECT}.documents.count`,
      stillReading: options.files === false ? null : `project:${PROJECT}.documents.stillReading`,
    },
  };
}

function api(options: { readonly files?: boolean; readonly demo?: boolean } = {}) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo: options.demo === true }])),
    [`GET /api/projects/${PROJECT}/steps/2`]: () => json(200, stepTwo(options)),
    [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    [`POST /api/projects/${PROJECT}/steps/2/continue`]: () => json(200, { nextStep: 3, displayObjects: [] }),
  });
}

describe('US-DOCS-01 · US-DOCS-03 · UD-33: step 2 (OB-2)', () => {
  it('US-DOCS-03 AC1-AC8 · prompt 3 section 7: each file shows its served name, status line, stage and revision bound to their value ids; a file in progress shows a bar with no number', async () => {
    api();
    renderAt(`/projects/${PROJECT}/steps/2`);
    const name = await screen.findByText('TEST-schedule.pdf');
    expect(name.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`document:${DOCUMENT}.fileName`);
    expect(screen.getByText('TEST coverage line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`document:${DOCUMENT}.coverage`);
    expect(screen.getByText('TEST-model.ifc').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`upload:${UPLOAD}.fileName`);
    expect(document.querySelector(`[data-value-id="document:${DOCUMENT}.stage"]`)).not.toBeNull();
    expect(document.querySelector(`[data-value-id="document:${DOCUMENT}.revision"]`)).not.toBeNull();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.textContent).toBe('');
    // DR-4 · WCAG 1.4.1: the upload's state shows in words beside the bar, which it names.
    expect(bar.closest('.sov-progress')?.textContent).toBe('Uploading');
    expect(screen.queryByText('Being read')).toBeNull();
    expect(screen.getByText('TEST files line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.documents.count`);
    expect(screen.getByText('TEST still reading line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.documents.stillReading`);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });

  it('US-DOCS-03 AC7, AC11 · US-DOCS-01 AC7: no Edit on stage, no remove action on a file, and the five tiles are hints with no state', async () => {
    api();
    renderAt(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('TEST-schedule.pdf');
    expect(screen.queryByRole('button', { name: /edit|remove|delete/iu })).toBeNull();
    const tiles = screen.getByRole('region', { name: 'Common document types (optional)' });
    expect(within(tiles).getAllByRole('listitem')).toHaveLength(5);
    expect(within(tiles).queryAllByRole('checkbox')).toHaveLength(0);
    expect(within(tiles).queryAllByRole('button')).toHaveLength(0);
  });

  it('US-DOCS-01 AC4 · DR-10 · rule 7: a format off the list is refused on its own row, before any request, named by its extension in words and never by its name; Continue stays enabled', async () => {
    const seen = api();
    renderAt(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('TEST-schedule.pdf');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['TEST'], 'TEST-tool.exe'), new File(['TEST'], 'TEST-tool.b64'), new File(['TEST'], 'TEST-offer.quote')] } });
    const refused = await screen.findAllByText('This format is not on the accepted list. The other files are kept.');
    expect(refused).toHaveLength(3);
    const rows = refused.map((line) => line.closest('li')?.textContent ?? '');
    expect(rows[0]).toContain('A EXE file was not added');
    // An extension with a digit, or long enough to hold a reserved term, is not named.
    expect(rows[1]).toContain('A file was not added');
    expect(rows[2]).toContain('A file was not added');
    for (const row of rows) expect(row).not.toMatch(/TEST-tool|TEST-offer|b64|quote/u);
    expect(seen.some((request) => request.path.endsWith('/uploads'))).toBe(false);
    expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(false);
  });

  it('DR-23 · US-DOCS-03 AC8: the bound file count shows once a file is stored, and not while only uploads are listed or nothing is', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/2`]: () => {
        const base = stepTwo();
        return json(200, { ...base, view: { ...base.view, files: base.view.files.filter((row) => row.uploadId !== undefined) } });
      },
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('TEST-model.ifc');
    expect(screen.queryByText('TEST files line')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Your files' })).toBeTruthy();
    cleanup();
    vi.unstubAllGlobals();
    api({ files: false });
    renderAt(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('No files added yet. You can continue without documents and add them later.');
    expect(screen.queryByText('TEST files line')).toBeNull();
    cleanup();
    vi.unstubAllGlobals();
    api();
    renderAt(`/projects/${PROJECT}/steps/2`);
    expect((await screen.findByText('TEST files line')).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`project:${PROJECT}.documents.count`);
  });

  it('DR-9 · DR-12 · DR-18 · onboarding-spec 2.4: the dropzone and the list at the drawn width; while the list loads one "Loading your answers" line; the headings in the kit\'s roles', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/2`]: () => new Promise<Response>(() => undefined),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/steps/2`);
    const loading = await screen.findByText('Loading your answers');
    // The list keeps its frame while it loads: the hairline and the padding of the empty list's sentence.
    expect(loading.closest('[data-loading-frame="files"]')?.className).toBe('border-t border-(--sov-border) py-5');
    expect(document.querySelector('main [data-value-id]')).toBeNull();
    const files = screen.getByRole('heading', { level: 2, name: 'Your files' });
    expect(files.classList.contains('sov-heading-section')).toBe(true);
    expect(files.closest('.max-w-\\[745px\\]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Common document types (optional)' }).classList.contains('sov-heading-group')).toBe(true);
    expect(screen.getByRole('button', { name: 'Browse files' }).closest('.max-w-\\[745px\\]')).not.toBeNull();
  });

  it('US-DOCS-01 AC6 · US-DOCS-03 AC9 · R-008: Continue with no file opens step 3, with no dialog; Back opens step 1', async () => {
    api({ files: false });
    const { router } = renderAt(`/projects/${PROJECT}/steps/2`);
    expect(await screen.findByText('No files added yet. You can continue without documents and add them later.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/3`));
    // Step 3 is on screen before the owner goes back: under a loaded run the route changes before
    // the screen does, and a Back pressed then would be step 2's own, or step 3's.
    await screen.findByRole('heading', { level: 1, name: 'Your building' }, { timeout: 5_000 });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await router.navigate(`/projects/${PROJECT}/steps/2`);
    await screen.findByRole('heading', { level: 1, name: 'Upload your project documents' }, { timeout: 5_000 });
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Your building' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/1`));
  });

  it('US-DOCS-01 AC9 · US-REVIEW-03 AC1 · GS-1: the demo project shows the served demo line on step 2; another project shows none (US-REVIEW-03 AC7)', async () => {
    api({ demo: true });
    renderAt(`/projects/${PROJECT}/steps/2`);
    expect(await screen.findByText('TEST demo line')).toBeTruthy();
    cleanup();
    vi.unstubAllGlobals();
    api({ demo: false });
    renderAt(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('TEST-schedule.pdf');
    expect(screen.queryByText('TEST demo line')).toBeNull();
  });
});

describe('US-DOCS-01 AC2 · F-INGEST-01 · ADR 0019: an upload from step 2', () => {
  it('US-DOCS-01 AC2 · US-DOCS-03 AC1: a chosen file is created, sent and completed; its row shows the served name with a progress bar, then the stored document', async () => {
    let phase: 'none' | 'uploading' | 'stored' = 'none';
    const seen = installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`GET /api/projects/${PROJECT}/steps/2`]: () => {
        const base = stepTwo({ files: false });
        const files =
          phase === 'none'
            ? []
            : phase === 'uploading'
              ? [{ uploadId: UPLOAD, fileName: `upload:${UPLOAD}.fileName`, status: { kind: 'progress' }, stage: null, revision: null }]
              : [
                  {
                    documentId: DOCUMENT,
                    fileName: `document:${DOCUMENT}.fileName`,
                    status: { kind: 'line', valueId: `document:${DOCUMENT}.coverage` },
                    stage: `document:${DOCUMENT}.stage`,
                    revision: `document:${DOCUMENT}.revision`,
                  },
                ];
        return json(200, { ...base, view: { ...base.view, files } });
      },
      [`POST /api/projects/${PROJECT}/uploads`]: () => {
        phase = 'uploading';
        return json(201, { uploadId: UPLOAD, received: 0, chunkBytes: 1024 });
      },
      [`PUT /api/projects/${PROJECT}/uploads/${UPLOAD}`]: () => json(200, { uploadId: UPLOAD, received: 4, chunkBytes: 1024 }),
      [`POST /api/projects/${PROJECT}/uploads/${UPLOAD}/complete`]: () => {
        phase = 'stored';
        return json(201, { documentId: DOCUMENT, statusLine: null });
      },
    });
    renderAt(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('No files added yet. You can continue without documents and add them later.');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['TEST'], 'TEST-schedule.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByText('TEST coverage line')).toBeTruthy();
    expect(screen.getByText('TEST-schedule.pdf').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`document:${DOCUMENT}.fileName`);
    const create = seen.find((request) => request.method === 'POST' && request.path === `/api/projects/${PROJECT}/uploads`);
    expect(create?.body).toEqual({ fileName: 'TEST-schedule.pdf', size: 4 });
    expect(seen.some((request) => request.method === 'PUT' && request.url.searchParams.get('offset') === '0')).toBe(true);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('DR-10 · ADR 0028 · US-DOCS-01 AC4: a file the API refuses after creating its upload shows the name the refusal serves for it, bound, with the served message', async () => {
    const message = 'TEST refusal message from the API.';
    const served = display(`upload:${UPLOAD}.fileName`, 'TEST-served-name.pdf');
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`GET /api/projects/${PROJECT}/steps/2`]: () => json(200, stepTwo({ files: false })),
      [`POST /api/projects/${PROJECT}/uploads`]: () => json(201, { uploadId: UPLOAD, received: 0, chunkBytes: 1024 }),
      [`PUT /api/projects/${PROJECT}/uploads/${UPLOAD}`]: () => json(200, { uploadId: UPLOAD, received: 4, chunkBytes: 1024 }),
      // The refusal names the file by the value id of its served display object (contract common.ts RefusalBody).
      [`POST /api/projects/${PROJECT}/uploads/${UPLOAD}/complete`]: () => json(422, { code: 'not_a_fixture', message, fileName: served.valueId, displayObjects: [served] }),
    });
    renderAt(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('No files added yet. You can continue without documents and add them later.');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['TEST'], 'TEST-owner-file.pdf')] } });
    const refused = await screen.findByText(message);
    const row = refused.closest('li') as HTMLElement;
    expect(within(row).getByText('TEST-served-name.pdf').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`upload:${UPLOAD}.fileName`);
    expect(row.textContent).not.toContain('TEST-owner-file');
    expect(row.textContent).not.toContain('A file was not added');
  });

  it('DR-4 · 2.8: a stored file being read shows the API\'s pending line beside its bar, bound, and no words of this app\'s own', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`GET /api/projects/${PROJECT}/steps/2`]: () => {
        const base = stepTwo();
        const reading = display(`document:${DOCUMENT}.coverage`, 'TEST reading documents', { kind: 'line', shape: 'missing', missing: 'reading_documents', badge: { id: 'reading_documents', label: 'TEST reading documents' } });
        const files = [{ documentId: DOCUMENT, fileName: `document:${DOCUMENT}.fileName`, status: { kind: 'progress', line: reading.valueId }, stage: `document:${DOCUMENT}.stage`, revision: `document:${DOCUMENT}.revision` }];
        return json(200, { ...base, displayObjects: [...base.displayObjects.filter((entry) => entry.valueId !== reading.valueId), reading], view: { ...base.view, files } });
      },
    });
    renderAt(`/projects/${PROJECT}/steps/2`);
    const line = await screen.findByText('TEST reading documents');
    expect(line.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`document:${DOCUMENT}.coverage`);
    const bar = screen.getByRole('progressbar', { name: 'Reading your documents' });
    expect(bar.textContent).toBe('');
    expect(screen.queryByText('Being read')).toBeNull();
    expect(screen.queryByText('Reading your documents')).toBeNull();
  });

  it('ADR 0028 · US-DOCS-01 AC4: a file the API refuses shows the served message on its own row; with no name served for it, never its name as typed', async () => {
    const message = 'TEST refusal message from the API.';
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`GET /api/projects/${PROJECT}/steps/2`]: () => {
        const base = stepTwo({ files: false });
        return json(200, { ...base, displayObjects: base.displayObjects.filter((display) => !display.valueId.startsWith('upload:')) });
      },
      [`POST /api/projects/${PROJECT}/uploads`]: () => json(201, { uploadId: UPLOAD, received: 0, chunkBytes: 1024 }),
      [`PUT /api/projects/${PROJECT}/uploads/${UPLOAD}`]: () => json(200, { uploadId: UPLOAD, received: 4, chunkBytes: 1024 }),
      [`POST /api/projects/${PROJECT}/uploads/${UPLOAD}/complete`]: () => json(422, { code: 'not_a_fixture', message }),
    });
    renderAt(`/projects/${PROJECT}/steps/2`);
    await screen.findByText('No files added yet. You can continue without documents and add them later.');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['TEST'], 'TEST-owner-file.pdf')] } });
    const refused = await screen.findByText(message);
    expect(refused.closest('li')?.textContent).not.toContain('TEST-owner-file');
    expect(refused.closest('li')?.textContent).toContain('A file was not added');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(message)).toBeNull();
  });
});

describe('A-1 · rule 7: one Continue per press on step 2', () => {
  it('A-1 · rule 7: Continue pressed twice before the page renders again sends one Continue; it shows aria-busy while that is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/2`]: () => json(200, stepTwo()),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`POST /api/projects/${PROJECT}/steps/2/continue`]: held.handler,
    });
    renderAt(`/projects/${PROJECT}/steps/2`);
    await waitFor(() => expect(sentTo(seen, 'GET', '/steps/2')).toBe(1));
    const next = await screen.findByRole('button', { name: 'Continue' });
    pressTwice(next);
    await settle();
    expect(sentTo(seen, 'POST', '/steps/2/continue')).toBe(1);
    expect(next.getAttribute('aria-busy')).toBe('true');
    expect(next.hasAttribute('disabled')).toBe(false);
    held.answer();
    await screen.findByText('This step could not be saved. Your other answers are kept. Try again.');
    expect(next.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(next);
    await waitFor(() => expect(sentTo(seen, 'POST', '/steps/2/continue')).toBe(2));
  });
});
