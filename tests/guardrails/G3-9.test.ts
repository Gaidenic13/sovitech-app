/**
 * G3-9 (docs/guardrails.md section 7; rule 3, "Choices belong to the owner" and "A suggestion is
 * a preselection the app renders. It is not a candidate"; 2.6, `decision`: an owner choice;
 * rule 11, Fire Safety stays opt-in). Phase 1 review, adversarial finding 8.
 * Situation: an `ai_inference` or `document` candidate "include" on the owner's decision field
 * for Fire Safety in scope.
 * Expected: refused; the field stays unknown.
 *
 * Systems in scope are one `decision` field per option on the project subject (2.6). Only the
 * owner's own answer (`user`) sets a decision; the owner's "include" is the control.
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { derive, type Candidate } from '@sovitech/domain';
import { documentReading, ownerAnswer, testContext, testDocument, testEvents, testField } from './_support/builders';

const PROJECT = 'test-project-g3-9';

const fireSafetyInScope = testField('test.project.scope.fire_safety', { kind: 'decision', subject: 'project', confirmBy: 'owner' });
const specification = testDocument('test-doc-g3-9-specification', PROJECT, 'technical_design', { kind: 'specification' });

function notTheOwners(source: 'document' | 'ai_inference', confidence: Candidate['confidence'], choice: string): Candidate {
  return documentReading({
    id: `test-cand-g3-9-${source}-${choice}`,
    subjectId: PROJECT,
    field: fireSafetyInScope,
    document: specification,
    value: { choice },
    minute: 0,
    source,
    ...(source === 'ai_inference' ? { confidence } : {}),
  });
}

const context = testContext({ subjectId: PROJECT, documents: [specification] });

test('F-VALUE-02 · G3-9: an AI inference or a document "include" on the Fire Safety decision is refused; the field stays unknown', () => {
  for (const candidate of [notTheOwners('ai_inference', 'high', 'include'), notTheOwners('document', undefined, 'include')]) {
    const state = derive(fireSafetyInScope, [candidate], testEvents({}), context);
    expect(state.state, candidate.source).toBe('unknown');
    expect(state.activeCandidateId, candidate.source).toBeNull();
    expect(state.candidates, candidate.source).toEqual([
      { candidateId: candidate.id, verification: 'unverified', status: 'refused', refusal: 'choice_not_owner' },
    ]);
  }

  // Property: whichever of the two sources, confidence and choice.
  fc.assert(
    fc.property(
      fc.constantFrom<'document' | 'ai_inference'>('document', 'ai_inference'),
      fc.constantFrom<Candidate['confidence']>('high', 'medium', 'low'),
      fc.constantFrom('include', 'exclude'),
      (source, confidence, choice) => {
        const state = derive(fireSafetyInScope, [notTheOwners(source, confidence, choice)], testEvents({}), context);
        expect(state.state).toBe('unknown');
        expect(state.candidates[0]).toMatchObject({ status: 'refused', refusal: 'choice_not_owner' });
      },
    ),
  );
});

test('F-VALUE-02 · G3-9 control: the owner\'s own "include" sets the decision', () => {
  const owners = ownerAnswer({ id: 'test-cand-g3-9-owner', subjectId: PROJECT, field: fireSafetyInScope, value: { choice: 'include' }, minute: 1 });
  const state = derive(fireSafetyInScope, [owners, notTheOwners('ai_inference', 'high', 'exclude')], testEvents({}), context);
  expect(state.state).toBe('known');
  expect(state.activeCandidateId).toBe(owners.id);
});
