/**
 * The loosening snapshot (docs/guardrails.md section 10, "Versioning": "CI
 * compares the loosening-sensitive registry properties with the last
 * approved snapshot"; prompt 3 5.2 "Registry values" and 5.4).
 *
 * A snapshot holds, per field: estimation and its method, tolerance,
 * plausible range, criticality and its slot, confirmBy and its rule 3 basis,
 * identity, reference datasets, impactRank, minorForTotals and
 * qualifierRequired; and, since the phase 1 review (round 3, adversarial
 * finding 4), the allow lists derive and the verifier read from a field: its
 * kind, unit and dimension, the qualifiers and options it registers, the value
 * shape of a count, and the declared formulas that write it. Beside the fields:
 * the impactRank order; the approver settings (confirmation budget, calibration
 * threshold, first-estimate set, required list, identity list, document-stage
 * order); every gate with what it waits for; every declared formula signature
 * (2.4: "Formula versions are immutable") and declared dataset; the closed unit
 * registry with its dimensions, written forms and factors (2.7; ADR 0017); and
 * the floor-notation letters with the level types they name (rule 8, "Floors").
 *
 * While no approver is named there is no approved snapshot. The first one is
 * "unapproved baseline v0": it may hold only the strictest values
 * (baselinePolicyProblems), and it is the base the check compares with.
 */
import { z } from 'zod';
import { WAIT_KINDS, type GateDefinition } from '../gates/schema';
import { FLOOR_NOTATION_LEVEL_TYPES } from '../number-parser/floor-notation';
import { UNIT_REGISTRY, type UnitEntry } from '../units/units';
import {
  DOCUMENT_STAGES,
  ESTIMATED_METHODS,
  FIRST_ESTIMATE_SLOTS,
  IDENTITY_SLOTS,
  OWNER_FACT_BASES,
  PROPOSED_SETTINGS,
  REQUIRED_SLOTS,
  type SettingName,
} from './policy';
import {
  CONFIRM_BY,
  CRITICALITIES,
  FIELD_KINDS,
  UNKNOWN_POLICIES,
  VALUE_SHAPES,
  formulaRef,
  formulasWritingField,
  type FormulaSignature,
  type RegistryFieldDefinition,
  type RegistryBundle,
  type SensitiveFieldProperty,
} from './schema';

export const BASELINE_NAME = 'unapproved baseline v0';
export const BASELINE_FILE_NAME = 'unapproved-baseline-v0.json';

const fieldSnapshotSchema = z.strictObject({
  estimation: z.enum(['forbidden', 'allowed']),
  estimatedMethod: z.enum(ESTIMATED_METHODS).nullable(),
  tolerance: z.strictObject({ absolute: z.number().nullable(), relative: z.number().nullable(), reason: z.string() }).nullable(),
  plausible: z.strictObject({ low: z.number(), high: z.number(), basis: z.string() }).nullable(),
  criticality: z.enum(CRITICALITIES),
  requiredSlot: z.enum(REQUIRED_SLOTS).nullable(),
  firstEstimateSlot: z.enum(FIRST_ESTIMATE_SLOTS).nullable(),
  confirmBy: z.enum(CONFIRM_BY),
  confirmByBasis: z.enum(OWNER_FACT_BASES).nullable(),
  identity: z.boolean(),
  referenceDatasets: z.array(z.string()),
  impactRank: z.number(),
  minorForTotals: z.boolean(),
  qualifierRequired: z.boolean(),
  /** 2.6 kind: `decision` takes the owner's own answer only (rule 3). */
  kind: z.enum(FIELD_KINDS),
  /** The registry unit code (2.7), or null. */
  unit: z.string().nullable(),
  /** The dimension the field declares for its unit (registry validation's dimension check), or null. */
  dimension: z.string().nullable(),
  /** The stated qualifiers the field registers, sorted; empty when it takes none (rule 8; G8-14). */
  qualifiers: z.array(z.string()),
  /** The options of an enum or decision, sorted; empty for other kinds. */
  options: z.array(z.string()),
  /** The declared value shape (VALUE_SHAPES), or null. */
  valueShape: z.enum(VALUE_SHAPES).nullable(),
  /** The declared formulas whose outputs name the field, as `formula:<id>@<version>`, sorted. */
  formulas: z.array(z.string()),
});
export type FieldSnapshot = z.infer<typeof fieldSnapshotSchema>;

/** A declared formula signature (2.4: a version is immutable once declared). */
const formulaSnapshotSchema = z.strictObject({
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  /** As it applies: a missing policy is `refuse` (rule 1; G1-9). */
  unknownPolicy: z.enum(UNKNOWN_POLICIES),
  /** Whether the formula uses a benchmark, typical value, factor or price table (2.1 `estimated`). */
  estimated: z.boolean(),
});
export type FormulaSnapshot = z.infer<typeof formulaSnapshotSchema>;

