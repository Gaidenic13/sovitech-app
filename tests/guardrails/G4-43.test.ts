/**
 * G4-43 (new in phase 4 part B; 2.3, "Deleting a document": "Deleting a document withdraws each candidate whose evidence
 * comes only from that document ... A field left with no eligible candidate returns to unknown"; 2.2: a zone is a
 * subject that holds values; rule 12, "Absence of evidence is not evidence of absence"; as 2.5 counts an asset only with
 * evidence from a document that is not removed (G4-28); finding A-9).
 * Situation: a zone is read only from one document, and the owner deletes that document.
 * Expected: the zone is not listed.
 *
 * The zone register (packages/view-model/src/workspace/registers.ts `listedZones`) lists a zone with an eligible value on
 * one of its fields or a value with evidence from a document that is not removed; Zones' rows, its state and Equipment's
 * zone filter read it. Before the fix the zone stayed listed as an all-Unknown row with the state `listed`. Beside the
 * case: a zone that also holds the owner's own value stays listed. Every value is TEST data; the zone fields are TEST
 * fields (no zone field is in the production registry, ADR 0045 decision 1).
 */
import { expect, test } from 'vitest';
import { equipmentView, zonesView } from '@sovitech/view-model/server';
import { testDocument, testTime } from './_support/builders';
import { registryField, uuid } from './_support/view-model';
import { testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const ZONE = uuid(4);
const OTHER = uuid(5);
const zoneName = registryField('zone.name', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
const one = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'f'.repeat(64)}` };
const deletion = { documentId: one.id, type: 'withdrawn' as const, by: 'test-owner', role: 'owner' as const, at: testTime(30), reason: 'owner_deleted_document' };
const fromOne = (id: number, subjectId: string, text: string) => ({
  id: uuid(id),
  subjectId,
  fieldKey: zoneName.key,
  text,
  source: 'document' as const,
  evidence: [{ documentId: one.id, contentHash: one.contentHash, locator: { page: 1 }, excerpt: `TEST ${text}`, check: 'text_match' as const }],
  createdBy: 'test-extractor',
  authorRole: 'system' as const,
  createdAt: testTime(id),
});

test('A-9 · 2.3 · rule 12 · G4-43: a zone read only from a deleted document is not listed, nor offered by Equipment\'s zone filter', () => {
  const input = {
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [one],
    zoneIds: [ZONE],
    fields: [{ field: zoneName, subjectId: ZONE, subjectKind: 'zone' as const, candidates: [fromOne(20, ZONE, 'TEST Zona 1')] }],
  };
  const before = zonesView(testWorkspace(input), {});
  expect(before.view.rows.map((row) => row.zoneId)).toEqual([ZONE]);

  const after = testWorkspace({ ...input, documentEvents: [deletion] });
  const zones = zonesView(after, {});
  expect(zones.view.rows).toEqual([]);
  expect(zones.view.details).toEqual([]);
  expect(zones.view.state).not.toBe('listed');
  expect(equipmentView(after, {}).view.filters.zones).toEqual([]);
});

test('2.3 · G4-43 (beside the case): a zone that also holds the owner\'s own value keeps it, and stays listed', () => {
  const own = { id: uuid(21), subjectId: OTHER, fieldKey: zoneName.key, text: 'TEST Zona B', source: 'user' as const, evidence: [], createdBy: 'test-owner', authorRole: 'owner' as const, createdAt: testTime(21) };
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [one],
    documentEvents: [deletion],
    zoneIds: [ZONE, OTHER],
    fields: [
      { field: zoneName, subjectId: ZONE, subjectKind: 'zone', candidates: [fromOne(20, ZONE, 'TEST Zona 1')] },
      { field: zoneName, subjectId: OTHER, subjectKind: 'zone', candidates: [fromOne(22, OTHER, 'TEST Zona 2'), own] },
    ],
  });
  expect(zonesView(project, {}).view.rows.map((row) => row.zoneId)).toEqual([OTHER]);
});
