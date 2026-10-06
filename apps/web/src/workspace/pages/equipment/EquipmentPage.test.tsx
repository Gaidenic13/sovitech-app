import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROJECT, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler, type Seen } from '../../../test/harness';
import { BUILDING, frameResponse } from '../../test-views';
import { SEARCH_DELAY_MS } from './EquipmentFilters';
import { ZONE, asset, assetResponse, equipmentResponse, systemCandidate, type EquipmentOptions, type TestAsset } from './test-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const LIST = `/api/projects/${PROJECT}/workspace/equipment`;
const TWO: TestAsset[] = [
  { n: 1, tag: 'TEST-AHU-1' },
  { n: 2, tag: 'TEST-FCU-2' },
];
const ANSWERABLE: TestAsset[] = [
  { n: 1, tag: 'TEST-AHU-1', answerable: true },
  { n: 2, tag: 'TEST-FCU-2', answerable: true },
  { n: 3, tag: 'TEST-P-3' },
];

function api(assets: readonly TestAsset[] | Handler = TWO, options: EquipmentOptions = {}, extra: Readonly<Record<string, Handler>> = {}) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1' }])),
    [`GET /api/projects/${PROJECT}/workspace`]: () => json(200, frameResponse(PROJECT)),
    [`GET ${LIST}`]: typeof assets === 'function' ? assets : () => json(200, equipmentResponse(PROJECT, assets, options)),
    ...extra,
  });
}

async function openPage(path = `/projects/${PROJECT}/equipment`) {
  const view = renderAt(path);
  await screen.findByRole('heading', { name: 'Equipment', level: 1 });
  await screen.findByRole('table', { name: 'Equipment' });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  return view;
}

function table() {
  return screen.getByRole('table', { name: 'Equipment' });
}

function rowOf(tag: string) {
  const header = within(table())
    .getAllByRole('rowheader')
    .find((cell) => cell.textContent?.includes(tag) === true);
  const row = header?.closest('tr');
  if (row === null || row === undefined) throw new Error(`no row for ${tag}`);
  return row;
}

function lastRead(seen: readonly Seen[]): URLSearchParams {
  const reads = seen.filter((request) => request.method === 'GET' && request.path === LIST);
  const last = reads.at(-1);
  if (last === undefined) throw new Error('no read of the register');
  return last.url.searchParams;
}