/** A unit of the closed registry (2.7; ADR 0017). */
const unitSnapshotSchema = z.strictObject({
  symbol: z.string(),
  dimension: z.string(),
  /** The forms a document or an owner may write it in, sorted. */
  written: z.array(z.string()),
  /** Its lossless factor to the dimension's base unit, or null where rule 8 fixes none. */
  toBase: z.string().nullable(),
});
export type UnitSnapshot = z.infer<typeof unitSnapshotSchema>;

const gateSnapshotSchema = z.strictObject({
  open: z.boolean(),
  waitsFor: z.array(z.strictObject({ item: z.string(), kind: z.enum(WAIT_KINDS), dId: z.string(), dataset: z.string().nullable() })),
  closedBehaviour: z.string(),
});
export type GateSnapshot = z.infer<typeof gateSnapshotSchema>;

const settingsSnapshotSchema = z.strictObject({
  confirmationBudget: z.number(),
  calibrationThreshold: z.strictObject({ correctionRatePercent: z.number(), window: z.number() }),
  firstEstimateSet: z.array(z.enum(FIRST_ESTIMATE_SLOTS)),
  requiredSet: z.array(z.enum(REQUIRED_SLOTS)),
  identityList: z.array(z.enum(REQUIRED_SLOTS)),
  documentStageOrder: z.array(z.array(z.enum(DOCUMENT_STAGES))),
});
export type SettingsSnapshot = z.infer<typeof settingsSnapshotSchema>;

export const snapshotSchema = z.strictObject({
  name: z.string().min(1),
  status: z.enum(['unapproved', 'approved']),
  version: z.number().int().nonnegative(),
  guardrailsVersion: z.string().min(1),
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Empty for the unapproved baseline. For an approved snapshot, a guardrails-changelog reference. */
  approvalRef: z.string(),
  note: z.string().optional(),
  settings: settingsSnapshotSchema,
  fields: z.record(z.string(), fieldSnapshotSchema),
  impactRankOrder: z.array(z.string()),
  gates: z.record(z.string(), gateSnapshotSchema),
  /** Every declared formula signature, by `formula:<id>@<version>`. */
  formulas: z.record(z.string(), formulaSnapshotSchema),
  /** Every declared dataset, as `<id>@<version>`, sorted. */
  datasets: z.array(z.string()),
  /** The closed unit registry, by code. */
  units: z.record(z.string(), unitSnapshotSchema),
  /** The floor-notation letters the parser reads, and the level type each names. */
  floorNotationLetters: z.record(z.string(), z.string()),
});
export type Snapshot = z.infer<typeof snapshotSchema>;

/**
 * The registry's lists that live beside the bundle, as derive, the parser and
 * the plausibility check read them: the closed unit registry and the
 * floor-notation letters. The loosening check and the writer read the modules'
 * own constants; tests and seeds may pass others.
 */
export interface RegistryLists {
  readonly units: readonly Pick<UnitEntry, 'code' | 'symbol' | 'dimension' | 'written' | 'toBase'>[];
  readonly floorNotationLetters: Readonly<Record<string, string>>;
}

/** The lists as the code holds them today. */
export function currentRegistryLists(): RegistryLists {
  return { units: UNIT_REGISTRY, floorNotationLetters: FLOOR_NOTATION_LEVEL_TYPES };
}

export interface SnapshotMeta {
  name: string;
  status: 'unapproved' | 'approved';
  version: number;
  guardrailsVersion: string;
  recordedOn: string;
  approvalRef: string;
  note?: string;
}

