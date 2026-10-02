import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copy } from '../../../copy';
import { PROJECT, installFakeApi, json, projectList, renderAt, sentTo, type Handler } from '../../../test/harness';
import { frameResponse } from '../../test-views';
import { DOCUMENT, asset, assetResponse, equipmentResponse, systemCandidate, type AssetOptions, type TestAsset } from '../equipment/test-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const AHU: TestAsset = { n: 1, tag: 'TEST-AHU-1', answerable: true };
const RECORD = `/api/projects/${PROJECT}/workspace/equipment/${asset(1)}`;

function api(record: AssetOptions | Handler = {}, extra: Readonly<Record<string, Handler>> = {}) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project 1' }])),
    [`GET /api/projects/${PROJECT}/workspace`]: () => json(200, frameResponse(PROJECT)),
    [`GET ${RECORD}`]: typeof record === 'function' ? record : () => json(200, assetResponse(PROJECT, AHU, record)),
    [`GET /api/projects/${PROJECT}/workspace/equipment`]: () => json(200, equipmentResponse(PROJECT, [AHU])),
    ...extra,
  });
}

async function openRecord() {
  const view = renderAt(`/projects/${PROJECT}/equipment/${asset(1)}`);
  await screen.findByRole('heading', { name: /TEST-AHU-1/u, level: 1 });
  await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  return view;
}

