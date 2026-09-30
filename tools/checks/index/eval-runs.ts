/**
 * Whether an eval (E) case may count as real: the evidence of an eval run
 * (docs/guardrails.md section 7, "Model-behaviour evals": each case is sampled 5
 * times and must pass 5 of 5; CLAUDE.md definition of done item 2: the evals run
 * again whenever prompts/, the model id or the AI output schema changes).
 *
 * This replaces the hand-set `EVAL_RUNNER_EXISTS` switch (phase 0 review, round 2:
 * flipping it made every full-bodied eval real with no runner and no result
 * behind it). An E case counts as real only when all of these hold:
 * 1. the eval runner module exists (EVAL_RUNNER_MODULE; built in phase 2);
 * 2. the prompt, the model id and the output schema can be read (PROMPTS_DIR,
 *    AI_MODEL_FILE's `MODEL_ID`, AI_SCHEMA_DIR);
 * 3. a results record for the case exists (EVAL_RESULTS_DIR/<ID>.json) naming its
 *    id, the prompt hash, the model id and the schema hash it ran against, with
 *    `samples: 5` and `passed: 5`;
 * 4. that record's hashes and model id equal the current ones, so no change to
 *    prompts/, the model id or the schema came after the run;
 * 5. the record was made from the case as it stands and the fixtures as the manifest
 *    lists them: its `caseSha256` is the SHA-256 of the current case file, it names every
 *    fixture the case file names, and each fixture's `sha256` is the one
 *    fixtures/manifest.json lists (a changed assertion or fixture makes the record stale);
 * 6. its `sampleOutcomes` hold the 5 samples, numbered 1 to 5, each passed with no
 *    failure and each naming the current model id (phase 2 review, adversarial finding
 *    "eval results integrity": a hand-written record with `passed: 5` and the computable
 *    hashes counted as a real eval).
 * Until the runner exists no E case is real, whatever its files say. Once it
 * exists, a full eval without `status: pending` and without a current 5-of-5
 * record is a problem that fails the index check.
 *
 * The paths are the phase 2 contract. Phase 2 built the runner on them unchanged
 * (packages/ai/src/evals/runner.ts and results.ts, which hash the prompt and schema
 * folders exactly as folderHash below does); eval-runs.test.ts, "the phase 2 runner keeps
 * the contract", proves the two agree on this repository.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { parse as parseYaml } from 'yaml';

/** The eval runner (prompt 3 section 6: packages/ai holds the eval runner). */
export const EVAL_RUNNER_MODULE = 'packages/ai/src/evals/runner.ts';
/** One results record per eval: `<EVAL_RESULTS_DIR>/<ID>.json`. The index check ignores `_` folders under evals/guardrails/. */
export const EVAL_RESULTS_DIR = 'evals/guardrails/_results';
/** The in-app AI's prompts. */
export const PROMPTS_DIR = 'prompts';
/** The file that declares the model id as `export const MODEL_ID = '<id>'`. */
export const AI_MODEL_FILE = 'packages/ai/src/model.ts';
/** The AI output schema's source files. */
export const AI_SCHEMA_DIR = 'packages/ai/src/schema';
/** Samples per eval, and passes needed (guardrails section 7). */
export const EVAL_SAMPLES_REQUIRED = 5;
/** The eval case files: `<EVAL_CASES_DIR>/<ID>.yaml`. */
export const EVAL_CASES_DIR = 'evals/guardrails';
/** The fixture manifest, with each fixture's SHA-256. */
export const FIXTURE_MANIFEST = 'fixtures/manifest.json';

