/**
 * The loosening check core (docs/guardrails.md section 10 "Versioning";
 * prompt 3 sections 5.2 and 5.4). While no approver is named there is no
 * approved snapshot: the comparison base is "unapproved baseline v0", and
 * any loosening against it, or any value it does not hold, fails.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseApprovalContext, type ApprovalContext } from '../approvals';
import { PRODUCTION_GATES_DIR, loadGateDefinitions, type GateDefinition } from '../gates';
import { evaluateLoosening, type LooseningInputs } from './loosening';
import { PROPOSED_SETTINGS } from './policy';
import { loadRepoLooseningInputs } from './repo';
import type { RegistryFieldDefinition, RegistryBundle } from './schema';
import { BASELINE_NAME, currentRegistryLists, projectSnapshot, type RegistryLists, type Snapshot } from './snapshot';

const GUARDRAILS = readFileSync(new URL('../../../../docs/guardrails.md', import.meta.url), 'utf8');
const gates: GateDefinition[] = loadGateDefinitions(PRODUCTION_GATES_DIR);

const areaField: RegistryFieldDefinition = {
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

function registry(fields: RegistryFieldDefinition[], extra: Partial<RegistryBundle> = {}): RegistryBundle {
  return {
    id: 'unit-registry',
    version: '1',
    units: [{ code: 'm2', symbol: 'm²', dimension: 'area' }],
    fields,
    questions: [],
    formulas: [{ id: 'unitFormula', version: '1', inputs: fields.map((f) => f.key), outputs: ['unit.output'] }],
    templateSlots: [],
    datasets: [],
    settings: PROPOSED_SETTINGS,
    ...extra,
  };
}

const meta = { name: BASELINE_NAME, status: 'unapproved' as const, version: 0, guardrailsVersion: '1.5', recordedOn: '2026-09-25', approvalRef: '' };

function approvals(approver: string, rows: string[] = []): ApprovalContext {
  return parseApprovalContext({
    guardrails: [
      '| Approver | Role | Since |',
      '|---|---|---|',
      `| ${approver} | Product owner | |`,
      '',
      '### Change log',
      '| Version | Date | Change | Approved by |',
      '|---|---|---|---|',
      ...rows,
    ].join('\n'),
  });
}
const NOBODY = approvals('*(to be named by the product owner)*');

function inputs(overrides: Partial<LooseningInputs> & { fields?: RegistryFieldDefinition[]; baselineFields?: RegistryFieldDefinition[] } = {}): LooseningInputs {
  const { fields = [areaField], baselineFields = [areaField], ...rest } = overrides;
  return {
    registry: registry(fields),
    gates,
    baseline: projectSnapshot(registry(baselineFields), gates, meta),
    approvedSnapshots: [],
    approvals: NOBODY,
    ruleText: GUARDRAILS,
    ...rest,
  };
}

describe('evaluateLoosening', () => {
  it('passes when the registry equals the unapproved baseline, and reports every value as waiting', () => {
    const report = evaluateLoosening(inputs());
    expect(report.problems).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.base).toBe(BASELINE_NAME);
    expect(report.waiting.join('\n')).toContain('confirmation budget: 7 (proposed)');
    expect(report.waiting.join('\n')).toContain('gate ifc-values: closed');
    expect(report.waiting.join('\n')).toContain('building.testArea');
  });

  it('fails a looser value with no approval', () => {
    const report = evaluateLoosening(inputs({ fields: [{ ...areaField, estimation: 'allowed', estimatedMethod: 'points' }] }));
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toContain('loosening');
    expect(report.problems.join('\n')).toContain('building.testArea.estimation');
  });

  it('fails a looser value whose reference cannot resolve while no approver is named', () => {
    const loose = { ...areaField, criticality: 'optional' as const, approvals: { criticality: 'guardrails-changelog:1.5' } };
    const report = evaluateLoosening(inputs({ fields: [loose] }));
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toContain('no approver is named');
  });

  it('accepts a looser value whose reference names the approver and the field', () => {
    const loose = { ...areaField, criticality: 'optional' as const, approvals: { criticality: 'guardrails-changelog:2.1' } };
    const context = approvals('Ana Test', ['| 2.1 | 2026-05-01 | Lowered building.testArea to optional. | Ana Test |']);
    const report = evaluateLoosening(inputs({ fields: [loose], approvals: context }));
    expect(report.problems).toEqual([]);
    expect(report.approvedLoosenings.join('\n')).toContain('building.testArea.criticality');
  });

  it('fails a value the unapproved baseline does not hold (a new field), with the way to record it', () => {
    const other = { ...areaField, key: 'building.other', impactRank: 11 };
    const report = evaluateLoosening(inputs({ fields: [areaField, other] }));
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toContain('building.other');
    expect(report.problems.join('\n')).toContain('write-baseline');
  });

  it('fails a tightened value against the unapproved baseline too: it has no approval either', () => {
    const report = evaluateLoosening(inputs({ fields: [{ ...areaField, criticality: 'first_estimate', firstEstimateSlot: 'gross_floor_area' }] }));
    expect(report.ok).toBe(false);
  });

  it('G1-12 shape: fails a field with a reference dataset that has no approval record', () => {
    const withSet = { ...areaField, referenceDatasets: ['website-product-list'] };
    const report = evaluateLoosening({
      ...inputs({ fields: [withSet] }),
      registry: registry([withSet], { datasets: [{ id: 'website-product-list', version: '1' }] }),
    });
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toContain('website-product-list');
    expect(report.problems.join('\n')).toContain('no approval record');
  });

  it('fails an open gate while the approver table is empty', () => {
    const open = gates.map((gate) => (gate.id === 'ifc-values' ? { ...gate, open: true } : gate));
    const report = evaluateLoosening(inputs({ gates: open }));
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toContain('ifc-values');
  });

  it('fails a closed gate carrying a reference that does not resolve', () => {
    const bogus = gates.map((gate) =>
      gate.id === 'ifc-areas' ? { ...gate, waitsFor: gate.waitsFor.map((item) => ({ ...item, approvalRef: 'guardrails-changelog:1.5' })) } : gate,
    );
    const report = evaluateLoosening(inputs({ gates: bogus }));
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toContain('ifc-areas');
  });

  it('fails a baseline that holds a value the strict policy does not allow', () => {
    const invented = { ...areaField, tolerance: { relative: 0.01, reason: 'invented' } };
    const report = evaluateLoosening(inputs({ fields: [invented], baselineFields: [invented] }));
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toContain('tolerance');
  });

  it('fails when the code constants and the rule text disagree', () => {
    const report = evaluateLoosening(inputs({ ruleText: GUARDRAILS.replace('(proposed: 7)', '(proposed: 9)') }));
    expect(report.ok).toBe(false);
  });

  it('fails a setting marked with a reference that does not resolve', () => {
    const settings = { ...PROPOSED_SETTINGS, confirmationBudget: { ...PROPOSED_SETTINGS.confirmationBudget, approvalRef: 'guardrails-changelog:1.5' } };
    const report = evaluateLoosening({ ...inputs(), registry: { ...registry([areaField]), settings } });
    expect(report.ok).toBe(false);
    expect(report.problems.join('\n')).toContain('confirmationBudget');
  });

  describe('with an approved snapshot', () => {
    const context = approvals('Ana Test', ['| 3.0 | 2026-06-01 | Approved registry snapshot v1. | Ana Test |']);
    const approvedMeta = { ...meta, name: 'approved snapshot v1', status: 'approved' as const, version: 1, approvalRef: 'guardrails-changelog:3.0' };

    it('compares with it, reports a tightening and passes', () => {
      const approved: Snapshot = projectSnapshot(registry([areaField]), gates, approvedMeta);
      const report = evaluateLoosening(
        inputs({ approvedSnapshots: [approved], approvals: context, fields: [{ ...areaField, criticality: 'required', requiredSlot: 'project_name' }] }),
      );
      expect(report.base).toBe('approved snapshot v1');
      expect(report.problems).toEqual([]);
      expect(report.tightenings.join('\n')).toContain('criticality');
    });

    it('fails a loosening against it without approval', () => {
      const approved: Snapshot = projectSnapshot(registry([areaField]), gates, approvedMeta);
      const report = evaluateLoosening(inputs({ approvedSnapshots: [approved], approvals: context, fields: [{ ...areaField, criticality: 'optional' }] }));
      expect(report.ok).toBe(false);
    });

    it('fails an approved snapshot whose reference does not resolve', () => {
      const approved: Snapshot = projectSnapshot(registry([areaField]), gates, { ...approvedMeta, approvalRef: 'guardrails-changelog:9.9' });
      const report = evaluateLoosening(inputs({ approvedSnapshots: [approved], approvals: context }));
      expect(report.ok).toBe(false);
      expect(report.problems.join('\n')).toContain('approved snapshot v1');
    });
  });
});

/**
 * The phase 1 review, round 3 (adversarial finding 4): the allow lists derive and the verifier read
 * from the registry were outside the snapshot, so widening one left the check green. Each edit below
 * is the adversarial probe's, made on the production registry and compared with the repository's
 * own "unapproved baseline v0".
 */
