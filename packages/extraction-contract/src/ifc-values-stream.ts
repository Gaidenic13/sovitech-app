/**
 * The per-line form of an output's sealed IFC section (docs/adr/0034-streamed-ifc-output-and-sandbox-bounds.md).
 *
 * A large model's IFC section does not fit one JSON text: the `perf` model's 741,528 facts gave
 * `output.too_large`, because the text passed V8's longest string, and a text that long would
 * also pass what the API may parse at once (the phase 2 review). So when a request asks for IFC
 * values of a model, the IFC reader writes the output file as lines:
 *
 *   1. the extraction output without its IFC section, the contract's ExtractionOutput, parsed by
 *      parseExtractionOutput as any output (both languages);
 *   2. the stream header: `{"ifcValuesStream":{"contractVersion","section","statements","facts","candidateProposals"}}`,
 *      `section` being `present` or `absent` (no section: the model could not be opened), with
 *      how many lines of each kind follow;
 *   3. the statements: `{"statement":{"stepId","text"}}`, each quoted STEP statement once, its
 *      verbatim text from `#<stepId>` to `;`;
 *   4. the facts: `{"fact":{"id","globalId","stepIds","path","value","declaredUnit"?}}`, an IfcFact
 *      without the parts every fact shares or repeats: its locator's content hash and schema are
 *      the output's (ifc_value_locators), and its excerpt is its statements' text, joined by a
 *      line end, as the in-memory form holds it;
 *   5. the proposals: `{"proposal":IfcCandidateProposal}`.
 *
 * Every line ends with a line end, and none is longer than IFC_VALUES_LINE_MAX_BYTES. The first
 * line and the lines of other outputs (PDF, XLSX, a model with no IFC values asked for) are one
 * JSON text as before.
 *
 * TypeScript only: the Python extractor has no IFC role since the owner's decision of
 * 2026-09-26 ("web-ifc instead"; ADR 0031: it refuses a model with `job.ifc_read_by_ifc_reader`),
 * so it never writes or reads this form, and the shared JSON Schema (both languages) is unchanged.
 * The line schemas below are built from the generated defs, so a line holds what the in-memory
 * section holds, checked by the same rules.
 *
 * The seal holds as for the in-memory form (./ifc-values.ts): readIfcValuesStream reads the
 * `ifc-values` gate before it takes a single line, and reads nothing while it reads closed or
 * while the request did not ask for IFC values; what it reads comes back sealed.
 */
import { readGate, type GateSource } from '@sovitech/registry/gates';
import { z } from 'zod';
import { CONTRACT_VERSION } from './generated/annotations';
import {
  IfcCandidateProposalSchema,
  IfcFactSchema,
  IfcLocatorSchema,
  StepIdSchema,
  type ExtractionOutput,
  type ExtractionRequest,
  type IfcCandidateProposal,
  type IfcFact,
} from './generated/zod';
import { sealIfcValues } from './ifc-values';
import { codePointLength, factLocatorProblems, formatRule, proposalProblems, type Path } from './invariants';
import { outputAnswersRequest, type ExtractionOutputView } from './parse';
import { pointer, problemsOf, type ContractProblem } from './problems';
import { text } from './runtime';

/** The longest line of the per-line form, in UTF-8 bytes without its line end: what a reader of it may hold at once. */
export const IFC_VALUES_LINE_MAX_BYTES = 1024 * 1024;

/** The longest excerpt of a fact, in code points (the schema's IfcFact.excerpt maxLength). */
export const IFC_FACT_EXCERPT_MAX = 20000;

/** At most this many lines of one kind (the schema's maxItems of IfcValues.facts and .candidateProposals). */
const ENTRIES_MAX = 10_000_000;