export function parseSnapshot(text: string, path: string): Snapshot {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path}: not valid JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  const parsed = snapshotSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`);
    throw new Error(`${path}: not a valid snapshot: ${issues.join('; ')}`);
  }
  return parsed.data;
}

function projectField(field: RegistryFieldDefinition, formulas: readonly FormulaSignature[]): FieldSnapshot {
  return {
    estimation: field.estimation,
    estimatedMethod: field.estimatedMethod ?? null,
    tolerance:
      field.tolerance === undefined
        ? null
        : { absolute: field.tolerance.absolute ?? null, relative: field.tolerance.relative ?? null, reason: field.tolerance.reason },
    plausible: field.plausible === undefined ? null : { low: field.plausible.low, high: field.plausible.high, basis: field.plausible.basis },
    criticality: field.criticality,
    requiredSlot: field.requiredSlot ?? null,
    firstEstimateSlot: field.firstEstimateSlot ?? null,
    confirmBy: field.confirmBy,
    confirmByBasis: field.confirmByBasis ?? null,
    identity: field.identity === true,
    referenceDatasets: [...(field.referenceDatasets ?? [])].sort(),
    impactRank: field.impactRank,
    minorForTotals: field.minorForTotals === true,
    qualifierRequired: field.qualifierRequired === true,
    kind: field.kind,
    unit: field.unit ?? null,
    dimension: field.dimension ?? null,
    qualifiers: [...(field.qualifiers ?? [])].sort(),
    options: [...(field.options ?? [])].sort(),
    valueShape: field.valueShape ?? null,
    formulas: formulasWritingField(formulas, field.key),
  };
}

function projectFormula(formula: FormulaSignature): FormulaSnapshot {
  return {
    inputs: [...formula.inputs].sort(),
    outputs: [...formula.outputs].sort(),
    unknownPolicy: formula.unknownPolicy ?? 'refuse',
    estimated: formula.estimated === true,
  };
}

function projectUnit(unit: RegistryLists['units'][number]): UnitSnapshot {
  return { symbol: unit.symbol, dimension: unit.dimension, written: [...unit.written].sort(), toBase: unit.toBase ?? null };
}

function projectGate(gate: GateDefinition): GateSnapshot {
  return {
    open: gate.open,
    waitsFor: gate.waitsFor.map((item) => ({ item: item.item, kind: item.kind, dId: item.dId, dataset: item.dataset ?? null })),
    closedBehaviour: gate.closedBehaviour,
  };
}

/** The loosening-sensitive properties of a registry, its gates and its lists, in a stable order. */
export function projectSnapshot(
  registry: RegistryBundle,
  gates: readonly GateDefinition[],
  meta: SnapshotMeta,
  lists: RegistryLists = currentRegistryLists(),
): Snapshot {
  const fields = [...registry.fields].sort((left, right) => left.key.localeCompare(right.key));
  const byRank = [...registry.fields].sort((left, right) => left.impactRank - right.impactRank || left.key.localeCompare(right.key));
  const { settings } = registry;
  return {
    name: meta.name,
    status: meta.status,
    version: meta.version,
    guardrailsVersion: meta.guardrailsVersion,
    recordedOn: meta.recordedOn,
    approvalRef: meta.approvalRef,
    ...(meta.note === undefined ? {} : { note: meta.note }),
    settings: {
      confirmationBudget: settings.confirmationBudget.value,
      calibrationThreshold: {
        correctionRatePercent: settings.calibrationThreshold.correctionRatePercent,
        window: settings.calibrationThreshold.window,
      },
      firstEstimateSet: [...settings.firstEstimateSet.members],
      requiredSet: [...settings.requiredSet.members],
      identityList: [...settings.identityList.members],
      documentStageOrder: settings.documentStageOrder.tiers.map((tier) => [...tier]),
    },
    fields: Object.fromEntries(fields.map((field) => [field.key, projectField(field, registry.formulas)])),
    impactRankOrder: byRank.map((field) => field.key),
    gates: Object.fromEntries([...gates].sort((left, right) => left.id.localeCompare(right.id)).map((gate) => [gate.id, projectGate(gate)])),
    formulas: Object.fromEntries(
      registry.formulas
        .map((formula): [string, FormulaSnapshot] => [formulaRef(formula), projectFormula(formula)])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    datasets: registry.datasets.map((dataset) => `${dataset.id}@${dataset.version}`).sort(),
    units: Object.fromEntries(
      [...lists.units].sort((left, right) => left.code.localeCompare(right.code)).map((unit) => [unit.code, projectUnit(unit)]),
    ),
    floorNotationLetters: Object.fromEntries(
      Object.entries(lists.floorNotationLetters).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

/** The snapshot as written to disk: stable JSON ending in a newline. */
export function renderSnapshot(snapshot: Snapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export type DifferenceTarget =
  | { type: 'field'; key: string; property: SensitiveFieldProperty | 'removed' | 'added' }
  | { type: 'order' }
  | { type: 'setting'; name: SettingName }
  | { type: 'gate'; id: string; property: 'open' | 'removed' | 'added' | 'waitsFor' | 'closedBehaviour' }
  | { type: 'formula'; ref: string; property: 'added' | 'removed' | 'changed' }
  | { type: 'dataset'; id: string; property: 'added' | 'removed' }
  | { type: 'unit'; code: string; property: 'added' | 'removed' | 'symbol' | 'dimension' | 'written' | 'toBase' }
  | { type: 'floorNotationLetter'; letter: string; property: 'added' | 'removed' | 'levelType' };

export interface SnapshotDifference {
  /** A loosening in section 10's sense (a change whose direction is unclear counts as one), a tightening, or a new entry. */
  kind: 'loosening' | 'tightening' | 'added';
  path: string;
  message: string;
  target: DifferenceTarget;
}

const CRITICALITY_RANK: Record<FieldSnapshot['criticality'], number> = {
  optional: 0,
  for_quotation: 1,
  first_estimate: 2,
  required: 3,
};

/** Whether bound `after` lets through more than bound `before`; a missing bound lets nothing through. */
function wider(after: number | null, before: number | null): boolean {
  if (after === null) return false;
  if (before === null) return after > 0;
  return after > before;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareFields(key: string, before: FieldSnapshot, after: FieldSnapshot, out: SnapshotDifference[]): void {
  const push = (kind: SnapshotDifference['kind'], property: SensitiveFieldProperty, message: string): void => {
    out.push({ kind, path: `fields.${key}.${property}`, message, target: { type: 'field', key, property } });
  };

  if (before.estimation !== after.estimation) {
    push(after.estimation === 'allowed' ? 'loosening' : 'tightening', 'estimation', `estimation ${before.estimation} → ${after.estimation}`);
  } else if (after.estimation === 'allowed' && before.estimatedMethod !== after.estimatedMethod) {
    push('loosening', 'estimatedMethod', `estimated method ${String(before.estimatedMethod)} → ${String(after.estimatedMethod)}`);
  }

  if (!same(before.tolerance, after.tolerance)) {
    const b = before.tolerance;
    const a = after.tolerance;
    let kind: SnapshotDifference['kind'] = 'loosening';
    if (a === null) kind = 'tightening';
    else if (b !== null && !wider(a.absolute, b.absolute) && !wider(a.relative, b.relative)) {
      kind = wider(b.absolute, a.absolute) || wider(b.relative, a.relative) ? 'tightening' : 'loosening';
    }
    push(kind, 'tolerance', `tolerance ${JSON.stringify(b)} → ${JSON.stringify(a)}`);
  }

  if (!same(before.plausible, after.plausible)) {
    const b = before.plausible;
    const a = after.plausible;
    let kind: SnapshotDifference['kind'] = 'loosening';
    if (b === null) kind = 'tightening';
    else if (a !== null && a.low >= b.low && a.high <= b.high && a.basis === b.basis) kind = 'tightening';
    push(kind, 'plausible', `plausible range ${JSON.stringify(b)} → ${JSON.stringify(a)}`);
  }

  if (before.criticality !== after.criticality) {
    push(
      CRITICALITY_RANK[after.criticality] < CRITICALITY_RANK[before.criticality] ? 'loosening' : 'tightening',
      'criticality',
      `criticality ${before.criticality} → ${after.criticality}`,
    );
  }
  for (const property of ['requiredSlot', 'firstEstimateSlot'] as const) {
    if (before[property] !== after[property]) {
      push(before[property] === null ? 'tightening' : 'loosening', property, `${property} ${String(before[property])} → ${String(after[property])}`);
    }
  }

  if (before.confirmBy !== after.confirmBy) {
    const tighter = after.confirmBy === 'engineer' || (before.confirmBy === 'either' && after.confirmBy === 'owner');
    push(tighter ? 'tightening' : 'loosening', 'confirmBy', `confirmBy ${before.confirmBy} → ${after.confirmBy}`);
  }
  if (before.confirmByBasis !== after.confirmByBasis) {
    const basis = `confirmBy basis ${String(before.confirmByBasis)} → ${String(after.confirmByBasis)}`;
    if (before.confirmByBasis === 'owner_choice') {
      // Phase 1 review, round 3: an owner's own choice turned into anything else, even an engineer's
      // fact, lets a document or an inference set what the owner chose (rule 3, "Choices belong to the owner").
      push('loosening', 'confirmByBasis', `${basis}: the field is no longer the owner's own choice (rule 3, "Choices belong to the owner")`);
    } else if (before.confirmBy === after.confirmBy) {
      // A basis that moves with confirmBy is that change's (reported above); on its own it is a loosening
      // unless the field is an engineer's.
      push(after.confirmBy === 'engineer' ? 'tightening' : 'loosening', 'confirmByBasis', basis);
    }
  }

  if (before.identity !== after.identity) {
    push(after.identity ? 'loosening' : 'tightening', 'identity', `identity ${String(before.identity)} → ${String(after.identity)}`);
  }

  if (!same(before.referenceDatasets, after.referenceDatasets)) {
    const added = after.referenceDatasets.filter((id) => !before.referenceDatasets.includes(id));
    push(
      added.length > 0 ? 'loosening' : 'tightening',
      'referenceDatasets',
      `reference datasets [${before.referenceDatasets.join(', ')}] → [${after.referenceDatasets.join(', ')}]`,
    );
  }

  if (before.minorForTotals !== after.minorForTotals) {
    push(after.minorForTotals ? 'loosening' : 'tightening', 'minorForTotals', `minorForTotals ${String(before.minorForTotals)} → ${String(after.minorForTotals)}`);
  }
  if (before.qualifierRequired !== after.qualifierRequired) {
    push(
      after.qualifierRequired ? 'tightening' : 'loosening',
      'qualifierRequired',
      `qualifierRequired ${String(before.qualifierRequired)} → ${String(after.qualifierRequired)}`,
    );
  }

  // The field's allow lists (phase 1 review, round 3, adversarial finding 4).
  if (before.kind !== after.kind) {
    push(
      'loosening',
      'kind',
      before.kind === 'decision'
        ? `kind decision → ${after.kind}: away from an owner decision, so a document or an inference may set it (rule 3, "Choices belong to the owner")`
        : `kind ${before.kind} → ${after.kind} (the kind decides the conflict test and what derive refuses; when unsure, a loosening)`,
    );
  }
  if (before.unit !== after.unit) {
    push(after.unit === null ? 'tightening' : 'loosening', 'unit', `unit ${String(before.unit)} → ${String(after.unit)} (the dimension check reads it, 2.7)`);
  }
  if (before.dimension !== after.dimension) {
    push(
      before.dimension === null ? 'tightening' : 'loosening',
      'dimension',
      `dimension ${String(before.dimension)} → ${String(after.dimension)} (the dimension check reads it, 2.7)`,
    );
  }
  listDifference('qualifiers', before.qualifiers, after.qualifiers, 'rule 8; G8-14: a stated qualifier outside the list is refused', push);
  listDifference('options', before.options, after.options, 'an enum or decision takes only its options', push);
  if (before.valueShape !== after.valueShape) {
    push(
      after.valueShape === null || (before.valueShape !== null && before.valueShape !== after.valueShape) ? 'loosening' : 'tightening',
      'valueShape',
      `value shape ${String(before.valueShape)} → ${String(after.valueShape)}`,
    );
  }
  listDifference('formulas', before.formulas, after.formulas, '2.1: calculated and estimated values come from the formulas that write the field', push);
}

