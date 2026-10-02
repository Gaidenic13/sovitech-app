/**
 * G7-15 (new in phase 4; rule 7, "'Not available yet' never appears alone. It names what is missing and offers the
 * action. An empty card, a dash or a zero is never shown"; PRD R-071: Topology's Logical view, "with no include
 * decision recorded ... 'Not available yet' naming the systems in scope, with the action to choose them").
 * Situation: Topology with no include decision recorded.
 * Expected: "Not available yet", naming the systems in scope, with the action to choose them; no group is drawn.
 *
 * Three ways to have no include decision: nothing decided; a Suggested system the owner has not accepted (a
 * suggestion is a preselection, not a candidate: rule 3); every system decided out. One include decision draws its
 * group and the line goes.
 */
import { expect, test } from 'vitest';
import { productionRegistry, scopeFieldKey } from '@sovitech/registry';
import { topologyView, type Suggestion } from '@sovitech/view-model/server';
import { ownerAnswer, ownerConfirmation } from './_support/builders';
import { uuid } from './_support/view-model';
import { displayOf, testWorkspace, type TestSubjectField } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const scopeFields = productionRegistry.fields.filter((field) => field.key.startsWith('project.scope.'));

function decided(choices: Readonly<Record<string, string>>): TestSubjectField[] {
  return scopeFields.map((field, index) => {
    const choice = choices[field.key];
    if (choice === undefined) return { field, subjectId: PROJECT, subjectKind: 'project' };
    const own = ownerAnswer({ id: uuid(100 + index), subjectId: PROJECT, field, value: { choice }, minute: 1 });
    return { field, subjectId: PROJECT, subjectKind: 'project', candidates: [own], candidateEvents: [ownerConfirmation(own)] };
  });
}

const hvacSuggested: Suggestion = { fieldKey: scopeFieldKey('hvac'), subjectId: PROJECT, choice: 'include', reasonLineId: 'suggested_because', reasonSlots: { reason: 'TEST reason' }, suggestedBy: 'TEST-rule' };

test('US-TOPO-01 · R-071 · G7-15: Topology with no include decision recorded reads "Not available yet: the systems in scope" with the action to choose them, and draws no group', () => {
  const allOut = Object.fromEntries(scopeFields.map((field) => [field.key, 'exclude']));
  for (const [label, project] of [
    ['nothing decided', testWorkspace({ projectId: PROJECT, buildingId: BUILDING, fields: decided({}) })],
    ['a Suggested system not accepted', testWorkspace({ projectId: PROJECT, buildingId: BUILDING, fields: decided({}), suggestions: [hvacSuggested] })],
    ['every system decided out', testWorkspace({ projectId: PROJECT, buildingId: BUILDING, fields: decided(allOut) })],
  ] as const) {
    const { view, displayObjects } = topologyView(project);
    expect(view.groups, label).toEqual([]);
    expect(view.noDecision, label).not.toBeNull();
    expect(view.noDecision?.actions, label).toEqual(['choose_systems']);
    const line = displayOf(displayObjects, view.noDecision?.line ?? '');
    expect(line.text, label).toBe('Not available yet: the systems in scope');
    expect(line.missing, label).toBe('not_available_yet');
  }
});

test('R-071 · G7-15 (beside the case): one include decision draws its group, and the line goes', () => {
  const project = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, fields: decided({ [scopeFieldKey('lighting')]: 'include' }) });
  const { view } = topologyView(project);
  expect(view.noDecision).toBeNull();
  expect(view.groups.map((group) => group.systemId)).toEqual(['lighting']);
});
