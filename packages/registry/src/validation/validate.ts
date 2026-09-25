/**
 * Registry validation (docs/guardrails.md 2.6 and rule 6 "Enforced by":
 * "Registry validation checks that each named consumer exists and reads the
 * field"; prompt 3 5.2 "Registry values": the strictest value, never an
 * invented one). It runs before a registry version is loaded and in CI.
 *
 * The production scope refuses what only a TEST registry may hold: TEST
 * formulas and datasets, and tolerances or plausible ranges without an
 * approval reference. Whether a reference resolves is the loosening check's
 * job (./loosening.ts), because it needs docs/guardrails.md.
 */
import {
  MULTI_FIELD_FIRST_ESTIMATE_SLOTS,
  PROPOSED_SETTINGS,
  SETTING_NAMES,
  type SettingName,
} from './policy';
import {
  formulaRef,
  parseVia,
  registrySchema,
  templateRef,
  type FieldDefinition,
  type FormulaSignature,
  type RegistryBundle,
  type TemplateSlot,
} from './schema';

export type RegistryScope = 'production' | 'test';

export type RegistryProblemCode =
  | 'schema'
  | 'duplicate'
  | 'test-id-in-production'
  | 'affects-empty'
  | 'affects-not-concrete'
  | 'affects-unknown-consumer'
  | 'affects-consumer-does-not-read-field'
  | 'affects-output-not-declared'
  | 'question-unknown-field'
  | 'question-affects-not-on-field'
  | 'options-missing'
  | 'estimation-without-method'
  | 'tolerance-without-approval'
  | 'plausible-without-approval'
  | 'minor-for-totals-without-approval'
  | 'required-outside-closed-list'
  | 'first-estimate-outside-set'
  | 'slot-criticality-mismatch'
  | 'slot-duplicate'
  | 'confirm-by-without-basis'
  | 'identity-outside-list'
  | 'reference-dataset-undeclared'
  | 'impact-rank-duplicate'
  | 'unit-missing'
  | 'unit-unknown'
  | 'unit-dimension-mismatch'
  | 'formula-input-undeclared'
  | 'template-read-undeclared'
  | 'setting-differs-without-approval'
  | 'setting-approved-without-reference';

export interface RegistryProblem {
  code: RegistryProblemCode;
  /** Where in the registry, as a path such as `fields[3].affects[0]`. */
  at: string;
  message: string;
}

export interface RegistryValidation {
  ok: boolean;
  problems: RegistryProblem[];
  /** The parsed registry, when its shape is valid. */
  registry: RegistryBundle | undefined;
}

export interface ValidateOptions {
  scope: RegistryScope;
}

/** Test-only ids carry "TEST" (prompt 3 5.4, "Test-only datasets"). */
export function isTestId(id: string): boolean {
  return id.includes('TEST');
}

