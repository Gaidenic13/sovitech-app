/**
 * The words a display object's text is built from where the value itself is a key: an enum or
 * decision option, a qualifier (what a count counts, the area basis, the level type), a document
 * stage. Server side, because the display object carries the whole text its element shows
 * (display.ts, `text`: "exactly what the value element shows"); the UI catalogue
 * (apps/web/src/copy/en.json, `options.<field key>.<key>`) labels the same options on the input
 * controls, and labels.test.ts keeps the two in step.
 *
 * None of these is a badge, a status line, a stage label of rule 10 or a sentence of the
 * guardrails (those come only from the registry's copy); none holds a reserved term of 2.8 (the
 * reserved-term check reads this file with every source file of the app). An option or qualifier
 * the lists below do not name shows as its registry key, never as a guessed word.
 */
import type { DocumentStage } from '@sovitech/domain';

/** Option labels by field key, then option key. Keys match the registry's `options`. */
export const OPTION_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  'project.type': {
    new_construction: 'New construction',
    renovation: 'Renovation',
    existing_building: 'Existing building',
    bms_modernization: 'BMS modernization',
  },
  'building.type': {
    hotel: 'Hotel',
    office: 'Office',
    retail: 'Retail',
    hospital: 'Hospital',
    residential: 'Residential',
    other: 'Other',
  },
  'project.occupancy': {
    mostly_occupied: 'Mostly occupied',
    mixed: 'Mixed',
    low: 'Low occupancy',
  },
  // "24 / 7" cannot show its digits outside a value element under the render allowlist as it
  // stands (proposal P-3-RENDER-24-7), so the option reads "Around the clock".
  'project.operatingSchedule': {
    '24_7': 'Around the clock',
    business_hours: 'Business hours',
    extended_hours: 'Extended hours',
    seasonal: 'Seasonal',
  },
});

/**
 * The words of a decision field's two options (2.6: one decision field per option of a
 * multi-select): a system in scope or not (`include` / `exclude`, G10-7), a goal or an automation
 * area selected or not.
 */
export const DECISION_LABELS: Readonly<Record<string, string>> = Object.freeze({
  include: 'Included',
  exclude: 'Not included',
  selected: 'Selected',
  not_selected: 'Not selected',
});

/**
 * Qualifier labels by qualifier key (rule 8, "Qualifiers that must be stated"): the area bases
 * with their Romanian abbreviations as rule 8 lists them, what a count of rooms or zones counts,
 * and the level types of the floor structure.
 */
export const QUALIFIER_LABELS: Readonly<Record<string, string>> = Object.freeze({
  // Area basis (rule 8).
  footprint: 'footprint (Sc)',
  gross_total: 'gross total (Scd)',
  usable: 'usable (Su)',
  heated_usable: 'heated usable',
  conditioned: 'conditioned',
  // Rooms (rule 8, "rooms: all spaces, guest rooms or keys").
  all_spaces: 'all spaces',
  guest_rooms: 'guest rooms',
  keys: 'keys',
  // Zones (rule 8, "zones: HVAC control, lighting or fire compartment").
  hvac_control: 'HVAC control zones',
  lighting: 'lighting zones',
  fire_compartment: 'fire compartments',
  // Floors by level type (rule 8, "Floors").
  below_ground: 'below ground',
  semi_basement: 'semi-basement',
  ground: 'ground floor',
  mezzanine: 'mezzanine',
  upper: 'upper floors',
  setback_or_technical: 'setback or technical floor',
  attic: 'attic',
  roof_plant: 'roof plant',
});

/** The label of a stated qualifier that rule 8 records as not stated (a value "stored with basis `unknown`"). */
export const UNKNOWN_QUALIFIER_LABEL = 'Unknown';

/**
 * Document stages (2.3), for a stage a classifier or a person recorded. No stage is recorded in
 * phase 3 (the live app stores every document with stage `unknown`, and US-DOCS-08's classifier is
 * not built), so these words show only once one is.
 */
export const STAGE_LABELS: Readonly<Record<Exclude<DocumentStage, 'unknown'>, string>> = Object.freeze({
  feasibility: 'Feasibility',
  permit: 'Permit',
  technical_design: 'Technical design',
  tender: 'Tender',
  execution: 'Execution',
  shop_drawing: 'Shop drawing',
  as_built: 'As-built',
  site_survey: 'Site survey',
  nameplate_photo: 'Nameplate photo',
  bill: 'Bill',
});

/** The design stages of 2.3: "feasibility, permit, technical design, tender, execution, shop drawing". */
export const DESIGN_STAGES: ReadonlySet<DocumentStage> = new Set(['feasibility', 'permit', 'technical_design', 'tender', 'execution', 'shop_drawing']);

/** The project types for which a design-stage document labels its values "From design drawings" (2.3). */
export const EXISTING_BUILDING_PROJECT_TYPES: ReadonlySet<string> = new Set(['existing_building', 'bms_modernization']);

/** The label of an option: its registry key when no label is listed (never a guessed word). */
export function optionLabel(fieldKey: string, kind: string, option: string): string {
  if (kind === 'decision') return DECISION_LABELS[option] ?? option;
  return OPTION_LABELS[fieldKey]?.[option] ?? option;
}

/** The label of a qualifier key, or of the unknown qualifier. */
export function qualifierLabel(qualifier: string | null | undefined): string {
  if (qualifier === null || qualifier === undefined || qualifier.trim() === '' || qualifier === 'unknown') return UNKNOWN_QUALIFIER_LABEL;
  return QUALIFIER_LABELS[qualifier] ?? qualifier;
}

/** The label of a recorded document stage; undefined for `unknown`. */
export function stageLabel(stage: DocumentStage): string | undefined {
  return stage === 'unknown' ? undefined : STAGE_LABELS[stage];
}

/** A country code as the owner chose it (ISO 3166-1 alpha-2), named in English where the runtime knows the code. */
export function countryLabel(code: string): string {
  if (!/^[A-Z]{2}$/u.test(code)) return code;
  const name = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' }).of(code);
  return name === undefined || name === '' ? code : name;
}
