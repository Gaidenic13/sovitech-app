/**
 * Which outputs the proposal will carry as ranges and which read "Not available yet" (F-PROPOSAL-07;
 * guardrails rules 7 and 10, section 5 step 8; prompt 3 5.3 and 5.4; PRD R-003; US-INTAKE-16 AC3),
 * computed from the registry's formula signatures, the gates and the first-estimate fields. No
 * figure is computed here and nothing is stored (rule 9: arithmetic lives in the engine).
 */
import { PRODUCTION_CATALOGUE } from '@sovitech/engine';
import { productionRegistry } from '@sovitech/registry';
import type { FormulaSignature } from '@sovitech/registry/validation';
import type { Action, DisplayObject, Line } from '../browser/contract';
import type { FormatOptions } from '../formatting';
import { lineOf, projectValueId, resolveLine, type StageLabelId } from '../resolver';
import { hasEligible, type IntakeField } from './model';

/**
 * What each declared formula waits for besides its inputs: the SOVITECH datasets, by the gate that holds each back
 * (prompt 3 5.4) and the name the gate's "Waits for" gives it, or no gate where the dataset has none (the SOVITECH
 * function set and the savings factors, which no gate opens). The names are what the "Not available yet" line says is
 * missing (rule 7). Read from the engine's production catalogue (phase 5; docs/adr/0047 decision 1: "The view-model reads
 * the same catalogue for the names it shows"), so step 8, the stored proposal and its print route say the same words.
 */
export const FORMULA_DATASETS: Readonly<Record<string, readonly { readonly gate: string | null; readonly name: string }[]>> = Object.freeze(
  Object.fromEntries(
    PRODUCTION_CATALOGUE.formulas.map((formula) => [
      formula.signature.id,
      formula.requires.flatMap((requirement) => (requirement.kind === 'dataset' ? [{ gate: requirement.gate, name: requirement.name }] : [])),
    ]),
  ),
);

/**
 * The rule 10 stage each investment output carries (2.8, "Investment figure, by stage (rule 10)": "Indicative
 * range", "Preliminary investment estimate"; "They are also the only ones used"; G10-11): the benchmark output
 * is stage 1's, the output from this project's data stage 2's. "Formal quotation" is never an output's label:
 * it comes only from a stored quotation record (rule 10, "Stage 3 is derived, not passed").
 */
export const OUTPUT_STAGE_LABELS: Readonly<Record<string, StageLabelId>> = Object.freeze({
  'capex.indicativeRange': 'indicative_range',
  'capex.preliminaryEstimate': 'preliminary_investment_estimate',
});

/** The formula that gives rule 10's stage 1 figure (benchmarks only). */
const INDICATIVE_RANGE_FORMULA = 'capexIndicativeRange';

/**
 * The stage the rules give for the investment figure, from stored state (US-INTAKE-16 AC2; rule 7,
 * the `first_estimate` row: "If it is still missing, the output falls back to a stage 1 Indicative range where
 * the registry allows one"; rule 10; G10-11): "Indicative range" only where a first-estimate input is missing,
 * the registry allows an Indicative range for it (the stage 1 formula runs without it: it does not read it, or
 * its `unknownPolicy` is not `refuse`) and the stage 1 formula's datasets are approved (no gate of theirs is
 * closed); otherwise "Preliminary investment estimate". Never "Formal quotation". The Proposal card names it only
 * while the investment output carrying that stage is served as a range (or the view's `proposal.stage` is
 * non-null), and otherwise shows that output's "Not available yet" line (G10-11; the web's `proposalStageOf`),
 * which names every missing first-estimate input with its Add action beside the datasets (`outputAvailability`).
 */
export function proposalStage(input: {
  readonly fields: readonly IntakeField[];
  readonly closedGates: ReadonlySet<string>;
  readonly formulas?: readonly FormulaSignature[];
}): StageLabelId {
  const formulas = input.formulas ?? productionRegistry.formulas;
  const missing = input.fields.filter((field) => field.field.criticality === 'first_estimate' && !hasEligible(field));
  if (missing.length === 0) return 'preliminary_investment_estimate';
  const indicative = formulas.find((formula) => formula.id === INDICATIVE_RANGE_FORMULA);
  if (indicative === undefined) return 'preliminary_investment_estimate';
  const allowed = missing.every((field) => !indicative.inputs.includes(field.field.key) || indicative.unknownPolicy !== 'refuse');
  const datasets = FORMULA_DATASETS[INDICATIVE_RANGE_FORMULA] ?? [];
  const approved = datasets.length > 0 && datasets.every((dataset) => dataset.gate !== null && !input.closedGates.has(dataset.gate));
  return allowed && approved ? 'indicative_range' : 'preliminary_investment_estimate';
}

/** The words rule 7 uses for the first-estimate set's members, as a missing input is named. */
export const FIRST_ESTIMATE_SLOT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  building_type: 'building type',
  gross_floor_area: 'gross floor area',
  systems_in_scope: 'systems in scope',
});

export interface OutputAvailabilityPlan {
  readonly output: string;
  readonly availability: 'range' | 'not_available_yet';
  readonly missingDatasets: readonly string[];
  /**
   * The first-estimate fields the output waits for and the owner can still add: one field key per missing slot, its
   * first field. For most outputs, those its formula reads; for rule 10's stage 2 output, every first-estimate field
   * (see {@link waitsForFirstEstimate}).
   */
  readonly missingFields: readonly string[];
}

