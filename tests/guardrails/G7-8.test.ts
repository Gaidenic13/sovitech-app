/**
 * G7-8 (new in phase 3, indexed in docs/guardrails.md section 7 at v1.8; rule 7, "Skip
 * for now": "Continue counts as skipping. Pressing Continue on an unanswered question skips it";
 * "Nothing fills the gap. A skipped field stays unknown"; 2.6: "Multi-select choices are stored as
 * one `decision` field per option"; US-INTAKE-09 AC3).
 * Situation: step 6 is left with no goal ticked and none suggested, and the owner presses Continue.
 * Expected: the question is recorded as skipped: no goal gets a `not_selected` decision.
 *
 * Continue's plan (planContinue) and the records it writes (continueRecords): a `skipped` field event
 * by the owner on each goal, and no candidate at all; each goal then reads Not provided yet. The line "You can
 * provide this later." belongs to the question, once (rule 7; G7-12, phase 3 part B), so no goal's own display
 * repeats it. The same holds when the page sends no entry for the shown question.
 */
import { expect, test } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import type { ContinueRequest } from '@sovitech/view-model/browser';
import { continueRecords, planContinue, resolveField } from '@sovitech/view-model/server';
import { testEvents } from './_support/builders';
import { intakeFieldOf, resolveInputOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const goals = productionRegistry.fields.filter((field) => field.key.startsWith('project.goal.'));

test('US-INTAKE-09 AC3 · F-QUESTION-04 · G7-8: step 6 left with no goal ticked and none suggested, then Continue: skipped, and no goal gets not_selected', () => {
  expect(goals.length).toBeGreaterThan(0);
  const fields = goals.map((goal) => intakeFieldOf(goal, PROJECT));
  const empty: ContinueRequest = {
    answers: [],
    multi: [{ questionId: 'q.project.goals', ticked: [] }],
    visibleSuggestions: [],
    shown: { questions: ['q.project.goals'], confirmations: [] },
  };
  const unsent: ContinueRequest = { ...empty, multi: [] };
  for (const request of [empty, unsent]) {
    const writes = planContinue({ step: 6, fields, suggestions: [], request });
    // No decision against any goal.
    expect(writes.answers).toEqual([]);
    expect(writes.acceptedSuggestions).toEqual([]);
    // The question is recorded skipped: every goal, by the owner.
    expect(writes.skips).toEqual(goals.map((goal) => ({ fieldKey: goal.key, subjectId: PROJECT })));

    const records = continueRecords({ projectId: PROJECT, writes, fields, owner: 'test-owner', at: '2026-09-30T10:00:00.000Z', newId: () => uuid(900) });
    expect(records.candidates).toEqual([]);
    expect(records.candidateEvents).toEqual([]);
    expect(records.fieldEvents.map((event) => [event.fieldKey, event.type, event.role])).toEqual(goals.map((goal) => [goal.key, 'skipped', 'owner']));
    expect(records.guardrailEvents.every((event) => event.type === 'skipped')).toBe(true);

    for (const goal of goals) {
      const after = intakeFieldOf(goal, PROJECT, [], testEvents({ field: records.fieldEvents.filter((event) => event.fieldKey === goal.key) }));
      expect(after.state.state).toBe('skipped');
      expect(after.state.activeCandidateId).toBeNull();
      const [display] = resolveField(resolveInputOf(after, 'project'));
      expect(display).toMatchObject({ text: 'Not provided yet', shape: 'missing', missing: 'not_provided_yet' });
      // The question carries "You can provide this later." once (G7-12): the option's display has no line of its own.
      expect(display?.lines).toBeUndefined();
    }
  }
});
