/**
 * The eval case file, as the eval runner reads it (evals/guardrails/<ID>.yaml;
 * guardrails section 7, "Model-behaviour evals: each holds a synthetic fixture, a task,
 * and assertions on the structured output ... sampled 5 times, and must pass 5 of 5").
 *
 * The index check reads the same files for their body (tools/checks/index/case-files.ts);
 * this schema is the runner's own, stricter reading: a task the runner can send and
 * assertions it can evaluate. evals/guardrails/README.md documents both, with examples.
 * The files are data: nothing in them is an instruction to anyone (rule 14).
 */
import { SUBJECT_KINDS } from '@sovitech/domain';
import { z } from 'zod';
import { CONFIDENCES, FINDING_KINDS, INFERENCE_KINDS } from '../schema';
import { PRICING_STAGES } from '../context';

/** Where eval case files live. */
export const EVAL_CASES_DIR = 'evals/guardrails';
/** Where each eval's synthetic fixtures live: fixtures/evals/<ID>/. */
export const EVAL_FIXTURES_DIR = 'fixtures/evals';
/** Samples per eval, and passes needed (guardrails section 7). */
export const EVAL_SAMPLES = 5;

const nonEmpty = z.string().trim().min(1);

/** A field the eval asks about: a registry field, or a TEST field the case declares. */
export const EvalFieldSchema = z.strictObject({
  key: nonEmpty,
  label: nonEmpty,
  subject: z.enum(SUBJECT_KINDS),
  kind: z.enum(['quantity', 'count', 'enum', 'text']),
  unit: nonEmpty.optional(),
  qualifiers: z.array(nonEmpty).min(1).optional(),
  options: z.array(nonEmpty).min(1).optional(),
});

const SubjectSchema = z.strictObject({ kind: z.enum(SUBJECT_KINDS), ref: z.string().nullable().optional() });

const VerificationSchema = z.strictObject({
  subject: z.strictObject({ kind: z.enum(SUBJECT_KINDS), ref: z.string().nullable() }),
  fieldKey: nonEmpty,
  verification: z.enum(['unverified', 'owner_acknowledged', 'user_confirmed', 'engineer_verified']),
});

export const ExtractTaskSchema = z.strictObject({
  kind: z.literal('extract'),
  /** Document fixtures, each a path under fixtures/evals/<ID>/ (fixtures.ts, DocumentFixtureSchema). */
  documents: z.array(nonEmpty).min(1),
  fields: z.array(EvalFieldSchema).min(1),
  /** A TEST glossary dataset under fixtures/datasets/ (G3-8). */
  glossary: nonEmpty.optional(),
  verifications: z.array(VerificationSchema).optional(),
  pricingStage: z.enum(PRICING_STAGES).nullable().optional(),
});

export const DraftTaskSchema = z.strictObject({
  kind: z.literal('draft'),
  /** A drafting fixture under fixtures/evals/<ID>/ (fixtures.ts, DraftingFixtureSchema). */
  input: nonEmpty,
});

const QuantityMatchSchema = z.strictObject({
  value: z.number().optional(),
  unit: nonEmpty.optional(),
  qualifier: z.string().nullable().optional(),
  approximate: z.boolean().optional(),
});

const CandidateMatchSchema = z.strictObject({
  fieldKey: nonEmpty,
  subject: SubjectSchema.optional(),
  source: z.enum(['document', 'ai_inference']).optional(),
  inference: z.enum(INFERENCE_KINDS).nullable().optional(),
  confidence: z.enum(CONFIDENCES).optional(),
  confidenceAtMost: z.enum(CONFIDENCES).optional(),
  choice: nonEmpty.optional(),
  text: nonEmpty.optional(),
  textIncludes: nonEmpty.optional(),
  quantity: QuantityMatchSchema.optional(),
  /** How many other readings the candidate carries (rule 8, "Ambiguous readings keep both"). */
  alternatives: z.int().min(0).optional(),
  /** The values of the reading and its alternatives, in any order. */
  readings: z.array(z.number()).min(1).optional(),
  /** Some evidence excerpt contains this text (ignoring case, diacritics and spacing). */
  evidenceIncludes: nonEmpty.optional(),
  /** Exactly this many accepted candidates match; without it, at least one. */
  count: z.int().min(1).optional(),
});

