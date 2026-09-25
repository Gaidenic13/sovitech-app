/**
 * The production field registry (docs/guardrails.md 2.6; F-REGISTRY-01), phase 1:
 * the fields the S1 (proposed) requirements name, and no more (build-readiness
 * 3 "Now" item 3: slice 1 registers slice-1 fields; the registry grows each
 * phase).
 * - Step 1's four required fields (rule 7's closed list; R-001).
 * - The proposed first-estimate set (rule 7): building type, gross floor area,
 *   and the systems in scope, one decision field per system (2.6; R-051).
 * - Steps 5 to 7 (R-002): occupancy, operating schedule, goals and automation
 *   areas, the last two one decision field per option.
 * - Step 3's building facts that feed an output (R-045): floors by level type,
 *   rooms and zones, each a count with what it counts (rule 8). The equipment
 *   count and the systems count of step 3 are calculated outputs of the asset
 *   register and the scope, registered with their formulas (phases 4 and 5).
 *
 * Every value is the strictest prompt 3 5.2 ("Registry values") allows, never an
 * invented one, and all are recorded unapproved in "unapproved baseline v0"
 * (ADR 0010):
 * - no tolerance and no plausible range on any field (any difference is a
 *   conflict; the plausibility check waits for SOVITECH ranges; D-93);
 * - estimation `forbidden` on every field: none of these names an estimated
 *   method of 2.1 or rule 10 (the estimates are the formulas' outputs);
 * - `confirmBy` `engineer` unless rule 3 names the owner: the owner confirms
 *   identity (project name, city, country), use and occupancy (building type,
 *   occupancy, operating schedule) and their own choices (project type, systems
 *   in scope, goals, automation areas). Area, floors, rooms and zones are
 *   technical facts rule 3 does not name, so an engineer checks them;
 * - criticality `required` only for the four step 1 fields, `first_estimate`
 *   only for the proposed set; below that, `for_quotation` for the engineer's
 *   facts (only the formal quotation waits, and it needs them verified by an
 *   engineer: rule 7) and `optional` for the owner's own choices, which rule 7
 *   says "narrow ranges or improve the proposal text", and which no engineer
 *   verifies (rule 3: "Choices belong to the owner");
 * - identity only on the project name (rule 6); no reference dataset (G1-12).
 *
 * `impactRank` orders questions and confirmations (rule 5, rule 6); its order is
 * the approver's (listed in the build log): the required fields, which every
 * output needs, then the first-estimate set, then the engineer's facts that
 * drive points, then the owner's choices by the outputs they reach.
 *
 * Kinds: project name, city and country are `text` (the city as the owner typed
 * it, the country as an ISO 3166-1 code), because the ISO 3166 and SIRUTA lists
 * are reference datasets with no approval record (D-94; PRD 8.4). Under rule 4
 * text never conflicts, so a document naming another city shows both values
 * rather than "Two values"; the enum form waits for those datasets.
 */
import type { RegistryFieldDefinition } from '../validation/schema';
import { AUTOMATION_AREAS, GOALS, SCOPE_OPTIONS, SELECTION_OPTIONS, SYSTEMS, automationFieldKey, goalFieldKey, scopeFieldKey } from './catalogue';
import { FIELD, OUTPUT, via } from './formulas';

const affects = (...entries: ReadonlyArray<readonly [output: string, formulaOrTemplate: string]>): RegistryFieldDefinition['affects'] =>
  entries.map(([output, consumer]) => ({ output, via: consumer }));

const POINTS = [
  [OUTPUT.pointsHardwareIo, via('pointsEstimate')],
  [OUTPUT.pointsIntegration, via('pointsEstimate')],
  [OUTPUT.pointsVirtual, via('pointsEstimate')],
] as const;

