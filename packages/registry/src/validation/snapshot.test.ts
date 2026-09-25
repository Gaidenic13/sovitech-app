/**
 * The loosening snapshot (docs/guardrails.md section 10 "Versioning" and
 * "What counts as loosening"; prompt 3 sections 5.2 and 5.4). Each property
 * is compared in the direction section 10 names; where the direction is
 * unclear the change counts as a loosening ("When unsure").
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRODUCTION_GATES_DIR, loadGateDefinitions, type GateDefinition } from '../gates';
import { PROPOSED_SETTINGS, policyAnchorProblems } from './policy';
import type { FieldDefinition, RegistryBundle } from './schema';
import {
  BASELINE_NAME,
  baselinePolicyProblems,
  compareSnapshots,
  projectSnapshot,
  type Snapshot,
  type SnapshotDifference,
} from './snapshot';

const GUARDRAILS = readFileSync(new URL('../../../../docs/guardrails.md', import.meta.url), 'utf8');

const baseField: FieldDefinition = {
  key: 'building.testArea',
  label: 'Test area',
  subject: 'building',
  kind: 'quantity',
  unit: 'm2',
  dimension: 'area',
  qualifierRequired: true,
  estimation: 'forbidden',
  criticality: 'for_quotation',
  impactRank: 10,
  confirmBy: 'engineer',
  affects: [{ output: 'unit.output', via: 'formula:unitFormula@1' }],
};

function registry(fields: FieldDefinition[], settings = PROPOSED_SETTINGS): RegistryBundle {
  return {
    id: 'unit-registry',
    version: '1',
    units: [{ code: 'm2', symbol: 'm²', dimension: 'area' }],
    fields,
    questions: [],
    formulas: [{ id: 'unitFormula', version: '1', inputs: fields.map((f) => f.key), outputs: ['unit.output'] }],
    templateSlots: [],
    datasets: [{ id: 'test-reference-set', version: '1' }],
    settings,
  };
}

const gates: GateDefinition[] = loadGateDefinitions(PRODUCTION_GATES_DIR);
const meta = { name: BASELINE_NAME, status: 'unapproved' as const, version: 0, guardrailsVersion: '1.5', recordedOn: '2026-09-25', approvalRef: '' };

function snap(fields: FieldDefinition[], settings = PROPOSED_SETTINGS, gateList = gates): Snapshot {
  return projectSnapshot(registry(fields, settings), gateList, meta);
}

function diff(before: FieldDefinition[], after: FieldDefinition[]): SnapshotDifference[] {
  return compareSnapshots(snap(before), snap(after));
}

function kinds(differences: SnapshotDifference[]): string[] {
  return differences.map((difference) => `${difference.kind} ${difference.path}`);
}

describe('projectSnapshot', () => {
  it('records every loosening-sensitive property, with null for an absent value', () => {
    const snapshot = snap([{ ...baseField, referenceDatasets: ['z-set', 'a-set'] }]);
    expect(snapshot.fields['building.testArea']).toEqual({
      estimation: 'forbidden',
      estimatedMethod: null,
      tolerance: null,
      plausible: null,
      criticality: 'for_quotation',
      requiredSlot: null,
      firstEstimateSlot: null,
      confirmBy: 'engineer',
      confirmByBasis: null,
      identity: false,
      referenceDatasets: ['a-set', 'z-set'],
      impactRank: 10,
      minorForTotals: false,
      qualifierRequired: true,
    });
    expect(snapshot.impactRankOrder).toEqual(['building.testArea']);
    expect(snapshot.settings.confirmationBudget).toBe(7);
    expect(Object.keys(snapshot.gates).sort()).toEqual(gates.map((gate) => gate.id).sort());
    expect(snapshot.gates['ifc-values']?.open).toBe(false);
  });

  it('is identical for identical input', () => {
    expect(compareSnapshots(snap([baseField]), snap([baseField]))).toEqual([]);
  });
});

describe('compareSnapshots, field properties', () => {
  it('estimation forbidden to allowed is a loosening; the reverse a tightening', () => {
    const allowed = { ...baseField, estimation: 'allowed' as const, estimatedMethod: 'points' as const };
    expect(kinds(diff([baseField], [allowed]))).toEqual(['loosening fields.building.testArea.estimation']);
    expect(kinds(diff([allowed], [baseField]))).toEqual(['tightening fields.building.testArea.estimation']);
  });

  it('a tolerance added or widened is a loosening; narrowed a tightening', () => {
    const narrow = { ...baseField, tolerance: { relative: 0.01, reason: 'unit test' } };
    const wide = { ...baseField, tolerance: { relative: 0.02, reason: 'unit test' } };
    const withAbsolute = { ...baseField, tolerance: { relative: 0.01, absolute: 5, reason: 'unit test' } };
    expect(kinds(diff([baseField], [narrow]))).toEqual(['loosening fields.building.testArea.tolerance']);
    expect(kinds(diff([narrow], [wide]))).toEqual(['loosening fields.building.testArea.tolerance']);
    expect(kinds(diff([narrow], [withAbsolute]))).toEqual(['loosening fields.building.testArea.tolerance']);
    expect(kinds(diff([wide], [narrow]))).toEqual(['tightening fields.building.testArea.tolerance']);
    expect(kinds(diff([narrow], [baseField]))).toEqual(['tightening fields.building.testArea.tolerance']);
  });

  it('a plausible range removed or widened is a loosening; added or narrowed a tightening', () => {
    const narrow = { ...baseField, plausible: { low: 2, high: 3, basis: 'unit test' } };
    const wide = { ...baseField, plausible: { low: 1, high: 3, basis: 'unit test' } };
    expect(kinds(diff([narrow], [baseField]))).toEqual(['loosening fields.building.testArea.plausible']);
    expect(kinds(diff([narrow], [wide]))).toEqual(['loosening fields.building.testArea.plausible']);
    expect(kinds(diff([baseField], [narrow]))).toEqual(['tightening fields.building.testArea.plausible']);
    expect(kinds(diff([wide], [narrow]))).toEqual(['tightening fields.building.testArea.plausible']);
  });

  it('a lowered criticality is a loosening; a raised one a tightening', () => {
    const optional = { ...baseField, criticality: 'optional' as const };
    expect(kinds(diff([baseField], [optional]))).toEqual(['loosening fields.building.testArea.criticality']);
    expect(kinds(diff([optional], [baseField]))).toEqual(['tightening fields.building.testArea.criticality']);
  });

  it('confirmBy moved from engineer to owner or either is a loosening; owner to either too', () => {
    const owner = { ...baseField, confirmBy: 'owner' as const, confirmByBasis: 'identity' as const };
    const either = { ...baseField, confirmBy: 'either' as const, confirmByBasis: 'identity' as const };
    expect(kinds(diff([baseField], [owner]))).toEqual(['loosening fields.building.testArea.confirmBy']);
    expect(kinds(diff([baseField], [either]))).toEqual(['loosening fields.building.testArea.confirmBy']);
    expect(kinds(diff([owner], [either]))).toEqual(['loosening fields.building.testArea.confirmBy']);
    expect(kinds(diff([owner], [baseField]))).toEqual(['tightening fields.building.testArea.confirmBy']);
  });

  it('an identity field added is a loosening', () => {
    expect(kinds(diff([baseField], [{ ...baseField, identity: true }]))).toEqual(['loosening fields.building.testArea.identity']);
  });

  it('a reference dataset added is a loosening; removed a tightening', () => {
    const withSet = { ...baseField, referenceDatasets: ['test-reference-set'] };
    expect(kinds(diff([baseField], [withSet]))).toEqual(['loosening fields.building.testArea.referenceDatasets']);
    expect(kinds(diff([withSet], [baseField]))).toEqual(['tightening fields.building.testArea.referenceDatasets']);
  });

  it('minorForTotals set, or qualifierRequired dropped, is a loosening', () => {
    expect(kinds(diff([baseField], [{ ...baseField, minorForTotals: true }]))).toEqual([
      'loosening fields.building.testArea.minorForTotals',
    ]);
    expect(kinds(diff([baseField], [{ ...baseField, qualifierRequired: false }]))).toEqual([
      'loosening fields.building.testArea.qualifierRequired',
    ]);
  });

  it('a changed estimated method or slot counts as a loosening (when unsure)', () => {
    const points = { ...baseField, estimation: 'allowed' as const, estimatedMethod: 'points' as const };
    const capex = { ...points, estimatedMethod: 'capex' as const };
    expect(kinds(diff([points], [capex]))).toEqual(['loosening fields.building.testArea.estimatedMethod']);
  });

  it('a removed field is a loosening; a new field is added', () => {
    const other = { ...baseField, key: 'building.other', impactRank: 11 };
    expect(kinds(diff([baseField, other], [baseField]))).toEqual(['loosening fields.building.other']);
    expect(kinds(diff([baseField], [baseField, other]))).toEqual(['added fields.building.other']);
  });

  it('a changed impactRank order is a loosening; a changed rank with the same order is not a difference', () => {
    const a = { ...baseField, key: 'building.a', impactRank: 1 };
    const b = { ...baseField, key: 'building.b', impactRank: 2 };
    expect(kinds(diff([a, b], [{ ...a, impactRank: 3 }, b]))).toEqual(['loosening impactRankOrder']);
    expect(kinds(diff([a, b], [a, { ...b, impactRank: 5 }]))).toEqual([]);
  });
});

describe('compareSnapshots, settings and gates', () => {
  function settingsDiff(change: (settings: typeof PROPOSED_SETTINGS) => typeof PROPOSED_SETTINGS): string[] {
    return kinds(compareSnapshots(snap([baseField]), snap([baseField], change(PROPOSED_SETTINGS))));
  }

  it('a raised confirmation budget is a loosening; a lowered one a tightening', () => {
    expect(settingsDiff((s) => ({ ...s, confirmationBudget: { ...s.confirmationBudget, value: 8 } }))).toEqual([
      'loosening settings.confirmationBudget',
    ]);
    expect(settingsDiff((s) => ({ ...s, confirmationBudget: { ...s.confirmationBudget, value: 6 } }))).toEqual([
      'tightening settings.confirmationBudget',
    ]);
  });

  it('any change to the calibration threshold is a loosening', () => {
    expect(settingsDiff((s) => ({ ...s, calibrationThreshold: { ...s.calibrationThreshold, correctionRatePercent: 5 } }))).toEqual([
      'loosening settings.calibrationThreshold',
    ]);
    expect(settingsDiff((s) => ({ ...s, calibrationThreshold: { ...s.calibrationThreshold, window: 100 } }))).toEqual([
      'loosening settings.calibrationThreshold',
    ]);
  });

  it('a member removed from the first-estimate or required set is a loosening; added a tightening', () => {
    expect(settingsDiff((s) => ({ ...s, firstEstimateSet: { ...s.firstEstimateSet, members: ['building_type', 'gross_floor_area'] } }))).toEqual([
      'loosening settings.firstEstimateSet',
    ]);
    expect(settingsDiff((s) => ({ ...s, requiredSet: { ...s.requiredSet, members: ['project_name', 'project_type', 'city'] } }))).toEqual([
      'loosening settings.requiredSet',
    ]);
    expect(
      kinds(
        compareSnapshots(
          snap([baseField], { ...PROPOSED_SETTINGS, firstEstimateSet: { ...PROPOSED_SETTINGS.firstEstimateSet, members: ['building_type'] } }),
          snap([baseField]),
        ),
      ),
    ).toEqual(['tightening settings.firstEstimateSet']);
  });

  it('an identity-list member added is a loosening', () => {
    expect(settingsDiff((s) => ({ ...s, identityList: { ...s.identityList, members: ['project_name', 'city'] } }))).toEqual([
      'loosening settings.identityList',
    ]);
  });

  it('a changed document-stage order is a loosening', () => {
    expect(
      settingsDiff((s) => ({ ...s, documentStageOrder: { ...s.documentStageOrder, tiers: [...s.documentStageOrder.tiers].reverse() } })),
    ).toEqual(['loosening settings.documentStageOrder']);
  });

  function gateDiff(change: (list: GateDefinition[]) => GateDefinition[]): string[] {
    return kinds(compareSnapshots(snap([baseField]), snap([baseField], PROPOSED_SETTINGS, change(gates))));
  }

  it('an opened gate is a loosening', () => {
    expect(gateDiff((list) => list.map((g) => (g.id === 'operations' ? { ...g, open: true } : g)))).toEqual([
      'loosening gates.operations.open',
    ]);
  });

  it('a removed gate is a loosening; an added gate is added', () => {
    expect(gateDiff((list) => list.filter((g) => g.id !== 'operations'))).toEqual(['loosening gates.operations']);
    expect(
      kinds(compareSnapshots(snap([baseField], PROPOSED_SETTINGS, gates.filter((g) => g.id !== 'operations')), snap([baseField]))),
    ).toEqual(['added gates.operations']);
  });

  it('an item removed from what a gate waits for is a loosening; an item added a tightening', () => {
    expect(gateDiff((list) => list.map((g) => (g.id === 'operations' ? { ...g, waitsFor: g.waitsFor.slice(1) } : g)))).toEqual([
      'loosening gates.operations.waitsFor',
    ]);
    expect(
      gateDiff((list) =>
        list.map((g) =>
          g.id === 'operations'
            ? { ...g, waitsFor: [...g.waitsFor, { item: 'proposal 7.2.99', kind: 'guardrail-proposal' as const, dId: 'D-99', approvalRef: '' }] }
            : g,
        ),
      ),
    ).toEqual(['tightening gates.operations.waitsFor']);
  });

  it('a changed closed behaviour counts as a loosening (when unsure)', () => {
    expect(gateDiff((list) => list.map((g) => (g.id === 'operations' ? { ...g, closedBehaviour: `${g.closedBehaviour} Changed.` } : g)))).toEqual([
      'loosening gates.operations.closedBehaviour',
    ]);
  });
});

describe('baselinePolicyProblems (the unapproved baseline holds only the strictest values)', () => {
  it('passes a baseline of strict values', () => {
    expect(baselinePolicyProblems(snap([baseField]))).toEqual([]);
  });

  it.each([
    ['a tolerance', { ...baseField, tolerance: { relative: 0.01, reason: 'x' } }, 'tolerance'],
    ['a plausible range', { ...baseField, plausible: { low: 1, high: 2, basis: 'x' } }, 'plausible'],
    ['estimation allowed without a method', { ...baseField, estimation: 'allowed' as const }, 'estimat'],
    ['a reference dataset', { ...baseField, referenceDatasets: ['test-reference-set'] }, 'reference'],
    ['minorForTotals', { ...baseField, minorForTotals: true }, 'minorForTotals'],
    ['confirmBy owner without a basis', { ...baseField, confirmBy: 'owner' as const }, 'confirmBy'],
    ['required without a slot', { ...baseField, criticality: 'required' as const }, 'required'],
    ['first_estimate without a slot', { ...baseField, criticality: 'first_estimate' as const }, 'first_estimate'],
    ['identity outside the list', { ...baseField, identity: true }, 'identity'],
  ])('fails a baseline holding %s', (_label, value, fragment) => {
    const problems = baselinePolicyProblems(snap([value as FieldDefinition]));
    expect(problems.join('\n')).toContain(fragment);
  });

  it('fails a baseline with an open gate', () => {
    const open = snap([baseField], PROPOSED_SETTINGS, gates.map((g) => (g.id === 'operations' ? { ...g, open: true } : g)));
    expect(baselinePolicyProblems(open).join('\n')).toContain('operations');
  });

  it('fails a baseline whose settings differ from the proposed values', () => {
    const raised = snap([baseField], { ...PROPOSED_SETTINGS, confirmationBudget: { ...PROPOSED_SETTINGS.confirmationBudget, value: 8 } });
    expect(baselinePolicyProblems(raised).join('\n')).toContain('confirmationBudget');
  });

  it('fails a baseline that calls itself approved or carries a reference', () => {
    expect(baselinePolicyProblems({ ...snap([baseField]), status: 'approved' }).join('\n')).toContain('unapproved');
    expect(baselinePolicyProblems({ ...snap([baseField]), approvalRef: 'guardrails-changelog:1.5' }).join('\n')).toContain('reference');
  });
});

describe('policyAnchorProblems (the closed lists in code match docs/guardrails.md)', () => {
  it('finds every anchor in the guardrails as written today', () => {
    expect(policyAnchorProblems(GUARDRAILS)).toEqual([]);
  });

  it('fails when the budget sentence says another value', () => {
    expect(policyAnchorProblems(GUARDRAILS.replace('(proposed: 7)', '(proposed: 8)')).join('\n')).toContain('confirmation budget');
  });

  it('fails when a named estimated method is missing from the rule text', () => {
    expect(policyAnchorProblems(GUARDRAILS.replace('Savings, payback, ROI and performance.', 'Savings.')).join('\n')).toContain('savings');
  });

  it('fails when the required list changes in the rule text', () => {
    expect(
      policyAnchorProblems(GUARDRAILS.replace('project name, project type, city and country', 'project name, city and country')).join('\n'),
    ).toContain('required');
  });
});
