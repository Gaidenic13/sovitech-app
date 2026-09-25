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
import type { RegistryFieldDefinition, RegistryBundle } from './schema';
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

const GUARDRAILS = readFileSync(new URL('../../../../docs/guardrails.md', import.meta.url), 'utf8');

const baseField: RegistryFieldDefinition = {
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

const UNIT_FORMULA: RegistryBundle['formulas'][number] = { id: 'unitFormula', version: '1', inputs: ['building.testArea'], outputs: ['unit.output'] };

function registry(fields: RegistryFieldDefinition[], settings = PROPOSED_SETTINGS, formulas = [UNIT_FORMULA], datasets = [{ id: 'test-reference-set', version: '1' }]): RegistryBundle {
  return {
    id: 'unit-registry',
    version: '1',
    units: [{ code: 'm2', symbol: 'm²', dimension: 'area' }],
    fields,
    questions: [],
    // A formula's signature no longer follows the field list: a changed signature is a loosening itself (2.4).
    formulas,
    templateSlots: [],
    datasets,
    settings,
  };
}

const gates: GateDefinition[] = loadGateDefinitions(PRODUCTION_GATES_DIR);
const meta = { name: BASELINE_NAME, status: 'unapproved' as const, version: 0, guardrailsVersion: '1.5', recordedOn: '2026-09-25', approvalRef: '' };

function snap(fields: RegistryFieldDefinition[], settings = PROPOSED_SETTINGS, gateList = gates): Snapshot {
  return projectSnapshot(registry(fields, settings), gateList, meta);
}

function diff(before: RegistryFieldDefinition[], after: RegistryFieldDefinition[]): SnapshotDifference[] {
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
      kind: 'quantity',
      unit: 'm2',
      dimension: 'area',
      qualifiers: [],
      options: [],
      valueShape: null,
      formulas: [],
    });
    expect(snapshot.impactRankOrder).toEqual(['building.testArea']);
    expect(snapshot.formulas).toEqual({ 'formula:unitFormula@1': { inputs: ['building.testArea'], outputs: ['unit.output'], unknownPolicy: 'refuse', estimated: false } });
    expect(snapshot.datasets).toEqual(['test-reference-set@1']);
    expect(snapshot.units['m2']).toEqual({ symbol: 'm²', dimension: 'area', written: ['m.p.', 'mp', 'mp.', 'sqm'], toBase: '1' });
    expect(snapshot.floorNotationLetters).toEqual({ E: 'upper', Er: 'setback_or_technical', Mz: 'mezzanine', P: 'ground', S: 'below_ground' });
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

  it('a confirmBy basis moved away from owner_choice is a loosening, even when the field goes to an engineer (phase 1 review, round 3)', () => {
    const choice = { ...baseField, kind: 'decision' as const, unit: undefined, dimension: undefined, qualifierRequired: undefined, options: ['include', 'exclude'], confirmBy: 'owner' as const, confirmByBasis: 'owner_choice' as const };
    const occupancy = { ...choice, confirmByBasis: 'use_and_occupancy' as const };
    const engineer = { ...choice, confirmBy: 'engineer' as const, confirmByBasis: undefined };
    expect(kinds(diff([choice], [occupancy]))).toEqual(['loosening fields.building.testArea.confirmByBasis']);
    expect(kinds(diff([choice], [engineer]))).toEqual(['tightening fields.building.testArea.confirmBy', 'loosening fields.building.testArea.confirmByBasis']);
    expect(diff([choice], [engineer])[1]?.message).toContain('Choices belong to the owner');
  });
  it('a basis changed on an owner field is a loosening; on an engineer field a tightening', () => {
    const identity = { ...baseField, confirmBy: 'owner' as const, confirmByBasis: 'identity' as const };
    expect(kinds(diff([identity], [{ ...identity, confirmByBasis: 'use_and_occupancy' as const }]))).toEqual(['loosening fields.building.testArea.confirmByBasis']);
    expect(kinds(diff([{ ...baseField, confirmByBasis: 'identity' as const }], [baseField]))).toEqual(['tightening fields.building.testArea.confirmByBasis']);
  });

  it('a kind changed away from decision is a loosening; any other change of kind too (when unsure)', () => {
    const choice = { ...baseField, kind: 'decision' as const, unit: undefined, dimension: undefined, qualifierRequired: undefined, options: ['include', 'exclude'], confirmBy: 'owner' as const, confirmByBasis: 'owner_choice' as const };
    const found = diff([choice], [{ ...choice, kind: 'enum' as const }]);
    expect(kinds(found)).toEqual(['loosening fields.building.testArea.kind']);
    expect(found[0]?.message).toContain('kind decision → enum: away from an owner decision');
    expect(kinds(diff([baseField], [{ ...baseField, kind: 'count' as const, valueShape: 'non_negative_integer' as const }]))).toEqual([
      'loosening fields.building.testArea.kind',
      'tightening fields.building.testArea.valueShape',
    ]);
  });

  it('a unit or dimension changed is a loosening; a dimension first declared a tightening', () => {
    expect(kinds(diff([baseField], [{ ...baseField, unit: 'kW', dimension: 'power' }]))).toEqual([
      'loosening fields.building.testArea.unit',
      'loosening fields.building.testArea.dimension',
    ]);
    expect(kinds(diff([{ ...baseField, dimension: undefined }], [baseField]))).toEqual(['tightening fields.building.testArea.dimension']);
    expect(kinds(diff([baseField], [{ ...baseField, dimension: undefined }]))).toEqual(['loosening fields.building.testArea.dimension']);
  });

  it('a qualifier added is a loosening (G8-14 reads the list); a qualifier removed a tightening', () => {
    const one = { ...baseField, qualifiers: ['gross_total'] };
    const found = diff([one], [{ ...baseField, qualifiers: ['gross_total', 'Gross_Total', 'usable'] }]);
    expect(kinds(found)).toEqual(['loosening fields.building.testArea.qualifiers']);
    expect(found[0]?.message).toContain('qualifiers [gross_total] → [Gross_Total, gross_total, usable] (added Gross_Total, usable;');
    expect(kinds(diff([{ ...baseField, qualifiers: ['gross_total', 'usable'] }], [one]))).toEqual(['tightening fields.building.testArea.qualifiers']);
    expect(kinds(diff([one], [{ ...baseField, qualifiers: ['usable'] }]))).toEqual(['loosening fields.building.testArea.qualifiers']);
  });

  it('an option added is a loosening; an option removed a tightening', () => {
    const choice = { ...baseField, kind: 'enum' as const, unit: undefined, dimension: undefined, qualifierRequired: undefined, options: ['alpha', 'beta'] };
    expect(kinds(diff([choice], [{ ...choice, options: ['alpha', 'beta', 'TEST-maybe'] }]))).toEqual(['loosening fields.building.testArea.options']);
    expect(kinds(diff([{ ...choice, options: ['alpha', 'beta', 'gamma'] }], [choice]))).toEqual(['tightening fields.building.testArea.options']);
  });

  it("a count's whole-number shape dropped is a loosening", () => {
    const count = { ...baseField, kind: 'count' as const, unit: 'count', dimension: 'count', valueShape: 'non_negative_integer' as const };
    expect(kinds(diff([count], [{ ...count, valueShape: undefined }]))).toEqual(['loosening fields.building.testArea.valueShape']);
  });

  it('a formula that starts writing a field is a loosening for that field; one that stops, a tightening', () => {
    const writer: RegistryBundle['formulas'][number] = { id: 'unitWriter', version: '1', inputs: ['building.testArea'], outputs: ['building.testArea'] };
    const found = compareSnapshots(snap([baseField]), projectSnapshot(registry([baseField], PROPOSED_SETTINGS, [UNIT_FORMULA, writer]), gates, meta));
    expect(kinds(found)).toEqual(['loosening fields.building.testArea.formulas', 'added formulas.formula:unitWriter@1']);
    const back = compareSnapshots(projectSnapshot(registry([baseField], PROPOSED_SETTINGS, [UNIT_FORMULA, writer]), gates, meta), snap([baseField]));
    expect(kinds(back)).toEqual(['tightening fields.building.testArea.formulas', 'tightening formulas.formula:unitWriter@1']);
  });

  it('a changed impactRank order is a loosening; a changed rank with the same order is not a difference', () => {
    const a = { ...baseField, key: 'building.a', impactRank: 1 };
    const b = { ...baseField, key: 'building.b', impactRank: 2 };
    expect(kinds(diff([a, b], [{ ...a, impactRank: 3 }, b]))).toEqual(['loosening impactRankOrder']);
    expect(kinds(diff([a, b], [a, { ...b, impactRank: 5 }]))).toEqual([]);
  });
});