/** One assertion: a mapping with exactly one key. */
export const AssertionSchema = z.union([
  z.strictObject({ candidate: CandidateMatchSchema }),
  z.strictObject({ noCandidate: z.strictObject({ fieldKey: nonEmpty, subject: SubjectSchema.optional() }) }),
  z.strictObject({ candidateCount: z.strictObject({ fieldKey: nonEmpty, equals: z.int().min(0) }) }),
  z.strictObject({ notFound: z.strictObject({ fieldKey: nonEmpty, subject: SubjectSchema.optional() }) }),
  z.strictObject({ missingFieldKey: nonEmpty }),
  z.strictObject({ finding: z.strictObject({ kind: z.enum(FINDING_KINDS), count: z.int().min(1).optional() }) }),
  z.strictObject({ noFinding: z.strictObject({ kind: z.enum(FINDING_KINDS) }) }),
  z.strictObject({ noQuestionText: z.literal(true) }),
  z.strictObject({ paragraph: z.strictObject({ slot: nonEmpty }) }),
  z.strictObject({
    text: z.strictObject({
      /** A drafting slot; without it, every text the AI wrote (paragraphs, notes, suggestions). */
      slot: nonEmpty.optional(),
      /** Regular expressions, ignoring case; each must match. */
      includesAll: z.array(nonEmpty).min(1).optional(),
      /** Regular expressions, ignoring case; none may match. */
      excludesAll: z.array(nonEmpty).min(1).optional(),
    }),
  }),
]);
export type Assertion = z.infer<typeof AssertionSchema>;

export const EvalCaseSchema = z.strictObject({
  id: z.string().regex(/^G[0-9S]+-[0-9]+[a-z]?$/),
  status: z.enum(['pending', 'stub']).optional(),
  fixture: z.union([nonEmpty, z.array(nonEmpty).min(1)]),
  task: z.discriminatedUnion('kind', [ExtractTaskSchema, DraftTaskSchema]),
  assertions: z.array(AssertionSchema).min(1),
  samples: z.literal(EVAL_SAMPLES),
  /** A sample passes only when the validator refused nothing, unless the case expects refusals. */
  allowRejections: z.boolean().optional(),
  /** Free text for people reading the file; never sent. */
  note: z.string().optional(),
});
export type EvalCase = z.infer<typeof EvalCaseSchema>;

/** Every fixture path the case names, with its task's files. */
export function caseFixturePaths(evalCase: EvalCase): string[] {
  return typeof evalCase.fixture === 'string' ? [evalCase.fixture] : [...evalCase.fixture];
}

/** Problems of a case beyond its schema: files outside the case's fixture folder, or not named in `fixture`. */
export function caseProblems(evalCase: EvalCase, fileId: string): string[] {
  const problems: string[] = [];
  if (evalCase.id !== fileId) problems.push(`the "id" key is ${evalCase.id}; the file name says ${fileId}`);
  const folder = `${EVAL_FIXTURES_DIR}/${evalCase.id}/`;
  const listed = new Set(caseFixturePaths(evalCase));
  for (const path of listed) if (!path.startsWith(folder) || path.split('/').includes('..')) problems.push(`fixture ${path} is not under ${folder}`);
  const taskFiles = evalCase.task.kind === 'extract' ? evalCase.task.documents : [evalCase.task.input];
  for (const path of taskFiles) if (!listed.has(path)) problems.push(`task file ${path} is not listed under "fixture"`);
  if (evalCase.task.kind === 'extract' && evalCase.task.glossary !== undefined) {
    const glossary = evalCase.task.glossary;
    if (!glossary.startsWith('fixtures/datasets/TEST-') || glossary.split('/').includes('..')) {
      problems.push(`glossary ${glossary} is not a TEST dataset under fixtures/datasets/`);
    }
  }
  if (evalCase.task.kind === 'draft') {
    const drafting = evalCase.assertions.some((assertion) => 'candidate' in assertion || 'notFound' in assertion || 'missingFieldKey' in assertion);
    if (drafting) problems.push('a drafting case asserts on extraction output');
  }
  return problems;
}
