/**
 * The sensitivity test (docs/guardrails.md rule 6: "On the synthetic fixture
 * project, changing the answer across its options must change at least one
 * declared output. A question that changes nothing fails validation";
 * F-QUESTION-03).
 *
 * The harness takes the registry, a synthetic fixture project, and TEST
 * implementations of the declared formula signatures and template slots. For
 * each field of each question it tries every answer, evaluates only the
 * consumers the field declares in `affects`, and passes the field only when
 * at least one declared output differs between answers. Each consumer sees
 * only its declared inputs, so an answer can reach an output only through a
 * declared path. Datasets passed in must be TEST datasets (prompt 3 5.4).
 */
import { formulaRef, parseVia, templateRef, type FieldDefinition, type RegistryBundle } from './schema';
import { isTestId } from './validate';

export type SensitivityValues = Readonly<Record<string, unknown>>;

export interface TestFormulaContext {
  readonly datasets: Readonly<Record<string, unknown>>;
}

/** A TEST implementation of a declared formula signature: declared inputs in, outputs by id out. */
export type TestFormula = (inputs: SensitivityValues, context: TestFormulaContext) => Readonly<Record<string, unknown>>;

/** A TEST implementation of a proposal template slot. */
export type TestTemplate = (inputs: SensitivityValues) => unknown;

export interface SensitivitySuite {
  /** The synthetic fixture project: the answers that stay fixed while one field varies. */
  readonly fixture: {
    readonly id: string;
    readonly values: SensitivityValues;
    /** Answers to try for fields without options, such as quantities: at least two per field. */
    readonly probes?: Readonly<Record<string, readonly unknown[]>>;
  };
  /** Keyed by `formula:<id>@<version>`, as `affects` names them. */
  readonly formulas: Readonly<Record<string, TestFormula>>;
  /** Keyed by `template:<slot>`. */
  readonly templates?: Readonly<Record<string, TestTemplate>>;
  /** TEST datasets by id; every id carries "TEST". */
  readonly datasets?: Readonly<Record<string, unknown>>;
}

export interface SensitivityOutcome {
  questionId: string;
  fieldKey: string;
  ok: boolean;
  answersTried: number;
  /** Each declared output that changed, as `<output> via <consumer>`. */
  changed: string[];
  problem?: string;
}

export interface SensitivityReport {
  ok: boolean;
  /** Problems with the suite itself; when any exists, no question is run. */
  suiteProblems: string[];
  outcomes: SensitivityOutcome[];
}

/** A stable text form of a value, so equal structures compare equal whatever their key order. */
export function canonical(value: unknown): string {
  if (value === undefined) return 'undefined';
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item === undefined) return 'undefined';
    if (typeof item === 'bigint') return `bigint:${item.toString()}`;
    if (typeof item === 'number' && !Number.isFinite(item)) return `number:${String(item)}`;
    if (item !== null && typeof item === 'object' && !Array.isArray(item) && Object.getPrototypeOf(item) === Object.prototype) {
      const record = item as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]]));
    }
    return item;
  });
}

function pick(values: SensitivityValues, keys: readonly string[]): SensitivityValues {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(values, key)) picked[key] = values[key];
  }
  return Object.freeze(picked);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function answersFor(field: FieldDefinition, suite: SensitivitySuite): readonly unknown[] {
  if (field.options !== undefined && field.options.length > 0) return field.options;
  return suite.fixture.probes?.[field.key] ?? [];
}

