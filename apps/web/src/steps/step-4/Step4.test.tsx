import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Step4ViewSchema, type DisplayObject, type Line } from '@sovitech/view-model/browser';
import { AS_OF, PROJECT, envelope, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler, type Seen } from '../../test/harness';
import { STEP4_SUBTITLES } from './Step4';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e70';
const QUESTION = 'q.project.systemsInScope';
const SYSTEM_IDS = ['hvac', 'lighting', 'energy', 'access_control', 'fire_safety', 'water', 'elevators', 'cctv'] as const;
type SystemId = (typeof SYSTEM_IDS)[number];

const detectionId = (id: SystemId) => `building:${BUILDING}.detection.${id}`;
const decisionId = (id: SystemId) => `project:${PROJECT}.scope.${id}`;
const fieldKey = (id: SystemId) => `project.scope.${id}`;
const REASON: Line = { id: 'suggested_because', kind: 'rule_line', text: 'TEST suggested because a document names it' };

type Detection = 'unknown' | 'possible' | 'from_document';
type Decision = 'missing' | 'suggested' | 'included' | 'excluded';

function detection(id: SystemId, kind: Detection): DisplayObject {
  if (kind === 'unknown') {
    return { valueId: detectionId(id), kind: 'field', text: 'TEST Unknown', shape: 'missing', missing: 'unknown', badge: { id: 'unknown', label: 'TEST Unknown' }, measure: { label: `TEST ${id}` } };
  }
  return {
    valueId: detectionId(id),
    kind: 'field',
    text: `TEST ${id} detection`,
    shape: 'value',
    badge: kind === 'possible' ? { id: 'possible', label: 'TEST Possible' } : { id: 'from_document', label: 'TEST From document' },
    measure: { label: `TEST ${id}` },
    sourceLine: { id: kind === 'possible' ? 'ai_inference' : 'document', kind: 'source_line', text: kind === 'possible' ? 'TEST inferred from a sheet' : 'TEST found in a document' },
  };
}

function decision(id: SystemId, kind: Decision): DisplayObject {
  const base = {
    valueId: decisionId(id),
    kind: 'field' as const,
    measure: { label: `TEST ${id} in scope` },
    field: { subjectId: PROJECT, fieldKey: fieldKey(id) },
    actions: [{ kind: 'edit' as const, field: { subjectId: PROJECT, fieldKey: fieldKey(id) }, input: { kind: 'choice' as const, options: ['include', 'exclude'] }, shownCandidateIds: [] }],
  };
  if (kind === 'missing') return { ...base, text: 'TEST Not provided yet', shape: 'missing', missing: 'not_provided_yet', badge: { id: 'not_provided_yet', label: 'TEST Not provided yet' } };
  if (kind === 'suggested') return { ...base, text: 'TEST Included', shape: 'value', badge: { id: 'suggested', label: 'TEST Suggested' }, lines: [REASON] };
  return { ...base, text: kind === 'included' ? 'TEST Included' : 'TEST Not included', shape: 'value', badge: { id: 'provided_by_you', label: 'TEST Provided by you' } };
}

interface CardSetup {
  readonly detection?: Detection;
  readonly decision?: Decision;
  /** Served `selected` (defaults from the decision). */
  readonly selected?: boolean;
  /** Served suggestion (defaults from the decision). */
  readonly suggestion?: boolean;
}

interface Options {
  readonly cards?: Partial<Record<SystemId, CardSetup>>;
  readonly state?: 'unanswered' | 'answered' | 'skipped';
  readonly subtitle?: keyof typeof STEP4_SUBTITLES;
  readonly demo?: boolean;
}

