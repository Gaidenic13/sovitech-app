/**
 * The stored proposal (UD-06) with UD-01's content at its head, its print view and its versions, as display objects
 * (phase 5; the contract: ../browser/contract/proposal.ts; docs/adr/0048, 0049).
 *
 * Read as generated (2.4, "A generated proposal keeps a snapshot"; US-PROPOSAL-03 AC3):
 * - every output shows the snapshot's row: the figure the engine produced (its candidate, as stored), or "Not available
 *   yet", naming what was missing at generation (rule 7: "It names what is missing and offers the action"), with the
 *   owner's Add action only where the input is still missing now;
 * - every input shows the candidate the snapshot used, under the snapshot's own value id
 *   (`proposal:<sid>.inputs.<subject kind>.<field path>`, never the field's current id, so one value id keeps one
 *   display: G2-7), with its badge and source line, never a newer value;
 * - a figure whose inputs changed reads "Out of date, recalculating" and is never shown as current (2.4; G9-10);
 * - an investment figure's stage comes from the engine's reading of stored records only (rule 10; G10-1, G10-2,
 *   G10-9, G10-11): "Formal quotation" only from a current quotation record, which the display then names; "Superseded:
 *   inputs changed on <date>" beside stage 2's label when that record's inputs changed; no stage while no figure exists;
 * - the head never shows an incomplete total's figure (rule 1, "Material exclusions": "no headline ... is computed from
 *   it"; G1-2): it serves its own display, the stage label with "Incomplete: excludes <item names>", and the Investment
 *   section keeps the figure with that line;
 * - a version's generation reads with its time ("D MMM YYYY, HH:MM"), so versions of one day read apart (US-PROPOSAL-11
 *   AC3), and the basis lists the inputs by intake step, so related inputs sit together.
 * What it never does (rule 1): a zero, a dash or a blank for a missing value; rule 11: describe a life-safety system as
 * anything but monitored; rule 12: say "not found" (nothing here does); rule 2: a digit outside a bound display.
 */
import { UNKNOWN_QUALIFIER, type Candidate } from '@sovitech/domain';
import {
  AUTOMATION_FIELDS,
  FIELD,
  GOAL_FIELDS,
  OUTPUT,
  SCOPE_FIELDS,
  SYSTEMS,
  firstBadge,
  statusLineById,
  unitByCode,
  type BadgeId as RegistryBadgeId,
} from '@sovitech/registry';
import { methodNotesOf, type FormulaCatalogue, type PriceStageReading } from '@sovitech/engine';
import {
  VALUE_ID_PATTERN,
  type Action,
  type BadgeId,
  type DisplayObject,
  type Line,
  type Price,
  type ProposalOutput,
  type ProposalPrintResponse,
  type ProposalResponse,
  type ProposalVersionsResponse,
  type ValueId,
} from '../browser/contract';
import { COUNT_UNIT_CODE, DEFAULT_FORMAT_OPTIONS, formatCalculated, formatCount, formatDate, formatDateAndTime, formatEstimate, type FormattedValue } from '../formatting';
import { FIRST_ESTIMATE_SLOT_LABELS, OUTPUT_STAGE_LABELS } from '../intake/outputs';
import { badgeOf, candidateReading, lineOf, qualifierLabel, resolveCandidateEntry, resolveLine, resolveStageLabel, type ResolveFieldInput } from '../resolver';
import { fillLine } from '../resolver/lines';
import type { Built } from '../workspace/inputs';
import {
  BASED_ON,
  FIRE_SAFETY_MONITORING_ONLY,
  INDICATOR_MISSING,
  INTERFACE_POINTS,
  METHOD_LINE,
  METHOD_MISSING,
  OUTPUT_LABELS,
  TWO_VALUES_FOR,
} from './copy';
import { ProposalNotBuilt, type ProposalBuildInput, type ProposalField, type StoredVersion } from './inputs';

const FORMAT = DEFAULT_FORMAT_OPTIONS;

/** The proposal's output keys by section (the registry's OUTPUT; rule 8 "Points": hardware I/O, integration, virtual). */
const SECTIONS = {
  investment: [OUTPUT.indicativeRange, OUTPUT.preliminaryEstimate],
  points: [OUTPUT.pointsHardwareIo, OUTPUT.pointsIntegration, OUTPUT.pointsVirtual],
  energy: [OUTPUT.annualEnergy, OUTPUT.annualSavings],
  measures: [OUTPUT.measurePriority],
} as const;

/** The investment outputs that carry a rule 10 stage (2.8, stage labels). */
const INVESTMENT_OUTPUTS: ReadonlySet<string> = new Set(SECTIONS.investment);

// ---------------------------------------------------------------------------------------------
// Value ids and the response's displays
// ---------------------------------------------------------------------------------------------

/** A value id `proposal:<snapshotId>.<path>` (contract proposal.ts, "Value ids added"), checked against the render contract. */
export function proposalValueId(snapshotId: string, path: string): ValueId {
  const id = `proposal:${snapshotId}.${path}`;
  if (!VALUE_ID_PATTERN.test(id)) throw new ProposalNotBuilt(`"${id}" cannot be a value id (display.ts VALUE_ID_PATTERN)`);
  return id;
}

/** The path of an input field under `inputs.`: `<subject kind>.<field path>` (`building.grossFloorArea`, `project.scope.hvac`). */
export function inputPath(subjectKind: string, fieldKey: string): string {
  return fieldKey.startsWith(`${subjectKind}.`) ? `inputs.${fieldKey}` : `inputs.${subjectKind}.${fieldKey}`;
}

/** One response's display objects, one per value id: a second, different display for one value id is a defect (G2-7). */
class Displays {
  private readonly byId = new Map<ValueId, DisplayObject>();

