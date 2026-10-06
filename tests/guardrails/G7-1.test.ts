/**
 * G7-1 (docs/guardrails.md section 7; rule 7 "Skip means skip", "Nothing fills the gap"; rule 1 "Ranges need a basis":
 * "options of an unknown enum"; F-CALC-09: "range_over_options over the options of an unanswered schedule").
 * Situation: the operating schedule is skipped, with `range_over_options`.
 * Expected: OPEX is a range over the four options. The field is not re-asked on steps 6-8.
 *
 * Engine half (this file; the engine builder): the TEST operating estimate (`TEST-operatingEnergyEstimate@1.0.0`, the
 * mirror of `operatingEnergyEstimate@1`, a TEST method over TEST benchmarks) with the schedule skipped is one estimate
 * whose range is exactly the hull of the four schedules' ranges, recorded as a range over the schedule's options; no
 * schedule is assumed. Operating cost in euro waits for `financial-indicators` and `units-7.2.22` (it reads "Not
 * available yet"), so OPEX here is the operating energy the TEST method estimates.
 *
 * The API half (phase 5 part B, V-6: the B3 half the header once left open was never written), at the end of this file,
 * over a TEST database through the wizard routes with the production registry: on a new TEST project the owner presses
 * Continue on step 5 with the operating schedule's question shown and unanswered, which records its skip once (rule 7,
 * "Continue counts as skipping"); then steps 6, 7 and 8 serve no ask for it: step 6's and step 7's questions are their
 * own (goals, automation areas) and name no schedule field; step 8 asks inline for no schedule (it is not in the
 * first-estimate set, rule 7 "Skip means skip": "It returns only when a new document changes it, or when it is in the
 * first-estimate set at step 8") and lists no "For you" item for it; and the field's skip stays the one event recorded.
 * Every account and value is TEST data.
 */
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest';
import { FIELD, OUTPUT, productionRegistry } from '@sovitech/registry';
import { ContinueResponseSchema, StepResponseSchema, type StepResponse } from '@sovitech/view-model/browser';
import { exact, interval, methodNotesOf, multiply, percentOf, point, runEngine, type EngineRun, type Interval, type OutputResult } from '@sovitech/engine';
import type { FieldEvent } from '@sovitech/domain';
import { testCatalogue } from '../../packages/engine/test-formulas/engine';
import { productionField } from '../../packages/engine/test-formulas/fields';
import { testEngineInput, type TestEntry } from '../../packages/engine/test-formulas/inputs';
import { signIn, startTestApi, type Auth, type TestApi } from './_support/api';
import { documentReading, ownerAnswer, testDocument, testTime } from './_support/builders';

const PROJECT = 'test-project-g7-1';
const BUILDING = 'test-building-g7-1';
const SCHEDULES = productionRegistry.fields.find((field) => field.key === FIELD.operatingSchedule)?.options ?? [];
const plans = testDocument('test-doc-g7-1', PROJECT, 'technical_design');

/** The owner's own answer: a choice, or text (the country and the city are text fields). */
const owner = (key: string, subjectId: string, value: { choice: string } | { text: string }): TestEntry => {
  const definition = productionField(key);
  const id = `test-cand-g7-1-${key}`;
  if ('choice' in value) return { definition, subjectId, candidates: [ownerAnswer({ id, subjectId, field: definition, value, minute: 1 })] };
  return {
    definition,
    subjectId,
    candidates: [{ id, subjectId, fieldKey: key, text: value.text, source: 'user', evidence: [], createdBy: 'test-owner', authorRole: 'owner', createdAt: testTime(1) }],
  };
};

/** The project with the schedule skipped, or answered `schedule`. */
function project(schedule: string | null): TestEntry[] {
  const area = productionField(FIELD.grossFloorArea);
  const scheduleField = productionField(FIELD.operatingSchedule);
  const skipped: FieldEvent = { subjectId: PROJECT, fieldKey: FIELD.operatingSchedule, type: 'skipped', by: 'test-owner', role: 'owner', at: testTime(3) };
  return [
    owner(FIELD.buildingType, BUILDING, { choice: 'hotel' }),
    owner(FIELD.occupancy, PROJECT, { choice: 'mixed' }),
    owner(FIELD.country, PROJECT, { text: 'TEST-XA' }),
    owner(FIELD.city, PROJECT, { text: 'TEST city A' }),
    {
      definition: area,
      subjectId: BUILDING,
      candidates: [documentReading({ id: 'test-cand-g7-1-area', subjectId: BUILDING, field: area, document: plans, value: { quantity: { value: 200, unit: 'm2', qualifier: 'gross_total' } }, minute: 2 })],
    },
    schedule === null
      ? { definition: scheduleField, subjectId: PROJECT, candidates: [], events: { field: [skipped] } }
      : owner(FIELD.operatingSchedule, PROJECT, { choice: schedule }),
  ];
}

