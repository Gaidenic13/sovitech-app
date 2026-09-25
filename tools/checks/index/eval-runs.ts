/**
 * Whether an eval (E) case may count as real: the evidence of an eval run
 * (docs/guardrails.md section 7, "Model-behaviour evals": each case is sampled 5
 * times and must pass 5 of 5; CLAUDE.md definition of done item 2: the evals run
 * again whenever prompts/, the model id or the AI output schema changes).
 *
 * This replaces the hand-set `EVAL_RUNNER_EXISTS` switch (phase 0 review, round 2:
 * flipping it made every full-bodied eval real with no runner and no result
 * behind it). An E case counts as real only when all of these hold:
 * 1. the eval runner module exists (EVAL_RUNNER_MODULE; phase 2 writes it);
 * 2. the prompt, the model id and the output schema can be read (PROMPTS_DIR,
 *    AI_MODEL_FILE's `MODEL_ID`, AI_SCHEMA_DIR);
 * 3. a results record for the case exists (EVAL_RESULTS_DIR/<ID>.json) naming its
 *    id, the prompt hash, the model id and the schema hash it ran against, with
 *    `samples: 5` and `passed: 5`;
 * 4. that record's hashes and model id equal the current ones, so no change to
 *    prompts/, the model id or the schema came after the run.
 * Until the runner exists no E case is real, whatever its files say. Once it
 * exists, a full eval without `status: pending` and without a current 5-of-5
 * record is a problem that fails the index check.
 *
 * The paths are the phase 2 contract; phase 2 may move them in the same change as
 * the runner, and the index check's seeds and tests with them.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';

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
    };

/** No eval runner: the state until phase 2. */
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
  };
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
  return gaps;
}