/** Rule 7's four required fields, asked on step 1 without "Skip for now". */
const REQUIRED: readonly RegistryFieldDefinition[] = [
  {
    key: FIELD.projectType,
    label: 'Project type',
    subject: 'project',
    kind: 'enum',
    options: ['new_construction', 'renovation', 'existing_building', 'bms_modernization'],
    estimation: 'forbidden',
    criticality: 'required',
    requiredSlot: 'project_type',
    affects: affects([OUTPUT.indicativeRange, via('capexIndicativeRange')], [OUTPUT.preliminaryEstimate, via('capexPreliminaryEstimate')]),
    impactRank: 1,
    confirmBy: 'owner',
    confirmByBasis: 'owner_choice',
  },
  {
    key: FIELD.country,
    label: 'Country',
    subject: 'project',
    kind: 'text',
    estimation: 'forbidden',
    criticality: 'required',
    requiredSlot: 'country',
    affects: affects(
      [OUTPUT.indicativeRange, via('capexIndicativeRange')],
      [OUTPUT.preliminaryEstimate, via('capexPreliminaryEstimate')],
      [OUTPUT.annualEnergy, via('operatingEnergyEstimate')],
    ),
    impactRank: 2,
    confirmBy: 'owner',
    confirmByBasis: 'identity',
  },
  {
    key: FIELD.city,
    label: 'City',
    subject: 'project',
    kind: 'text',
    estimation: 'forbidden',
    criticality: 'required',
    requiredSlot: 'city',
    affects: affects([OUTPUT.annualEnergy, via('operatingEnergyEstimate')]),
    impactRank: 3,
    confirmBy: 'owner',
    confirmByBasis: 'identity',
  },
  {
    key: FIELD.projectName,
    label: 'Project name',
    subject: 'project',
    kind: 'text',
    estimation: 'forbidden',
    criticality: 'required',
    requiredSlot: 'project_name',
    identity: true,
    affects: affects([OUTPUT.proposalTitle, 'template:proposal.title']),
    impactRank: 4,
    confirmBy: 'owner',
    confirmByBasis: 'identity',
  },
];

/** Rule 7's proposed first-estimate set: gross floor area, building type, systems in scope. */
const FIRST_ESTIMATE: readonly RegistryFieldDefinition[] = [
  {
    key: FIELD.grossFloorArea,
    label: 'Gross floor area',
    subject: 'building',
    kind: 'quantity',
    unit: 'm2',
    dimension: 'area',
    qualifierRequired: true,
    qualifiers: ['gross_total'],
    estimation: 'forbidden',
    criticality: 'first_estimate',
    firstEstimateSlot: 'gross_floor_area',
    affects: affects(
      [OUTPUT.indicativeRange, via('capexIndicativeRange')],
      [OUTPUT.annualEnergy, via('operatingEnergyEstimate')],
      [OUTPUT.annualSavings, via('savingsEstimate')],
    ),
    impactRank: 5,
    confirmBy: 'engineer',
  },
  {
    key: FIELD.buildingType,
    label: 'Building type',
    subject: 'building',
    kind: 'enum',
    options: ['hotel', 'office', 'retail', 'hospital', 'residential', 'other'],
    estimation: 'forbidden',
    criticality: 'first_estimate',
    firstEstimateSlot: 'building_type',
    affects: affects(
      [OUTPUT.indicativeRange, via('capexIndicativeRange')],
      ...POINTS,
      [OUTPUT.preliminaryEstimate, via('capexPreliminaryEstimate')],
      [OUTPUT.annualEnergy, via('operatingEnergyEstimate')],
      [OUTPUT.annualSavings, via('savingsEstimate')],
    ),
    impactRank: 6,
    confirmBy: 'owner',
    confirmByBasis: 'use_and_occupancy',
  },
  ...SYSTEMS.map(
    (system, position): RegistryFieldDefinition => ({
      key: scopeFieldKey(system.id),
      label: `System in scope: ${system.name}`,
      subject: 'project',
      kind: 'decision',
      options: [...SCOPE_OPTIONS],
      estimation: 'forbidden',
      criticality: 'first_estimate',
      firstEstimateSlot: 'systems_in_scope',
      affects: affects(
        [OUTPUT.indicativeRange, via('capexIndicativeRange')],
        ...POINTS,
        [OUTPUT.preliminaryEstimate, via('capexPreliminaryEstimate')],
        [OUTPUT.annualSavings, via('savingsEstimate')],
        [OUTPUT.measurePriority, via('measurePriority')],
      ),
      impactRank: 7 + position,
      confirmBy: 'owner',
      confirmByBasis: 'owner_choice',
    }),
  ),
];

/**
 * Step 3's building facts that drive points: an engineer checks them; counts state what they count (rule 8),
 * and each is a whole number, zero or more (`valueShape`, registry validation since the phase 1 review, round 3).
 */
