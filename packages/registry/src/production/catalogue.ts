/**
 * The owner's multi-select choices, as registry content (docs/guardrails.md
 * 2.6: "Multi-select choices are stored as one `decision` field per option on
 * the project subject. The multi-select choices are systems in scope, goals and
 * automation areas"; F-REGISTRY-08; F-VALUE-12).
 *
 * The options are the approved design's (onboarding-spec 3, steps 4, 6 and 7),
 * with one canonical name each. Which systems the catalogue finally covers is
 * open (dashboards 8.7, D-17): these are the eight of step 4 (prompt 3 5.2
 * "Systems catalogue").
 *
 * - Systems: Fire Safety is a life-safety system (rule 11): it is never
 *   preselected, and whether it is in scope never removes the fire-alarm input
 *   and fire-mode status from the point list (G11-3). Access Control (door
 *   release on escape routes) and Elevators (fire-fighter lifts) hold parts
 *   rule 11 names as life-safety; whether they count as life-safety systems is
 *   open (D-64), so, on the safe side, neither is preselected either
 *   (`neverPreselected`). Nothing here proposes any control of them.
 * - Goals: the "Other" card is not registered. It has no text field (a new
 *   question, onboarding Q11, prompt 3 5.2), so its answer could change no
 *   output, and rule 6 does not offer a question that changes nothing
 *   (US-INTAKE-09 AC4).
 * - Automation areas: Security & Access adds no control of any life-safety
 *   system (rule 11; US-INTAKE-10 AC5).
 */

export interface CatalogueOption {
  /** The option's key: the last part of its decision field's key. */
  readonly id: string;
  /** Its one canonical name. */
  readonly name: string;
}

export interface SystemOption extends CatalogueOption {
  /** Rule 11's life-safety systems. */
  readonly lifeSafety: boolean;
  /** Never preselected with Suggested (rule 3, rule 11; the safe side while D-64 is open). */
  readonly neverPreselected: boolean;
}

export const SYSTEMS: readonly SystemOption[] = Object.freeze([
  { id: 'hvac', name: 'HVAC', lifeSafety: false, neverPreselected: false },
  { id: 'lighting', name: 'Lighting', lifeSafety: false, neverPreselected: false },
  { id: 'energy', name: 'Energy', lifeSafety: false, neverPreselected: false },
  { id: 'access_control', name: 'Access Control', lifeSafety: false, neverPreselected: true },
  { id: 'fire_safety', name: 'Fire Safety', lifeSafety: true, neverPreselected: true },
  { id: 'water', name: 'Water', lifeSafety: false, neverPreselected: false },
  { id: 'elevators', name: 'Elevators', lifeSafety: false, neverPreselected: true },
  { id: 'cctv', name: 'CCTV', lifeSafety: false, neverPreselected: false },
]);

export const GOALS: readonly CatalogueOption[] = Object.freeze([
  { id: 'reduce_energy', name: 'Reduce energy consumption' },
  { id: 'lower_carbon', name: 'Lower carbon emissions' },
  { id: 'occupant_comfort', name: 'Improve guest comfort' },
  { id: 'operational_efficiency', name: 'Increase operational efficiency' },
  { id: 'compliance', name: 'Ensure compliance' },
  { id: 'asset_lifespan', name: 'Extend asset lifespan' },
  { id: 'reduce_operating_costs', name: 'Reduce operating costs' },
]);

export const AUTOMATION_AREAS: readonly CatalogueOption[] = Object.freeze([
  { id: 'hvac', name: 'HVAC' },
  { id: 'lighting', name: 'Lighting' },
  { id: 'energy_management', name: 'Energy Management' },
  { id: 'water_management', name: 'Water Management' },
  { id: 'security_access', name: 'Security & Access' },
  { id: 'predictive_maintenance', name: 'Predictive Maintenance' },
]);

/** The decision field of a system, goal or automation area. */
export const scopeFieldKey = (system: string): string => `project.scope.${system}`;
export const goalFieldKey = (goal: string): string => `project.goal.${goal}`;
export const automationFieldKey = (area: string): string => `project.automation.${area}`;

/** A system's decision: in scope or not (G10-7 reads "exclude"). */
export const SCOPE_OPTIONS = ['include', 'exclude'] as const;
/** A goal's or an automation area's decision: the owner selected it or not (US-INTAKE-09 AC2, US-INTAKE-10 AC2). */
export const SELECTION_OPTIONS = ['selected', 'not_selected'] as const;
