// @vitest-environment happy-dom
/**
 * G7-3 (docs/guardrails.md section 7; rule 7, "Skip for now": "It is not shown on a question that
 * already has an answer or a visible suggestion, where it would read as 'clear my answer'").
 * Situation: a question with an answer or a visible suggestion.
 * Expected: no Skip link.
 *
 * Both halves in one case file (phase 3 part B, V-7: the index check counts a case as real from its
 * case file alone), in happy-dom:
 * - the question engine's half (the planner): a question whose field holds an answer is shown, not
 *   asked, so it has no "Skip for now"; an unanswered question with a visible suggestion is asked
 *   without it; the skip route's plan refuses a question that has an answer (`question_answered`);
 * - the rendered half: the app's own step 5 (its route table, apps/web/src/routes.tsx, in a memory
 *   router; its own API client and the page's own `fetch`), against a TEST API this file serves over
 *   HTTP on 127.0.0.1, which stands in at the network boundary for the real one (nothing of the code
 *   under test is replaced: no `vi.mock` or `vi.stubGlobal`). A question the owner answered, and a
 *   question with a visible suggestion, render no "Skip for now" link even when their view still
 *   carries the skip action (the step's own check, whatever the server said; the server's own answer,
 *   no skip action, is the planner half above); the unanswered question with no suggestion keeps its
 *   link, so the page is read with the link on it.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import fc from 'fast-check';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import type { DisplayObject, Question } from '@sovitech/view-model/browser';
import { IntakeRefusal, offersSkip, planQuestion, planSkip } from '@sovitech/view-model/server';
import { resetCsrfToken } from '../../apps/web/src/api/client';
import { BUILDING_TYPE_OPTIONS, OCCUPANCY_OPTIONS, SCHEDULE_OPTIONS, notProvided, provided, singleQuestion } from '../../apps/web/src/review/test-views';
import { AS_OF, PROJECT as WEB_PROJECT, USER, envelope, projectList } from '../../apps/web/src/test/harness';
import { renderApp } from '../../apps/web/src/test/render-app';
import { ownerAnswer, ownerConfirmation, testEvents } from './_support/builders';
import { intakeFieldOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const BUILDING = uuid(2);

/** The registered questions an owner may skip: not required, asked on steps 4 to 8. */
const skippable = productionRegistry.questions.filter((question) => {
  if (question.kind !== 'question') return false;
  const fields = question.fieldKeys.map((key) => productionRegistry.fields.find((field) => field.key === key));
  return fields.every((field) => field !== undefined && field.criticality !== 'required');
});

function fieldsOf(questionIndex: number, answeredIndex: number | null): ReturnType<typeof intakeFieldOf>[] {
  const question = skippable[questionIndex];
  if (question === undefined) throw new Error('a skippable question');
  return question.fieldKeys.map((key, index) => {
    const field = productionRegistry.fields.find((entry) => entry.key === key);
    if (field === undefined) throw new Error(`no field ${key}`);
    const subjectId = field.subject === 'building' ? BUILDING : PROJECT;
    if (index !== answeredIndex) return intakeFieldOf(field, subjectId);
    const option = field.options?.[0];
    const value = option !== undefined ? { choice: option } : { quantity: { value: 1, unit: field.unit ?? 'count', qualifier: field.qualifiers?.[0] } };
    const answer = ownerAnswer({ id: uuid(50), subjectId, field, value, minute: 1 });
    return intakeFieldOf(field, subjectId, [answer], testEvents({ candidate: field.confirmBy === 'engineer' ? [] : [ownerConfirmation(answer)] }));
  });
}

test('F-QUESTION-04 · US-INTAKE-06 · G7-3: a question with an answer or a visible suggestion shows no Skip link (the question engine)', () => {
  expect(skippable.length).toBeGreaterThan(0);
  fc.assert(
    fc.property(fc.integer({ min: 0, max: skippable.length - 1 }), fc.nat(), fc.boolean(), (questionIndex, answerSeed, visibleSuggestion) => {
      const question = skippable[questionIndex];
      if (question === undefined) throw new Error('a skippable question');

      // An answer: shown, not asked, so no Skip link; and the skip route refuses it.
      const withAnswer = fieldsOf(questionIndex, answerSeed % question.fieldKeys.length);
      const answeredPlan = planQuestion({ question, fields: withAnswer, shownConfirmations: new Set(), visibleSuggestion }).plan;
      expect(answeredPlan.kind).toBe('show');
      expect(offersSkip(answeredPlan)).toBe(false);
      expect(() => planSkip({ question, fields: withAnswer, by: 'test-owner', at: '2026-09-30T10:00:00.000Z' })).toThrow(IntakeRefusal);

      // A visible suggestion on an unanswered question: asked, with no Skip link.
      const unanswered = fieldsOf(questionIndex, null);
      const suggestedPlan = planQuestion({ question, fields: unanswered, shownConfirmations: new Set(), visibleSuggestion: true }).plan;
      expect(suggestedPlan.kind).toBe('ask');
      expect(offersSkip(suggestedPlan)).toBe(false);

      // Neither: the unanswered, unsuggested question keeps its Skip link (rule 7, "When the link shows").
      const plainPlan = planQuestion({ question, fields: unanswered, shownConfirmations: new Set(), visibleSuggestion: false }).plan;
      expect(plainPlan.kind).toBe('ask');
      expect(offersSkip(plainPlan)).toBe(true);
    }),
    { numRuns: 60 },
  );
});

