/**
 * Running the catalogue over a project's derived state (guardrails 2.1, 2.4, rule 1 "Unknown propagates", rule 4
 * "Until a conflict is resolved", rule 7, rule 9; prompt 3 phase 5; docs/adr/0047 "Built").
 *
 * For each formula, in the catalogue's order, and each of its outputs:
 * 1. Its requirements: a dataset whose gate is closed, or with no loaded (approved) version, is missing; a unit the
 *    registry lacks is missing.
 * 2. Its inputs, read from derived state (`readInput`) and planned by the registry's `planFormulaRun` with the declared
 *    `unknownPolicy` (default `refuse`, G1-9): `refuse` names each input it cannot use; `range_over_options` runs over
 *    an unknown enum or decision's options (G7-1, G10-6, G1-7) and refuses an unknown input with none (rule 1, "Ranges
 *    need a basis"); `exclude_and_count` leaves out the inputs it cannot use and counts them (G1-2). An input in
 *    conflict, or read two ways, is never run on one of its values: a range over its values where the formula takes a
 *    range (`range_over_options`), else "Not available yet: two values for <field>" (rule 4; G4-12). A Please-check
 *    value (rule 8; G8-10), an incomplete total (rule 1, G1-2) and an out-of-date value (2.4) are never used: a total
 *    leaves them out and counts them, any other formula names them.
 * 3. Its body: none (no source defines the method) is missing, as `method` unless a dataset is already named (G1-28).
 * 4. Else the body runs, and its answer becomes one candidate per output: `calculated` or `estimated` by the signature
 *    (2.1; G9-4), `method` with the exact input candidate ids, the policy and the assumptions (with the dataset versions,
 *    the ranges and the exclusions as coded notes, notes.ts), the range from the body (rule 9: low < value < high,
 *    refused otherwise, G9-12), the unit checked against the output field (2.7), `createdBy` the engine's account. A
 *    total that left out an item that is not `minorForTotals` is `incomplete` (rule 1, "Material exclusions"). Never a
 *    zero for an unknown (rule 1); never a candidate on an output field the registry does not declare.
 *
 * Pure and deterministic: the same input gives the same run, the same candidate ids aside (ids come from `newId`,
 * passed in, so tests fix them). A refused answer is recorded in `refusals` for the API's guardrail event.
 */
import { checkQuantityUnit, isLoadedDataset, planFormulaRun, resolveUnknownPolicy } from '@sovitech/registry';
import type { FieldDefinition } from '@sovitech/domain';
import { formulaRefOf, type BodyOutput, type EngineFormula, type FormulaCatalogue, type Requirement } from './catalogue';
import { EngineInputError } from './errors';
import type { EngineInput, InputReading } from './inputs';
import { isPoint, strictlyInside, toCandidateNumber, type Interval } from './interval';
import { encodeNote, type MethodNote } from './notes';
import { readInput, type InputRead } from './reading';
import type { EngineCandidate, EngineRefusal, EngineRefusalReason, EngineRun, FormulaRef, Missing, OutputResult } from './results';
import { inputsHashOf } from './snapshot';

export interface RunOptions {
  /** A new candidate id (UUIDv7 in the app; fixed in tests). */
  readonly newId: () => string;
  /** The moment the run reads as now (the database's time in the app). The store stamps `createdAt`; the engine records no time of its own. */
  readonly at: string;
}

/** A TEST id, as prompt 3 5.4 marks TEST datasets and formulas. */
const isTestId = (id: string): boolean => id.includes('TEST');

/** Whether this process is the test runner (Vitest sets VITEST in every worker). */
function inTestRunner(): boolean {
  return typeof process !== 'undefined' && process.env['VITEST'] !== undefined;
}

