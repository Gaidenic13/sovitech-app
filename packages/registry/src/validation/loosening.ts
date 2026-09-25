/**
 * The loosening check (docs/guardrails.md section 10, "Versioning": "It fails
 * on any loosening without an approval record"; prompt 3 5.4 for gates).
 *
 * The comparison base is the last approved snapshot whose approval reference
 * resolves. While no approver is named there is none, and the base is
 * "unapproved baseline v0". Against that base the check fails on any
 * loosening and on any value the baseline does not hold, because no value
 * has an approval yet; each baseline value is listed as waiting for approval.
 * It also fails when:
 * - the baseline holds a value the strict policy does not allow;
 * - the closed lists in code no longer match docs/guardrails.md;
 * - a gate is open without approval, or any approval reference does not resolve;
 * - a field takes reference data from a dataset with no approval record (G1-12).
 */
import { resolveApprovalRef, type ApprovalContext } from '../approvals';
import type { GateDefinition } from '../gates/schema';
import { verifyGates } from '../gates/verify';
import { SETTING_MENTIONS, SETTING_NAMES, policyAnchorProblems, type SettingName } from './policy';
import { SENSITIVE_FIELD_PROPERTIES, type RegistryBundle } from './schema';
import {
  BASELINE_NAME,
  baselinePolicyProblems,
  compareSnapshots,
  currentRegistryLists,
  projectSnapshot,
  type RegistryLists,
  type Snapshot,
  type SnapshotDifference,
} from './snapshot';

export interface LooseningInputs {
  /** The current registry, already parsed by its schema. */
  registry: RegistryBundle;
  gates: readonly GateDefinition[];
  /** "unapproved baseline v0". */
  baseline: Snapshot;
  /** Snapshots whose status is approved, if any. */
  approvedSnapshots: readonly Snapshot[];
  approvals: ApprovalContext;
  /** docs/guardrails.md, for the policy anchors. */
  ruleText: string;
  /**
   * The unit registry and the floor-notation letters as the code holds them
   * (currentRegistryLists() when absent); seeds and tests pass edited ones.
   */
  registryLists?: RegistryLists;
}

export interface LooseningReport {
  ok: boolean;
  /** The name of the snapshot compared with. */
  base: string;
  problems: string[];
  /** Loosenings whose approval reference resolves. */
  approvedLoosenings: string[];
  /** Tightenings and additions against an approved snapshot: reported, not failed. */
  tightenings: string[];
  /** Every value that waits for approval, for the build log's "Waiting for approval" list. */
  waiting: string[];
}

const WRITER = 'tsx tools/checks/loosening/write-baseline.ts';

function settingLine(registry: RegistryBundle, name: SettingName): string {
  const { settings } = registry;
  const status = (value: { status: string; source: string }): string => `(${value.status}); ${value.source}`;
  switch (name) {
    case 'confirmationBudget':
      return `confirmation budget: ${settings.confirmationBudget.value} ${status(settings.confirmationBudget)}`;
    case 'calibrationThreshold':
      return `calibration threshold: ${settings.calibrationThreshold.correctionRatePercent}% over the last ${settings.calibrationThreshold.window} decisions ${status(settings.calibrationThreshold)}`;
    case 'firstEstimateSet':
      return `first-estimate set: ${settings.firstEstimateSet.members.join(', ')} ${status(settings.firstEstimateSet)}`;
    case 'requiredSet':
      return `required fields: ${settings.requiredSet.members.join(', ')} ${status(settings.requiredSet)}`;
    case 'identityList':
      return `identity list: ${settings.identityList.members.join(', ')} ${status(settings.identityList)}`;
    case 'documentStageOrder':
      return `document-stage order: ${settings.documentStageOrder.tiers.map((tier) => tier.join('/')).join(' > ')} ${status(settings.documentStageOrder)}`;
  }
}

