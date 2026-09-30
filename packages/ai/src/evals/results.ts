/**
 * The eval results record: one JSON file per eval, the contract the index check reads
 * (tools/checks/index/eval-runs.ts). An E case counts as real only when its record names
 * its id, `samples: 5`, `passed: 5`, and the prompt hash, model id and schema hash of the
 * current prompt, model and output schema; any change to prompts/, MODEL_ID or the schema
 * folder makes the record stale, and the eval must run again (CLAUDE.md, definition of
 * done item 2).
 *
 * The hashes are computed here exactly as the index check computes them: SHA-256 over
 * each file's path (relative to the folder, forward slashes) and bytes, in path order,
 * skipping dot-files, as `sha256:<hex>`. tools/checks/index/eval-runs.test.ts proves the
 * two agree on this repository.
 *
 * A record is written only by the runner after real model calls (runner.ts); it holds
 * codes, counts, hashes and ids, never a model output or document text.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { MODEL_ID } from '../model';
import { EVAL_SAMPLES } from './case';

/** One results record per eval: `<EVAL_RESULTS_DIR>/<ID>.json`. */
export const EVAL_RESULTS_DIR = 'evals/guardrails/_results';
/** The folder of the in-app AI's prompts. */
export const PROMPTS_DIR = 'prompts';
/** The folder of the AI output schema's source files. */
export const AI_SCHEMA_DIR = 'packages/ai/src/schema';
/** This module's runner, named in each record. */
export const EVAL_RUNNER = 'packages/ai/src/evals/runner.ts';

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

/** The hash of a folder's files, as the index check computes it; undefined when the folder holds no file. */
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

export interface EvalInputs {
  readonly promptHash: string;
  readonly modelId: string;
  readonly schemaHash: string;
}

/** The prompt hash, model id and schema hash an eval runs against now. */
export function currentEvalInputs(root: string): EvalInputs {
  const promptHash = folderHash(join(root, PROMPTS_DIR));
  const schemaHash = folderHash(join(root, AI_SCHEMA_DIR));
  if (promptHash === undefined) throw new Error(`${PROMPTS_DIR}/ holds no file`);
  if (schemaHash === undefined) throw new Error(`${AI_SCHEMA_DIR}/ holds no file`);
  return { promptHash, modelId: MODEL_ID, schemaHash };
}

/** How one sample went: whether it passed, the model id the API returned, and the failures as codes. */
export interface SampleOutcome {
  readonly sample: number;
  readonly passed: boolean;
  readonly modelId: string | null;
  readonly failures: readonly string[];
}

export interface EvalResultsRecord {
  readonly id: string;
  readonly samples: typeof EVAL_SAMPLES;
  readonly passed: number;
  readonly promptHash: string;
  /** The model id every sample's response named; the index check compares it with MODEL_ID. */
  readonly modelId: string | null;
  readonly schemaHash: string;
  readonly ranAt: string;
  readonly runner: string;
  /** SHA-256 of the case file and of each fixture it sent, for the reader. */
  readonly caseSha256: string;
  readonly fixtures: readonly { readonly path: string; readonly sha256: string }[];
  readonly sampleOutcomes: readonly SampleOutcome[];
}

/** The model id a record names: the one id every answered sample's response named, or null when there is none or they differ. */
export function recordModelId(outcomes: readonly SampleOutcome[]): string | null {
  const ids = [...new Set(outcomes.flatMap((outcome) => (outcome.modelId === null ? [] : [outcome.modelId])))];
  return ids.length === 1 && outcomes.every((outcome) => outcome.modelId !== null) ? (ids[0] ?? null) : null;
}

/** Writes a record at `<root>/<EVAL_RESULTS_DIR>/<id>.json` and returns its root-relative path. */
export function writeResultsRecord(root: string, record: EvalResultsRecord): string {
  const path = `${EVAL_RESULTS_DIR}/${record.id}.json`;
  mkdirSync(join(root, EVAL_RESULTS_DIR), { recursive: true });
  writeFileSync(join(root, path), `${JSON.stringify(record, null, 2)}\n`);
  return path;
}
