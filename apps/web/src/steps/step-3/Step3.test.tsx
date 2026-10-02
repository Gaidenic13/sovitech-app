import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { AS_OF, PROJECT, envelope, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler, type Seen } from '../../test/harness';
import {
  AREA,
  AREA_CANDIDATE,
  COVERAGE,
  EQUIPMENT,
  FILE_NAME,
  FLOORS,
  MODEL_STORED,
  NO_MODEL,
  PILL,
  ROOMS,
  ROOMS_CANDIDATE,
  ZONES,
  ZONES_B,
  areaDisplay,
  equipmentDisplay,
  fileDisplays,
  floorsDisplays,
  missingDisplay,
  pillDisplay,
  roomsDisplay,
  zonesConflictDisplays,
} from './test-support';
import { STEP3_READING_POLL_MS } from './Step3';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

interface Options {
  readonly intro?: 'values_found' | 'reading' | 'no_documents' | 'none_found';
  readonly confirm?: boolean;
  readonly conflict?: 'owner' | 'engineer';
  readonly files?: boolean;
  readonly model?: boolean;
  readonly demo?: boolean;
  readonly facts?: readonly DisplayObject[];
}

function stepThree(options: Options = {}) {
  const facts = options.facts ?? [areaDisplay({ confirm: options.confirm === true }), ...floorsDisplays(), roomsDisplay(), ...(options.conflict === undefined ? [missingDisplay(ZONES, 'building.zones')] : zonesConflictDisplays(options.conflict))];
  const displays = [...facts, equipmentDisplay(), ...(options.confirm === true ? [pillDisplay()] : []), ...(options.files === true ? fileDisplays() : [])];
  const topIds = [AREA, FLOORS, ROOMS, ZONES];
  return {
    ...envelope(PROJECT, displays, { demo: options.demo === true }),
    view: {
      step: 3,
      intro: options.intro ?? 'values_found',
      summary: [...topIds, EQUIPMENT],
      details: facts.map((display) => display.valueId),
      confirmationCount: options.confirm === true ? PILL : null,
      forYouRow: options.confirm === true ? PILL : null,
      files: options.files === true ? [COVERAGE] : [],
      viewer: options.model === true ? MODEL_STORED : NO_MODEL,
    },
  };
}

function api(options: Options = {}, extra: Readonly<Record<string, Handler>> = {}) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo: options.demo === true }])),
    [`GET /api/projects/${PROJECT}/steps/3`]: () => json(200, stepThree(options)),
    [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    [`POST /api/projects/${PROJECT}/steps/3/continue`]: () => json(200, { nextStep: 4, displayObjects: [] }),
    [`POST /api/projects/${PROJECT}/fields/confirm`]: () => json(200, { displayObjects: [] }),
    [`POST /api/projects/${PROJECT}/fields/acknowledge`]: () => json(200, { displayObjects: [] }),
    [`POST /api/projects/${PROJECT}/fields/concern`]: () => json(200, { displayObjects: [] }),
    [`POST /api/projects/${PROJECT}/fields/resolve-conflict`]: () => json(200, { displayObjects: [] }),
    [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(200, { displayObjects: [] }),
    ...extra,
  });
}

const valueElements = (valueId: string) => [...document.querySelectorAll(`[data-value-id="${valueId}"]`)].filter((element) => element.classList.contains('sov-value'));
const details = () => screen.getByRole('region', { name: 'Extracted details' });
const summary = () => screen.getByRole('region', { name: 'Building summary' });
const stepViews = (seen: readonly Seen[]) => seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/3')).length;

