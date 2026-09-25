/**
 * The loosening snapshot (docs/guardrails.md section 10, "Versioning": "CI
 * compares the loosening-sensitive registry properties with the last
 * approved snapshot"; prompt 3 5.2 "Registry values" and 5.4).
 *
 * A snapshot holds, per field: estimation and its method, tolerance,
 * plausible range, criticality and its slot, confirmBy and its rule 3 basis,
 * identity, reference datasets, impactRank, minorForTotals and
 * qualifierRequired; the impactRank order; the approver settings (confirmation
 * budget, calibration threshold, first-estimate set, required list, identity
 * list, document-stage order); and every gate with what it waits for.
 *
 * While no approver is named there is no approved snapshot. The first one is
 * "unapproved baseline v0": it may hold only the strictest values
 * (baselinePolicyProblems), and it is the base the check compares with.
 */
import { z } from 'zod';
import { WAIT_KINDS, type GateDefinition } from '../gates/schema';
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
import { CONFIRM_BY, CRITICALITIES, type FieldDefinition, type RegistryBundle, type SensitiveFieldProperty } from './schema';

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
});
export type FieldSnapshot = z.infer<typeof fieldSnapshotSchema>;

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
});
export type Snapshot = z.infer<typeof snapshotSchema>;

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

function projectField(field: FieldDefinition): FieldSnapshot {
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
  };
}

function projectGate(gate: GateDefinition): GateSnapshot {
  return {
    open: gate.open,
    waitsFor: gate.waitsFor.map((item) => ({ item: item.item, kind: item.kind, dId: item.dId, dataset: item.dataset ?? null })),
    closedBehaviour: gate.closedBehaviour,
  };
}

/** The loosening-sensitive properties of a registry and its gates, in a stable order. */
export function projectSnapshot(registry: RegistryBundle, gates: readonly GateDefinition[], meta: SnapshotMeta): Snapshot {
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
    fields: Object.fromEntries(fields.map((field) => [field.key, projectField(field)])),
    impactRankOrder: byRank.map((field) => field.key),
    gates: Object.fromEntries([...gates].sort((left, right) => left.id.localeCompare(right.id)).map((gate) => [gate.id, projectGate(gate)])),
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
  | { type: 'gate'; id: string; property: 'open' | 'removed' | 'added' | 'waitsFor' | 'closedBehaviour' };

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
  } else if (after.confirmBy !== 'engineer' && before.confirmByBasis !== after.confirmByBasis) {
    push('loosening', 'confirmByBasis', `confirmBy basis ${String(before.confirmByBasis)} → ${String(after.confirmByBasis)}`);
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
