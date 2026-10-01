import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayObject, Question } from '@sovitech/view-model/browser';
import { routes } from '../../routes';
import { AS_OF, PROJECT, envelope, heldHandler, installFakeApi, json, pressTwice, projectList, renderAt, sentTo, settle, type Handler } from '../../test/harness';
import { AREAS, GOALS, PROVIDE_LATER, fieldValueId, multiQuestion, notProvided, refOf } from '../../review/test-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const GOAL_KEYS = GOALS.map((id) => `project.goal.${id}`);
const AREA_KEYS = AREAS.map((id) => `project.automation.${id}`);
const NOTICE: DisplayObject = { valueId: `project:${PROJECT}.lateFindings.notice`, kind: 'line', text: 'TEST late notice', shape: 'value' };

function goalsQuestion(overrides: Partial<Question> = {}): Question {
  return multiQuestion('q.project.goals', 'project.goal', GOALS, overrides);
}

function view(step: 6 | 7, question: Question, displays: DisplayObject[]) {
  return { ...envelope(PROJECT, displays), view: { step, question } };
}

const GOAL_DISPLAYS = GOAL_KEYS.map((key) => notProvided(key, `TEST goal ${key}`, ['selected', 'not_selected']));
const AREA_DISPLAYS = AREA_KEYS.map((key) => notProvided(key, `TEST area ${key}`, ['selected', 'not_selected']));