  add(display: DisplayObject): ValueId {
    const existing = this.byId.get(display.valueId);
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(display)) {
      throw new ProposalNotBuilt(`two displays for one value id in one response: ${display.valueId}`);
    }
    this.byId.set(display.valueId, display);
    return display.valueId;
  }

  has(valueId: ValueId): boolean {
    return this.byId.has(valueId);
  }

  list(): DisplayObject[] {
    return [...this.byId.values()];
  }
}

// ---------------------------------------------------------------------------------------------
// What was missing, named for the owner (rule 7)
// ---------------------------------------------------------------------------------------------

/**
 * The multi-selects 2.6 stores as one decision field per option ("systems in scope, goals and automation areas"): a
 * missing option is named by its multi-select, once, never option by option.
 */
const MULTI_SELECTS: readonly { readonly prefix: string; readonly words: string }[] = [
  { prefix: 'project.scope.', words: 'systems in scope' },
  { prefix: 'project.goal.', words: 'goals' },
  { prefix: 'project.automation.', words: 'automation areas' },
];

/** A field's words where a line names it as missing: rule 7's words for the first-estimate set, 2.6's for a multi-select, else its registered label. */
function fieldWords(field: ProposalField | undefined, fieldKey: string): string {
  if (field === undefined) return fieldKey;
  const slot = field.field.firstEstimateSlot;
  const slotWords = slot === undefined ? undefined : FIRST_ESTIMATE_SLOT_LABELS[slot];
  if (slotWords !== undefined) return slotWords;
  if (field.field.kind === 'decision') {
    const multi = MULTI_SELECTS.find((entry) => fieldKey.startsWith(entry.prefix));
    if (multi !== undefined) return multi.words;
  }
  return field.field.label.toLowerCase();
}

/** The name a catalogue gives a dataset or a unit, by its id or gate. */
function requirementName(catalogue: FormulaCatalogue, kind: 'dataset' | 'unit', key: string): string | undefined {
  for (const formula of catalogue.formulas) {
    for (const requirement of formula.requires) {
      if (kind === 'dataset' && requirement.kind === 'dataset' && requirement.datasetId === key) return requirement.name;
      if (kind === 'unit' && requirement.kind === 'unit' && requirement.gate === key) return requirement.name;
    }
  }
  return undefined;
}

interface MissingNames {
  readonly names: readonly string[];
  /** The owner inputs still missing now, each with its Add action (rule 7; R-012: step 8's inline ask). */
  readonly addable: readonly ProposalField[];
  /** Whether every item is an owner input (2.8's example line then follows: "Add the <field> to see this."). */
  readonly ownerInputsOnly: boolean;
  /** The one item, when it is a field in conflict (rule 4's own wording: "Not available yet: two values for floors"). */
  readonly soleConflict: ProposalField | undefined;
}

/**
 * The names of what an output waited for, from its stored codes (snapshot.ts: `dataset:<id>`, `method:<formula>`,
 * `unit:<gate>`, `input:<subject>:<field>:<reason>`). A conflict or an ambiguous reading is named as rule 4 names it
 * ("two values for <field>"); an unknown, skipped, pending or not-applicable input by its words. A code this build does
 * not know is refused (never shown as text, never dropped).
 */
function missingNames(input: ProposalBuildInput, output: string, codes: readonly string[]): MissingNames {
  const names: string[] = [];
  const addable: ProposalField[] = [];
  let ownerInputsOnly = true;
  let conflicts: ProposalField[] = [];
  for (const code of codes) {
    const [kind, ...rest] = code.split(':');
    const key = rest.join(':');
    if (kind === 'dataset' || kind === 'unit') {
      const name = requirementName(input.catalogue, kind, key);
      if (name === undefined) throw new ProposalNotBuilt(`no catalogue names the missing ${kind} ${key}`);
      names.push(name);
      ownerInputsOnly = false;
    } else if (kind === 'method') {
      names.push(METHOD_MISSING(OUTPUT_LABELS[output] ?? output));
      ownerInputsOnly = false;
    } else if (kind === 'input' || kind === 'excluded') {
      const [subjectId, fieldKey, reason] = rest;
      if (subjectId === undefined || fieldKey === undefined) throw new ProposalNotBuilt(`a missing input code names no field: ${code}`);
      const field = input.current.find((entry) => entry.subjectId === subjectId && entry.field.key === fieldKey);
      const words = fieldWords(field, fieldKey);
      if (reason === 'conflict' || reason === 'ambiguous') {
        names.push(TWO_VALUES_FOR(words));
        if (field !== undefined) conflicts = [...conflicts, field];
        ownerInputsOnly = false;
      } else {
        names.push(words);
        if (field !== undefined && field.missingNow && field.field.criticality === 'first_estimate') addable.push(field);
        else ownerInputsOnly = false;
      }
    } else {
      throw new ProposalNotBuilt(`an unknown missing code: ${code}`);
    }
  }
  const unique = [...new Set(names)];
  // One Add action per first-estimate slot (rule 7's words name the slot: "systems in scope"), its first field by impact.
  const bySlot = new Map<string, ProposalField>();
  for (const field of [...addable].sort((a, b) => a.field.impactRank - b.field.impactRank)) {
    const slot = field.field.firstEstimateSlot ?? field.field.key;
    if (!bySlot.has(slot)) bySlot.set(slot, field);
  }
  return {
    names: unique,
    addable: [...bySlot.values()],
    ownerInputsOnly: ownerInputsOnly && addable.length > 0,
    soleConflict: unique.length === 1 && conflicts.length > 0 ? conflicts[0] : undefined,
  };
}

/**
 * Rule 10's stage 2 output waits for every first-estimate input (rule 10: stage 1 is the figure "when first-estimate data
 * is missing"; rule 7's `first_estimate` row; G7-2b; as phase 3's step 8 names them: intake/outputs.ts
 * `waitsForFirstEstimate`): each first-estimate slot the snapshot held no value for, as a code its line names, the
 * slot's first field by impact, unless the engine's codes already name the slot.
 */
