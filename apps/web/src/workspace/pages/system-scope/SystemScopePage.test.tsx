import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROJECT, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler, type Seen } from '../../../test/harness';
import { BUILDING, frameResponse } from '../../test-views';
import { decisionCandidate, emptyEquipmentResponse, frameWithLevels, systemScopeResponse, type ScopeOptions } from './test-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SCOPE_PATH = `/api/projects/${PROJECT}/workspace/system-scope`;
const DECIDE_PATH = `${SCOPE_PATH}/decisions`;

function api(view: ScopeOptions | Handler = {}, extra: Readonly<Record<string, Handler>> = {}) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1' }])),
    [`GET /api/projects/${PROJECT}/workspace`]: () => json(200, frameResponse(PROJECT)),
    [`GET ${SCOPE_PATH}`]: typeof view === 'function' ? view : () => json(200, systemScopeResponse(PROJECT, view)),
    [`GET /api/projects/${PROJECT}/workspace/equipment`]: () => json(200, emptyEquipmentResponse(PROJECT)),
    ...extra,
  });
}

async function openPage(path = `/projects/${PROJECT}/system-scope`) {
  const view = renderAt(path);
  await screen.findByRole('heading', { name: 'System Scope', level: 1 });
  await screen.findByRole('table', { name: 'Building systems and whether each is in scope' });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  return view;
}

function table() {
  return screen.getByRole('table', { name: 'Building systems and whether each is in scope' });
}

function rowOf(system: string) {
  const header = within(table())
    .getAllByRole('rowheader')
    .find((cell) => cell.textContent?.startsWith(system) === true);
  const row = header?.closest('tr');
  if (row === null || row === undefined) throw new Error(`no row for ${system}`);
  return row;
}

function decisionsSent(seen: readonly Seen[]) {
  return seen.filter((request) => request.method === 'POST' && request.path === DECIDE_PATH).map((request) => request.body);
}

