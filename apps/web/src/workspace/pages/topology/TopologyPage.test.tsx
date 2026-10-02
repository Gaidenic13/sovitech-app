import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROJECT, installFakeApi, json, projectList, renderAt, type Handler, type Seen } from '../../../test/harness';
import { BUILDING, frameResponse } from '../../test-views';
import { ROUTED_TO_SOVITECH, topologyResponse, type TopologyOptions } from './test-topology';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const MONITORING_ONLY = 'Monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system.';
const MONITORING_LINK = 'Monitoring direction only: the BMS reads status and alarms';

function api(options: TopologyOptions | Handler = {}, extra: Readonly<Record<string, Handler>> = {}): Seen[] {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1' }])),
    [`GET /api/projects/${PROJECT}/workspace`]: () => json(200, frameResponse(PROJECT)),
    [`GET /api/projects/${PROJECT}/workspace/topology`]: typeof options === 'function' ? options : (request) => json(200, topologyResponse(PROJECT, { ...options, ...levelOf(request) })),
    ...extra,
  });
}

/** The floor selection a request asked for, so the TEST view names it as the API would. */
function levelOf(request: Seen): { readonly level?: string } {
  const level = request.url.searchParams.get('level');
  return level === null ? {} : { level };
}

async function openPage(path = `/projects/${PROJECT}/topology`) {
  const view = renderAt(path);
  await screen.findByRole('heading', { name: 'Topology', level: 1 });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  return view;
}

function main(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-topology]');
  if (element === null) throw new Error('no Logical view');
  return element;
}

