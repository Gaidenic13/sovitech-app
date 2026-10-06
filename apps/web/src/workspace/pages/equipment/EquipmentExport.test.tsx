import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROJECT, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, type Handler } from '../../../test/harness';
import { frameResponse } from '../../test-views';
import { equipmentResponse, type TestAsset } from './test-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const LIST = `/api/projects/${PROJECT}/workspace/equipment`;
const EXPORT = `/api/projects/${PROJECT}/exports/equipment`;
const TWO: TestAsset[] = [
  { n: 1, tag: 'TEST-AHU-1' },
  { n: 2, tag: 'TEST-FCU-2' },
];
const CSV = 'TEST demo line\nTag,Tag badge,Tag source\nTEST-AHU-1,From document,TEST source\n';

function stubObjectUrls(): Blob[] {
  const created: Blob[] = [];
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: (blob: Blob) => (created.push(blob), 'blob:TEST'), revokeObjectURL: () => undefined }));
  return created;
}

function api(exportHandler: Handler) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1' }])),
    [`GET /api/projects/${PROJECT}/workspace`]: () => json(200, frameResponse(PROJECT)),
    [`GET ${LIST}`]: () => json(200, equipmentResponse(PROJECT, TWO)),
    [`GET ${EXPORT}`]: exportHandler,
  });
}

async function openPage(path = `/projects/${PROJECT}/equipment`) {
  renderAt(path);
  await screen.findByRole('table', { name: 'Equipment' });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
}

describe('R-066 · US-ASSETS-11 AC6 · DB-17 "Export" · docs/adr/0050 decision 4: Equipment\'s Export', () => {
  it('US-ASSETS-11 AC6 · R-066 · rule 7: one press reads the CSV with the page\'s filters (every row: no page) and saves it under the name the API gave; two presses send one request; the button is never disabled', async () => {
    const created = stubObjectUrls();
    const held = heldHandler(() => new Response(CSV, { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="TEST-equipment.csv"' } }));
    const seen = api(held.handler);
    await openPage(`/projects/${PROJECT}/equipment?system=hvac&search=AHU&page=2`);
    const button = screen.getByRole('button', { name: 'Export' });
    const clicked: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function record(this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
    pressTwice(button);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
    await screen.findByText('Preparing the list');
    held.answer();
    await waitFor(() => expect(created).toHaveLength(1));
    expect(sentTo(seen, 'GET', '/exports/equipment')).toBe(1);
    const sent = seen.find((request) => request.path === EXPORT);
    expect(sent?.url.searchParams.get('system')).toBe('hvac');
    expect(sent?.url.searchParams.get('search')).toBe('AHU');
    expect(sent?.url.searchParams.has('page')).toBe(false);
    expect(clicked).toEqual(['TEST-equipment.csv']);
    expect(await created[0]?.text()).toBe(CSV);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('false'));
    click.mockRestore();
  });

  it('rule 7: an export that fails says so beside the alert icon, writes nothing, and the button takes presses again', async () => {
    stubObjectUrls();
    let calls = 0;
    const seen = api(() => {
      calls += 1;
      return json(500, { code: 'internal_error' });
    });
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('The list could not be exported. Try again.')).toBeTruthy();
    expect(seen.filter((request) => request.method !== 'GET')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(calls).toBe(2));
  });
});
