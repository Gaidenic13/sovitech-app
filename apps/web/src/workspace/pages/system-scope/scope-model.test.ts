import { describe, expect, it } from 'vitest';
import type { BadgeId, DisplayObject, SystemScopeRow } from '@sovitech/view-model/browser';
import { decisionRequest, scopeControlOf, suggestionShown, visibleSuggestionsOf } from './scope-model';

const PROJECT = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8e9f';
const SHOWN = '0192f0e4-7c1a-7d2b-9e3f-4a5b6c7d8a10';

function row(systemId: string, options: Partial<SystemScopeRow> = {}): SystemScopeRow {
  return {
    systemId,
    lifeSafety: false,
    neverPreselected: false,
    decision: `project:${PROJECT}.scope.${systemId}`,
    included: false,
    suggestion: null,
    equipment: `project:${PROJECT}.register.${systemId}`,
    points: `project:${PROJECT}.points.${systemId}`,
    levels: `project:${PROJECT}.levels.${systemId}`,
    zones: `project:${PROJECT}.zones.${systemId}`,
    ...options,
  };
}

function decision(systemId: string, badge: BadgeId, shape: DisplayObject['shape'], shown: readonly string[] = []): DisplayObject {
  const field = { subjectId: PROJECT, fieldKey: `project.scope.${systemId}` };
  return {
    valueId: `project:${PROJECT}.scope.${systemId}`,
    kind: 'field',
    text: 'TEST',
    shape,
    ...(shape === 'missing' ? { missing: 'not_provided_yet' as const } : {}),
    badge: { id: badge, label: 'TEST badge' },
    field,
    actions: [{ kind: 'edit', field, input: { kind: 'choice', options: ['include', 'exclude'] }, shownCandidateIds: [...shown] }],
  };
}

const REASON = { reason: { id: 'suggested_because_document', kind: 'rule_line' as const, text: 'TEST reason' } };

describe('R-052 · US-SCOPE-05 AC4 · rule 3 · rule 11: what a System Scope row draws', () => {
  it('US-SCOPE-05 AC1 · AC4: a recorded decision draws the switch from it; no decision is undecided, never off', () => {
    expect(scopeControlOf(row('hvac', { included: true }), decision('hvac', 'provided_by_you', 'value'))).toBe('on');
    expect(scopeControlOf(row('hvac'), decision('hvac', 'provided_by_you', 'value'))).toBe('off');
    expect(scopeControlOf(row('hvac'), decision('hvac', 'not_provided_yet', 'missing'))).toBe('undecided');
    expect(scopeControlOf(row('hvac'), undefined)).toBe('undecided');
  });

  it('rule 3 · G3-20: a visible Suggested preselection draws the switch on and is reported on Save and Continue', () => {
    const suggested = row('hvac', { included: true, suggestion: REASON });
    const shown = decision('hvac', 'suggested', 'value');
    expect(suggestionShown(suggested, shown)).toBe(true);
    expect(scopeControlOf(suggested, shown)).toBe('on');
    expect(visibleSuggestionsOf([suggested], new Map([[suggested.decision, shown]]))).toEqual([{ field: { subjectId: PROJECT, fieldKey: 'project.scope.hvac' }, choice: 'include' }]);
  });

  it('G11-10 · rule 11 · R-051 until D-64: a life-safety or never-preselected system served with a suggestion is undecided and never reported', () => {
    for (const options of [{ lifeSafety: true, neverPreselected: true }, { neverPreselected: true }]) {
      const served = row('fire_safety', { ...options, included: true, suggestion: REASON });
      const shown = decision('fire_safety', 'suggested', 'value');
      expect(scopeControlOf(served, shown)).toBe('undecided');
      expect(visibleSuggestionsOf([served], new Map([[served.decision, shown]]))).toEqual([]);
    }
  });

  it('rule 4 · G4-36 · 7.1.1-C8: a press names the candidates the screen showed (none for an undecided or Suggested row)', () => {
    expect(decisionRequest(decision('hvac', 'provided_by_you', 'value', [SHOWN]), 'exclude')).toEqual({
      decisions: [{ field: { subjectId: PROJECT, fieldKey: 'project.scope.hvac' }, choice: 'exclude', corrects: [SHOWN] }],
      visibleSuggestions: [],
    });
    expect(decisionRequest(decision('water', 'not_provided_yet', 'missing'), 'include')?.decisions[0]?.corrects).toEqual([]);
    expect(decisionRequest(undefined, 'include')).toBeUndefined();
  });
});
