/**
 * The question and confirmation registry (docs/guardrails.md rules 5, 6 and 7;
 * F-QUESTION-01 to 03), phase 1: the questions the approved wizard asks and
 * guardrails section 5 keeps.
 *
 * A question references its fields and inherits their `affects` (rule 6), so
 * each must pass the sensitivity test on the synthetic fixture project
 * (tools/checks/registry/sensitivity-suite.ts). Wording and the one-line reason
 * are the app's (rule 6: "The AI does not write questions"), written with the
 * screens in phase 3; ids here are keys, not copy.
 *
 * Kept out, and why:
 * - no question for area, floors, rooms or zones on step 3: a manual-entry form
 *   would ask new questions (prompt 3 5.2 "No documents"). Gross floor area is
 *   asked once, inline at step 8, only while it is missing, because it is in the
 *   first-estimate set (rule 7);
 * - no note fields on steps 5 and 6, no "Other" text and no follow-up inputs:
 *   each would be a new question (onboarding Q11, new Q4; prompt 3 5.2);
 * - one confirmation, building type's inline "Yes, it's a hotel" (guardrails
 *   section 4 and section 5, step 5): the other fields rule 5 might confirm are
 *   engineer fields, which the owner is never asked to confirm (rule 3). The
 *   budget is the registry setting (rule 5: proposed 7; D-53).
 */
import type { QuestionDefinition } from '../validation/schema';
import { FIELD, AUTOMATION_FIELDS, GOAL_FIELDS, SCOPE_FIELDS } from './formulas';

export const PRODUCTION_QUESTIONS: readonly QuestionDefinition[] = [
  { id: 'q.project.name', kind: 'question', fieldKeys: [FIELD.projectName], step: 1 },
  { id: 'q.project.type', kind: 'question', fieldKeys: [FIELD.projectType], step: 1 },
  { id: 'q.project.location', kind: 'question', fieldKeys: [FIELD.country, FIELD.city], step: 1 },
  { id: 'q.project.systemsInScope', kind: 'question', fieldKeys: [...SCOPE_FIELDS], step: 4 },
  { id: 'q.building.type', kind: 'question', fieldKeys: [FIELD.buildingType], step: 5, condition: 'no eligible candidate for the building type' },
  {
    id: 'c.building.type',
    kind: 'confirmation',
    fieldKeys: [FIELD.buildingType],
    step: 5,
    condition: "rule 5's test passes (an inferred or ambiguous building type) and the confirmation fits the budget",
  },
  { id: 'q.project.occupancy', kind: 'question', fieldKeys: [FIELD.occupancy], step: 5, condition: 'no eligible candidate for the occupancy' },
  {
    id: 'q.project.operatingSchedule',
    kind: 'question',
    fieldKeys: [FIELD.operatingSchedule],
    step: 5,
    condition: 'no eligible candidate for the operating schedule',
  },
  { id: 'q.project.goals', kind: 'question', fieldKeys: [...GOAL_FIELDS], step: 6 },
  { id: 'q.project.automationAreas', kind: 'question', fieldKeys: [...AUTOMATION_FIELDS], step: 7 },
  {
    id: 'q.building.grossFloorArea',
    kind: 'question',
    fieldKeys: [FIELD.grossFloorArea],
    step: 8,
    condition: 'inline at step 8, once, while the gross floor area of the first-estimate set is still missing (rule 7)',
  },
];