export function validateRegistry(input: unknown, options: ValidateOptions): RegistryValidation {
  const parsed = registrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      registry: undefined,
      problems: parsed.error.issues.map((issue) => ({
        code: 'schema',
        at: issue.path.length === 0 ? '(root)' : issue.path.map(String).join('.'),
        message: issue.message,
      })),
    };
  }
  const registry = parsed.data;
  const problems: RegistryProblem[] = [];
  const add = (code: RegistryProblemCode, at: string, message: string): void => {
    problems.push({ code, at, message });
  };

  const formulas = new Map<string, FormulaSignature>();
  registry.formulas.forEach((formula, position) => {
    const ref = formulaRef(formula);
    if (formulas.has(ref)) add('duplicate', `formulas[${position}]`, `${ref} is declared twice`);
    formulas.set(ref, formula);
  });
  const slots = new Map<string, TemplateSlot>();
  registry.templateSlots.forEach((slot, position) => {
    const ref = templateRef(slot);
    if (slots.has(ref)) add('duplicate', `templateSlots[${position}]`, `${ref} is declared twice`);
    slots.set(ref, slot);
  });
  const fields = new Map<string, FieldDefinition>();
  registry.fields.forEach((field, position) => {
    if (fields.has(field.key)) add('duplicate', `fields[${position}]`, `field ${field.key} is declared twice`);
    fields.set(field.key, field);
  });
  const datasetIds = new Set<string>();
  registry.datasets.forEach((dataset, position) => {
    const key = `${dataset.id}@${dataset.version}`;
    if (datasetIds.has(key)) add('duplicate', `datasets[${position}]`, `dataset ${key} is declared twice`);
    datasetIds.add(key);
  });
  const declaredDatasets = new Set(registry.datasets.map((dataset) => dataset.id));
  const units = new Map(registry.units.map((unit) => [unit.code, unit]));

  if (options.scope === 'production') {
    const testIds: Array<[string, string]> = [
      ['id', registry.id],
      ...registry.formulas.map((formula, i): [string, string] => [`formulas[${i}].id`, formula.id]),
      ...registry.datasets.map((dataset, i): [string, string] => [`datasets[${i}].id`, dataset.id]),
      ...registry.templateSlots.map((slot, i): [string, string] => [`templateSlots[${i}].id`, slot.id]),
      ...registry.fields.map((field, i): [string, string] => [`fields[${i}].key`, field.key]),
      ...registry.questions.map((question, i): [string, string] => [`questions[${i}].id`, question.id]),
    ];
    for (const [at, id] of testIds) {
      if (isTestId(id)) {
        add('test-id-in-production', at, `${id} is a TEST entry; TEST formulas and datasets load only inside the test runner (prompt 3 5.4)`);
      }
    }
  }

  const ranks = new Map<number, string>();
  const requiredSlotsSeen = new Map<string, string>();
  const firstEstimateSlotsSeen = new Map<string, string>();
  const requiredMembers = new Set<string>(registry.settings.requiredSet.members);
  const firstEstimateMembers = new Set<string>(registry.settings.firstEstimateSet.members);
  const identityMembers = new Set<string>(registry.settings.identityList.members);

  registry.fields.forEach((field, position) => {
    const at = `fields[${position}]`;
    const name = field.key;

    if (field.affects.length === 0) {
      add('affects-empty', `${at}.affects`, `${name} names no output it changes (rule 6: every field names what it changes)`);
    }
    field.affects.forEach((entry, entryPosition) => {
      const entryAt = `${at}.affects[${entryPosition}]`;
      const consumer = parseVia(entry.via);
      if (consumer === undefined) {
        add(
          'affects-not-concrete',
          entryAt,
          `${name}: "${entry.via}" is not a formula id or a template slot; a category such as "proposal" is not enough (rule 6; G6-2)`,
        );
        return;
      }
      if (consumer.kind === 'formula') {
        const formula = formulas.get(consumer.ref);
        if (formula === undefined) {
          add('affects-unknown-consumer', entryAt, `${name}: ${consumer.ref} is not a declared formula signature`);
          return;
        }
        if (!formula.inputs.includes(name)) {
          add('affects-consumer-does-not-read-field', entryAt, `${name}: ${consumer.ref} does not read ${name}`);
        }
        if (!formula.outputs.includes(entry.output)) {
          add('affects-output-not-declared', entryAt, `${name}: ${consumer.ref} declares no output ${entry.output}`);
        }
        return;
      }
      const slot = slots.get(consumer.ref);
      if (slot === undefined) {
        add('affects-unknown-consumer', entryAt, `${name}: ${consumer.ref} is not a declared template slot`);
        return;
      }
      if (!slot.reads.includes(name)) {
        add('affects-consumer-does-not-read-field', entryAt, `${name}: ${consumer.ref} does not read ${name}`);
      }
      if (entry.output !== slot.id) {
        add('affects-output-not-declared', entryAt, `${name}: the output of ${consumer.ref} is ${slot.id}, not ${entry.output}`);
      }
    });

    if ((field.kind === 'enum' || field.kind === 'decision') && (field.options === undefined || new Set(field.options).size < 2)) {
      add('options-missing', `${at}.options`, `${name} is a ${field.kind} field with fewer than two options`);
    }

    if (field.estimation === 'allowed' && field.estimatedMethod === undefined) {
      add(
        'estimation-without-method',
        `${at}.estimation`,
        `${name} allows estimation but names no method the guardrails name as estimated (2.1: points, CAPEX, consumption; rule 10: savings, payback, ROI)`,
      );
    }

    if (options.scope === 'production') {
      if (field.tolerance !== undefined && field.approvals?.tolerance === undefined) {
        add(
          'tolerance-without-approval',
          `${at}.tolerance`,
          `${name} has a tolerance with no approval reference: no field has a tolerance until the approver approves one (rule 4; prompt 3 5.2; D-93)`,
        );
      }
      if (field.plausible !== undefined && field.approvals?.plausible === undefined) {
        add(
          'plausible-without-approval',
          `${at}.plausible`,
          `${name} has a plausible range with no approval reference: the plausibility check waits for SOVITECH ranges (rule 8; prompt 3 5.2; D-93)`,
        );
      }
      if (field.minorForTotals === true && field.approvals?.minorForTotals === undefined) {
        add(
          'minor-for-totals-without-approval',
          `${at}.minorForTotals`,
          `${name} is marked minorForTotals with no approval reference (rule 1, "Material exclusions")`,
        );
      }
    }

    if (field.criticality === 'required' && (field.requiredSlot === undefined || !requiredMembers.has(field.requiredSlot))) {
      add(
        'required-outside-closed-list',
        `${at}.criticality`,
        `${name} is required but is not one of the four fields of rule 7's closed list (project name, project type, city, country)`,
      );
    }
    if (field.requiredSlot !== undefined) {
      if (field.criticality !== 'required') {
        add('slot-criticality-mismatch', `${at}.requiredSlot`, `${name} holds the required slot ${field.requiredSlot} but its criticality is ${field.criticality}`);
      }
      const holder = requiredSlotsSeen.get(field.requiredSlot);
      if (holder !== undefined) add('slot-duplicate', `${at}.requiredSlot`, `${name} and ${holder} both hold the required slot ${field.requiredSlot}`);
      requiredSlotsSeen.set(field.requiredSlot, name);
    }
    if (
      field.criticality === 'first_estimate' &&
      (field.firstEstimateSlot === undefined || !firstEstimateMembers.has(field.firstEstimateSlot))
    ) {
      add(
        'first-estimate-outside-set',
        `${at}.criticality`,
        `${name} is first_estimate but is not in the first-estimate set (rule 7, proposed: building type, gross floor area, systems in scope)`,
      );
    }
    if (field.firstEstimateSlot !== undefined) {
      if (field.criticality !== 'first_estimate') {
        add(
          'slot-criticality-mismatch',
          `${at}.firstEstimateSlot`,
          `${name} holds the first-estimate slot ${field.firstEstimateSlot} but its criticality is ${field.criticality}`,
        );
      }
      const holder = firstEstimateSlotsSeen.get(field.firstEstimateSlot);
      if (holder !== undefined && !MULTI_FIELD_FIRST_ESTIMATE_SLOTS.includes(field.firstEstimateSlot)) {
        add('slot-duplicate', `${at}.firstEstimateSlot`, `${name} and ${holder} both hold the first-estimate slot ${field.firstEstimateSlot}`);
      }
      firstEstimateSlotsSeen.set(field.firstEstimateSlot, name);
    }

    if (field.confirmBy !== 'engineer' && field.confirmByBasis === undefined) {
      add(
        'confirm-by-without-basis',
        `${at}.confirmBy`,
        `${name} has confirmBy ${field.confirmBy} but names no owner fact of rule 3 (identity, use and occupancy, whether the building has something, their own choices); every other field has confirmBy engineer`,
      );
    }

    if (field.identity === true && (field.requiredSlot === undefined || !identityMembers.has(field.requiredSlot))) {
      add('identity-outside-list', `${at}.identity`, `${name} is an identity field, but the identity list holds only the project name (rule 6)`);
    }

    (field.referenceDatasets ?? []).forEach((dataset, datasetPosition) => {
      if (!declaredDatasets.has(dataset)) {
        add('reference-dataset-undeclared', `${at}.referenceDatasets[${datasetPosition}]`, `${name} names the dataset ${dataset}, which the registry does not declare`);
      }
    });

    const rankHolder = ranks.get(field.impactRank);
    if (rankHolder !== undefined) {
      add('impact-rank-duplicate', `${at}.impactRank`, `${name} and ${rankHolder} share impactRank ${field.impactRank}; the order of questions must be total`);
    }
    ranks.set(field.impactRank, name);

    if (field.kind === 'quantity' && field.unit === undefined) {
      add('unit-missing', `${at}.unit`, `${name} is a quantity with no unit (rule 8)`);
    }
    if (field.unit !== undefined) {
      const unit = units.get(field.unit);
      if (unit === undefined) {
        add('unit-unknown', `${at}.unit`, `${name}: the unit ${field.unit} is not in the unit registry (2.7)`);
      } else if (field.dimension !== undefined && unit.dimension !== field.dimension) {
        add(
          'unit-dimension-mismatch',
          `${at}.dimension`,
          `${name}: the unit ${field.unit} measures ${unit.dimension}, not ${field.dimension} (2.7, the dimension check)`,
        );
      }
    }
  });

  registry.formulas.forEach((formula, position) => {
    formula.inputs.forEach((input, inputPosition) => {
      if (!fields.has(input)) {
        add('formula-input-undeclared', `formulas[${position}].inputs[${inputPosition}]`, `${formulaRef(formula)} reads ${input}, which is not a declared field`);
      }
    });
  });
  registry.templateSlots.forEach((slot, position) => {
    slot.reads.forEach((read, readPosition) => {
      if (!fields.has(read)) {
        add('template-read-undeclared', `templateSlots[${position}].reads[${readPosition}]`, `${templateRef(slot)} reads ${read}, which is not a declared field`);
      }
    });
  });

  const questionIds = new Set<string>();
  registry.questions.forEach((question, position) => {
    const at = `questions[${position}]`;
    if (questionIds.has(question.id)) add('duplicate', at, `question ${question.id} is declared twice`);
    questionIds.add(question.id);
    const questionFields: FieldDefinition[] = [];
    question.fieldKeys.forEach((key, keyPosition) => {
      const field = fields.get(key);
      if (field === undefined) {
        add('question-unknown-field', `${at}.fieldKeys[${keyPosition}]`, `${question.id} names ${key}, which is not a declared field`);
      } else {
        questionFields.push(field);
      }
    });
    (question.affects ?? []).forEach((entry, entryPosition) => {
      const onField = questionFields.some((field) => field.affects.some((own) => own.output === entry.output && own.via === entry.via));
      if (!onField) {
        add(
          'question-affects-not-on-field',
          `${at}.affects[${entryPosition}]`,
          `${question.id} claims ${entry.output} via ${entry.via}, which none of its fields declares (questions inherit their field's affects, rule 6)`,
        );
      }
    });
  });

  validateSettings(registry, options, add);

  return { ok: problems.length === 0, problems, registry };
}

