/**
 * G7-24 (new in phase 6 part B; rule 7, "'Not available yet' never appears alone. It names what is missing and offers the
 * action. An empty card, a dash or a zero is never shown"; G7-15's reading for Topology; PRD R-095 and US-FIN-12 AC10:
 * OPEX & Savings' "Building operating cost by system" lists a row per system whose recorded decision is include).
 * Situation: OPEX & Savings' "Building operating cost by system" with no include decision recorded (nothing decided, or
 * every system decided out).
 * Expected: "Not available yet", naming the systems in scope, with the action to choose them; no empty table is drawn.
 *
 * Found by the read-only review of phase 6 (V-1): the panel drew its column headings over an empty row, with no line and
 * no action, on every project whose scope was unanswered or wholly excluded. View half (this file): the view serves the
 * line with `choose_systems` and no row; one include decision serves its row and no line (beside the case). The
 * rendered half (the panel shows the line and the way to System Scope, and no table) is the page's component test
 * titled "G7-24" (apps/web/src/workspace/pages/metrics/OpexPage.test.tsx). Every value is TEST data.
 */
import { expect, test } from 'vitest';
import { OpexViewSchema } from '@sovitech/view-model/browser';
import { opexView } from '@sovitech/view-model/server';
import { productionRegistry, scopeFieldKey } from '@sovitech/registry';
import { ownerAnswer, ownerConfirmation } from './_support/builders';
import { testProposalInput } from './_support/proposal';
import { uuid } from './_support/view-model';
import { displayOf, testWorkspace, type TestSubjectField } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const scopeFields = productionRegistry.fields.filter((field) => field.key.startsWith('project.scope.'));
const header = testProposalInput().header;

function decided(choices: Readonly<Record<string, string>>): TestSubjectField[] {
  return scopeFields.map((field, index) => {
    const choice = choices[field.key];
    if (choice === undefined) return { field, subjectId: PROJECT, subjectKind: 'project' };
    const own = ownerAnswer({ id: uuid(100 + index), subjectId: PROJECT, field, value: { choice }, minute: 1 });
    return { field, subjectId: PROJECT, subjectKind: 'project', candidates: [own], candidateEvents: [ownerConfirmation(own)] };
  });
}

function opexOf(choices: Readonly<Record<string, string>>) {
  const built = opexView({ header, project: testWorkspace({ projectId: PROJECT, buildingId: BUILDING, fields: decided(choices) }), newBuildEstimate: { names: [], actions: [] } });
  // What the API may serve (the contract's refinement: a line exactly when no row is served).
  expect(OpexViewSchema.safeParse(built.view).success).toBe(true);
  for (const id of [built.view.noSystems?.line, ...built.view.systems.map((row) => row.current)]) if (id !== undefined) displayOf(built.displayObjects, id);
  return built;
}

test('G7-24 · R-095 · US-FIN-12 AC10 · rule 7: "Building operating cost by system" with no include decision recorded reads "Not available yet: the systems in scope" with the action to choose them, and serves no row', () => {
  const allOut = Object.fromEntries(scopeFields.map((field) => [field.key, 'exclude']));
  for (const [label, choices] of [
    ['nothing decided', {}],
    ['every system decided out', allOut],
  ] as const) {
    const { view, displayObjects } = opexOf(choices);
    expect(view.systems, label).toEqual([]);
    expect(view.noSystems, label).not.toBeNull();
    expect(view.noSystems?.actions, label).toEqual(['choose_systems']);
    expect(view.noSystems?.line, label).toBe(`building:${BUILDING}.operatingCost.systems`);
    const line = displayOf(displayObjects, view.noSystems?.line ?? '');
    expect(line.text, label).toBe('Not available yet: the systems in scope');
    expect(line.shape, label).toBe('missing');
    expect(line.missing, label).toBe('not_available_yet');
  }
});

test('R-095 · G7-24 (beside the case): one include decision serves its row, and the line goes', () => {
  const { view } = opexOf({ [scopeFieldKey('lighting')]: 'include' });
  expect(view.noSystems).toBeNull();
  expect(view.systems.map((row) => row.systemId)).toEqual(['lighting']);
});
