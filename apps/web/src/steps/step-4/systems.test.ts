import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { continueBody, servedTick, suggestionShown, tickOf, type Step4View, type SystemCard } from './systems';

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e50';
const BUILDING = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e51';
const REASON = { id: 'TEST', kind: 'rule_line' as const, text: 'TEST reason' };
const IDS = ['hvac', 'lighting', 'energy', 'access_control', 'fire_safety', 'water', 'elevators', 'cctv'] as const;

function card(systemId: string, options: { readonly selected: boolean; readonly suggestion: boolean }): SystemCard {
  return {
    systemId,
    lifeSafety: systemId === 'fire_safety',
    neverPreselected: systemId === 'fire_safety' || systemId === 'access_control' || systemId === 'elevators',
    detection: `building:${BUILDING}.detection.${systemId}`,
    decision: `project:${PROJECT}.scope.${systemId}`,
    selected: options.selected,
    suggestion: options.suggestion ? { reason: REASON } : null,
  };
}

function decision(systemId: string, kind: 'missing' | 'suggested' | 'owner'): DisplayObject {
  const fieldKey = `project.scope.${systemId}`;
  return {
    valueId: `project:${PROJECT}.scope.${systemId}`,
    kind: 'field',
    text: 'TEST',
    shape: kind === 'missing' ? 'missing' : 'value',
    ...(kind === 'missing' ? { missing: 'not_provided_yet' as const } : {}),
    badge: kind === 'suggested' ? { id: 'suggested', label: 'TEST Suggested' } : kind === 'owner' ? { id: 'provided_by_you', label: 'TEST Provided' } : { id: 'not_provided_yet', label: 'TEST' },
    field: { subjectId: PROJECT, fieldKey },
    actions: [{ kind: 'edit', field: { subjectId: PROJECT, fieldKey }, input: { kind: 'choice', options: ['include', 'exclude'] }, shownCandidateIds: [] }],
  };
}

function view(cards: readonly SystemCard[]): Step4View {
  return { step: 4, subtitle: 'none_named', question: { questionId: 'q.project.systemsInScope', state: 'unanswered', skip: null, afterSkip: null }, systems: [...cards] };
}

describe('R-051 · rule 3 · rule 11: what step 4 may send', () => {
  it('rule 11 · US-SCOPE-02 AC2 · G11-9 (screen side): whatever it is served, the page never ticks or reports as a suggestion a life-safety card or one never preselected; only the owner\'s stored decision or tick does', () => {
    fc.assert(
      fc.property(fc.constantFrom(...IDS), fc.boolean(), fc.boolean(), fc.constantFrom('missing', 'suggested', 'owner') as fc.Arbitrary<'missing' | 'suggested' | 'owner'>, (id, selected, suggested, kind) => {
        const served = card(id, { selected, suggestion: suggested });
        const shown = decision(id, kind);
        const never = served.lifeSafety || served.neverPreselected;
        if (never) {
          expect(servedTick(served, shown)).toBe(selected && kind === 'owner');
          expect(suggestionShown(served, shown, new Map())).toBe(false);
          const body = continueBody(view([served]), new Map([[served.decision, shown]]), new Map());
          expect(body.visibleSuggestions).toEqual([]);
        }
      }),
    );
  });

  it('G3-4 · rule 3: a suggestion counts as left in place only while the owner has not touched its card and it stays ticked', () => {
    const hvac = card('hvac', { selected: true, suggestion: true });
    const shown = decision('hvac', 'suggested');
    expect(suggestionShown(hvac, shown, new Map())).toBe(true);
    expect(suggestionShown(hvac, shown, new Map([['project.scope.hvac', true]]))).toBe(false);
    expect(tickOf(hvac, shown, new Map([['project.scope.hvac', false]]))).toBe(false);
    const body = continueBody(view([hvac]), new Map([[hvac.decision, shown]]), new Map());
    expect(body.visibleSuggestions).toEqual([{ field: { subjectId: PROJECT, fieldKey: 'project.scope.hvac' }, choice: 'include' }]);
    expect(body.multi).toEqual([{ questionId: 'q.project.systemsInScope', ticked: ['project.scope.hvac'] }]);
  });

  it('rule 7 · US-SCOPE-02 AC4: with nothing ticked the question is still sent as shown, with no tick, so the server records a skip, never an exclusion', () => {
    const cards = IDS.map((id) => card(id, { selected: false, suggestion: false }));
    const decisions = new Map(cards.map((entry) => [entry.decision, decision(entry.systemId, 'missing')]));
    expect(continueBody(view(cards), decisions, new Map())).toEqual({
      answers: [],
      multi: [{ questionId: 'q.project.systemsInScope', ticked: [] }],
      visibleSuggestions: [],
      shown: { questions: ['q.project.systemsInScope'], confirmations: [] },
    });
  });
});