/** A check of the per-line form that the whole-output invariants cannot state (TypeScript only). */
export type StreamCheckId =
  /** The first line after the output is not the stream header, or is missing. */
  | 'header'
  /** A section `present` where the output may not carry one, or `absent` with lines announced. */
  | 'section'
  /** A line of a kind the stream is not at: statements, then facts, then proposals. */
  | 'order'
  /** A statement written twice, or whose text is not the statement `#<stepId>`. */
  | 'statement'
  /** A fact that quotes a statement the stream did not write. */
  | 'unknown_statement'
  /** A statement no fact quotes. */
  | 'unquoted_statement'
  /** A fact whose statements, joined, are longer than an excerpt may be. */
  | 'excerpt'
  /** Fewer lines than the header announced. */
  | 'truncated'
  /** A line past those the header announced. */
  | 'excess';

const StreamHeaderSchema = z.strictObject({
  ifcValuesStream: z.strictObject({
    contractVersion: z.literal(CONTRACT_VERSION),
    section: z.enum(['present', 'absent']),
    statements: z.int().min(0).max(ENTRIES_MAX),
    facts: z.int().min(0).max(ENTRIES_MAX),
    candidateProposals: z.int().min(0).max(ENTRIES_MAX),
  }),
});
type StreamHeader = z.infer<typeof StreamHeaderSchema>['ifcValuesStream'];

const StatementLineSchema = z.strictObject({
  statement: z.strictObject({
    stepId: StepIdSchema,
    text: text({ minLength: 1, maxLength: IFC_FACT_EXCERPT_MAX }),
  }),
});

/** A fact as one line: the IfcFact's own defs, without the locator's content hash and schema and without the excerpt. */
const FactLineSchema = z.strictObject({
  fact: z.strictObject({
    id: IfcFactSchema.shape.id,
    globalId: IfcLocatorSchema.shape.globalId,
    stepIds: IfcLocatorSchema.shape.stepIds,
    path: IfcLocatorSchema.shape.path,
    value: IfcFactSchema.shape.value,
    declaredUnit: IfcFactSchema.shape.declaredUnit,
  }),
});
type FactLine = z.infer<typeof FactLineSchema>['fact'];

const ProposalLineSchema = z.strictObject({ proposal: IfcCandidateProposalSchema });

/** The statement's own id at the start of its text: `#<digits>` and no further digit. */
const STATEMENT_ID = /^#([0-9]{1,12})(?![0-9])/u;

/** Whether an output of this request carries the per-line form after its first line: IFC values asked for, of a model. */
export function ifcValuesStreamExpected(request: Pick<ExtractionRequest, 'ifcValues'>, output: Pick<ExtractionOutput, 'format'>): boolean {
  return request.ifcValues && output.format === 'ifc';
}

/** Whether an output may carry an IFC section at all (format_sections: a model's, not failed, with its record). */
function sectionAllowed(output: Pick<ExtractionOutput, 'format' | 'analysis' | 'ifcModel'>): boolean {
  return formatRule(output.format).sections.includes('ifcValues') && output.analysis.status !== 'failed' && output.ifcModel !== undefined;
}

// ---------------------------------------------------------------------------
// Writing (the IFC reader's command line)
// ---------------------------------------------------------------------------

/** Why an output cannot be written in the per-line form. A code, never document text. */
export class IfcValuesStreamError extends Error {
  constructor(readonly code: 'output.not_streamable' | 'output.line_too_long') {
    super(code);
    this.name = 'IfcValuesStreamError';
  }
}