function firstEstimateGaps(input: ProposalBuildInput, output: string, codes: readonly string[]): string[] {
  if (output !== OUTPUT.preliminaryEstimate) return [];
  const used = new Set([...input.snapshotCandidates.values()].map((candidate) => `${candidate.subjectId}:${candidate.fieldKey}`));
  const named = new Set(
    codes.flatMap((code) => {
      const [kind, subjectId, fieldKey] = code.split(':');
      const field = kind === 'input' ? input.current.find((entry) => entry.subjectId === subjectId && entry.field.key === fieldKey) : undefined;
      return field?.field.firstEstimateSlot === undefined ? [] : [field.field.firstEstimateSlot];
    }),
  );
  const slots = new Map<string, ProposalField[]>();
  for (const field of input.current) {
    const slot = field.field.firstEstimateSlot;
    if (slot === undefined || field.field.criticality !== 'first_estimate' || named.has(slot)) continue;
    slots.set(slot, [...(slots.get(slot) ?? []), field]);
  }
  return [...slots.values()]
    .filter((fields) => !fields.some((field) => used.has(`${field.subjectId}:${field.field.key}`)))
    .map((fields) => [...fields].sort((a, b) => a.field.impactRank - b.field.impactRank)[0])
    .flatMap((field) => (field === undefined ? [] : [`input:${field.subjectId}:${field.field.key}:unknown`]));
}

/** "Not available yet: <what is missing>" for an output, with the owner's Add actions (rule 7; 2.8's example line). */
function notAvailableDisplay(input: ProposalBuildInput, valueId: ValueId, output: string, codes: readonly string[]): DisplayObject {
  const named = missingNames(input, output, codes);
  if (named.names.length === 0) throw new ProposalNotBuilt(`the output ${output} is not available and names nothing missing (rule 7)`);
  const actions: Action[] = named.addable.map((field) => {
    const words = fieldWords(field, field.field.key);
    return { kind: 'add', field: { subjectId: field.subjectId, fieldKey: field.field.key }, label: lineOf('add_action', { field: words }).text, step: 8 };
  });
  const lines: Line[] = named.ownerInputsOnly ? named.addable.map((field) => lineOf('add_to_see_this', { field: fieldWords(field, field.field.key) })) : [];
  // What the output measures, so a page can name it beside its line (rule 8, "Every value states what it measures").
  const measure = { label: OUTPUT_LABELS[output] ?? output };
  if (named.soleConflict !== undefined) {
    return { ...resolveLine(valueId, 'not_available_yet_two_values', { field: fieldWords(named.soleConflict, named.soleConflict.field.key) }, FORMAT, { missing: 'not_available_yet' }), measure };
  }
  return { ...resolveLine(valueId, 'not_available_yet_named', { missing: named.names.join('; ') }, FORMAT, { missing: 'not_available_yet', lines, actions }), measure };
}

// ---------------------------------------------------------------------------------------------
// A figure the engine produced
// ---------------------------------------------------------------------------------------------

/** The significant figures a number is written with (its shortest text; rule 9, "Calculated values"). */
function significantFiguresOf(value: number): number {
  const digits = String(Math.abs(value)).replace(/e.*$/u, '').replace('.', '').replace(/^0+/u, '');
  const trimmed = String(value).includes('.') ? digits : digits.replace(/0+$/u, '');
  return Math.max(1, Math.min(17, trimmed.length));
}

/** A produced candidate's figure as its element shows it (rule 9: rounding at display, ranges rounded outward). */
function figureReading(input: ProposalBuildInput, candidate: Candidate): FormattedValue & { readonly shape: 'value' | 'range' } {
  const quantity = candidate.quantity;
  if (quantity === undefined) {
    if (candidate.choice !== undefined) return { text: candidate.choice, parts: [], shape: 'value' };
    throw new ProposalNotBuilt(`the engine's candidate ${candidate.id} carries no figure`);
  }
  const unit = unitByCode(quantity.unit);
  if (unit === undefined) throw new ProposalNotBuilt(`the unit ${quantity.unit} is not in the closed unit registry (2.7)`);
  if (candidate.source === 'estimated') {
    if (candidate.range === undefined) throw new ProposalNotBuilt('an estimated figure without its range is not shown (rule 9)');
    return { ...formatEstimate(quantity.value, candidate.range, unit, FORMAT), shape: 'range' };
  }
  if (unit.code === COUNT_UNIT_CODE) return { ...formatCount(quantity.value, FORMAT), shape: 'value' };
  // Rule 9: "Calculated values show no more significant figures than their least precise input."
  const inputs = (candidate.method?.inputCandidateIds ?? []).flatMap((id) => {
    const used = input.snapshotCandidates.get(id)?.quantity?.value;
    return used === undefined ? [] : [significantFiguresOf(used)];
  });
  if (inputs.length === 0) throw new ProposalNotBuilt('a calculated quantity needs the significant figures its inputs allow (rule 9)');
  return { ...formatCalculated(quantity.value, Math.min(...inputs), unit, FORMAT), shape: 'value' };
}

/** A field's registered label, by its subject and key, as the proposal's input reads it. */
function labelOf(input: ProposalBuildInput, subjectId: string, fieldKey: string): string {
  return input.current.find((entry) => entry.subjectId === subjectId && entry.field.key === fieldKey)?.field.label ?? fieldKey;
}

/** The name a catalogue gives a dataset, with the version the method read ("SOVITECH point templates, version 2"). */
function datasetWords(input: ProposalBuildInput, id: string, version: string): string {
  return `${requirementName(input.catalogue, 'dataset', id) ?? id}, version ${version}`;
}

/**
 * Rule 9's basis: "what it is based on, with the inputs' own labels", read from the method the engine recorded (its
 * exact input candidates; its coded notes: the dataset versions, the inputs a range ran over, the method's own words;
 * engine `methodNotesOf`), never a coded entry as written.
 */