function stepFour(options: Options = {}) {
  const displays: DisplayObject[] = [];
  const systems = SYSTEM_IDS.map((id) => {
    const setup = options.cards?.[id] ?? {};
    const decisionKind = setup.decision ?? 'missing';
    displays.push(detection(id, setup.detection ?? 'unknown'), decision(id, decisionKind));
    return {
      systemId: id,
      lifeSafety: id === 'fire_safety',
      neverPreselected: id === 'fire_safety' || id === 'access_control' || id === 'elevators',
      detection: detectionId(id),
      decision: decisionId(id),
      selected: setup.selected ?? (decisionKind === 'suggested' || decisionKind === 'included'),
      suggestion: (setup.suggestion ?? decisionKind === 'suggested') ? { reason: REASON } : null,
    };
  });
  const state = options.state ?? (Object.values(options.cards ?? {}).some((card) => card.decision === 'included' || card.decision === 'excluded') ? 'answered' : 'unanswered');
  const anyShown = systems.some((card) => card.selected || card.suggestion !== null);
  return {
    ...envelope(PROJECT, displays, { demo: options.demo === true }),
    view: {
      step: 4,
      subtitle: options.subtitle ?? 'none_named',
      question: {
        questionId: QUESTION,
        state,
        skip: state === 'unanswered' && !anyShown ? { kind: 'skip', questionId: QUESTION } : null,
        afterSkip: state === 'skipped' ? { id: 'provide_later', kind: 'rule_line', text: 'TEST you can provide this later' } : null,
      },
      systems,
    },
  };
}

function api(options: Options = {}, after?: Options) {
  let skipped = false;
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo: options.demo === true }])),
    [`GET /api/projects/${PROJECT}/steps/4`]: () => json(200, stepFour(skipped && after !== undefined ? after : options)),
    [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    [`POST /api/projects/${PROJECT}/steps/4/continue`]: () => json(200, { nextStep: 5, displayObjects: [] }),
    [`POST /api/projects/${PROJECT}/fields/skip`]: () => {
      skipped = true;
      return json(200, { displayObjects: [] });
    },
  });
}

const card = (id: SystemId) => screen.getByRole('checkbox', { name: new RegExp(`^${{ hvac: 'HVAC', lighting: 'Lighting', energy: 'Energy', access_control: 'Access Control', fire_safety: 'Fire Safety', water: 'Water', elevators: 'Elevators', cctv: 'CCTV' }[id]}$`, 'u') });
const cardLabel = (id: SystemId) => card(id).closest('label') as HTMLElement;
const continueBody = (seen: readonly Seen[]) => seen.find((request) => request.path.endsWith('/steps/4/continue'))?.body;

