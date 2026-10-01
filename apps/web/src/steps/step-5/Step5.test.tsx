import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayObject, Question } from '@sovitech/view-model/browser';
import { AS_OF, PROJECT, envelope, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler } from '../../test/harness';
import {
  BUILDING_TYPE_OPTIONS,
  CANDIDATE_A,
  CANDIDATE_B,
  DOCUMENT,
  HASH,
  OCCUPANCY_OPTIONS,
  PROVIDE_LATER,
  SCHEDULE_OPTIONS,
  editOf,
  fieldValueId,
  notProvided,
  refOf,
  singleQuestion,
} from '../../review/test-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const STEP5 = `/projects/${PROJECT}/steps/5`;

/** The building type as a found fact: an inference with its TEST badge, source line, evidence and served confirmation. */
const FOUND_TYPE: DisplayObject = {
  valueId: fieldValueId('building.type'),
  kind: 'field',
  text: 'TEST hotel value',
  shape: 'value',
  badge: { id: 'possible', label: 'TEST possible badge' },
  measure: { label: 'TEST building type' },
  sourceLine: { id: 'guest_rooms_in', kind: 'source_line', text: 'TEST source line' },
  evidence: [{ documentId: DOCUMENT, contentHash: HASH, excerpt: 'TEST excerpt' }],
  actions: [
    editOf('building.type', BUILDING_TYPE_OPTIONS, [CANDIDATE_A]),
    { kind: 'confirm', candidateId: CANDIDATE_A, wording: { id: 'yes_building_type', kind: 'rule_line', text: 'TEST yes it is a hotel' } },
  ],
  field: refOf('building.type'),
};

function questions(overrides: { readonly type?: Partial<Question>; readonly schedule?: Partial<Question>; readonly occupancy?: Partial<Question> } = {}): Question[] {
  return [
    singleQuestion('q.building.type', 'building.type', BUILDING_TYPE_OPTIONS, overrides.type),
    singleQuestion('q.project.operatingSchedule', 'project.operatingSchedule', SCHEDULE_OPTIONS, overrides.schedule),
    singleQuestion('q.project.occupancy', 'project.occupancy', OCCUPANCY_OPTIONS, overrides.occupancy),
  ];
}

const DISPLAYS: DisplayObject[] = [
  notProvided('project.operatingSchedule', 'TEST schedule', SCHEDULE_OPTIONS),
  notProvided('project.occupancy', 'TEST occupancy', OCCUPANCY_OPTIONS),
];

function stepFive(list: Question[], displays: DisplayObject[] = DISPLAYS, demo = false) {
  return { ...envelope(PROJECT, displays, { demo }), view: { step: 5, questions: list } };
}

function api(view: () => unknown, extra: Readonly<Record<string, Handler>> = {}, demo = false) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project', demo }])),
    [`GET /api/projects/${PROJECT}/steps/5`]: () => json(200, view()),
    [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    [`POST /api/projects/${PROJECT}/steps/5/continue`]: () => json(200, { nextStep: 6, displayObjects: [] }),
    ...extra,
  });
}

function continueBody(seen: readonly { method: string; path: string; body: unknown }[]) {
  return seen.find((request) => request.method === 'POST' && request.path.endsWith('/steps/5/continue'))?.body;
}