function waitingList(registry: RegistryBundle, gates: readonly GateDefinition[], current: Snapshot): string[] {
  const lines: string[] = [];
  for (const name of SETTING_NAMES) {
    const setting = registry.settings[name];
    if (setting.status !== 'approved') lines.push(`setting ${settingLine(registry, name)}`);
  }
  const list = (entries: readonly string[]): string => (entries.length === 0 ? 'none' : entries.join(', '));
  for (const [key, field] of Object.entries(current.fields)) {
    lines.push(
      `field ${key}: kind ${field.kind}${field.unit === null ? '' : `; unit ${field.unit}`}${field.dimension === null ? '' : ` (${field.dimension})`}` +
        `; criticality ${field.criticality}${field.requiredSlot === null ? '' : ` (${field.requiredSlot})`}` +
        `${field.firstEstimateSlot === null ? '' : ` (${field.firstEstimateSlot})`}; estimation ${field.estimation}` +
        `${field.estimatedMethod === null ? '' : ` (${field.estimatedMethod})`}; confirmBy ${field.confirmBy}` +
        `${field.confirmByBasis === null ? '' : ` (${field.confirmByBasis})`}; tolerance ${field.tolerance === null ? 'none' : JSON.stringify(field.tolerance)}` +
        `; plausible ${field.plausible === null ? 'none' : JSON.stringify(field.plausible)}; identity ${field.identity ? 'yes' : 'no'}` +
        `; reference datasets ${list(field.referenceDatasets)}` +
        `; minorForTotals ${field.minorForTotals ? 'yes' : 'no'}; impactRank ${field.impactRank}` +
        `; qualifiers ${list(field.qualifiers)}; options ${list(field.options)}` +
        `${field.valueShape === null ? '' : `; value shape ${field.valueShape}`}; formulas writing it ${list(field.formulas)}`,
    );
  }
  if (current.impactRankOrder.length > 0) lines.push(`impactRank order: ${current.impactRankOrder.join(', ')}`);
  for (const [ref, formula] of Object.entries(current.formulas)) {
    lines.push(
      `formula signature ${ref}: ${formula.estimated ? 'estimated' : 'calculated'}; unknownPolicy ${formula.unknownPolicy}; ` +
        `outputs ${list(formula.outputs)}; ${formula.inputs.length} inputs`,
    );
  }
  const units = Object.entries(current.units);
  if (units.length > 0) {
    lines.push(
      `unit registry (ADR 0017): ${units.length} units in ${new Set(units.map(([, unit]) => unit.dimension)).size} dimensions, ` +
        `${units.flatMap(([, unit]) => unit.written).length} written forms, ${units.filter(([, unit]) => unit.toBase !== null).length} factors`,
    );
  }
  const letters = Object.entries(current.floorNotationLetters);
  if (letters.length > 0) lines.push(`floor-notation letters (ADR 0017, decision 5): ${letters.map(([letter, level]) => `${letter} ${level}`).join(', ')}`);
  for (const dataset of registry.datasets) {
    if (dataset.approvalRef === undefined) lines.push(`dataset ${dataset.id}@${dataset.version}: no approval record`);
  }
  for (const gate of gates) {
    lines.push(
      `gate ${gate.id}: ${gate.open ? 'open' : 'closed'}; waits for ${gate.waitsFor.map((item) => `${item.item} (${item.dId})`).join(', ')}`,
    );
  }
  return lines;
}

function refFor(registry: RegistryBundle, difference: SnapshotDifference): { ref: string | undefined; mentions: string[] } | undefined {
  const { target } = difference;
  if (target.type === 'field' && target.property !== 'added' && target.property !== 'removed') {
    const field = registry.fields.find((item) => item.key === target.key);
    return { ref: field?.approvals?.[target.property], mentions: [target.key] };
  }
  if (target.type === 'setting') return { ref: registry.settings[target.name].approvalRef, mentions: SETTING_MENTIONS[target.name] };
  return undefined;
}