/** The UTF-8 length of a text, in bytes. */
export function utf8Length(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function bounded(line: string): string {
  if (utf8Length(line) > IFC_VALUES_LINE_MAX_BYTES) throw new IfcValuesStreamError('output.line_too_long');
  return line;
}

/**
 * The quoted statements of a section, each once: a fact's excerpt is its statements' text joined
 * by a line end, and a statement quoted by several facts must read the same in each.
 */
function statementsOf(facts: readonly IfcFact[]): Map<number, string> {
  const statements = new Map<number, string>();
  const put = (stepId: number, statement: string): void => {
    const known = statements.get(stepId);
    if (known !== undefined && known !== statement) throw new IfcValuesStreamError('output.not_streamable');
    statements.set(stepId, statement);
  };
  for (const fact of facts) {
    const [only] = fact.locator.stepIds;
    if (fact.locator.stepIds.length === 1 && only !== undefined) put(only, fact.excerpt);
  }
  for (const fact of facts) {
    const stepIds = fact.locator.stepIds;
    if (stepIds.length === 1) continue;
    const lines = fact.excerpt.split('\n');
    if (lines.length === stepIds.length) {
      stepIds.forEach((stepId, index) => {
        put(stepId, lines[index] ?? '');
      });
    }
    // The excerpt must be exactly its statements, in order: the reader rebuilds it that way.
    if (stepIds.map((stepId) => statements.get(stepId)).join('\n') !== fact.excerpt || stepIds.some((stepId) => !statements.has(stepId))) {
      throw new IfcValuesStreamError('output.not_streamable');
    }
  }
  for (const [stepId, statement] of statements) {
    const written = STATEMENT_ID.exec(statement);
    if (written === null || written[1] !== String(stepId) || codePointLength(statement) > IFC_FACT_EXCERPT_MAX) throw new IfcValuesStreamError('output.not_streamable');
  }
  return statements;
}

function factLine(fact: IfcFact): FactLine {
  const { locator } = fact;
  return {
    id: fact.id,
    globalId: locator.globalId,
    stepIds: [...locator.stepIds],
    path: locator.path,
    value: fact.value,
    ...(fact.declaredUnit === undefined ? {} : { declaredUnit: fact.declaredUnit }),
  };
}

/**
 * The lines of an output whose IFC section is written in the per-line form (each without its line
 * end): the output without the section, the stream header, then the statements, the facts and the
 * proposals. Built lazily, one line at a time, so no text of the whole section is ever built.
 * Throws IfcValuesStreamError when a fact's excerpt is not its statements, or a line would pass
 * IFC_VALUES_LINE_MAX_BYTES (the reader keeps every value it writes below it: ADR 0034).
 */
export function* ifcValuesStreamLines(output: ExtractionOutput): Generator<string, void, undefined> {
  const { ifcValues, ...rest } = output;
  const facts = ifcValues?.facts ?? [];
  const proposals = ifcValues?.candidateProposals ?? [];
  const statements = statementsOf(facts);
  yield JSON.stringify(rest);
  const header: StreamHeader = {
    contractVersion: CONTRACT_VERSION,
    section: ifcValues === undefined ? 'absent' : 'present',
    statements: statements.size,
    facts: facts.length,
    candidateProposals: proposals.length,
  };
  yield JSON.stringify({ ifcValuesStream: header });
  for (const [stepId, statement] of statements) yield bounded(JSON.stringify({ statement: { stepId, text: statement } }));
  for (const fact of facts) yield bounded(JSON.stringify({ fact: factLine(fact) }));
  for (const proposal of proposals) yield bounded(JSON.stringify({ proposal }));
}

// ---------------------------------------------------------------------------
// Reading (the API's worker)
// ---------------------------------------------------------------------------

/**
 * What reading the per-line form gives: the output with its IFC section sealed (or with none, for
 * a section `absent`), or why the whole output is refused. `gate_closed`, `not_asked` and
 * `unexpected` read no line at all. Problems are paths under `/lines/<n>` (0 is the stream
 * header) and codes, never values (rule 13).
 */
export type IfcValuesStreamResult =
  | { readonly ok: true; readonly output: ExtractionOutputView; readonly lines: number }
  | {
      readonly ok: false;
      readonly reason: 'gate_closed' | 'not_asked' | 'unexpected' | 'truncated' | 'excess' | 'invalid';
      readonly problems: readonly ContractProblem[];
    };

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

class Refused extends Error {
  constructor(
    readonly reason: 'truncated' | 'excess' | 'invalid',
    readonly problems: readonly ContractProblem[],
  ) {
    super(reason);
    this.name = 'Refused';
  }
}

function stream(line: number, check: StreamCheckId, ...path: Path): ContractProblem {
  return { path: pointer(['lines', line, ...path]), code: `stream:${check}` };
}

function parsed<T>(schema: z.ZodType<T>, value: unknown, line: number): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new Refused(
    'invalid',
    problemsOf(result.error).map((problem) => ({ path: `${pointer(['lines', line])}${problem.path}`, code: problem.code })),
  );
}