let ids = 0;
function run(schedule: string | null): EngineRun {
  return runEngine(testCatalogue(), testEngineInput({ projectId: PROJECT, entries: project(schedule), subjects: { project: PROJECT, building: BUILDING } }), {
    newId: () => `test-cand-g7-1-out-${String((ids += 1))}`,
    at: '2026-10-05T09:00:00Z',
  });
}

const energyOf = (result: EngineRun): OutputResult | undefined => result.outputs.find((output) => output.output === OUTPUT.annualEnergy);
const rangeOf = (result: EngineRun): { low: number; high: number } => {
  const output = energyOf(result);
  if (output?.kind !== 'figure' || output.candidate.range === undefined) throw new Error(`no TEST energy figure: ${JSON.stringify(output)}`);
  return output.candidate.range;
};

describe('G7-1 · the operating schedule skipped, under range_over_options: a range over the four options', () => {
  test('G7-1 · the field is skipped, not filled: the estimate ranges over its four options and names it as the basis of the range', () => {
    expect(SCHEDULES).toEqual(['24_7', 'business_hours', 'extended_hours', 'seasonal']);
    const result = run(null);
    const output = energyOf(result);
    expect(output?.kind).toBe('figure');
    if (output?.kind !== 'figure') return;
    expect(output.candidate.source).toBe('estimated');
    expect(output.candidate.method.unknownPolicy).toBe('range_over_options');
    expect(methodNotesOf(output.candidate.method)).toContainEqual({ kind: 'range_over_options', subjectId: PROJECT, fieldKey: FIELD.operatingSchedule });
    // No schedule is assumed: no candidate of the schedule is among the inputs it used.
    expect(output.candidate.method.inputCandidateIds.some((id) => id.includes(FIELD.operatingSchedule))).toBe(false);
  });

  test('G7-1 · the range is exactly the hull of the four schedules: each answered schedule lies inside it, and the extremes are its bounds', () => {
    const skipped = rangeOf(run(null));
    const answered = SCHEDULES.map((schedule) => rangeOf(run(schedule)));
    for (const range of answered) {
      expect(range.low).toBeGreaterThanOrEqual(skipped.low);
      expect(range.high).toBeLessThanOrEqual(skipped.high);
    }
    expect(Math.min(...answered.map((range) => range.low))).toBe(skipped.low);
    expect(Math.max(...answered.map((range) => range.high))).toBe(skipped.high);
    // And the bounds are the TEST method's, exactly: area × intensity × the lowest and the highest schedule percentage.
    const expected: Interval = multiply(multiply(point(exact(200)), interval(exact(9001), exact(9011))), interval(percentOf(9071), percentOf(9074)));
    expect(skipped).toEqual({ low: expected.low.toNumber(), high: expected.high.toNumber() });
  });
});

// ---- The API half (phase 5 part B, V-6): the skipped schedule is not asked again on steps 6 to 8 ----

const SCHEDULE_QUESTION = 'q.project.operatingSchedule';

