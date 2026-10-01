/**
 * G3-4 (docs/guardrails.md section 7; rule 3, "A suggestion left in place counts as the owner's
 * answer": "On Continue, each suggestion that was visible, labelled and left in place is written as
 * a new `user` candidate, with a `user_confirmed` event and an `accepted_suggestion` event. The
 * event's reason names what suggested it. The badge reads 'Provided by you', and the answer is not
 * provisional.").
 * Situation: a visible Suggested automation area, then Continue.
 * Expected: a new `user` candidate with `user_confirmed` and `accepted_suggestion` events. Not
 * provisional. The badge reads Provided by you.
 *
 * No production rule suggests an automation area until D-12 (PRD R-005 "Until decided"), so the case
 * proves the mechanism with a TEST suggestion rule. The chain is the app's own: the suggestion guard
 * (suggestionsFor), Continue's plan (planContinue), the records it writes (continueRecords), the one
 * derive function and the one resolver. A suggestion the page reports that the server does not make
 * is never accepted.
 */
import { expect, test } from 'vitest';
import { productionRegistry } from '@sovitech/registry';
import {
  continueRecords,
  planContinue,
  resolveField,
  suggestionsFor,
  type Suggestion,
  type SuggestionRule,
} from '@sovitech/view-model/server';
import type { ContinueRequest } from '@sovitech/view-model/browser';
import { testEvents } from './_support/builders';
import { derived, intakeFieldOf, resolveInputOf, uuid } from './_support/view-model';

const PROJECT = uuid(1);
const automationFields = productionRegistry.fields.filter((field) => field.key.startsWith('project.automation.'));
const hvacArea = automationFields.find((field) => field.key === 'project.automation.hvac');

test('US-INTAKE-11 · F-QUESTION-06 · F-VALUE-06 · G3-4: a visible Suggested automation area left in place is, on Continue, the owner\'s answer: user_confirmed and accepted_suggestion, not provisional, Provided by you', () => {
  if (hvacArea === undefined) throw new Error('the registry holds the HVAC automation area');
  const fields = automationFields.map((field) => intakeFieldOf(field, PROJECT));
  const testRule: SuggestionRule = () => [
    { fieldKey: hvacArea.key, subjectId: PROJECT, choice: 'selected', reasonLineId: 'suggested_because', reasonSlots: { reason: 'HVAC is in scope' }, suggestedBy: 'TEST-rule:hvac-in-scope' },
  ];
  const suggestions: Suggestion[] = suggestionsFor(fields, [testRule]);
  expect(suggestions).toHaveLength(1);

  // The page shows the suggestion ticked and labelled; the owner leaves it in place and presses Continue.
  const request: ContinueRequest = {
    answers: [],
    multi: [{ questionId: 'q.project.automationAreas', ticked: [hvacArea.key] }],
    visibleSuggestions: [
      { field: { subjectId: PROJECT, fieldKey: hvacArea.key }, choice: 'selected' },
      // A suggestion the server never made: reported by the page, never trusted.
      { field: { subjectId: PROJECT, fieldKey: 'project.automation.lighting' }, choice: 'selected' },
    ],
    shown: { questions: ['q.project.automationAreas'], confirmations: [] },
  };
  const writes = planContinue({ step: 7, fields, suggestions, request });
  expect(writes.acceptedSuggestions).toEqual(suggestions);
  expect(writes.ignoredSuggestions).toBe(1);
  expect(writes.skips).toEqual([]);

  let next = 500;
  const records = continueRecords({ projectId: PROJECT, writes, fields, owner: 'test-owner', at: '2026-09-30T10:00:00.000Z', newId: () => uuid((next += 1)) });
  const written = records.candidates.find((candidate) => candidate.fieldKey === hvacArea.key);
  if (written === undefined) throw new Error('Continue writes the accepted suggestion');

  // A new user candidate, by the owner, with no evidence of its own.
  expect(written).toMatchObject({ source: 'user', authorRole: 'owner', choice: 'selected', createdBy: 'test-owner', evidence: [] });
  // user_confirmed and accepted_suggestion, whose reason names what suggested it.
  const ownEvents = records.candidateEvents.filter((event) => event.candidateId === written.id);
  expect(ownEvents.map((event) => event.type).sort()).toEqual(['accepted_suggestion', 'user_confirmed']);
  expect(ownEvents.find((event) => event.type === 'accepted_suggestion')).toMatchObject({ role: 'owner', reason: 'TEST-rule:hvac-in-scope' });

  // Not provisional, and the badge reads Provided by you.
  const state = derived(hvacArea, PROJECT, [written], testEvents({ candidate: ownEvents }));
  expect(state.state).toBe('known');
  expect(state.activeCandidateId).toBe(written.id);
  expect(state.provisional).toBe(false);
  const after = intakeFieldOf(hvacArea, PROJECT, [written], testEvents({ candidate: ownEvents }));
  const [display] = resolveField(resolveInputOf(after, 'project'));
  expect(display?.badge).toEqual({ id: 'provided_by_you', label: 'Provided by you' });
  expect(display?.text).toBe('Selected');

  // Nothing on another step is accepted this way.
  const elsewhere = planContinue({ step: 6, fields, suggestions, request: { ...request, multi: [], shown: { questions: [], confirmations: [] } } });
  expect(elsewhere.acceptedSuggestions).toEqual([]);
});
