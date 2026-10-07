/**
 * The intake step of a production field: one map for the wizard, the workspace and the stored proposal (phase 5 part B,
 * DR-12; phase 6). The wizard reads it for the step a field's findings dot and whose confirmations it counts in
 * (apps/api wizard/registry.ts `stepOfField`, rule 5's budget, G7-4); the stored proposal reads it to list its basis by
 * intake step (../proposal/view.ts), so related inputs sit together in the order the owner answered them.
 *
 * Step 1's four answers; step 3's building facts (the gross floor area's question is step 8's inline ask, but its
 * findings belong to step 3, where it is shown); step 4's systems; step 5's building type, schedule and occupancy; step
 * 6's goals; step 7's automation areas. Steps 2 and 8 hold no field of their own.
 */
import { AUTOMATION_FIELDS, FIELD, GOAL_FIELDS, SCOPE_FIELDS } from '@sovitech/registry';
import type { StepNumber } from '../browser/contract';

/** Step 1's four required answers (rule 7). */
export const STEP_1_FIELDS: readonly string[] = [FIELD.projectName, FIELD.projectType, FIELD.country, FIELD.city];
/** Step 3's building facts: the gross floor area and the counts rule 8 qualifies (R-045). */
export const STEP_3_FACTS: readonly string[] = [FIELD.grossFloorArea, FIELD.floors, FIELD.rooms, FIELD.zones];
/** Step 5's operation: the building type, the schedule and the occupancy. */
export const STEP_5_FIELDS: readonly string[] = [FIELD.buildingType, FIELD.operatingSchedule, FIELD.occupancy];

/** The step of a production field (see the header), or undefined for a field no step shows. */
export function productionStepOfField(fieldKey: string): StepNumber | undefined {
  if (STEP_1_FIELDS.includes(fieldKey)) return 1;
  if (STEP_3_FACTS.includes(fieldKey)) return 3;
  if (SCOPE_FIELDS.includes(fieldKey)) return 4;
  if (STEP_5_FIELDS.includes(fieldKey)) return 5;
  if (GOAL_FIELDS.includes(fieldKey)) return 6;
  if (AUTOMATION_FIELDS.includes(fieldKey)) return 7;
  return undefined;
}