/** Refuses a catalogue the engine must never run (prompt 3 5.4; 2.1; G1-16; G9-4). */
function assertCatalogue(catalogue: FormulaCatalogue): void {
  if (catalogue.kind === 'test' && !inTestRunner()) {
    throw new EngineInputError('a TEST catalogue runs only inside the test runner (prompt 3 5.4)');
  }
  const outputs = new Set<string>();
  for (const formula of catalogue.formulas) {
    const { signature } = formula;
    if (catalogue.kind === 'production' && isTestId(signature.id)) {
      throw new EngineInputError(`the production catalogue holds the TEST formula ${signature.id} (prompt 3 5.4; G1-16)`);
    }
    for (const requirement of formula.requires) {
      if (requirement.kind !== 'dataset') continue;
      if (catalogue.kind === 'production' && isTestId(requirement.datasetId)) {
        throw new EngineInputError(`the production formula ${signature.id} requires the TEST dataset ${requirement.datasetId} (prompt 3 5.4)`);
      }
      if ((requirement.role ?? 'benchmark') === 'benchmark' && signature.estimated !== true) {
        throw new EngineInputError(
          `${formulaRefOf(signature)} reads the benchmark ${requirement.datasetId} but is not declared estimated: a formula that uses a benchmark, a template or a price table is estimated (2.1; G9-4)`,
        );
      }
    }
    for (const output of signature.outputs) {
      if (outputs.has(output)) throw new EngineInputError(`two formulas of the catalogue produce ${output}`);
      outputs.add(output);
    }
  }
}

/** The dataset a requirement names, as the run may read it, or the reason it is missing. */
function datasetFor(
  catalogue: FormulaCatalogue,
  requirement: Extract<Requirement, { kind: 'dataset' }>,
  input: EngineInput,
): { readonly version: string; readonly entries: Readonly<Record<string, unknown>> } | undefined {
  if (requirement.gate !== null && input.closedGates.has(requirement.gate)) return undefined;
  const dataset = input.datasets(requirement.datasetId);
  if (dataset === undefined) return undefined;
  const id = dataset.id;
  if (id !== requirement.datasetId) throw new EngineInputError(`asked for the dataset ${requirement.datasetId}, the input answered ${id}`);
  const accepted = isLoadedDataset(dataset);
  if (catalogue.kind === 'production' && (isTestId(id) || !accepted)) {
    throw new EngineInputError(`${id} is not a dataset the loader accepted, so no production formula reads it (G1-12; prompt 3 5.4)`);
  }
  if (catalogue.kind === 'test' && !isTestId(id) && !accepted) {
    throw new EngineInputError(`${id} is neither a TEST dataset nor one the loader accepted`);
  }
  return { version: dataset.version, entries: dataset.entries };
}

/** The input reasons a formula that takes no range cannot run past, whatever its policy (rule 4; rule 8). */
const NEVER_EXCLUDED: ReadonlySet<string> = new Set(['conflict', 'ambiguous']);

interface FormulaRun {
  readonly outputs: readonly OutputResult[];
  readonly ran: boolean;
  readonly ids: readonly string[];
  readonly datasets: ReadonlyMap<string, string>;
  readonly refusals: readonly EngineRefusal[];
}

function inputMissing(read: InputRead, input: EngineInput): Missing {
  const reason = read.status === 'usable' || read.status === 'range' ? 'unknown' : read.status;
  return { kind: 'input', fieldKey: read.fieldKey, subjectId: read.field?.subjectId ?? input.subjectOf(read.fieldKey) ?? '', reason };
}

function notAvailable(formula: EngineFormula, missing: readonly Missing[]): OutputResult[] {
  const ref = formulaRefOf(formula.signature);
  return formula.signature.outputs.map((output) => ({ kind: 'not_available', output, formula: ref, missing: [...missing] }));
}

/** The registry entry of an output field: the input's registry lookup, else the entry of that field as the input hands it. */
function outputDefinition(input: EngineInput, fieldKey: string): FieldDefinition | undefined {
  const looked = input.fieldDefinition?.(fieldKey);
  if (looked !== undefined) return looked;
  for (const field of input.fields.values()) if (field.definition.key === fieldKey) return field.definition;
  return undefined;
}