/** Whether a setting holds the value the guardrails state (the approval status aside). */
function sameSetting(name: SettingName, registry: RegistryBundle): boolean {
  const { settings } = registry;
  switch (name) {
    case 'confirmationBudget':
      return settings.confirmationBudget.value === PROPOSED_SETTINGS.confirmationBudget.value;
    case 'calibrationThreshold':
      return (
        settings.calibrationThreshold.correctionRatePercent === PROPOSED_SETTINGS.calibrationThreshold.correctionRatePercent &&
        settings.calibrationThreshold.window === PROPOSED_SETTINGS.calibrationThreshold.window
      );
    case 'documentStageOrder':
      return JSON.stringify(settings.documentStageOrder.tiers) === JSON.stringify(PROPOSED_SETTINGS.documentStageOrder.tiers);
    case 'firstEstimateSet':
    case 'requiredSet':
    case 'identityList':
      return JSON.stringify(settings[name].members) === JSON.stringify(PROPOSED_SETTINGS[name].members);
  }
}

function validateSettings(
  registry: RegistryBundle,
  options: ValidateOptions,
  add: (code: RegistryProblemCode, at: string, message: string) => void,
): void {
  for (const name of SETTING_NAMES) {
    const setting = registry.settings[name];
    if (setting.status === 'approved' && setting.approvalRef === undefined) {
      add('setting-approved-without-reference', `settings.${name}.status`, `${name} is marked approved but carries no approval reference`);
    }
    if (options.scope === 'production' && !sameSetting(name, registry) && setting.approvalRef === undefined) {
      add(
        'setting-differs-without-approval',
        `settings.${name}`,
        `${name} differs from the value the guardrails state (${PROPOSED_SETTINGS[name].source}) and carries no approval reference; the approver sets it (D-53)`,
      );
    }
  }
}