/** An allow list of a field: an entry added lets more values through (a loosening); only removed ones, a tightening. */
function listDifference(
  property: 'qualifiers' | 'options' | 'formulas',
  before: readonly string[],
  after: readonly string[],
  why: string,
  push: (kind: SnapshotDifference['kind'], property: SensitiveFieldProperty, message: string) => void,
): void {
  if (same(before, after)) return;
  const added = after.filter((entry) => !before.includes(entry));
  const removed = before.filter((entry) => !after.includes(entry));
  const change = [added.length > 0 ? `added ${added.join(', ')}` : '', removed.length > 0 ? `removed ${removed.join(', ')}` : ''].filter((part) => part !== '').join('; ');
  push(
    added.length > 0 || removed.length === 0 ? 'loosening' : 'tightening',
    property,
    `${property} [${before.join(', ')}] → [${after.join(', ')}] (${change}; ${why})`,
  );
}

function membersDiff(
  name: SettingName,
  before: readonly string[],
  after: readonly string[],
  looserWhen: 'removed' | 'added',
  out: SnapshotDifference[],
): void {
  if (same(before, after)) return;
  const removed = before.some((member) => !after.includes(member));
  const added = after.some((member) => !before.includes(member));
  const loosening = looserWhen === 'removed' ? removed : added;
  const kind: SnapshotDifference['kind'] = loosening || (!removed && !added) ? 'loosening' : 'tightening';
  out.push({ kind, path: `settings.${name}`, message: `${name} [${before.join(', ')}] → [${after.join(', ')}]`, target: { type: 'setting', name } });
}