const BUILDING_FACTS: readonly RegistryFieldDefinition[] = [
  {
    key: FIELD.floors,
    label: 'Floors',
    subject: 'building',
    kind: 'count',
    unit: 'count',
    dimension: 'count',
    valueShape: 'non_negative_integer',
    qualifierRequired: true,
    qualifiers: ['below_ground', 'semi_basement', 'ground', 'mezzanine', 'upper', 'setback_or_technical', 'attic', 'roof_plant'],
    estimation: 'forbidden',
    criticality: 'for_quotation',
    affects: affects(...POINTS, [OUTPUT.preliminaryEstimate, via('capexPreliminaryEstimate')]),
    impactRank: 15,
    confirmBy: 'engineer',
  },
  {
    key: FIELD.rooms,
    label: 'Rooms',
    subject: 'building',
    kind: 'count',
    unit: 'count',
    dimension: 'count',
    valueShape: 'non_negative_integer',
    qualifierRequired: true,
    qualifiers: ['all_spaces', 'guest_rooms', 'keys'],
    estimation: 'forbidden',
    criticality: 'for_quotation',
    affects: affects(...POINTS, [OUTPUT.preliminaryEstimate, via('capexPreliminaryEstimate')]),
    impactRank: 16,
    confirmBy: 'engineer',
  },
  {
    key: FIELD.zones,
    label: 'Zones',
    subject: 'building',
    kind: 'count',
    unit: 'count',
    dimension: 'count',
    valueShape: 'non_negative_integer',
    qualifierRequired: true,
    qualifiers: ['hvac_control', 'lighting', 'fire_compartment'],
    estimation: 'forbidden',
    criticality: 'for_quotation',
    affects: affects(...POINTS, [OUTPUT.preliminaryEstimate, via('capexPreliminaryEstimate')]),
    impactRank: 17,
    confirmBy: 'engineer',
  },
];

/** Steps 5 to 7: the owner's choices where no document states them (rule 3). */
const OWNER_CHOICES: readonly RegistryFieldDefinition[] = [
  ...AUTOMATION_AREAS.map(
    (area, position): RegistryFieldDefinition => ({
      key: automationFieldKey(area.id),
      label: `Automation area: ${area.name}`,
      subject: 'project',
      kind: 'decision',
      options: [...SELECTION_OPTIONS],
      estimation: 'forbidden',
      criticality: 'optional',
      affects: affects(
        ...POINTS,
        [OUTPUT.preliminaryEstimate, via('capexPreliminaryEstimate')],
        [OUTPUT.annualSavings, via('savingsEstimate')],
        [OUTPUT.measurePriority, via('measurePriority')],
      ),
      impactRank: 18 + position,
      confirmBy: 'owner',
      confirmByBasis: 'owner_choice',
    }),
  ),
  {
    key: FIELD.operatingSchedule,
    label: 'Operating schedule',
    subject: 'project',
    kind: 'enum',
    options: ['24_7', 'business_hours', 'extended_hours', 'seasonal'],
    estimation: 'forbidden',
    criticality: 'optional',
    affects: affects([OUTPUT.annualEnergy, via('operatingEnergyEstimate')], [OUTPUT.annualSavings, via('savingsEstimate')]),
    impactRank: 24,
    confirmBy: 'owner',
    confirmByBasis: 'use_and_occupancy',
  },
  {
    key: FIELD.occupancy,
    label: 'Occupancy',
    subject: 'project',
    kind: 'enum',
    // "Seasonal" is offered on the schedule question only (guardrails section 5, step 5; onboarding-spec 6.1).
    options: ['mostly_occupied', 'mixed', 'low'],
    estimation: 'forbidden',
    criticality: 'optional',
    affects: affects([OUTPUT.annualEnergy, via('operatingEnergyEstimate')], [OUTPUT.annualSavings, via('savingsEstimate')]),
    impactRank: 25,
    confirmBy: 'owner',
    confirmByBasis: 'use_and_occupancy',
  },
  ...GOALS.map(
    (goal, position): RegistryFieldDefinition => ({
      key: goalFieldKey(goal.id),
      label: `Goal: ${goal.name}`,
      subject: 'project',
      kind: 'decision',
      options: [...SELECTION_OPTIONS],
      estimation: 'forbidden',
      criticality: 'optional',
      affects: affects([OUTPUT.measurePriority, via('measurePriority')]),
      impactRank: 26 + position,
      confirmBy: 'owner',
      confirmByBasis: 'owner_choice',
    }),
  ),
];

export const PRODUCTION_FIELDS: readonly RegistryFieldDefinition[] = [...REQUIRED, ...FIRST_ESTIMATE, ...BUILDING_FACTS, ...OWNER_CHOICES];