describe('UD-08 · R-068 · US-ASSETS-07: the asset record', () => {
  it('DR-2 (pages half) · App theme "Shell sizes": the page adds no padding of its own inside the workspace frame\'s page column, so the register keeps its width beside the inspector', async () => {
    api();
    await openRecord();
    // The page column (the kit's frame) takes the page's one padding from the gutter tokens; the page adds none (DR-2).
    const root = screen.getByRole('heading', { level: 1 }).closest('.sov-page-header')?.parentElement;
    expect(root?.className).not.toMatch(/(^|\s)p[xytblr]?-/u);
    expect(root?.closest('.sov-workspace__page')).not.toBeNull();
  });

  it('US-ASSETS-07 AC1 · AC9 · G2-14 · rule 2: the title is the tag as written (bound); every value shows with its badge and source line under its label; where it was found names the document, its stage and version, the tag as written there with its source line, and the excerpt on demand', async () => {
    api();
    await openRecord();
    const title = screen.getByRole('heading', { level: 1 });
    expect(title.querySelector(`[data-value-id="asset:${asset(1)}.tag"]`)).not.toBeNull();
    expect(document.title).toBe('Equipment record – SOVITECH');
    const details = screen.getByRole('region', { name: 'Details' });
    for (const label of ['Type', 'System', 'Location', 'Floor', 'Zone']) expect(within(details).getByText(label)).toBeTruthy();
    expect(details.querySelector(`[data-value-id="asset:${asset(1)}.system"]`)?.textContent).toContain('TEST will check badge');
    expect(details.querySelector(`[data-value-id="asset:${asset(1)}.type"]`)?.textContent).toContain('TEST unknown');
    const places = within(screen.getByRole('region', { name: 'Where it was found' })).getByRole('list', { name: 'Places in your documents that show this equipment' });
    expect(places.querySelector(`[data-value-id="document:${DOCUMENT}.fileName"]`)?.textContent).toContain('TEST schedule.xlsx');
    for (const label of ['Document', 'Stage', 'Version', 'As written']) expect(within(places).getByText(label)).toBeTruthy();
    const written = places.querySelector(`.sov-value[data-value-id="asset:${asset(1)}.evidence1"]`);
    expect(written?.textContent).toContain('TEST found in TEST schedule.xlsx, sheet TEST');
    fireEvent.click(within(places).getByText('Show the excerpt'));
    const excerpt = places.querySelector('[data-copy-kind="evidence-excerpt"]');
    expect(excerpt?.textContent).toBe('TEST TEST-AHU-1 as written');
    expect(excerpt?.getAttribute('data-value-id')).toBe(`asset:${asset(1)}.evidence1`);
  });

  it('DR-10 · type hierarchy (ADR 0040 decision 6): a document\'s coverage line under its 14px file name is set small, bound to its value id', async () => {
    api();
    await openRecord();
    const documents = within(screen.getByRole('region', { name: 'Documents' })).getByRole('list', { name: 'Documents that show this equipment' });
    const coverage = documents.querySelector(`.sov-status-line[data-value-id="document:${DOCUMENT}.coverage"]`);
    expect(coverage?.textContent).toBe('TEST read, sheets one to two');
    expect(coverage?.getAttribute('data-size')).toBe('small');
  });

  it('G13-3 (rendered half) · rule 13 · US-ASSETS-07 AC2: an excerpt erased with its document reads "[erased]"', async () => {
    api({ erased: true });
    await openRecord();
    const places = screen.getByRole('list', { name: 'Places in your documents that show this equipment' });
    fireEvent.click(within(places).getByText('Show the excerpt'));
    expect(places.querySelector('[data-copy-kind="evidence-excerpt"]')?.textContent).toBe('[erased]');
    expect(within(screen.getByRole('region', { name: 'Documents' })).getByText('No current document shows this equipment.')).toBeTruthy();
  });

  it('V-3 · A-8 · US-ASSETS-07 AC3 · R-068 · rule 2 · rule 3 · 2.3 · 2.8 · proposals 7.2.6 and 7.2.26: each history entry shows with its own badge and source line (an inferred one as Possible, a withdrawn one with "Source document removed"), the level by its register label and the zone by its name, with the role that wrote it and when, never a person', async () => {
    api({ history: true });
    await openRecord();
    const history = screen.getByRole('region', { name: 'History' });
    const system = within(history).getByRole('table', { name: 'System' });
    expect(within(system).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Value', 'Who', 'When']);
    const [inferred, withdrawn] = within(system).getAllByRole('row').slice(1);
    // An inference reads as a possibility, with its source line (rule 3; 2.8 "Likely" / "Possible").
    const inferredValue = inferred?.querySelector(`.sov-value[data-value-id="asset:${asset(1)}.system.history1"]`);
    expect(inferredValue?.querySelector('.sov-badge')?.textContent).toBe('Possible');
    expect(inferredValue?.textContent).toContain('TEST hvac system');
    expect(inferredValue?.textContent).toContain('TEST inferred from TEST schedule.xlsx');
    expect(inferred?.textContent).toContain(copy.workspace.asset.roles.system);
    expect(inferred?.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-20');
    // A value whose only source was removed is never shown as current: its 2.8 status line says so (2.3).
    const withdrawnValue = withdrawn?.querySelector(`.sov-value[data-value-id="asset:${asset(1)}.system.history2"]`);
    expect(withdrawnValue?.textContent).toContain('Source document removed');
    expect(withdrawnValue?.querySelector('.sov-badge')?.textContent).toBe('From document');
    // The level reads the level register's label and the zone its name as written, never a stored key or an id (R-077; R-061).
    const level = within(history).getByRole('table', { name: 'Floor' });
    expect(level.querySelector(`[data-value-id="asset:${asset(1)}.level.history1"]`)?.textContent).toContain('TEST E1');
    const zone = within(history).getByRole('table', { name: 'Zone' });
    expect(zone.querySelector(`[data-value-id="asset:${asset(1)}.zone.history1"]`)?.textContent).toContain('TEST lobby zone');
    expect(history.textContent).not.toMatch(/upper_1|ground_1|[0-9a-f]{8}-[0-9a-f]{4}-/u);
    expect(history.textContent).not.toContain('TEST owner');
  });

  it('R-067 · R-068 · US-ASSETS-07 AC7 · rule 11 · 5.2: points read "Not available yet"; no live status, alarm, Edit, Open in BMS or control; "Looks right" is the owner\'s only answer and sends owner_acknowledged only', async () => {
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/acknowledge`]: () => json(200, { displayObjects: [] }) });
    await openRecord();
    expect(screen.getByRole('region', { name: 'Points' }).querySelector(`[data-value-id="asset:${asset(1)}.points"]`)?.textContent).toContain('TEST not available: TEST point templates');
    for (const absent of ['Status', 'Last Update', 'Alarms', 'Open in BMS', 'Online', 'Reset', 'Override', 'Command']) expect(document.body.textContent).not.toContain(absent);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    fireEvent.click(within(screen.getByRole('region', { name: 'Details' })).getByRole('button', { name: 'Looks right' }));
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/acknowledge')).toBe(1));
    expect(seen.find((request) => request.path.endsWith('/fields/acknowledge'))?.body).toEqual({ candidateIds: [systemCandidate(1)] });
    expect(sentTo(seen, 'POST', '/fields/concern')).toBe(0);
  });

  it('rule 13 · prompt 3 section 11 (states): an asset not in this project\'s register says so; Back to Equipment opens the register', async () => {
    api(() => json(404, { code: 'not_found' }));
    const view = renderAt(`/projects/${PROJECT}/equipment/${asset(1)}`);
    await screen.findByText("This equipment is not in this project's register.");
    fireEvent.click(screen.getByRole('link', { name: 'Back to Equipment' }));
    await waitFor(() => expect(view.router.state.location.pathname).toBe(`/projects/${PROJECT}/equipment`));
  });

  it.each(['101', '1.2'])('A-1 · rule 7 · rule 2: a tag written only in digits ("%s") titles the record with its badge, bound, and the page does not throw', async (written) => {
    const digits: TestAsset = { n: 1, tag: written };
    api(() => json(200, assetResponse(PROJECT, digits)), { [`GET /api/projects/${PROJECT}/workspace/equipment`]: () => json(200, equipmentResponse(PROJECT, [digits])) });
    renderAt(`/projects/${PROJECT}/equipment/${asset(1)}`);
    const title = await screen.findByRole('heading', { level: 1, name: new RegExp(written.replace('.', '\\.'), 'u') });
    const bound = title.querySelector(`[data-value-id="asset:${asset(1)}.tag"]`);
    expect(bound?.textContent).toContain(written);
    expect(bound?.textContent).toContain('TEST document badge');
    // The frame stays: the sidebar and the record's sections are drawn, not an error boundary.
    expect(screen.getByRole('navigation', { name: 'Project pages' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Details' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Unexpected Application Error/u);
  });

  it('prompt 3 section 11 (states): a record that failed to load says so with Try again', async () => {
    let fail = true;
    api(() => (fail ? json(500, { code: 'internal_error' }) : json(200, assetResponse(PROJECT, AHU))));
    renderAt(`/projects/${PROJECT}/equipment/${asset(1)}`);
    await screen.findByText('This equipment record could not be loaded. Try again.');
    fail = false;
    fireEvent.click(screen.getAllByRole('button', { name: 'Try again' })[0] as HTMLElement);
    await screen.findByRole('heading', { name: /TEST-AHU-1/u, level: 1 });
  });
});