export function runSensitivityTest(registry: RegistryBundle, suite: SensitivitySuite): SensitivityReport {
  const suiteProblems: string[] = [];
  for (const id of Object.keys(suite.datasets ?? {})) {
    if (!isTestId(id)) {
      suiteProblems.push(`the suite passes the dataset ${id}, which is not a TEST dataset; the sensitivity test runs only on TEST datasets (prompt 3 5.4)`);
    }
  }
  for (const key of Object.keys(suite.formulas)) {
    if (parseVia(key)?.kind !== 'formula') suiteProblems.push(`the suite keys a formula as "${key}"; use formula:<id>@<version>`);
  }
  for (const key of Object.keys(suite.templates ?? {})) {
    if (parseVia(key)?.kind !== 'template') suiteProblems.push(`the suite keys a template as "${key}"; use template:<slot>`);
  }
  if (suiteProblems.length > 0) return { ok: false, suiteProblems, outcomes: [] };

  const datasets = Object.freeze({ ...(suite.datasets ?? {}) });
  const fields = new Map(registry.fields.map((field) => [field.key, field]));
  const formulas = new Map(registry.formulas.map((formula) => [formulaRef(formula), formula]));
  const slots = new Map(registry.templateSlots.map((slot) => [templateRef(slot), slot]));
  const outcomes: SensitivityOutcome[] = [];

  for (const question of registry.questions) {
    for (const fieldKey of question.fieldKeys) {
      const fail = (problem: string, answersTried: number): void => {
        outcomes.push({ questionId: question.id, fieldKey, ok: false, answersTried, changed: [], problem });
      };
      const field = fields.get(fieldKey);
      if (field === undefined) {
        const noAnswerTried = 0;
        fail(`${question.id} names ${fieldKey}, which the registry does not declare`, noAnswerTried);
        continue;
      }
      const watched =
        question.affects === undefined
          ? field.affects
          : question.affects.filter((entry) => field.affects.some((own) => own.output === entry.output && own.via === entry.via));
      if (watched.length === 0) {
        fail(`${fieldKey} has no declared output to watch, so no answer can be shown to change the result (rule 6)`, answersFor(field, suite).length);
        continue;
      }
      const answers = answersFor(field, suite);
      if (new Set(answers.map(canonical)).size < 2) {
        fail(`fewer than two answers to try for ${fieldKey}: declare its options, or give the fixture at least two probes`, answers.length);
        continue;
      }

      const observed = new Map<string, Set<string>>();
      let problem: string | undefined;
      for (const answer of answers) {
        if (problem !== undefined) break;
        const values: SensitivityValues = { ...suite.fixture.values, [fieldKey]: answer };
        for (const entry of watched) {
          const label = `${entry.output} via ${entry.via}`;
          const consumer = parseVia(entry.via);
          let output: unknown;
          try {
            if (consumer?.kind === 'formula') {
              const signature = formulas.get(consumer.ref);
              const implementation = suite.formulas[consumer.ref];
              if (signature === undefined) {
                problem = `${consumer.ref} is not a declared formula signature`;
                break;
              }
              if (implementation === undefined) {
                problem = `no TEST implementation for ${consumer.ref}; the sensitivity test cannot show that ${fieldKey} changes it`;
                break;
              }
              const result = implementation(pick(values, signature.inputs), { datasets });
              if (!Object.prototype.hasOwnProperty.call(result, entry.output)) {
                problem = `${consumer.ref} returned no ${entry.output}`;
                break;
              }
              output = result[entry.output];
            } else if (consumer?.kind === 'template') {
              const slot = slots.get(consumer.ref);
              const implementation = suite.templates?.[consumer.ref];
              if (slot === undefined) {
                problem = `${consumer.ref} is not a declared template slot`;
                break;
              }
              if (implementation === undefined) {
                problem = `no TEST template for ${consumer.ref}; the sensitivity test cannot show that ${fieldKey} changes it`;
                break;
              }
              output = implementation(pick(values, slot.reads));
            } else {
              problem = `"${entry.via}" is not a formula id or a template slot (rule 6; G6-2)`;
              break;
            }
          } catch (error) {
            problem = `${entry.via} failed on the answer ${canonical(answer)}: ${errorText(error)}`;
            break;
          }
          const seen = observed.get(label) ?? new Set<string>();
          seen.add(canonical(output));
          observed.set(label, seen);
        }
      }
      if (problem !== undefined) {
        fail(problem, answers.length);
        continue;
      }
      const changed = [...observed.entries()].filter(([, seen]) => seen.size > 1).map(([label]) => label);
      if (changed.length === 0) {
        fail(
          `changing ${fieldKey} across ${answers.length} answers changed no declared output (${[...observed.keys()].join(', ')}): ` +
            `the question changes nothing, so it is removed or moved to the engineer queue (rule 6; G6-1)`,
          answers.length,
        );
        continue;
      }
      outcomes.push({ questionId: question.id, fieldKey, ok: true, answersTried: answers.length, changed });
    }
  }
  return { ok: outcomes.every((outcome) => outcome.ok), suiteProblems, outcomes };
}