/** The kind of a line, from its one key, for the order check (the schema of that kind checks the rest). */
function kindOf(value: unknown): 'statement' | 'fact' | 'proposal' | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const keys = Object.keys(value);
  const [key] = keys;
  return keys.length === 1 && (key === 'statement' || key === 'fact' || key === 'proposal') ? key : undefined;
}

/**
 * Reads the per-line form of an output's IFC section, line by line, and returns the output with
 * the section sealed. `lines` yields the parsed value of each line after the output's first (the
 * API reads and bounds the bytes: apps/api/src/jobs/read-output.ts). Nothing is taken from
 * `lines` while `ifc-values` reads closed in `gates`, while the request asked for no IFC values,
 * or when the output is not one that carries the form; an error `lines` throws is not caught.
 *
 * Every line is checked as it arrives: its kind in order, its schema (the generated defs), the
 * whole-output invariants for its part (ifc_value_locators, ifc_proposals, format_sections), and
 * the checks of the form itself (StreamCheckId). The header's counts must be met exactly. Any
 * failure refuses the whole output: nothing of it is returned.
 */
export async function readIfcValuesStream(
  request: ExtractionRequest,
  output: ExtractionOutputView,
  lines: AsyncIterable<unknown>,
  gates: GateSource,
): Promise<IfcValuesStreamResult> {
  if (!request.ifcValues) return { ok: false, reason: 'not_asked', problems: [] };
  if (!readGate(gates, 'ifc-values').open) return { ok: false, reason: 'gate_closed', problems: [] };
  if (!ifcValuesStreamExpected(request, output) || output.ifcValues !== undefined) return { ok: false, reason: 'unexpected', problems: [] };

  let header: StreamHeader | undefined;
  let line = -1;
  const statements = new Map<number, string>();
  const quoted = new Set<number>();
  const factIds = new Set<string>();
  const proposalIds = new Set<string>();
  const facts: IfcFact[] = [];
  const proposals: IfcCandidateProposal[] = [];
  const contentHash = output.job.contentHash;
  const schema = output.ifcModel?.header.schema;

  const takeStatement = (value: unknown): void => {
    const { stepId, text: statement } = parsed(StatementLineSchema, value, line).statement;
    const written = STATEMENT_ID.exec(statement);
    if (statements.has(stepId) || written === null || written[1] !== String(stepId)) throw new Refused('invalid', [stream(line, 'statement', 'statement')]);
    statements.set(stepId, statement);
  };

  const takeFact = (value: unknown): void => {
    const fact = parsed(FactLineSchema, value, line).fact;
    const texts: string[] = [];
    for (const [index, stepId] of fact.stepIds.entries()) {
      const statement = statements.get(stepId);
      if (statement === undefined) throw new Refused('invalid', [stream(line, 'unknown_statement', 'fact', 'stepIds', index)]);
      texts.push(statement);
      quoted.add(stepId);
    }
    // One statement is within the excerpt's length already; several are counted as joined, with their line ends.
    const excerpt = texts.length === 1 ? (texts[0] ?? '') : texts.join('\n');
    if (texts.length > 1 && codePointLength(excerpt) > IFC_FACT_EXCERPT_MAX) throw new Refused('invalid', [stream(line, 'excerpt', 'fact', 'stepIds')]);
    if (factIds.has(fact.id)) throw new Refused('invalid', [{ path: pointer(['lines', line, 'fact', 'id']), code: 'invariant:ifc_value_locators' }]);
    const whole: IfcFact = {
      id: fact.id,
      locator: { contentHash, schema: schema ?? '', globalId: fact.globalId, stepIds: fact.stepIds, path: fact.path },
      value: fact.value,
      ...(fact.declaredUnit === undefined ? {} : { declaredUnit: fact.declaredUnit }),
      excerpt,
    };
    const wrong = factLocatorProblems(whole, output);
    if (wrong.length > 0) throw new Refused('invalid', wrong.map((path) => ({ path: pointer(['lines', line, 'fact', ...path]), code: 'invariant:ifc_value_locators' })));
    factIds.add(fact.id);
    facts.push(deepFreeze(whole));
  };

  const takeProposal = (value: unknown): void => {
    const { proposal } = parsed(ProposalLineSchema, value, line);
    const wrong = proposalProblems(proposal, factIds).map((path) => ({ path: pointer(['lines', line, 'proposal', ...path]), code: 'invariant:ifc_proposals' as const }));
    if (proposalIds.has(proposal.id)) wrong.push({ path: pointer(['lines', line, 'proposal', 'id']), code: 'invariant:ifc_proposals' });
    if (wrong.length > 0) throw new Refused('invalid', wrong);
    proposalIds.add(proposal.id);
    proposals.push(deepFreeze(proposal));
  };

  try {
    for await (const value of lines) {
      line += 1;
      if (header === undefined) {
        if (kindOf(value) !== undefined) throw new Refused('invalid', [stream(line, 'header')]);
        header = parsed(StreamHeaderSchema, value, line).ifcValuesStream;
        const empty = header.statements === 0 && header.facts === 0 && header.candidateProposals === 0;
        if (header.section === 'present' && !sectionAllowed(output)) {
          throw new Refused('invalid', [{ path: pointer(['lines', line, 'ifcValuesStream', 'section']), code: 'invariant:format_sections' }]);
        }
        if (header.section === 'absent' && !empty) throw new Refused('invalid', [stream(line, 'section', 'ifcValuesStream', 'section')]);
        continue;
      }
      const at = line - 1;
      const kind = kindOf(value);
      const expected = at < header.statements ? 'statement' : at < header.statements + header.facts ? 'fact' : at < header.statements + header.facts + header.candidateProposals ? 'proposal' : undefined;
      if (expected === undefined) throw new Refused('excess', [stream(line, 'excess')]);
      if (kind !== expected) throw new Refused('invalid', [stream(line, 'order')]);
      if (kind === 'statement') takeStatement(value);
      else if (kind === 'fact') takeFact(value);
      else takeProposal(value);
    }
    if (header === undefined) throw new Refused('truncated', [stream(0, 'header')]);
    if (line !== header.statements + header.facts + header.candidateProposals) throw new Refused('truncated', [stream(line + 1, 'truncated')]);
    let statementLine = 1;
    for (const stepId of statements.keys()) {
      if (!quoted.has(stepId)) throw new Refused('invalid', [stream(statementLine, 'unquoted_statement', 'statement')]);
      statementLine += 1;
    }
  } catch (error) {
    if (error instanceof Refused) return { ok: false, reason: error.reason, problems: error.problems };
    throw error;
  }

  if (header.section === 'absent') return { ok: true, output, lines: line + 1 };
  const section = Object.freeze({ facts: Object.freeze(facts) as IfcFact[], candidateProposals: Object.freeze(proposals) as IfcCandidateProposal[] });
  const withSection: ExtractionOutputView = Object.freeze({ ...output, ifcValues: sealIfcValues(section) });
  const answers = outputAnswersRequest(request, withSection);
  if (answers.length > 0) return { ok: false, reason: 'invalid', problems: answers };
  return { ok: true, output: withSection, lines: line + 1 };
}

/** The parts of the per-line form, for the contract's own tests. */
export const STREAM_SCHEMAS_FOR_TESTS = { StreamHeaderSchema, StatementLineSchema, FactLineSchema, ProposalLineSchema } as const;
