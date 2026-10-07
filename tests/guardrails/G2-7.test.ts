/**
 * G2-7 (docs/guardrails.md section 7; rule 2, "UI code receives only resolved field objects"; rule 9,
 * "Rounding").
 * Situation: two screens show the same value id with the same filter, for example the floor 05 HVAC
 * asset count on the model view and on the systems view.
 * Expected: both render the identical display, including badge, range and rounding.
 *
 * Phase 3's two screens of one value: the gross floor area on step 3 (its summary row, with Edit)
 * and on step 8 (the Building card, whose Edit is the card's). Each screen asks the one resolver on
 * its own, from its own read of stored state; the value id is the same, and what the value element
 * may show (the render contract's projection, `servedDisplayOf`: text, badge, lines, parts,
 * evidence) is identical. The same holds for an estimate's range and rounding, and for a conflict's
 * range.
 *
 * Phase 4 adds the workspace's pages (packages/view-model/src/workspace): the project type and the area on the project
 * card are the step 3 and step 8 displays; a scope decision on System Scope and in Topology's group is step 4's and
 * step 8's display; a system's equipment line on System Scope's row and Topology's group is one value id with one
 * display, at every floor filter. Each page asks the one resolver (`resolve`) and serves what it gives, unchanged. The
 * rendered half (the same element text on two pages) is the e2e suite's.
 *
 * Phase 6 adds the Metrics pages (packages/view-model/src/metrics; docs/adr/0052 decision 3; Expected unchanged): the
 * investment on Financial Overview, CAPEX and Payback is the stored proposal's headline price, one value id with the
 * identical display on the four pages; the payback indicator, the estimated savings, the cost per area and the carbon
 * dioxide reduction are each one value id with one display wherever two Metrics pages show them; CAPEX's "By System" is
 * Financial Overview's series; OPEX & Savings shows a scope decision as System Scope does.
 *
 * Phase 6 part B (V-3; Expected unchanged): CAPEX's "Selected systems" counts the include decisions of the scope the
 * stored proposal shows as used (US-FIN-21 AC6: "identical to the scope shown elsewhere"), bound to its own value id;
 * beside the case, while any decision as used was not recorded, it reads "Not available yet: systems in scope", never a
 * count standing in for the unknown decisions (rule 1).
 */