describe('G7-1 (the API half) · the operating schedule skipped on step 5: not re-asked on steps 6-8', { timeout: 120_000 }, () => {
  let api: TestApi;
  let owner: Auth;

  beforeAll(async () => {
    api = await startTestApi({ devLogin: true });
    const [ownerId] = api.devAccountIds;
    if (ownerId === undefined) throw new Error('no TEST development owner');
    owner = await signIn(api, ownerId);
  }, 180_000);

  afterAll(async () => {
    await api.stop();
  });

  async function step(projectId: string, n: number): Promise<StepResponse> {
    const response = await api.app.inject({ method: 'GET', url: `/api/projects/${projectId}/steps/${String(n)}`, headers: { ...owner } });
    expect(response.statusCode, response.body).toBe(200);
    return StepResponseSchema.parse(response.json());
  }

  async function continueOn(projectId: string, n: number, shownQuestions: readonly string[]): Promise<void> {
    const response = await api.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/steps/${String(n)}/continue`,
      headers: { ...owner },
      payload: { answers: [], multi: [], visibleSuggestions: [], shown: { questions: [...shownQuestions], confirmations: [] } },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(ContinueResponseSchema.parse(response.json()).nextStep).toBe(n + 1);
  }

  /** The schedule's field events, as the store holds them. */
  async function scheduleEvents(projectId: string): Promise<readonly { readonly type: string; readonly role: string }[]> {
    return api.database.asAdministrator<{ type: string; role: string }>(`SELECT type, role FROM sovitech.field_events WHERE project_id = $1 AND field_key = $2 ORDER BY at`, [projectId, FIELD.operatingSchedule]);
  }

  it('G7-1 · V-6 · rule 7 "Skip means skip" · US-INTAKE-08: skipped on step 5, the operating schedule is asked on none of steps 6, 7 and 8, and its one skip stays the only event', async () => {
    const created = await api.app.inject({ method: 'POST', url: '/api/projects', headers: { ...owner }, payload: { name: 'TEST G7-1 schedule', projectType: 'new_construction', countryCode: 'RO', city: 'TEST city G7-1' } });
    expect(created.statusCode, created.body).toBe(201);
    const { projectId } = created.json() as { projectId: string };

    /** Whether a question or an inline ask names the schedule (its question id or any of its fields). */
    const asksSchedule = (question: { readonly questionId: string; readonly fields: readonly { readonly fieldKey: string }[] }): boolean =>
      question.questionId === SCHEDULE_QUESTION || question.fields.some((field) => field.fieldKey === FIELD.operatingSchedule);

    // Step 5 asks for the schedule (the check above reads it there); Continue with it shown and unanswered skips it, once.
    const five = await step(projectId, 5);
    if (five.view.step !== 5) throw new Error('step 5');
    const shown = five.view.questions.map((question) => question.questionId);
    const scheduleQuestion = five.view.questions.find((question) => question.questionId === SCHEDULE_QUESTION);
    if (scheduleQuestion === undefined) throw new Error('step 5 does not ask for the schedule');
    expect(asksSchedule(scheduleQuestion)).toBe(true);
    expect(scheduleQuestion.fields.map((field) => field.fieldKey)).toEqual([FIELD.operatingSchedule]);
    expect(scheduleQuestion.state).toBe('unanswered');
    await continueOn(projectId, 5, shown);
    expect(await scheduleEvents(projectId)).toEqual([{ type: 'skipped', role: 'owner' }]);

    // Steps 6 and 7: their own questions only, naming no schedule field; nothing on either screen asks for it.
    const six = await step(projectId, 6);
    if (six.view.step !== 6) throw new Error('step 6');
    expect(six.view.question.questionId).toBe('q.project.goals');
    expect(asksSchedule(six.view.question)).toBe(false);
    expect(JSON.stringify(six)).not.toContain(FIELD.operatingSchedule);
    await continueOn(projectId, 6, [six.view.question.questionId]);
    const seven = await step(projectId, 7);
    if (seven.view.step !== 7) throw new Error('step 7');
    expect(seven.view.question.questionId).toBe('q.project.automationAreas');
    expect(asksSchedule(seven.view.question)).toBe(false);
    expect(JSON.stringify(seven)).not.toContain(FIELD.operatingSchedule);
    await continueOn(projectId, 7, [seven.view.question.questionId]);

    // Step 8: the inline asks (the first-estimate set only) and the "For you" items name no schedule.
    const eight = await step(projectId, 8);
    if (eight.view.step !== 8) throw new Error('step 8');
    expect(eight.view.proposal.inlineAsks.length).toBeGreaterThan(0);
    for (const ask of eight.view.proposal.inlineAsks) expect(asksSchedule(ask), ask.questionId).toBe(false);
    for (const item of eight.view.forYou.items) expect(item.concerns, item.itemId).not.toContain('operatingSchedule');
    expect(eight.view.forYou.items.some((item) => item.itemId.includes(FIELD.operatingSchedule))).toBe(false);
    // Reading steps 6 to 8 recorded nothing more for the schedule: the one skip stands, nothing re-asked or re-skipped.
    expect(await scheduleEvents(projectId)).toEqual([{ type: 'skipped', role: 'owner' }]);
  });
});
