import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { AS_OF, PROJECT, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler } from '../../test/harness';
import { BUILDING_TYPE_OPTIONS, CANDIDATE_A, CANDIDATE_B, PROVIDE_LATER, editOf, fieldValueId, refOf } from '../../review/test-views';
import {
  AREA_BOX,
  AREA_ID,
  CAPEX_LABEL,
  CAPEX_LABEL_TEXT,
  CAPEX_LINE,
  CAPEX_STAGE2_ADD,
  CAPEX_STAGE2_LABEL,
  CAPEX_STAGE2_LABEL_TEXT,
  CAPEX_STAGE2_LINE,
  CAPEX_STAGE2_MISSING,
  PROPOSAL_STAGE,
  CHOICE_B,
  DOCUMENT_COUNT,
  ENGINEER_LINE,
  OCCUPANCY_ID,
  OWNER_COUNT,
  OWNER_MORE,
  SCOPE_KEYS,
  STILL_READING,
  step8View,
  type Step8Options,
} from './step8-fixture';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const STEP8 = `/projects/${PROJECT}/steps/8`;

function api(options: Step8Options & { readonly view?: Handler } = {}, extra: Readonly<Record<string, Handler>> = {}) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo: options.demo === true }])),
    [`GET /api/projects/${PROJECT}/steps/8`]: options.view ?? (() => json(200, step8View(options))),
    [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    [`POST /api/projects/${PROJECT}/steps/8/continue`]: () => json(200, { nextStep: 'proposal', displayObjects: [] }),
    [`POST /api/projects/${PROJECT}/fields/skip`]: () => json(200, { displayObjects: [] }),
    ...extra,
  });
}

const bound = (text: string) => screen.getByText(text).closest('[data-value-id]')?.getAttribute('data-value-id');

