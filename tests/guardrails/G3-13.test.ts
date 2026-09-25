/**
 * G3-13 (docs/guardrails.md section 7; 2.4, `choice?: string; // enum key`; 2.6, `kind` `enum` and
 * `decision`; rule 3, "Choices belong to the owner"). Phase 1 review, round 3, adversarial finding X5.
 * Situation: a choice outside the options its field lists: "maybe" on the Fire Safety decision.
 * Expected: refused; the field stays unknown.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive } from '@sovitech/domain';
import { ownerAnswer, testContext, testEvents, testField } from './_support/builders';

const PROJECT = 'test-project-g3-13';
const fireSafetyInScope = testField('test.project.scope.fire_safety', { kind: 'decision', subject: 'project', options: ['include', 'exclude'], confirmBy: 'owner' });
const context = testContext({ subjectId: PROJECT });

test('F-VALUE-02 · G3-13: "maybe" on the Fire Safety decision is refused, and the field stays unknown', () => {
  fc.assert(
    fc.property(fc.constantFrom('maybe', 'TEST-not-an-option', 'Include', 'include '), (choice) => {
      const answer = ownerAnswer({ id: 'test-cand-g3-13', subjectId: PROJECT, field: fireSafetyInScope, value: { choice }, minute: 0 });
      const state = derive(fireSafetyInScope, [answer], testEvents({}), context);
      expect(state.state).toBe('unknown');
      expect(state.candidates).toEqual([{ candidateId: answer.id, verification: 'unverified', status: 'refused', refusal: 'value_shape' }]);
    }),
  );
});

test('F-VALUE-02 · G3-13 control: an option the field lists stands', () => {
  const answer = ownerAnswer({ id: 'test-cand-g3-13-listed', subjectId: PROJECT, field: fireSafetyInScope, value: { choice: 'exclude' }, minute: 0 });
  expect(derive(fireSafetyInScope, [answer], testEvents({}), context).activeCandidateId).toBe(answer.id);
});
