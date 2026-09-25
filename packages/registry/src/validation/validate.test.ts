/**
 * Registry validation (docs/guardrails.md 2.6, rules 1, 3, 4, 6, 7 and 8;
 * prompt 3 section 5.2 "Registry values"). Every entry below is synthetic and
 * exists only in this test.
 */
import { describe, expect, it } from 'vitest';
import { PROPOSED_SETTINGS } from './policy';
import type { RegistryFieldDefinition, RegistryBundle } from './schema';
import { validateRegistry } from './validate';

type FieldInput = Omit<RegistryFieldDefinition, 'affects'> & { affects?: RegistryFieldDefinition['affects'] };

function field(overrides: Partial<FieldInput> & { key: string }): RegistryFieldDefinition {
  return {
    label: `Label of ${overrides.key}`,
    subject: 'building',
    kind: 'enum',
    options: ['alpha', 'beta'],
    estimation: 'forbidden',
    criticality: 'optional',
    impactRank: 50,
    confirmBy: 'engineer',
    affects: [{ output: 'unit.output', via: 'formula:unitFormula@1' }],
    ...overrides,
  };
}

function bundle(overrides: Partial<RegistryBundle> = {}): RegistryBundle {
  return {
    id: 'unit-registry',
    version: '1',
    units: [{ code: 'm2', symbol: 'm²', dimension: 'area' }],
    fields: [field({ key: 'building.choice' })],
    questions: [{ id: 'q.choice', kind: 'question', fieldKeys: ['building.choice'] }],
    formulas: [
      { id: 'unitFormula', version: '1', inputs: ['building.choice'], outputs: ['unit.output'], unknownPolicy: 'refuse' },
    ],
    templateSlots: [],
    datasets: [],
    settings: PROPOSED_SETTINGS,
    ...overrides,
  };
}

/** Rule 7's four required fields, each named by a synthetic template slot, so a production-scope bundle meets the floor. */
const REQUIRED_FIELDS: RegistryFieldDefinition[] = (
  [
    ['project.unitName', 'project_name'],
    ['project.unitType', 'project_type'],
    ['project.unitCity', 'city'],
    ['project.unitCountry', 'country'],
  ] as const
).map(([key, slot], position) => ({
  key,
  label: `Label of ${key}`,
  subject: 'project',
  kind: 'text',
  estimation: 'forbidden',
  criticality: 'required',
  requiredSlot: slot,
  ...(slot === 'project_name' ? { identity: true } : {}),
  impactRank: 90 + position,
  confirmBy: 'owner',
  confirmByBasis: 'identity',
  affects: [{ output: 'unit.required', via: 'template:unit.required' }],
}));

/** The bundle with each required slot it does not hold added, so each test reads only its own problem. */
function withRequired(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;
  const record = input as Partial<RegistryBundle>;
  if (!Array.isArray(record.fields)) return input;
  const held = new Set(record.fields.map((item) => item.requiredSlot));
  const missing = REQUIRED_FIELDS.filter((item) => !held.has(item.requiredSlot));
  if (missing.length === 0) return input;
  return {
    ...record,
    fields: [...record.fields, ...missing],
    templateSlots: [...(record.templateSlots ?? []), { id: 'unit.required', reads: missing.map((item) => item.key) }],
  };
}

function codes(input: unknown, scope: 'production' | 'test' = 'production'): string[] {
  return validateRegistry(withRequired(input), { scope }).problems.map((problem) => problem.code);
}

describe('the registry floor (phase 0 review, finding 17)', () => {
  it('fails a production registry that lacks any of rule 7\'s four required fields, and passes the test scope', () => {
    const input = bundle();
    const found = validateRegistry(input, { scope: 'production' }).problems.filter((problem) => problem.code === 'required-field-missing');
    expect(found.map((problem) => /required slot (\w+)/.exec(problem.message)?.[1])).toEqual(['project_name', 'project_type', 'city', 'country']);
    expect(validateRegistry(input, { scope: 'test' }).problems.map((problem) => problem.code)).not.toContain('required-field-missing');
    expect(codes(input)).not.toContain('required-field-missing');
  });

  it('fails qualifiers that list the unknown qualifier, repeat one, or sit on a field that requires none', () => {
    const area = (overrides: Partial<FieldInput>): RegistryFieldDefinition =>
      field({ key: 'building.choice', kind: 'quantity', options: undefined, unit: 'm2', dimension: 'area', qualifierRequired: true, ...overrides });
    expect(codes(bundle({ fields: [area({ qualifiers: ['gross_total'] })] }))).toEqual([]);
    expect(codes(bundle({ fields: [area({ qualifiers: ['gross_total', 'unknown'] })] }))).toContain('qualifiers-invalid');
    expect(codes(bundle({ fields: [area({ qualifiers: ['gross_total', 'gross_total'] })] }))).toContain('qualifiers-invalid');
    expect(codes(bundle({ fields: [area({ qualifiers: ['gross_total'], qualifierRequired: false })] }))).toContain('qualifiers-invalid');
  });
});