/** The candidate a body's answer becomes, or why the engine refuses it. */
function candidateOf(
  formula: EngineFormula,
  output: string,
  answer: Exclude<BodyOutput, { kind: 'not_available' }>,
  context: {
    readonly input: EngineInput;
    readonly newId: () => string;
    readonly inputCandidateIds: readonly string[];
    readonly notes: readonly MethodNote[];
  },
): { readonly candidate: EngineCandidate } | { readonly refusal: EngineRefusalReason; readonly message: string } {
  const { signature } = formula;
  const estimated = signature.estimated === true;
  const range: Interval | undefined = answer.kind === 'estimate' ? answer.range : answer.kind === 'excluded' ? answer.range : undefined;
  if (answer.kind === 'value' && estimated) {
    return { refusal: 'value_from_estimated_formula', message: `${output}: an estimated formula answers an estimate with its range (rule 9)` };
  }
  if (answer.kind === 'estimate' && !estimated) {
    return { refusal: 'estimate_from_calculated_formula', message: `${output}: a formula not declared estimated answered an estimate (2.1)` };
  }
  if (!isPoint(answer.value)) {
    return { refusal: 'value_not_exact', message: `${output}: the body answered a value that is not one number (a range is an estimate's, rule 9)` };
  }
  const value = answer.value.low;
  if (estimated) {
    if (range === undefined || !strictlyInside(value, range)) {
      return { refusal: 'estimate_not_inside_range', message: `${output}: an estimate needs low < value < high (rule 9; G9-12)` };
    }
  } else if (range !== undefined) {
    return { refusal: 'estimate_from_calculated_formula', message: `${output}: a formula not declared estimated answered a range (2.1)` };
  }
  const fieldKey = formula.outputFields[output];
  const definition: FieldDefinition | undefined = fieldKey === undefined ? undefined : outputDefinition(context.input, fieldKey);
  const subjectId = fieldKey === undefined ? undefined : context.input.subjectOf(fieldKey);
  if (fieldKey === undefined || definition === undefined || subjectId === undefined) {
    return { refusal: 'no_output_field', message: `${output}: no registered output field to write the figure on` };
  }
  const unitCheck = checkQuantityUnit(definition, { unit: answer.unit });
  if (!unitCheck.ok) return { refusal: 'output_field_unit', message: `${output}: ${unitCheck.message}` };
  if (estimated && definition.estimation !== 'allowed') {
    return { refusal: 'output_field_estimation_forbidden', message: `${output}: ${definition.key} does not allow estimation (rule 1, "Estimation")` };
  }
  if (answer.qualifier !== undefined && !(definition.qualifiers ?? []).includes(answer.qualifier)) {
    return { refusal: 'output_field_value_shape', message: `${output}: ${definition.key} registers no qualifier ${answer.qualifier} (rule 8)` };
  }
  let number: number;
  let bounds: { readonly low: number; readonly high: number } | undefined;
  try {
    number = toCandidateNumber(value);
    bounds = range === undefined ? undefined : { low: toCandidateNumber(range.low), high: toCandidateNumber(range.high) };
  } catch (error) {
    if (error instanceof EngineInputError) return { refusal: 'not_representable', message: `${output}: ${error.message}` };
    throw error;
  }
  if (definition.kind === 'count' && !(Number.isInteger(number) && number >= 0)) {
    return { refusal: 'output_field_value_shape', message: `${output}: ${definition.key} counts whole items (2.6 kind count)` };
  }
  const candidate: EngineCandidate = {
    id: context.newId(),
    subjectId,
    fieldKey,
    quantity: { value: number, unit: answer.unit, ...(answer.qualifier === undefined ? {} : { qualifier: answer.qualifier }) },
    source: estimated ? 'estimated' : 'calculated',
    evidence: [],
    method: {
      formulaId: signature.id,
      formulaVersion: signature.version,
      inputCandidateIds: [...context.inputCandidateIds],
      unknownPolicy: resolveUnknownPolicy(signature),
      assumptions: [...context.notes, ...answer.assumptions.map((text): MethodNote => ({ kind: 'note', text }))].map(encodeNote),
    },
    ...(bounds === undefined ? {} : { range: bounds }),
    createdBy: context.input.author,
  };
  return { candidate };
}