function basisOf(input: ProposalBuildInput, candidate: Candidate): string {
  const labels = new Set<string>();
  for (const id of candidate.method?.inputCandidateIds ?? []) {
    const used = input.snapshotCandidates.get(id);
    if (used !== undefined) labels.add(labelOf(input, used.subjectId, used.fieldKey));
  }
  for (const note of candidate.method === undefined ? [] : methodNotesOf(candidate.method)) {
    if (note.kind === 'dataset') labels.add(datasetWords(input, note.id, note.version));
    else if (note.kind === 'range_over_options' || note.kind === 'range_over_values') labels.add(labelOf(input, note.subjectId, note.fieldKey));
    else if (note.kind === 'note') labels.add(note.text);
  }
  const list = [...labels];
  return list.length === 0 ? '' : BASED_ON(list.join(', '));
}

/** The items a total left out that are not minor (rule 1, "Incomplete: excludes <item names>"; engine `methodNotesOf`). */
function excludedNames(input: ProposalBuildInput, candidate: Candidate): string[] {
  if (candidate.method === undefined) return [];
  return methodNotesOf(candidate.method).flatMap((note) => {
    if (note.kind === 'excludes' && !note.minor) return [labelOf(input, note.subjectId, note.fieldKey)];
    if (note.kind === 'excludes_item') return [note.name];
    return [];
  });
}

/**
 * The provisional lines of a figure (2.4, "Provisional": computed on read from its inputs; 2.8; rule 4; PRD R-111:
 * "'Provisional: depends on <n> equipment items not yet checked', or the 2.8 line naming the provisional input"):
 * - the equipment items among its inputs (asset subjects) not yet verified by SOVITECH, counted, one line;
 * - each input field in conflict: "Provisional: two values for <field>" (rule 4).
 * Another provisional input (an inference or an engineer field not yet verified) keeps its own badge on its basis row;
 * 2.8 writes no line for it (listed for the approver, phase 5's "Waiting").
 */
function provisionalLines(input: ProposalBuildInput, candidate: Candidate): { readonly lines: Line[]; readonly parts: string[] } {
  const lines: Line[] = [];
  const parts: string[] = [];
  const seen = new Set<string>();
  const equipment = new Set<string>();
  for (const id of candidate.method?.inputCandidateIds ?? []) {
    const used = input.snapshotCandidates.get(id);
    if (used === undefined) continue;
    const field = input.current.find((entry) => entry.subjectId === used.subjectId && entry.field.key === used.fieldKey);
    if (field === undefined && used.fieldKey.startsWith('asset.') && input.verificationOf(used.id) !== 'engineer_verified') equipment.add(used.subjectId);
    if (field === undefined || seen.has(`${used.subjectId} ${used.fieldKey}`)) continue;
    seen.add(`${used.subjectId} ${used.fieldKey}`);
    if (field.state.state === 'conflict') lines.push(fillLine('provisional_two_values', { field: fieldWords(field, field.field.key) }, FORMAT).line);
  }
  if (equipment.size > 0) {
    const filled = fillLine('provisional_inputs', { count: equipment.size }, FORMAT);
    lines.unshift(filled.line);
    parts.push(...filled.parts);
  }
  return { lines, parts };
}

/** The "Superseded: inputs changed on <date>" line of a stale quotation record (2.8; rule 10; G10-2), its own display. */
function supersededDisplay(valueId: ValueId, changedOn: string): DisplayObject {
  const filled = fillLine('superseded_inputs_changed', { date: formatDate(changedOn).text }, FORMAT);
  return { valueId, kind: 'line', text: filled.line.text, shape: 'value', lines: [filled.line], ...(filled.parts.length === 0 ? {} : { parts: [...filled.parts] }) };
}

/** The stage label's own display (2.8 stage labels; "Formal quotation" only with the record it was derived from: G10-9). */
function stageDisplay(valueId: ValueId, reading: Exclude<PriceStageReading, { stage: null }>): DisplayObject {
  if (reading.stage !== 'formal_quotation') return resolveStageLabel(valueId, reading.stage, FORMAT);
  if (reading.quotationRecordId === null) throw new ProposalNotBuilt('the stage 3 label names the stored record it was derived from (rule 10; G10-9)');
  const label = statusLineById('formal_quotation');
  return { valueId, kind: 'line', text: label.text, shape: 'value', lines: [{ id: label.id, kind: 'stage_label', text: label.text }], quotationRecordId: reading.quotationRecordId };
}

/** The parts a display renders apart, when there are any. */
function partsOf(parts: readonly string[]): { readonly parts?: string[] } {
  const distinct = [...new Set(parts)];
  return distinct.length === 0 ? {} : { parts: distinct };
}

interface OutputBuilt {
  readonly output: ProposalOutput;
  /** An investment figure's stage label line, read from stored records (undefined while no stage applies). */
  readonly stageLine?: Line;
  /** An incomplete total's "Incomplete: excludes <item names>" (rule 1), with the parts its item names bind. */
  readonly incomplete?: { readonly line: Line; readonly parts: readonly string[] };
}