describe('US-INTAKE-05 · US-INTAKE-06 · US-INTAKE-07 · US-INTAKE-08 · R-002: step 5 (OB-5)', () => {
  it('US-INTAKE-08 AC4 · US-INTAKE-12 AC1 · US-INTAKE-05 AC11 · R-006: nothing is preselected, each question shows its wording and reason in the served order, and each unanswered one offers "Skip for now"', async () => {
    api(() => stepFive(questions()));
    renderAt(STEP5);
    await screen.findByRole('radio', { name: 'Hotel' });
    const legends = [...document.querySelectorAll('legend')].map((legend) => legend.textContent);
    expect(legends).toEqual(['What type of building is it?', 'When does it operate?', 'How is it occupied?']);
    expect(screen.getByText('This helps us configure schedules and automation logic.')).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(BUILDING_TYPE_OPTIONS.length + SCHEDULE_OPTIONS.length + OCCUPANCY_OPTIONS.length);
    expect(radios.every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Skip for now' })).toHaveLength(3);
    // The schedule option reads "Around the clock": "24 / 7" cannot show its digits (P-3-RENDER-24-7).
    expect(screen.getByRole('radio', { name: 'Around the clock' })).toBeTruthy();
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });

  it('onboarding-spec 3 step 5 · 2.4 · DR-9 · DR-14 · DR-18: in a 904px column, each question\'s icon sits in its own 56px gutter, and its title (the group label role), helper line, options and "Skip for now" share one left edge, the link placed by the kit under the options', async () => {
    api(() => stepFive(questions()));
    renderAt(STEP5);
    await screen.findByRole('radio', { name: 'Hotel' });
    const step = document.querySelector('section[aria-labelledby="step-title"]') as HTMLElement;
    const groups = within(step).getAllByRole('group').filter((group) => group.tagName === 'FIELDSET');
    expect(groups).toHaveLength(3);
    const column = groups[0]?.parentElement?.parentElement as HTMLElement;
    expect(column.classList.contains('max-w-[904px]')).toBe(true);
    for (const group of groups) {
      const row = group.parentElement as HTMLElement;
      expect(row.classList.contains('grid-cols-[56px_minmax(0,1fr)]')).toBe(true);
      // The icon is the gutter's, never inline with the title: the legend holds the words only.
      const gutter = row.firstElementChild as HTMLElement;
      expect(gutter).not.toBe(group);
      expect(gutter.querySelector('svg')).not.toBeNull();
      const legend = group.querySelector('legend') as HTMLElement;
      expect(legend.querySelector('svg')).toBeNull();
      expect(legend.classList.contains('sov-heading-group')).toBe(true);
      // Title, helper, options and Skip are the fieldset's own children: one left edge, the kit's spacing (DR-14).
      expect(group.querySelector(':scope > .sov-choice-group__hint')).not.toBeNull();
      expect(group.querySelector(':scope > .sov-choice-group__options')).not.toBeNull();
      expect(within(group.querySelector(':scope > .sov-skip') as HTMLElement).getByRole('button', { name: 'Skip for now' })).toBeTruthy();
    }
  });

  it('G7-3 · US-INTAKE-06 AC2 (web half): a question the owner has answered on the page shows no "Skip for now"', async () => {
    api(() => stepFive(questions()));
    renderAt(STEP5);
    fireEvent.click(await screen.findByRole('radio', { name: 'Business hours' }));
    expect((screen.getByRole('radio', { name: 'Business hours' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByRole('button', { name: 'Skip for now' })).toHaveLength(2);
  });

  it('R-011 · R-007 · US-INTAKE-14 AC1 · US-INTAKE-13 AC1: choosing a partial schedule or "Other" opens no follow-up input, and step 5 has no note field', async () => {
    api(() => stepFive(questions()));
    renderAt(STEP5);
    fireEvent.click(await screen.findByRole('radio', { name: 'Business hours' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Other' }));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('US-INTAKE-06 AC3 · F-QUESTION-04 · G7-10 (web half): "Skip for now" posts the skip with its step, and the question then reads "You can provide this later." once, with no link', async () => {
    let skipped = false;
    const seen = api(
      () =>
        stepFive(
          questions(skipped ? { schedule: { state: 'skipped', skip: null, afterSkip: PROVIDE_LATER } } : {}),
        ),
      {
        [`POST /api/projects/${PROJECT}/fields/skip`]: () => {
          skipped = true;
          return json(200, { displayObjects: [] });
        },
      },
    );
    renderAt(STEP5);
    await screen.findByRole('radio', { name: 'Hotel' });
    const schedule = screen.getByRole('group', { name: /When does it operate\?/u });
    fireEvent.click(within(schedule).getByRole('button', { name: 'Skip for now' }));
    await screen.findByText('TEST provide later line');
    expect(seen.find((request) => request.path.endsWith('/fields/skip'))?.body).toEqual({ questionId: 'q.project.operatingSchedule', step: 5 });
    expect(within(screen.getByRole('group', { name: /When does it operate\?/u })).queryByRole('button', { name: 'Skip for now' })).toBeNull();
    expect(screen.getAllByText('TEST provide later line')).toHaveLength(1);
  });

  it('US-INTAKE-06 AC3 · US-INTAKE-08 AC5 · rule 7 "Continue counts as skipping": Continue sends the owner\'s picks as answers and lists every shown question, so the unanswered ones are skipped; then step 6 opens', async () => {
    const seen = api(() => stepFive(questions()));
    const { router } = renderAt(STEP5);
    fireEvent.click(await screen.findByRole('radio', { name: 'Mixed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/6`));
    expect(continueBody(seen)).toEqual({
      answers: [{ field: refOf('project.occupancy'), value: { kind: 'choice', choice: 'mixed' }, corrects: [] }],
      multi: [],
      visibleSuggestions: [],
      shown: { questions: ['q.building.type', 'q.project.operatingSchedule', 'q.project.occupancy'], confirmations: [] },
    });
  });

  it('US-INTAKE-07 AC1 · AC2 · AC4 · AC10 · G7-3 · rule 3 · 2.8 "Prominence" · DR-2: a found building type shows preselected, its value with its badge and source line on its tile through the Value component, the served "Yes, it\'s a hotel", and no "Skip for now"', async () => {
    const found: Partial<Question> = {
      state: 'found',
      options: BUILDING_TYPE_OPTIONS.map((key) => ({ key, selected: key === 'hotel', suggestion: null })),
      found: FOUND_TYPE.valueId,
      skip: null,
    };
    api(() => stepFive(questions({ type: found }), [...DISPLAYS, FOUND_TYPE]));
    renderAt(STEP5);
    const hotel = await screen.findByRole('radio', { name: 'Hotel' });
    expect((hotel as HTMLInputElement).checked).toBe(true);
    const value = screen.getByText('TEST hotel value').closest('[data-value-id]');
    expect(value?.getAttribute('data-value-id')).toBe(FOUND_TYPE.valueId);
    // 2.8 "Prominence" (DR-2): the value, its badge and its source line sit on the Hotel tile's top row, once; no box repeats it.
    expect(value?.closest('.sov-choice-card__status')?.closest('label')).toBe(hotel.closest('label'));
    expect(document.querySelectorAll(`[data-value-id="${FOUND_TYPE.valueId}"]`)).toHaveLength(1);
    expect(within(value as HTMLElement).getByText('TEST possible badge')).toBeTruthy();
    expect(within(value as HTMLElement).getByText('TEST source line')).toBeTruthy();
    const typeGroup = screen.getByRole('group', { name: /What type of building is it\?/u });
    expect(within(typeGroup).queryByRole('button', { name: 'Skip for now' })).toBeNull();
    expect(within(typeGroup).getByRole('button', { name: 'TEST yes it is a hotel' })).toBeTruthy();
    // Building type is a fact: it is never shown as Suggested (rule 3; US-INTAKE-12 AC5).
    expect(screen.queryByText(/suggested/iu)).toBeNull();
  });

  it('US-INTAKE-08 AC5 · 2.8 "Prominence" · DR-2: a stored answer sits on its own tile, once, with its badge on the tile\'s top row; picking another tile shows no stored badge until Continue', async () => {
    const stored: DisplayObject = {
      valueId: fieldValueId('project.operatingSchedule'),
      kind: 'field',
      text: 'TEST business hours value',
      shape: 'value',
      badge: { id: 'provided_by_you', label: 'TEST provided badge' },
      measure: { label: 'TEST schedule' },
      actions: [editOf('project.operatingSchedule', SCHEDULE_OPTIONS, [CANDIDATE_A])],
      field: refOf('project.operatingSchedule'),
    };
    const schedule: Partial<Question> = {
      state: 'answered',
      skip: null,
      found: stored.valueId,
      options: SCHEDULE_OPTIONS.map((key) => ({ key, selected: key === 'business_hours', suggestion: null })),
    };
    api(() => stepFive(questions({ schedule }), [notProvided('project.occupancy', 'TEST occupancy', OCCUPANCY_OPTIONS), stored]));
    renderAt(STEP5);
    const tile = (await screen.findByRole('radio', { name: 'Business hours' })).closest('label') as HTMLElement;
    expect(document.querySelectorAll(`[data-value-id="${stored.valueId}"]`)).toHaveLength(1);
    const status = tile.querySelector('.sov-choice-card__status');
    expect(status?.querySelector(`[data-value-id="${stored.valueId}"]`)?.textContent).toContain('TEST business hours value');
    expect(within(status as HTMLElement).getByText('TEST provided badge')).toBeTruthy();
    expect(status?.querySelector('[data-layout="compact"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Seasonal' }));
    expect(document.querySelector(`[data-value-id="${stored.valueId}"]`)).toBeNull();
  });

  it('US-REVIEW-11 AC2 · rule 4 · 2.8 "Prominence" · DR-2: a building type in conflict (no value active, so no tile chosen) shows once under the tiles, bound, with its Two values badge, its sources and its line; picking a tile and Continue corrects it, naming the candidates the page showed', async () => {
    const conflict: DisplayObject = {
      valueId: fieldValueId('building.type'),
      kind: 'field',
      text: 'TEST hotel or office',
      shape: 'range',
      badge: { id: 'two_values', label: 'TEST two values badge' },
      measure: { label: 'TEST building type' },
      sourceLine: { id: 'conflict_sources', kind: 'source_line', text: 'TEST conflict sources' },
      lines: [{ id: 'conflict_for_owner', kind: 'rule_line', text: 'TEST which is right line' }],
      actions: [editOf('building.type', BUILDING_TYPE_OPTIONS, [CANDIDATE_A, CANDIDATE_B])],
      field: refOf('building.type'),
    };
    const type: Partial<Question> = { state: 'found', found: conflict.valueId, skip: null };
    const seen = api(() => stepFive(questions({ type }), [...DISPLAYS, conflict]));
    renderAt(STEP5);
    const value = (await screen.findByText('TEST hotel or office')).closest('[data-value-id]') as HTMLElement;
    expect(value.getAttribute('data-value-id')).toBe(conflict.valueId);
    expect(document.querySelectorAll(`[data-value-id="${conflict.valueId}"]`)).toHaveLength(1);
    expect(within(value).getByText('TEST two values badge')).toBeTruthy();
    expect(within(value).getByText('TEST conflict sources')).toBeTruthy();
    expect(within(value).getByText('TEST which is right line')).toBeTruthy();
    // Under the tiles of its own question, on no tile (no tile is chosen), and with no "Skip for now".
    const typeGroup = screen.getByRole('group', { name: /What type of building is it\?/u });
    expect(typeGroup.contains(value)).toBe(true);
    expect(value.closest('.sov-choice-card')).toBeNull();
    expect(within(typeGroup).getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(within(typeGroup).queryByRole('button', { name: 'Skip for now' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Office' }));
    expect(document.querySelectorAll(`[data-value-id="${conflict.valueId}"]`)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(seen)).toBeDefined());
    expect(continueBody(seen)).toMatchObject({ answers: [{ field: refOf('building.type'), value: { kind: 'choice', choice: 'office' }, corrects: [CANDIDATE_A, CANDIDATE_B] }] });
  });

  it('US-INTAKE-18 AC1 · UD-35 (loading, steps 5 to 7) · rule 1 · DR-12: while the answers load, the step keeps its frame (the question titles and one outline per option) with one "Loading your answers" line, no digit, and nothing to press but Back and Continue', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/5`]: () => new Promise<Response>(() => undefined),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(STEP5);
    const line = await screen.findByText('Loading your answers');
    expect(line.getAttribute('role')).toBe('status');
    expect(screen.getAllByText('Loading your answers')).toHaveLength(1);
    const step = document.querySelector('section[aria-labelledby="step-title"]') as HTMLElement;
    for (const title of ['What type of building is it?', 'When does it operate?', 'How is it occupied?']) expect(within(step).getByText(title)).toBeTruthy();
    expect(step.querySelectorAll('[aria-hidden="true"] > .border')).toHaveLength(BUILDING_TYPE_OPTIONS.length + SCHEDULE_OPTIONS.length + OCCUPANCY_OPTIONS.length);
    expect(/\p{N}/u.test(step.textContent ?? '')).toBe(false);
    expect(within(step).queryAllByRole('radio')).toHaveLength(0);
    expect(within(step).queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(false);
  });

  it('US-INTAKE-07 AC5 · F-QUESTION-02: "Yes, it\'s a hotel" posts the served confirmation\'s candidate and reads the step again', async () => {
    const found: Partial<Question> = {
      state: 'found',
      options: BUILDING_TYPE_OPTIONS.map((key) => ({ key, selected: key === 'hotel', suggestion: null })),
      found: FOUND_TYPE.valueId,
      skip: null,
    };
    const seen = api(() => stepFive(questions({ type: found }), [...DISPLAYS, FOUND_TYPE]), {
      [`POST /api/projects/${PROJECT}/fields/confirm`]: () => json(200, { displayObjects: [] }),
    });
    renderAt(STEP5);
    fireEvent.click(await screen.findByRole('button', { name: 'TEST yes it is a hotel' }));
    await waitFor(() => expect(seen.filter((request) => request.method === 'GET' && request.path.endsWith('/steps/5'))).toHaveLength(2));
    expect(seen.find((request) => request.path.endsWith('/fields/confirm'))?.body).toEqual({ candidateId: CANDIDATE_A });
  });

  it('US-INTAKE-07 AC6 · G4-5 · rule 4 "A correction is a resolution": tapping another tile and Continue sends the owner\'s type with the candidates the page showed as `corrects`, and the confirmation is no longer shown or listed', async () => {
    const found: Partial<Question> = {
      state: 'found',
      options: BUILDING_TYPE_OPTIONS.map((key) => ({ key, selected: key === 'hotel', suggestion: null })),
      found: FOUND_TYPE.valueId,
      skip: null,
    };
    const seen = api(() => stepFive(questions({ type: found }), [...DISPLAYS, FOUND_TYPE]));
    renderAt(STEP5);
    fireEvent.click(await screen.findByRole('radio', { name: 'Office' }));
    expect(screen.queryByRole('button', { name: 'TEST yes it is a hotel' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(seen)).toBeDefined());
    expect(continueBody(seen)).toEqual({
      answers: [{ field: refOf('building.type'), value: { kind: 'choice', choice: 'office' }, corrects: [CANDIDATE_A] }],
      multi: [],
      visibleSuggestions: [],
      shown: { questions: ['q.project.operatingSchedule', 'q.project.occupancy'], confirmations: [] },
    });
  });

  it('US-INTAKE-07 AC7 · rule 5 "Skip means skip": a shown confirmation left unanswered is listed on Continue (the server records it declined); Continue never confirms the fact', async () => {
    const found: Partial<Question> = {
      state: 'found',
      options: BUILDING_TYPE_OPTIONS.map((key) => ({ key, selected: key === 'hotel', suggestion: null })),
      found: FOUND_TYPE.valueId,
      skip: null,
    };
    const seen = api(() => stepFive(questions({ type: found }), [...DISPLAYS, FOUND_TYPE]));
    renderAt(STEP5);
    await screen.findByRole('button', { name: 'TEST yes it is a hotel' });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(seen)).toBeDefined());
    expect(continueBody(seen)).toMatchObject({ answers: [], shown: { confirmations: [CANDIDATE_A] } });
    expect(seen.some((request) => request.path.endsWith('/fields/confirm'))).toBe(false);
  });

  it('G3-4 · G7-3 · US-INTAKE-12 AC2-AC4 (web half, TEST suggestion): a visible suggestion shows its reason, hides "Skip for now", and Continue reports it left in place', async () => {
    const reason = { id: 'suggested_because', kind: 'rule_line' as const, text: 'TEST suggested reason' };
    const schedule: Partial<Question> = { options: SCHEDULE_OPTIONS.map((key) => ({ key, selected: key === 'business_hours', suggestion: key === 'business_hours' ? { reason } : null })), skip: null };
    const seen = api(() => stepFive(questions({ schedule })));
    renderAt(STEP5);
    expect(((await screen.findByRole('radio', { name: 'Business hours' })) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('TEST suggested reason')).toBeTruthy();
    expect(within(screen.getByRole('group', { name: /When does it operate\?/u })).queryByRole('button', { name: 'Skip for now' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(seen)).toBeDefined());
    expect(continueBody(seen)).toMatchObject({ answers: [], visibleSuggestions: [{ field: refOf('project.operatingSchedule'), choice: 'business_hours' }] });
  });

  it('US-INTAKE-01 AC3 · rule 7: Back and Continue are never disabled; a refused Continue shows inline and keeps the owner\'s picks', async () => {
    api(() => stepFive(questions()), { [`POST /api/projects/${PROJECT}/steps/5/continue`]: () => json(422, { code: 'answer_invalid' }) });
    renderAt(STEP5);
    fireEvent.click(await screen.findByRole('radio', { name: 'Hotel' }));
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next.hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Back' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(next);
    await screen.findByText('This answer could not be read. Check it and save again.');
    expect((screen.getByRole('radio', { name: 'Hotel' }) as HTMLInputElement).checked).toBe(true);
  });

  it('G10-10 · US-REVIEW-03 AC1, AC7 (web side): the demo line shows on step 5 of the demo project and on no other project', async () => {
    api(() => stepFive(questions(), DISPLAYS, true), {}, true);
    renderAt(STEP5);
    await screen.findByText('TEST demo line');
    cleanup();
    vi.unstubAllGlobals();
    api(() => stepFive(questions()));
    renderAt(STEP5);
    await screen.findByRole('radio', { name: 'Hotel' });
    expect(screen.queryByText('TEST demo line')).toBeNull();
  });
});

describe('A-7 · A-1 · rule 7 · section 8: one request per press on step 5', () => {
  it('A-7 · G7-10 (web half) · rule 7: "Skip for now" pressed twice before the page renders again sends one skip; the link shows aria-busy, never disabled, until the answer is in and the view read again', async () => {
    let skipped = false;
    const held = heldHandler(() => {
      skipped = true;
      return json(200, { displayObjects: [] });
    });
    const seen = api(() => stepFive(questions(skipped ? { schedule: { state: 'skipped', skip: null, afterSkip: PROVIDE_LATER } } : {})), { [`POST /api/projects/${PROJECT}/fields/skip`]: held.handler });
    renderAt(STEP5);
    await screen.findByRole('radio', { name: 'Hotel' });
    const skip = within(screen.getByRole('group', { name: /When does it operate\?/u })).getByRole('button', { name: 'Skip for now' });
    pressTwice(skip);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(1);
    expect(skip.getAttribute('aria-busy')).toBe('true');
    expect(skip.hasAttribute('disabled')).toBe(false);
    held.answer();
    await screen.findByText('TEST provide later line');
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(1);
  });

  it('A-1 · rule 5 · rule 7: "Yes, it\'s a hotel" pressed twice sends one confirmation and shows aria-busy while it is on its way; after a refusal it takes a press again', async () => {
    const found: Partial<Question> = {
      state: 'found',
      options: BUILDING_TYPE_OPTIONS.map((key) => ({ key, selected: key === 'hotel', suggestion: null })),
      found: FOUND_TYPE.valueId,
      skip: null,
    };
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = api(() => stepFive(questions({ type: found }), [...DISPLAYS, FOUND_TYPE]), { [`POST /api/projects/${PROJECT}/fields/confirm`]: held.handler });
    renderAt(STEP5);
    const yes = await screen.findByRole('button', { name: 'TEST yes it is a hotel' });
    pressTwice(yes);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(1);
    expect(yes.getAttribute('aria-busy')).toBe('true');
    expect(yes.hasAttribute('disabled')).toBe(false);
    held.answer();
    await waitFor(() => expect(yes.getAttribute('aria-busy')).toBe('false'));
    fireEvent.click(yes);
    await waitFor(() => expect(sentTo(seen, 'POST', '/fields/confirm')).toBe(2));
  });

  it('A-1 · rule 7: Continue pressed twice before the page renders again sends one Continue; it shows aria-busy while that is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = api(() => stepFive(questions()), { [`POST /api/projects/${PROJECT}/steps/5/continue`]: held.handler });
    renderAt(STEP5);
    await screen.findByRole('radio', { name: 'Hotel' });
    const next = screen.getByRole('button', { name: 'Continue' });
    pressTwice(next);
    await settle();
    expect(sentTo(seen, 'POST', '/steps/5/continue')).toBe(1);
    expect(next.getAttribute('aria-busy')).toBe('true');
    expect(next.hasAttribute('disabled')).toBe(false);
    held.answer();
    await waitFor(() => expect(next.getAttribute('aria-busy')).toBe('false'));
    fireEvent.click(next);
    await waitFor(() => expect(sentTo(seen, 'POST', '/steps/5/continue')).toBe(2));
  });
});