function group(systemId: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-topology-group="${systemId}"]`);
  if (element === null) throw new Error(`no group ${systemId}`);
  return element;
}

const HVAC_AND_FIRE: TopologyOptions = {
  groups: [{ systemId: 'hvac' }, { systemId: 'fire_safety', monitoringOnly: true }],
};

describe('DB-08 · R-071: Topology, its Logical view of the registers', () => {
  it('DR-2 (pages half) · App theme "Shell sizes": the page adds no padding of its own inside the workspace frame\'s page column, so the register keeps its width beside the inspector', async () => {
    api(HVAC_AND_FIRE);
    await openPage();
    // The page column (the kit's frame) takes the page's one padding from the gutter tokens; the page adds none (DR-2).
    const root = screen.getByRole('heading', { level: 1 }).closest('.sov-page-header')?.parentElement;
    expect(root?.className).not.toMatch(/(^|\s)p[xytblr]?-/u);
    expect(root?.closest('.sov-workspace__page')).not.toBeNull();
  });

  it('US-TOPO-01 AC5 · US-TOPO-04 AC1 · US-TOPO-06 AC7 · R-071 · G1-27 (rendered half): the design levels read the served "Not available yet" line; no controller, automation station, server, network, bus or protocol is drawn, and nothing is labelled "proposed design"', async () => {
    api(HVAC_AND_FIRE);
    await openPage();
    const design = screen.getByRole('region', {
      name: 'Controllers, networks and integrations',
    });
    const line = design.querySelector(`[data-value-id="project:${PROJECT}.topology.design"]`);
    expect(line?.textContent).toBe("Not available yet: SOVITECH's design of the controllers, networks and integrations");
    // The band holds the line and nothing else: no box, link or list inside it.
    expect(within(design).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(design).queryAllByRole('link')).toHaveLength(0);
    const text = main().textContent;
    // No protocol, maker, station, server, client, bus or data flow (product names are G1-3's and the company-figures check's).
    expect(text).not.toMatch(/BACnet|Modbus|KNX|DALI|OPC|HTTPS|LonWorks|M-Bus|SAUTER|automation station|server|client|bus\b|data flow/iu);
    expect(document.body.textContent).not.toMatch(/proposed design/iu);
  });

  it('US-TOPO-01 AC1 · G2-7: one group per included system, under its catalogue name, each showing its decision display bound with its badge and source line, as System Scope serves it; no Edit (System Scope is the only scope editor)', async () => {
    api(HVAC_AND_FIRE);
    await openPage();
    const groups = within(main()).getAllByRole('article');
    expect(groups.map((element) => within(element).getByRole('heading', { level: 3 }).textContent)).toEqual(['HVAC', 'Fire Safety']);
    const decision = group('hvac').querySelector(`[data-value-id="project:${PROJECT}.scope.hvac"]`);
    expect(decision?.textContent).toContain('TEST included');
    expect(decision?.textContent).toContain('Provided by you');
    expect(decision?.textContent).toContain('TEST chosen on System Scope');
    expect(within(main()).queryByRole('button', { name: /Edit/u })).toBeNull();
    expect(within(main()).queryAllByRole('switch')).toHaveLength(0);
  });

  it('US-TOPO-01 AC2 · ADR 0045 decision 2: each group\'s equipment is the served register line, "Not available yet" naming the asset taxonomy, never a count, zero or empty group', async () => {
    api(HVAC_AND_FIRE);
    await openPage();
    const equipment = group('hvac').querySelector(`[data-value-id="project:${PROJECT}.register.hvac"]`);
    expect(equipment?.textContent).toBe('Not available yet: SOVITECH asset taxonomy');
    expect(main().textContent).not.toMatch(/\d/u);
  });

  it("US-TOPO-05 AC1 · AC3 · AC8 · R-072 · rule 11 · G11-11 (rendered half): Fire Safety is its own group with the catalogue's monitoring-only text and one link in the monitoring direction only; no other group draws a link; the fire group offers only a view link", async () => {
    api(HVAC_AND_FIRE);
    await openPage();
    const fire = group('fire_safety');
    expect(fire.getAttribute('data-monitoring-only')).toBe('true');
    expect(within(fire).getByText(MONITORING_ONLY)).toBeTruthy();
    const link = fire.querySelector('[data-monitoring-link]');
    expect(link?.textContent).toBe(MONITORING_LINK);
    expect(link?.getAttribute('data-direction')).toBe('to-bms');
    // Never a control: no command, reset, inhibit, delay or override, and no button at all on the group.
    expect(fire.textContent).not.toMatch(/\b(command|reset|inhibit|delay|override|setpoint)\b/iu);
    expect(within(fire).queryAllByRole('button')).toHaveLength(0);
    expect(
      within(fire)
        .getAllByRole('link')
        .map((element) => element.textContent),
    ).toEqual(['View in System Scope']);
    // The fire group stands in its own lane, apart from the other groups, so its link rises to the design level and
    // never reaches another system's group (7.1.1-L4); the other group draws no link and no monitoring text.
    const hvac = group('hvac');
    const lane = fire.closest('[data-monitoring-lane]');
    expect(lane).not.toBeNull();
    expect(lane?.querySelectorAll('[data-topology-group]')).toHaveLength(1);
    expect(hvac.closest('[data-monitoring-lane]')).toBeNull();
    expect(hvac.contains(fire)).toBe(false);
    expect(fire.contains(hvac)).toBe(false);
    expect(hvac.querySelector('[data-monitoring-link]')).toBeNull();
    expect(hvac.textContent).not.toContain(MONITORING_ONLY);
    expect(main().querySelectorAll('[data-monitoring-link]')).toHaveLength(1);
  });

  it('US-TOPO-01 AC11 · R-071 · rule 7 · G7-15 (rendered half): with no include decision recorded the view reads "Not available yet: the systems in scope" with the action to choose them, and draws no group', async () => {
    api({ groups: [] });
    await openPage();
    const line = main().querySelector(`[data-value-id="project:${PROJECT}.topology.noDecision"]`);
    expect(line?.textContent).toBe('Not available yet: the systems in scope');
    const action = within(main()).getByRole('link', {
      name: 'Choose the systems in scope',
    });
    expect(action.getAttribute('href')).toBe(`/projects/${PROJECT}/system-scope`);
    expect(within(main()).queryAllByRole('article')).toHaveLength(0);
    // No system filter while no group is drawn.
    expect(screen.queryByRole('button', { name: /^System/u })).toBeNull();
  });

  it('US-TOPO-03 AC5 · R-071 · ADR 0043 decision 4: "View in System Scope" opens System Scope on that system, keeping the floor selection; nothing is written', async () => {
    const seen = api({ ...HVAC_AND_FIRE, levels: 'known' });
    await openPage(`/projects/${PROJECT}/topology?level=upper_1`);
    const link = within(group('hvac')).getByRole('link', {
      name: 'View in System Scope',
    });
    expect(link.getAttribute('href')).toBe(`/projects/${PROJECT}/system-scope?level=upper_1&system=hvac`);
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('US-TOPO-01 AC9 · rule 3: the system filter offers the drawn groups; choosing one shows only that group, and nothing is written', async () => {
    const seen = api(HVAC_AND_FIRE);
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: /^System/u }));
    const list = screen.getByRole('listbox', { name: 'System' });
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['All systems', 'HVAC', 'Fire Safety']);
    fireEvent.click(within(list).getByRole('option', { name: 'Fire Safety' }));
    expect(
      within(main())
        .getAllByRole('article')
        .map((element) => element.getAttribute('data-topology-group')),
    ).toEqual(['fire_safety']);
    expect(screen.getByRole('button', { name: /^System/u }).textContent).toContain('Fire Safety');
    // The design levels stay: a filter changes what is shown, not what exists.
    expect(
      screen.getByRole('region', {
        name: 'Controllers, networks and integrations',
      }),
    ).toBeTruthy();
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it("US-TOPO-01 AC8 · US-MODEL-02 · R-077: the floor filter lists the level register's levels by their bound labels, plus All floors; choosing one asks the view for that level through the shared `level` parameter, and its lines name it", async () => {
    const seen = api({ ...HVAC_AND_FIRE, levels: 'known_with_unstated' });
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: /^Floor/u }));
    const list = screen.getByRole('listbox', { name: 'Floor' });
    const options = within(list).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['All floors', 'P', 'E1']);
    expect(options[2]?.querySelector('[data-value-id]')?.getAttribute('data-value-id')).toBe('building:0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e70.levels.upper_1');
    // The level types no source states are named once, under the list (rule 8).
    expect(screen.getByRole('group', { name: 'Floor' }).textContent).toContain('Unknown: TEST attic');
    const options2 = within(list).getAllByRole('option');
    const upper = options2[2];
    if (upper === undefined) throw new Error('no E1 option');
    fireEvent.click(upper);
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/workspace/topology') && request.url.searchParams.get('level') === 'upper_1')).toBe(true));
    await waitFor(() => expect(group('hvac').querySelector(`[data-value-id="project:${PROJECT}.register.hvac.upper_1"]`)).not.toBeNull());
    expect(screen.getByRole('button', { name: /^Floor/u }).textContent).toContain('E1');
    expect(seen.filter((request) => request.method !== 'GET')).toEqual([]);
  });

  it('prompt 3 section 11 (keyboard) · R-077: the floor filter opens on its chosen option, moves with the arrow keys, chooses with Enter and gives the focus back to its button; Escape closes it choosing nothing', async () => {
    const seen = api({ ...HVAC_AND_FIRE, levels: 'known' });
    await openPage();
    const button = screen.getByRole('button', { name: /^Floor/u });
    fireEvent.click(button);
    await waitFor(() => expect(document.activeElement?.textContent).toBe('All floors'));
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    expect(screen.queryByRole('listbox', { name: 'Floor' })).toBeNull();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    await waitFor(() => expect(document.activeElement?.textContent).toBe('All floors'));
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'ArrowDown',
    });
    await waitFor(() => expect(document.activeElement?.textContent).toBe('P'));
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Enter',
    });
    expect(screen.queryByRole('listbox', { name: 'Floor' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Floor/u }));
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/workspace/topology') && request.url.searchParams.get('level') === 'ground_1')).toBe(true));
  });

  it('US-MODEL-02 · R-077 · rule 7 · G7-14 (rendered half) · DR-5: with no floor structure known, the floor filter reads the served "Not available yet: floor structure" in the header\'s actions slot, with the actions to upload a document and to enter the floors as underlined links; no floor list and no separate notice bar', async () => {
    api(HVAC_AND_FIRE);
    await openPage();
    const notice = screen.getByRole('group', { name: 'Floor' });
    expect(notice.querySelector(`[data-value-id="project:${PROJECT}.floors.missing"]`)?.textContent).toBe('Not available yet: floor structure');
    expect(within(notice).getByRole('link', { name: 'Upload a document' }).getAttribute('href')).toBe(`/projects/${PROJECT}/documents?upload=open`);
    expect(within(notice).getByRole('link', { name: 'Enter the floors' }).getAttribute('href')).toBe(`/projects/${PROJECT}/steps/3`);
    for (const link of within(notice).getAllByRole('link')) expect(link.className).toContain('underline');
    expect(screen.queryByRole('button', { name: /^Floor/u })).toBeNull();
    expect(notice.closest('.sov-page-header__actions')).not.toBeNull();
    expect(document.querySelector('[data-level-notice]')).toBeNull();
  });

  it('G7-16 (web half) · R-077 · rule 4 "Until a conflict is resolved" · rule 7: while the floor field is in conflict routed to the owner, the floor filter reads the served line, the floors field\'s two readings with their sources (Two values, bound), and the action to resolve it; no list is built from either value', async () => {
    api({ ...HVAC_AND_FIRE, levels: 'conflict' });
    await openPage();
    const notice = screen.getByRole('group', { name: 'Floor' });
    expect(notice.querySelector(`[data-value-id="project:${PROJECT}.floors.conflict"]`)?.textContent).toBe('Not available yet: two values for floors');
    const field = notice.querySelector(`.sov-value[data-value-id="building:${BUILDING}.floors"]`);
    expect(field?.querySelector('.sov-badge')?.textContent).toBe('Two values');
    expect(field?.textContent).toContain('TEST 12 or 14 upper floors');
    expect(field?.textContent).toContain('TEST found in TEST memoriu.pdf; TEST found in TEST plan.pdf');
    expect(field?.textContent).not.toContain(ROUTED_TO_SOVITECH);
    const resolve = within(notice).getByRole('link', { name: 'Enter the floors' });
    expect(resolve.getAttribute('href')).toBe(`/projects/${PROJECT}/steps/3`);
    expect(resolve.className).toContain('underline');
    expect(screen.queryByRole('button', { name: /^Floor/u })).toBeNull();
    expect(screen.queryByRole('listbox', { name: 'Floor' })).toBeNull();
    expect(notice.closest('.sov-page-header__actions')).not.toBeNull();
  });

  it('G7-16 (web half) · rule 4 "Routing": a floors conflict routed to SOVITECH shows its routing line with the two readings, and offers the owner no action to arbitrate it', async () => {
    api({ ...HVAC_AND_FIRE, levels: 'conflict_for_engineer' });
    await openPage();
    const notice = screen.getByRole('group', { name: 'Floor' });
    expect(notice.textContent).toContain('Not available yet: two values for floors');
    const field = notice.querySelector(`.sov-value[data-value-id="building:${BUILDING}.floors"]`);
    expect(field?.textContent).toContain(ROUTED_TO_SOVITECH);
    expect(field?.textContent).toContain('TEST 12 or 14 upper floors');
    expect(within(notice).queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^Floor/u })).toBeNull();
  });

  it('DR-5 · dashboards-spec 3.5 "Fixed order: view mode, floor, system filter": the header\'s actions slot holds the floor filter, then the system filter', async () => {
    api({ ...HVAC_AND_FIRE, levels: 'known' });
    await openPage();
    const slot = document.querySelector('.sov-page-header__actions');
    if (slot === null) throw new Error('no actions slot');
    const names = within(slot as HTMLElement)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(names).toEqual(['FloorAll floors', 'SystemAll systems']);
  });

  it('R-073 · R-075 · R-080 · R-071 · 7.1-r27: no view-mode control, 3D or 2D mode, model area, canvas, statistics, live bar or integration status', async () => {
    api(HVAC_AND_FIRE);
    await openPage();
    for (const name of [/^3D$/u, /^2D$/u, /Physical/u, /Hybrid/u, /^Logical/u, /Isolate/u, /Open in BMS/u]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
      expect(screen.queryByRole('tab', { name })).toBeNull();
      expect(screen.queryByRole('radio', { name })).toBeNull();
    }
    // No drawing at all in the page (the header's logo is the shell's, outside it).
    expect(document.querySelector('#main canvas, #main img, #main video, #main object, #main embed, [data-topology] svg:not(.lucide)')).toBeNull();
    expect(document.querySelector('.sov-model-area')).toBeNull();
    expect(document.body.textContent).not.toMatch(/BMS LIVE|Last sync|Online|Offline|Fault|Planned|In Progress|Under Review|Key metrics|Statistics|REAL BUILDINGS/iu);
  });

  it('R-003 · rule 7: a view that cannot be loaded says so with Try again, and the sidebar stays usable', async () => {
    let calls = 0;
    api(() => {
      calls += 1;
      return calls === 1 ? json(500, { code: 'internal' }) : json(200, topologyResponse(PROJECT, HVAC_AND_FIRE));
    });
    renderAt(`/projects/${PROJECT}/topology`);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('This page could not be loaded. Nothing you entered is lost.');
    expect(screen.getByRole('navigation', { name: 'Project pages' })).toBeTruthy();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(document.querySelector('[data-topology-group="hvac"]')).not.toBeNull());
  });
});