function outputDisplay(input: ProposalBuildInput, displays: Displays, row: ProposalBuildInput['snapshot']['outputs'][number]): OutputBuilt {
  const sid = input.snapshot.id;
  const valueId = proposalValueId(sid, `outputs.${row.output}`);
  const formula = { id: row.formulaId, version: row.formulaVersion };
  const investment = INVESTMENT_OUTPUTS.has(row.output);
  if (row.candidateId === null) {
    displays.add(notAvailableDisplay(input, valueId, row.output, [...row.missing, ...firstEstimateGaps(input, row.output, row.missing)]));
    const price: Price | null = investment ? { figure: valueId, stage: null, stageId: null, quotationRecordId: null, superseded: null } : null;
    // G10-11: an investment output with no figure is named by its 2.8 stage label beside its "Not available yet" line,
    // as step 8 names it; no stage is stated for a figure that does not exist (`price.stage` stays null).
    const stageLabel = investment ? OUTPUT_STAGE_LABELS[row.output] : undefined;
    const label = stageLabel === undefined ? undefined : displays.add(resolveStageLabel(proposalValueId(sid, `outputs.${row.output}.label`), stageLabel, FORMAT));
    return {
      output: { output: row.output, formula, display: valueId, availability: 'not_available_yet', incomplete: false, outOfDate: false, price, ...(label === undefined ? {} : { label }) },
    };
  }
  const candidate = input.snapshotCandidates.get(row.candidateId);
  if (candidate === undefined) throw new ProposalNotBuilt(`the snapshot names a candidate it does not hold: ${row.candidateId}`);
  const outOfDate = input.changes.outOfDateOutputs.has(row.output);
  const reading = figureReading(input, candidate);
  const badge = badgeOf(candidate.source === 'estimated' ? 'estimated' : 'calculated');
  const unit = candidate.quantity === undefined ? undefined : unitByCode(candidate.quantity.unit);
  const lines: Line[] = [];
  let quotationRecordId: string | undefined;
  let stage: ValueId | null = null;
  let stageId: Price['stageId'] = null;
  let superseded: ValueId | null = null;
  let stageLine: Line | undefined;
  if (investment) {
    const stageReading = input.stage(row.output);
    if (stageReading.stage !== null) {
      const stageValue = stageDisplay(proposalValueId(sid, `outputs.${row.output}.stage`), stageReading);
      stage = displays.add(stageValue);
      stageId = stageReading.stage;
      stageLine = (stageValue.lines ?? []).find((line) => line.kind === 'stage_label');
      lines.push(...(stageValue.lines ?? []));
      if (stageReading.stage === 'formal_quotation' && stageReading.quotationRecordId !== null) quotationRecordId = stageReading.quotationRecordId;
      if (stageReading.superseded !== null) {
        const line = supersededDisplay(proposalValueId(sid, `outputs.${row.output}.superseded`), stageReading.superseded.changedOn);
        superseded = displays.add(line);
        lines.push(...(line.lines ?? []));
      }
    }
  }
  let incomplete: OutputBuilt['incomplete'];
  if (row.incomplete) {
    // Rule 1, "Material exclusions": "Incomplete: excludes <item names>", with the same prominence as the figure.
    const excluded = [...new Set([...excludedNames(input, candidate), ...(row.missing.length > 0 ? missingNames(input, row.output, row.missing).names : [])])];
    if (excluded.length === 0) throw new ProposalNotBuilt('an incomplete total names the items it leaves out (rule 1)');
    incomplete = fillLine('incomplete_exclusions', { itemNames: excluded.join(', ') }, FORMAT);
    lines.push(incomplete.line);
  }
  const provisional = provisionalLines(input, candidate);
  lines.push(...provisional.lines);
  const basis = basisOf(input, candidate);
  const sourceLine: Line | undefined =
    candidate.method === undefined ? undefined : { id: candidate.source, kind: 'source_line', text: METHOD_LINE(candidate.method.formulaId, candidate.method.formulaVersion) };
  if (basis !== '') lines.push({ id: 'basis', kind: 'source_line', text: basis });
  // 2.4, "Recalculation": a figure whose inputs changed "renders as 'Out of date, recalculating' and never as current".
  const outOfDateLine = fillLine('out_of_date_recalculating', {}, FORMAT).line;
  const display: DisplayObject = {
    valueId,
    kind: 'record',
    text: outOfDate ? outOfDateLine.text : reading.text,
    shape: outOfDate ? 'value' : reading.shape,
    badge,
    measure: { label: OUTPUT_LABELS[row.output] ?? row.output, ...(unit === undefined || unit.code === COUNT_UNIT_CODE ? {} : { unit: { code: unit.code, symbol: unit.symbol } }) },
    ...(sourceLine === undefined ? {} : { sourceLine }),
    ...partsOf([...(outOfDate ? [] : reading.parts), ...provisional.parts]),
    ...(lines.length === 0 ? {} : { lines }),
    ...(quotationRecordId === undefined ? {} : { quotationRecordId }),
  };
  displays.add(display);
  const price: Price | null = investment ? { figure: valueId, stage, stageId, quotationRecordId: quotationRecordId ?? null, superseded } : null;
  return {
    output: { output: row.output, formula, display: valueId, availability: 'figure', incomplete: row.incomplete, outOfDate, price },
    ...(stageLine === undefined ? {} : { stageLine }),
    ...(incomplete === undefined ? {} : { incomplete }),
  };
}

/**
 * The head's price when the investment output it carries is an incomplete total (rule 1, "Material exclusions": "no
 * headline, payback or ROI is computed from it"; G1-2; phase 5 part B, V-1): its own display,
 * `proposal:<sid>.headline.investment`, reading rule 1's "Incomplete: excludes <item names>" (its item names bound as
 * parts) under the output's stage label, and "Out of date, recalculating" when its inputs changed (2.4), with no
 * figure: nothing of the figure's text or parts is copied. The Investment section keeps the figure with its Incomplete
 * line. No stage 3 label and no "Superseded" (stage.ts gives neither to an incomplete total).
 */
function incompleteHeadline(sid: string, displays: Displays, built: OutputBuilt): Price {
  const price = built.output.price;
  const incomplete = built.incomplete;
  if (price === null || incomplete === undefined) throw new ProposalNotBuilt('the head\'s incomplete total is an investment output with its Incomplete line');
  if (built.stageLine === undefined || price.stage === null || price.stageId === null) throw new ProposalNotBuilt('an incomplete investment total names its stage (rule 10)');
  const lines: Line[] = [built.stageLine, ...(built.output.outOfDate ? [fillLine('out_of_date_recalculating', {}, FORMAT).line] : [])];
  const figure = displays.add({
    valueId: proposalValueId(sid, 'headline.investment'),
    kind: 'line',
    text: incomplete.line.text,
    shape: 'value',
    lines,
    ...partsOf(incomplete.parts),
  });
  return { figure, stage: price.stage, stageId: price.stageId, quotationRecordId: null, superseded: null };
}

