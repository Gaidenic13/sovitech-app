/**
 * The shape of a registry version: fields (docs/guardrails.md 2.6), units
 * (2.7), questions with the outputs they change (rules 5 and 6), declared
 * formula signatures, proposal template slots, reference datasets, and the
 * approver settings. Phase 1 fills the production registry; phase 0 defines
 * the shape and its validation.
 */
import { FIELD_KINDS, SUBJECT_KINDS, type FieldDefinition } from '@sovitech/domain';
import { z } from 'zod';
import {
  DOCUMENT_STAGES,
  ESTIMATED_METHODS,
  FIRST_ESTIMATE_SLOTS,
  OWNER_FACT_BASES,
  REQUIRED_SLOTS,
} from './policy';

/**
 * 2.6's FieldDefinition is declared once, in @sovitech/domain, which the derive
 * function and the verifier read; the registry implements it and re-exports it
 * from there rather than declaring it again. The registry's own extras live on
 * `RegistryFieldDefinition` below.
 */
export type { FieldDefinition } from '@sovitech/domain';

/** 2.2's subject kinds and 2.6's field kinds, as the domain declares them. */
export const SUBJECTS = SUBJECT_KINDS;
export { FIELD_KINDS };
export const CRITICALITIES = ['required', 'first_estimate', 'for_quotation', 'optional'] as const;
export const CONFIRM_BY = ['owner', 'engineer', 'either'] as const;
export const UNKNOWN_POLICIES = ['refuse', 'exclude_and_count', 'range_over_options'] as const;

/**
 * Properties section 10 names as loosening-sensitive, plus those that let more
 * values through in its sense ("Any change that lets more values through,
 * shows fewer labels, or involves fewer people"). A field approves a looser
 * value only through a reference under `approvals`.
 *
 * Since the phase 1 review (round 3, adversarial finding 4) the list also holds
 * the allow lists derive and the verifier read from a field: its kind (a
 * `decision` refuses every source but the owner's, rule 3), its unit and
 * dimension (the dimension check, 2.7), the qualifiers it registers (rule 8;
 * G8-14), the options of an enum or decision, the value shape of a count, and
 * the formulas that write it (`formulas`: the declared formulas whose outputs
 * name the field, 2.1 `calculated` and `estimated`).
 */
export const SENSITIVE_FIELD_PROPERTIES = [
  'estimation',
  'estimatedMethod',
  'tolerance',
  'plausible',
  'criticality',
  'requiredSlot',
  'firstEstimateSlot',
  'confirmBy',
  'confirmByBasis',
  'identity',
  'referenceDatasets',
  'impactRank',
  'minorForTotals',
  'qualifierRequired',
  'kind',
  'unit',
  'dimension',
  'qualifiers',
  'options',
  'valueShape',
  'formulas',
] as const;
export type SensitiveFieldProperty = (typeof SENSITIVE_FIELD_PROPERTIES)[number];

/**
 * The value shapes a numeric field may declare. `non_negative_integer`: a whole
 * number, zero or more, the shape of every count (2.6 kind `count`; rule 8,
 * "Counts state what they count"; rule 1, "Zero is a value"). Registry
 * validation requires it on every count field, so a fractional or negative
 * count has a declared shape to be refused against.
 */
export const VALUE_SHAPES = ['non_negative_integer'] as const;
export type ValueShape = (typeof VALUE_SHAPES)[number];

const text = z.string().min(1);
const approvalRef = z.string().min(1);

export const unitSchema = z.strictObject({ code: text, symbol: text, dimension: text });

export const toleranceSchema = z
  .strictObject({
    absolute: z.number().nonnegative().optional(),
    relative: z.number().nonnegative().optional(),
    reason: text,
  })
  .refine((tolerance) => tolerance.absolute !== undefined || tolerance.relative !== undefined, {
    message: 'a tolerance names an absolute or a relative bound',
  });

export const plausibleSchema = z
  .strictObject({ low: z.number(), high: z.number(), basis: text })
  .refine((range) => range.low < range.high, { message: 'a plausible range needs low < high' });

/** One concrete output a field changes: a formula id and version, or a template slot (rule 6). */
export const affectsSchema = z.strictObject({ output: text, via: text });

