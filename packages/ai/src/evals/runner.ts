/**
 * The eval runner (build-readiness 3 "Now" item 7: "An in-repo TypeScript runner that
 * reuses the production validator. It runs 5 samples and needs 5 of 5 to pass"; guardrails
 * section 7; prompt 3 section 10, phase 2; CLAUDE.md, definition of done item 2).
 *
 * - Each eval case (evals/guardrails/<ID>.yaml) runs 5 samples through the production path
 *   of the boundary: the per-project context, the `ai-processor-route` guard, the model,
 *   and the output validator. Its only differences from the app are one call per sample
 *   and, for G3-8, a TEST glossary from fixtures/datasets/.
 * - Evals call the live model only with an API key (the environment or the git-ignored
 *   `.env`; the owner agreed to fixture-only evals on 2026-09-25), and only on fixture
 *   files that fixtures/manifest.json lists.
 * - Without a key, every eval reports "not running: ANTHROPIC_API_KEY not set", no client is
 *   built and no record is written.
 * - With a key, each case that ran gets one results record (results.ts), passed or not;
 *   the index check counts it as real only at 5 of 5 against the current prompt, model id
 *   and schema. No transport can be handed in: a record comes only from real model calls,
 *   and the model id it names is the one the API returned.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { REPO_ROOT, productionGateSource } from '@sovitech/registry/gates';
import { parse as parseYaml } from 'yaml';
import { EVAL_POLICY, runDraftingWith, runExtractionWith, stderrLog, type BoundaryDeps, type DraftingRun, type ExtractionRun } from '../boundary';
import type { DraftingInput, ExtractionInput } from '../context';
import { loadFixtureManifest, type FixtureManifest } from '../guard';
import { readApiKey } from '../key';
import { loadSystemPrompt } from '../prompt';
import { AiCallError, createAnthropicTransport } from '../transport';
import { sampleFailures, type SampleOutput } from './assertions';
import { EVAL_CASES_DIR, EVAL_SAMPLES, EvalCaseSchema, caseProblems, type EvalCase } from './case';
import { documentFromFixture, draftingFromFixture, glossaryFromFixture, readCheckedFixture, type CheckedFixture } from './fixtures';
import { currentEvalInputs, recordModelId, writeResultsRecord, EVAL_RUNNER, type SampleOutcome } from './results';

export interface EvalRunOptions {
  /** The repository root; the repository's own by default. */
  readonly root?: string;
  /** Eval ids to run; every eval by default. */
  readonly ids?: readonly string[];
  /** The environment the key is read from; process.env by default. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** Progress lines; standard error by default. */
  readonly progress?: (line: string) => void;
}

export type CaseReport =
  | { readonly id: string; readonly status: 'not running'; readonly reason: string }
  | { readonly id: string; readonly status: 'no case file' }
  | { readonly id: string; readonly status: 'stub' }
  | { readonly id: string; readonly status: 'invalid'; readonly problems: readonly string[] }
  | {
      readonly id: string;
      readonly status: 'passed' | 'failed';
      readonly passed: number;
      readonly samples: typeof EVAL_SAMPLES;
      readonly record: string;
    };

export interface EvalRunReport {
  /** Whether the runner called the model at all. */
  readonly running: boolean;
  /** Why not, when it did not. */
  readonly reason?: string;
  readonly cases: readonly CaseReport[];
}

/** The E ids of docs/guardrails.md section 7, in table order. */
export function sectionSevenEvalIds(root: string): string[] {
  const text = readFileSync(join(root, 'docs/guardrails.md'), 'utf8');
  const ids: string[] = [];
  for (const match of text.matchAll(/^\|\s*(G[0-9S]+-[0-9]+[a-z]?)\s*\|\s*E\s*\|/gmu)) if (match[1] !== undefined) ids.push(match[1]);
  return [...new Set(ids)];
}

/** The eval case files at the top level of evals/guardrails/, by id. */
export function evalCaseFiles(root: string): Map<string, string> {
  const dir = join(root, EVAL_CASES_DIR);
  const files = new Map<string, string>();
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return files;
  for (const name of readdirSync(dir).sort()) {
    const match = /^(G[0-9S]+-[0-9]+[a-z]?)\.yaml$/u.exec(name);
    if (match?.[1] !== undefined && statSync(join(dir, name)).isFile()) files.set(match[1], `${EVAL_CASES_DIR}/${name}`);
  }
  return files;
}

