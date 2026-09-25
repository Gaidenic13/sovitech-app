/**
 * The formula signatures and proposal template slots that the production
 * fields' `affects` name (docs/guardrails.md rule 6: "Each field declares the
 * concrete outputs its value changes: formula ids or proposal template slots";
 * prompt 3 section 10, phase 1: "Phase 1 declares every formula signature that
 * an `affects` entry names (id, version, input field keys, output,
 * `unknownPolicy`), so validation can find each consumer before the formula
 * body exists").
 *
 * No body exists yet, and none may be written for a method no source defines
 * (prompt 3 phase 5): each estimated formula waits for its SOVITECH dataset
 * (point templates, cost ranges, the function set, benchmarks, savings
 * factors) behind its gate, and its output reads "Not available yet" naming
 * what is missing. A signature fixes only what the formula reads and what it
 * produces; a formula version is immutable once a body exists (2.4).
 *
 * `inputs` lists every field the formula reads, through another formula too
 * (the preliminary investment estimate prices the points estimate, so it reads
 * the points estimate's inputs). Outputs:
 * - `capexIndicativeRange@1`: rule 10's stage 1, "Indicative range", from
 *   benchmarks only (estimated: 2.1 "CAPEX from €/point"; `dataset-cost-ranges`).
 * - `pointsEstimate@1`: points by type, hardware I/O, integration and virtual,
 *   never summed into one priced total (rule 8 "Points"; 2.1 "Points from
 *   per-room tables ... are always estimated"; `dataset-point-templates`).
 * - `capexPreliminaryEstimate@1`: rule 10's stage 2, "Preliminary investment
 *   estimate", from this project's data (estimated; `dataset-cost-ranges`);
 *   a range over reuse and replacement while no survey exists (rule 1 "Reuse";
 *   G1-7) and over supply options (rule 10; G10-6).
 * - `operatingEnergyEstimate@1`: annual operating energy (2.1 "consumption from
 *   capacity × hours are always estimated"), a range over the schedule's options
 *   when it is skipped (G7-1). Its cost in currency waits for the
 *   `financial-indicators` and `units-7.2.22` gates.
 * - `savingsEstimate@1`: annual energy savings, always estimated (rule 10,
 *   "Savings, payback, ROI and performance").
 * - `measurePriority@1`: the order in which the proposal presents SOVITECH's
 *   measures, from the owner's goals (onboarding-spec 3 step 6: goals "decide
 *   which measures and KPIs the proposal and dashboards emphasise") over the
 *   measures of the systems in scope and the automation areas; not a number.
 *   It reads the SOVITECH function set (rule 9, "Automation levels are
 *   defined"), which is not approved.
 * - `template:proposal.title`: the proposal names its project.
 */
import type { FormulaSignature, TemplateSlot } from '../validation/schema';
import { AUTOMATION_AREAS, GOALS, SYSTEMS, automationFieldKey, goalFieldKey, scopeFieldKey } from './catalogue';

export const FIELD = {
  projectName: 'project.name',
  projectType: 'project.type',
  country: 'project.country',
  city: 'project.city',
  grossFloorArea: 'building.grossFloorArea',
  buildingType: 'building.type',
  occupancy: 'project.occupancy',
  operatingSchedule: 'project.operatingSchedule',
  floors: 'building.floors',
  rooms: 'building.rooms',
  zones: 'building.zones',
} as const;

export const SCOPE_FIELDS: readonly string[] = SYSTEMS.map((system) => scopeFieldKey(system.id));
export const GOAL_FIELDS: readonly string[] = GOALS.map((goal) => goalFieldKey(goal.id));
export const AUTOMATION_FIELDS: readonly string[] = AUTOMATION_AREAS.map((area) => automationFieldKey(area.id));

export const OUTPUT = {
  indicativeRange: 'capex.indicativeRange',
  pointsHardwareIo: 'points.hardwareIo',
  pointsIntegration: 'points.integration',
  pointsVirtual: 'points.virtual',
  preliminaryEstimate: 'capex.preliminaryEstimate',
  annualEnergy: 'energy.annualConsumption',
  annualSavings: 'savings.annualEnergy',
  measurePriority: 'measures.priorityOrder',
  proposalTitle: 'proposal.title',
} as const;

const POINTS_INPUTS: readonly string[] = [FIELD.buildingType, FIELD.floors, FIELD.rooms, FIELD.zones, ...SCOPE_FIELDS, ...AUTOMATION_FIELDS];
const ENERGY_INPUTS: readonly string[] = [FIELD.buildingType, FIELD.grossFloorArea, FIELD.occupancy, FIELD.operatingSchedule, FIELD.country, FIELD.city];

export const FORMULA_SIGNATURES: readonly FormulaSignature[] = [
  {
    id: 'capexIndicativeRange',
    version: '1',
    inputs: [FIELD.projectType, FIELD.country, FIELD.buildingType, FIELD.grossFloorArea, ...SCOPE_FIELDS],
    outputs: [OUTPUT.indicativeRange],
    unknownPolicy: 'refuse',
    estimated: true,
  },
  {
    id: 'pointsEstimate',
    version: '1',
    inputs: [...POINTS_INPUTS],
    outputs: [OUTPUT.pointsHardwareIo, OUTPUT.pointsIntegration, OUTPUT.pointsVirtual],
    unknownPolicy: 'range_over_options',
    estimated: true,
  },
  {
    id: 'capexPreliminaryEstimate',
    version: '1',
    inputs: [FIELD.projectType, FIELD.country, ...POINTS_INPUTS],
    outputs: [OUTPUT.preliminaryEstimate],
    unknownPolicy: 'range_over_options',
    estimated: true,
  },
  {
    id: 'operatingEnergyEstimate',
    version: '1',
    inputs: [...ENERGY_INPUTS],
    outputs: [OUTPUT.annualEnergy],
    unknownPolicy: 'range_over_options',
    estimated: true,
  },
  {
    id: 'savingsEstimate',
    version: '1',
    inputs: [...ENERGY_INPUTS, ...SCOPE_FIELDS, ...AUTOMATION_FIELDS],
    outputs: [OUTPUT.annualSavings],
    unknownPolicy: 'range_over_options',
    estimated: true,
  },
  {
    id: 'measurePriority',
    version: '1',
    inputs: [...GOAL_FIELDS, ...SCOPE_FIELDS, ...AUTOMATION_FIELDS],
    outputs: [OUTPUT.measurePriority],
    unknownPolicy: 'refuse',
    estimated: false,
  },
];

export const TEMPLATE_SLOTS: readonly TemplateSlot[] = [{ id: 'proposal.title', reads: [FIELD.projectName] }];

/** `formula:<id>@<version>` of a declared signature, for `affects`. */
export function via(id: (typeof FORMULA_SIGNATURES)[number]['id']): string {
  const signature = FORMULA_SIGNATURES.find((item) => item.id === id);
  if (signature === undefined) throw new Error(`packages/registry/src/production/formulas.ts: no signature ${id}`);
  return `formula:${signature.id}@${signature.version}`;
}