// ---------------------------------------------------------------------------------------------
// The inputs as the snapshot used them
// ---------------------------------------------------------------------------------------------

/** What the resolver reads to show one of a field's candidates (its badge and source line as derived now: 2.4, "computed on read"). */
function entryInputOf(input: ProposalBuildInput, field: ProposalField): ResolveFieldInput {
  return {
    field: field.field,
    subject: { id: field.subjectId, kind: field.subjectKind },
    state: field.state,
    candidates: field.candidates,
    candidateEvents: field.candidateEvents,
    document: (documentId) => input.documents.find((document) => document.id === documentId),
    fileName: input.fileName,
    projectType: input.projectType,
    asked: field.asked,
    searchedCoverage: undefined,
    actions: [],
    format: FORMAT,
  };
}

/** The 2.8 status line of a used value that is no longer current (2.3), or none ("no new wording": ADR 0048 decision 4). */
function usedStatusLine(input: ProposalBuildInput, field: ProposalField, candidate: Candidate): 'source_document_removed' | 'from_superseded_revision' | undefined {
  const status = field.state.candidates.find((derived) => derived.candidateId === candidate.id)?.status;
  if (status === 'withdrawn' && candidate.evidence.length > 0 && candidate.evidence.every((entry) => !input.activeDocumentIds.has(entry.documentId))) return 'source_document_removed';
  if (status === 'superseded' && candidate.evidence.length > 0) return 'from_superseded_revision';
  return undefined;
}

/** An input of the proposal as the snapshot used it (`proposal:<sid>.inputs.<kind>.<path>`). */
function inputDisplay(input: ProposalBuildInput, field: ProposalField): DisplayObject {
  const valueId = proposalValueId(input.snapshot.id, inputPath(field.subjectKind, field.field.key));
  const used = [...input.snapshotCandidates.values()].filter((candidate) => candidate.subjectId === field.subjectId && candidate.fieldKey === field.field.key);
  const measure = { label: field.field.label };
  if (used.length === 0) {
    // No value at generation: Unknown, or Not provided yet where the owner was asked (2.8; rule 1: never 0 or blank).
    const badge = badgeOf(field.asked ? 'not_provided_yet' : 'unknown');
    return { valueId, kind: 'record', text: badge.label, shape: 'missing', missing: field.asked ? 'not_provided_yet' : 'unknown', badge, measure };
  }
  const entry = entryInputOf(input, field);
  if (used.length === 1 && used[0] !== undefined) return resolveCandidateEntry(entry, used[0].id, valueId, usedStatusLine(input, field, used[0]));
  // Several: one per fact (a qualifier each, rule 8: floors by level type), or the values of a conflict on one fact.
  const facts = new Map<string, Candidate[]>();
  for (const candidate of used) {
    const qualifier = candidate.quantity?.qualifier ?? UNKNOWN_QUALIFIER;
    facts.set(qualifier, [...(facts.get(qualifier) ?? []), candidate]);
  }
  const phrases: string[] = [];
  const parts = new Set<string>();
  const badges: RegistryBadgeId[] = [];
  const sources = new Set<string>();
  for (const [qualifier, candidates] of facts) {
    const views = candidates.map((candidate) => resolveCandidateEntry(entry, candidate.id, valueId, usedStatusLine(input, field, candidate)));
    for (const view of views) {
      for (const part of view.parts ?? []) parts.add(part);
      if (view.sourceLine !== undefined) sources.add(view.sourceLine.text);
    }
    const text = [...new Set(views.map((view) => view.text))].join(' or ');
    phrases.push(facts.size === 1 && qualifier === UNKNOWN_QUALIFIER ? text : `${text} ${qualifierLabel(qualifier === UNKNOWN_QUALIFIER ? null : qualifier)}`);
    if (candidates.length > 1) badges.push('two_values');
    else for (const view of views) if (view.badge !== undefined) badges.push(view.badge.id as RegistryBadgeId);
  }
  const chosen = firstBadge(badges);
  if (chosen === undefined) throw new ProposalNotBuilt('no 2.8 badge applies to a used value');
  const sourceText = [...sources].join('; ');
  return {
    valueId,
    kind: 'record',
    text: phrases.join(', '),
    shape: badges.includes('two_values') ? 'range' : 'value',
    badge: { id: chosen.id as BadgeId, label: chosen.label },
    measure,
    ...(parts.size === 0 ? {} : { parts: [...parts] }),
    ...(sourceText === '' ? {} : { sourceLine: { id: 'facts_sources', kind: 'source_line' as const, text: sourceText } }),
  };
}

/**
 * The intake step a field is asked or shown on, as the wizard places it (apps/api wizard/registry.ts
 * `productionStepOfField`): 1 the project, 3 the building's facts, 4 the systems in scope, 5 the operation (building
 * type, schedule, occupancy), 6 the goals, 7 the automation areas. A field no step shows sorts after them all.
 */
function intakeStepOf(fieldKey: string): number {
  if (([FIELD.projectName, FIELD.projectType, FIELD.country, FIELD.city] as readonly string[]).includes(fieldKey)) return 1;
  if (([FIELD.grossFloorArea, FIELD.floors, FIELD.rooms, FIELD.zones] as readonly string[]).includes(fieldKey)) return 3;
  if (SCOPE_FIELDS.includes(fieldKey)) return 4;
  if (([FIELD.buildingType, FIELD.operatingSchedule, FIELD.occupancy] as readonly string[]).includes(fieldKey)) return 5;
  if (GOAL_FIELDS.includes(fieldKey)) return 6;
  if (AUTOMATION_FIELDS.includes(fieldKey)) return 7;
  return 9;
}

/**
 * The fields the catalogue's formulas read, each once (the proposal's basis), by intake step (the project, the
 * building, the systems, the operation, the goals, the automation areas), then in registry order (the order of
 * `input.current`), so related inputs sit together (phase 5 part B, DR-12; the list stays flat: step headings are logged
 * for later).
 */