function runFormula(catalogue: FormulaCatalogue, formula: EngineFormula, input: EngineInput, options: RunOptions): FormulaRun {
  const { signature } = formula;
  const ref = formulaRefOf(signature);
  const policy = resolveUnknownPolicy(signature);
  const takesRange = policy === 'range_over_options';
  const missing: Missing[] = [];
  const datasets = new Map<string, { readonly version: string; readonly entries: Readonly<Record<string, unknown>> }>();

  // 1. Requirements.
  for (const requirement of formula.requires) {
    if (requirement.kind === 'unit') {
      if (input.closedGates.has(requirement.gate)) missing.push({ kind: 'unit', name: requirement.name, gate: requirement.gate });
      continue;
    }
    const dataset = datasetFor(catalogue, requirement, input);
    if (dataset === undefined) missing.push({ kind: 'dataset', datasetId: requirement.datasetId, name: requirement.name, gate: requirement.gate });
    else datasets.set(requirement.datasetId, dataset);
  }

  // 2. Inputs.
  const reads = signature.inputs.map((fieldKey) => readInput(input, fieldKey, takesRange));
  const ids = [...new Set(reads.flatMap((read) => read.ids))].sort();
  const readOf = new Map(reads.map((read) => [read.fieldKey, read]));
  const plan = planFormulaRun(
    signature,
    (fieldKey) => {
      const status = readOf.get(fieldKey)?.status;
      return status === 'usable' || status === 'range';
    },
    (fieldKey) => {
      const definition = readOf.get(fieldKey)?.field?.definition;
      if (definition === undefined) return undefined;
      return { kind: definition.kind, ...(definition.options === undefined ? {} : { options: [...definition.options] }) };
    },
  );
  const blocked = new Set(reads.filter((read) => NEVER_EXCLUDED.has(read.status)).map((read) => read.fieldKey));
  const refused = new Set(plan.action === 'refuse' ? plan.missing : []);
  const excluded = plan.action === 'exclude_and_count' ? plan.excluded.filter((fieldKey) => !blocked.has(fieldKey)) : [];
  const inputGaps = reads.filter((read) => blocked.has(read.fieldKey) || refused.has(read.fieldKey)).map((read) => inputMissing(read, input));
  if (plan.action === 'exclude_and_count' && excluded.length === signature.inputs.length) {
    // A total of nothing is no figure: "None found" is not zero (rule 1, "Zero is a value").
    inputGaps.push(...reads.filter((read) => !blocked.has(read.fieldKey)).map((read) => inputMissing(read, input)));
  }

  // 3. The body.
  const namesDataset = missing.some((item) => item.kind === 'dataset');
  if (formula.body === undefined && !namesDataset) missing.push({ kind: 'method', name: signature.id });
  missing.push(...inputGaps);
  const datasetVersions = new Map([...datasets].map(([id, dataset]) => [id, dataset.version]));
  if (missing.length > 0 || formula.body === undefined) {
    return { outputs: notAvailable(formula, missing), ran: false, ids, datasets: new Map(), refusals: [] };
  }

  // 4. Run it.
  const readings = new Map<string, InputReading>();
  for (const read of reads) if (read.status === 'usable' || read.status === 'range') readings.set(read.fieldKey, read.reading);
  const fields = new Map(reads.flatMap((read) => (read.field === undefined ? [] : [[read.fieldKey, read.field] as const])));
  const over = new Map(plan.action === 'range_over_options' ? plan.over.map((item) => [item.fieldKey, item.options] as const) : []);
  const answers = formula.body({ fields, over, datasets, readings });

  const subjectOfRead = (fieldKey: string): string => readOf.get(fieldKey)?.field?.subjectId ?? input.subjectOf(fieldKey) ?? '';
  const inputCandidateIds = [...new Set([...readings.values()].flatMap((reading) => reading.values.map((value) => value.candidateId)))].sort();
  const excludedNotes: MethodNote[] = excluded.map((fieldKey) => ({
    kind: 'excludes',
    subjectId: subjectOfRead(fieldKey),
    fieldKey,
    minor: readOf.get(fieldKey)?.field?.definition.minorForTotals === true,
  }));
  const baseNotes: MethodNote[] = [
    ...[...datasetVersions].sort(([a], [b]) => a.localeCompare(b)).map(([id, version]): MethodNote => ({ kind: 'dataset', id, version })),
    ...[...over.keys()].map((fieldKey): MethodNote => ({ kind: 'range_over_options', subjectId: subjectOfRead(fieldKey), fieldKey })),
    ...[...readings.values()].filter((reading) => reading.kind === 'range').map((reading): MethodNote => ({ kind: 'range_over_values', subjectId: reading.subjectId, fieldKey: reading.fieldKey })),
    ...excludedNotes,
  ];
  const materialNames = excluded
    .filter((fieldKey) => readOf.get(fieldKey)?.field?.definition.minorForTotals !== true)
    .map((fieldKey) => readOf.get(fieldKey)?.field?.definition.label ?? fieldKey);

  const refusals: EngineRefusal[] = [];
  const undeclared = Object.keys(answers).filter((key) => !signature.outputs.includes(key));
  if (undeclared.length > 0) {
    const message = `the body of ${ref} answered outputs its signature does not declare: ${undeclared.join(', ')}`;
    return {
      outputs: notAvailable(formula, [{ kind: 'method', name: signature.id }]),
      ran: true,
      ids,
      datasets: datasetVersions,
      refusals: signature.outputs.map((output) => ({ formula: ref, output, reason: 'answer_undeclared', message })),
    };
  }
  const outputs: OutputResult[] = signature.outputs.map((output): OutputResult => {
    const answer = Object.hasOwn(answers, output) ? answers[output] : undefined;
    if (answer === undefined) {
      refusals.push({ formula: ref, output, reason: 'answer_missing', message: `the body of ${ref} gave no answer for ${output}` });
      return { kind: 'not_available', output, formula: ref, missing: [{ kind: 'method', name: signature.id }] };
    }
    if (answer.kind === 'not_available') {
      const named = answer.missing.length > 0 ? answer.missing : [{ kind: 'method', name: signature.id } as const];
      return { kind: 'not_available', output, formula: ref, missing: [...named] };
    }
    const bodyExcluded = answer.kind === 'excluded' ? answer.excluded : [];
    const notes: MethodNote[] = [...baseNotes, ...bodyExcluded.map((name): MethodNote => ({ kind: 'excludes_item', name }))];
    const built = candidateOf(formula, output, answer, { input, newId: options.newId, inputCandidateIds, notes });
    if ('refusal' in built) {
      refusals.push({ formula: ref, output, reason: built.refusal, message: built.message });
      return { kind: 'not_available', output, formula: ref, missing: [{ kind: 'method', name: signature.id }] };
    }
    const names = [...materialNames, ...bodyExcluded];
    if (names.length > 0) return { kind: 'incomplete', output, formula: ref, candidate: built.candidate, excluded: names };
    return { kind: 'figure', output, formula: ref, candidate: built.candidate };
  });
  return { outputs, ran: true, ids, datasets: datasetVersions, refusals };
}