describe('US-REVIEW-04 · R-045 · UD-34: step 3 (OB-3)', () => {
  it('US-REVIEW-04 AC1 · AC11 · G2-7 · DR-3 · rule 2: the summary and the extracted details show each fact through its served display, bound to its value id, identically; Edit and every other action sit once, in the extracted details', async () => {
    api();
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    for (const valueId of [AREA, FLOORS, ROOMS, ZONES]) {
      const shown = valueElements(valueId);
      expect(shown.length, valueId).toBe(2);
      const [first, second] = shown;
      // One value id renders one display: the same text, badge, source and lines in both places (G2-7).
      expect(first?.querySelector('.sov-value__line')?.textContent).toBe(second?.querySelector('.sov-value__line')?.textContent);
      expect(first?.querySelector('.sov-value__source')?.textContent ?? null).toBe(second?.querySelector('.sov-value__source')?.textContent ?? null);
    }
    expect(within(summary()).getByText('TEST area as written').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(AREA);
    expect(within(details()).getByText('TEST area source line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(AREA);
    // DR-3: the summary is onboarding-spec 2.5's key/value list (label left, value right), read-only;
    // the details keep the rows with Edit on each (guardrails section 5, step 3), so each value has its
    // actions once on the page.
    expect(within(summary()).queryAllByRole('button')).toHaveLength(0);
    for (const valueId of [AREA, FLOORS, ROOMS, ZONES]) {
      const [inSummary] = valueElements(valueId).filter((element) => summary().contains(element));
      expect(inSummary?.closest('.sov-field-value')?.getAttribute('data-layout'), valueId).toBe('row');
    }
    expect(within(details()).getAllByRole('button', { name: 'Edit' })).toHaveLength(4);
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(4);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });

  it('V-11 · rule 3 · rule 5 · section 5 step 3: with facts from documents the intro asks the owner to review and correct, never to confirm', async () => {
    api();
    renderAt(`/projects/${PROJECT}/steps/3`);
    expect(await screen.findByText('Please review the details and correct any information if needed.')).toBeTruthy();
    expect(screen.queryByText(/confirm or correct/u)).toBeNull();
  });

  it('DR-13 · rule 12: while documents are read and no fact is pending, the intro says only that the documents are being read, never that facts fill in', async () => {
    const facts = [missingDisplay(AREA, 'building.grossFloorArea'), missingDisplay(FLOORS, 'building.floors'), missingDisplay(ROOMS, 'building.rooms'), missingDisplay(ZONES, 'building.zones')];
    api({ intro: 'reading', facts });
    renderAt(`/projects/${PROJECT}/steps/3`);
    expect(await screen.findByText('We are reading your documents.')).toBeTruthy();
    expect(screen.queryByText(/fill in as each file is read/u)).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Reading your documents' }).textContent).toBe('');
  });

  it('DR-12 · UD-34 · prompt 3 section 11: while the view loads, the three columns keep their frame and one line says "Loading your answers", with no figure, and Back and Continue stay', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/3`]: () => new Promise<Response>(() => undefined),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/steps/3`);
    expect(await screen.findByText('Loading your answers')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Your building' })).toBeTruthy();
    expect(document.querySelectorAll('main .min-h-\\[560px\\]')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    expect(document.querySelector('main [data-value-id]')).toBeNull();
    expect(document.body.hasAttribute('data-render-ready')).toBe(false);
  });

  it('DR-18: the panel title takes the section heading role, the model area and the files block the group heading role', async () => {
    api({ files: true });
    renderAt(`/projects/${PROJECT}/steps/3`);
    expect((await screen.findByRole('heading', { level: 2, name: 'Extracted details' })).classList.contains('sov-heading-section')).toBe(true);
    expect(screen.getByRole('heading', { level: 2, name: 'Building model' }).classList.contains('sov-heading-group')).toBe(true);
    expect(screen.getByRole('heading', { level: 2, name: 'Files not fully read' }).classList.contains('sov-heading-group')).toBe(true);
  });

  it('A-1 · rule 4 · ADR 0039: Continue refused because what the step showed changed (409 shown_value_changed) says so, reads the view again and blocks nothing', async () => {
    const seen = api({ confirm: true }, { [`POST /api/projects/${PROJECT}/steps/3/continue`]: () => json(409, { code: 'shown_value_changed' }) });
    const { router } = renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const before = stepViews(seen);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const alert = await screen.findByText('This value changed since the page showed it. The page shows it again now.');
    expect(alert.closest('[role="alert"]')?.querySelector('svg')).not.toBeNull();
    await waitFor(() => expect(stepViews(seen)).toBeGreaterThan(before));
    expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/3`);
    expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(false);
  });

  it('US-REVIEW-04 AC1 · §5-3b · §5-3e · rule 7: the HVAC assets row is the served "Not available yet" line naming what is missing, bound, with no Edit; no Systems row is drawn', async () => {
    api();
    renderAt(`/projects/${PROJECT}/steps/3`);
    const line = await screen.findByText('TEST not available yet: taxonomy');
    const row = line.closest('li');
    expect(line.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(EQUIPMENT);
    expect(row?.textContent).toContain('HVAC assets');
    expect(within(row as HTMLElement).queryByRole('button')).toBeNull();
    expect(within(summary()).queryByText(/^Systems$/u)).toBeNull();
    expect(within(details()).queryByText(/^Systems$/u)).toBeNull();
  });

  it('US-REVIEW-04 AC4 · AC5 · rule 8: floors show by level type beside the field, a level type no document states reads its served Unknown, and no fact element holds another', async () => {
    api();
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const upper = valueElements(`${FLOORS}.upper`);
    const below = valueElements(`${FLOORS}.below_ground`);
    expect(upper).toHaveLength(1);
    expect(below).toHaveLength(1);
    expect(below[0]?.textContent).toContain('TEST Unknown');
    for (const element of document.querySelectorAll('.sov-value[data-value-id]')) {
      expect(element.querySelector('.sov-value[data-value-id]'), element.getAttribute('data-value-id') ?? '').toBeNull();
    }
  });

  it('US-REVIEW-04 AC12 (left off, PRD R-045) · US-REVIEW-09 AC3 · AC5 · rule 12: files not fully read show their name and 2.8 line bound, and no "Building data extracted" banner shows', async () => {
    api({ files: true });
    renderAt(`/projects/${PROJECT}/steps/3`);
    const files = await screen.findByRole('region', { name: 'Files not fully read' });
    expect(within(files).getByText('TEST-plans.pdf').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(FILE_NAME);
    expect(within(files).getByText('TEST partly analysed line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(COVERAGE);
    expect(screen.queryByText(/Building data extracted/u)).toBeNull();
    expect(screen.queryByText(/BIM files/u)).toBeNull();
  });

  it('US-REVIEW-04 AC13 · US-REVIEW-10 AC1 · rule 12: with no documents the intro does not say documents were analysed, each fact reads its served missing wording with Edit, and Continue works', async () => {
    const facts = [missingDisplay(AREA, 'building.grossFloorArea'), missingDisplay(FLOORS, 'building.floors'), missingDisplay(ROOMS, 'building.rooms'), missingDisplay(ZONES, 'building.zones')];
    api({ intro: 'no_documents', facts });
    const { router } = renderAt(`/projects/${PROJECT}/steps/3`);
    expect(await screen.findByText('No documents were uploaded, so nothing was read. You can add the facts later, or continue.')).toBeTruthy();
    expect(screen.queryByText(/We’ve analyzed your documents/u)).toBeNull();
    expect(within(details()).getAllByText('TEST not_provided_yet')).toHaveLength(4);
    expect(within(details()).getAllByRole('button', { name: 'Edit' })).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/4`));
  });

  it('US-REVIEW-04 AC14 · prompt 3 5.2 "No IFC uploaded" · rule 1: no viewer, view toggle or floor selector; the model area names what is missing and "Upload a model" opens step 2', async () => {
    api();
    const { router } = renderAt(`/projects/${PROJECT}/steps/3`);
    const area = await screen.findByRole('region', { name: 'Building model' });
    expect(within(area).getByText('TEST model missing line')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^(3D|2D|Wireframe)$/u })).toBeNull();
    expect(screen.queryByText(/All floors/u)).toBeNull();
    expect(document.querySelector('canvas, img:not([data-render-unreadable])')).toBeNull();
    fireEvent.click(within(area).getByRole('button', { name: 'Upload a model' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/2`));
  });

  it('US-REVIEW-09 AC7 · G12-5: a stored model shows its served G12-1 line and no action', async () => {
    api({ model: true });
    renderAt(`/projects/${PROJECT}/steps/3`);
    const area = await screen.findByRole('region', { name: 'Building model' });
    expect(within(area).getByText('TEST model stored line')).toBeTruthy();
    expect(within(area).queryByRole('button')).toBeNull();
  });

  it('US-REVIEW-05 AC3 · AC4 · rule 5: the pill is the served count, bound; "Yes" on a shown confirmation posts it for its candidate and the page reads its view again', async () => {
    const seen = api({ confirm: true });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const pills = screen.getAllByText('TEST things for you line');
    for (const pill of pills) expect(pill.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(PILL);
    const before = stepViews(seen);
    fireEvent.click(within(details()).getAllByRole('button', { name: 'Yes' })[0] as HTMLElement);
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/fields/confirm'))).toBe(true));
    expect(seen.find((request) => request.path.endsWith('/fields/confirm'))?.body).toEqual({ candidateId: AREA_CANDIDATE });
    await waitFor(() => expect(stepViews(seen)).toBeGreaterThan(before));
  });

  it('US-REVIEW-06 AC3 · §5-3f: the row that leads to the owner\'s items shows the served count, never "before we continue", and moves the focus to the first confirmation', async () => {
    api({ confirm: true });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    expect(screen.queryByText(/before we continue/iu)).toBeNull();
    const row = screen.getByRole('button', { name: /TEST things for you line/u });
    fireEvent.click(row);
    const focused = document.activeElement;
    expect(focused?.textContent).toBe('Yes');
    expect(focused?.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(AREA);
  });

  it('G3-3 · US-REVIEW-05 AC7 · §5-3b · rule 3: an engineer item offers "Looks right" and "Something\'s wrong", never a confirmation or "Confirm all"; each posts its served candidates and the badge stays the server\'s', async () => {
    const seen = api();
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const [rooms] = valueElements(ROOMS).filter((element) => details().contains(element));
    if (rooms === undefined) throw new Error('no rooms row');
    expect(within(rooms as HTMLElement).queryByRole('button', { name: 'Yes' })).toBeNull();
    expect(screen.queryByRole('button', { name: /confirm all/iu })).toBeNull();
    fireEvent.click(within(rooms as HTMLElement).getByRole('button', { name: 'Looks right' }));
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/fields/acknowledge'))).toBe(true));
    expect(seen.find((request) => request.path.endsWith('/fields/acknowledge'))?.body).toEqual({ candidateIds: [ROOMS_CANDIDATE] });
    // The badge is what the server serves after the write: "Looks right" never raises it (G3-3).
    await waitFor(() => expect(within(rooms as HTMLElement).getByText('TEST SOVITECH will check')).toBeTruthy());
    fireEvent.click(within(valueElements(ROOMS).find((element) => details().contains(element)) as HTMLElement).getByRole('button', { name: "Something's wrong" }));
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/fields/concern'))).toBe(true));
    expect(seen.find((request) => request.path.endsWith('/fields/concern'))?.body).toEqual({ candidateId: ROOMS_CANDIDATE });
  });

  it('US-REVIEW-07 AC1 · AC2 · G4-5 · rule 8: Edit opens the inline editor with the unit\'s qualifiers; Save posts the typed text for the server\'s parser with the shown candidates as corrects', async () => {
    const seen = api();
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const [area] = valueElements(AREA).filter((element) => details().contains(element));
    fireEvent.click(within(area as HTMLElement).getByRole('button', { name: 'Edit' }));
    // DR-5 · rule 8: the input names the unit in words, keyed by the served unit code.
    const input = await within(details()).findByRole('textbox', { name: 'TEST gross floor area, in square metres' });
    fireEvent.change(input, { target: { value: 'TEST typed area' } });
    fireEvent.change(within(details()).getByRole('combobox', { name: 'What it measures' }), { target: { value: 'gross_total' } });
    fireEvent.click(within(details()).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/fields/edit'))).toBe(true));
    expect(seen.find((request) => request.path.endsWith('/fields/edit'))?.body).toEqual({
      field: { subjectId: expect.any(String), fieldKey: 'building.grossFloorArea' },
      value: { kind: 'quantity', raw: 'TEST typed area', qualifier: 'gross_total' },
      corrects: [AREA_CANDIDATE],
    });
  });

  it('US-REVIEW-11 AC2 · AC3 · rule 4: a conflict put to the owner shows each value with its source beside the field, and "Choose this value" posts the chosen candidate', async () => {
    const seen = api({ conflict: 'owner' });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const values = within(details()).getByRole('list', { name: 'The values found' });
    expect(within(values).getByText('TEST zones one source line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(`${ZONES}.value1`);
    const choose = within(values).getAllByRole('button', { name: 'Choose this value' });
    expect(choose).toHaveLength(2);
    fireEvent.click(choose[1] as HTMLElement);
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/fields/resolve-conflict'))).toBe(true));
    expect(seen.find((request) => request.path.endsWith('/fields/resolve-conflict'))?.body).toEqual({ field: { subjectId: expect.any(String), fieldKey: 'building.zones' }, chosenCandidateId: ZONES_B });
  });

  it('G4-8 · US-REVIEW-11 AC4 · rule 4: a conflict routed to the engineer shows its served line and both values, and asks the owner nothing', async () => {
    api({ conflict: 'engineer' });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    expect(within(details()).getByText('TEST an engineer will check it.')).toBeTruthy();
    expect(within(details()).getByText('TEST zones two')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Choose this value' })).toBeNull();
  });

  it('US-REVIEW-06 AC1 · AC4 · rule 7 · rule 3: Continue reports the confirmations shown, is never disabled, confirms nothing, and opens step 4 with no dialog', async () => {
    const seen = api({ confirm: true });
    const { router } = renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next.hasAttribute('disabled')).toBe(false);
    fireEvent.click(next);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/4`));
    expect(seen.find((request) => request.path.endsWith('/steps/3/continue'))?.body).toEqual({
      answers: [],
      multi: [],
      visibleSuggestions: [],
      shown: { questions: [], confirmations: [AREA_CANDIDATE] },
    });
    expect(seen.some((request) => request.path.endsWith('/fields/confirm'))).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('US-REVIEW-09 AC1 · AC2 · rule 7: while documents are read, the intro says so with a bar that shows no number, pending facts read their served wording, and the view is read again in place', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const facts = [missingDisplay(AREA, 'building.grossFloorArea', 'reading_documents'), missingDisplay(FLOORS, 'building.floors', 'reading_documents'), roomsDisplay(), missingDisplay(ZONES, 'building.zones')];
    const seen = api({ intro: 'reading', facts });
    renderAt(`/projects/${PROJECT}/steps/3`);
    expect(await screen.findByText('We are reading your documents. The facts below fill in as each file is read.')).toBeTruthy();
    const bar = screen.getByRole('progressbar', { name: 'Reading your documents' });
    expect(bar.textContent).toBe('');
    expect(bar.closest('[data-value-id]')).toBeNull();
    expect(within(details()).getAllByText('TEST reading_documents')).toHaveLength(2);
    const before = stepViews(seen);
    await vi.advanceTimersByTimeAsync(STEP3_READING_POLL_MS + 100);
    await waitFor(() => expect(stepViews(seen)).toBeGreaterThan(before));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('US-REVIEW-03 AC1 · GS-1: the demo project shows the served demo line on step 3; another project shows none (US-REVIEW-03 AC7)', async () => {
    api({ demo: true });
    renderAt(`/projects/${PROJECT}/steps/3`);
    expect(await screen.findByText('TEST demo line')).toBeTruthy();
    cleanup();
    vi.unstubAllGlobals();
    api({ demo: false });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    expect(screen.queryByText('TEST demo line')).toBeNull();
  });

  it('R-003 · prompt 3 section 11: a failed load shows its error with "Try again", no figure, and Back still works', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/3`]: () => json(500, { code: 'internal_error' }),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    const { router } = renderAt(`/projects/${PROJECT}/steps/3`);
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Extracted details' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/2`));
  });

  it('UD-45 · US-REVIEW-08: "View all extracted data" opens the extracted data page of the project', async () => {
    api();
    const { router } = renderAt(`/projects/${PROJECT}/steps/3`);
    fireEvent.click(await screen.findByRole('button', { name: 'View all extracted data' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/extracted`));
  });
});

describe('A-1 · rule 4 · rule 5 · rule 7: one request per press on step 3', () => {
  it('A-1 · rule 5 · rule 7: "Yes" on a shown confirmation pressed twice before the page renders again sends one confirmation; it is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = api({ confirm: true }, { [`POST /api/projects/${PROJECT}/fields/confirm`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const yes = within(details()).getAllByRole('button', { name: 'Yes' })[0] as HTMLElement;
    pressTwice(yes);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(1);
    expect(yes.hasAttribute('disabled')).toBe(false);
    held.answer();
    await within(details()).findByText('This could not be saved. Your other answers are kept. Try again.');
    fireEvent.click(within(details()).getAllByRole('button', { name: 'Yes' })[0] as HTMLElement);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(2));
  });

  it('carried from phase 3 (ADR 0039 decision 11) · rule 7: while one write of the screen is on its way, a press on another row\'s action sends nothing; every action says so with aria-busy, none is disabled, and all take presses again once the answer is in', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = api({ confirm: true }, { [`POST /api/projects/${PROJECT}/fields/confirm`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    fireEvent.click(within(details()).getAllByRole('button', { name: 'Yes' })[0] as HTMLElement);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(1);
    const [rooms] = valueElements(ROOMS).filter((element) => details().contains(element));
    const looksRight = within(rooms as HTMLElement).getByRole('button', { name: 'Looks right' });
    expect(looksRight.getAttribute('aria-busy')).toBe('true');
    expect(looksRight.hasAttribute('disabled')).toBe(false);
    fireEvent.click(looksRight);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/acknowledge')).toBe(0);
    held.answer();
    await within(details()).findByText('This could not be saved. Your other answers are kept. Try again.');
    const again = within(valueElements(ROOMS).find((element) => details().contains(element)) as HTMLElement).getByRole('button', { name: 'Looks right' });
    expect(again.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(again);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/acknowledge')).toBe(1));
  });

  it('A-1 · rule 4: "Choose this value" pressed twice before the page renders again sends one choice', async () => {
    const held = heldHandler(() => json(200, { displayObjects: [] }));
    const seen = api({ conflict: 'owner' }, { [`POST /api/projects/${PROJECT}/fields/resolve-conflict`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const choose = within(within(details()).getByRole('list', { name: 'The values found' })).getAllByRole('button', { name: 'Choose this value' });
    pressTwice(choose[1] as HTMLElement);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/resolve-conflict')).toBe(1);
    held.answer();
    await waitFor(() => expect(stepViews(seen)).toBe(2));
    expect(sentTo(seen, 'POST', '/fields/resolve-conflict')).toBe(1);
  });

  it('A-1 · rule 4 · rule 7: Save in the inline editor pressed twice before the page renders again sends one correction; Save shows aria-busy while it is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(422, { code: 'number_ambiguous' }));
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/edit`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const [area] = valueElements(AREA).filter((element) => details().contains(element));
    fireEvent.click(within(area as HTMLElement).getByRole('button', { name: 'Edit' }));
    fireEvent.change(await within(details()).findByRole('textbox', { name: 'TEST gross floor area, in square metres' }), { target: { value: 'TEST typed area' } });
    fireEvent.change(within(details()).getByRole('combobox', { name: 'What it measures' }), { target: { value: 'gross_total' } });
    const save = within(details()).getByRole('button', { name: 'Save' });
    pressTwice(save);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/edit')).toBe(1);
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.hasAttribute('disabled')).toBe(false);
    held.answer();
    await waitFor(() => expect(save.getAttribute('aria-busy')).toBe('false'));
    fireEvent.click(save);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/edit')).toBe(2));
  });

  it('V-8 · ADR 0039 decision 11 · rule 7: while a row\'s Yes is on its way, the open inline editor\'s Save sends nothing and says so with aria-busy, never disabled; it takes a press again once the answer is in', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = api({ confirm: true }, { [`POST /api/projects/${PROJECT}/fields/confirm`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const rooms = () => valueElements(ROOMS).find((element) => details().contains(element)) as HTMLElement;
    fireEvent.click(within(rooms()).getByRole('button', { name: 'Edit' }));
    fireEvent.change(await within(details()).findByRole('textbox'), { target: { value: 'TEST typed rooms' } });
    const save = within(details()).getByRole('button', { name: 'Save' });
    fireEvent.click(within(details()).getAllByRole('button', { name: 'Yes' })[0] as HTMLElement);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(1);
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.hasAttribute('disabled')).toBe(false);
    fireEvent.click(save);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/edit')).toBe(0);
    held.answer();
    await within(details()).findByText('This could not be saved. Your other answers are kept. Try again.');
    await waitFor(() => expect(save.getAttribute('aria-busy')).toBe('false'));
    fireEvent.click(save);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/edit')).toBe(1));
  });

  it('V-8 · ADR 0039 decision 11 · rule 7: while the inline editor\'s Save is on its way, another row\'s Yes sends nothing and says so with aria-busy, never disabled; it takes a press again once the answer is in', async () => {
    const held = heldHandler(() => json(422, { code: 'number_ambiguous' }));
    const seen = api({ confirm: true }, { [`POST /api/projects/${PROJECT}/fields/edit`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const rooms = () => valueElements(ROOMS).find((element) => details().contains(element)) as HTMLElement;
    fireEvent.click(within(rooms()).getByRole('button', { name: 'Edit' }));
    fireEvent.change(await within(details()).findByRole('textbox'), { target: { value: 'TEST typed rooms' } });
    const save = within(details()).getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/edit')).toBe(1);
    const yes = within(details()).getAllByRole('button', { name: 'Yes' })[0] as HTMLElement;
    expect(yes.getAttribute('aria-busy')).toBe('true');
    expect(yes.hasAttribute('disabled')).toBe(false);
    fireEvent.click(yes);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(0);
    held.answer();
    await waitFor(() => expect(save.getAttribute('aria-busy')).toBe('false'));
    const again = within(details()).getAllByRole('button', { name: 'Yes' })[0] as HTMLElement;
    expect(again.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(again);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(1));
  });

  it('A-1 · rule 7: Continue pressed twice before the page renders again sends one Continue; it shows aria-busy while that is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = api({}, { [`POST /api/projects/${PROJECT}/steps/3/continue`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/3`);
    await screen.findByRole('region', { name: 'Extracted details' });
    const next = screen.getByRole('button', { name: 'Continue' });
    pressTwice(next);
    await settle();
    expect(sentTo(seen, 'POST', '/steps/3/continue')).toBe(1);
    expect(next.getAttribute('aria-busy')).toBe('true');
    expect(next.hasAttribute('disabled')).toBe(false);
    held.answer();
    await screen.findByText('This step could not be saved. Your other answers are kept. Try again.');
    expect(next.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(next);
    await waitFor(() => expect(sentTo(seen, 'POST', '/steps/3/continue')).toBe(2));
  });
});