describe('US-SCOPE-01 · US-SCOPE-02 · US-SCOPE-03 · R-051: step 4 (OB-4)', () => {
  it('US-SCOPE-01 AC8 · AC10 · §5-4a · rule 12: eight cards with real checkboxes, each detection bound with its served badge; no "Detected" or "Optional", and no copy claiming a detection', async () => {
    api();
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'HVAC' });
    expect(screen.getAllByRole('checkbox')).toHaveLength(8);
    for (const id of SYSTEM_IDS) {
      const element = cardLabel(id).querySelector(`[data-value-id="${detectionId(id)}"]`);
      expect(element?.textContent, id).toContain('TEST Unknown');
    }
    expect(screen.queryByText(/\bDetected\b|\bOptional\b/u)).toBeNull();
    expect(screen.queryByText("We've detected the following systems in your documents.")).toBeNull();
    expect(screen.getByText('Each card shows what your documents say about that system.')).toBeTruthy();
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });

  it('US-SCOPE-01 AC1 · AC2 · G3-2 · rule 3: a named system reads From document with its source; an inferred one reads the served Possible with its line, as a possibility, never as a fact', async () => {
    api({ cards: { hvac: { detection: 'possible' }, lighting: { detection: 'from_document' } }, subtitle: 'systems_named' });
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'HVAC' });
    const hvac = cardLabel('hvac').querySelector(`[data-value-id="${detectionId('hvac')}"]`) as HTMLElement;
    expect(within(hvac).getByText('TEST Possible')).toBeTruthy();
    expect(within(hvac).getByText('TEST inferred from a sheet')).toBeTruthy();
    const lighting = cardLabel('lighting').querySelector(`[data-value-id="${detectionId('lighting')}"]`) as HTMLElement;
    expect(within(lighting).getByText('TEST found in a document')).toBeTruthy();
    expect(screen.getByText("We've detected the following systems in your documents.")).toBeTruthy();
    // A detection is not a decision: neither card is ticked by it (US-SCOPE-02 AC7).
    expect((card('hvac') as HTMLInputElement).checked).toBe(false);
  });

  it('G3-4 · US-SCOPE-02 AC1 · AC3 · AC5 · rule 3: a visible Suggested card is ticked with its reason, shows no Skip, and Continue reports it left in place; unticked, it is no longer reported', async () => {
    const seen = api({ cards: { hvac: { detection: 'from_document', decision: 'suggested' } } });
    const { router } = renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'HVAC' });
    expect((card('hvac') as HTMLInputElement).checked).toBe(true);
    const decisionElement = cardLabel('hvac').querySelector(`[data-value-id="${decisionId('hvac')}"]`) as HTMLElement;
    expect(within(decisionElement).getByText('TEST Suggested')).toBeTruthy();
    expect(within(decisionElement).getByText('TEST suggested because a document names it')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/5`));
    expect(continueBody(seen)).toEqual({
      answers: [],
      multi: [{ questionId: QUESTION, ticked: [fieldKey('hvac')] }],
      visibleSuggestions: [{ field: { subjectId: PROJECT, fieldKey: fieldKey('hvac') }, choice: 'include' }],
      shown: { questions: [QUESTION], confirmations: [] },
    });

    cleanup();
    vi.unstubAllGlobals();
    const again = api({ cards: { hvac: { detection: 'from_document', decision: 'suggested' } } });
    renderAt(`/projects/${PROJECT}/steps/4`);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'HVAC' }));
    expect((card('hvac') as HTMLInputElement).checked).toBe(false);
    expect(cardLabel('hvac').querySelector(`[data-value-id="${decisionId('hvac')}"]`)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(again)).toBeDefined());
    expect(continueBody(again)).toMatchObject({ multi: [{ questionId: QUESTION, ticked: [] }], visibleSuggestions: [] });
  });

  it('rule 11 · US-SCOPE-02 AC2 · US-SCOPE-03 AC1 · G11-9 (screen side): Fire Safety is never ticked or Suggested by the page, even when served so, and reads the monitoring-only text; Access Control and Elevators are not preselected either', async () => {
    const seen = api({
      cards: {
        fire_safety: { detection: 'from_document', decision: 'suggested', selected: true, suggestion: true },
        access_control: { detection: 'from_document', decision: 'suggested', selected: true, suggestion: true },
        elevators: { detection: 'from_document', decision: 'suggested', selected: true, suggestion: true },
      },
    });
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'Fire Safety' });
    for (const id of ['fire_safety', 'access_control', 'elevators'] as const) {
      expect((card(id) as HTMLInputElement).checked, id).toBe(false);
      expect(within(cardLabel(id)).queryByText('TEST Suggested'), id).toBeNull();
    }
    // DR-15: the card's description starts in capitals like every other card; its words are §5-4b's.
    expect(within(cardLabel('fire_safety')).getByText('Monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system.')).toBeTruthy();
    expect(screen.queryByText(/\b(compliant|complies|meets|conforms)\b/iu)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(seen)).toBeDefined());
    expect(continueBody(seen)).toMatchObject({ multi: [{ questionId: QUESTION, ticked: [] }], visibleSuggestions: [] });
  });

  it('US-SCOPE-03 AC1 · rule 11: Fire Safety ticked by the owner is sent as the owner\'s tick, and an owner\'s stored include reads its served Provided by you', async () => {
    const seen = api({ cards: { fire_safety: { detection: 'from_document', decision: 'included' } } });
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'Fire Safety' });
    expect((card('fire_safety') as HTMLInputElement).checked).toBe(true);
    expect(within(cardLabel('fire_safety')).getByText('TEST Provided by you')).toBeTruthy();
    fireEvent.click(card('hvac'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(seen)).toBeDefined());
    expect(continueBody(seen)).toMatchObject({ multi: [{ questionId: QUESTION, ticked: [fieldKey('hvac'), fieldKey('fire_safety')] }], visibleSuggestions: [] });
  });

  it('G7-3 · G7-10 (web half) · US-SCOPE-02 AC3 · AC4 · rule 7: with nothing ticked or suggested "Skip for now" shows; ticking a card hides it; pressing it records the skip, naming step 4, and "You can provide this later." shows once', async () => {
    const seen = api({}, { state: 'skipped' });
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'HVAC' });
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();
    fireEvent.click(card('cctv'));
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
    fireEvent.click(card('cctv'));
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(seen.find((request) => request.path.endsWith('/fields/skip'))?.body).toEqual({ questionId: QUESTION, step: 4 }));
    expect(await screen.findByText('TEST you can provide this later')).toBeTruthy();
    expect(screen.getAllByText('TEST you can provide this later')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
  });

  it('US-SCOPE-02 AC4 · AC6 · rule 7: Continue with nothing ticked sends the question as shown with no tick (a skip on the server, never an exclusion of every system), is never disabled and opens step 5', async () => {
    const seen = api();
    const { router } = renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'HVAC' });
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next.hasAttribute('disabled')).toBe(false);
    fireEvent.click(next);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/5`));
    expect(continueBody(seen)).toEqual({ answers: [], multi: [{ questionId: QUESTION, ticked: [] }], visibleSuggestions: [], shown: { questions: [QUESTION], confirmations: [] } });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('US-SCOPE-02 AC7 · AC9 · rule 3: ticking changes only the decision (the detection keeps its served badge); a card the owner changes shows only its tick until Continue', async () => {
    const seen = api({ cards: { lighting: { detection: 'from_document', decision: 'included' } } });
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'Lighting' });
    fireEvent.click(card('lighting'));
    expect((card('lighting') as HTMLInputElement).checked).toBe(false);
    expect(cardLabel('lighting').querySelector(`[data-value-id="${decisionId('lighting')}"]`)).toBeNull();
    expect(within(cardLabel('lighting').querySelector(`[data-value-id="${detectionId('lighting')}"]`) as HTMLElement).getByText('TEST From document')).toBeTruthy();
    expect(seen.some((request) => request.method === 'POST')).toBe(false);
  });

  it('DR-2 · 2.8 "Prominence" · G2-7: the stored decision shows once, through Value in the compact layout, in the card\'s top-row status slot with "In your documents"; no "Your choice" row', async () => {
    api({ cards: { hvac: { detection: 'from_document', decision: 'included' }, water: { decision: 'excluded' } } });
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'HVAC' });
    for (const id of ['hvac', 'water'] as const) {
      const slot = cardLabel(id).querySelector('.sov-choice-card__top .sov-choice-card__status') as HTMLElement;
      const decisionElement = slot.querySelector(`[data-value-id="${decisionId(id)}"]`);
      expect(decisionElement, id).not.toBeNull();
      expect(decisionElement?.closest('.sov-field-value')?.getAttribute('data-layout')).toBe('compact');
      expect(within(decisionElement as HTMLElement).getByText('TEST Provided by you')).toBeTruthy();
      const detectionElement = slot.querySelector(`[data-value-id="${detectionId(id)}"]`);
      expect(detectionElement?.closest('.sov-field-value')?.getAttribute('data-layout')).toBe('compact');
      expect(within(slot).getByText('In your documents')).toBeTruthy();
      expect(cardLabel(id).querySelectorAll(`[data-value-id="${decisionId(id)}"]`)).toHaveLength(1);
    }
    expect(within(cardLabel('water').querySelector(`[data-value-id="${decisionId('water')}"]`) as HTMLElement).getByText('TEST Not included')).toBeTruthy();
    expect(screen.queryByText('Your choice')).toBeNull();
    // Nothing stored and nothing suggested: the slot holds the detection only.
    expect(cardLabel('cctv').querySelector(`[data-value-id="${decisionId('cctv')}"]`)).toBeNull();
    expect(cardLabel('cctv').querySelector(`.sov-choice-card__status [data-value-id="${detectionId('cctv')}"]`)).not.toBeNull();
  });

  it('DR-12 · prompt 3 section 11: while the view loads, the title, the instruction, eight card outlines and the banner stay, with one "Loading your answers" line and no card, tick or badge', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/4`]: () => new Promise<Response>(() => undefined),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/steps/4`);
    expect(await screen.findByText('Loading your answers')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Which systems should be included?' })).toBeTruthy();
    expect(screen.getByText('Select the systems you want to include in the BMS scope.')).toBeTruthy();
    expect(document.querySelectorAll('main .min-h-\\[168px\\]')).toHaveLength(8);
    expect(screen.getByText('Some systems are optional or may require additional documentation. You can adjust these selections later.')).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(document.querySelector('main [data-value-id]')).toBeNull();
  });

  it('A-1 · rule 4: Continue refused as out of date says so and reads the view again; the owner\'s ticks stay', async () => {
    let views = 0;
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/4`]: () => {
        views += 1;
        return json(200, stepFour());
      },
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`POST /api/projects/${PROJECT}/steps/4/continue`]: () => json(409, { code: 'shown_value_changed' }),
    });
    renderAt(`/projects/${PROJECT}/steps/4`);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Water' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('This value changed since the page showed it. The page shows it again now.')).toBeTruthy();
    await waitFor(() => expect(views).toBe(2));
    expect((card('water') as HTMLInputElement).checked).toBe(true);
  });

  it('DR-25 · US-SCOPE-01 AC10 · rule 12: each subtitle key the API serves reads its own sentence and no other; a project with no document reads that nothing was read from documents, never what its documents say', async () => {
    // The sentence the page shows for the API's `no_documents` key (a project with no document).
    expect(STEP4_SUBTITLES.no_documents).toBe('No documents were uploaded, so no system was read from them.');
    // Every key the contract lets the API serve, `no_documents` included (ADR 0036 decision 11).
    expect(Step4ViewSchema.shape.subtitle.options).toContain('no_documents');
    for (const subtitle of Step4ViewSchema.shape.subtitle.options) {
      api({ subtitle });
      renderAt(`/projects/${PROJECT}/steps/4`);
      await screen.findByRole('checkbox', { name: 'HVAC' });
      expect(screen.getByText(STEP4_SUBTITLES[subtitle]), subtitle).toBeTruthy();
      const others = Object.entries(STEP4_SUBTITLES).filter(([key]) => key !== subtitle);
      for (const [key, sentence] of others) expect(screen.queryByText(sentence), `${subtitle} shows ${key}`).toBeNull();
      cleanup();
      vi.unstubAllGlobals();
    }
  });

  it('DR-14 · G7-3 · rule 7: "Skip for now" sits right under the grid in the kit\'s one placement (the kit\'s SkipForNow spacing, at the grid\'s left edge), and the line after a skip takes the same place', async () => {
    api({}, { state: 'skipped' });
    renderAt(`/projects/${PROJECT}/steps/4`);
    const skip = await screen.findByRole('button', { name: 'Skip for now' });
    const holder = skip.closest('.sov-skip') as HTMLElement;
    const grid = holder.previousElementSibling as HTMLElement;
    // The element right before it is the grid of the eight cards, in the same fieldset, so it starts
    // at the grid's left edge; no wrapper of the page's adds space or alignment of its own.
    expect(grid.querySelectorAll('input[type="checkbox"]')).toHaveLength(8);
    expect(holder.parentElement).toBe(grid.parentElement);
    expect(holder.parentElement?.tagName).toBe('FIELDSET');
    expect(holder.className).toBe('sov-skip');
    fireEvent.click(skip);
    const line = await screen.findByText('TEST you can provide this later');
    const lineHolder = line.closest('.sov-skip') as HTMLElement;
    expect(lineHolder.previousElementSibling?.querySelectorAll('input[type="checkbox"]')).toHaveLength(8);
    expect(lineHolder.className).toBe('sov-skip');
  });

  it('US-SCOPE-01 AC13 · US-SCOPE-02 AC10 · GS-1: the demo project shows the served demo line on step 4; another project shows none', async () => {
    api({ demo: true });
    renderAt(`/projects/${PROJECT}/steps/4`);
    expect(await screen.findByText('TEST demo line')).toBeTruthy();
    cleanup();
    vi.unstubAllGlobals();
    api();
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'HVAC' });
    expect(screen.queryByText('TEST demo line')).toBeNull();
  });
});

describe('A-7 · A-1 · rule 7 · section 8: one request per press on step 4 (the final verification of phase 3, new problem 1)', () => {
  /** Step 4's routes with the skip and Continue answered by the handlers given; the view reads skipped once a skip was answered 200. */
  function heldApi(handlers: { readonly skip?: Handler; readonly next?: Handler }) {
    let skipped = false;
    const skip = handlers.skip;
    return installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/4`]: () => json(200, stepFour(skipped ? { state: 'skipped' } : {})),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
      [`POST /api/projects/${PROJECT}/steps/4/continue`]: handlers.next ?? (() => json(200, { nextStep: 5, displayObjects: [] })),
      [`POST /api/projects/${PROJECT}/fields/skip`]: async (request) => {
        const answer = skip === undefined ? json(200, { displayObjects: [] }) : await skip(request);
        if (answer.status === 200) skipped = true;
        return answer;
      },
    });
  }

  it('A-7 · G7-10 (web half) · rule 7: "Skip for now" pressed twice before the page renders again sends one skip; the link shows aria-busy, never disabled, until the answer is in and the view read again, which shows "You can provide this later." once', async () => {
    const held = heldHandler(() => json(200, { displayObjects: [] }));
    const seen = heldApi({ skip: held.handler });
    renderAt(`/projects/${PROJECT}/steps/4`);
    const skip = await screen.findByRole('button', { name: 'Skip for now' });
    pressTwice(skip);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(1);
    expect(skip.getAttribute('aria-busy')).toBe('true');
    expect(skip.hasAttribute('disabled')).toBe(false);
    fireEvent.click(skip);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(1);
    held.answer();
    expect(await screen.findByText('TEST you can provide this later')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(1);
    expect(seen.find((request) => request.path.endsWith('/fields/skip'))?.body).toEqual({ questionId: QUESTION, step: 4 });
  });

  it('A-7 · rule 7: a skip that is refused leaves the link taking presses again (nobody is left blocked), and the next press sends one more skip', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = heldApi({ skip: held.handler });
    renderAt(`/projects/${PROJECT}/steps/4`);
    const skip = await screen.findByRole('button', { name: 'Skip for now' });
    pressTwice(skip);
    await settle();
    held.answer();
    await screen.findByText('Skipping did not save. Try again.');
    expect(skip.getAttribute('aria-busy')).toBe('false');
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(1);
    fireEvent.click(skip);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/skip')).toBe(2));
  });

  it('A-1 · rule 7: Continue pressed twice before the page renders again sends one Continue; it shows aria-busy while that is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = heldApi({ next: held.handler });
    renderAt(`/projects/${PROJECT}/steps/4`);
    await screen.findByRole('checkbox', { name: 'HVAC' });
    const next = screen.getByRole('button', { name: 'Continue' });
    pressTwice(next);
    await settle();
    expect(sentTo(seen, 'POST', '/steps/4/continue')).toBe(1);
    expect(next.getAttribute('aria-busy')).toBe('true');
    expect(next.hasAttribute('disabled')).toBe(false);
    held.answer();
    await screen.findByText('This step could not be saved. Your other answers are kept. Try again.');
    expect(next.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(next);
    await waitFor(() => expect(sentTo(seen, 'POST', '/steps/4/continue')).toBe(2));
  });
});