/** Runs every formula of `catalogue` over `input`. A TEST catalogue is refused outside the test runner (`kind: 'test'` with `process.env.VITEST` unset). */
export function runEngine(catalogue: FormulaCatalogue, input: EngineInput, options: RunOptions): EngineRun {
  assertCatalogue(catalogue);
  const outputs: OutputResult[] = [];
  const formulasRun: FormulaRef[] = [];
  const ids = new Set<string>();
  const datasets = new Map<string, string>();
  const refusals: EngineRefusal[] = [];
  for (const formula of catalogue.formulas) {
    const run = runFormula(catalogue, formula, input, options);
    outputs.push(...run.outputs);
    if (run.ran) formulasRun.push(formulaRefOf(formula.signature));
    for (const id of run.ids) ids.add(id);
    for (const [id, version] of run.datasets) datasets.set(id, version);
    refusals.push(...run.refusals);
  }
  const datasetList = [...datasets].sort(([a], [b]) => a.localeCompare(b)).map(([id, version]) => ({ id, version }));
  return {
    outputs,
    formulasRun,
    inputCandidateIds: [...ids].sort(),
    datasets: datasetList,
    inputsHash: inputsHashOf(input, catalogue.formulas.map((formula) => formulaRefOf(formula.signature)), datasetList),
    refusals,
  };
}