/** What the TEST API answers for one route: a status and a JSON body. */
interface Answer {
  readonly status: number;
  readonly body: unknown;
}

describe('G7-3 (rendered: step 5 of a TEST project, the app in happy-dom)', () => {
  const answers = new Map<string, Answer>();
  let server: Server;

  function answer(request: IncomingMessage, response: ServerResponse): void {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const defaults: Record<string, Answer> = {
      'GET /api/auth/session': { status: 200, body: { user: USER } },
      'GET /api/csrf': { status: 200, body: { token: 'TEST-token' } },
      'GET /api/projects': { status: 200, body: projectList([{ projectId: WEB_PROJECT, name: 'TEST project' }]) },
      [`GET /api/projects/${WEB_PROJECT}/late-findings`]: { status: 200, body: { asOf: AS_OF, displayObjects: [], dots: [], notice: null } },
    };
    const key = `${request.method ?? 'GET'} ${path}`;
    const chosen = answers.get(key) ?? defaults[key] ?? { status: 404, body: { code: 'not_found' } };
    response.writeHead(chosen.status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(chosen.body));
  }

  beforeAll(async () => {
    server = createServer(answer);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('the TEST API has no port');
    // The page's origin is the TEST API's, so the app's same-origin `/api` requests reach it.
    (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(`http://127.0.0.1:${String(address.port)}/`);
  });

  afterEach(() => {
    cleanup();
    answers.clear();
    resetCsrfToken();
  });

  afterAll(async () => {
    // The page's requests still in flight (its late-findings poll) are aborted before the TEST API closes.
    await (window as unknown as { happyDOM: { abort(): Promise<void> } }).happyDOM.abort();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  const SKIP = { name: 'Skip for now' } as const;

  /**
   * Step 5 with the building type answered by the owner, the schedule suggested, and the occupancy
   * unanswered; every question's view still carries its skip action (the builders' default).
   */
  function stepFive() {
    const answeredType: DisplayObject = provided('building.type', 'TEST building type', 'TEST hotel answer', BUILDING_TYPE_OPTIONS);
    const reason = { id: 'suggested_because', kind: 'rule_line' as const, text: 'TEST suggested reason' };
    const questions: Question[] = [
      singleQuestion('q.building.type', 'building.type', BUILDING_TYPE_OPTIONS, {
        state: 'answered',
        options: BUILDING_TYPE_OPTIONS.map((key) => ({ key, selected: key === 'hotel', suggestion: null })),
        found: answeredType.valueId,
      }),
      singleQuestion('q.project.operatingSchedule', 'project.operatingSchedule', SCHEDULE_OPTIONS, {
        options: SCHEDULE_OPTIONS.map((key) => ({ key, selected: key === 'business_hours', suggestion: key === 'business_hours' ? { reason } : null })),
      }),
      singleQuestion('q.project.occupancy', 'project.occupancy', OCCUPANCY_OPTIONS),
    ];
    const displays: DisplayObject[] = [
      answeredType,
      notProvided('project.operatingSchedule', 'TEST schedule', SCHEDULE_OPTIONS),
      notProvided('project.occupancy', 'TEST occupancy', OCCUPANCY_OPTIONS),
    ];
    return { ...envelope(WEB_PROJECT, displays), view: { step: 5, questions } };
  }

  test('G7-3 · US-INTAKE-06 AC2 · US-INTAKE-12 AC4 (rendered): an answered question and a question with a visible suggestion show no "Skip for now", even with the skip action still in their view', async () => {
    answers.set(`GET /api/projects/${WEB_PROJECT}/steps/5`, { status: 200, body: stepFive() });
    renderApp(`/projects/${WEB_PROJECT}/steps/5`);
    expect(((await screen.findByRole('radio', { name: 'Hotel' })) as HTMLInputElement).checked).toBe(true);
    await waitFor(() => expect(document.body.hasAttribute('data-render-ready')).toBe(true));

    const typeGroup = screen.getByRole('group', { name: /What type of building is it\?/u });
    const scheduleGroup = screen.getByRole('group', { name: /When does it operate\?/u });
    const occupancyGroup = screen.getByRole('group', { name: /How is it occupied\?/u });
    // The answer shows with its badge, and the suggestion with its reason: both are on screen.
    expect(within(typeGroup).getByText('TEST hotel answer')).toBeTruthy();
    expect(within(scheduleGroup).getByText('TEST suggested reason')).toBeTruthy();
    expect((within(scheduleGroup).getByRole('radio', { name: 'Business hours' }) as HTMLInputElement).checked).toBe(true);

    // G7-3: no Skip link on either.
    expect(within(typeGroup).queryByRole('button', SKIP)).toBeNull();
    expect(within(scheduleGroup).queryByRole('button', SKIP)).toBeNull();
    expect(within(typeGroup).queryByText('Skip for now')).toBeNull();
    expect(within(scheduleGroup).queryByText('Skip for now')).toBeNull();
    // The unanswered question with no suggestion keeps its link: the page was read with the link on it.
    expect(within(occupancyGroup).getByRole('button', SKIP)).toBeTruthy();
    expect(screen.getAllByRole('button', SKIP)).toHaveLength(1);
  });
});