export const fieldSchema = z.strictObject({
  key: z.string().regex(/^[a-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/, 'a field key reads like subject.name'),
  label: text,
  subject: z.enum(SUBJECTS),
  kind: z.enum(FIELD_KINDS),
  /** Registry unit code (2.7). A quantity names one. */
  unit: text.optional(),
  /** The dimension the unit must have (2.7, rule 8): the dimension check. */
  dimension: text.optional(),
  qualifierRequired: z.boolean().optional(),
  /** Enum keys, or the options of a decision field. */
  options: z.array(text).optional(),
  estimation: z.enum(['forbidden', 'allowed']),
  /** Which method named by the guardrails allows the estimate (prompt 3 5.2). */
  estimatedMethod: z.enum(ESTIMATED_METHODS).optional(),
  tolerance: toleranceSchema.optional(),
  plausible: plausibleSchema.optional(),
  criticality: z.enum(CRITICALITIES),
  /** The field's place in rule 7's closed list of required fields. */
  requiredSlot: z.enum(REQUIRED_SLOTS).optional(),
  /** The field's place in rule 7's proposed first-estimate set. */
  firstEstimateSlot: z.enum(FIRST_ESTIMATE_SLOTS).optional(),
  affects: z.array(affectsSchema),
  impactRank: z.number().int().positive(),
  confirmBy: z.enum(CONFIRM_BY),
  /** Which owner fact of rule 3 makes the owner the right person. */
  confirmByBasis: z.enum(OWNER_FACT_BASES).optional(),
  identity: z.boolean().optional(),
  /** Reference dataset ids the field may take `reference` candidates from (2.1). */
  referenceDatasets: z.array(text).optional(),
  minorForTotals: z.boolean().optional(),
  /** Approval references for values looser than the strict default, by property. */
  approvals: z.partialRecord(z.enum(SENSITIVE_FIELD_PROPERTIES), approvalRef).optional(),
  /**
   * The qualifier keys a candidate of this field may carry (rule 8: the area
   * basis, what a count counts, the level type), besides the unknown qualifier.
   * A registry extra: 2.6 names only `qualifierRequired`.
   */
  qualifiers: z.array(text).optional(),
  /**
   * The shape every value of the field must have (VALUE_SHAPES). A registry
   * extra: every count declares `non_negative_integer` (registry validation).
   */
  valueShape: z.enum(VALUE_SHAPES).optional(),
});

/**
 * A field as the registry holds it: 2.6's FieldDefinition (from @sovitech/domain)
 * with the registry's extras (`dimension`, `options`, `qualifiers`, the rule 7
 * and rule 3 slots and bases, reference datasets, approvals).
 */
export type RegistryFieldDefinition = z.infer<typeof fieldSchema>;

/** Compile-time proof that a registry field is a 2.6 FieldDefinition: the domain reads registry fields as they are. */
type Extends<T extends U, U> = T;
export type RegistryFieldIsFieldDefinition = Extends<RegistryFieldDefinition, FieldDefinition>;

export const questionSchema = z.strictObject({
  id: z.string().regex(/^[a-z][A-Za-z0-9_.-]*$/),
  /** A question asks for a value; a confirmation shows one (rule 5: a confirmation is a question too). */
  kind: z.enum(['question', 'confirmation']),
  /** One field, or one decision field per option of a multi-select (2.6). */
  fieldKeys: z.array(text).min(1),
  /** When stated, a subset of its fields' `affects`: questions inherit their field's outputs (rule 6). */
  affects: z.array(affectsSchema).optional(),
  step: z.number().int().min(1).max(8).optional(),
  /** The condition under which the question is asked (rule 6, "Conditional questions"). */
  condition: text.optional(),
});
export type QuestionDefinition = z.infer<typeof questionSchema>;

/** A declared formula signature: phase 1 declares each one an `affects` entry names, before its body exists. */
export const formulaSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]*$/),
  version: z.string().regex(/^\d+(\.\d+){0,2}$/),
  inputs: z.array(text).min(1),
  outputs: z.array(text).min(1),
  /** Missing means `refuse` (rule 1, "Formulas declare how they handle unknowns"; G1-9). */
  unknownPolicy: z.enum(UNKNOWN_POLICIES).optional(),
  /** The formula uses a benchmark, typical value, factor or price table (2.1 `estimated`). */
  estimated: z.boolean().optional(),
});
export type FormulaSignature = z.infer<typeof formulaSchema>;