describe('compareSnapshots, formulas, datasets, units and floor-notation letters (phase 1 review, round 3)', () => {
  function withFormulas(formulas: RegistryBundle['formulas']): Snapshot {
    return projectSnapshot(registry([baseField], PROPOSED_SETTINGS, formulas), gates, meta);
  }

  it('a changed formula signature is a loosening (2.4: versions are immutable); a new one is added; a removed one a tightening', () => {
    expect(kinds(compareSnapshots(snap([baseField]), withFormulas([{ ...UNIT_FORMULA, estimated: true }])))).toEqual(['loosening formulas.formula:unitFormula@1']);
    expect(kinds(compareSnapshots(snap([baseField]), withFormulas([{ ...UNIT_FORMULA, inputs: ['building.testArea', 'building.other'] }])))).toEqual([
      'loosening formulas.formula:unitFormula@1',
    ]);
    expect(kinds(compareSnapshots(snap([baseField]), withFormulas([UNIT_FORMULA, { ...UNIT_FORMULA, version: '2' }])))).toEqual(['added formulas.formula:unitFormula@2']);
    expect(kinds(compareSnapshots(snap([baseField]), withFormulas([])))).toEqual(['tightening formulas.formula:unitFormula@1']);
  });

  it('a missing unknownPolicy is recorded as refuse (G1-9), so declaring it refuse is no difference', () => {
    expect(compareSnapshots(snap([baseField]), withFormulas([{ ...UNIT_FORMULA, unknownPolicy: 'refuse' }]))).toEqual([]);
  });

  it('a newly declared dataset is added; a removed one a tightening', () => {
    const more = projectSnapshot(registry([baseField], PROPOSED_SETTINGS, [UNIT_FORMULA], [{ id: 'test-reference-set', version: '1' }, { id: 'test-other-set', version: '1' }]), gates, meta);
    expect(kinds(compareSnapshots(snap([baseField]), more))).toEqual(['added datasets.test-other-set@1']);
    expect(kinds(compareSnapshots(more, snap([baseField])))).toEqual(['tightening datasets.test-other-set@1']);
  });

  function withLists(change: (lists: RegistryLists) => RegistryLists): SnapshotDifference[] {
    return compareSnapshots(snap([baseField]), projectSnapshot(registry([baseField]), gates, meta, change(currentRegistryLists())));
  }
  const editUnit = (lists: RegistryLists, code: string, change: Partial<RegistryLists['units'][number]>): RegistryLists => ({
    ...lists,
    units: lists.units.map((unit) => (unit.code === code ? { ...unit, ...change } : unit)),
  });

  it('a unit added, a written form added, a dimension merged, a symbol or a factor changed is a loosening (ADR 0017)', () => {
    expect(kinds(withLists((lists) => ({ ...lists, units: [...lists.units, { code: 'TEST-unit', symbol: 'TEST', dimension: 'area', written: [] }] })))).toEqual([
      'loosening units.TEST-unit',
    ]);
    const m2 = currentRegistryLists().units.find((unit) => unit.code === 'm2');
    expect(kinds(withLists((lists) => editUnit(lists, 'm2', { written: [...(m2?.written ?? []), 'TEST-mp'] })))).toEqual(['loosening units.m2.written']);
    expect(kinds(withLists((lists) => editUnit(lists, 'kVA', { dimension: 'power' })))).toEqual(['loosening units.kVA.dimension']);
    expect(kinds(withLists((lists) => editUnit(lists, 'm2', { symbol: 'TEST-m2' })))).toEqual(['loosening units.m2.symbol']);
    expect(kinds(withLists((lists) => editUnit(lists, 'Gcal', { toBase: '4184000000' })))).toEqual(['loosening units.Gcal.toBase']);
  });

  it('a unit, a written form or a factor removed is a tightening', () => {
    expect(kinds(withLists((lists) => ({ ...lists, units: lists.units.filter((unit) => unit.code !== 'TR') })))).toEqual(['tightening units.TR']);
    expect(kinds(withLists((lists) => editUnit(lists, 'm2', { written: ['mp'] })))).toEqual(['tightening units.m2.written']);
    expect(kinds(withLists((lists) => editUnit(lists, 'mm', { toBase: undefined })))).toEqual(['tightening units.mm.toBase']);
  });

  it('a floor-notation letter added, or naming another level type, is a loosening; removed a tightening (rule 8, "Abbreviations")', () => {
    const found = withLists((lists) => ({ ...lists, floorNotationLetters: { ...lists.floorNotationLetters, D: 'semi_basement' } }));
    expect(kinds(found)).toEqual(['loosening floorNotationLetters.D']);
    expect(found[0]?.message).toContain('outside the glossary');
    expect(kinds(withLists((lists) => ({ ...lists, floorNotationLetters: { ...lists.floorNotationLetters, Er: 'attic' } })))).toEqual([
      'loosening floorNotationLetters.Er',
    ]);
    const fewer = Object.fromEntries(Object.entries(currentRegistryLists().floorNotationLetters).filter(([letter]) => letter !== 'Mz'));
    expect(kinds(withLists((lists) => ({ ...lists, floorNotationLetters: fewer })))).toEqual(['tightening floorNotationLetters.Mz']);
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
    ['a count with no whole-number shape', { ...baseField, kind: 'count' as const, unit: 'count', dimension: 'count' }, 'whole-number shape'],
    [
      'a decision an engineer confirms',
      { ...baseField, kind: 'decision' as const, unit: undefined, dimension: undefined, options: ['include', 'exclude'], confirmBy: 'engineer' as const },
      "choices belong to the owner",
    ],
    ['an owner choice either may settle', { ...baseField, confirmBy: 'either' as const, confirmByBasis: 'owner_choice' as const }, "choices belong to the owner"],
  ])('fails a baseline holding %s', (_label, value, fragment) => {
    const problems = baselinePolicyProblems(snap([value as RegistryFieldDefinition]));
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