const MODEL_ID = /export\s+const\s+MODEL_ID\s*(?::\s*string\s*)?=\s*(['"])([^'"\n]+)\1/;

/** What the eval runs are checked against: the current prompt, model id and schema. */
export interface EvalInputsNow {
  promptHash: string;
  modelId: string;
  schemaHash: string;
}

/** The evidence of eval runs under a root. */
export type EvalRunEvidence =
  | { readonly runner: false; readonly why: string }
  | {
      readonly runner: true;
      /** The current prompt, model id and schema; undefined with the reason when one cannot be read. */
      readonly now: EvalInputsNow | { readonly unreadable: string };
      /** Reads the results record of one eval: its root-relative path and text, if it exists. */
      readonly record: (id: string) => { path: string; text: string | undefined };
      /** Reads the case file of one eval: its root-relative path and bytes, if it exists. */
      readonly caseFile?: (id: string) => { path: string; bytes: Uint8Array | undefined };
      /** The fixtures fixtures/manifest.json lists, by path, with their SHA-256; or why it cannot be read. */
      readonly manifest?: ReadonlyMap<string, string> | { readonly unreadable: string };
    };

/** No eval runner: the state before phase 2 (and of seeded roots that hold none). */
export const NO_EVAL_RUNNER: EvalRunEvidence = {
  runner: false,
  why: `the eval runner (${EVAL_RUNNER_MODULE}) does not exist yet`,
};

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

/** Every file under a folder, as paths relative to it with forward slashes, sorted. */
function filesUnder(dir: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const found: string[] = [];
  const walk = (relative: string): void => {
    for (const name of readdirSync(join(dir, relative)).sort()) {
      if (name.startsWith('.')) continue;
      const path = relative === '' ? name : posix.join(relative, name);
      if (statSync(join(dir, path)).isDirectory()) walk(path);
      else found.push(path);
    }
  };
  walk('');
  return found.sort();
}

/**
 * The hash of a folder's files: SHA-256 over each file's relative path and bytes,
 * in path order, as `sha256:<hex>`; undefined when the folder holds no file.
 */
export function folderHash(dir: string): string | undefined {
  const files = filesUnder(dir);
  if (files.length === 0) return undefined;
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(join(dir, file)));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

/** The current prompt hash, model id and schema hash under a root, or why one cannot be read. */
export function evalInputsNow(root: string): EvalInputsNow | { unreadable: string } {
  const promptHash = folderHash(join(root, PROMPTS_DIR));
  if (promptHash === undefined) return { unreadable: `${PROMPTS_DIR}/ holds no file` };
  const modelFile = join(root, AI_MODEL_FILE);
  const modelId = isFile(modelFile) ? MODEL_ID.exec(readFileSync(modelFile, 'utf8'))?.[2] : undefined;
  if (modelId === undefined) return { unreadable: `${AI_MODEL_FILE} declares no "export const MODEL_ID = '<id>'"` };
  const schemaHash = folderHash(join(root, AI_SCHEMA_DIR));
  if (schemaHash === undefined) return { unreadable: `${AI_SCHEMA_DIR}/ holds no file` };
  return { promptHash, modelId, schemaHash };
}

/** The fixtures a manifest lists, by path, with their SHA-256; or why it cannot be read. */
export function readFixtureManifest(root: string): ReadonlyMap<string, string> | { readonly unreadable: string } {
  const absolute = join(root, FIXTURE_MANIFEST);
  if (!isFile(absolute)) return { unreadable: `${FIXTURE_MANIFEST} does not exist` };
  let value: unknown;
  try {
    value = parseYaml(readFileSync(absolute, 'utf8'), { schema: 'json' });
  } catch {
    return { unreadable: `${FIXTURE_MANIFEST} is not JSON` };
  }
  const files = (value as { files?: unknown } | null)?.files;
  if (!Array.isArray(files)) return { unreadable: `${FIXTURE_MANIFEST} lists no files` };
  const listed = new Map<string, string>();
  for (const entry of files as unknown[]) {
    const { path, sha256 } = (entry ?? {}) as { path?: unknown; sha256?: unknown };
    if (typeof path === 'string' && typeof sha256 === 'string' && /^[0-9a-f]{64}$/u.test(sha256)) listed.set(path, sha256);
  }
  return listed;
}

/** Reads the evidence of eval runs under a root. */
export function readEvalRunEvidence(root: string): EvalRunEvidence {
  if (!isFile(join(root, EVAL_RUNNER_MODULE))) return NO_EVAL_RUNNER;
  return {
    runner: true,
    now: evalInputsNow(root),
    record: (id) => {
      const path = `${EVAL_RESULTS_DIR}/${id}.json`;
      const absolute = join(root, path);
      return { path, text: isFile(absolute) ? readFileSync(absolute, 'utf8') : undefined };
    },
    caseFile: (id) => {
      const path = `${EVAL_CASES_DIR}/${id}.yaml`;
      const absolute = join(root, path);
      return { path, bytes: isFile(absolute) ? readFileSync(absolute) : undefined };
    },
    manifest: readFixtureManifest(root),
  };
}

/** Every fixture path a case file names: its string values that start with "fixtures/". */
function fixturePathsNamed(bytes: Uint8Array): string[] | undefined {
  let value: unknown;
  try {
    value = parseYaml(Buffer.from(bytes).toString('utf8'));
  } catch {
    return undefined;
  }
  const found = new Set<string>();
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      if (node.startsWith('fixtures/')) found.add(node);
    } else if (Array.isArray(node)) node.forEach(walk);
    else if (typeof node === 'object' && node !== null) Object.values(node).forEach(walk);
  };
  walk(value);
  return [...found].sort();
}

