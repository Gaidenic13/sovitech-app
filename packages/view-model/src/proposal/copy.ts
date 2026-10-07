/**
 * The stored proposal's server-side copy (phase 5; build log, phase 5 plan, "Where copy lives"): what fills the slot of
 * rule 7's "Not available yet: {missing}" for the proposal's outputs and indicators, the sentences rule 11 and section 5
 * write word for word, the measures' labels and the Equipment export's column heads. Each names its source. No word
 * here is a badge or a status line 2.8 does not write, and none is a reserved term (the reserved-term check reads this
 * file). Draft copy for undesigned states (the outputs' labels, the indicators' names, the CSV's heads) is marked
 * draft for the design review.
 */

/**
 * What an indicator's "Not available yet" line names while its method and units are missing (prompt 3 5.4
 * `financial-indicators`, `units-7.2.22`; PRD R-087, R-095, R-102 "Until decided"):
 * - payback, NPV and IRR: "naming the missing duration unit" (R-102), and the financial method that waits for
 *   dashboards 8.6 and proposal 7.2.12 (`financial-indicators`);
 * - operating cost: "naming the open question on annual amounts" (R-095).
 * Draft wording for the design review.
 */
export const INDICATOR_MISSING = {
  operating_cost: 'the open question on annual amounts',
  payback: 'the duration unit; the financial method',
  npv: 'the duration unit; the financial method',
  irr: 'the duration unit; the financial method',
} as const;

/**
 * What a proposal output measures, as its display names it (rule 8, "Every value states what it measures"). Draft labels
 * for the design review; none names a stage (2.8's stage labels come only from stored records: rule 10).
 */
export const OUTPUT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'capex.indicativeRange': 'Investment from benchmarks',
  'capex.preliminaryEstimate': "Investment from this project's data",
  'points.hardwareIo': 'Hardware I/O points',
  'points.integration': 'Integration points',
  'points.virtual': 'Virtual points',
  'energy.annualConsumption': 'Annual energy consumption',
  'savings.annualEnergy': 'Annual energy savings',
  'measures.priorityOrder': 'Order of the measures',
});

/** A method no source defines yet, named for the owner (prompt 3 phase 5: "names what is missing"). Draft wording. */
export const METHOD_MISSING = (outputLabel: string): string => `SOVITECH's method for ${outputLabel.toLowerCase()}`;

/** Rule 4, "Until a conflict is resolved": "Not available yet: two values for floors" names the field this way. */
export const TWO_VALUES_FOR = (fieldLabel: string): string => `two values for ${fieldLabel}`;

/**
 * Fire Safety's sentence when it is in scope (guardrails section 5, step 4, word for word: "monitoring only (read-only);
 * fire logic and fire-mode interlocks remain in the fire system"; rule 11; G11-1; PRD R-113: "generated from stored
 * state, never by the AI"). The sentence case of the step 4 card's catalogue text.
 */
export const FIRE_SAFETY_MONITORING_ONLY = 'Monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system.';

/**
 * Rule 11, "Fire mode is hardwired and wins", "The interface points stay in scope", word for word: "The proposal
 * includes these interface points: a fire-alarm input and a fire-mode status per affected panel." Named with no figure
 * while no point-template version is approved (PRD R-112; G11-12).
 */
export const INTERFACE_POINTS = 'The proposal includes these interface points: a fire-alarm input and a fire-mode status per affected panel.';

/**
 * Rule 9's basis line ("what it is based on, with the inputs' own labels", as rule 9's example writes it: "Based on
 * <n> possible HVAC assets (not yet checked) and SOVITECH function set v1"): "Based on <the inputs' labels and the
 * datasets' names and versions>".
 */
export const BASED_ON = (basis: string): string => `Based on ${basis}`;

/** Rule 9's method line beside an estimate's or a calculation's figure (as the resolver's source line words it). */
export const METHOD_LINE = (formulaId: string, version: string): string => `Method: ${formulaId}, version ${version}`;

/**
 * The Equipment export's column heads (ADR 0050 decision 4; 7.1-r25: "keeps each badge on the same line as its figure",
 * as columns in a tabular export): each cell as three columns, its shown text, its badge and its source line. Draft for
 * the design review.
 */
export const CSV_COLUMNS = {
  tag: 'Tag',
  type: 'Type',
  system: 'System',
  location: 'Location',
  level: 'Level',
  zone: 'Zone',
  badge: (heading: string): string => `${heading} badge`,
  source: (heading: string): string => `${heading} source`,
  total: 'Equipment count',
} as const;

/**
 * The file name of an export (no document text: rule 13). Phase 6 (R-121; docs/adr/0052 decision 7): the Metrics pages
 * with "Export Report", named by the page (the API adds the version's generation time, as for the proposal: DR-5).
 */
export const EXPORT_FILE_NAMES = {
  proposal: 'preliminary-proposal.pdf',
  equipment: 'equipment-register.csv',
  payback: 'payback-analysis.pdf',
  lifecycle: 'lifecycle-analysis.pdf',
} as const;
