/**
 * G3-12 (docs/guardrails.md section 7; rule 3, "Choices belong to the owner. These are the systems to
 * include, goals, automation areas ..."; 2.6, `decision`: "an owner choice"). Phase 1 review, round 3,
 * adversarial finding X1.
 * Situation: an engineer's rejection arrives on the owner's own answer on a choice field: the owner's
 * "exclude" for Fire Safety in scope.
 * Expected: the owner's answer stays the field's value.
 *
 * The rejection is listed among the events derive did not apply (`engineer_overrules_owner_choice`);
 * an engineer who questions a choice leaves a note. The control: the owner's own rejection, with a
 * new answer, changes the choice.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type CandidateEvent } from '@sovitech/domain';
import { ownerAnswer, ownerConfirmation, testContext, testEvents, testField, testTime } from './_support/builders';

const PROJECT = 'test-project-g3-12';
const fireSafetyInScope = testField('test.project.scope.fire_safety', {
  kind: 'decision',
  subject: 'project',
  options: ['include', 'exclude'],
  confirmBy: 'owner',
  confirmByBasis: 'owner_choice',
});
const context = testContext({ subjectId: PROJECT });

function rejectedBy(candidateId: string, role: CandidateEvent['role'], by: string, minute: number): CandidateEvent {
  return { candidateId, type: 'rejected', by, role, at: testTime(minute), reason: 'TEST reason' };
}

test('F-VALUE-02 · G3-12: an engineer\'s rejection of the owner\'s "exclude" for Fire Safety leaves the owner\'s answer as the value', () => {
  const answer = ownerAnswer({ id: 'test-cand-g3-12-owner', subjectId: PROJECT, field: fireSafetyInScope, value: { choice: 'exclude' }, minute: 1 });
  const state = derive(
    fireSafetyInScope,
    [answer],
    testEvents({ candidate: [ownerConfirmation(answer), rejectedBy(answer.id, 'sovitech_engineer', 'test-engineer', 2)] }),
    context,
  );
  expect(state.state).toBe('known');
  expect(state.activeCandidateId).toBe(answer.id);
  expect(state.refusedEvents.map((refused) => refused.refusal)).toEqual(['engineer_overrules_owner_choice']);

  // Property: whichever answer, and however many engineer rejections, whenever they arrive.
  fc.assert(
    fc.property(fc.constantFrom('include', 'exclude'), fc.array(fc.integer({ min: 0, max: 59 }), { minLength: 1, maxLength: 4 }), (choice, minutes) => {
      const owners = ownerAnswer({ id: 'test-cand-g3-12-any', subjectId: PROJECT, field: fireSafetyInScope, value: { choice }, minute: 0 });
      const rejections = minutes.map((minute) => rejectedBy(owners.id, 'sovitech_engineer', 'test-engineer', minute));
      const after = derive(fireSafetyInScope, [owners], testEvents({ candidate: [ownerConfirmation(owners), ...rejections] }), context);
      expect(after.activeCandidateId).toBe(owners.id);
    }),
  );
});

test('F-VALUE-02 · G3-12 control: the owner\'s own rejection with a new answer changes the choice', () => {
  const first = ownerAnswer({ id: 'test-cand-g3-12-first', subjectId: PROJECT, field: fireSafetyInScope, value: { choice: 'include' }, minute: 1 });
  const second = ownerAnswer({ id: 'test-cand-g3-12-second', subjectId: PROJECT, field: fireSafetyInScope, value: { choice: 'exclude' }, minute: 3 });
  const state = derive(
    fireSafetyInScope,
    [first, second],
    testEvents({ candidate: [ownerConfirmation(first), ownerConfirmation(second), rejectedBy(first.id, 'owner', 'test-owner', 3)] }),
    context,
  );
  expect(state.activeCandidateId).toBe(second.id);
});