describe('DB-16 · R-052 · US-SCOPE-05: the eight systems with their recorded decisions', () => {
  it('DR-2 (pages half) · App theme "Shell sizes": the page adds no padding of its own inside the workspace frame\'s page column, so the register keeps its width beside the inspector', async () => {
    api({ decisions: { hvac: 'include' } });
    await openPage();
    // The page column (the kit's frame) takes the page's one padding from the gutter tokens; the page adds none (DR-2).
    const root = screen.getByRole('heading', { level: 1 }).closest('.sov-page-header')?.parentElement;
    expect(root?.className).not.toMatch(/(^|\s)p[xytblr]?-/u);
    expect(root?.closest('.sov-workspace__page')).not.toBeNull();
  });

  it('US-SCOPE-05 AC1 · AC5 · AC9 · R-055 · 7.1.1-C1 · 7.1.1-C4 · G2-7 (rendered half): the eight catalogue systems, each decision bound to its value id with its badge, a switch from the recorded decision, the equipment line as served, and no Coverage column', async () => {
    api({ decisions: { hvac: 'include', lighting: 'exclude' } });
    await openPage();
    const headers = within(table())
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers.slice(0, 3)).toEqual(['System', 'Equipment', 'In Scope']);
    expect(headers.join(' ')).not.toMatch(/Coverage|From Topology|Points/u);
    const names = within(table())
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent?.split('Monitoring')[0]);
    expect(names).toEqual(['HVAC', 'Lighting', 'Energy', 'Access Control', 'Fire Safety', 'Water', 'Elevators', 'CCTV']);
    expect(document.body.textContent).not.toMatch(/Guest Room|Parking|Kitchen|Other \(Custom\)|Planned/u);
    const hvac = rowOf('HVAC');
    expect(within(hvac).getByRole('switch', { name: 'Include HVAC in the scope' })).toHaveProperty('checked', true);
    const decision = hvac.querySelector(`[data-value-id="project:${PROJECT}.scope.hvac"]`);
    expect(decision?.textContent).toContain('TEST included');
    expect(decision?.textContent).toContain('TEST provided badge');
    expect(within(rowOf('Lighting')).getByRole('switch', { name: 'Include Lighting in the scope' })).toHaveProperty('checked', false);
    expect(hvac.querySelector(`[data-value-id="project:${PROJECT}.register.hvac"]`)?.textContent).toContain('TEST not available: TEST asset taxonomy');
    // The decision's served Edit is not drawn: the switch is the scope editor here (R-052; never fields.edit).
    expect(within(hvac).queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('US-SCOPE-05 AC4 · R-052 "never drawn as off or excluded": a system with no recorded decision reads Not provided yet, draws no switch, and offers Include and Leave out', async () => {
    api({ decisions: { hvac: 'none', energy: 'skipped' } });
    await openPage();
    for (const system of ['HVAC', 'Energy']) {
      const row = rowOf(system);
      expect(within(row).queryByRole('switch')).toBeNull();
      expect(row.textContent).toContain('TEST not provided');
      expect(within(row).getByRole('button', { name: `Include ${system}` }).textContent).toBe('Include');
      expect(within(row).getByRole('button', { name: `Leave out ${system}` }).textContent).toBe('Leave out');
    }
  });

  it('R-054 · R-058 · R-074 · UD-31 (not built) · US-SCOPE-10 AC1 · owner answer 2026-10-02: no canvas, model area or 3D / 2D / Section control, no Controllers, Network or Integrations, no Edit Scope, no live element, no dialog', async () => {
    api({ decisions: { hvac: 'include' } });
    await openPage();
    expect(document.querySelector('canvas, .sov-model-area')).toBeNull();
    for (const word of ['3D', '2D', 'Section', 'Controllers', 'Network', 'Integration', 'Edit Scope', 'Coverage', 'BMS Live', 'Last sync']) {
      expect(document.body.textContent).not.toContain(word);
    }
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('DB-16 · R-052 · US-SCOPE-06: changing the scope', () => {
  it('US-SCOPE-06 AC1 · G4-40 (page half) · 7.1.1-C8: a switch press sends one System Scope decision naming the candidate the screen showed, never fields.edit, then the page reads its view again', async () => {
    let decisions: ScopeOptions['decisions'] = { hvac: 'include' };
    const seen = api(() => json(200, systemScopeResponse(PROJECT, { decisions })), {
      [`POST ${DECIDE_PATH}`]: () => {
        decisions = { hvac: 'exclude' };
        return json(200, systemScopeResponse(PROJECT, { decisions }));
      },
    });
    await openPage();
    const reads = sentTo(seen, 'GET', '/workspace/system-scope');
    fireEvent.click(within(rowOf('HVAC')).getByRole('switch', { name: 'Include HVAC in the scope' }));
    await waitFor(() => expect(within(rowOf('HVAC')).getByRole('switch')).toHaveProperty('checked', false));
    expect(decisionsSent(seen)).toEqual([
      { decisions: [{ field: { subjectId: PROJECT, fieldKey: 'project.scope.hvac' }, choice: 'exclude', corrects: [decisionCandidate(0)] }], visibleSuggestions: [] },
    ]);
    expect(sentTo(seen, 'POST', '/fields/edit')).toBe(0);
    expect(sentTo(seen, 'GET', '/workspace/system-scope')).toBe(reads + 1);
    expect(rowOf('HVAC').textContent).toContain('TEST not included');
  });

  it('US-SCOPE-05 AC4 · G4-38 (web half): Include on an undecided system names no shown value (the screen showed none)', async () => {
    const seen = api({}, { [`POST ${DECIDE_PATH}`]: () => json(200, systemScopeResponse(PROJECT, { decisions: { water: 'include' } })) });
    await openPage();
    fireEvent.click(within(rowOf('Water')).getByRole('button', { name: 'Include Water' }));
    await settle();
    expect(decisionsSent(seen)).toEqual([{ decisions: [{ field: { subjectId: PROJECT, fieldKey: 'project.scope.water' }, choice: 'include', corrects: [] }], visibleSuggestions: [] }]);
  });

  it('ADR 0039 decision 11 · rule 7: two presses before React renders again send one request; while it is on its way every scope control says aria-busy and none is disabled', async () => {
    const held = heldHandler(() => json(200, systemScopeResponse(PROJECT, { decisions: { hvac: 'exclude' } })));
    const seen = api({ decisions: { hvac: 'include' } }, { [`POST ${DECIDE_PATH}`]: held.handler });
    await openPage();
    const hvac = within(rowOf('HVAC')).getByRole('switch');
    pressTwice(hvac);
    await settle();
    expect(decisionsSent(seen)).toHaveLength(1);
    expect(hvac.getAttribute('aria-busy')).toBe('true');
    expect(hvac.hasAttribute('disabled')).toBe(false);
    const include = within(rowOf('Water')).getByRole('button', { name: 'Include Water' });
    expect(include.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(include);
    await settle();
    expect(decisionsSent(seen)).toHaveLength(1);
    const save = screen.getByRole('button', { name: 'Save and Continue' });
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.hasAttribute('disabled')).toBe(false);
    held.answer();
    await waitFor(() => expect(within(rowOf('HVAC')).getByRole('switch').getAttribute('aria-busy')).toBeNull());
  });

  it('G4-36 · rule 4: a decision refused because the value changed meanwhile reads the page again and says so; owner_only says who may change it', async () => {
    let refusal = 'shown_value_changed';
    const seen = api({ decisions: { hvac: 'include' } }, { [`POST ${DECIDE_PATH}`]: () => json(refusal === 'owner_only' ? 403 : 409, { code: refusal }) });
    await openPage();
    const reads = sentTo(seen, 'GET', '/workspace/system-scope');
    fireEvent.click(within(rowOf('HVAC')).getByRole('switch'));
    await screen.findByText('This value changed since the page showed it. The page shows it again now.');
    await waitFor(() => expect(sentTo(seen, 'GET', '/workspace/system-scope')).toBe(reads + 1));
    expect(within(rowOf('HVAC')).getByRole('switch')).toHaveProperty('checked', true);
    refusal = 'owner_only';
    fireEvent.click(within(rowOf('HVAC')).getByRole('switch'));
    await screen.findByText("Only the project's owner can change this answer.");
  });

  it('G3-20 (page half) · rule 3 · US-SCOPE-06 AC10 · AC11 · R-052: a Suggested system shows its reason and an on switch; Save and Continue reports each visible suggestion left in place, then opens Zones', async () => {
    const seen = api({ decisions: { hvac: 'suggested', lighting: 'suggested', energy: 'include' } }, { [`POST ${DECIDE_PATH}`]: () => json(200, systemScopeResponse(PROJECT, {})) });
    const view = await openPage();
    const hvac = rowOf('HVAC');
    expect(within(hvac).getByRole('switch')).toHaveProperty('checked', true);
    expect(hvac.textContent).toContain('TEST suggested badge');
    expect(hvac.textContent).toContain('TEST suggested because a TEST document names hvac');
    pressTwice(screen.getByRole('button', { name: 'Save and Continue' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/zones`));
    expect(decisionsSent(seen)).toEqual([
      {
        decisions: [],
        visibleSuggestions: [
          { field: { subjectId: PROJECT, fieldKey: 'project.scope.hvac' }, choice: 'include' },
          { field: { subjectId: PROJECT, fieldKey: 'project.scope.lighting' }, choice: 'include' },
        ],
      },
    ]);
  });

  it('US-SCOPE-06 AC5 · 7.1.1-C8 · rule 7: Save and Continue with every decision recorded and nothing suggested writes nothing and opens Zones', async () => {
    const seen = api({ decisions: { hvac: 'include', lighting: 'exclude' } });
    const view = await openPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/zones`));
    expect(decisionsSent(seen)).toEqual([]);
  });

  it('R-052 "Until decided" · US-SCOPE-05 AC12: Back to Topology opens Topology and writes nothing', async () => {
    const seen = api({ decisions: { hvac: 'include' } });
    const view = await openPage();
    fireEvent.click(screen.getByRole('link', { name: 'Back to Topology' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/topology`));
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });
});

describe('DB-16 · US-SCOPE-05 AC11 · V-10: the system filter', () => {
  it('V-10 · US-SCOPE-05 AC11 · rule 3 · prompt 3 section 11: "All systems" and the eight catalogue systems; choosing one shows only its row, the detail panel follows it, `?system=` is left alone, and nothing is written', async () => {
    const seen = api({ decisions: { hvac: 'include', lighting: 'exclude' } });
    const view = await openPage();
    fireEvent.click(screen.getByRole('button', { name: /^System/u }));
    const list = screen.getByRole('listbox', { name: 'System' });
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual(['All systems', 'HVAC', 'Lighting', 'Energy', 'Access Control', 'Fire Safety', 'Water', 'Elevators', 'CCTV']);
    fireEvent.click(within(list).getByRole('option', { name: 'Lighting' }));
    const names = within(table())
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent);
    expect(names).toEqual(['Lighting']);
    expect(screen.getByRole('button', { name: /^System/u }).textContent).toContain('Lighting');
    expect(screen.getByRole('region', { name: 'Lighting' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'HVAC' })).toBeNull();
    expect(view.router.state.location.search).not.toContain('system=');
    fireEvent.click(screen.getByRole('button', { name: /^System/u }));
    fireEvent.click(within(screen.getByRole('listbox', { name: 'System' })).getByRole('option', { name: 'All systems' }));
    expect(within(table()).getAllByRole('rowheader')).toHaveLength(8);
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('G3-22 (page half) · rule 3 "Nothing hidden, collapsed or on another step is accepted this way": with the filter on Lighting, Save and Continue reports only the Suggested row it shows; HVAC\'s hidden suggestion is not reported', async () => {
    const seen = api({ decisions: { hvac: 'suggested', lighting: 'suggested' } }, { [`POST ${DECIDE_PATH}`]: () => json(200, systemScopeResponse(PROJECT, {})) });
    const view = await openPage();
    fireEvent.click(screen.getByRole('button', { name: /^System/u }));
    fireEvent.click(within(screen.getByRole('listbox', { name: 'System' })).getByRole('option', { name: 'Lighting' }));
    expect(within(table()).queryByText('HVAC')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/zones`));
    expect(decisionsSent(seen)).toEqual([{ decisions: [], visibleSuggestions: [{ field: { subjectId: PROJECT, fieldKey: 'project.scope.lighting' }, choice: 'include' }] }]);
  });

  it('G3-22 (page half) · rule 3: with the filter on a system that shows no suggestion, Save and Continue writes nothing at all and opens Zones', async () => {
    const seen = api({ decisions: { hvac: 'suggested', energy: 'include' } });
    const view = await openPage(`/projects/${PROJECT}/system-scope?system=hvac`);
    expect(screen.getByRole('region', { name: 'HVAC' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^System/u }));
    fireEvent.click(within(screen.getByRole('listbox', { name: 'System' })).getByRole('option', { name: 'Energy' }));
    // The panel the link opened follows the filter: a hidden row's decision is not left on screen beside it.
    expect(screen.queryByRole('region', { name: 'HVAC' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Energy' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/zones`));
    expect(decisionsSent(seen)).toEqual([]);
  });
});

describe('DB-16 · rule 11: Fire Safety', () => {
  it('G11-10 (page half) · rule 11 · section 5 step 4 · US-SCOPE-03 AC1 · 7.1.1-L1: Fire Safety reads the monitoring-only text; a suggestion served for it is never drawn as on or Suggested, and Save and Continue never reports it', async () => {
    const seen = api({ brokenFireSuggestion: true, decisions: { hvac: 'suggested' } }, { [`POST ${DECIDE_PATH}`]: () => json(200, systemScopeResponse(PROJECT, {})) });
    const view = await openPage();
    const fire = rowOf('Fire Safety');
    expect(fire.textContent).toContain('Monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system.');
    expect(within(fire).queryByRole('switch')).toBeNull();
    expect(within(fire).getByRole('button', { name: 'Include Fire Safety' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save and Continue' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/zones`));
    const sent = decisionsSent(seen) as Array<{ visibleSuggestions: Array<{ field: { fieldKey: string } }> }>;
    expect(sent.flatMap((body) => body.visibleSuggestions.map((entry) => entry.field.fieldKey))).toEqual(['project.scope.hvac']);
  });

  it('rule 11 · R-051 (opt-in): the owner may include Fire Safety by their own press, and the switch is then drawn from the recorded decision', async () => {
    api({ decisions: { fire_safety: 'include' } });
    await openPage();
    const fire = rowOf('Fire Safety');
    expect(within(fire).getByRole('switch', { name: 'Include Fire Safety in the scope' })).toHaveProperty('checked', true);
    expect(fire.textContent).toContain('TEST provided badge');
  });
});

describe('DB-16 · US-SCOPE-07: the detail panel', () => {
  it('US-SCOPE-07 AC1 · AC5 · AC6 · AC7 · R-053 · R-058: the first system shows in the panel; a row opens its own; the panel shows the description, the decision, floors, equipment, zones and points as served, with Overview, Equipment and Zones tabs only', async () => {
    api({ decisions: { hvac: 'include' } });
    await openPage();
    expect(document.querySelector('[data-system-detail="hvac"]')).not.toBeNull();
    fireEvent.click(within(rowOf('Fire Safety')).getByRole('button', { name: 'Show details' }));
    const panel = await screen.findByRole('region', { name: 'Fire Safety' });
    expect(document.activeElement).toBe(within(panel).getByRole('button', { name: 'Close' }));
    expect(rowOf('Fire Safety').getAttribute('aria-current')).toBe('true');
    expect(within(panel).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Overview', 'Equipment', 'Zones']);
    expect(panel.textContent).toContain('Monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system.');
    for (const label of ['In Scope', 'Floors', 'Equipment', 'Zones', 'Points']) expect(within(panel).getAllByText(label).length).toBeGreaterThan(0);
    expect(panel.querySelector(`[data-value-id="project:${PROJECT}.points.fire_safety"]`)?.textContent).toContain('TEST not available: TEST point templates');
    expect(panel.querySelector(`[data-value-id="project:${PROJECT}.levels.fire_safety"]`)?.textContent).toContain('TEST unknown');
    expect(panel.textContent).not.toMatch(/Coverage|Controllers|Network|devices in topology/u);
  });

  it('US-SCOPE-07 AC9 · R-066: the Equipment tab lists the register for the system (here none, said truthfully) and links to Equipment filtered by the system; nothing is written', async () => {
    const seen = api({ decisions: { hvac: 'include' } });
    await openPage();
    const panel = screen.getByRole('region', { name: 'HVAC' });
    fireEvent.click(within(panel).getByRole('tab', { name: 'Equipment' }));
    await within(panel).findByText('No documents were uploaded, so no equipment was read from them.');
    const read = seen.find((request) => request.path.endsWith('/workspace/equipment'));
    expect(read?.url.searchParams.get('system')).toBe('hvac');
    expect(within(panel).getByRole('link', { name: 'View the equipment' }).getAttribute('href')).toBe(`/projects/${PROJECT}/equipment?system=hvac`);
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('R-071 · US-TOPO-01 · US-SCOPE-07 AC1: a link naming a system (Topology\'s "View in System Scope", `?system=`) opens that system\'s panel; an unknown system falls back to the first', async () => {
    api({ decisions: { hvac: 'include', lighting: 'include' } });
    await openPage(`/projects/${PROJECT}/system-scope?system=lighting`);
    expect(screen.getByRole('region', { name: 'Lighting' })).not.toBeNull();
    expect(rowOf('Lighting').getAttribute('aria-current')).toBe('true');
    expect(document.querySelector('[data-system-detail="hvac"]')).toBeNull();
    cleanup();
    api({ decisions: { hvac: 'include' } });
    await openPage(`/projects/${PROJECT}/system-scope?system=not_a_system`);
    expect(screen.getByRole('region', { name: 'HVAC' })).not.toBeNull();
  });

  it('US-SCOPE-07 · keyboard: closing the panel returns the focus to the row, and no row is then current', async () => {
    api({ decisions: { hvac: 'include' } });
    await openPage();
    fireEvent.click(within(screen.getByRole('region', { name: 'HVAC' })).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: 'HVAC' })).toBeNull();
    await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Show details'));
    expect(rowOf('HVAC').getAttribute('aria-current')).toBeNull();
  });
});

describe('DB-16 · R-077: the shared floor selection', () => {
  const FRAME = `GET /api/projects/${PROJECT}/workspace`;

  it('G7-14 (rendered on System Scope) · R-077 · rule 7 · DR-5: with no floor structure, the floor filter in the header\'s actions slot says "Not available yet", naming it, with its actions as underlined links, before the system filter; no menu to open, no dialog', async () => {
    api({});
    await openPage();
    expect(screen.queryByRole('button', { name: /^Floor/u })).toBeNull();
    const notice = screen.getByRole('group', { name: 'Floor' });
    expect(notice.textContent).toContain('TEST not available: the floor structure');
    expect(within(notice).getByRole('link', { name: 'Upload a document' }).getAttribute('href')).toBe(`/projects/${PROJECT}/documents?upload=open`);
    expect(within(notice).getByRole('link', { name: 'Enter the floors' }).getAttribute('href')).toBe(`/projects/${PROJECT}/steps/3`);
    for (const link of within(notice).getAllByRole('link')) expect(link.className).toContain('underline');
    const slot = notice.closest('.sov-page-header__actions');
    expect(slot).not.toBeNull();
    const system = screen.getByRole('button', { name: /^System/u });
    expect(slot?.contains(system)).toBe(true);
    expect(notice.compareDocumentPosition(system) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('G7-16 (web half) · rule 4 · rule 7: while the floor field is in conflict, System Scope\'s floor filter reads the served line, the floors field\'s two readings with their sources, and the action to resolve it; no list', async () => {
    api({}, { [FRAME]: () => json(200, frameWithLevels(PROJECT, 'conflict')) });
    await openPage();
    const notice = screen.getByRole('group', { name: 'Floor' });
    expect(notice.textContent).toContain('Not available yet: two values for floors');
    const field = notice.querySelector(`.sov-value[data-value-id="building:${BUILDING}.floors"]`);
    expect(field?.textContent).toContain('Two values');
    expect(field?.textContent).toContain('TEST found in TEST memoriu.pdf; TEST found in TEST plan.pdf');
    expect(within(notice).getByRole('link', { name: 'Enter the floors' }).getAttribute('href')).toBe(`/projects/${PROJECT}/steps/3`);
    expect(screen.queryByRole('listbox', { name: 'Floor' })).toBeNull();
  });

  it('R-077 · ADR 0043 decision 6 · DR-5: with known levels, the header holds the floor dropdown, then the system dropdown; a floor chosen is kept in the shared `level` parameter and nothing is written', async () => {
    const seen = api({ decisions: { hvac: 'include' } }, { [FRAME]: () => json(200, frameWithLevels(PROJECT, 'known')) });
    const view = await openPage();
    const slot = document.querySelector<HTMLElement>('.sov-page-header__actions');
    if (slot === null) throw new Error('no actions slot');
    expect(within(slot).getAllByRole('button').map((button) => button.textContent)).toEqual(['FloorAll floors', 'SystemAll systems']);
    fireEvent.click(within(slot).getByRole('button', { name: /^Floor/u }));
    const floors = screen.getByRole('listbox', { name: 'Floor' });
    expect(within(floors).getAllByRole('option').map((option) => option.textContent)).toEqual(['All floors', 'P', 'E1']);
    fireEvent.click(within(floors).getByRole('option', { name: 'E1' }));
    await waitFor(() => expect(view.router.state.location.search).toContain('level=upper_1'));
    await waitFor(() => expect(seen.some((request) => request.path === SCOPE_PATH && request.url.searchParams.get('level') === 'upper_1')).toBe(true));
    expect(within(slot).getByRole('button', { name: /^Floor/u }).textContent).toContain('E1');
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('prompt 3 section 11 (states): a failed load says so with Try again, and the page reads it again', async () => {
    let fail = true;
    api(() => (fail ? json(500, { code: 'internal_error' }) : json(200, systemScopeResponse(PROJECT, { decisions: { hvac: 'include' } }))));
    renderAt(`/projects/${PROJECT}/system-scope`);
    await screen.findByText('This page could not be loaded. Nothing you entered is lost.');
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
    fail = false;
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0] as HTMLElement);
    await screen.findByRole('table', { name: 'Building systems and whether each is in scope' });
  });
});