export function evaluateLoosening(inputs: LooseningInputs): LooseningReport {
  const { registry, gates, baseline, approvals } = inputs;
  const problems: string[] = [];
  const approvedLoosenings: string[] = [];
  const tightenings: string[] = [];

  problems.push(...approvals.problems);
  problems.push(...policyAnchorProblems(inputs.ruleText));
  problems.push(...baselinePolicyProblems(baseline));

  let base: Snapshot = baseline;
  for (const snapshot of inputs.approvedSnapshots) {
    if (snapshot.status !== 'approved') {
      problems.push(`${snapshot.name}: listed as an approved snapshot, but its status is ${snapshot.status}`);
      continue;
    }
    const resolution = resolveApprovalRef(
      snapshot.approvalRef,
      { kind: 'registry-value', mentions: [`snapshot v${snapshot.version}`, snapshot.name] },
      approvals,
    );
    if (!resolution.ok) {
      problems.push(`${snapshot.name}: its approval reference "${snapshot.approvalRef}" does not resolve: ${resolution.reason}`);
      continue;
    }
    if (base === baseline || snapshot.version > base.version) base = snapshot;
  }
  const againstBaseline = base === baseline;

  const current = projectSnapshot(
    registry,
    gates,
    {
      name: 'current registry',
      status: 'unapproved',
      version: base.version,
      guardrailsVersion: base.guardrailsVersion,
      recordedOn: base.recordedOn,
      approvalRef: '',
    },
    inputs.registryLists ?? currentRegistryLists(),
  );

  const gateProblems = verifyGates(gates, approvals);
  const gatesWithProblems = new Set(gates.filter((gate) => gateProblems.some((line) => line.includes(`gates/${gate.id}.yaml`))).map((gate) => gate.id));
  problems.push(...gateProblems);

  for (const difference of compareSnapshots(base, current)) {
    const label = `${difference.path}: ${difference.message}`;
    if (difference.target.type === 'gate' && difference.target.property === 'open' && difference.kind === 'loosening') {
      // An open gate is approved only through its own references (verifyGates, above).
      if (!gatesWithProblems.has(difference.target.id as GateDefinition['id'])) approvedLoosenings.push(label);
      continue;
    }
    if (difference.kind === 'loosening') {
      const approval = refFor(registry, difference);
      if (approval?.ref === undefined) {
        problems.push(`${label}: a loosening against ${base.name} with no approval reference (docs/guardrails.md section 10)`);
        continue;
      }
      const resolution = resolveApprovalRef(approval.ref, { kind: 'registry-value', mentions: approval.mentions }, approvals);
      if (resolution.ok) approvedLoosenings.push(`${label} (${resolution.reason})`);
      else problems.push(`${label}: a loosening against ${base.name}; its reference "${approval.ref}" does not resolve: ${resolution.reason}`);
      continue;
    }
    if (againstBaseline) {
      problems.push(
        `${label}: ${BASELINE_NAME} does not hold this value, and nothing approves it. If it passes registry validation, record it with \`${WRITER}\` (the writer refuses any loosening)`,
      );
    } else {
      tightenings.push(label);
    }
  }

  // Every approval reference in the registry must resolve, whether or not it is needed today.
  for (const field of registry.fields) {
    for (const property of SENSITIVE_FIELD_PROPERTIES) {
      const ref = field.approvals?.[property];
      if (ref === undefined) continue;
      const resolution = resolveApprovalRef(ref, { kind: 'registry-value', mentions: [field.key] }, approvals);
      if (!resolution.ok) problems.push(`fields.${field.key}.approvals.${property}: the reference "${ref}" does not resolve: ${resolution.reason}`);
    }
  }
  for (const name of SETTING_NAMES) {
    const ref = registry.settings[name].approvalRef;
    if (ref === undefined) continue;
    const resolution = resolveApprovalRef(ref, { kind: 'registry-value', mentions: SETTING_MENTIONS[name] }, approvals);
    if (!resolution.ok) problems.push(`settings.${name}: the reference "${ref}" does not resolve: ${resolution.reason}`);
  }

  // G1-12: reference data only from a dataset with an approval record.
  const datasets = new Map(registry.datasets.map((dataset) => [dataset.id, dataset]));
  for (const field of registry.fields) {
    for (const id of field.referenceDatasets ?? []) {
      const dataset = datasets.get(id);
      const resolution =
        dataset?.approvalRef === undefined
          ? { ok: false, reason: 'it carries no approval reference' }
          : resolveApprovalRef(dataset.approvalRef, { kind: 'dataset', dataset: id }, approvals);
      if (!resolution.ok) {
        problems.push(
          `fields.${field.key}.referenceDatasets: the dataset ${id} has no approval record (${resolution.reason}), so no reference candidate may come from it (G1-12; D-47)`,
        );
      }
    }
  }

  const unique = [...new Set(problems)];
  return {
    ok: unique.length === 0,
    base: base.name,
    problems: unique,
    approvedLoosenings,
    tightenings,
    waiting: waitingList(registry, gates, current),
  };
}