function compareSettings(before: SettingsSnapshot, after: SettingsSnapshot, out: SnapshotDifference[]): void {
  if (before.confirmationBudget !== after.confirmationBudget) {
    out.push({
      kind: after.confirmationBudget > before.confirmationBudget ? 'loosening' : 'tightening',
      path: 'settings.confirmationBudget',
      message: `confirmation budget ${before.confirmationBudget} → ${after.confirmationBudget}`,
      target: { type: 'setting', name: 'confirmationBudget' },
    });
  }
  if (!same(before.calibrationThreshold, after.calibrationThreshold)) {
    out.push({
      kind: 'loosening',
      path: 'settings.calibrationThreshold',
      message: `calibration threshold ${JSON.stringify(before.calibrationThreshold)} → ${JSON.stringify(after.calibrationThreshold)} (section 10 names a lowered threshold as a loosening; any change counts)`,
      target: { type: 'setting', name: 'calibrationThreshold' },
    });
  }
  membersDiff('firstEstimateSet', before.firstEstimateSet, after.firstEstimateSet, 'removed', out);
  membersDiff('requiredSet', before.requiredSet, after.requiredSet, 'removed', out);
  membersDiff('identityList', before.identityList, after.identityList, 'added', out);
  if (!same(before.documentStageOrder, after.documentStageOrder)) {
    out.push({
      kind: 'loosening',
      path: 'settings.documentStageOrder',
      message: 'document-stage order changed',
      target: { type: 'setting', name: 'documentStageOrder' },
    });
  }
}

