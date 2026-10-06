/**
 * The TEST point counts by type that the mirrored TEST points and preliminary-estimate bodies share (TEST code only;
 * not SOVITECH's method). Per building type in the TEST templates: each system in scope adds its base points by type
 * and, for hardware, points per upper floor; guest rooms add hardware points; HVAC control zones and each automation
 * area selected add virtual points. A decision ranged over its options (unknown, or in conflict) adds its points to the
 * high bound only; an excluded system or an area not selected adds none, because the owner's decision says so (rule 1:
 * a zero needs the owner saying so). Counts are exact intervals; nothing is rounded.
 */
import { AUTOMATION_AREAS, FIELD, SYSTEMS, automationFieldKey, scopeFieldKey } from '@sovitech/registry';
import type { BodyInputs } from '../src/catalogue';
import { exact, hull, multiply, point, sum, type Interval } from '../src/interval';
import type { Missing } from '../src/results';
import { choicesOf, decisionHolds, entriesOf, missingInput, quantityOf, tableNumber } from './engine-lib';
import { TEST_DATASET_IDS } from './datasets';
import { lookup } from './lib';

export type PointType = 'hardwareIo' | 'integration' | 'virtual';
export const POINT_TYPES: readonly PointType[] = ['hardwareIo', 'integration', 'virtual'];

/** No points: what an excluded system or an area not selected adds, by the owner's decision. */
const NO_POINTS: Interval = point(exact(0));

/** The terms a decision adds: the value for certain, the value or nothing when ranged over, nothing when it does not hold. */
function terms(holds: 'yes' | 'maybe' | 'no', value: Interval): Interval[] {
  switch (holds) {
    case 'yes':
      return [value];
    case 'maybe':
      return [hull([NO_POINTS, value])];
    case 'no':
      return [];
  }
}

/** The TEST point counts by type for the inputs, or what is missing. */
export function testPointCounts(inputs: BodyInputs): { readonly counts: Readonly<Record<PointType, Interval>> } | { readonly missing: readonly Missing[] } {
  const templates = entriesOf(inputs, TEST_DATASET_IDS.pointTemplates);
  const upper = quantityOf(inputs, FIELD.floors, 'count', 'upper');
  const guestRooms = quantityOf(inputs, FIELD.rooms, 'count', 'guest_rooms');
  const hvacZones = quantityOf(inputs, FIELD.zones, 'count', 'hvac_control');
  const gaps: Missing[] = [];
  if (upper === undefined) gaps.push(missingInput(inputs, FIELD.floors, 'unknown'));
  if (guestRooms === undefined) gaps.push(missingInput(inputs, FIELD.rooms, 'unknown'));
  if (hvacZones === undefined) gaps.push(missingInput(inputs, FIELD.zones, 'unknown'));
  if (upper === undefined || guestRooms === undefined || hvacZones === undefined) return { missing: gaps };

  const scope = SYSTEMS.map((system) => ({ id: system.id, holds: decisionHolds(inputs, scopeFieldKey(system.id), 'include') }));
  if (scope.every((system) => system.holds === 'no')) return { missing: [{ kind: 'method', name: 'TEST: no system in scope' }] };
  const areas = AUTOMATION_AREAS.map((area) => ({ id: area.id, holds: decisionHolds(inputs, automationFieldKey(area.id), 'selected') }));

  const byType: Record<PointType, Interval[]> = { hardwareIo: [], integration: [], virtual: [] };
  for (const type of choicesOf(inputs, FIELD.buildingType)) {
    const base = lookup(templates, 'base', type);
    if (base === undefined) return { missing: [{ kind: 'method', name: `TEST: no points template for the building type ${type}` }] };
    const perSystem = (pointType: PointType): Interval[] =>
      scope.flatMap((system) => {
        const own = point(tableNumber(base, [system.id, pointType], `base.${type}.${system.id}.${pointType}`));
        const floors = pointType === 'hardwareIo' ? [multiply(upper, point(tableNumber(templates, ['perUpperFloor', system.id], `perUpperFloor.${system.id}`)))] : [];
        return terms(system.holds, sum([own, ...floors]));
      });
    const areaPoints = areas.flatMap((area) => terms(area.holds, point(tableNumber(templates, ['perArea', area.id], `perArea.${area.id}`))));
    byType.hardwareIo.push(sum([...perSystem('hardwareIo'), multiply(guestRooms, point(tableNumber(templates, ['perGuestRoom'], 'perGuestRoom')))]));
    byType.integration.push(sum(perSystem('integration')));
    byType.virtual.push(sum([...perSystem('virtual'), ...areaPoints, multiply(hvacZones, point(tableNumber(templates, ['perHvacZone'], 'perHvacZone')))]));
  }
  return { counts: { hardwareIo: hull(byType.hardwareIo), integration: hull(byType.integration), virtual: hull(byType.virtual) } };
}
