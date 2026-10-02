/**
 * G8-24 (new in phase 4 part B; rule 8, "Floors": "Store floors as counts by level type ... Numbering follows the
 * document"; 2.2: a level is a subject, a zone is a subject; PRD R-077 ("level labels"), US-ASSETS-05 AC2, US-ZONES-02
 * AC2; dashboards 7.1.1-E4; findings V-1 and A-12).
 * Situation: a zone and an asset whose stored level is `upper_1`, the asset's zone stored as the zone's id, and a floor
 * structure of two upper floors.
 * Expected (as indexed in section 7): Zones, Equipment, the asset record and System Scope's panel show that level by the
 * level register's label, the same on each, and the asset's zone by the zone's name. No display shows the stored key or
 * the zone's id. (The register's label for `upper_1` is E1 in the interim notation, ADR 0045 decision 3, D-18.)
 *
 * The level and zone fields keep their own display (value id, badge, source line, actions) with the text named by the
 * register (packages/view-model/src/workspace/registers.ts `referenceDisplays`), the same function on every page, so a
 * value id has one display (G2-7); the asset's history names them the same way. Before the fix Equipment and Zones
 * served "upper_1" and the zone's UUID while System Scope's panel served E1. Every value is TEST data; the asset and
 * zone fields are TEST fields (no such field is in the production registry, ADR 0045 decision 1).
 */
import { expect, test } from 'vitest';
import { SYSTEMS } from '@sovitech/registry';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { assetView, equipmentView, systemScopeView, zonesView } from '@sovitech/view-model/server';
import { ownerAnswer, testDocument, testTime } from './_support/builders';
import { productionField, registryField, uuid } from './_support/view-model';
import { displayOf, shownTexts, testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const ASSET = uuid(3);
const ZONE = uuid(4);
const floors = productionField('building.floors');
const assetSystem = registryField('asset.system', { kind: 'enum', subject: 'asset', options: SYSTEMS.map((entry) => entry.id), confirmBy: 'engineer' });
const assetLevel = registryField('asset.level', { kind: 'text', subject: 'asset', confirmBy: 'engineer' });
const assetZone = registryField('asset.zone', { kind: 'text', subject: 'asset', confirmBy: 'engineer' });
const zoneName = registryField('zone.name', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
const zoneLevel = registryField('zone.level', { kind: 'text', subject: 'zone', confirmBy: 'engineer' });
const schedule = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'c'.repeat(64)}` };
const evidence = { documentId: schedule.id, contentHash: schedule.contentHash, locator: { page: 1 }, excerpt: 'TEST CTA-01 hvac upper_1', check: 'text_match' as const };

/** A document value of a text or choice field (the tag line as written). */
function read(id: number, subjectId: string, fieldKey: string, value: { readonly text: string } | { readonly choice: string }) {
  return { id: uuid(id), subjectId, fieldKey, ...value, source: 'document' as const, evidence: [evidence], createdBy: 'test-extractor', authorRole: 'system' as const, createdAt: testTime(id) };
}

test('V-1 · A-12 · R-077 · US-ASSETS-05 AC2 · US-ZONES-02 AC2 · 7.1.1-E4 · G8-24: a stored level upper_1 shows E1 on Zones, Equipment, the asset record and System Scope; the asset\'s zone shows the zone\'s name', () => {
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [schedule],
    fileNames: { [schedule.id]: 'TEST schedule.pdf' },
    zoneIds: [ZONE],
    identities: [{ assetId: ASSET, projectId: PROJECT, normalisedTag: 'TEST-CTA-01' }],
    appearances: [{ id: uuid(30), projectId: PROJECT, tagAsWritten: 'TEST-CTA-01', evidence: [evidence] }],
    fields: [
      { field: floors, subjectId: BUILDING, subjectKind: 'building', candidates: [ownerAnswer({ id: uuid(20), subjectId: BUILDING, field: floors, value: { quantity: { value: 2, unit: 'count', qualifier: 'upper' } }, minute: 1 })] },
      { field: assetSystem, subjectId: ASSET, subjectKind: 'asset', candidates: [read(21, ASSET, assetSystem.key, { choice: 'hvac' })] },
      { field: assetLevel, subjectId: ASSET, subjectKind: 'asset', candidates: [read(22, ASSET, assetLevel.key, { text: 'upper_1' })] },
      { field: assetZone, subjectId: ASSET, subjectKind: 'asset', candidates: [read(23, ASSET, assetZone.key, { text: ZONE })] },
      { field: zoneName, subjectId: ZONE, subjectKind: 'zone', candidates: [read(24, ZONE, zoneName.key, { text: 'TEST Zona 1' })] },
      { field: zoneLevel, subjectId: ZONE, subjectKind: 'zone', candidates: [read(25, ZONE, zoneLevel.key, { text: 'upper_1' })] },
    ],
  });

  const equipment = equipmentView(project, {});
  const [row] = equipment.view.rows;
  const level = displayOf(equipment.displayObjects, row?.level ?? '');
  expect(level).toMatchObject({ valueId: `asset:${ASSET}.level`, text: 'E1', badge: { id: 'sovitech_will_check' }, sourceLine: { text: 'Found in TEST schedule.pdf, page 1' } });
  expect(displayOf(equipment.displayObjects, row?.zone ?? '')).toMatchObject({ valueId: `asset:${ASSET}.zone`, text: 'TEST Zona 1' });

  const record = assetView(project, ASSET);
  if (record === undefined) throw new Error('the asset is listed');
  expect(displayOf(record.displayObjects, `asset:${ASSET}.level`)).toEqual(level);
  expect(displayOf(record.displayObjects, `asset:${ASSET}.zone`).text).toBe('TEST Zona 1');
  const histories = record.view.history.flatMap((entry) => entry.entries.map((item) => displayOf(record.displayObjects, item.display).text));
  expect(histories).toEqual(expect.arrayContaining(['E1', 'TEST Zona 1']));

  const zones = zonesView(project, {});
  expect(displayOf(zones.displayObjects, zones.view.rows[0]?.level ?? '').text).toBe('E1');
  expect(zones.view.details[0]?.fields.map((id) => displayOf(zones.displayObjects, id).text)).toContain('E1');

  const scope = systemScopeView(project);
  const hvac = scope.view.systems.find((entry) => entry.systemId === 'hvac');
  expect(displayOf(scope.displayObjects, hvac?.levels ?? '').text).toBe('E1');

  const all: readonly DisplayObject[] = [...equipment.displayObjects, ...record.displayObjects, ...zones.displayObjects, ...scope.displayObjects];
  for (const text of shownTexts(all)) {
    expect(text).not.toMatch(/\bupper_1\b/u);
    expect(text).not.toContain(ZONE);
  }
});
