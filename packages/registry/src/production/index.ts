/**
 * The production registry: every field, question, formula signature, template
 * slot and reference dataset the app loads, the unit registry, and the
 * approver settings.
 *
 * Phase 1 holds the fields the S1 (proposed) requirements name, their questions
 * with their `affects`, and every formula signature and template slot an
 * `affects` entry names (prompt 3 section 10, "Phase 1"). Each addition must
 * pass registry validation (`pnpm checks -- --only registry`, which also runs
 * the sensitivity test) and be recorded in the unapproved baseline, which
 * refuses any loosening (ADR 0010). No reference dataset is declared: none has
 * an approval record (G1-12; D-92).
 *
 * Nothing here is TEST data: TEST formulas and datasets load only inside the
 * test runner (prompt 3 5.4).
 */
import { UNIT_DEFINITIONS } from '../units/units';
import { PROPOSED_SETTINGS } from '../validation/policy';
import type { RegistryBundle } from '../validation/schema';
import { PRODUCTION_FIELDS } from './fields';
import { FORMULA_SIGNATURES, TEMPLATE_SLOTS } from './formulas';
import { PRODUCTION_QUESTIONS } from './questions';

export const productionRegistry: RegistryBundle = {
  id: 'sovitech-production',
  version: '1',
  units: UNIT_DEFINITIONS.map((unit) => ({ ...unit })),
  fields: PRODUCTION_FIELDS.map((field) => ({ ...field })),
  questions: PRODUCTION_QUESTIONS.map((question) => ({ ...question })),
  formulas: FORMULA_SIGNATURES.map((formula) => ({ ...formula })),
  templateSlots: TEMPLATE_SLOTS.map((slot) => ({ ...slot })),
  datasets: [],
  settings: PROPOSED_SETTINGS,
};

export { AUTOMATION_AREAS, GOALS, SCOPE_OPTIONS, SELECTION_OPTIONS, SYSTEMS, automationFieldKey, goalFieldKey, scopeFieldKey } from './catalogue';
export type { CatalogueOption, SystemOption } from './catalogue';
export { AUTOMATION_FIELDS, FIELD, GOAL_FIELDS, OUTPUT, SCOPE_FIELDS } from './formulas';
