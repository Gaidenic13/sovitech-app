/**
 * G7-14 (new in phase 4; rule 7, "'Not available yet' never appears alone. It names what is missing and offers the
 * action"; rule 8, "Floors": "Store floors as counts by level type ... Parts with no source are Unknown"; rule 4,
 * "Until a conflict is resolved": a formula "never runs on one of the values"; PRD R-076, R-077: "With no floor
 * structure known, a floors list reads 'Not available yet', naming the floor structure, with actions to upload a
 * document or enter the floors").
 * Situation: no floor structure is known.
 * Expected: the floors list and the floor filter read "Not available yet", naming the floor structure, with the
 * actions to upload a document and to enter the floors.
 *
 * The level register is the workspace's one derivation (packages/view-model/src/workspace/levels.ts): the frame's
 * floors list and every page's floor filter (Equipment, Zones, Topology) read it. Beside the case: a known floor
 * structure lists its levels bottom up in the regim's notation (ADR 0045 decision 3; D-18 interim), the level types
 * no source states named once as Unknown, and a floor structure in conflict lists nothing.
 */
import { expect, test } from 'vitest';
import type { DisplayObject, LevelRegister } from '@sovitech/view-model/browser';
import { equipmentView, frameView, topologyView, zonesView } from '@sovitech/view-model/server';
import { documentReading, ownerAnswer, testDocument } from './_support/builders';
import { productionField, uuid } from './_support/view-model';
import { displayOf, testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const floors = productionField('building.floors');
const memoriu = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'a'.repeat(64)}` };
const releveu = { ...testDocument(uuid(11), PROJECT, 'unknown'), contentHash: `sha256:${'b'.repeat(64)}` };

test('US-MODEL-02 · R-077 · G7-14: with no floor structure known, the floors list and every floor filter read "Not available yet: floor structure" with upload and enter-floors actions', () => {
  for (const withDocument of [false, true]) {
    const project = testWorkspace({
      projectId: PROJECT,
      buildingId: BUILDING,
      documents: withDocument ? [memoriu] : [],
      fields: [{ field: floors, subjectId: BUILDING, subjectKind: 'building' }],
    });
    const frame = frameView(project);
    const registers: [string, LevelRegister, readonly DisplayObject[]][] = [
      ['frame', frame.view.levels, frame.displayObjects],
      ['equipment', equipmentView(project, {}).view.filters.levels, equipmentView(project, {}).displayObjects],
      ['zones', zonesView(project, {}).view.levels, zonesView(project, {}).displayObjects],
      ['topology', topologyView(project).view.levels, topologyView(project).displayObjects],
    ];
    for (const [page, levels, displays] of registers) {
      expect(levels.state, page).toBe('unknown');
      if (levels.state !== 'unknown') continue;
      expect(levels.actions, page).toEqual(['upload_document', 'enter_floors']);
      const line = displayOf(displays, levels.line);
      expect(line.text, page).toBe('Not available yet: floor structure');
      expect(line.missing, page).toBe('not_available_yet');
    }
  }
});

test('R-076 · ADR 0045 decision 3 · G7-14 (beside the case): a known floor structure lists its levels bottom up in the regim notation, and names the level types no source states as Unknown', () => {
  const below = documentReading({ id: uuid(20), subjectId: BUILDING, field: floors, document: memoriu, value: { quantity: { value: 2, unit: 'count', qualifier: 'below_ground' } }, minute: 1 });
  const ground = documentReading({ id: uuid(21), subjectId: BUILDING, field: floors, document: memoriu, value: { quantity: { value: 1, unit: 'count', qualifier: 'ground' } }, minute: 1 });
  const upper = documentReading({ id: uuid(22), subjectId: BUILDING, field: floors, document: memoriu, value: { quantity: { value: 3, unit: 'count', qualifier: 'upper' } }, minute: 1 });
  const setback = documentReading({ id: uuid(23), subjectId: BUILDING, field: floors, document: memoriu, value: { quantity: { value: 1, unit: 'count', qualifier: 'setback_or_technical' } }, minute: 1 });
  const project = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, documents: [memoriu], fields: [{ field: floors, subjectId: BUILDING, subjectKind: 'building', candidates: [below, ground, upper, setback] }] });
  const { view, displayObjects } = frameView(project);
  expect(view.levels.state).toBe('known');
  if (view.levels.state !== 'known') return;
  expect(view.levels.levels.map((level) => level.key)).toEqual(['below_ground_2', 'below_ground_1', 'ground_1', 'upper_1', 'upper_2', 'upper_3', 'setback_or_technical_1']);
  expect(view.levels.levels.map((level) => displayOf(displayObjects, level.label).text)).toEqual(['S2', 'S1', 'P', 'E1', 'E2', 'E3', 'Er']);
  expect(view.levels.levels.every((level) => level.label === `building:${BUILDING}.levels.${level.key}`)).toBe(true);
  expect(view.levels.unstated).not.toBeNull();
  expect(displayOf(displayObjects, view.levels.unstated ?? '').text).toBe('Unknown: semi-basement, mezzanine, attic, roof plant');
});

test('rule 4 · G7-14 (beside the case): a floor structure in conflict builds no list from either value', () => {
  const read = documentReading({ id: uuid(30), subjectId: BUILDING, field: floors, document: memoriu, value: { quantity: { value: 12, unit: 'count', qualifier: 'upper' } }, minute: 1 });
  const other = documentReading({ id: uuid(31), subjectId: BUILDING, field: floors, document: releveu, value: { quantity: { value: 14, unit: 'count', qualifier: 'upper' } }, minute: 2 });
  const project = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, documents: [memoriu, releveu], fields: [{ field: floors, subjectId: BUILDING, subjectKind: 'building', candidates: [read, other] }] });
  const { view, displayObjects } = frameView(project);
  expect(view.levels.state).toBe('conflict');
  if (view.levels.state !== 'conflict') return;
  expect(displayOf(displayObjects, view.levels.line).text).toBe('Not available yet: two values for floors');

  // The owner's own count is a floor structure too (Edit on step 3 is "enter the floors").
  const own = ownerAnswer({ id: uuid(32), subjectId: BUILDING, field: floors, value: { quantity: { value: 1, unit: 'count', qualifier: 'ground' } }, minute: 3 });
  const entered = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, fields: [{ field: floors, subjectId: BUILDING, subjectKind: 'building', candidates: [own] }] });
  const levels = frameView(entered).view.levels;
  expect(levels.state === 'known' ? levels.levels.map((level) => level.key) : levels.state).toEqual(['ground_1']);
});
