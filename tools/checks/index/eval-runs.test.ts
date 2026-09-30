/**
 * The evidence of eval runs (eval-runs.ts): the hand-set EVAL_RUNNER_EXISTS
 * switch is gone (phase 0 review, round 2). An eval counts as real only with the
 * runner present and a 5-of-5 results record made against the current prompt,
 * model id and schema.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { MODEL_ID } from '@sovitech/ai';
import {
  AI_SCHEMA_DIR as RUNNER_SCHEMA_DIR,
  EVAL_RESULTS_DIR as RUNNER_RESULTS_DIR,
  EVAL_RUNNER,
  PROMPTS_DIR as RUNNER_PROMPTS_DIR,
  currentEvalInputs,
  folderHash as runnerFolderHash,
} from '@sovitech/ai/evals';
import { afterEach, describe, expect, it } from 'vitest';
import { repoRoot } from '../lib';
import { classifyEvalCase, type PathExists } from './case-files';
import {
  AI_MODEL_FILE,
  AI_SCHEMA_DIR,
  EVAL_CASES_DIR,
  EVAL_RESULTS_DIR,
  EVAL_RUNNER_MODULE,
  FIXTURE_MANIFEST,
  NO_EVAL_RUNNER,
  PROMPTS_DIR,
  evalInputsNow,
  evalResultGaps,
  folderHash,
  readEvalRunEvidence,
  readFixtureManifest,
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

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');
const FIXTURE_TEXT = 'TEST synthetic fixture of the seeded eval G1-1.\n';

const RUNNER_FILES = {
  [EVAL_RUNNER_MODULE]: '// TEST runner\n',
  [`${PROMPTS_DIR}/system.md`]: 'TEST prompt\n',
  [AI_MODEL_FILE]: "export const MODEL_ID = 'TEST-model';\n",
  [`${AI_SCHEMA_DIR}/output.ts`]: '// TEST schema\n',
  [`${EVAL_CASES_DIR}/G1-1.yaml`]: EVAL,
  'fixtures/evals/G1-1/input.txt': FIXTURE_TEXT,
  [FIXTURE_MANIFEST]: JSON.stringify({ files: [{ path: 'fixtures/evals/G1-1/input.txt', sha256: sha256(FIXTURE_TEXT) }] }),
};

/** Five passing sample outcomes naming a model id. */
const samples = (modelId: string) => [1, 2, 3, 4, 5].map((sample) => ({ sample, passed: true, modelId, failures: [] }));