function basisFields(input: ProposalBuildInput): ProposalField[] {
  const keys = new Set<string>();
  for (const formula of input.catalogue.formulas) for (const key of formula.signature.inputs) keys.add(key);
  const read = input.current.flatMap((field, index) => (keys.has(field.field.key) ? [{ field, index }] : []));
  const once = read.filter((entry, position) => read.findIndex((other) => other.field.field.key === entry.field.field.key) === position);
  return once.sort((a, b) => intakeStepOf(a.field.field.key) - intakeStepOf(b.field.field.key) || a.index - b.index).map((entry) => entry.field);
}

/** The choice a used decision holds (the scope decisions as the snapshot used them), or undefined. */
function usedChoice(input: ProposalBuildInput, field: ProposalField | undefined): string | undefined {
  if (field === undefined) return undefined;
  const used = [...input.snapshotCandidates.values()].filter((candidate) => candidate.subjectId === field.subjectId && candidate.fieldKey === field.field.key);
  const choices = [...new Set(used.flatMap((candidate) => (candidate.choice === undefined ? [] : [candidate.choice])))];
  return choices.length === 1 ? choices[0] : undefined;
}

// ---------------------------------------------------------------------------------------------
// Drafted paragraphs (R-115): value tokens rendered by code
// ---------------------------------------------------------------------------------------------

const TOKEN = /\{\{(value|calc):([A-Za-z][A-Za-z0-9_.:-]*)\}\}/gu;

/**
 * A paragraph the output validator accepted, as prose and value segments: `{{value:<field key>}}` is the input as the
 * snapshot used it, `{{calc:<output>}}` the output's display. A token with no display in this response, a product token,
 * or prose holding a digit leaves the whole paragraph out (rule 2: never a raw token, never a figure typed as text).
 */
function draftedParagraph(input: ProposalBuildInput, displays: Displays, paragraph: { readonly slot: string; readonly text: string }): ProposalResponse['view']['drafted'][number] | undefined {
  const segments: ProposalResponse['view']['drafted'][number]['segments'] = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  for (let match = TOKEN.exec(paragraph.text); match !== null; match = TOKEN.exec(paragraph.text)) {
    const prose = paragraph.text.slice(last, match.index);
    if (/\p{N}/u.test(prose) || /\{\{|\}\}/u.test(prose)) return undefined;
    if (prose.trim() !== '') segments.push({ kind: 'prose', text: prose });
    const [, kind, key] = match;
    let valueId: ValueId | undefined;
    if (kind === 'calc' && key !== undefined) valueId = proposalValueId(input.snapshot.id, `outputs.${key}`);
    if (kind === 'value' && key !== undefined) {
      const field = input.current.find((entry) => entry.field.key === key);
      if (field !== undefined) valueId = proposalValueId(input.snapshot.id, inputPath(field.subjectKind, field.field.key));
    }
    if (valueId === undefined || !displays.has(valueId)) return undefined;
    segments.push({ kind: 'value', valueId });
    last = match.index + match[0].length;
  }
  const tail = paragraph.text.slice(last);
  if (/\p{N}/u.test(tail) || /\{\{|\}\}/u.test(tail)) return undefined;
  if (tail.trim() !== '') segments.push({ kind: 'prose', text: tail });
  if (segments.length === 0 || !/^[a-z][A-Za-z0-9_]*$/u.test(paragraph.slot)) return undefined;
  return { slot: paragraph.slot, segments };
}

// ---------------------------------------------------------------------------------------------
// The builders
// ---------------------------------------------------------------------------------------------

/**
 * A stored version's generation date and time (`proposal:<sid>.generatedOn`), a record display, bound: "D MMM YYYY,
 * HH:MM", as Reports' "Date Generated" reads (the formatting module's `formatDateAndTime`), so two versions of one day
 * read apart (US-PROPOSAL-11 AC3; phase 5 part B, DR-5; draft wording, the time as the store writes it until the
 * owner's question 2 is answered).
 */
function generatedOnDisplay(version: StoredVersion): DisplayObject {
  const shown = formatDateAndTime(version.createdAt);
  return { valueId: proposalValueId(version.snapshotId, 'generatedOn'), kind: 'record', text: shown.text, shape: 'value', parts: [shown.text] };
}

/** `proposals.list`: the stored versions, newest first, each with its generation date. */
export function versionsView(versions: readonly StoredVersion[]): Built<ProposalVersionsResponse['view']> {
  const displays = new Displays();
  const listed = versions.map((version) => ({ snapshotId: version.snapshotId, generatedOn: displays.add(generatedOnDisplay(version)) }));
  return { view: { versions: listed }, displayObjects: displays.list() };
}