describe('validateRegistry', () => {
  it('passes a registry whose every affects entry names a declared consumer that reads the field', () => {
    const result = validateRegistry(withRequired(bundle()), { scope: 'production' });
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.registry?.fields).toHaveLength(5);
  });

  it('passes an affects entry that names a template slot reading the field', () => {
    const input = bundle({
      fields: [field({ key: 'building.choice', affects: [{ output: 'proposal.scopeLine', via: 'template:proposal.scopeLine' }] })],
      formulas: [],
      templateSlots: [{ id: 'proposal.scopeLine', reads: ['building.choice'] }],
    });
    expect(codes(input)).toEqual([]);
  });

  it('G6-2 shape: fails a field whose affects lists only "proposal"', () => {
    const input = bundle({ fields: [field({ key: 'building.choice', affects: [{ output: 'proposal', via: 'proposal' }] })] });
    expect(codes(input)).toContain('affects-not-concrete');
  });

  it('fails a field with no affects at all (rule 6: every field names what it changes)', () => {
    expect(codes(bundle({ fields: [field({ key: 'building.choice', affects: [] })] }))).toContain('affects-empty');
  });

  it('fails an affects entry whose formula signature is not declared', () => {
    const input = bundle({
      fields: [field({ key: 'building.choice', affects: [{ output: 'unit.output', via: 'formula:missingFormula@1' }] })],
    });
    expect(codes(input)).toContain('affects-unknown-consumer');
  });

  it('fails an affects entry whose formula does not read the field', () => {
    const input = bundle({
      fields: [field({ key: 'building.choice' }), field({ key: 'building.other', impactRank: 51 })],
      questions: [],
      formulas: [{ id: 'unitFormula', version: '1', inputs: ['building.choice'], outputs: ['unit.output'] }],
    });
    // building.other claims formula:unitFormula@1, whose inputs do not include it.
    expect(codes(input)).toContain('affects-consumer-does-not-read-field');
  });

  it('fails an affects entry naming an output the formula does not declare', () => {
    const input = bundle({
      fields: [field({ key: 'building.choice', affects: [{ output: 'unit.somethingElse', via: 'formula:unitFormula@1' }] })],
    });
    expect(codes(input)).toContain('affects-output-not-declared');
  });

  it('fails a question naming a field the registry does not declare', () => {
    const input = bundle({ questions: [{ id: 'q.ghost', kind: 'question', fieldKeys: ['building.ghost'] }] });
    expect(codes(input)).toContain('question-unknown-field');
  });

  it('fails a question claiming an effect its field does not declare', () => {
    const input = bundle({
      questions: [
        {
          id: 'q.choice',
          kind: 'question',
          fieldKeys: ['building.choice'],
          affects: [{ output: 'unit.other', via: 'formula:otherFormula@1' }],
        },
      ],
    });
    expect(codes(input)).toContain('question-affects-not-on-field');
  });

  it('fails an enum field with fewer than two options', () => {
    expect(codes(bundle({ fields: [field({ key: 'building.choice', options: ['alpha'] })] }))).toContain('options-missing');
  });

  describe('estimation (rule 1; prompt 3 5.2)', () => {
    it('fails estimation allowed with no estimated method named by the guardrails', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', estimation: 'allowed' })] }))).toContain(
        'estimation-without-method',
      );
    });

    it('passes estimation allowed for a method the guardrails name', () => {
      const input = bundle({ fields: [field({ key: 'building.choice', estimation: 'allowed', estimatedMethod: 'points' })] });
      expect(codes(input)).toEqual([]);
    });

    it('rejects a method the guardrails do not name', () => {
      const input = bundle({
        fields: [{ ...field({ key: 'building.choice', estimation: 'allowed' }), estimatedMethod: 'benchmark' } as unknown as RegistryFieldDefinition],
      });
      expect(codes(input)).toContain('schema');
    });
  });

  describe('tolerance and plausible ranges (rules 4 and 8; prompt 3 5.2)', () => {
    const tolerant = field({ key: 'building.choice', tolerance: { relative: 0.5, reason: 'unit test' } });
    const plausible = field({ key: 'building.choice', plausible: { low: 1, high: 2, basis: 'unit test' } });

    it('fails a tolerance in the production registry that carries no approval reference', () => {
      expect(codes(bundle({ fields: [tolerant] }))).toContain('tolerance-without-approval');
    });

    it('fails a plausible range in the production registry that carries no approval reference', () => {
      expect(codes(bundle({ fields: [plausible] }))).toContain('plausible-without-approval');
    });

    it('allows both in a TEST registry, where cases need them', () => {
      expect(codes(bundle({ id: 'TEST-unit', fields: [tolerant] }), 'test')).toEqual([]);
      expect(codes(bundle({ id: 'TEST-unit', fields: [plausible] }), 'test')).toEqual([]);
    });

    it('leaves the reference itself to the loosening check', () => {
      const approved = field({
        key: 'building.choice',
        tolerance: { relative: 0.5, reason: 'unit test' },
        approvals: { tolerance: 'guardrails-changelog:9.9' },
      });
      expect(codes(bundle({ fields: [approved] }))).toEqual([]);
    });

    it('fails minorForTotals set with no approval reference', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', minorForTotals: true })] }))).toContain(
        'minor-for-totals-without-approval',
      );
    });
  });

  describe('criticality (rule 7; prompt 3 5.2)', () => {
    it('fails required on a field outside the closed list', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', criticality: 'required' })] }))).toContain(
        'required-outside-closed-list',
      );
    });

    it('passes required on a field that names its slot in the closed list', () => {
      const input = bundle({
        fields: [field({ key: 'project.name', subject: 'project', kind: 'text', options: undefined, criticality: 'required', requiredSlot: 'project_name', confirmBy: 'owner', confirmByBasis: 'identity' })],
        formulas: [{ id: 'unitFormula', version: '1', inputs: ['project.name'], outputs: ['unit.output'] }],
        questions: [],
      });
      expect(codes(input)).toEqual([]);
    });

    it('fails a required slot used twice', () => {
      const one = field({ key: 'project.city', subject: 'project', kind: 'text', options: undefined, criticality: 'required', requiredSlot: 'city', confirmBy: 'owner', confirmByBasis: 'identity', impactRank: 1 });
      const two = { ...one, key: 'project.town', impactRank: 2 };
      const input = bundle({
        fields: [one, two],
        formulas: [{ id: 'unitFormula', version: '1', inputs: ['project.city', 'project.town'], outputs: ['unit.output'] }],
        questions: [],
      });
      expect(codes(input)).toContain('slot-duplicate');
    });

    it('fails a required slot on a field whose criticality is lower (lowering a criticality)', () => {
      const input = bundle({ fields: [field({ key: 'building.choice', requiredSlot: 'country' })] });
      expect(codes(input)).toContain('slot-criticality-mismatch');
    });

    it('fails first_estimate outside the proposed first-estimate set', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', criticality: 'first_estimate' })] }))).toContain(
        'first-estimate-outside-set',
      );
    });

    it('allows systems_in_scope on several decision fields, one per option', () => {
      const system = (key: string, rank: number): RegistryFieldDefinition =>
        field({ key, subject: 'project', kind: 'decision', options: ['include', 'exclude'], criticality: 'first_estimate', firstEstimateSlot: 'systems_in_scope', confirmBy: 'owner', confirmByBasis: 'owner_choice', impactRank: rank });
      const input = bundle({
        fields: [system('project.system.a', 1), system('project.system.b', 2)],
        formulas: [{ id: 'unitFormula', version: '1', inputs: ['project.system.a', 'project.system.b'], outputs: ['unit.output'] }],
        questions: [],
      });
      expect(codes(input)).toEqual([]);
    });
  });

  describe('confirmBy and identity (rules 3 and 6)', () => {
    it('fails confirmBy owner with no rule 3 basis', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', confirmBy: 'owner' })] }))).toContain(
        'confirm-by-without-basis',
      );
    });

    it('fails confirmBy either with no rule 3 basis', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', confirmBy: 'either' })] }))).toContain(
        'confirm-by-without-basis',
      );
    });

    it('passes confirmBy owner for use and occupancy', () => {
      const input = bundle({ fields: [field({ key: 'building.choice', confirmBy: 'owner', confirmByBasis: 'use_and_occupancy' })] });
      expect(codes(input)).toEqual([]);
    });

    it('fails an identity field that is not the project name', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', identity: true })] }))).toContain('identity-outside-list');
    });

    // Phase 1 review, round 3: a decision is an owner choice (2.6), and choices belong to the owner (rule 3).
    const decision = (overrides: Partial<FieldInput>): RegistryFieldDefinition =>
      field({ key: 'building.choice', kind: 'decision', options: ['include', 'exclude'], confirmBy: 'owner', confirmByBasis: 'owner_choice', ...overrides });

    it('passes a decision the owner confirms as their own choice', () => {
      expect(codes(bundle({ fields: [decision({})] }))).toEqual([]);
    });

    it.each([
      ['engineer', { confirmBy: 'engineer' as const, confirmByBasis: undefined }],
      ['either', { confirmBy: 'either' as const }],
    ])('fails a decision whose confirmBy is %s', (_label, overrides) => {
      expect(codes(bundle({ fields: [decision(overrides)] }))).toContain('owner-choice-not-owner');
    });

    it('fails a decision resting on another rule 3 fact than the owner\'s own choice', () => {
      expect(codes(bundle({ fields: [decision({ confirmByBasis: 'use_and_occupancy' })] }))).toContain('owner-choice-not-owner');
    });

    it('fails an owner_choice field that an engineer or either may settle, whatever its kind', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', confirmBy: 'either', confirmByBasis: 'owner_choice' })] }))).toContain('owner-choice-not-owner');
      expect(codes(bundle({ fields: [field({ key: 'building.choice', confirmBy: 'engineer', confirmByBasis: 'owner_choice' })] }))).toContain('owner-choice-not-owner');
      expect(codes(bundle({ fields: [field({ key: 'building.choice', confirmBy: 'owner', confirmByBasis: 'owner_choice' })] }))).toEqual([]);
    });
  });

  describe('reference datasets and TEST entries (rule 1, 2.1; prompt 3 5.4)', () => {
    it('fails a reference dataset the registry does not declare', () => {
      expect(codes(bundle({ fields: [field({ key: 'building.choice', referenceDatasets: ['ghost-dataset'] })] }))).toContain(
        'reference-dataset-undeclared',
      );
    });

    it('fails a TEST formula, dataset or registry id in the production registry', () => {
      const input = bundle({
        id: 'TEST-registry',
        formulas: [{ id: 'unitFormulaTEST', version: '1', inputs: ['building.choice'], outputs: ['unit.output'] }],
        fields: [field({ key: 'building.choice', affects: [{ output: 'unit.output', via: 'formula:unitFormulaTEST@1' }] })],
        datasets: [{ id: 'TEST-dataset', version: '1' }],
      });
      const found = validateRegistry(withRequired(input), { scope: 'production' }).problems.filter((p) => p.code === 'test-id-in-production');
      expect(found.map((p) => p.at).sort()).toEqual(['datasets[0].id', 'formulas[0].id', 'id']);
    });

    it('allows TEST ids in the test scope', () => {
      const input = bundle({
        id: 'TEST-registry',
        formulas: [{ id: 'unitFormulaTEST', version: '1', inputs: ['building.choice'], outputs: ['unit.output'] }],
        fields: [field({ key: 'building.choice', affects: [{ output: 'unit.output', via: 'formula:unitFormulaTEST@1' }] })],
      });
      expect(codes(input, 'test')).toEqual([]);
    });
  });

  describe('units (rule 8, 2.7)', () => {
    const quantity = (overrides: Partial<FieldInput>): RegistryFieldDefinition =>
      field({ key: 'building.choice', kind: 'quantity', options: undefined, unit: 'm2', dimension: 'area', ...overrides });

    it('passes a quantity whose unit exists with the declared dimension', () => {
      expect(codes(bundle({ fields: [quantity({})], questions: [] }))).toEqual([]);
    });

    it('fails a quantity with no unit', () => {
      expect(codes(bundle({ fields: [quantity({ unit: undefined })], questions: [] }))).toContain('unit-missing');
    });

    it('fails a unit the registry does not hold', () => {
      expect(codes(bundle({ fields: [quantity({ unit: 'furlong' })], questions: [] }))).toContain('unit-unknown');
    });

    it('fails a dimension that differs from the unit dimension', () => {
      expect(codes(bundle({ fields: [quantity({ dimension: 'energy' })], questions: [] }))).toContain('unit-dimension-mismatch');
    });

    // Phase 1 review, round 3: the bundle carries the closed unit registry as it is (2.7; ADR 0017).
    it('fails, in the production scope, a bundle unit that departs from the closed registry', () => {
      const units = [{ code: 'm2', symbol: 'm²', dimension: 'area' }, { code: 'kVA', symbol: 'kVA', dimension: 'power' }];
      expect(codes(bundle({ units, fields: [quantity({})], questions: [] }))).toContain('unit-not-in-closed-registry');
      expect(codes(bundle({ units: [{ code: 'TEST-unit', symbol: 'TEST', dimension: 'area' }, ...units.slice(0, 1)], fields: [quantity({})], questions: [] }))).toContain(
        'unit-not-in-closed-registry',
      );
      expect(codes(bundle({ units, fields: [quantity({})], questions: [] }), 'test')).not.toContain('unit-not-in-closed-registry');
    });

    // Phase 1 review, round 3: a count is a whole number, zero or more (2.6 kind count; rule 8).
    const count = (overrides: Partial<FieldInput>): RegistryFieldDefinition =>
      field({ key: 'building.choice', kind: 'count', options: undefined, unit: 'count', dimension: 'count', valueShape: 'non_negative_integer', ...overrides });
    const countUnits = [{ code: 'count', symbol: 'count', dimension: 'count' }];

    it('passes a count that declares its whole-number shape', () => {
      expect(codes(bundle({ units: countUnits, fields: [count({})], questions: [] }))).toEqual([]);
    });

    it('fails a count that declares no value shape, in every scope', () => {
      expect(codes(bundle({ units: countUnits, fields: [count({ valueShape: undefined })], questions: [] }))).toContain('value-shape-missing');
      expect(codes(bundle({ units: countUnits, fields: [count({ valueShape: undefined })], questions: [] }), 'test')).toContain('value-shape-missing');
    });

    it('fails a value shape on a field that is not a count', () => {
      expect(codes(bundle({ fields: [quantity({ valueShape: 'non_negative_integer' })], questions: [] }))).toContain('value-shape-invalid');
    });
  });

  it('fails two fields with the same impactRank (ordering must be total)', () => {
    const input = bundle({
      fields: [field({ key: 'building.choice', impactRank: 3 }), field({ key: 'building.other', impactRank: 3 })],
      formulas: [{ id: 'unitFormula', version: '1', inputs: ['building.choice', 'building.other'], outputs: ['unit.output'] }],
    });
    expect(codes(input)).toContain('impact-rank-duplicate');
  });

  it('fails a formula input that names no declared field', () => {
    const input = bundle({
      formulas: [{ id: 'unitFormula', version: '1', inputs: ['building.choice', 'building.ghost'], outputs: ['unit.output'] }],
    });
    expect(codes(input)).toContain('formula-input-undeclared');
  });

  it('fails a duplicate field key', () => {
    expect(codes(bundle({ fields: [field({ key: 'building.choice' }), field({ key: 'building.choice', impactRank: 9 })] }))).toContain(
      'duplicate',
    );
  });

  describe('approver settings (rules 3, 4, 5 and 7; D-53)', () => {
    it('fails a raised confirmation budget with no approval reference', () => {
      const settings = { ...PROPOSED_SETTINGS, confirmationBudget: { ...PROPOSED_SETTINGS.confirmationBudget, value: 8 } };
      expect(codes(bundle({ settings }))).toContain('setting-differs-without-approval');
    });

    it('fails a lowered confirmation budget with no approval reference (the approver sets N)', () => {
      const settings = { ...PROPOSED_SETTINGS, confirmationBudget: { ...PROPOSED_SETTINGS.confirmationBudget, value: 6 } };
      expect(codes(bundle({ settings }))).toContain('setting-differs-without-approval');
    });

    it('fails a setting marked approved without a reference', () => {
      const settings = { ...PROPOSED_SETTINGS, confirmationBudget: { ...PROPOSED_SETTINGS.confirmationBudget, status: 'approved' as const } };
      expect(codes(bundle({ settings }))).toContain('setting-approved-without-reference');
    });

    it('fails a required set missing one of the four fields', () => {
      const settings = { ...PROPOSED_SETTINGS, requiredSet: { ...PROPOSED_SETTINGS.requiredSet, members: ['project_name', 'project_type', 'city'] as const } };
      expect(codes(bundle({ settings: settings as unknown as RegistryBundle['settings'] }))).toContain(
        'setting-differs-without-approval',
      );
    });
  });

  it('reports schema problems with their path instead of throwing', () => {
    const result = validateRegistry({ ...bundle(), surprise: true }, { scope: 'production' });
    expect(result.ok).toBe(false);
    expect(result.registry).toBeUndefined();
    expect(result.problems[0]?.code).toBe('schema');
  });
});
