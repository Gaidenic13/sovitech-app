/**
 * The evidence of eval runs (eval-runs.ts): the hand-set EVAL_RUNNER_EXISTS
 * switch is gone (phase 0 review, round 2). An eval counts as real only with the
 * runner present and a 5-of-5 results record made against the current prompt,
 * model id and schema.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { classifyEvalCase, type PathExists } from './case-files';
import {
  AI_MODEL_FILE,
  AI_SCHEMA_DIR,
  EVAL_RESULTS_DIR,
  EVAL_RUNNER_MODULE,
  NO_EVAL_RUNNER,
  PROMPTS_DIR,
  evalInputsNow,
  evalResultGaps,
  folderHash,
  readEvalRunEvidence,
} from './eval-runs';

const EVAL = 'id: G1-1\nfixture: fixtures/evals/G1-1/input.txt\ntask: TEST task\nassertions:\n  - TEST assertion\nsamples: 5\n';
const fixture: PathExists = (path) => path === 'fixtures/evals/G1-1/input.txt';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A scratch root with the files given, relative to it. */
function rootWith(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'sovitech-eval-runs-'));
  roots.push(root);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const RUNNER_FILES = {
  [EVAL_RUNNER_MODULE]: '// TEST runner\n',
  [`${PROMPTS_DIR}/system.md`]: 'TEST prompt\n',
  [AI_MODEL_FILE]: "export const MODEL_ID = 'TEST-model';\n",
  [`${AI_SCHEMA_DIR}/output.ts`]: '// TEST schema\n',
};

/** A results record for G1-1 made against the root's current inputs, with overrides. */
function recordFor(root: string, overrides: Record<string, unknown> = {}): string {
  const now = evalInputsNow(root);
  if ('unreadable' in now) throw new Error(now.unreadable);
  return JSON.stringify({ id: 'G1-1', ...now, samples: 5, passed: 5, ranAt: '2026-09-25T10:00:00.000Z', ...overrides });
}

const classify = (root: string) => classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', EVAL, fixture, readEvalRunEvidence(root));

describe('eval runs: no runner', () => {
  it('counts a full eval as pending while the runner module does not exist, even with a results record', () => {
    const root = rootWith({ [`${EVAL_RESULTS_DIR}/G1-1.json`]: '{"id":"G1-1","samples":5,"passed":5}' });
    expect(readEvalRunEvidence(root)).toEqual(NO_EVAL_RUNNER);
    expect(classify(root)).toEqual({ status: 'pending', problems: [] });
  });

  it('is the default when no evidence is given', () => {
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', EVAL, fixture).status).toBe('pending');
  });
});

describe('eval runs: the runner exists', () => {
  it('counts an eval without a results record as pending, with a problem that fails the check', () => {
    const root = rootWith(RUNNER_FILES);
    const missing = classify(root);
    expect(missing.status).toBe('pending');
    expect(missing.problems).toEqual([
      'evals/guardrails/G1-1.yaml:1: [eval] no current 5 of 5 result: no results record at evals/guardrails/_results/G1-1.json. ' +
        'Run the eval (5 samples) against the current prompt, model id and schema, or mark it "status: pending"',
    ]);
  });

  it.each([
    ['a record made before the prompt changed', { promptHash: 'sha256:TEST-old' }, 'prompts/ changed since'],
    ['a record made with another model', { modelId: 'TEST-other-model' }, 'ran against model "TEST-other-model"'],
    ['a record made before the schema changed', { schemaHash: 'sha256:TEST-old' }, 'packages/ai/src/schema/ changed since'],
    ['4 of 5 passes', { passed: 4 }, 'records 4 passes'],
    ['3 samples', { samples: 3 }, 'records 3 samples'],
    ['another id', { id: 'G1-2' }, 'names "G1-2"'],
  ])('refuses %s', (_name, overrides, reason) => {
    const root = rootWith(RUNNER_FILES);
    mkdirSync(join(root, EVAL_RESULTS_DIR), { recursive: true });
    writeFileSync(join(root, EVAL_RESULTS_DIR, 'G1-1.json'), recordFor(root, overrides));
    const outcome = classify(root);
    expect(outcome.status).toBe('pending');
    expect(outcome.problems.join('\n')).toContain(reason);
  });

  it('counts the eval as real with a current record, and stops as soon as the prompt changes', () => {
    const root = rootWith(RUNNER_FILES);
    mkdirSync(join(root, EVAL_RESULTS_DIR), { recursive: true });
    writeFileSync(join(root, EVAL_RESULTS_DIR, 'G1-1.json'), recordFor(root));
    expect(classify(root)).toEqual({ status: 'real', problems: [] });
    writeFileSync(join(root, PROMPTS_DIR, 'system.md'), 'TEST prompt, edited\n');
    expect(classify(root).status).toBe('pending');
  });

  it('keeps an eval marked "status: pending" pending, with no problem', () => {
    const root = rootWith(RUNNER_FILES);
    const text = EVAL.replace('id: G1-1\n', 'id: G1-1\nstatus: pending\n');
    expect(classifyEvalCase('G1-1', 'evals/guardrails/G1-1.yaml', text, fixture, readEvalRunEvidence(root))).toEqual({
      status: 'pending',
      problems: [],
    });
  });

  it('names what cannot be read: no prompt, no model id, no schema, a record that is not JSON', () => {
    const noModel = rootWith({ ...RUNNER_FILES, [AI_MODEL_FILE]: '// TEST: no model id here\n' });
    mkdirSync(join(noModel, EVAL_RESULTS_DIR), { recursive: true });
    writeFileSync(join(noModel, EVAL_RESULTS_DIR, 'G1-1.json'), '{"id":"G1-1","samples":5,"passed":5}');
    expect(evalResultGaps('G1-1', readEvalRunEvidence(noModel)).join('\n')).toContain('declares no "export const MODEL_ID');
    const notJson = rootWith({ ...RUNNER_FILES, [`${EVAL_RESULTS_DIR}/G1-1.json`]: 'TEST' });
    expect(evalResultGaps('G1-1', readEvalRunEvidence(notJson))).toEqual(['evals/guardrails/_results/G1-1.json is not JSON']);
    expect(folderHash(join(notJson, 'no-such-folder'))).toBeUndefined();
  });
});