/** `proposals.view`: the stored proposal (UD-06) with UD-01's content at its head. */
export function proposalView(input: ProposalBuildInput): Built<ProposalResponse['view']> {
  const displays = new Displays();
  const sid = input.snapshot.id;
  const version = input.versions.find((entry) => entry.snapshotId === sid) ?? { snapshotId: sid, createdAt: input.snapshot.createdAt };
  const generatedOn = displays.add(generatedOnDisplay(version));

  // The inputs as used, first: drafted paragraphs and scope decisions name them.
  const basisList = basisFields(input);
  const basis = basisList.map((field) => displays.add(inputDisplay(input, field)));

  const rows = new Map(input.snapshot.outputs.map((row) => [row.output, row]));
  const built = new Map<string, OutputBuilt>();
  const outputsOf = (keys: readonly string[]): ProposalOutput[] =>
    keys.flatMap((key) => {
      const row = rows.get(key);
      if (row === undefined) return [];
      const output = outputDisplay(input, displays, row);
      built.set(key, output);
      return [output.output];
    });
  const investment = outputsOf(SECTIONS.investment);
  const points = outputsOf(SECTIONS.points);
  const energy = outputsOf(SECTIONS.energy);
  const measures = outputsOf(SECTIONS.measures);

  // The scope as the snapshot holds the decisions (rule 3: the owner's), and the exclusions (G10-7).
  const exclusions: string[] = [];
  const lifeSafety: ValueId[] = [];
  const systems = SYSTEMS.map((system) => {
    const field = input.current.find((entry) => entry.field.key === `project.scope.${system.id}`);
    if (field === undefined) throw new ProposalNotBuilt(`the registry declares no scope field for ${system.id}`);
    const decision = displays.add(inputDisplay(input, field));
    const choice = usedChoice(input, field);
    if (choice === 'exclude') exclusions.push(system.id);
    let sentence: ValueId | null = null;
    if (system.lifeSafety && choice === 'include') {
      // Rule 11; section 5, step 4; G11-1: generated from stored state, never by the AI (R-113).
      sentence = displays.add({ valueId: proposalValueId(sid, `lifeSafety.${system.id}`), kind: 'line', text: FIRE_SAFETY_MONITORING_ONLY, shape: 'value', lines: [{ id: 'fire_safety_monitoring_only', kind: 'rule_line', text: FIRE_SAFETY_MONITORING_ONLY }] });
      lifeSafety.push(sentence);
    }
    return { systemId: system.id, decision, lifeSafety: system.lifeSafety, sentence };
  });
  // Rule 11, "The interface points stay in scope ... It never leaves them out" (G11-12): named with no figure.
  const interfacePoints = displays.add({
    valueId: proposalValueId(sid, 'lifeSafety.interfacePoints'),
    kind: 'line',
    text: INTERFACE_POINTS,
    shape: 'value',
    lines: [{ id: 'interface_points', kind: 'rule_line', text: INTERFACE_POINTS }],
  });
  lifeSafety.push(interfacePoints);
  const exclusionDecisions = systems.filter((system) => exclusions.includes(system.systemId)).map((system) => system.decision);

  // The financial indicators: "Not available yet", naming what is missing (R-087, R-095, R-102; ROI not listed).
  const indicators = (['operating_cost', 'payback', 'npv', 'irr'] as const).map((indicator) => ({
    indicator,
    display: displays.add(resolveLine(proposalValueId(sid, `indicators.${indicator}`), 'not_available_yet_named', { missing: INDICATOR_MISSING[indicator] }, FORMAT, { missing: 'not_available_yet' })),
  }));

  // The open items, the project's now, as step 8 shows them (ADR 0048 decision 7), and "Still reading" (rule 7).
  for (const display of input.openItems.displays) displays.add(display);
  const stillReading = input.stillReading === null ? null : displays.add(input.stillReading);

  // UD-01's content at the head (R-116 "Until decided"): the investment output that carries the stage.
  const headline = investment.find((entry) => entry.output === input.headlineOutput);
  if (headline?.price === null || headline === undefined) throw new ProposalNotBuilt(`the headline output ${input.headlineOutput} is not an investment output of the snapshot`);
  // Rule 1: an incomplete total is never the head's figure (engine `headlineOutputOf` names stage 2 when it is
  // incomplete and stage 1 is not allowed; G1-2).
  let headPrice: Price = headline.price;
  if (headline.incomplete) {
    const headBuilt = built.get(headline.output);
    if (headBuilt === undefined) throw new ProposalNotBuilt(`the headline output ${headline.output} was not built`);
    headPrice = incompleteHeadline(sid, displays, headBuilt);
  }

  const drafted = input.snapshot.drafted.flatMap((paragraph) => {
    const built = draftedParagraph(input, displays, paragraph);
    return built === undefined ? [] : [built];
  });

  const versions = input.versions.map((entry) => ({ snapshotId: entry.snapshotId, generatedOn: displays.add(generatedOnDisplay(entry)) }));
  const view: ProposalResponse['view'] = {
    snapshotId: sid,
    generatedOn,
    latest: input.versions[0]?.snapshotId === sid,
    headline: { investment: { output: headline.output, price: headPrice }, openItems: input.openItems.view, stillReading },
    investment: { outputs: investment, exclusions: exclusionDecisions },
    points: { outputs: points, interfacePoints },
    energy: { outputs: energy },
    indicators,
    measures: { outputs: measures },
    scope: { systems, exclusions },
    lifeSafety,
    basis,
    whatWeStillNeed: input.openItems.view,
    drafted,
    versions,
  };
  return { view, displayObjects: displays.list() };
}

/** A display with no action (a printed page has no button: ADR 0050 decision 1). */
function withoutActions(display: DisplayObject): DisplayObject {
  if (display.actions === undefined) return display;
  const rest: DisplayObject = { ...display };
  delete rest.actions;
  return rest;
}

/**
 * `proposals.print`: the same proposal with no action on any display, the cover and the appendix: every value the
 * proposal shows (its inputs as used and its outputs), each with its source line, its badge as its verification and, for
 * a figure, its method, version, assumptions and range (2.8 "Prominence": "an appendix listing every value's source,
 * verification and method, and the open items"; rule 9; G10-5), then the open items.
 */
export function proposalPrintView(input: ProposalBuildInput): Built<ProposalPrintResponse['view']> {
  const built = proposalView(input);
  const proposal = built.view;
  const values = [
    ...proposal.basis,
    ...[...proposal.investment.outputs, ...proposal.points.outputs, ...proposal.energy.outputs, ...proposal.measures.outputs].map((output) => output.display),
    ...proposal.indicators.map((indicator) => indicator.display),
  ];
  return {
    view: { proposal, cover: { projectName: input.header.name }, appendix: { values: [...new Set(values)], openItems: proposal.whatWeStillNeed } },
    displayObjects: built.displayObjects.map(withoutActions),
  };
}

/** A single reading of a candidate as text (for the drafting request's token labels: words only, no figure). */
export function usedReading(field: ProposalField, candidate: Candidate): string {
  return candidateReading(field.field, candidate, FORMAT).text;
}
