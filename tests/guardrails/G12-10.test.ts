/**
 * G12-10 (new in phase 4; rule 12, "Absence of evidence is not evidence of absence": "'No AHU found in the analysed
 * documents (pages 1-60 of 200)' is correct. 'The building has no AHU' is not"; "Absence never sets
 * `not_applicable`, and never sets a count to zero"; the same reading as G12-8: nothing counts as searched until a
 * completed AI run searched it).
 * Situation: the Equipment and Zones registers and Topology's groups of a project whose documents no completed AI run
 * searched.
 * Expected: no "Not found in the analysed documents" statement appears.
 *
 * Each register says what is stored and nothing more (packages/view-model/src/workspace/shared.ts `registerState`):
 * `no_documents`, `reading`, `none_read` (documents exist; nothing of this register came from them; the copy never
 * says they were searched) or `listed`. No display is Not found in documents, no count reads zero, nothing is Not
 * applicable.
 */
import { expect, test } from 'vitest';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { equipmentView, systemScopeView, topologyView, zonesView } from '@sovitech/view-model/server';
import { productionRegistry, scopeFieldKey } from '@sovitech/registry';
import { ownerAnswer, ownerConfirmation, testDocument } from './_support/builders';
import { uuid } from './_support/view-model';
import { shownTexts, testWorkspace, type TestSubjectField } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const read = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'d'.repeat(64)}` };
const reading = { ...testDocument(uuid(11), PROJECT, 'unknown'), contentHash: `sha256:${'e'.repeat(64)}`, analysis: { status: 'analysing' as const, coverage: 'pending' } };

function scope(): TestSubjectField[] {
  return productionRegistry.fields
    .filter((field) => field.key.startsWith('project.scope.'))
    .map((field, index) => {
      if (field.key !== scopeFieldKey('hvac')) return { field, subjectId: PROJECT, subjectKind: 'project' as const };
      const own = ownerAnswer({ id: uuid(100 + index), subjectId: PROJECT, field, value: { choice: 'include' }, minute: 1 });
      return { field, subjectId: PROJECT, subjectKind: 'project' as const, candidates: [own], candidateEvents: [ownerConfirmation(own)] };
    });
}

function noNotFound(displays: readonly DisplayObject[], label: string): void {
  for (const text of shownTexts(displays)) {
    expect(text, label).not.toMatch(/not found/iu);
    expect(text, label).not.toMatch(/^0\b|\bno (equipment|zones?|assets?)\b|\bnone\b/iu);
  }
  for (const display of displays) {
    expect(display.badge?.id, `${label} ${display.valueId}`).not.toBe('not_found_in_documents');
    expect(display.missing, `${label} ${display.valueId}`).not.toBe('not_found_in_documents');
    expect(display.badge?.id, `${label} ${display.valueId}`).not.toBe('not_applicable');
  }
}

test('US-ASSETS-01 · US-ZONES-01 · US-TOPO-01 · G12-10: with documents no completed AI run searched, Equipment, Zones and Topology say only what is stored, never "Not found in the analysed documents"', () => {
  for (const [label, documents, expected] of [
    ['documents read, nothing of the register from them', [read], 'none_read'],
    ['a document still being read', [read, reading], 'reading'],
    ['no document', [], 'no_documents'],
  ] as const) {
    const project = testWorkspace({ projectId: PROJECT, buildingId: BUILDING, documents, fields: scope() });
    expect(project.searched).toBe(false);
    const equipment = equipmentView(project, {});
    expect(equipment.view.state, label).toBe(expected);
    expect(equipment.view.rows, label).toEqual([]);
    noNotFound(equipment.displayObjects, `${label}: equipment`);
    const zones = zonesView(project, {});
    expect(zones.view.state, label).toBe(expected);
    noNotFound(zones.displayObjects, `${label}: zones`);
    const topology = topologyView(project);
    expect(topology.view.groups.map((group) => group.systemId), label).toEqual(['hvac']);
    noNotFound(topology.displayObjects, `${label}: topology`);
    noNotFound(systemScopeView(project).displayObjects, `${label}: system scope`);
  }
});
