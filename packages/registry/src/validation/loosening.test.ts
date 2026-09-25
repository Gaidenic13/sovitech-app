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
import type { FieldDefinition, RegistryBundle } from './schema';
import { BASELINE_NAME, projectSnapshot, type Snapshot } from './snapshot';

const GUARDRAILS = readFileSync(new URL('../../../../docs/guardrails.md', import.meta.url), 'utf8');
const gates: GateDefinition[] = loadGateDefinitions(PRODUCTION_GATES_DIR);

const areaField: FieldDefinition = {
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

function registry(fields: FieldDefinition[], extra: Partial<RegistryBundle> = {}): RegistryBundle {
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

function inputs(overrides: Partial<LooseningInputs> & { fields?: FieldDefinition[]; baselineFields?: FieldDefinition[] } = {}): LooseningInputs {
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