/**
 * Whether an output waits for a first-estimate field: the field is in the first-estimate set, and the output's formula
 * reads it or the output carries rule 10's stage 2, "Preliminary investment estimate". Rule 10's table gives stage 1,
 * "Indicative range", the figure "when first-estimate data is missing", and rule 7's `first_estimate` row says a
 * missing first-estimate field leaves the output a stage 1 Indicative range where the registry allows one, "or else
 * 'Not available yet' with the missing item and an action to add it" (US-INTAKE-17 AC2; G7-2b): no stage 2 figure is
 * produced while one is missing, whatever its formula reads, so the stage 2 output names each with its Add action. The
 * Proposal card shows that output's line while it carries the served stage (G10-11), so the card names the owner's
 * missing inputs beside the datasets (the gross floor area, which the stage 2 formula does not read, included).
 */
function waitsForFirstEstimate(formula: FormulaSignature, output: string, field: IntakeField): boolean {
  if (field.field.criticality !== 'first_estimate' || field.field.firstEstimateSlot === undefined) return false;
  return OUTPUT_STAGE_LABELS[output] === 'preliminary_investment_estimate' || formula.inputs.includes(field.field.key);
}

/** The missing first-estimate fields among those an output waits for: one per slot with no eligible value, its first field, by impact. */
function missingFirstEstimate(fields: readonly IntakeField[], waitsFor: (field: IntakeField) => boolean): string[] {
  const slots = new Map<string, IntakeField[]>();
  for (const field of fields) {
    const slot = field.field.firstEstimateSlot;
    if (slot === undefined || !waitsFor(field)) continue;
    const list = slots.get(slot);
    if (list === undefined) slots.set(slot, [field]);
    else list.push(field);
  }
  return [...slots.values()]
    .filter((slotFields) => !slotFields.some(hasEligible))
    .map((slotFields) => [...slotFields].sort((a, b) => a.field.impactRank - b.field.impactRank)[0])
    .flatMap((field) => (field === undefined ? [] : [field]))
    .sort((a, b) => a.field.impactRank - b.field.impactRank)
    .map((field) => field.field.key);
}

/**
 * Which outputs will be ranges or "Not available yet", naming what is missing for each (US-INTAKE-16
 * AC3): the registry's output ids, read against the gates (a closed dataset gate: the SOVITECH
 * dataset by name, no owner action) and the first-estimate fields each waits for (an owner input:
 * its `add` action; {@link waitsForFirstEstimate}). While every dataset gate is closed, every output
 * is `not_available_yet`.
 */
export function outputAvailability(input: {
  readonly fields: readonly IntakeField[];
  readonly closedGates: ReadonlySet<string>;
  /** The declared formula signatures; the production registry's by default. */
  readonly formulas?: readonly FormulaSignature[];
}): readonly OutputAvailabilityPlan[] {
  const formulas = input.formulas ?? productionRegistry.formulas;
  const plans: OutputAvailabilityPlan[] = [];
  for (const formula of formulas) {
    const datasets = FORMULA_DATASETS[formula.id] ?? [];
    const missingDatasets = [...new Set(datasets.filter((dataset) => dataset.gate === null || input.closedGates.has(dataset.gate)).map((dataset) => dataset.name))];
    for (const output of formula.outputs) {
      const missingFields = missingFirstEstimate(input.fields, (field) => waitsForFirstEstimate(formula, output, field));
      plans.push({
        output,
        availability: missingDatasets.length === 0 && missingFields.length === 0 ? 'range' : 'not_available_yet',
        missingDatasets,
        missingFields,
      });
    }
  }
  return plans;
}

/**
 * An output's line (`project:<id>.outputs.<output>`; steps.ts OutputAvailability): "Not available
 * yet: <what is missing>", naming each missing SOVITECH dataset and each missing first-estimate
 * input (rule 7: "'Not available yet' never appears alone. It names what is missing and offers the
 * action"). Each missing owner input carries its `add` action, which opens step 8's inline ask
 * (R-012; "Add <field>"); a dataset has no owner action (D-14 interim: no action wording). With
 * only owner inputs missing, 2.8's example line follows: "Add the <field> to see this." An output
 * that will be a range is the engine's to state with its stage label (phase 5): refused here.
 */
export function resolveOutputLine(input: {
  readonly projectId: string;
  readonly plan: OutputAvailabilityPlan;
  readonly fields: readonly IntakeField[];
  readonly format: FormatOptions;
}): DisplayObject {
  const { plan } = input;
  if (plan.availability === 'range') throw new Error('intake: an output that will be a range is stated with its stage label by the engine (phase 5)');
  const missingFields = plan.missingFields.flatMap((key) => {
    const field = input.fields.find((entry) => entry.field.key === key);
    return field === undefined ? [] : [field];
  });
  const labelOf = (field: IntakeField): string => {
    const slot = field.field.firstEstimateSlot;
    return (slot === undefined ? undefined : FIRST_ESTIMATE_SLOT_LABELS[slot]) ?? field.field.label.toLowerCase();
  };
  const missing = [...plan.missingDatasets, ...missingFields.map(labelOf)];
  if (missing.length === 0) throw new Error('intake: an output that is not available names what it misses');
  const actions: Action[] = missingFields.map((field) => ({
    kind: 'add',
    field: { subjectId: field.subjectId, fieldKey: field.field.key },
    label: lineOf('add_action', { field: labelOf(field) }).text,
    step: 8,
  }));
  const lines: Line[] = plan.missingDatasets.length === 0 ? missingFields.map((field) => lineOf('add_to_see_this', { field: labelOf(field) })) : [];
  return resolveLine(projectValueId(input.projectId, `outputs.${plan.output}`), 'not_available_yet_named', { missing: missing.join('; ') }, input.format, {
    missing: 'not_available_yet',
    lines,
    actions,
  });
}
