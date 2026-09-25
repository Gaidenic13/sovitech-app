/**
 * The production registry: every field, question, formula signature, template
 * slot and reference dataset the app loads, and the approver settings.
 *
 * Phase 0 holds only the settings, each with the value the guardrails state
 * and its status ("proposed" or "rule"; none is approved). Phase 1 adds the
 * fields the S1 stories need, the questions with their `affects`, and every
 * formula signature an `affects` entry names (prompt 3 section 10, "Phase 1").
 * Each addition must pass registry validation (`pnpm checks -- --only registry`)
 * and be recorded in the unapproved baseline with
 * `tsx tools/checks/loosening/write-baseline.ts`, which refuses any loosening.
 *
 * Nothing here is TEST data: TEST formulas and datasets load only inside the
 * test runner (prompt 3 5.4).
 */
import { PROPOSED_SETTINGS } from '../validation/policy';
import type { RegistryBundle } from '../validation/schema';

export const productionRegistry: RegistryBundle = {
  id: 'sovitech-production',
  version: '0',
  units: [],
  fields: [],
  questions: [],
  formulas: [],
  templateSlots: [],
  datasets: [],
  settings: PROPOSED_SETTINGS,
};
