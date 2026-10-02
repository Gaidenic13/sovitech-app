/**
 * G7-16 (new in phase 4 part B; rule 4, "Until a conflict is resolved": "where a formula cannot take a range, its output
 * reads 'Not available yet: two values for floors', with the action to resolve it. It never runs on one of the values";
 * rule 4, "Routing": "Conflicts on engineer fields go to the engineer queue ... The owner sees: 'Documents disagree on
 * this. A SOVITECH engineer will check it.'"; rule 7: "'Not available yet' never appears alone. It names what is missing
 * and offers the action"; PRD R-077 Guardrail behaviour; finding V-4, its view and API half).
 * Situation: the floor structure (`building.floors`, confirmBy engineer) is in conflict between two documents.
 * Expected: every floors list and floor filter reads "Not available yet: two values for floors" beside the floors
 * field's own display, with both values and their sources and rule 4's routing line, and offers the owner no action;
 * no level list is built.
 *
 * The level register (packages/view-model/src/workspace/levels.ts) serves `{ state: 'conflict', line, field, actions }`
 * on the frame, Equipment, Zones and Topology alike, the field being step 3's display of the floors (G2-7). Beside the
 * case, with a TEST floors field the owner confirms: the owner's value against a document's carries rule 4's question to
 * the owner, and the action is `enter_floors` (step 3's floors row). Every value is TEST data.
 */
import { expect, test } from 'vitest';
import type { DisplayObject, LevelRegister } from '@sovitech/view-model/browser';
import { equipmentView, frameView, topologyView, zonesView, type WorkspaceProject } from '@sovitech/view-model/server';
import { documentReading, ownerAnswer, testDocument } from './_support/builders';
import { productionField, uuid } from './_support/view-model';
import { displayOf, testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const floors = productionField('building.floors');
const memoriu = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'a'.repeat(64)}` };
const releveu = { ...testDocument(uuid(11), PROJECT, 'unknown'), contentHash: `sha256:${'b'.repeat(64)}` };
const ROUTING = 'Documents disagree on this. A SOVITECH engineer will check it.';

function registers(project: WorkspaceProject): [string, LevelRegister, readonly DisplayObject[]][] {
  const frame = frameView(project);
  const equipment = equipmentView(project, {});
  const zones = zonesView(project, {});
  const topology = topologyView(project);
  return [
    ['frame', frame.view.levels, frame.displayObjects],
    ['equipment', equipment.view.filters.levels, equipment.displayObjects],
    ['zones', zones.view.levels, zones.displayObjects],
    ['topology', topology.view.levels, topology.displayObjects],
  ];
}

test('V-4 · R-077 · rule 4 · rule 7 · G7-16: floors in conflict between two documents: the line beside the floors field\'s two values, their sources and the routing line, no owner action, no list', () => {
  const read = documentReading({ id: uuid(30), subjectId: BUILDING, field: floors, document: memoriu, value: { quantity: { value: 12, unit: 'count', qualifier: 'upper' } }, minute: 1 });
  const other = documentReading({ id: uuid(31), subjectId: BUILDING, field: floors, document: releveu, value: { quantity: { value: 14, unit: 'count', qualifier: 'upper' } }, minute: 2 });
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [memoriu, releveu],
    fileNames: { [memoriu.id]: 'TEST memoriu.pdf', [releveu.id]: 'TEST releveu.pdf' },
    fields: [{ field: floors, subjectId: BUILDING, subjectKind: 'building', candidates: [read, other] }],
  });
  expect(floors.confirmBy).toBe('engineer');
  for (const [page, levels, displays] of registers(project)) {
    expect(levels.state, page).toBe('conflict');
    expect(levels, page).not.toHaveProperty('levels');
    if (levels.state !== 'conflict') continue;
    expect(displayOf(displays, levels.line).text, page).toBe('Not available yet: two values for floors');
    expect(levels.field, page).toBe(`building:${BUILDING}.floors`);
    const field = displayOf(displays, levels.field);
    expect(field.badge?.id, page).toBe('two_values');
    expect((field.lines ?? []).map((line) => line.text), page).toContain(ROUTING);
    expect(field.sourceLine?.text, page).toContain('TEST memoriu.pdf');
    expect(field.sourceLine?.text, page).toContain('TEST releveu.pdf');
    const values = displays.filter((display) => display.valueId.startsWith(`building:${BUILDING}.floors.upper.value`));
    expect(values.map((display) => display.text).sort(), page).toEqual(['12', '14']);
    expect(values.every((display) => display.sourceLine !== undefined), page).toBe(true);
    expect(levels.actions, page).toEqual([]);
  }
});

test('rule 4 · G7-16 (beside the case): on a TEST floors field the owner confirms, the owner\'s value against a document\'s is the owner\'s to resolve: the action enter_floors', () => {
  const ownerFloors = { ...floors, confirmBy: 'owner' as const };
  const read = documentReading({ id: uuid(40), subjectId: BUILDING, field: ownerFloors, document: memoriu, value: { quantity: { value: 12, unit: 'count', qualifier: 'upper' } }, minute: 1 });
  const own = ownerAnswer({ id: uuid(41), subjectId: BUILDING, field: ownerFloors, value: { quantity: { value: 10, unit: 'count', qualifier: 'upper' } }, minute: 2 });
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [memoriu],
    fileNames: { [memoriu.id]: 'TEST memoriu.pdf' },
    fields: [{ field: ownerFloors, subjectId: BUILDING, subjectKind: 'building', candidates: [read, own] }],
  });
  for (const [page, levels, displays] of registers(project)) {
    expect(levels.state, page).toBe('conflict');
    if (levels.state !== 'conflict') continue;
    expect(displayOf(displays, levels.line).text, page).toBe('Not available yet: two values for floors');
    const field = displayOf(displays, levels.field);
    expect(field.badge?.id, page).toBe('two_values');
    expect((field.lines ?? []).map((line) => line.text), page).not.toContain(ROUTING);
    expect(levels.actions, page).toEqual(['enter_floors']);
  }
});