/** Reads and checks one case file; the problems name paths and keys only. */
export function readEvalCase(root: string, id: string, path: string): { readonly evalCase: EvalCase } | { readonly problems: readonly string[] } {
  let value: unknown;
  try {
    value = parseYaml(readFileSync(join(root, path), 'utf8'));
  } catch {
    return { problems: [`${path} is not valid YAML`] };
  }
  const parsed = EvalCaseSchema.safeParse(value);
  if (!parsed.success) {
    return { problems: [...new Set(parsed.error.issues.map((issue) => `${path}: ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`))] };
  }
  const problems = caseProblems(parsed.data, id);
  return problems.length === 0 ? { evalCase: parsed.data } : { problems: problems.map((problem) => `${path}: ${problem}`) };
}

/** What a case sends, built from its checked fixtures. */
type PreparedTask =
  | { readonly kind: 'extract'; readonly input: ExtractionInput }
  | { readonly kind: 'draft'; readonly input: DraftingInput };

/** The synthetic project an eval runs in: never the demo project, never a real one. */
export function evalProjectId(id: string): string {
  return `eval-${id}`;
}

function prepareTask(root: string, evalCase: EvalCase, manifest: FixtureManifest): { task: PreparedTask; fixtures: CheckedFixture[] } {
  const project = { id: evalProjectId(evalCase.id), demo: false };
  const task = evalCase.task;
  if (task.kind === 'extract') {
    const documents = task.documents.map((path) => readCheckedFixture(root, path, manifest));
    const glossary = task.glossary === undefined ? undefined : readCheckedFixture(root, task.glossary, manifest);
    const input: ExtractionInput = {
      project,
      documents: documents.map((fixture) => documentFromFixture(fixture, project.id)),
      fields: task.fields,
      state: { verifications: task.verifications ?? [], pricingStage: task.pricingStage ?? null },
      ...(glossary === undefined ? {} : { glossary: glossaryFromFixture(glossary) }),
    };
    return { task: { kind: 'extract', input }, fixtures: glossary === undefined ? documents : [...documents, glossary] };
  }
  const fixture = readCheckedFixture(root, task.input, manifest);
  const drafting = draftingFromFixture(fixture);
  const input: DraftingInput = {
    project,
    slots: drafting.slots,
    tokens: drafting.tokens.map((token) => ({ projectId: project.id, token: token.token, label: token.label, badge: token.badge ?? null, status: token.status ?? [] })),
    facts: drafting.facts.map((text) => ({ projectId: project.id, text })),
    state: { verifications: drafting.verifications ?? [], pricingStage: drafting.pricingStage ?? null },
    provenance: { kind: 'fixture_file', path: fixture.path, sha256: fixture.sha256 },
    names: drafting.names ?? [],
  };
  return { task: { kind: 'draft', input }, fixtures: [fixture] };
}

/** One sample's outcome from a boundary run. */
function outcomeOf(sample: number, run: ExtractionRun | DraftingRun, evalCase: EvalCase): SampleOutcome {
  if (run.outcome === 'refused') {
    return { sample, passed: false, modelId: null, failures: [`route refused: ${[...new Set(run.refusals.map((refusal) => refusal.code))].join('+')}`] };
  }
  if (run.outcome === 'failed') {
    return { sample, passed: false, modelId: run.attempts[0]?.modelId ?? null, failures: [`output unusable: ${run.problem}`] };
  }
  const output: SampleOutput | undefined =
    'validations' in run ? (run.validations[0] === undefined ? undefined : { task: 'extract', validation: run.validations[0] }) : { task: 'draft', validation: run.validation };
  if (output === undefined) return { sample, passed: false, modelId: run.modelId, failures: ['no validation'] };
  const failures = sampleFailures(evalCase.assertions, output, evalCase.allowRejections === true);
  return { sample, passed: failures.length === 0, modelId: run.modelId, failures };
}

class KeyRefused extends Error {
  override name = 'KeyRefused';
}

async function runSample(task: PreparedTask, deps: BoundaryDeps, sample: number, evalCase: EvalCase): Promise<SampleOutcome> {
  try {
    const run =
      task.kind === 'extract' ? await runExtractionWith(task.input, deps, EVAL_POLICY) : await runDraftingWith(task.input, deps, EVAL_POLICY);
    return outcomeOf(sample, run, evalCase);
  } catch (error) {
    if (error instanceof AiCallError) {
      if (error.code === 'authentication' || error.code === 'permission') throw new KeyRefused(error.code);
      return { sample, passed: false, modelId: null, failures: [`call failed: ${error.code}`] };
    }
    throw error;
  }
}