function compareGates(id: string, before: GateSnapshot, after: GateSnapshot, out: SnapshotDifference[]): void {
  if (before.open !== after.open) {
    out.push({
      kind: after.open ? 'loosening' : 'tightening',
      path: `gates.${id}.open`,
      message: after.open ? `the gate ${id} is open` : `the gate ${id} is closed`,
      target: { type: 'gate', id, property: 'open' },
    });
  }
  const keyOf = (item: GateSnapshot['waitsFor'][number]): string => `${item.kind}:${item.item}`;
  const beforeItems = new Map(before.waitsFor.map((item) => [keyOf(item), item]));
  const afterItems = new Map(after.waitsFor.map((item) => [keyOf(item), item]));
  const removed = [...beforeItems.keys()].filter((key) => !afterItems.has(key));
  const added = [...afterItems.keys()].filter((key) => !beforeItems.has(key));
  const changed = [...beforeItems.keys()].filter((key) => afterItems.has(key) && !same(beforeItems.get(key), afterItems.get(key)));
  if (removed.length > 0 || changed.length > 0) {
    out.push({
      kind: 'loosening',
      path: `gates.${id}.waitsFor`,
      message: `the gate ${id} no longer waits for the same items (removed: ${removed.join(', ') || 'none'}; changed: ${changed.join(', ') || 'none'})`,
      target: { type: 'gate', id, property: 'waitsFor' },
    });
  } else if (added.length > 0) {
    out.push({
      kind: 'tightening',
      path: `gates.${id}.waitsFor`,
      message: `the gate ${id} also waits for ${added.join(', ')}`,
      target: { type: 'gate', id, property: 'waitsFor' },
    });
  }
  if (before.closedBehaviour !== after.closedBehaviour) {
    out.push({
      kind: 'loosening',
      path: `gates.${id}.closedBehaviour`,
      message: `the behaviour of ${id} while closed changed (any change counts as a loosening: section 10, "When unsure")`,
      target: { type: 'gate', id, property: 'closedBehaviour' },
    });
  }
}

/**
 * Declared formula signatures. A new one is added, as a new field is: the writer records it after
 * registry validation, and a formula that writes an existing field is that field's loosening
 * (`formulas`). A changed signature is a loosening: "Formula versions are immutable" (2.4), so a
 * change is a new version. A removed one is a tightening (candidates naming it are refused).
 */
function compareFormulas(base: Snapshot['formulas'], current: Snapshot['formulas'], out: SnapshotDifference[]): void {
  for (const ref of [...new Set([...Object.keys(base), ...Object.keys(current)])].sort()) {
    const before = base[ref];
    const after = current[ref];
    if (before === undefined) {
      out.push({ kind: 'added', path: `formulas.${ref}`, message: `the formula signature ${ref} is new`, target: { type: 'formula', ref, property: 'added' } });
    } else if (after === undefined) {
      out.push({
        kind: 'tightening',
        path: `formulas.${ref}`,
        message: `the formula signature ${ref} was removed (a value naming it is refused)`,
        target: { type: 'formula', ref, property: 'removed' },
      });
    } else if (!same(before, after)) {
      out.push({
        kind: 'loosening',
        path: `formulas.${ref}`,
        message: `the formula signature ${ref} changed from ${JSON.stringify(before)} to ${JSON.stringify(after)} (2.4: "Formula versions are immutable"; a change is a new version)`,
        target: { type: 'formula', ref, property: 'changed' },
      });
    }
  }
}

/** Declared datasets: a declaration alone lets nothing through (G1-12 needs an approval record, and a field lists it). */
function compareDatasets(base: readonly string[], current: readonly string[], out: SnapshotDifference[]): void {
  for (const id of current.filter((entry) => !base.includes(entry))) {
    out.push({ kind: 'added', path: `datasets.${id}`, message: `the dataset ${id} is newly declared`, target: { type: 'dataset', id, property: 'added' } });
  }
  for (const id of base.filter((entry) => !current.includes(entry))) {
    out.push({ kind: 'tightening', path: `datasets.${id}`, message: `the dataset ${id} is no longer declared`, target: { type: 'dataset', id, property: 'removed' } });
  }
}

/**
 * The closed unit registry (2.7; ADR 0017, "How to reverse": "Merging dimensions, adding written
 * forms or accepting an ambiguous form lets more values through, so each is a loosening"). A new
 * unit, a written form added, a changed dimension, symbol or factor, or a factor where none was,
 * is a loosening; a unit, a form or a factor removed is a tightening.
 */