import fc from 'fast-check';
import { expect, test } from 'vitest';
import type { Candidate } from '@sovitech/domain';
import { servedDisplayOf, type DisplayObject } from '@sovitech/view-model/browser';
import { capexView, editActionOf, financialOverviewView, frameView, opexView, paybackView, proposalView, resolveField, systemScopeView, topologyView } from '@sovitech/view-model/server';
import { PROJECT_ID as PROPOSAL_PROJECT, SNAPSHOT_ID, testProposalInput } from './_support/proposal';
import { metricsProposalInput } from './_support/metrics';
import { documentReading, ownerAnswer, ownerConfirmation, testDocument, testEvents } from './_support/builders';
import { intakeFieldOf, productionField, registryField, resolveInputOf, uuid } from './_support/view-model';
import { displayOf, testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const schedule = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'f'.repeat(64)}` };
const FILE_NAMES = { [schedule.id]: 'Area Schedule.pdf' };

/** What the value element shows, without the actions its screen offers around it. */
function shown(display: DisplayObject | undefined): unknown {
  if (display === undefined) throw new Error('a display');
  const { actions: _actions, ...rest } = display;
  void _actions;
  return { rest, served: servedDisplayOf({ ...display, actions: [] }) };
}

function onTwoScreens(field: Parameters<typeof intakeFieldOf>[0], candidates: readonly Candidate[], events = testEvents({})): void {
  // Step 3 reads the store and resolves, with Edit on the row.
  const step3 = intakeFieldOf(field, BUILDING, candidates, events, [schedule]);
  const [onStep3] = resolveField(resolveInputOf(step3, 'building', { actions: [editActionOf(field, BUILDING, candidates.map((candidate) => candidate.id))], documents: [schedule], fileNames: FILE_NAMES }));
  // Step 8 reads the store again and resolves, the card's Edit around it.
  const step8 = intakeFieldOf(field, BUILDING, [...candidates].reverse(), events, [schedule]);
  const [onStep8] = resolveField(resolveInputOf(step8, 'building', { documents: [schedule], fileNames: FILE_NAMES }));
  expect(onStep3?.valueId).toBe(onStep8?.valueId);
  expect(shown(onStep3)).toEqual(shown(onStep8));
}

test('US-REVIEW-01 AC11 · US-INTAKE-15 AC3 · F-VALUE-10 · G2-7: the area on step 3 and on step 8 is one value id with the identical display, badge, range and rounding', () => {
  const area = productionField('building.grossFloorArea');
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 999_999 }), fc.integer({ min: 1, max: 999_999 }), fc.boolean(), (documentValue, ownerValue, withOwner) => {
      const read = { ...documentReading({ id: uuid(20), subjectId: BUILDING, field: area, document: schedule, value: { quantity: { value: documentValue, unit: 'm2', qualifier: 'gross_total' } }, minute: 1, page: 4 }), original: { text: `${String(documentValue)} mp` } };
      if (!withOwner) {
        onTwoScreens(area, [read]);
        return;
      }
      // The owner's own value beside it: known or in conflict, the same display on both screens.
      const own = ownerAnswer({ id: uuid(21), subjectId: BUILDING, field: area, value: { quantity: { value: ownerValue, unit: 'm2', qualifier: 'gross_total' } }, minute: 9 });
      onTwoScreens(area, [read, own], testEvents({ candidate: [ownerConfirmation(own)] }));
    }),
    { numRuns: 100 },
  );

  // An estimate's range and rounding (rule 9): identical on both screens.
  const estimateField = registryField('building.testEstimate', { kind: 'count', subject: 'building', unit: 'count', estimation: 'allowed', estimatedMethod: 'points', confirmBy: 'engineer', valueShape: 'non_negative_integer' });
  const estimate: Candidate = {
    id: uuid(30),
    subjectId: BUILDING,
    fieldKey: estimateField.key,
    quantity: { value: 5812, unit: 'count' },
    source: 'estimated',
    evidence: [],
    method: { formulaId: 'TEST-points', formulaVersion: '1.0.0', inputCandidateIds: [], unknownPolicy: 'refuse', assumptions: [] },
    range: { low: 5230, high: 6380 },
    createdBy: 'test-engine',
    authorRole: 'system',
    createdAt: '2026-09-30T09:00:00.000Z',
  };
  const step3 = intakeFieldOf(estimateField, BUILDING, [estimate]);
  const [display] = resolveField(resolveInputOf(step3, 'building'));
  expect(display?.text).toBe('about 5,800 (5,200 to 6,400)');
  expect(display?.badge?.id).toBe('estimated');
  onTwoScreens(estimateField, [estimate]);
});

test('US-REVIEW-14 · US-SCOPE-05 · US-TOPO-01 · F-VALUE-14 · G2-7: on the workspace, the card\'s area and project type, a scope decision and a system\'s equipment line are the wizard\'s displays, identical on every page that shows them', () => {
  const area = productionField('building.grossFloorArea');
  const projectType = productionField('project.type');
  const hvac = productionField('project.scope.hvac');
  const read = { ...documentReading({ id: uuid(40), subjectId: BUILDING, field: area, document: schedule, value: { quantity: { value: 2345, unit: 'm2', qualifier: 'gross_total' } }, minute: 1, page: 4 }), original: { text: '2.345 mp' } };
  const type = ownerAnswer({ id: uuid(41), subjectId: PROJECT, field: projectType, value: { choice: 'existing_building' }, minute: 2 });
  const include = ownerAnswer({ id: uuid(42), subjectId: PROJECT, field: hvac, value: { choice: 'include' }, minute: 3 });
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    projectType: 'existing_building',
    documents: [schedule],
    fileNames: FILE_NAMES,
    fields: [
      { field: area, subjectId: BUILDING, subjectKind: 'building', candidates: [read] },
      { field: projectType, subjectId: PROJECT, subjectKind: 'project', candidates: [type], candidateEvents: [ownerConfirmation(type)] },
      { field: hvac, subjectId: PROJECT, subjectKind: 'project', candidates: [include], candidateEvents: [ownerConfirmation(include)] },
    ],
  });
  // What step 3, step 4 and step 8 show for the same values: the one resolver over the same stored state.
  const wizard = (subjectId: string, key: string): DisplayObject | undefined => project.resolve(subjectId, key)?.[0];

  const frame = frameView(project);
  expect(frame.view.projectCard.grossFloorArea).toBe(`building:${BUILDING}.grossFloorArea`);
  expect(shown(displayOf(frame.displayObjects, frame.view.projectCard.grossFloorArea))).toEqual(shown(wizard(BUILDING, area.key)));
  expect(shown(displayOf(frame.displayObjects, frame.view.projectCard.projectType))).toEqual(shown(wizard(PROJECT, projectType.key)));

  for (const level of [undefined, 'upper_1']) {
    const scope = systemScopeView(project, level === undefined ? {} : { level });
    const topology = topologyView(project, level === undefined ? {} : { level });
    const row = scope.view.systems.find((entry) => entry.systemId === 'hvac');
    const [group] = topology.view.groups;
    expect(row?.decision).toBe(`project:${PROJECT}.scope.hvac`);
    expect(group?.decision).toBe(row?.decision);
    expect(shown(displayOf(scope.displayObjects, row?.decision ?? ''))).toEqual(shown(wizard(PROJECT, hvac.key)));
    expect(shown(displayOf(topology.displayObjects, group?.decision ?? ''))).toEqual(shown(wizard(PROJECT, hvac.key)));
    // One value id for a system's equipment with one filter, one display, on both pages.
    expect(group?.equipment).toBe(row?.equipment);
    expect(row?.equipment).toBe(level === undefined ? `project:${PROJECT}.register.hvac` : `project:${PROJECT}.register.hvac.${level}`);
    expect(displayOf(topology.displayObjects, group?.equipment ?? '')).toEqual(displayOf(scope.displayObjects, row?.equipment ?? ''));
  }
});

test('G2-7 · phase 6 · ADR 0052 decision 3 · US-FIN-03 AC8: the Metrics pages show the stored proposal\'s values under its own value ids, each with one display on every page', () => {
  const input = testProposalInput();
  const page = { projectId: PROPOSAL_PROJECT, header: input.header, proposal: input };
  const stored = proposalView(input);
  const overview = financialOverviewView(page);
  const capex = capexView(page);
  const payback = paybackView(page);
  if (overview.view.state !== 'generated' || capex.view.state !== 'generated' || payback.view.state !== 'generated') throw new Error('a stored version is read');
  const same = (ids: readonly string[], responses: readonly (readonly DisplayObject[])[]): void => {
    const [first] = ids;
    for (const id of ids) expect(id).toBe(first);
    const displays = responses.map((displays) => shown(displayOf(displays, first ?? '')));
    for (const display of displays) expect(display).toEqual(displays[0]);
  };
  // The investment: the stored proposal's headline price on the four pages.
  for (const view of [overview.view, capex.view, payback.view]) expect(view.investment).toEqual(stored.view.headline.investment);
  same(
    [stored.view.headline.investment.price.figure, overview.view.investment.price.figure, capex.view.investment.price.figure, payback.view.investment.price.figure],
    [stored.displayObjects, overview.displayObjects, capex.displayObjects, payback.displayObjects],
  );
  // The payback: the stored proposal's indicator.
  const storedPayback = stored.view.indicators.find((entry) => entry.indicator === 'payback')?.display ?? '';
  same([storedPayback, overview.view.indicators.payback, capex.view.kpis.payback, payback.view.payback], [stored.displayObjects, overview.displayObjects, capex.displayObjects, payback.displayObjects]);
  // Values only the Metrics pages show: one value id, one display, wherever two of them show it.
  same([overview.view.savings.total, capex.view.kpis.savings, payback.view.savings], [overview.displayObjects, capex.displayObjects, payback.displayObjects]);
  same([overview.view.costPerArea, capex.view.costPerArea], [overview.displayObjects, capex.displayObjects]);
  same([capex.view.kpis.carbon, payback.view.environmental.carbon], [capex.displayObjects, payback.displayObjects]);
  expect(capex.view.bySystem).toEqual(overview.view.costBreakdown.bySystem);
  same([capex.view.bySystem.notAvailable ?? '', overview.view.costBreakdown.bySystem.notAvailable ?? ''], [capex.displayObjects, overview.displayObjects]);
  // CAPEX's "1. SELECT SYSTEMS" is the stored proposal's scope as used.
  for (const system of capex.view.scope) same([system.decision], [capex.displayObjects, stored.displayObjects]);

  // OPEX & Savings: a scope decision as System Scope shows it.
  const hvac = productionField('project.scope.hvac');
  const include = ownerAnswer({ id: uuid(42), subjectId: PROJECT, field: hvac, value: { choice: 'include' }, minute: 3 });
  const project = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, fields: [{ field: hvac, subjectId: PROJECT, subjectKind: 'project', candidates: [include], candidateEvents: [ownerConfirmation(include)] }] });
  const opex = opexView({ header: input.header, project, newBuildEstimate: { names: [], actions: [] } });
  const scope = systemScopeView(project);
  const row = opex.view.systems.find((entry) => entry.systemId === 'hvac');
  const scopeRow = scope.view.systems.find((entry) => entry.systemId === 'hvac');
  expect(row?.decision).toBe(scopeRow?.decision);
  expect(displayOf(opex.displayObjects, row?.decision ?? '')).toEqual(displayOf(scope.displayObjects, scopeRow?.decision ?? ''));
});

test('G2-7 · R-089 · US-FIN-21 AC6 · V-3 (phase 6 part B): CAPEX\'s "Selected systems" counts the include decisions of the scope the stored proposal shows as used, bound to its own value id', () => {
  // Every decision recorded: HVAC, Lighting and Energy included, every other system decided out.
  const { input } = metricsProposalInput({ buildingType: 'hotel', scope: { hvac: 'include', lighting: 'include', energy: 'include' } });
  const stored = proposalView(input);
  const capex = capexView({ projectId: PROPOSAL_PROJECT, header: input.header, proposal: input });
  if (capex.view.state !== 'generated') throw new Error('a stored version is read');
  // The same scope as the stored proposal shows it (G2-7), and the count of its include decisions.
  for (const system of capex.view.scope) expect(shown(displayOf(capex.displayObjects, system.decision))).toEqual(shown(displayOf(stored.displayObjects, system.decision)));
  const { exclusions } = capex.view;
  const included = capex.view.scope.filter((system) => !exclusions.includes(system.decision)).map((system) => system.systemId);
  expect(included).toEqual(['hvac', 'lighting', 'energy']);
  expect(capex.view.selectedSystems).toBe(`proposal:${SNAPSHOT_ID}.metrics.selectedSystems`);
  const count = displayOf(capex.displayObjects, capex.view.selectedSystems);
  expect(count).toMatchObject({ text: '3', parts: ['3'], shape: 'value' });
  expect(count.measure?.label).toBe('Selected systems');
});

test('G2-7 (beside the case) · rule 1 · R-089 · V-3 (phase 6 part B): while a scope decision as used was not recorded, "Selected systems" reads "Not available yet: systems in scope", never a count', () => {
  const { input } = metricsProposalInput({ buildingType: 'hotel', scope: { hvac: 'include', lighting: 'unknown' } });
  const capex = capexView({ projectId: PROPOSAL_PROJECT, header: input.header, proposal: input });
  if (capex.view.state !== 'generated') throw new Error('a stored version is read');
  const line = displayOf(capex.displayObjects, capex.view.selectedSystems);
  expect(line).toMatchObject({ text: 'Not available yet: systems in scope', shape: 'missing', missing: 'not_available_yet' });
  expect(line.parts).toBeUndefined();
  // Rule 7: the owner's Add on the decision still missing, as the stored proposal offers it.
  expect(line.actions?.map((action) => action.kind)).toEqual(['add']);
});
