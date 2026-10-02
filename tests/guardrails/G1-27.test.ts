/**
 * G1-27 (new in phase 4; rule 1, "Interfaces": "A protocol is a `document` value only when a document names it";
 * "Model knowledge is not a source"; 2.1 (`calculated` and `estimated` are the engine's, nothing else's);
 * dashboards-spec 7.1-r12 and r13: draw only what the register holds; proposal 7.2.10 and dashboards 8.8: SOVITECH's
 * design layers are not the register).
 * Situation: Topology's Logical view of a project whose documents name no controller, network, bus or protocol.
 * Expected: none is shown.
 *
 * The view (packages/view-model/src/workspace/topology.ts) serves the design levels as one line, "Not available yet:
 * SOVITECH's design of the controllers, networks and integrations", and per included system only its decision and its
 * equipment by type ("Not available yet: SOVITECH asset taxonomy" while the gate is closed). No protocol, bus, network,
 * gateway, automation station, management level, vendor or product name appears in anything it serves, and the view
 * holds no field that could carry one. The view is never labelled "proposed design".
 */
import { expect, test } from 'vitest';
import { productionRegistry, scopeFieldKey } from '@sovitech/registry';
import { topologyView } from '@sovitech/view-model/server';
import { documentReading, ownerAnswer, ownerConfirmation, testDocument } from './_support/builders';
import { productionField, uuid } from './_support/view-model';
import { displayOf, shownTexts, testWorkspace, type TestSubjectField } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const memoriu = { ...testDocument(uuid(10), PROJECT, 'technical_design'), contentHash: `sha256:${'c'.repeat(64)}` };

/** Words that name a design layer, an interface or a product (rule 1; 7.1-r12, r13). */
const DESIGN_WORDS = /\b(bacnet|modbus|knx|lon(works)?|dali|m-?bus|opc ?ua|mqtt|tcp\/?ip|ethernet|rs-?485|bus|gateway|router|switch|automation station|management level|field level|proposed design|data flow|controller)\b/iu;

function inScope(systems: readonly string[]): TestSubjectField[] {
  return productionRegistry.fields
    .filter((field) => field.key.startsWith('project.scope.'))
    .map((field, index) => {
      if (!systems.some((system) => scopeFieldKey(system) === field.key)) return { field, subjectId: PROJECT, subjectKind: 'project' as const };
      const own = ownerAnswer({ id: uuid(100 + index), subjectId: PROJECT, field, value: { choice: 'include' }, minute: 1 });
      return { field, subjectId: PROJECT, subjectKind: 'project' as const, candidates: [own], candidateEvents: [ownerConfirmation(own)] };
    });
}

test('US-TOPO-03 · R-058 · R-071 · G1-27: a project whose documents name no controller, network, bus or protocol shows none of them on Topology', () => {
  const area = productionField('building.grossFloorArea');
  const read = documentReading({ id: uuid(20), subjectId: BUILDING, field: area, document: memoriu, value: { quantity: { value: 1200, unit: 'm2', qualifier: 'gross_total' } }, minute: 1 });
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [memoriu],
    fileNames: { [memoriu.id]: 'Memoriu tehnic.pdf' },
    fields: [...inScope(['hvac', 'lighting', 'energy', 'fire_safety']), { field: area, subjectId: BUILDING, subjectKind: 'building', candidates: [read] }],
  });
  const { view, displayObjects } = topologyView(project);
  expect(view.groups.map((group) => group.systemId)).toEqual(['hvac', 'lighting', 'energy', 'fire_safety']);
  expect(displayOf(displayObjects, view.design).text).toBe("Not available yet: SOVITECH's design of the controllers, networks and integrations");

  // Nothing but the design line names a design layer, and no interface, bus, network or product is named anywhere.
  for (const display of displayObjects) {
    if (display.valueId === view.design) continue;
    for (const text of shownTexts([display])) expect(text, display.valueId).not.toMatch(DESIGN_WORDS);
  }
  // Each group carries a decision and an equipment line by type, nothing that could hold a controller or a protocol.
  for (const group of view.groups) {
    expect(Object.keys(group).sort()).toEqual(['decision', 'equipment', 'monitoringOnly', 'systemId']);
    expect(displayOf(displayObjects, group.equipment).text).toBe('Not available yet: SOVITECH asset taxonomy');
  }
});