function compareUnits(base: Snapshot['units'], current: Snapshot['units'], out: SnapshotDifference[]): void {
  for (const code of [...new Set([...Object.keys(base), ...Object.keys(current)])].sort()) {
    const before = base[code];
    const after = current[code];
    const push = (kind: SnapshotDifference['kind'], property: Extract<DifferenceTarget, { type: 'unit' }>['property'], message: string): void => {
      out.push({ kind, path: `units.${code}${property === 'added' || property === 'removed' ? '' : `.${property}`}`, message, target: { type: 'unit', code, property } });
    };
    if (before === undefined) {
      push('loosening', 'added', `the unit ${code} (${after?.dimension ?? '?'}) is new in the closed registry: values in it now pass (2.7)`);
      continue;
    }
    if (after === undefined) {
      push('tightening', 'removed', `the unit ${code} was removed from the closed registry`);
      continue;
    }
    if (before.dimension !== after.dimension) {
      push('loosening', 'dimension', `the unit ${code} moved from dimension ${before.dimension} to ${after.dimension} (a merged dimension lets values pass the dimension check into fields they do not measure; ADR 0017)`);
    }
    if (before.symbol !== after.symbol) push('loosening', 'symbol', `the symbol of ${code} changed from ${before.symbol} to ${after.symbol} (when unsure, a loosening)`);
    const added = after.written.filter((form) => !before.written.includes(form));
    const removed = before.written.filter((form) => !after.written.includes(form));
    if (added.length > 0 || removed.length > 0) {
      push(
        added.length > 0 ? 'loosening' : 'tightening',
        'written',
        `the written forms of ${code}: ${[added.length > 0 ? `added ${added.join(', ')}` : '', removed.length > 0 ? `removed ${removed.join(', ')}` : ''].filter((part) => part !== '').join('; ')}` +
          (added.length > 0 ? ' (a new written form maps more text to a unit; ADR 0017)' : ''),
      );
    }
    if (before.toBase !== after.toBase) {
      push(after.toBase === null ? 'tightening' : 'loosening', 'toBase', `the factor of ${code} changed from ${String(before.toBase)} to ${String(after.toBase)}`);
    }
  }
}

/** The floor-notation letters (rule 8, "Floors" and "Abbreviations": expanded only from the glossary; ADR 0017, decision 5). */
function compareFloorLetters(base: Snapshot['floorNotationLetters'], current: Snapshot['floorNotationLetters'], out: SnapshotDifference[]): void {
  for (const letter of [...new Set([...Object.keys(base), ...Object.keys(current)])].sort()) {
    const before = base[letter];
    const after = current[letter];
    const path = `floorNotationLetters.${letter}`;
    if (before === undefined) {
      out.push({
        kind: 'loosening',
        path,
        message: `the floor-notation letter ${letter} (${after ?? '?'}) is new: an abbreviation expanded outside the glossary (rule 8, "Abbreviations"; ADR 0017)`,
        target: { type: 'floorNotationLetter', letter, property: 'added' },
      });
    } else if (after === undefined) {
      out.push({ kind: 'tightening', path, message: `the floor-notation letter ${letter} is no longer read`, target: { type: 'floorNotationLetter', letter, property: 'removed' } });
    } else if (before !== after) {
      out.push({
        kind: 'loosening',
        path,
        message: `the floor-notation letter ${letter} now names ${after}, not ${before}`,
        target: { type: 'floorNotationLetter', letter, property: 'levelType' },
      });
    }
  }
}

/** Every difference between two snapshots, classified in section 10's sense. */
export function compareSnapshots(base: Snapshot, current: Snapshot): SnapshotDifference[] {
  const out: SnapshotDifference[] = [];
  const keys = [...new Set([...Object.keys(base.fields), ...Object.keys(current.fields)])].sort();
  for (const key of keys) {
    const before = base.fields[key];
    const after = current.fields[key];
    if (before === undefined) {
      out.push({ kind: 'added', path: `fields.${key}`, message: `the field ${key} is new`, target: { type: 'field', key, property: 'added' } });
    } else if (after === undefined) {
      out.push({ kind: 'loosening', path: `fields.${key}`, message: `the field ${key} was removed`, target: { type: 'field', key, property: 'removed' } });
    } else {
      compareFields(key, before, after, out);
    }
  }
  const common = (order: readonly string[], other: Snapshot): string[] => order.filter((key) => key in other.fields);
  if (!same(common(base.impactRankOrder, current), common(current.impactRankOrder, base))) {
    out.push({
      kind: 'loosening',
      path: 'impactRankOrder',
      message: 'the impactRank order of existing fields changed (it decides which confirmations fit the budget)',
      target: { type: 'order' },
    });
  }
  compareSettings(base.settings, current.settings, out);
  const gateIds = [...new Set([...Object.keys(base.gates), ...Object.keys(current.gates)])].sort();
  for (const id of gateIds) {
    const before = base.gates[id];
    const after = current.gates[id];
    if (before === undefined) {
      out.push({ kind: 'added', path: `gates.${id}`, message: `the gate ${id} is new`, target: { type: 'gate', id, property: 'added' } });
    } else if (after === undefined) {
      out.push({ kind: 'loosening', path: `gates.${id}`, message: `the gate ${id} was removed`, target: { type: 'gate', id, property: 'removed' } });
    } else {
      compareGates(id, before, after, out);
    }
  }
  compareFormulas(base.formulas, current.formulas, out);
  compareDatasets(base.datasets, current.datasets, out);
  compareUnits(base.units, current.units, out);
  compareFloorLetters(base.floorNotationLetters, current.floorNotationLetters, out);
  return out;
}

/**
 * What the unapproved baseline may hold (prompt 3 5.2, "Registry values"):
 * the strictest values, never an invented one. Anything else in it needs an
 * approved snapshot instead.
 */
