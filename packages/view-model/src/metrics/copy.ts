/**
 * The Metrics pages' server-side copy (phase 6; the build log, phase 6, "Where copy lives"): what fills the slot of rule
 * 7's "Not available yet: {missing}" on the Metrics pages, each with its source. No word here is a badge or a status
 * line 2.8 does not write, none is a reserved term, and none holds a digit or a number word (the reserved-term check
 * reads this file; the render test reads what it fills). Draft wording for the design review, except where a PRD line
 * gives the words.
 */

/**
 * What each Metrics value waits for while its unit, dataset, method or input is missing (PRD "Until decided" lines,
 * quoted where they name it):
 * - `proposal`: a snapshot-reading page on a project with no stored proposal (rule 7: "It names what is missing");
 * - `costPerArea`: R-087, "currency ratios such as €/m² ... naming the missing unit" (US-FIN-01 AC3, US-FIN-21 AC3);
 * - `savings`: R-100, "naming the missing energy-price unit", and R-099, "naming the missing savings factors"
 *   (US-FIN-01 AC4: "the energy-price unit, the savings factors"); savings per year in EUR are also annual amounts,
 *   which stay "Not available yet" while new Q27 is open (R-100 Sources; R-095 "Until decided"), so the open question on
 *   annual amounts is named too (phase 6 part B, V-4);
 * - `carbon`: R-101, "naming the missing unit and dataset";
 * - `cashFlow`: R-103, "naming the missing payback inputs" (the payback's own: R-102, "naming the missing duration
 *   unit", and the financial method of dashboards 8.6, as the proposal's payback names them), written with no colon
 *   inside the line, so the items read as the chart's (phase 6 part B, V-6);
 * - `analysisPeriod`: US-FIN-04 AC5, "naming the missing duration unit";
 * - `lifecycle`: R-105, "naming the missing unit or source" (service lives "from a datasheet or an engineer, or
 *   Estimated from an approved dataset", and the lifecycle cost as a defined indicator, dashboards 8.14);
 * - `annualAmounts`: R-095, "naming the open question on annual amounts" (the proposal's operating-cost indicator says
 *   the same: ../proposal/copy.ts INDICATOR_MISSING);
 * - `intensity`: US-FIN-14 AC5, "naming the missing unit", with R-095's open question;
 * - `energyFromBills`: US-FIN-13 AC8, "naming the missing bills": the energy data read from bills (none is read in this
 *   build: no energy-data field is registered and no AI run exists, so "bills" alone could be false where bills were
 *   uploaded);
 * - `energyPrice`: the energy-price unit an estimate of a new building's energy cost also waits for (US-FIN-13 AC9:
 *   "naming what an estimate lacks"); that cost is an amount per year, so the line names `annualAmounts` after it
 *   (R-095 "Until decided"; phase 6 part B, V-4);
 * - `perSystemMetering`: US-FIN-12 AC10, "naming the missing per-system metering";
 * - `assetTaxonomy`: the gate `dataset-asset-taxonomy`'s "Waits for" name, as the phase 4 registers name it (counts by
 *   type: US-FIN-26 AC3);
 * - `systemsInScope`: CAPEX's "Selected systems" while a scope decision as used was not recorded (R-089; rule 1), named
 *   as the stored proposal names the multi-select (proposal/view.ts MULTI_SELECTS), through `inputsMissingOf`; and OPEX
 *   & Savings' "by system" panel with no include decision uses the workspace's own words (workspace/copy.ts
 *   MISSING.systemsInScope; G7-24, as Topology's G7-15).
 */
export const METRICS_MISSING = {
  proposal: 'a generated preliminary proposal',
  costPerArea: 'the unit for cost per area',
  savings: 'the energy-price unit; SOVITECH savings factors; the open question on annual amounts',
  carbon: 'the unit for carbon dioxide; an approved emission-factor dataset',
  cashFlow: 'the duration unit and the financial method for the payback',
  analysisPeriod: 'the duration unit',
  lifecycle: 'the duration unit; service lives from a datasheet, an engineer or an approved dataset; the lifecycle cost method',
  annualAmounts: 'the open question on annual amounts',
  intensity: 'the unit for cost per area per year; the open question on annual amounts',
  energyFromBills: 'energy data read from bills',
  energyPrice: 'the energy-price unit',
  perSystemMetering: 'per-system metering',
  assetTaxonomy: 'SOVITECH asset taxonomy',
} as const;

/**
 * What each Metrics series measures, for "SOVITECH's method for <what>" (../proposal/copy.ts METHOD_MISSING) when no
 * formula of the catalogue declares the series (G1-31): its total's own missing items come first, then this method.
 * Draft wording.
 */
export const SERIES_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'capex.bySystem': 'Investment by system',
  'capex.byLevel': 'Investment by level',
  'savings.byStream': 'Savings by stream',
  'cashFlow.annual': 'Annual cash flow',
  'cashFlow.cumulative': 'Cumulative cash flow',
  'lifecycle.costComparison': 'Lifecycle cost comparison',
  'lifecycle.costBreakdown': 'Lifecycle cost breakdown',
  'lifecycle.bySystem': 'Lifecycle cost by system',
});