describe('US-INTAKE-15 · US-INTAKE-16 · R-003: step 8 summary and Proposal card (OB-8)', () => {
  it('US-INTAKE-15 AC1: the seven input cards each with an Edit link that opens its step, and the Proposal card with no Edit link', async () => {
    api();
    const { router } = renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    for (const title of ['Project', 'Documents', 'Building', 'Systems', 'Operations', 'Goals', 'Automation', 'Proposal']) {
      expect(screen.getByRole('heading', { name: title, level: 2 })).toBeTruthy();
    }
    const edits = screen.getAllByRole('button', { name: /^Edit /u });
    expect(edits.map((button) => button.textContent)).toEqual(['Edit Project', 'Edit Documents', 'Edit Building', 'Edit Systems', 'Edit Operations', 'Edit Goals', 'Edit Automation']);
    const proposal = screen.getByRole('region', { name: 'Proposal' });
    expect(within(proposal).queryByRole('button', { name: /Edit/u })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Building' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/3`));
  });

  it('US-INTAKE-15 AC2 · AC3 · AC4 · AC5 · G2-1 · G2-7: every row is its served value bound to its value id, the file count is bound, and a skipped answer reads as served ("Not provided yet" with "You can provide this later.")', async () => {
    api();
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    expect(bound('TEST renovation')).toBe(`project:${PROJECT}.type`);
    expect(bound('TEST document count')).toBe(DOCUMENT_COUNT);
    const building = screen.getByRole('region', { name: 'Building' });
    const area = building.querySelector(`[data-value-id="${AREA_ID}"]`);
    expect(area?.textContent).toContain('TEST not provided');
    expect(area?.textContent).toContain('TEST provide later line');
    const systems = screen.getByRole('region', { name: 'Systems' });
    expect(systems.querySelectorAll('[data-value-id]')).toHaveLength(SCOPE_KEYS.length);
  });

  it('US-INTAKE-15 AC2 · 2.6 · 2.8 "Prominence" · DR-1: each decision row is named by its option\'s short name, with its served value and badge on its row; "For you" comes before "What your proposal will show" in reading and tab order', async () => {
    api();
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const systems = screen.getByRole('region', { name: 'Systems' });
    const rows = within(systems).getAllByRole('group');
    expect(rows.map((row) => row.querySelector('.sov-field-value__label')?.textContent)).toEqual([
      'HVAC',
      'Lighting',
      'Energy',
      'Access Control',
      'Fire Safety',
      'Water',
      'Elevators',
      'CCTV',
    ]);
    for (const [index, row] of rows.entries()) {
      expect(row.getAttribute('data-layout')).toBe('row');
      const value = row.querySelector('[data-value-id]');
      expect(value?.getAttribute('data-value-id')).toBe(fieldValueId(SCOPE_KEYS[index] ?? ''));
      expect(value?.querySelector('[data-badge]')).not.toBeNull();
    }
    expect(within(screen.getByRole('region', { name: 'Goals' })).getByRole('group', { name: 'Reduce operating costs' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Automation' })).getByRole('group', { name: 'Security & Access' })).toBeTruthy();
    // A single-choice row keeps its registered label above its value.
    expect(within(screen.getByRole('region', { name: 'Operations' })).queryAllByRole('group').every((group) => group.getAttribute('data-layout') !== 'row')).toBe(true);
    const forYou = screen.getByRole('region', { name: 'For you' });
    const outputs = screen.getByRole('region', { name: 'What your proposal will show' });
    expect(forYou.compareDocumentPosition(outputs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const answer = within(forYou).getAllByRole('button', { name: 'Answer it' })[0] as HTMLElement;
    const firstAsk = within(outputs).getAllByRole('button', { name: 'Save' })[0] as HTMLElement;
    expect(answer.compareDocumentPosition(firstAsk) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('US-REVIEW-12 · US-INTAKE-16 AC3 · DR-18: "For you", "SOVITECH will check" and "What your proposal will show" are the page\'s section headings, each a level 2 heading in the kit\'s one section heading role', async () => {
    api();
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    for (const name of ['For you', 'SOVITECH will check', 'What your proposal will show']) {
      const heading = screen.getByRole('heading', { name, level: 2 });
      expect(heading.classList.contains('sov-heading-section')).toBe(true);
      expect(screen.getByRole('region', { name }).contains(heading)).toBe(true);
    }
  });

  it('G7-12 · US-INTAKE-15 AC5 · rule 7: a skipped multi-select reads "You can provide this later." once, under its question\'s rows, never once per option; each option still reads as served', async () => {
    api();
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const systems = screen.getByRole('region', { name: 'Systems' });
    const lines = within(systems).getAllByText(PROVIDE_LATER.text);
    expect(lines).toHaveLength(1);
    const line = lines[0]?.closest('[data-line]') as HTMLElement;
    expect(line.getAttribute('data-line')).toBe(PROVIDE_LATER.id);
    expect(line.closest('[data-value-id]')).toBeNull();
    const rows = [...systems.querySelectorAll('[data-value-id]')];
    expect(rows).toHaveLength(SCOPE_KEYS.length);
    expect(rows.every((row) => (row.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0)).toBe(true);
    expect(rows.every((row) => row.textContent?.includes('TEST not provided'))).toBe(true);
    // Elsewhere the line shows only inside the area's own value (a skipped question of one field keeps it on its row).
    const elsewhere = screen.getAllByText(PROVIDE_LATER.text).filter((element) => !systems.contains(element));
    expect(elsewhere.length).toBeGreaterThan(0);
    expect(elsewhere.every((element) => element.closest('[data-value-id]')?.getAttribute('data-value-id') === AREA_ID)).toBe(true);
  });

  it('US-INTAKE-16 AC2 · AC3 · §5-8 · rule 10 · 2.8 "They are also the only ones used" · G10-11 (web half) · V-2: an investment output is named by its served stage label, bound, never by a catalogue paraphrase; other outputs keep their names', async () => {
    api();
    renderAt(STEP8);
    const label = await screen.findByText(CAPEX_LABEL_TEXT);
    expect(label.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_LABEL);
    const outputs = screen.getByRole('region', { name: 'What your proposal will show' });
    expect(outputs.textContent).not.toContain('Investment estimate from');
    expect(within(outputs).getByText('Energy use per year')).toBeTruthy();
  });

  it('G10-11 (web half) · rule 7 `first_estimate` row · rule 10 stage 1 · US-INTAKE-16 AC1: with every dataset gate closed, the Proposal card says the output is a preliminary proposal (never "Ready to generate") and names no stage: it shows the served "Not available yet" line of the investment output the served stage names, bound, with its Add action', async () => {
    api({ stageLabel: 'TEST preliminary estimate stage label', stage2: 'not_available_yet' });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const proposal = screen.getByRole('region', { name: 'Proposal' });
    expect(proposal.textContent).toContain('preliminary proposal');
    expect(document.body.textContent).not.toContain('Ready to generate');
    expect(proposal.textContent).not.toContain('TEST preliminary estimate stage label');
    expect(proposal.textContent).not.toContain(CAPEX_STAGE2_LABEL_TEXT);
    expect(proposal.querySelector(`[data-value-id="${PROPOSAL_STAGE}"]`)).toBeNull();
    expect(within(proposal).getByText(CAPEX_STAGE2_MISSING).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_STAGE2_LINE);
    expect(within(proposal).getByText('TEST still reading line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(STILL_READING);
    // The output list keeps naming the output by its served stage label, with the same line.
    const outputs = screen.getByRole('region', { name: 'What your proposal will show' });
    expect(within(outputs).getByText(CAPEX_STAGE2_LABEL_TEXT).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_STAGE2_LABEL);
    expect(within(outputs).getByText(CAPEX_STAGE2_MISSING).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_STAGE2_LINE);
    // The card's action to add the missing item leads to its inline ask (rule 7: "with the missing item and an action to add it").
    fireEvent.click(within(proposal).getByRole('button', { name: CAPEX_STAGE2_ADD }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: AREA_BOX }));
  });

  it('R-003 · R-012 · US-INTAKE-16 AC3 · US-INTAKE-17 AC2 · G7-11 · rule 7 (web half): with the gross floor area the only input missing, the Proposal card shows the served line that names it beside the datasets, bound, with "Add gross floor area", the action the outputs carry; it focuses the area\'s ask, and once Generate skipped the ask it leads to the Building card\'s Edit', async () => {
    // As the API serves it (tests/api/wizard-proposal-card.test.ts): the stage 2 output's line names the datasets and the area.
    const served = 'Not available yet: SOVITECH point templates; SOVITECH cost ranges and benchmarks; gross floor area';
    const addArea = { kind: 'add' as const, field: refOf('building.grossFloorArea'), label: 'Add gross floor area', step: 8 as const };
    const onlyArea = (asks: boolean): Handler => () => {
      const response = step8View({ stageLabel: 'TEST preliminary estimate stage label', stage2: 'not_available_yet' });
      const displayObjects = response.displayObjects.map((display) =>
        display.valueId === CAPEX_STAGE2_LINE ? { ...display, text: served, actions: [addArea] } : display.valueId === CAPEX_LINE ? { ...display, actions: [addArea] } : display,
      );
      const inlineAsks = asks ? response.view.proposal.inlineAsks.filter((ask) => ask.questionId === 'q.building.grossFloorArea') : [];
      return json(200, { ...response, displayObjects, view: { ...response.view, proposal: { ...response.view.proposal, inlineAsks } } });
    };
    api({ view: onlyArea(true) });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const proposal = screen.getByRole('region', { name: 'Proposal' });
    expect(within(proposal).getByText(served).closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_STAGE2_LINE);
    const outputs = screen.getByRole('region', { name: 'What your proposal will show' });
    // The card's Add is the outputs' Add: the same served action, on the card and on each output that names the area.
    expect(within(outputs).getAllByRole('button', { name: 'Add gross floor area' })).toHaveLength(2);
    fireEvent.click(within(proposal).getByRole('button', { name: 'Add gross floor area' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: AREA_BOX }));

    // After "Generate without it" the ask is not served: the card still names the area, and its Add leads to the Building card's Edit.
    cleanup();
    vi.unstubAllGlobals();
    api({ view: onlyArea(false) });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const again = screen.getByRole('region', { name: 'Proposal' });
    expect(within(again).getByText(served)).toBeTruthy();
    fireEvent.click(within(again).getByRole('button', { name: 'Add gross floor area' }));
    expect(document.activeElement?.getAttribute('data-edit-card')).toBe('building');
  });

  it('G10-11 (web half) · rule 10 · 2.8: once the investment output of the served stage is served as a range, the Proposal card names that stage label, as served and bound, and no "Not available yet" line', async () => {
    api({ stageLabel: 'TEST preliminary estimate stage label', stage2: 'range' });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const proposal = screen.getByRole('region', { name: 'Proposal' });
    expect(within(proposal).getByText('TEST preliminary estimate stage label').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(PROPOSAL_STAGE);
    expect(proposal.querySelector('.sov-not-available')).toBeNull();
  });

  it('G10-11 (web half) · rule 7 `first_estimate` row · rule 10 stage 1: a served stage 1 names "Indicative range" on the card only while the benchmark output is served as a range; while it is not, the card shows its served line instead', async () => {
    api({ stageLabel: 'TEST indicative stage label', stageLabelId: 'indicative_range', indicative: 'range' });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const proposal = screen.getByRole('region', { name: 'Proposal' });
    expect(within(proposal).getByText('TEST indicative stage label').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(PROPOSAL_STAGE);
    cleanup();
    vi.unstubAllGlobals();
    api({ stageLabel: 'TEST indicative stage label', stageLabelId: 'indicative_range' });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const again = screen.getByRole('region', { name: 'Proposal' });
    expect(again.textContent).not.toContain('TEST indicative stage label');
    expect(within(again).getByText('TEST not available: a dataset and the area').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(CAPEX_LINE);
  });

  it('US-INTAKE-16 AC2 · rule 10 · 2.8: with no stage served, the Proposal card names none and shows no output line of its own', async () => {
    api({ stage2: 'not_available_yet' });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const proposal = screen.getByRole('region', { name: 'Proposal' });
    expect(proposal.querySelector('.sov-not-available')).toBeNull();
    expect(proposal.querySelector('[data-line="preliminary_investment_estimate"], [data-line="indicative_range"]')).toBeNull();
  });

  it('US-INTAKE-16 AC2 · rule 10 · 2.8: a `proposal.stage` line (served only while a figure can be produced) shows on the Proposal card as served', async () => {
    const stage = { id: 'preliminary_investment_estimate', kind: 'stage_label' as const, text: 'TEST preliminary estimate stage label' };
    api({ stage });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const proposal = screen.getByRole('region', { name: 'Proposal' });
    expect(within(proposal).getByText(stage.text).closest('[data-line]')?.getAttribute('data-line')).toBe(stage.id);
  });

  it('US-INTAKE-16 AC3 · F-PROPOSAL-07 · rule 7: each output is named, with its served "Not available yet" line bound; an owner input\'s "Add" brings its inline ask into view and focus', async () => {
    api();
    renderAt(STEP8);
    await screen.findByText(CAPEX_LABEL_TEXT);
    expect(screen.getByText('Energy use per year')).toBeTruthy();
    expect(bound('TEST not available: a dataset and the area')).toBe(CAPEX_LINE);
    fireEvent.click(screen.getByRole('button', { name: 'TEST add the area' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: AREA_BOX }));
  });
});

describe('phase 5 DR-1 · R-012 · rule 7 ("names what is missing and offers the action"): every served Add on step 8', () => {
  it('DR-1: an output whose line names three owner inputs offers the three served Adds in served order, on the outputs list and on the Proposal card; each is described by its own output\'s name or the card\'s title', async () => {
    const adds = [
      { kind: 'add' as const, field: refOf('building.grossFloorArea'), label: 'TEST add the area', step: 8 as const },
      { kind: 'add' as const, field: refOf('building.type'), label: 'TEST add the type', step: 8 as const },
      { kind: 'add' as const, field: refOf('project.scope.hvac'), label: 'TEST add the systems', step: 8 as const },
    ];
    api({
      view: () => {
        const response = step8View({ stageLabel: 'TEST preliminary estimate stage label', stage2: 'not_available_yet' });
        const displayObjects = response.displayObjects.map((display) => (display.valueId === CAPEX_LINE || display.valueId === CAPEX_STAGE2_LINE ? { ...display, actions: adds } : display));
        return json(200, { ...response, displayObjects });
      },
    });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const outputs = screen.getByRole('region', { name: 'What your proposal will show' });
    const line = outputs.querySelector(`[data-value-id="${CAPEX_LINE}"]`) as HTMLElement;
    expect(within(line).getAllByRole('button').map((button) => button.textContent)).toEqual(['TEST add the area', 'TEST add the type', 'TEST add the systems']);
    const typeAdds = within(outputs).getAllByRole('button', { name: 'TEST add the type' });
    expect(typeAdds.map((button) => document.getElementById(button.getAttribute('aria-describedby') ?? '')?.textContent)).toEqual([CAPEX_LABEL_TEXT, CAPEX_STAGE2_LABEL_TEXT]);
    const proposal = screen.getByRole('region', { name: 'Proposal' });
    const cardAdds = within(proposal).getAllByRole('button', { name: /^TEST add the/u });
    expect(cardAdds.map((button) => button.textContent)).toEqual(['TEST add the area', 'TEST add the type', 'TEST add the systems']);
    for (const button of cardAdds) expect(document.getElementById(button.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Proposal');
  });
});

describe('US-INTAKE-17 · R-003: step 8 inline asks', () => {
  it('US-INTAKE-17 AC3 · AC7 · G8-21 (web half): the ask reads its served sentence inline; a number the API refuses as ambiguous shows the refusal and nothing else changes', async () => {
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(422, { code: 'number_ambiguous' }) });
    renderAt(STEP8);
    await screen.findByText('TEST ask for the area');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: AREA_BOX }), { target: { value: 'TEST reading' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'What it measures' }), { target: { value: 'gross_total' } });
    const ask = screen.getByText('TEST ask for the area').closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(ask).getByRole('button', { name: 'Save' }));
    await screen.findByText('This number can be read more than one way. Write it again so it can be read only as you mean it.');
    expect(seen.find((request) => request.path.endsWith('/fields/edit'))?.body).toEqual({
      field: refOf('building.grossFloorArea'),
      value: { kind: 'quantity', raw: 'TEST reading', qualifier: 'gross_total' },
      corrects: [],
    });
  });

  it('US-INTAKE-17 AC3 · rule 8 "Every value states what it measures" · DR-5: the gross floor area box is named with its unit\'s name from the catalogue, and the unit\'s symbol is not written beside it (P-3-INPUT-UNIT-SYMBOL)', async () => {
    api();
    renderAt(STEP8);
    const box = await screen.findByRole('textbox', { name: 'Gross floor area, in square metres' });
    const ask = box.closest('[data-inline-ask]') as HTMLElement;
    expect(ask.textContent).not.toContain('TEST unit');
    expect(ask.textContent).not.toContain('m²');
  });

  it('US-INTAKE-17 AC7 · rule 8: a basis the registry requires is asked before saving; nothing is sent without it', async () => {
    const seen = api();
    renderAt(STEP8);
    await screen.findByText('TEST ask for the area');
    fireEvent.change(screen.getByRole('textbox', { name: AREA_BOX }), { target: { value: 'TEST reading' } });
    const ask = screen.getByText('TEST ask for the area').closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(ask).getByRole('button', { name: 'Save' }));
    expect(within(ask).getByText('Choose what this value measures.')).toBeTruthy();
    expect(seen.some((request) => request.path.endsWith('/fields/edit'))).toBe(false);
  });

  it('US-INTAKE-17 AC4 · 2.1: an answered choice ask is stored as the owner\'s answer and the step reads its view again', async () => {
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(200, { displayObjects: [] }) });
    renderAt(STEP8);
    const ask = (await screen.findByText('TEST ask for the type')).closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(ask).getByRole('radio', { name: 'Hotel' }));
    fireEvent.click(within(ask).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8'))).toHaveLength(2));
    expect(seen.find((request) => request.path.endsWith('/fields/edit'))?.body).toEqual({ field: refOf('building.type'), value: { kind: 'choice', choice: 'hotel' }, corrects: [] });
  });

  it('US-INTAKE-17 AC4 · 2.6 · R-051 interim: the systems ask saves one decision per system, ticked or not, from the served options; with none ticked it says so and sends nothing', async () => {
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(200, { displayObjects: [] }) });
    renderAt(STEP8);
    const ask = (await screen.findByText('TEST ask for the systems')).closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(ask).getByRole('button', { name: 'Save' }));
    expect(within(ask).getByText('Tick at least one system, or choose Generate without it.')).toBeTruthy();
    fireEvent.click(within(ask).getByRole('checkbox', { name: 'HVAC' }));
    fireEvent.click(within(ask).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(seen.filter((request) => request.path.endsWith('/fields/edit'))).toHaveLength(SCOPE_KEYS.length));
    const writes = seen.filter((request) => request.path.endsWith('/fields/edit')).map((request) => request.body as { field: { fieldKey: string }; value: { choice: string } });
    expect(writes.find((write) => write.field.fieldKey === 'project.scope.hvac')?.value.choice).toBe('include');
    expect(writes.filter((write) => write.value.choice === 'exclude')).toHaveLength(SCOPE_KEYS.length - 1);
  });

  it('US-INTAKE-17 AC4 · rule 4 · G4-5 (web half) · A-1: the inline ask names the candidates the page showed as `corrects`; a 409 `shown_value_changed` reads the step again, says so beside the alert icon, and keeps what the owner typed', async () => {
    const base = step8View();
    const shown = {
      ...base,
      displayObjects: base.displayObjects.map((display) =>
        display.valueId === AREA_ID
          ? {
              ...display,
              actions: [
                {
                  kind: 'edit' as const,
                  field: refOf('building.grossFloorArea'),
                  input: { kind: 'quantity' as const, unit: { code: 'm2', symbol: 'TEST unit' }, qualifiers: ['gross_total'], qualifierRequired: true },
                  shownCandidateIds: [CANDIDATE_A],
                },
              ],
            }
          : display,
      ),
    };
    const seen = api({ view: () => json(200, shown) }, { [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(409, { code: 'shown_value_changed' }) });
    renderAt(STEP8);
    const ask = (await screen.findByText('TEST ask for the area')).closest('[data-inline-ask]') as HTMLElement;
    fireEvent.change(within(ask).getByRole('textbox', { name: AREA_BOX }), { target: { value: 'TEST typed area' } });
    fireEvent.change(within(ask).getByRole('combobox', { name: 'What it measures' }), { target: { value: 'gross_total' } });
    fireEvent.click(within(ask).getByRole('button', { name: 'Save' }));
    const message = await within(ask).findByText('This value changed since the page showed it. The page shows it again now.');
    expect(message.closest('.sov-field-error')?.querySelector('svg.lucide-circle-alert')).not.toBeNull();
    expect(seen.find((request) => request.path.endsWith('/fields/edit'))?.body).toEqual({
      field: refOf('building.grossFloorArea'),
      value: { kind: 'quantity', raw: 'TEST typed area', qualifier: 'gross_total' },
      corrects: [CANDIDATE_A],
    });
    await waitFor(() => expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8'))).toHaveLength(2));
    expect((screen.getByRole('textbox', { name: AREA_BOX }) as HTMLInputElement).value).toBe('TEST typed area');
    // The ask is still served, so it says so itself, once; the step adds no second message.
    expect(screen.getAllByText('This value changed since the page showed it. The page shows it again now.')).toHaveLength(1);
    expect(document.querySelector('[data-changed-ask]')).toBeNull();
  });

  it('A-1 · rule 4 · rule 7: a Save refused as changed (409 `shown_value_changed`) whose view read again no longer serves the ask says so where the asks are, beside the alert icon, and keeps saying so while the owner stays on the step', async () => {
    const base = step8View();
    const filled = {
      ...base,
      displayObjects: base.displayObjects.map((display): DisplayObject =>
        display.valueId === AREA_ID
          ? { valueId: AREA_ID, kind: 'field', text: 'TEST area from another tab', shape: 'value', badge: { id: 'provided_by_you', label: 'TEST provided badge' }, measure: { label: 'TEST gross floor area' }, field: refOf('building.grossFloorArea') }
          : display,
      ),
      view: { ...base.view, proposal: { ...base.view.proposal, inlineAsks: base.view.proposal.inlineAsks.filter((ask) => ask.questionId !== 'q.building.grossFloorArea') } },
    };
    let edits = 0;
    const seen = api(
      { view: () => json(200, edits > 0 ? filled : base) },
      {
        [`POST /api/projects/${PROJECT}/fields/edit`]: () => {
          edits += 1;
          return edits === 1 ? json(409, { code: 'shown_value_changed' }) : json(200, { displayObjects: [] });
        },
      },
    );
    renderAt(STEP8);
    const ask = (await screen.findByText('TEST ask for the area')).closest('[data-inline-ask]') as HTMLElement;
    fireEvent.change(within(ask).getByRole('textbox', { name: AREA_BOX }), { target: { value: 'TEST typed area' } });
    fireEvent.change(within(ask).getByRole('combobox', { name: 'What it measures' }), { target: { value: 'gross_total' } });
    fireEvent.click(within(ask).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByText('TEST ask for the area')).toBeNull());
    const message = screen.getByText('This value changed since the page showed it. The page shows it again now.');
    const alert = message.closest('[role="alert"]') as HTMLElement;
    expect(alert.hasAttribute('data-changed-ask')).toBe(true);
    expect(alert.querySelector('svg.lucide-circle-alert')).not.toBeNull();
    expect(within(screen.getByRole('region', { name: 'What your proposal will show' })).getByText(message.textContent ?? '')).toBe(message);
    expect(screen.getAllByText('TEST area from another tab').length).toBeGreaterThan(0);
    // Another answer on the step reads the view again; the message stays until the owner leaves the step.
    const type = screen.getByText('TEST ask for the type').closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(type).getByRole('radio', { name: 'Hotel' }));
    fireEvent.click(within(type).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(sentTo(seen, 'GET', '/steps/8')).toBe(3));
    expect(screen.getAllByText('This value changed since the page showed it. The page shows it again now.')).toHaveLength(1);
  });

  it("US-INTAKE-17 AC4 · rule 4 · A-1 · DR-20: a missing field's ask sends no candidate as `corrects`, and a refused systems ask says so beside the alert icon", async () => {
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(403, { code: 'owner_only' }) });
    renderAt(STEP8);
    const ask = (await screen.findByText('TEST ask for the systems')).closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(ask).getByRole('checkbox', { name: 'HVAC' }));
    fireEvent.click(within(ask).getByRole('button', { name: 'Save' }));
    const alert = await within(ask).findByRole('alert');
    expect(alert.textContent).toBe("Only the project's owner can change this answer.");
    expect(alert.querySelector('svg.lucide-circle-alert')).not.toBeNull();
    expect((seen.find((request) => request.path.endsWith('/fields/edit'))?.body as { corrects: unknown }).corrects).toEqual([]);
  });

  it('US-INTAKE-17 AC1 · AC2 · G7-10 (web half) · rule 7 "Skip means skip": "Generate without it" skips each ask left unanswered once, from step 8, then generates', async () => {
    const seen = api();
    const { router } = renderAt(STEP8);
    const ask = (await screen.findByText('TEST ask for the area')).closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(ask).getByRole('button', { name: 'Generate without it' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/proposal`));
    expect(seen.filter((request) => request.path.endsWith('/fields/skip')).map((request) => request.body)).toEqual([
      { questionId: 'q.building.grossFloorArea', step: 8 },
      { questionId: 'q.building.type', step: 8 },
      { questionId: 'q.project.systemsInScope', step: 8 },
    ]);
    expect(seen.some((request) => request.method === 'POST' && request.path.endsWith('/steps/8/continue'))).toBe(true);
  });
});

describe('US-REVIEW-11 · US-REVIEW-12 · G7-5 · R-046: "For you" and "SOVITECH will check" on step 8', () => {
  it('G7-5 · US-REVIEW-12 AC1 · AC2 · AC7: the owner count, the top three items and "and <n> more" are each bound to their served value ids; "SOVITECH will check" shows one bound line per group', async () => {
    api();
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    expect(bound('TEST owner count line')).toBe(OWNER_COUNT);
    expect(bound('TEST and more line')).toBe(OWNER_MORE);
    expect(bound('TEST engineer group line')).toBe(ENGINEER_LINE);
    const forYou = screen.getByRole('region', { name: 'For you' });
    expect(within(forYou).getAllByRole('listitem').filter((item) => item.parentElement?.parentElement === forYou)).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'SOVITECH will check' }).textContent).toContain('TEST engineer group line');
  });

  it('US-REVIEW-11 AC2 · AC3 · F-REVIEW-04 · rule 4: a conflict put to the owner shows each value with its source, and "Choose this value" posts the owner\'s choice', async () => {
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/resolve-conflict`]: () => json(200, { displayObjects: [] }) });
    renderAt(STEP8);
    await screen.findAllByText('TEST documents say and you entered');
    const forYou = screen.getByRole('region', { name: 'For you' });
    expect(within(forYou).getByText('TEST documents say and you entered')).toBeTruthy();
    expect(within(forYou).getByText('TEST source of the first value')).toBeTruthy();
    const second = within(forYou).getByText('TEST value you entered').closest('li') as HTMLElement;
    fireEvent.click(within(second).getByRole('button', { name: 'Choose this value' }));
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/fields/resolve-conflict'))).toBe(true));
    expect(seen.find((request) => request.path.endsWith('/fields/resolve-conflict'))?.body).toEqual({ field: refOf('project.occupancy'), chosenCandidateId: CANDIDATE_B });
    expect(forYou.querySelector(`[data-value-id="${CHOICE_B}"]`)).not.toBeNull();
    expect(forYou.querySelector(`[data-value-id="${OCCUPANCY_ID}"]`)).not.toBeNull();
  });

  it('US-REVIEW-11 AC2 · US-REVIEW-12 · rule 4 · 2.8 · V-5: a conflict item and a removed-source item carry no heading of their own (their served badge and line say it); the other items keep theirs', async () => {
    const removed: DisplayObject = {
      valueId: fieldValueId('building.floors'),
      kind: 'field',
      text: 'TEST floors value',
      shape: 'value',
      badge: { id: 'from_document', label: 'TEST document badge' },
      measure: { label: 'TEST floors' },
      lines: [{ id: 'source_document_removed', kind: 'status_line', text: 'TEST source document removed line' }],
      actions: [editOf('building.floors', ['x'], [CANDIDATE_A])],
      field: refOf('building.floors'),
    };
    const base = step8View();
    const [conflict, area] = base.view.forYou.items;
    const view = {
      ...base,
      displayObjects: [...base.displayObjects.filter((display) => display.valueId !== removed.valueId), removed],
      view: {
        ...base.view,
        forYou: {
          ...base.view.forYou,
          items: [conflict, { itemId: 'source_document_removed:building.floors', reason: 'source_document_removed' as const, concerns: removed.valueId }, area].filter((item) => item !== undefined),
        },
      },
    };
    api({ view: () => json(200, view) });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const forYou = screen.getByRole('region', { name: 'For you' });
    expect(forYou.textContent).not.toContain('The sources disagree');
    expect(forYou.textContent).not.toContain('The document this came from was removed');
    expect(within(forYou).getAllByText('TEST two values').length).toBeGreaterThan(0);
    expect(within(forYou).getByText('TEST documents say and you entered')).toBeTruthy();
    expect(within(forYou).getByText('TEST source document removed line').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(removed.valueId);
    expect(within(forYou).getByText('Your estimate needs this')).toBeTruthy();
  });

  it('rule 4 "Routing" · rule 7 · V-5: a choice refused because the conflict went to the engineer queue reads the step again with no sentence of its own; nothing is blocked', async () => {
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/resolve-conflict`]: () => json(403, { code: 'routed_to_engineer' }) });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const forYou = screen.getByRole('region', { name: 'For you' });
    const second = within(forYou).getByText('TEST value you entered').closest('li') as HTMLElement;
    fireEvent.click(within(second).getByRole('button', { name: 'Choose this value' }));
    await waitFor(() => expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8'))).toHaveLength(2));
    expect(within(screen.getByRole('region', { name: 'For you' })).queryByRole('alert')).toBeNull();
    expect(document.body.textContent).not.toContain('A SOVITECH engineer settles this one.');
    expect(screen.getByRole('button', { name: 'Generate Proposal' }).hasAttribute('disabled')).toBe(false);
  });

  it('US-REVIEW-12 AC6 · rule 7: a missing first-estimate item names its field and leads to its inline ask; the systems item is named by its question', async () => {
    api();
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const forYou = screen.getByRole('region', { name: 'For you' });
    expect(within(forYou).getByText('Which systems should be included?')).toBeTruthy();
    const answer = within(forYou).getAllByRole('button', { name: 'Answer it' });
    fireEvent.click(answer[0] as HTMLElement);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: AREA_BOX }));
  });
});

describe('US-INTAKE-16 · US-INTAKE-18 · UD-35 · R-003: Generate and step 8\'s states', () => {
  it('US-INTAKE-16 AC4 · AC5 · US-INTAKE-18 AC4 · rule 7: with open items, asks and files still being read, "Generate Proposal" is enabled, skips the asks left open once and opens the proposal page', async () => {
    const seen = api();
    const { router } = renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const generate = screen.getByRole('button', { name: 'Generate Proposal' });
    expect(generate.hasAttribute('disabled')).toBe(false);
    fireEvent.click(generate);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/proposal`));
    expect(seen.filter((request) => request.path.endsWith('/fields/skip'))).toHaveLength(3);
  });

  it('US-INTAKE-18 AC1 · UD-35 (loading) · rule 1: while the summary loads, the cards show their titles and no figure, and Back and Generate stay enabled', async () => {
    api({ view: () => new Promise<Response>(() => undefined) });
    renderAt(STEP8);
    await screen.findByRole('heading', { name: 'Building', level: 2 });
    // The step's own content (the stepper's step numbers and the header's date are the render allowlist's).
    const step = document.querySelector('section[aria-labelledby="step-title"]');
    expect(step).not.toBeNull();
    expect(/\p{N}/u.test(step?.textContent ?? '')).toBe(false);
    expect(screen.getByRole('button', { name: 'Generate Proposal' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(false);
    expect(document.body.hasAttribute('data-render-ready')).toBe(false);
  });

  it('US-INTAKE-18 AC3 · UD-35 (error) · DR-6: a summary that cannot load shows no value and no "Everything ready?" banner, offers "Try again", and keeps Back and Generate', async () => {
    let calls = 0;
    const seen = api({
      view: () => {
        calls += 1;
        return calls === 1 ? json(500, { code: 'internal_error' }) : json(200, step8View());
      },
    });
    renderAt(STEP8);
    await screen.findByText('Your summary could not be loaded. Your answers are kept. Try again, or go back a step.');
    expect(document.querySelector('section[aria-labelledby="step-title"] [data-value-id]')).toBeNull();
    // DR-6: the "Everything ready?" banner would read as untrue over a summary that did not load.
    expect(screen.queryByText('Everything ready?')).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Generate Proposal' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('TEST owner count line');
    expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8'))).toHaveLength(2);
    expect(screen.getByText('Everything ready?')).toBeTruthy();
  });

  it('US-INTAKE-18 AC4 · UD-35 (incomplete data): with no inline ask left, Generate sends only the step\'s Continue', async () => {
    const seen = api({ asks: false });
    const { router } = renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/proposal`));
    expect(seen.some((request) => request.path.endsWith('/fields/skip'))).toBe(false);
  });

  it('US-INTAKE-16 AC5 · rule 7 · DR-20: a Generate that fails says so beside the alert icon, keeps the owner on step 8 and Generate enabled', async () => {
    const seen = api({ asks: false }, { [`POST /api/projects/${PROJECT}/steps/8/continue`]: () => json(500, { code: 'internal_error' }) });
    const { router } = renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    fireEvent.click(screen.getByRole('button', { name: 'Generate Proposal' }));
    const message = await screen.findByText('The proposal could not be opened. Your answers are kept. Try again.');
    const alert = message.closest('[role="alert"]') as HTMLElement;
    expect(alert.querySelector('svg.lucide-circle-alert')).not.toBeNull();
    expect(router.state.location.pathname).toBe(STEP8);
    expect(screen.getByRole('button', { name: 'Generate Proposal' }).hasAttribute('disabled')).toBe(false);
    expect(seen.filter((request) => request.path.endsWith('/steps/8/continue'))).toHaveLength(1);
  });

  it('G10-10 · US-REVIEW-03 AC1 (web side): the demo line shows on step 8 of the demo project', async () => {
    api({ demo: true });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    expect(screen.getByText('TEST demo line')).toBeTruthy();
  });
});

describe('US-REVIEW-05 · US-INTAKE-19 · rule 5 · rule 7: acting on step 8 items, and late findings on step 8', () => {
  /** Step 8 with one "For you" item: the building type found as an inference, with its served confirmation. */
  function withConfirmation() {
    const base = step8View({ asks: false });
    const typeId = fieldValueId('building.type');
    const found: DisplayObject = {
      valueId: typeId,
      kind: 'field',
      text: 'TEST hotel value',
      shape: 'value',
      badge: { id: 'possible', label: 'TEST possible badge' },
      measure: { label: 'TEST building type' },
      sourceLine: { id: 'guest_rooms_in', kind: 'source_line', text: 'TEST source line' },
      actions: [
        editOf('building.type', BUILDING_TYPE_OPTIONS, [CANDIDATE_A]),
        { kind: 'confirm', candidateId: CANDIDATE_A, wording: { id: 'yes_building_type', kind: 'rule_line', text: 'TEST yes it is a hotel' } },
      ],
      field: refOf('building.type'),
    };
    return {
      ...base,
      displayObjects: [...base.displayObjects.filter((display) => display.valueId !== typeId), found],
      view: { ...base.view, forYou: { count: base.view.forYou.count, items: [{ itemId: 'confirmation:building.type', reason: 'confirmation' as const, concerns: typeId }], more: null } },
    };
  }

  it('US-REVIEW-05 AC4 · US-INTAKE-07 AC5 · rule 5: a confirmation item shows the served wording with Yes and Edit; Yes posts its candidate and the step reads its view again', async () => {
    const seen = api({ view: () => json(200, withConfirmation()) }, { [`POST /api/projects/${PROJECT}/fields/confirm`]: () => json(200, { displayObjects: [] }) });
    renderAt(STEP8);
    await screen.findByText('TEST yes it is a hotel');
    const forYou = screen.getByRole('region', { name: 'For you' });
    expect(within(forYou).getByText('Check what we found')).toBeTruthy();
    fireEvent.click(within(forYou).getByRole('button', { name: 'Yes' }));
    await waitFor(() => expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8'))).toHaveLength(2));
    expect(seen.find((request) => request.path.endsWith('/fields/confirm'))?.body).toEqual({ candidateId: CANDIDATE_A });
  });

  it('US-REVIEW-07 · rule 4 · G4-5 (web half): Edit on an item opens the inline editor, whose save names the candidates the page showed as `corrects`', async () => {
    const seen = api({ view: () => json(200, withConfirmation()) }, { [`POST /api/projects/${PROJECT}/fields/edit`]: () => json(200, { displayObjects: [] }) });
    renderAt(STEP8);
    await screen.findByText('TEST yes it is a hotel');
    const forYou = screen.getByRole('region', { name: 'For you' });
    fireEvent.click(within(forYou).getByRole('button', { name: 'Edit' }));
    fireEvent.click(within(forYou).getByRole('radio', { name: 'Office' }));
    fireEvent.click(within(forYou).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(seen.some((request) => request.path.endsWith('/fields/edit'))).toBe(true));
    expect(seen.find((request) => request.path.endsWith('/fields/edit'))?.body).toEqual({ field: refOf('building.type'), value: { kind: 'choice', choice: 'office' }, corrects: [CANDIDATE_A] });
  });

  it('rule 4 · rule 7 · DR-20: a choice refused because the conflict was already settled says so inline, beside the alert icon, and reads the step again; nothing else is blocked', async () => {
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/resolve-conflict`]: () => json(409, { code: 'conflict_not_open' }) });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const forYou = screen.getByRole('region', { name: 'For you' });
    const second = within(forYou).getByText('TEST value you entered').closest('li') as HTMLElement;
    fireEvent.click(within(second).getByRole('button', { name: 'Choose this value' }));
    const message = await screen.findByText('This value changed since the page showed it. The page shows it again now.');
    expect(message.closest('[role="alert"]')?.querySelector('svg.lucide-circle-alert')).not.toBeNull();
    await waitFor(() => expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8'))).toHaveLength(2));
    expect(screen.getByRole('button', { name: 'Generate Proposal' }).hasAttribute('disabled')).toBe(false);
  });

  it('A-1 · A-7 · rule 7 · section 8: "Yes" on a "For you" item pressed twice before the page renders again sends one confirmation; until the step has read its view again a further press sends nothing, then Yes takes presses again; it is never disabled', async () => {
    const confirm = heldHandler(() => json(200, { displayObjects: [] }));
    const seen = api({ view: () => json(200, withConfirmation()) }, { [`POST /api/projects/${PROJECT}/fields/confirm`]: confirm.handler });
    renderAt(STEP8);
    await screen.findByText('TEST yes it is a hotel');
    const yes = () => within(screen.getByRole('region', { name: 'For you' })).getByRole('button', { name: 'Yes' });
    pressTwice(yes());
    await settle();
    expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(1);
    expect(yes().hasAttribute('disabled')).toBe(false);
    fireEvent.click(yes());
    await settle();
    expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(1);
    confirm.answer();
    await waitFor(() => expect(sentTo(seen, 'GET', '/steps/8')).toBe(2));
    await settle();
    fireEvent.click(yes());
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(2));
  });

  it('V-8 · ADR 0039 decision 11 · rule 7: while a "For you" item\'s Yes is on its way, the item\'s actions say so with aria-busy (the kit\'s Value `busy`), are never disabled and send nothing, then take presses again once the step has read its view again', async () => {
    const confirm = heldHandler(() => json(200, { displayObjects: [] }));
    const seen = api({ view: () => json(200, withConfirmation()) }, { [`POST /api/projects/${PROJECT}/fields/confirm`]: confirm.handler });
    renderAt(STEP8);
    await screen.findByText('TEST yes it is a hotel');
    const forYou = () => screen.getByRole('region', { name: 'For you' });
    fireEvent.click(within(forYou()).getByRole('button', { name: 'Yes' }));
    await settle();
    expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(1);
    for (const name of ['Yes', 'Edit']) {
      const button = within(forYou()).getByRole('button', { name });
      expect(button.getAttribute('aria-busy'), name).toBe('true');
      expect(button.hasAttribute('disabled'), name).toBe(false);
    }
    fireEvent.click(within(forYou()).getByRole('button', { name: 'Edit' }));
    expect(within(forYou()).queryByRole('button', { name: 'Save' })).toBeNull();
    confirm.answer();
    await waitFor(() => expect(sentTo(seen, 'GET', '/steps/8')).toBe(2));
    await waitFor(() => expect(within(forYou()).getByRole('button', { name: 'Yes' }).getAttribute('aria-busy')).toBe('false'));
  });

  it('A-1 · rule 4 · rule 7: "Choose this value" pressed twice, or both values pressed, while the choice is on its way sends one choice; the choices take presses again once the step has read its view again', async () => {
    const resolve = heldHandler(() => json(200, { displayObjects: [] }));
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/resolve-conflict`]: resolve.handler });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const choose = (text: string) => within(within(screen.getByRole('region', { name: 'For you' })).getByText(text).closest('li') as HTMLElement).getByRole('button', { name: 'Choose this value' });
    pressTwice(choose('TEST value you entered'));
    fireEvent.click(choose('TEST value from a document'));
    await settle();
    expect(sentTo(seen, 'POST', '/fields/resolve-conflict')).toBe(1);
    expect(choose('TEST value you entered').getAttribute('aria-busy')).toBe('true');
    expect(choose('TEST value you entered').hasAttribute('disabled')).toBe(false);
    resolve.answer();
    await waitFor(() => expect(sentTo(seen, 'GET', '/steps/8')).toBe(2));
    await waitFor(() => expect(choose('TEST value you entered').getAttribute('aria-busy')).toBe('false'));
    fireEvent.click(choose('TEST value you entered'));
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/resolve-conflict')).toBe(2));
  });

  it('A-1 · rule 4 · rule 7: Save in a "For you" item\'s inline editor pressed twice sends one correction and shows aria-busy while it is on its way; after a refusal it takes a press again', async () => {
    const edit = heldHandler(() => json(422, { code: 'answer_invalid' }));
    const seen = api({ view: () => json(200, withConfirmation()) }, { [`POST /api/projects/${PROJECT}/fields/edit`]: edit.handler });
    renderAt(STEP8);
    await screen.findByText('TEST yes it is a hotel');
    const forYou = screen.getByRole('region', { name: 'For you' });
    fireEvent.click(within(forYou).getByRole('button', { name: 'Edit' }));
    fireEvent.click(within(forYou).getByRole('radio', { name: 'Office' }));
    const save = within(forYou).getByRole('button', { name: 'Save' });
    pressTwice(save);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/edit')).toBe(1);
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.hasAttribute('disabled')).toBe(false);
    edit.answer();
    await waitFor(() => expect(save.getAttribute('aria-busy')).toBe('false'));
    fireEvent.click(save);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/edit')).toBe(2));
  });

  it('G7-4 · US-INTAKE-19 AC2 · AC3 · rule 7: a late finding while the owner is on step 8 shows one quiet notice and reads the lists again in place; no dialog opens and the answer being typed in an inline ask is kept', async () => {
    const notice: DisplayObject = { valueId: `project:${PROJECT}.lateFindings.notice`, kind: 'line', text: 'TEST late notice', shape: 'value' };
    let polls = 0;
    const seen = api({}, {
      [`GET /api/projects/${PROJECT}/late-findings`]: () => {
        polls += 1;
        return polls === 1 ? json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }) : json(200, { asOf: AS_OF, displayObjects: [notice], dots: [3], notice: notice.valueId });
      },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt(STEP8);
    const input = await screen.findByRole('textbox', { name: AREA_BOX });
    fireEvent.change(input, { target: { value: 'TEST typed answer' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await screen.findByText('TEST late notice');
    await waitFor(() => expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/8')).length).toBeGreaterThanOrEqual(2));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect((screen.getByRole('textbox', { name: AREA_BOX }) as HTMLInputElement).value).toBe('TEST typed answer');
  });
});

describe('A-1 · A-7 · rule 7 · section 8: one request per press on step 8', () => {
  it('A-7 · G7-10 (web half) · rule 7: Generate pressed twice before the page renders again skips each open ask once and sends one Continue; it shows aria-busy while that is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const generated = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = api({}, { [`POST /api/projects/${PROJECT}/steps/8/continue`]: generated.handler });
    renderAt(STEP8);
    await screen.findByText('TEST owner count line');
    const generate = screen.getByRole('button', { name: 'Generate Proposal' });
    pressTwice(generate);
    await settle();
    expect(seen.filter((request) => request.path.endsWith('/fields/skip')).map((request) => (request.body as { questionId: string }).questionId)).toEqual(['q.building.grossFloorArea', 'q.building.type', 'q.project.systemsInScope']);
    expect(sentTo(seen, 'POST', '/steps/8/continue')).toBe(1);
    expect(generate.getAttribute('aria-busy')).toBe('true');
    expect(generate.hasAttribute('disabled')).toBe(false);
    // "Generate without it" is the same press: ignored while Generate is on its way.
    const ask = screen.getByText('TEST ask for the area').closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(ask).getByRole('button', { name: 'Generate without it' }));
    await settle();
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(3);
    expect(sentTo(seen, 'POST', '/steps/8/continue')).toBe(1);
    generated.answer();
    await screen.findByText('The proposal could not be opened. Your answers are kept. Try again.');
    expect(generate.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(generate);
    await waitFor(() => expect(sentTo(seen, 'POST', '/steps/8/continue')).toBe(2));
  });

  it('A-1 · US-INTAKE-17 AC4 · rule 7: an inline ask\'s Save pressed twice before the page renders again sends one answer; Save shows aria-busy while it is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const edit = heldHandler(() => json(422, { code: 'answer_invalid' }));
    const seen = api({}, { [`POST /api/projects/${PROJECT}/fields/edit`]: edit.handler });
    renderAt(STEP8);
    const ask = (await screen.findByText('TEST ask for the type')).closest('[data-inline-ask]') as HTMLElement;
    fireEvent.click(within(ask).getByRole('radio', { name: 'Hotel' }));
    const save = within(ask).getByRole('button', { name: 'Save' });
    pressTwice(save);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/edit')).toBe(1);
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.hasAttribute('disabled')).toBe(false);
    edit.answer();
    await within(ask).findByText('This answer could not be read. Check it and save again.');
    expect(save.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(save);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/edit')).toBe(2));
  });
});