export const templateSlotSchema = z.strictObject({ id: z.string().regex(/^[a-z][A-Za-z0-9_.-]*$/), reads: z.array(text).min(1) });
export type TemplateSlot = z.infer<typeof templateSlotSchema>;

export const datasetSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]*$/),
  version: text,
  description: text.optional(),
  /** `dataset-approval:<id>@<version>`: an approval record that cites an approved change-log row. */
  approvalRef: approvalRef.optional(),
});
export type DatasetDeclaration = z.infer<typeof datasetSchema>;

const settingStatus = z.enum(['rule', 'proposed', 'approved']);
const settingMeta = { status: settingStatus, source: text, approvalRef: approvalRef.optional() };

export const settingsSchema = z.strictObject({
  confirmationBudget: z.strictObject({ value: z.number().int().nonnegative(), ...settingMeta }),
  calibrationThreshold: z.strictObject({
    correctionRatePercent: z.number().positive().max(100),
    window: z.number().int().positive(),
    ...settingMeta,
  }),
  firstEstimateSet: z.strictObject({ members: z.array(z.enum(FIRST_ESTIMATE_SLOTS)), ...settingMeta }),
  requiredSet: z.strictObject({ members: z.array(z.enum(REQUIRED_SLOTS)), ...settingMeta }),
  identityList: z.strictObject({ members: z.array(z.enum(REQUIRED_SLOTS)), ...settingMeta }),
  documentStageOrder: z.strictObject({ tiers: z.array(z.array(z.enum(DOCUMENT_STAGES)).min(1)).min(1), ...settingMeta }),
});
export type RegistrySettings = z.infer<typeof settingsSchema>;

export const registrySchema = z.strictObject({
  id: text,
  version: text,
  units: z.array(unitSchema),
  fields: z.array(fieldSchema),
  questions: z.array(questionSchema),
  formulas: z.array(formulaSchema),
  templateSlots: z.array(templateSlotSchema),
  datasets: z.array(datasetSchema),
  settings: settingsSchema,
});
export type RegistryBundle = z.infer<typeof registrySchema>;

/** A parsed `via`: which consumer an `affects` entry names. */
export type Consumer =
  | { kind: 'formula'; id: string; version: string; ref: string }
  | { kind: 'template'; slot: string; ref: string };

const FORMULA_VIA = /^formula:([A-Za-z][A-Za-z0-9_.-]*)@(\d+(?:\.\d+){0,2})$/;
const TEMPLATE_VIA = /^template:([a-z][A-Za-z0-9_.-]*)$/;

/** `formula:<id>@<version>` or `template:<slot>`; anything else, such as "proposal", is not concrete. */
export function parseVia(via: string): Consumer | undefined {
  const formula = FORMULA_VIA.exec(via);
  if (formula?.[1] !== undefined && formula[2] !== undefined) {
    return { kind: 'formula', id: formula[1], version: formula[2], ref: via };
  }
  const template = TEMPLATE_VIA.exec(via);
  if (template?.[1] !== undefined) return { kind: 'template', slot: template[1], ref: via };
  return undefined;
}

export function formulaRef(formula: Pick<FormulaSignature, 'id' | 'version'>): string {
  return `formula:${formula.id}@${formula.version}`;
}

/**
 * The declared formulas that write a field: those whose `outputs` name the
 * field's key, as `formula:<id>@<version>`, sorted. A `calculated` or
 * `estimated` candidate of the field comes from one of these (2.1: "The
 * calculation engine only"), so the list is loosening-sensitive: a formula
 * that starts writing a field lets more values into it (section 10). None of
 * the phase 1 formulas writes a field (their outputs are the proposal's).
 */
export function formulasWritingField(formulas: readonly Pick<FormulaSignature, 'id' | 'version' | 'outputs'>[], fieldKey: string): string[] {
  return formulas
    .filter((formula) => formula.outputs.includes(fieldKey))
    .map((formula) => formulaRef(formula))
    .sort();
}

export function templateRef(slot: Pick<TemplateSlot, 'id'>): string {
  return `template:${slot.id}`;
}