/** A results record for G1-1 made against the root's current inputs, case file and fixtures, with overrides. */
function recordFor(root: string, overrides: Record<string, unknown> = {}): string {
  const now = evalInputsNow(root);
  if ('unreadable' in now) throw new Error(now.unreadable);
  return JSON.stringify({
    id: 'G1-1',
    ...now,
    samples: 5,
    passed: 5,
    ranAt: '2026-09-25T10:00:00.000Z',
    caseSha256: sha256(EVAL),
    fixtures: [{ path: 'fixtures/evals/G1-1/input.txt', sha256: sha256(FIXTURE_TEXT) }],
    sampleOutcomes: samples(now.modelId),
    ...overrides,
  });
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
    // Phase 2 review, adversarial finding "eval results integrity": the case file, the fixtures and the samples behind the record.
    ['a record made before the case file changed', { caseSha256: 'a'.repeat(64) }, 'G1-1.yaml changed since (caseSha256)'],
    ['a fixture with another SHA-256 than the manifest lists', { fixtures: [{ path: 'fixtures/evals/G1-1/input.txt', sha256: 'b'.repeat(64) }] }, 'the fixture changed since'],
    ['a fixture the manifest does not list, and the one the case names left out', { fixtures: [{ path: 'fixtures/evals/G1-1/other.txt', sha256: 'c'.repeat(64) }] }, 'does not name fixtures/evals/G1-1/input.txt'],
    ['no fixture', { fixtures: [] }, 'names no fixture it sent'],
    ['a hand-written record with no sample outcomes', { sampleOutcomes: [] }, 'records 0 sample outcomes'],
    ['four sample outcomes', { sampleOutcomes: samples('TEST-model').slice(0, 4) }, 'records 4 sample outcomes'],
    ['a sample that failed', { sampleOutcomes: samples('TEST-model').map((sample, index) => (index === 2 ? { ...sample, passed: false, failures: ['TEST'] } : sample)) }, 'sample outcome 3 did not pass'],
    ['a sample naming another model', { sampleOutcomes: samples('TEST-model').map((sample, index) => (index === 4 ? { ...sample, modelId: 'TEST-other-model' } : sample)) }, 'sample outcome 5 names model "TEST-other-model"'],
    ['samples numbered twice', { sampleOutcomes: samples('TEST-model').map((sample) => ({ ...sample, sample: 1 })) }, 'not 1 to 5'],
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

/**
 * The phase 2 runner (packages/ai/src/evals/runner.ts) against this contract: the paths,
 * the hashes and the record shape the index check reads. No model is called: the record
 * below is built from the runner's own inputs, never written to the repository.
 */
describe('eval runs: the phase 2 runner keeps the contract', () => {
  it('ADR 0023 · ADR 0003: lives where the check looks, and names the same folders and model file', () => {
    expect(existsSync(join(repoRoot, EVAL_RUNNER_MODULE))).toBe(true);
    expect(EVAL_RUNNER).toBe(EVAL_RUNNER_MODULE);
    expect(RUNNER_RESULTS_DIR).toBe(EVAL_RESULTS_DIR);
    expect(RUNNER_PROMPTS_DIR).toBe(PROMPTS_DIR);
    expect(RUNNER_SCHEMA_DIR).toBe(AI_SCHEMA_DIR);
    expect(readFileSync(join(repoRoot, AI_MODEL_FILE), 'utf8')).toContain(`export const MODEL_ID = '${MODEL_ID}';`);
  });

  it('ADR 0023 · ADR 0003: computes the prompt hash, the model id and the schema hash exactly as the check does, on this repository', () => {
    expect(currentEvalInputs(repoRoot)).toEqual(evalInputsNow(repoRoot));
    expect(runnerFolderHash(join(repoRoot, PROMPTS_DIR))).toBe(folderHash(join(repoRoot, PROMPTS_DIR)));
  });

  it('ADR 0023 · ADR 0003: writes a record the check accepts at 5 of 5 and refuses below it', () => {
    const inputs = currentEvalInputs(repoRoot);
    const caseBytes = readFileSync(join(repoRoot, EVAL_CASES_DIR, 'G1-1.yaml'));
    const manifest = readFixtureManifest(repoRoot);
    if ('unreadable' in manifest) throw new Error(manifest.unreadable);
    const fixtures = [...manifest].filter(([path]) => path.startsWith('fixtures/evals/G1-1/')).map(([path, hash]) => ({ path, sha256: hash }));
    expect(fixtures.length).toBeGreaterThan(0);
    const record = (passed: number) =>
      JSON.stringify({
        id: 'G1-1',
        samples: 5,
        passed,
        ...inputs,
        ranAt: '2026-09-26T10:00:00.000Z',
        runner: EVAL_RUNNER,
        caseSha256: createHash('sha256').update(caseBytes).digest('hex'),
        fixtures,
        sampleOutcomes: [1, 2, 3, 4, 5].map((sample) => ({ sample, passed: sample <= passed, modelId: MODEL_ID, failures: sample <= passed ? [] : ['TEST'] })),
      });
    const repository = readEvalRunEvidence(repoRoot);
    if (!repository.runner) throw new Error('the eval runner is missing');
    const evidence = (text: string) => ({ ...repository, record: () => ({ path: `${EVAL_RESULTS_DIR}/G1-1.json`, text }) });
    expect(evalResultGaps('G1-1', evidence(record(5)))).toEqual([]);
    expect(evalResultGaps('G1-1', evidence(record(4))).join('\n')).toContain('records 4 passes');
    expect(evalResultGaps('G1-1', evidence(record(4))).join('\n')).toContain('sample outcome 5 did not pass');
  });
});