describe('DB-17 · R-065 · R-066 · US-ASSETS-05: the register', () => {
  it('DR-2 (pages half) · App theme "Shell sizes": the page adds no padding of its own inside the workspace frame\'s page column, so the register keeps its width beside the inspector', async () => {
    api();
    await openPage();
    // The page column (the kit's frame) takes the page's one padding from the gutter tokens; the page adds none (DR-2).
    const root = screen.getByRole('heading', { level: 1 }).closest('.sov-page-header')?.parentElement;
    expect(root?.className).not.toMatch(/(^|\s)p[xytblr]?-/u);
    expect(root?.closest('.sov-workspace__page')).not.toBeNull();
  });

  it('US-ASSETS-05 AC1 · AC4 · AC10 · 7.1-r2 · 7.1.1-E5 · D14 · G2-1: tag, system, type, badge column, location, floor and zone, each cell bound to its value id; the badge column holds the type badge bound to the same id; no Status, Last Update or Alarms (Export is built in phase 5: ./EquipmentExport.test.tsx)', async () => {
    api();
    await openPage();
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers.slice(0, 7)).toEqual(['Tag', 'System', 'Type', 'Badge', 'Location', 'Floor', 'Zone']);
    expect(headers.join(' ')).not.toMatch(/Status|Last Update|Alarms|Commissioned/u);
    const row = rowOf('TEST-AHU-1');
    const id = asset(1);
    expect(row.querySelector(`[data-value-id="asset:${id}.tag"]`)?.textContent).toContain('TEST found in TEST schedule.xlsx');
    for (const cell of ['type', 'system', 'location', 'level', 'zone']) expect(row.querySelector(`[data-value-id="asset:${id}.${cell}"]`)?.textContent).toContain('TEST unknown');
    // An Unknown type shows its pill once, in its own cell (DR-6); the badge column's cell holds an empty element bound to the same id.
    expect(row.querySelector(`.sov-value[data-value-id="asset:${id}.type"]`)?.textContent).toBe('TEST unknown');
    const badge = row.querySelector(`.sov-register__badge[data-value-id="asset:${id}.type"]`);
    expect(badge?.textContent).toBe('');
    expect(badge?.getAttribute('aria-hidden')).toBe('true');
    for (const absent of ['Floor Plan', 'View on Floor Plan', 'View in 3D', 'Online', 'Offline', 'BMS Live']) expect(document.body.textContent).not.toContain(absent);
    expect(document.querySelector('canvas, img:not(.sov-logo), .sov-model-area')).toBeNull();
  });

  it('2.5 · ADR 0045 decision 2 · US-ASSETS-03 AC1 · US-ASSETS-05 AC7: the count line reads the served count by type ("Not available yet", bound), and no copy says the list holds all the equipment', async () => {
    api();
    await openPage();
    const count = document.querySelector(`[data-value-id="project:${PROJECT}.register.total"]`);
    expect(count?.textContent).toContain('TEST not available: TEST asset taxonomy');
    expect(screen.getByText('Equipment by type')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/all equipment|Showing/iu);
  });

  it('R-017 reading · ADR 0044 decision 7 · US-ASSETS-05 AC6: the register pages with Previous and Next only, no page number; Next reads page two from the server; nothing is written', async () => {
    const seen = api((request) => json(200, equipmentResponse(PROJECT, TWO, { hasNext: request.url.searchParams.get('page') === null, hasPrevious: request.url.searchParams.get('page') !== null })));
    await openPage();
    const pager = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pager).getAllByRole('button').map((button) => button.textContent)).toEqual(['Next']);
    expect(pager.textContent).not.toMatch(/\d/u);
    fireEvent.click(within(pager).getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(lastRead(seen).get('page')).toBe('2'));
    await waitFor(() => expect(within(screen.getByRole('navigation', { name: 'Pages' })).getAllByRole('button').map((button) => button.textContent)).toEqual(['Previous']));
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Pages' })).getByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(lastRead(seen).get('page')).toBeNull());
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('prompt 3 section 11 (states) · G12-10 (rendered half) · rule 12: no documents says so with "Upload a document"; documents read with no equipment never says "not found"; nothing matching the filters says so', async () => {
    api([], { state: 'no_documents' });
    await openPage();
    expect(within(table()).getByText('No documents were uploaded, so no equipment was read from them.')).toBeTruthy();
    expect(within(table()).getByRole('link', { name: 'Upload a document' }).getAttribute('href')).toBe(`/projects/${PROJECT}/documents?upload=open`);
    cleanup();
    vi.unstubAllGlobals();
    api([], { state: 'none_read' });
    await openPage();
    expect(within(table()).getByText('No equipment has come from your documents yet.')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/not found/iu);
    cleanup();
    vi.unstubAllGlobals();
    api([], { state: 'listed' });
    await openPage();
    expect(within(table()).getByText('No equipment matches these filters.')).toBeTruthy();
  });

  it('prompt 3 section 11 (states): a failed load says so with Try again', async () => {
    let fail = true;
    api(() => (fail ? json(500, { code: 'internal_error' }) : json(200, equipmentResponse(PROJECT, TWO))));
    renderAt(`/projects/${PROJECT}/equipment`);
    await screen.findByText('This page could not be loaded. Nothing you entered is lost.');
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
    fail = false;
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0] as HTMLElement);
    await screen.findByText('TEST-AHU-1');
  });

  it('R-066 "Until decided" · US-ASSETS-05 AC13: Back to System Scope opens System Scope and writes nothing', async () => {
    const seen = api(TWO, {}, { [`GET /api/projects/${PROJECT}/workspace/system-scope`]: () => json(500, { code: 'internal_error' }) });
    const view = await openPage();
    fireEvent.click(screen.getByRole('link', { name: 'Back to System Scope' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/system-scope`));
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });
});

describe('DB-17 · US-ASSETS-05 AC5 · US-ASSETS-11 AC4 · AC5 · UD-26: search and filters', () => {
  it('US-ASSETS-11 AC4 · AC5 · R-066 · DR-5: the filter row offers System, Zone and Badge (no status; the floor is the header\'s filter), never a dialog; a system is sent to the server and shown as an active filter with its remove control; nothing is written', async () => {
    const seen = api(TWO, { zones: true, levels: 'known' });
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const panel = screen.getByRole('group', { name: 'Filter equipment' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(panel).getAllByRole('listbox').map((list) => list.getAttribute('aria-label'))).toEqual(['System', 'Zone', 'Badge']);
    expect(panel.textContent).not.toContain('Floor');
    expect(panel.textContent).not.toMatch(/Status|Online/u);
    fireEvent.click(within(within(panel).getByRole('listbox', { name: 'System' })).getByRole('option', { name: 'Lighting' }));
    await waitFor(() => expect(lastRead(seen).get('system')).toBe('lighting'));
    const active = screen.getByRole('list', { name: 'Active filters' });
    expect(active.textContent).toContain('System');
    expect(active.textContent).toContain('Lighting');
    fireEvent.click(within(active).getByRole('button', { name: 'Remove this filter' }));
    await waitFor(() => expect(lastRead(seen).get('system')).toBeNull());
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('dashboards-spec 2.5 rule 4 · R-066 (Zones\' "View Equipment in Zone"): a zone in the address reads the register filtered by it, and the chip names the zone as written', async () => {
    const seen = api(TWO, { zones: true });
    await openPage(`/projects/${PROJECT}/equipment?zone=${ZONE}`);
    expect(lastRead(seen).get('zone')).toBe(ZONE);
    const active = screen.getByRole('list', { name: 'Active filters' });
    expect(active.textContent).toContain('TEST lobby zone');
  });

  it('G7-14 (rendered on Equipment) · R-077 · DR-5: with no floor structure, the floor filter in the header\'s actions slot says "Not available yet", naming it, with its actions as underlined links (not inside Filters)', async () => {
    api(TWO, { levels: 'unknown' });
    await openPage();
    const notice = screen.getByRole('group', { name: 'Floor' });
    expect(notice.closest('.sov-page-header__actions')).not.toBeNull();
    expect(notice.querySelector(`[data-value-id="project:${PROJECT}.floors.missing"]`)?.textContent).toContain('TEST not available: the floor structure');
    expect(within(notice).getByRole('link', { name: 'Upload a document' }).getAttribute('href')).toBe(`/projects/${PROJECT}/documents?upload=open`);
    expect(within(notice).getByRole('link', { name: 'Enter the floors' }).getAttribute('href')).toBe(`/projects/${PROJECT}/steps/3`);
    for (const link of within(notice).getAllByRole('link')) expect(link.className).toContain('underline');
    expect(screen.queryByRole('button', { name: /^Floor/u })).toBeNull();
  });

  it('G7-16 (web half) · rule 4 · rule 7: while the floor field is in conflict, Equipment\'s floor filter reads the served line, the floors field\'s two readings with their sources, and the action to resolve it; no list', async () => {
    api(TWO, { levels: 'conflict' });
    await openPage();
    const notice = screen.getByRole('group', { name: 'Floor' });
    expect(notice.textContent).toContain('Not available yet: two values for floors');
    const field = notice.querySelector(`.sov-value[data-value-id="building:${BUILDING}.floors"]`);
    expect(field?.textContent).toContain('Two values');
    expect(field?.textContent).toContain('TEST found in TEST memoriu.pdf; TEST found in TEST plan.pdf');
    expect(within(notice).getByRole('link', { name: 'Enter the floors' }).getAttribute('href')).toBe(`/projects/${PROJECT}/steps/3`);
    expect(screen.queryByRole('listbox', { name: 'Floor' })).toBeNull();
  });

  it('R-077 · ADR 0043 decision 6 · DR-5: with known levels, a floor is chosen from the header\'s floor dropdown (labels bound), kept in the shared `level` parameter, sent to the server and shown as an active filter', async () => {
    const seen = api(TWO, { levels: 'known' });
    const view = await openPage();
    fireEvent.click(screen.getByRole('button', { name: /^Floor/u }));
    const floors = screen.getByRole('listbox', { name: 'Floor' });
    expect(within(floors).getAllByRole('option').map((option) => option.textContent)).toEqual(['All floors', 'TEST ground', 'TEST upper one']);
    fireEvent.click(within(floors).getByRole('option', { name: 'TEST upper one' }));
    await waitFor(() => expect(lastRead(seen).get('level')).toBe('upper_1'));
    expect(view.router.state.location.search).toContain('level=upper_1');
    expect(screen.getByRole('button', { name: /^Floor/u }).textContent).toContain('TEST upper one');
    const active = screen.getByRole('list', { name: 'Active filters' });
    expect(active.textContent).toContain('TEST upper one');
    fireEvent.click(within(active).getByRole('button', { name: 'Remove this filter' }));
    await waitFor(() => expect(lastRead(seen).get('level')).toBeNull());
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('R-077 · rule 2: a floor in the address that the level register does not hold is dropped, so no filter hides behind a control that reads "All floors"', async () => {
    const seen = api(TWO, { levels: 'known' });
    const view = await openPage(`/projects/${PROJECT}/equipment?level=upper_9`);
    await waitFor(() => expect(view.router.state.location.search).not.toContain('level='));
    await waitFor(() => expect(lastRead(seen).get('level')).toBeNull());
    expect(screen.getByRole('button', { name: /^Floor/u }).textContent).toContain('All floors');
  });

  it('US-ASSETS-05 AC5: the search is sent a moment after the owner stops typing, and goes back to the first page', async () => {
    const seen = api(TWO, { hasNext: true });
    await openPage(`/projects/${PROJECT}/equipment?page=2`);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search equipment' }), { target: { value: 'ahu' } });
    expect(lastRead(seen).get('search')).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS + 50);
    });
    vi.useRealTimers();
    await waitFor(() => expect(lastRead(seen).get('search')).toBe('ahu'));
    expect(lastRead(seen).get('page')).toBeNull();
  });
});

describe('DB-17 · R-065 · US-ASSETS-04: the owner answers on equipment', () => {
  it('US-ASSETS-04 AC1 · rule 3 · rule 11 · 5.2: where no row offers an answer (no asset value read from a document), no selection is drawn, and nothing confirms, verifies or commands', async () => {
    api(TWO);
    await openPage();
    expect(within(table()).queryAllByRole('checkbox')).toHaveLength(0);
    for (const absent of ['Confirm all', 'Verify', 'Looks right', "Something's wrong"]) expect(document.body.textContent).not.toContain(absent);
  });

  it('G3-3 (web half) · US-ASSETS-04 AC2 · AC5 · R-065 · 7.1.1-C10: "Looks right" on a selection sends one fields.acknowledge with the selected rows\' served candidates, one request per press, aria-busy and never disabled', async () => {
    const held = heldHandler(() => json(200, { displayObjects: [] }));
    const seen = api(ANSWERABLE, {}, { [`POST /api/projects/${PROJECT}/fields/acknowledge`]: held.handler });
    await openPage();
    expect(screen.queryByRole('group', { name: 'Selected equipment' })).toBeNull();
    fireEvent.click(within(rowOf('TEST-AHU-1')).getByRole('checkbox', { name: 'Select this equipment' }));
    fireEvent.click(within(rowOf('TEST-P-3')).getByRole('checkbox', { name: 'Select this equipment' }));
    const bar = screen.getByRole('group', { name: 'Selected equipment' });
    expect(bar.textContent).not.toMatch(/\d/u);
    const looksRight = within(bar).getByRole('button', { name: 'Looks right' });
    pressTwice(looksRight);
    await settle();
    expect(looksRight.getAttribute('aria-busy')).toBe('true');
    expect(looksRight.hasAttribute('disabled')).toBe(false);
    const sent = seen.filter((request) => request.method === 'POST' && request.path.endsWith('/fields/acknowledge'));
    expect(sent.map((request) => request.body)).toEqual([{ candidateIds: [systemCandidate(1)] }]);
    held.answer();
    await screen.findByText('Your answer is saved.');
    expect(screen.queryByRole('group', { name: 'Selected equipment' })).toBeNull();
  });

  it('G3-10 (web half) · US-ASSETS-04 AC3 · R-065: "Something\'s wrong" on a selection sends one fields.concernMany with every selected candidate', async () => {
    const seen = api(ANSWERABLE, {}, { [`POST /api/projects/${PROJECT}/fields/concern-many`]: () => json(200, { displayObjects: [] }) });
    await openPage();
    fireEvent.click(within(table()).getByRole('checkbox', { name: 'Select all equipment on this page' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Selected equipment' })).getByRole('button', { name: "Something's wrong" }));
    await screen.findByText('Your answer is saved.');
    expect(seen.filter((request) => request.method === 'POST' && request.path.endsWith('/fields/concern-many')).map((request) => request.body)).toEqual([
      { candidateIds: [systemCandidate(1), systemCandidate(2)] },
    ]);
    expect(sentTo(seen, 'POST', '/fields/acknowledge')).toBe(0);
  });

  it('A-6 · WCAG 2.4.3 · prompt 3 section 11 (keyboard): after "Something\'s wrong" on a selection, the focus moves to the first selected row\'s checkbox, never to the page body', async () => {
    api(ANSWERABLE, {}, { [`POST /api/projects/${PROJECT}/fields/concern-many`]: () => json(200, { displayObjects: [] }) });
    await openPage();
    fireEvent.click(within(rowOf('TEST-FCU-2')).getByRole('checkbox', { name: 'Select this equipment' }));
    fireEvent.click(within(rowOf('TEST-AHU-1')).getByRole('checkbox', { name: 'Select this equipment' }));
    const concern = within(screen.getByRole('group', { name: 'Selected equipment' })).getByRole('button', { name: "Something's wrong" });
    concern.focus();
    fireEvent.click(concern);
    await screen.findByText('Your answer is saved.');
    // The first selected row in the register's order, whichever was ticked first.
    await waitFor(() => expect(document.activeElement).toBe(within(rowOf('TEST-AHU-1')).getByRole('checkbox', { name: 'Select this equipment' })));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('A-6 · WCAG 2.4.3: after "Looks right", when the rows no longer carry an answer (no checkbox is left), the focus moves to the saved message, which takes it', async () => {
    let answered = false;
    api(() => json(200, equipmentResponse(PROJECT, answered ? TWO : ANSWERABLE)), {}, {
      [`POST /api/projects/${PROJECT}/fields/acknowledge`]: () => {
        answered = true;
        return json(200, { displayObjects: [] });
      },
    });
    await openPage();
    fireEvent.click(within(rowOf('TEST-AHU-1')).getByRole('checkbox', { name: 'Select this equipment' }));
    const looksRight = within(screen.getByRole('group', { name: 'Selected equipment' })).getByRole('button', { name: 'Looks right' });
    looksRight.focus();
    fireEvent.click(looksRight);
    const saved = await screen.findByText('Your answer is saved.');
    await waitFor(() => expect(within(table()).queryAllByRole('checkbox')).toHaveLength(0));
    await waitFor(() => expect(document.activeElement).toBe(saved));
    expect(saved.getAttribute('tabindex')).toBe('-1');
    expect(saved.getAttribute('role')).toBe('status');
  });

  it('A-6 · WCAG 2.4.3: "Clear the selection" moves the focus to the first selected row\'s checkbox, now unticked, and writes nothing', async () => {
    const seen = api(ANSWERABLE);
    await openPage();
    fireEvent.click(within(rowOf('TEST-P-3')).getByRole('checkbox', { name: 'Select this equipment' }));
    fireEvent.click(within(rowOf('TEST-FCU-2')).getByRole('checkbox', { name: 'Select this equipment' }));
    const clear = within(screen.getByRole('group', { name: 'Selected equipment' })).getByRole('button', { name: 'Clear the selection' });
    clear.focus();
    fireEvent.click(clear);
    expect(screen.queryByRole('group', { name: 'Selected equipment' })).toBeNull();
    const checkbox = within(rowOf('TEST-FCU-2')).getByRole('checkbox', { name: 'Select this equipment' });
    await waitFor(() => expect(document.activeElement).toBe(checkbox));
    expect(checkbox).toHaveProperty('checked', false);
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });
});

describe('DB-17 · UD-26 · US-ASSETS-06 · US-ASSETS-11: the inspector', () => {
  it('US-ASSETS-06 AC1 · AC5 · AC7 · AC9 · US-ASSETS-11 AC1 · AC3 · R-067: a row opens the inspector, not a dialog: Overview, Points and Documents tabs (no Alarms), the values bound, points "Not available yet", the documents with status, stage and version, and the full record link', async () => {
    const seen = api(TWO, {}, { [`GET ${LIST}/${asset(1)}`]: () => json(200, assetResponse(PROJECT, TWO[0] as TestAsset)) });
    await openPage();
    fireEvent.click(within(rowOf('TEST-AHU-1')).getByRole('button', { name: 'Show details' }));
    const inspector = await screen.findByRole('region', { name: 'Equipment details' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(rowOf('TEST-AHU-1').getAttribute('aria-current')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(within(inspector).getByRole('button', { name: 'Close' })));
    const tabs = await within(inspector).findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Overview', 'Points', 'Documents']);
    expect(inspector.textContent).not.toMatch(/Alarms|Status|Last Update|Commissioned|View on Floor Plan|View in 3D/u);
    for (const label of ['Type', 'System', 'Location', 'Floor', 'Zone']) expect(within(inspector).getByText(label)).toBeTruthy();
    fireEvent.click(within(inspector).getByRole('tab', { name: 'Points' }));
    expect(inspector.querySelector(`[data-value-id="asset:${asset(1)}.points"]`)?.textContent).toContain('TEST not available: TEST point templates');
    fireEvent.click(within(inspector).getByRole('tab', { name: 'Documents' }));
    const documents = within(inspector).getByRole('list', { name: 'Documents that show this equipment' });
    expect(documents.textContent).toContain('TEST schedule.xlsx');
    expect(documents.textContent).toContain('TEST read, sheets one to two');
    expect(within(inspector).getByRole('link', { name: 'Open the full record' }).getAttribute('href')).toBe(`/projects/${PROJECT}/equipment/${asset(1)}`);
    expect(within(rowOf('TEST-AHU-1')).getByRole('link', { name: 'Open the full record' }).getAttribute('href')).toBe(`/projects/${PROJECT}/equipment/${asset(1)}`);
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('G3-3 · rule 3 · US-ASSETS-06: "Looks right" on one value in the inspector sends fields.acknowledge for its served candidate only; no Edit is drawn', async () => {
    const seen = api(ANSWERABLE, {}, {
      [`GET ${LIST}/${asset(1)}`]: () => json(200, assetResponse(PROJECT, ANSWERABLE[0] as TestAsset)),
      [`POST /api/projects/${PROJECT}/fields/acknowledge`]: () => json(200, { displayObjects: [] }),
    });
    await openPage();
    fireEvent.click(within(rowOf('TEST-AHU-1')).getByRole('button', { name: 'Show details' }));
    const inspector = await screen.findByRole('region', { name: 'Equipment details' });
    const looksRight = await within(inspector).findByRole('button', { name: 'Looks right' });
    expect(within(inspector).queryByRole('button', { name: 'Edit' })).toBeNull();
    fireEvent.click(looksRight);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/acknowledge')).toBe(1));
    expect(seen.find((request) => request.path.endsWith('/fields/acknowledge'))?.body).toEqual({ candidateIds: [systemCandidate(1)] });
  });

  it.each(['101', '1.2'])('A-1 · rule 7 · rule 2: a tag written only in digits ("%s") shows in its row and under the inspector\'s heading with its badge, bound, and the page does not throw', async (written) => {
    const digits: TestAsset = { n: 1, tag: written };
    api([digits], {}, { [`GET ${LIST}/${asset(1)}`]: () => json(200, assetResponse(PROJECT, digits)) });
    await openPage();
    fireEvent.click(within(rowOf(written)).getByRole('button', { name: 'Show details' }));
    const inspector = await screen.findByRole('region', { name: 'Equipment details' });
    await within(inspector).findAllByRole('tab');
    const heading = inspector.querySelector(`.sov-inspector__subheading [data-value-id="asset:${asset(1)}.tag"]`);
    expect(heading?.textContent).toContain(written);
    expect(heading?.textContent).toContain('TEST document badge');
    expect(screen.getByRole('navigation', { name: 'Project pages' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Unexpected Application Error/u);
  });
});