describe('the allow lists derive reads, against the repository baseline (phase 1 review, round 3)', () => {
  const repo = loadRepoLooseningInputs();

  function withField(key: string, change: (field: RegistryFieldDefinition) => RegistryFieldDefinition): LooseningInputs {
    expect(repo.registry.fields.some((field) => field.key === key)).toBe(true);
    return { ...repo, registry: { ...repo.registry, fields: repo.registry.fields.map((field) => (field.key === key ? change(field) : field)) } };
  }
  function withLists(change: (lists: RegistryLists) => RegistryLists): LooseningInputs {
    return { ...repo, registryLists: change(currentRegistryLists()) };
  }
  function loosening(input: LooseningInputs, path: string): string {
    const report = evaluateLoosening(input);
    expect(report.ok).toBe(false);
    const line = report.problems.find((problem) => problem.startsWith(`${path}: `));
    expect(line, report.problems.join('\n')).toBeDefined();
    expect(line).toContain('a loosening against unapproved baseline v0 with no approval reference');
    return line ?? '';
  }

  it('passes the repository as it is: the baseline records every property', () => {
    const report = evaluateLoosening(repo);
    expect(report.problems).toEqual([]);
    expect(repo.baseline.fields['building.grossFloorArea']).toMatchObject({ kind: 'quantity', unit: 'm2', dimension: 'area', qualifiers: ['gross_total'], formulas: [] });
    expect(repo.baseline.fields['project.scope.fire_safety']).toMatchObject({ kind: 'decision', options: ['exclude', 'include'], confirmBy: 'owner', confirmByBasis: 'owner_choice' });
    expect(repo.baseline.fields['building.rooms']).toMatchObject({ kind: 'count', valueShape: 'non_negative_integer' });
    expect(Object.keys(repo.baseline.formulas)).toHaveLength(repo.registry.formulas.length);
    expect(Object.keys(repo.baseline.units)).toHaveLength(currentRegistryLists().units.length);
    expect(repo.baseline.floorNotationLetters).toEqual({ E: 'upper', Er: 'setback_or_technical', Mz: 'mezzanine', P: 'ground', S: 'below_ground' });
  });

  it('L1: a misspelt basis and another basis added to the area qualifiers (the list G8-14 reads)', () => {
    const line = loosening(withField('building.grossFloorArea', (field) => ({ ...field, qualifiers: [...(field.qualifiers ?? []), 'Gross_Total', 'usable'] })), 'fields.building.grossFloorArea.qualifiers');
    expect(line).toContain('added Gross_Total, usable');
  });

  it('L2: Fire Safety in scope turned from a decision into an enum (the kind G3-9 reads)', () => {
    expect(loosening(withField('project.scope.fire_safety', (field) => ({ ...field, kind: 'enum' })), 'fields.project.scope.fire_safety.kind')).toContain(
      'kind decision → enum: away from an owner decision',
    );
  });

  it('L3: the area unit moved to another dimension', () => {
    const input = withField('building.grossFloorArea', (field) => ({ ...field, unit: 'kW', dimension: 'power' }));
    loosening(input, 'fields.building.grossFloorArea.unit');
    loosening(input, 'fields.building.grossFloorArea.dimension');
  });

  it('L5: a decision option added', () => {
    loosening(withField('project.scope.fire_safety', (field) => ({ ...field, options: [...(field.options ?? []), 'TEST-maybe'] })), 'fields.project.scope.fire_safety.options');
  });

  it("an owner's choice moved to an engineer: the basis leaves owner_choice, a loosening although confirmBy tightens", () => {
    const input = withField('project.type', (field) => {
      const next: RegistryFieldDefinition = { ...field, confirmBy: 'engineer' };
      delete next.confirmByBasis;
      return next;
    });
    expect(loosening(input, 'fields.project.type.confirmByBasis')).toContain('Choices belong to the owner');
  });

  it("a count's whole-number shape dropped", () => {
    loosening(
      withField('building.rooms', (field) => {
        const next: RegistryFieldDefinition = { ...field };
        delete next.valueShape;
        return next;
      }),
      'fields.building.rooms.valueShape',
    );
  });

  it('a declared formula that starts writing a field', () => {
    const input: LooseningInputs = {
      ...repo,
      registry: { ...repo.registry, formulas: [...repo.registry.formulas, { id: 'unitWriter', version: '1', inputs: ['building.grossFloorArea'], outputs: ['building.rooms'] }] },
    };
    loosening(input, 'fields.building.rooms.formulas');
  });

  it('a declared formula signature changed under the same version (2.4)', () => {
    const [first] = repo.registry.formulas;
    expect(first).toBeDefined();
    if (first === undefined) return;
    const input: LooseningInputs = {
      ...repo,
      registry: { ...repo.registry, formulas: repo.registry.formulas.map((formula) => (formula === first ? { ...formula, estimated: !(formula.estimated === true) } : formula)) },
    };
    loosening(input, `formulas.formula:${first.id}@${first.version}`);
  });

  it('a written form added to a unit, and two dimensions merged (ADR 0017)', () => {
    loosening(
      withLists((lists) => ({ ...lists, units: lists.units.map((unit) => (unit.code === 'm2' ? { ...unit, written: [...unit.written, 'TEST-mp'] } : unit)) })),
      'units.m2.written',
    );
    loosening(withLists((lists) => ({ ...lists, units: lists.units.map((unit) => (unit.code === 'kVA' ? { ...unit, dimension: 'power' } : unit)) })), 'units.kVA.dimension');
  });

  it('a floor-notation letter the glossary has not approved (D, demisol)', () => {
    loosening(withLists((lists) => ({ ...lists, floorNotationLetters: { ...lists.floorNotationLetters, D: 'semi_basement' } })), 'floorNotationLetters.D');
  });

  it('a qualifier removed is a tightening: the check asks for it to be recorded, and the loosening message never appears', () => {
    const report = evaluateLoosening(withField('building.rooms', (field) => ({ ...field, qualifiers: ['guest_rooms', 'keys'] })));
    expect(report.ok).toBe(false);
    const line = report.problems.find((problem) => problem.startsWith('fields.building.rooms.qualifiers: '));
    expect(line).toContain('unapproved baseline v0 does not hold this value');
    expect(line).not.toContain('a loosening against');
  });
});