/** Runs the evals. Without a key, calls nothing and writes nothing. */
export async function runEvals(options: EvalRunOptions = {}): Promise<EvalRunReport> {
  const root = options.root ?? REPO_ROOT;
  const progress = options.progress ?? ((line: string) => process.stderr.write(`${line}\n`));
  const files = evalCaseFiles(root);
  const known = [...new Set([...sectionSevenEvalIds(root), ...files.keys()])];
  const selected = options.ids === undefined || options.ids.length === 0 ? known : [...options.ids];

  const key = readApiKey({ env: options.env ?? process.env, root });
  if (!key.present) {
    return { running: false, reason: key.reason, cases: selected.map((id) => ({ id, status: 'not running', reason: key.reason })) };
  }

  const manifest = loadFixtureManifest(root);
  const deps: BoundaryDeps = {
    transport: createAnthropicTransport(key.key),
    gates: productionGateSource(),
    manifest,
    systemPrompt: loadSystemPrompt(root),
    root,
    log: stderrLog,
  };
  const inputs = currentEvalInputs(root);
  const cases: CaseReport[] = [];
  for (const id of selected) {
    const path = files.get(id);
    if (path === undefined) {
      cases.push({ id, status: 'no case file' });
      continue;
    }
    const read = readEvalCase(root, id, path);
    if ('problems' in read) {
      cases.push({ id, status: 'invalid', problems: read.problems });
      continue;
    }
    const evalCase = read.evalCase;
    if (evalCase.status === 'stub') {
      cases.push({ id, status: 'stub' });
      continue;
    }
    let prepared: ReturnType<typeof prepareTask>;
    try {
      prepared = prepareTask(root, evalCase, manifest);
    } catch (error) {
      cases.push({ id, status: 'invalid', problems: [error instanceof Error ? error.message : 'the fixtures could not be read'] });
      continue;
    }
    const outcomes: SampleOutcome[] = [];
    try {
      for (let sample = 1; sample <= EVAL_SAMPLES; sample += 1) {
        progress(`${id}: sample ${sample} of ${EVAL_SAMPLES}`);
        outcomes.push(await runSample(prepared.task, deps, sample, evalCase));
      }
    } catch (error) {
      if (error instanceof KeyRefused) {
        const reason = `the API refused the key (${error.message})`;
        return { running: false, reason, cases: [...cases, ...selected.slice(cases.length).map((rest) => ({ id: rest, status: 'not running' as const, reason }))] };
      }
      throw error;
    }
    const passed = outcomes.filter((outcome) => outcome.passed).length;
    const record = writeResultsRecord(root, {
      id,
      samples: EVAL_SAMPLES,
      passed,
      promptHash: inputs.promptHash,
      modelId: recordModelId(outcomes),
      schemaHash: inputs.schemaHash,
      ranAt: new Date().toISOString(),
      runner: EVAL_RUNNER,
      caseSha256: createHash('sha256').update(readFileSync(join(root, path))).digest('hex'),
      fixtures: prepared.fixtures.map((fixture) => ({ path: fixture.path, sha256: fixture.sha256 })),
      sampleOutcomes: outcomes,
    });
    cases.push({ id, status: passed === EVAL_SAMPLES ? 'passed' : 'failed', passed, samples: EVAL_SAMPLES, record });
  }
  return { running: true, cases };
}

/** The report as lines for a terminal. */
export function formatEvalReport(report: EvalRunReport): string[] {
  const lines = report.cases.map((entry) => {
    switch (entry.status) {
      case 'not running':
        return `${entry.id}: not running: ${entry.reason}`;
      case 'no case file':
        return `${entry.id}: no case file in ${EVAL_CASES_DIR}/`;
      case 'stub':
        return `${entry.id}: stub, not run`;
      case 'invalid':
        return `${entry.id}: invalid case: ${entry.problems.join('; ')}`;
      default:
        return `${entry.id}: ${entry.passed} of ${entry.samples} passed (${entry.status}); record ${entry.record}`;
    }
  });
  if (!report.running && report.reason !== undefined) lines.unshift(`Evals not running: ${report.reason}.`);
  return lines;
}