export function baselinePolicyProblems(snapshot: Snapshot): string[] {
  const problems: string[] = [];
  const at = (path: string, message: string): void => {
    problems.push(`${BASELINE_NAME}: ${path}: ${message}`);
  };
  if (snapshot.name !== BASELINE_NAME) at('name', `the baseline must be named "${BASELINE_NAME}"`);
  if (snapshot.status !== 'unapproved') at('status', 'the baseline is unapproved: no approver is named, so nothing in it is approved');
  if (snapshot.version !== 0) at('version', 'the unapproved baseline is version 0');
  if (snapshot.approvalRef !== '') at('approvalRef', 'the unapproved baseline carries no approval reference');

  const proposed = PROPOSED_SETTINGS;
  const expected: SettingsSnapshot = {
    confirmationBudget: proposed.confirmationBudget.value,
    calibrationThreshold: { correctionRatePercent: proposed.calibrationThreshold.correctionRatePercent, window: proposed.calibrationThreshold.window },
    firstEstimateSet: [...proposed.firstEstimateSet.members],
    requiredSet: [...proposed.requiredSet.members],
    identityList: [...proposed.identityList.members],
    documentStageOrder: proposed.documentStageOrder.tiers.map((tier) => [...tier]),
  };
  for (const name of Object.keys(expected) as SettingName[]) {
    if (!same(snapshot.settings[name], expected[name])) {
      at(`settings.${name}`, `differs from the value the guardrails state (${JSON.stringify(expected[name])}); only an approved snapshot may hold another`);
    }
  }

  const requiredMembers: readonly string[] = snapshot.settings.requiredSet;
  const firstEstimateMembers: readonly string[] = snapshot.settings.firstEstimateSet;
  const identityMembers: readonly string[] = IDENTITY_SLOTS;
  for (const [key, field] of Object.entries(snapshot.fields)) {
    const path = `fields.${key}`;
    if (field.tolerance !== null) at(`${path}.tolerance`, 'a tolerance; no field has one until the approver approves it (rule 4; D-93)');
    if (field.plausible !== null) at(`${path}.plausible`, 'a plausible range; the plausibility check waits for SOVITECH ranges (rule 8; D-93)');
    if (field.estimation === 'allowed' && field.estimatedMethod === null) {
      at(`${path}.estimation`, 'estimation allowed with no estimated method named by the guardrails');
    }
    if (field.referenceDatasets.length > 0) at(`${path}.referenceDatasets`, 'a reference dataset; no dataset has an approval record (G1-12; D-92)');
    if (field.minorForTotals) at(`${path}.minorForTotals`, 'minorForTotals set; which items are minor needs approval (rule 1)');
    if (field.confirmBy !== 'engineer' && field.confirmByBasis === null) {
      at(`${path}.confirmBy`, `confirmBy ${field.confirmBy} with no owner fact of rule 3; the default is engineer`);
    }
    if (field.criticality === 'required' && (field.requiredSlot === null || !requiredMembers.includes(field.requiredSlot))) {
      at(`${path}.criticality`, 'criticality required outside the closed list of rule 7');
    }
    if (field.requiredSlot !== null && field.criticality !== 'required') at(`${path}.requiredSlot`, 'a required slot on a field that is not required');
    if (field.criticality === 'first_estimate' && (field.firstEstimateSlot === null || !firstEstimateMembers.includes(field.firstEstimateSlot))) {
      at(`${path}.criticality`, 'criticality first_estimate outside the proposed first-estimate set of rule 7');
    }
    if (field.firstEstimateSlot !== null && field.criticality !== 'first_estimate') {
      at(`${path}.firstEstimateSlot`, 'a first-estimate slot on a field that is not first_estimate');
    }
    if (field.identity && (field.requiredSlot === null || !identityMembers.includes(field.requiredSlot))) {
      at(`${path}.identity`, 'an identity field outside the closed list of rule 6 (the project name only)');
    }
    if ((field.kind === 'decision' || field.confirmByBasis === 'owner_choice') && field.confirmBy !== 'owner') {
      at(`${path}.confirmBy`, `confirmBy ${field.confirmBy} on an owner's own choice; choices belong to the owner (rule 3)`);
    }
    if (field.kind === 'count' && field.valueShape !== 'non_negative_integer') {
      at(`${path}.valueShape`, 'a count with no whole-number shape declared (2.6 kind count; rule 8)');
    }
  }
  const byRank = Object.entries(snapshot.fields)
    .sort(([leftKey, left], [rightKey, right]) => left.impactRank - right.impactRank || leftKey.localeCompare(rightKey))
    .map(([key]) => key);
  if (!same(byRank, snapshot.impactRankOrder)) at('impactRankOrder', 'does not list the fields in impactRank order');

  for (const [id, gate] of Object.entries(snapshot.gates)) {
    if (gate.open) at(`gates.${id}.open`, `the gate ${id} is open; every gate starts closed (prompt 3 5.4)`);
  }
  return problems;
}