/** Why a record's case hash, fixtures and sample outcomes do not show a current 5-of-5 run (points 5 and 6 above). */
function provenanceGaps(id: string, path: string, fields: Record<string, unknown>, evidence: Extract<EvalRunEvidence, { runner: true }>, modelId: string): string[] {
  const gaps: string[] = [];
  // 5. The case file as it stands.
  const caseFile = evidence.caseFile?.(id);
  if (caseFile === undefined || caseFile.bytes === undefined) gaps.push(`the case file of ${id} cannot be read, so ${path} cannot be matched to it`);
  else {
    const caseSha256 = createHash('sha256').update(caseFile.bytes).digest('hex');
    if (fields['caseSha256'] !== caseSha256) gaps.push(`${path} ran against another case file: ${caseFile.path} changed since (caseSha256)`);
  }
  // 5. The fixtures as the manifest lists them, every one the case names.
  const fixtures = fields['fixtures'];
  const recorded = new Map<string, unknown>();
  if (!Array.isArray(fixtures) || fixtures.length === 0) gaps.push(`${path} names no fixture it sent`);
  else {
    for (const entry of fixtures as unknown[]) {
      const { path: fixture, sha256 } = (entry ?? {}) as { path?: unknown; sha256?: unknown };
      if (typeof fixture === 'string') recorded.set(fixture, sha256);
      else gaps.push(`${path} names a fixture without its path`);
    }
    const manifest = evidence.manifest;
    if (manifest === undefined || 'unreadable' in manifest) gaps.push(`the fixtures of ${path} cannot be matched to ${FIXTURE_MANIFEST}: ${manifest === undefined ? 'it was not read' : manifest.unreadable}`);
    else {
      for (const [fixture, sha256] of recorded) {
        const listed = manifest.get(fixture);
        if (listed === undefined) gaps.push(`${path} sent ${fixture}, which ${FIXTURE_MANIFEST} does not list`);
        else if (sha256 !== listed) gaps.push(`${path} sent ${fixture} with another SHA-256 than ${FIXTURE_MANIFEST} lists: the fixture changed since`);
      }
    }
  }
  if (caseFile?.bytes !== undefined) {
    const named = fixturePathsNamed(caseFile.bytes);
    if (named === undefined) gaps.push(`${caseFile.path} does not parse, so the fixtures it names cannot be matched`);
    else for (const fixture of named) if (!recorded.has(fixture)) gaps.push(`${path} does not name ${fixture}, which ${caseFile.path} names`);
  }
  // 6. The five samples, each passed and naming the current model.
  const outcomes = fields['sampleOutcomes'];
  if (!Array.isArray(outcomes) || outcomes.length !== EVAL_SAMPLES_REQUIRED) {
    gaps.push(`${path} records ${Array.isArray(outcomes) ? outcomes.length : 'no'} sample outcomes; each eval records its ${EVAL_SAMPLES_REQUIRED} samples`);
  } else {
    const numbers = (outcomes as unknown[]).map((outcome) => (outcome as { sample?: unknown } | null)?.sample);
    const expected = Array.from({ length: EVAL_SAMPLES_REQUIRED }, (_, index) => index + 1);
    if ([...numbers].sort().join(',') !== expected.join(',')) gaps.push(`${path} numbers its samples ${JSON.stringify(numbers)}, not 1 to ${EVAL_SAMPLES_REQUIRED}`);
    (outcomes as unknown[]).forEach((outcome, index) => {
      const sample = (outcome ?? {}) as { passed?: unknown; modelId?: unknown; failures?: unknown };
      if (sample.passed !== true || !Array.isArray(sample.failures) || sample.failures.length > 0) gaps.push(`${path} sample outcome ${index + 1} did not pass`);
      if (sample.modelId !== modelId) gaps.push(`${path} sample outcome ${index + 1} names model ${JSON.stringify(sample.modelId)}, not ${modelId}`);
    });
  }
  return gaps;
}

/**
 * Why an eval does not have a current 5-of-5 result, or an empty list when it
 * does. Only meaningful once the runner exists.
 */
export function evalResultGaps(id: string, evidence: EvalRunEvidence): string[] {
  if (!evidence.runner) return [evidence.why];
  const { path, text } = evidence.record(id);
  if (text === undefined) return [`no results record at ${path}`];
  let record: unknown;
  try {
    record = JSON.parse(text);
  } catch {
    return [`${path} is not JSON`];
  }
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return [`${path} is not a JSON object`];
  const fields = record as Record<string, unknown>;
  const gaps: string[] = [];
  if (fields['id'] !== id) gaps.push(`${path} names ${JSON.stringify(fields['id'])}, not ${id}`);
  if (fields['samples'] !== EVAL_SAMPLES_REQUIRED) {
    gaps.push(`${path} records ${JSON.stringify(fields['samples'])} samples; each eval is sampled ${EVAL_SAMPLES_REQUIRED} times`);
  }
  if (fields['passed'] !== EVAL_SAMPLES_REQUIRED) {
    gaps.push(`${path} records ${JSON.stringify(fields['passed'])} passes; an eval passes only at ${EVAL_SAMPLES_REQUIRED} of ${EVAL_SAMPLES_REQUIRED}`);
  }
  if ('unreadable' in evidence.now) {
    gaps.push(`the run cannot be matched to the current prompt, model id and schema: ${evidence.now.unreadable}`);
    return gaps;
  }
  const now = evidence.now;
  if (fields['promptHash'] !== now.promptHash) gaps.push(`${path} ran against another prompt: ${PROMPTS_DIR}/ changed since`);
  if (fields['modelId'] !== now.modelId) gaps.push(`${path} ran against model ${JSON.stringify(fields['modelId'])}, not ${now.modelId}`);
  if (fields['schemaHash'] !== now.schemaHash) gaps.push(`${path} ran against another output schema: ${AI_SCHEMA_DIR}/ changed since`);
  gaps.push(...provenanceGaps(id, path, fields, evidence, now.modelId));
  return gaps;
}