function api(step: 6 | 7, body: () => unknown, extra: Readonly<Record<string, Handler>> = {}) {
  return installFakeApi({
    'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
    [`GET /api/projects/${PROJECT}/steps/${String(step)}`]: () => json(200, body()),
    [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    [`POST /api/projects/${PROJECT}/steps/${String(step)}/continue`]: () => json(200, { nextStep: step + 1, displayObjects: [] }),
    ...extra,
  });
}

function continueBody(seen: readonly { method: string; path: string; body: unknown }[], step: number) {
  return seen.find((request) => request.method === 'POST' && request.path.endsWith(`/steps/${String(step)}/continue`))?.body;
}

describe('US-INTAKE-09 · R-002 · R-006: step 6 goals (OB-6)', () => {
  it('US-INTAKE-09 AC1 · AC5 · AC6 · R-006 · R-007 · R-011: the seven registered goals as real checkboxes, none preselected, no "Other" card, no note field, and "Skip for now" under the question', async () => {
    api(6, () => view(6, goalsQuestion(), GOAL_DISPLAYS));
    renderAt(`/projects/${PROJECT}/steps/6`);
    await screen.findByRole('checkbox', { name: 'Reduce energy consumption' });
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(7);
    expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true);
    expect(screen.queryByRole('checkbox', { name: 'Other' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();
    // "Not provided yet" is the question's state, said by its Skip link, not repeated on every card.
    expect(screen.queryByText('TEST not provided')).toBeNull();
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));
  });

  it('US-INTAKE-09 AC3 · G7-8 (web half): Continue with nothing ticked sends the question whole with no option ticked, so the server records a skip, never a decision against every goal', async () => {
    const seen = api(6, () => view(6, goalsQuestion(), GOAL_DISPLAYS));
    const { router } = renderAt(`/projects/${PROJECT}/steps/6`);
    await screen.findByRole('checkbox', { name: 'Reduce energy consumption' });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/7`));
    expect(continueBody(seen, 6)).toEqual({
      answers: [],
      multi: [{ questionId: 'q.project.goals', ticked: [] }],
      visibleSuggestions: [],
      shown: { questions: ['q.project.goals'], confirmations: [] },
    });
  });

  it('US-INTAKE-09 AC2 · G7-3 (web half): ticking goals hides "Skip for now", and Continue sends the ticked decision fields', async () => {
    const seen = api(6, () => view(6, goalsQuestion(), GOAL_DISPLAYS));
    renderAt(`/projects/${PROJECT}/steps/6`);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Reduce energy consumption' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Reduce operating costs' }));
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(seen, 6)).toBeDefined());
    expect(continueBody(seen, 6)).toMatchObject({ multi: [{ questionId: 'q.project.goals', ticked: ['project.goal.reduce_energy', 'project.goal.reduce_operating_costs'] }] });
  });

  it('US-INTAKE-09 AC2 · rule 2 · 2.8 "Prominence" · DR-2: a stored decision shows on its card\'s top row through the Value component, bound to its value id, once, with no "Skip for now" on the answered question', async () => {
    const key = 'project.goal.lower_carbon';
    const stored: DisplayObject = {
      valueId: fieldValueId(key),
      kind: 'field',
      text: 'TEST selected',
      shape: 'value',
      badge: { id: 'provided_by_you', label: 'TEST provided badge' },
      measure: { label: 'TEST goal' },
      field: refOf(key),
    };
    const question = goalsQuestion({
      state: 'answered',
      skip: null,
      options: GOAL_KEYS.map((optionKey) => ({ key: optionKey, selected: optionKey === key, valueId: fieldValueId(optionKey), suggestion: null })),
    });
    api(6, () => view(6, question, [...GOAL_DISPLAYS.filter((display) => display.valueId !== stored.valueId), stored]));
    renderAt(`/projects/${PROJECT}/steps/6`);
    const box = await screen.findByRole('checkbox', { name: 'Lower carbon emissions' });
    expect((box as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('TEST selected').closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(stored.valueId);
    expect(screen.getByText('TEST provided badge')).toBeTruthy();
    // 2.8 "Prominence" (DR-2): the value and its badge sit on the card's top row, once, in one line; no row repeats it under the description.
    const card = box.closest('label') as HTMLElement;
    expect(card.querySelector('.sov-choice-card__top .sov-choice-card__status [data-layout="compact"]')?.textContent).toContain('TEST selected');
    expect(card.querySelector('.sov-choice-card__extra')).toBeNull();
    expect(document.querySelectorAll(`[data-value-id="${stored.valueId}"]`)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
    // Unticking it on the page shows the change, not the stored value any more.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lower carbon emissions' }));
    expect(screen.queryByText('TEST selected')).toBeNull();
  });

  it('US-INTAKE-18 AC1 · UD-35 (loading, steps 5 to 7) · rule 1 · DR-12: while the goals load, the step keeps one outline per goal card with one "Loading your answers" line, no digit and no checkbox', async () => {
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/6`]: () => new Promise<Response>(() => undefined),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null }),
    });
    renderAt(`/projects/${PROJECT}/steps/6`);
    expect((await screen.findByText('Loading your answers')).getAttribute('role')).toBe('status');
    const step = document.querySelector('section[aria-labelledby="step-title"]') as HTMLElement;
    expect(step.querySelectorAll('[aria-hidden="true"] > .border')).toHaveLength(GOALS.length);
    expect(/\p{N}/u.test(step.textContent ?? '')).toBe(false);
    expect(within(step).queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(false);
  });

  it('rule 2 · US-INTAKE-09 AC1 · DR-16: no goal icon draws a numeral or a currency sign ("Reduce operating costs" takes the piggy bank, not the coins)', async () => {
    api(6, () => view(6, goalsQuestion(), GOAL_DISPLAYS));
    renderAt(`/projects/${PROJECT}/steps/6`);
    const card = (await screen.findByRole('checkbox', { name: 'Reduce operating costs' })).closest('label') as HTMLElement;
    expect(card.querySelector('svg.lucide-piggy-bank')).not.toBeNull();
    expect(document.querySelector('svg.lucide-coins, svg.lucide-euro, svg.lucide-dollar-sign, svg.lucide-badge-euro')).toBeNull();
  });

  it('US-INTAKE-06 AC3: after a skip the question reads "You can provide this later." with no link', async () => {
    api(6, () => view(6, goalsQuestion({ state: 'skipped', skip: null, afterSkip: PROVIDE_LATER }), GOAL_DISPLAYS));
    renderAt(`/projects/${PROJECT}/steps/6`);
    await screen.findByText('TEST provide later line');
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
  });

  it('G7-4 · US-INTAKE-19 AC1 · AC2 · AC3 · US-INTAKE-01 AC7: a finding on step 3 while the owner is on step 6 gives step 3 a dot and one quiet notice; no dialog opens, the owner stays on step 6 and the goals ticked on the page stay ticked', async () => {
    let polls = 0;
    installFakeApi({
      'GET /api/projects': () => json(200, projectList([{ projectId: PROJECT, name: 'TEST project' }])),
      [`GET /api/projects/${PROJECT}/steps/6`]: () => json(200, view(6, goalsQuestion(), GOAL_DISPLAYS)),
      [`GET /api/projects/${PROJECT}/late-findings`]: () => {
        polls += 1;
        return polls === 1
          ? json(200, { asOf: AS_OF, displayObjects: [], dots: [], notice: null })
          : json(200, { asOf: AS_OF, displayObjects: [NOTICE], dots: [3], notice: NOTICE.valueId });
      },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // The owner reached step 6 from step 5, having left steps 1 to 5 in this page session.
    const router = createMemoryRouter(routes, { initialEntries: [{ pathname: `/projects/${PROJECT}/steps/6`, state: { leftSteps: [1, 2, 3, 4, 5] } }] });
    render(<RouterProvider router={router} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Improve guest comfort' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    const notice = await screen.findByText('TEST late notice');
    expect(notice.closest('[data-value-id]')?.getAttribute('data-value-id')).toBe(NOTICE.valueId);
    expect(notice.closest('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    const items = document.querySelectorAll('[data-render-stepper="wizard-step-number"] > li');
    expect(items[2]?.getAttribute('data-dot')).toBe('true');
    expect(items[5]?.getAttribute('aria-current')).toBe('step');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/6`);
    expect((screen.getByRole('checkbox', { name: 'Improve guest comfort' }) as HTMLInputElement).checked).toBe(true);
  });
});

describe('US-INTAKE-10 · US-INTAKE-11 · R-002 · R-005: step 7 automation areas (OB-7)', () => {
  it('US-INTAKE-10 AC1 · AC6 · AC8 · US-INTAKE-11 AC1 · R-005: the six areas as real checkboxes, none preselected, "Skip for now", and the approved banner', async () => {
    api(7, () => view(7, multiQuestion('q.project.automationAreas', 'project.automation', AREAS), AREA_DISPLAYS));
    renderAt(`/projects/${PROJECT}/steps/7`);
    await screen.findByRole('checkbox', { name: 'Security & Access' });
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(6);
    expect(boxes.every((box) => !(box as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();
    expect(screen.getByText('You can select multiple areas. Our AI will tailor the solution to your building and goals.')).toBeTruthy();
  });

  it('onboarding-spec 2.4 · DR-9 · DR-14: the three-column grid sits in a 1070px column, and "Skip for now" is placed by the kit under the grid, at its left edge', async () => {
    api(7, () => view(7, multiQuestion('q.project.automationAreas', 'project.automation', AREAS), AREA_DISPLAYS));
    renderAt(`/projects/${PROJECT}/steps/7`);
    await screen.findByRole('checkbox', { name: 'Security & Access' });
    const group = document.querySelector('fieldset.sov-choice-group') as HTMLElement;
    expect((group.parentElement as HTMLElement).classList.contains('max-w-[1070px]')).toBe(true);
    const options = group.querySelector(':scope > .sov-choice-group__options') as HTMLElement;
    expect(options.style.getPropertyValue('--sov-columns')).toBe('3');
    const skip = group.querySelector(':scope > .sov-skip') as HTMLElement;
    expect(within(skip).getByRole('button', { name: 'Skip for now' })).toBeTruthy();
    expect(options.compareDocumentPosition(skip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('US-INTAKE-10 AC2 · AC3: Continue sends the areas ticked (or none, which the server records as a skip) and opens step 8', async () => {
    const seen = api(7, () => view(7, multiQuestion('q.project.automationAreas', 'project.automation', AREAS), AREA_DISPLAYS));
    const { router } = renderAt(`/projects/${PROJECT}/steps/7`);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Lighting' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/projects/${PROJECT}/steps/8`));
    expect(continueBody(seen, 7)).toEqual({
      answers: [],
      multi: [{ questionId: 'q.project.automationAreas', ticked: ['project.automation.lighting'] }],
      visibleSuggestions: [],
      shown: { questions: ['q.project.automationAreas'], confirmations: [] },
    });
  });

  it('G3-4 · US-INTAKE-11 AC3 · AC4 · AC6 (web half, TEST suggestion): a suggested area is ticked with its Suggested value and reason, hides "Skip for now", and Continue reports it left in place', async () => {
    const key = 'project.automation.hvac';
    const reason = { id: 'suggested_because', kind: 'rule_line' as const, text: 'TEST suggested area reason' };
    const suggestedDisplay = notProvided(key, 'TEST area', ['selected', 'not_selected'], { badge: { id: 'suggested', label: 'TEST suggested badge' }, text: 'TEST not provided' });
    const question = multiQuestion('q.project.automationAreas', 'project.automation', AREAS, {
      skip: null,
      options: AREA_KEYS.map((optionKey) => ({ key: optionKey, selected: optionKey === key, valueId: fieldValueId(optionKey), suggestion: optionKey === key ? { reason } : null })),
    });
    const seen = api(7, () => view(7, question, [...AREA_DISPLAYS.filter((display) => display.valueId !== suggestedDisplay.valueId), suggestedDisplay]));
    renderAt(`/projects/${PROJECT}/steps/7`);
    expect(((await screen.findByRole('checkbox', { name: 'HVAC' })) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('TEST suggested area reason').closest('.sov-choice-card__extra')).not.toBeNull();
    expect(screen.getByText('TEST suggested badge').closest('.sov-choice-card__status')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(continueBody(seen, 7)).toBeDefined());
    expect(continueBody(seen, 7)).toMatchObject({
      multi: [{ questionId: 'q.project.automationAreas', ticked: [key] }],
      visibleSuggestions: [{ field: refOf(key), choice: 'selected' }],
    });
  });
});

describe('A-7 · A-1 · rule 7 · section 8: one request per press on steps 6 and 7', () => {
  it('A-7 · G7-10 (web half) · rule 7: "Skip for now" on step 6 pressed twice before the page renders again sends one skip; the link shows aria-busy, never disabled, until the answer is in and the view read again', async () => {
    let skipped = false;
    const held = heldHandler(() => {
      skipped = true;
      return json(200, { displayObjects: [] });
    });
    const seen = api(6, () => view(6, goalsQuestion(skipped ? { state: 'skipped', skip: null, afterSkip: PROVIDE_LATER } : {}), GOAL_DISPLAYS), { [`POST /api/projects/${PROJECT}/fields/skip`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/6`);
    const skip = await screen.findByRole('button', { name: 'Skip for now' });
    pressTwice(skip);
    await settle();
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(1);
    expect(skip.getAttribute('aria-busy')).toBe('true');
    expect(skip.hasAttribute('disabled')).toBe(false);
    held.answer();
    await screen.findByText('TEST provide later line');
    expect(sentTo(seen, 'POST', '/fields/skip')).toBe(1);
    expect(seen.find((request) => request.path.endsWith('/fields/skip'))?.body).toEqual({ questionId: 'q.project.goals', step: 6 });
  });

  it('A-1 · rule 7: Continue on step 7 pressed twice before the page renders again sends one Continue; it shows aria-busy while that is on its way, is never disabled, and after a refusal takes a press again', async () => {
    const held = heldHandler(() => json(500, { code: 'internal_error' }));
    const seen = api(7, () => view(7, multiQuestion('q.project.automationAreas', 'project.automation', AREAS), AREA_DISPLAYS), { [`POST /api/projects/${PROJECT}/steps/7/continue`]: held.handler });
    renderAt(`/projects/${PROJECT}/steps/7`);
    await screen.findByRole('button', { name: 'Skip for now' });
    const next = screen.getByRole('button', { name: 'Continue' });
    pressTwice(next);
    await settle();
    expect(sentTo(seen, 'POST', '/steps/7/continue')).toBe(1);
    expect(next.getAttribute('aria-busy')).toBe('true');
    expect(next.hasAttribute('disabled')).toBe(false);
    held.answer();
    await waitFor(() => expect(next.getAttribute('aria-busy')).toBe('false'));
    fireEvent.click(next);
    await waitFor(() => expect(sentTo(seen, 'POST', '/steps/7/continue')).toBe(2));
  });
});
