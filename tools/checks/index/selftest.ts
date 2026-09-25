/**
 * Self-test of the index check (`pnpm check:selftest`).
 *
 * 1. The control input, seeded/good/, must pass with the expected lists: real,
 *    pending (direct import and through a support re-export, and both evals,
 *    since no eval runs before the phase 2 eval runner) and none missing.
 *    If it does not, the self-test throws, because a check that fails on good
 *    input proves nothing by failing on bad input.
 * 2. Each seeded bad input must fail, and for its own seeded reason. A bad input
 *    that fails for another reason throws too, so a broken seed cannot pass
 *    the self-test by accident.
 * 3. The run-time half: a real Vitest run on the run guard's seeded root
 *    (tools/vitest/seeded/run/, in a child process, with the repository's stub
 *    guard) must end every seeded case file as its seed says, the two controls
 *    clean. Each seeded file that must fail becomes one more result here. And on
 *    each seeded root that Vitest alone passes (a case held out by
 *    `{ skip: true }`; a case file the config excludes; a run without the stub
 *    guard), the guard must fail the run.
 *
 * 4. The settings that keep the run-time half in place: the repository's must
 *    pass the config-integrity check, and each seeded setting under
 *    tools/vitest/seeded/config/ (the run guard dropped, the stub guard dropped,
 *    a --reporter on the test script, ...) must fail it for its seeded reason.
 *
 * Returns one CheckResult per bad input; run-all passes the self-test only when
 * every one of them has ok: false.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NO_ASSERTION_OLD_CONFIG_ENV,
  SEEDED_GUARD_ONLY_ROOTS,
  SEEDED_NO_ASSERTION_ROOT,
  SEEDED_RUN_EXPECTATIONS,
  runSeededGuard,
  runSeededVitest,
  unmetExpectations,
} from '../../vitest/run-seeded';
import { SEEDED_CONFIGS, SEEDED_CONFIG_DIR, checkConfigIntegrity } from '../../vitest/config-integrity';
import type { CheckResult, SelfTest } from '../types';
import { buildIndexReport, reportToResult } from './index-check';

const SEEDED = join(dirname(fileURLToPath(import.meta.url)), 'seeded');

/** Each seeded bad input and the evidence that it failed for its seeded reason. */
const BAD_INPUTS: ReadonlyArray<{ name: string; reason: (result: CheckResult) => boolean }> = [
  { name: 'missing-id', reason: (result) => result.noAutomatedCheckYet?.includes('G1-2') === true },
  { name: 'extra-id', reason: problemWith('tests/guardrails/G9-9.test.ts', '[unindexed]') },
  { name: 'wrong-type-test', reason: problemWith('tests/guardrails/G2-1.test.ts', '[wrong type]') },
  { name: 'wrong-type-eval', reason: problemWith('evals/guardrails/G1-1.yaml', '[wrong type]') },
  { name: 'duplicate-id', reason: problemWith('docs/guardrails.md', 'listed twice') },
  { name: 'row-outside-table', reason: problemWith('docs/guardrails.md', 'outside the table') },
  { name: 'bad-row', reason: problemWith('docs/guardrails.md', 'T/E cell') },
  { name: 'no-section-7', reason: problemWith('docs/guardrails.md', 'no section 7 heading') },
  { name: 'stub-not-counted', reason: (result) => result.noAutomatedCheckYet?.join(' ') === 'G1-1 G2-1' },
  { name: 'held-out-test', reason: problemWith('tests/guardrails/G1-2.test.ts', '[held out]') },
  { name: 'id-not-named', reason: problemWith('tests/guardrails/G1-1.test.ts', '[title]') },
  { name: 'eval-id-mismatch', reason: problemWith('evals/guardrails/G2-1.yaml', 'the "id" key') },
  { name: 'eval-unknown-status', reason: problemWith('evals/guardrails/G2-1.yaml', 'unknown status') },
  { name: 'eval-malformed-yaml', reason: problemWith('evals/guardrails/G2-1.yaml', 'not valid YAML') },
  { name: 'nested-case-file', reason: problemWith('tests/guardrails/extra/G1-1.test.ts', '[layout]') },
  { name: 'unrecognised-file-name', reason: problemWith('evals/guardrails/G2-1.yml', '[layout]') },
  { name: 'pending-without-marker', reason: problemWith('tests/guardrails/G1-2.test.ts', 'imports the pending wrapper') },
  { name: 'marker-without-wrapper', reason: problemWith('tests/guardrails/G1-2.test.ts', 'does not run its test through the pending wrapper') },
  { name: 'malformed-marker', reason: problemWith('tests/guardrails/G1-2.test.ts', 'malformed pending marker') },
  // Held out without the pending wrapper, in forms a text pattern does not see (phase 0 review, finding
  // "The index check decides from file text alone that a T case is 'real'").
  { name: 'held-out-options', reason: heldOut('the option "skip"') },
  { name: 'held-out-describe-option', reason: heldOut('the option "todo"') },
  { name: 'held-out-fails-option', reason: heldOut('the option "fails"') },
  { name: 'held-out-computed', reason: heldOut('"["skip"]"') },
  { name: 'held-out-destructured', reason: heldOut('the destructured modifier "skip"') },
  { name: 'empty-test', reason: problemWith('tests/guardrails/G1-2.test.ts', '[empty]') },
  // A case that throws the domain's error itself would stay pending forever (finding "The pending wrapper can be gamed").
  { name: 'pending-self-thrown', reason: problemWith('tests/guardrails/G1-2.test.ts', '[pending] names NotImplementedError') },
  // An eval file with less than the full body is a stub (finding "An E case file counts as 'real' with nothing in it but 'id: G1-1'").
  { name: 'eval-id-only', reason: problemWith('evals/guardrails/G2-1.yaml', 'not a full eval case') },
  { name: 'eval-pending-id-only', reason: problemWith('evals/guardrails/G2-1.yaml', 'not a full eval case') },
  { name: 'eval-missing-fixture', reason: problemWith('evals/guardrails/G2-1.yaml', 'does not exist') },
  { name: 'eval-samples-not-5', reason: problemWith('evals/guardrails/G2-1.yaml', '"samples" is 3') },
  // An empty scope never passes (finding "Several checks pass on an empty scope").
  { name: 'empty-table', reason: problemWith('docs/guardrails.md', '[scope] section 7 lists no case id') },
  { name: 'no-tests-folder', reason: problemWith('tests/guardrails/', '[scope]') },
  // Phase 0 review, round 2: more ways a T case counted as real while proving nothing.
  { name: 'vacuous-no-matcher', reason: malformedFor('[vacuous]', 'has no matcher after it') },
  { name: 'vacuous-assertions-zero', reason: malformedFor('[vacuous]', 'expects no assertion') },
  { name: 'vacuous-to-throw', reason: malformedFor('[vacuous]', 'names no error') },
  { name: 'double-vi-mock', reason: malformedFor('[test double]', '(vi.mock, target "@sovitech/domain")') },
  { name: 'double-vi-domock', reason: malformedFor('[test double]', '(vi.doMock, target "../../packages/domain/src/field-state")') },
  { name: 'double-spy-mock', reason: malformedFor('[test double]', '(vi.spyOn, target "domain.derive")') },
  { name: 'double-stub-global', reason: malformedFor('[test double]', '(vi.stubGlobal, target "fetch")') },
  { name: 'double-stub-env', reason: malformedFor('[test double]', '(vi.stubEnv, target "SOVITECH_TEST_FLAG")') },
  { name: 'double-reset-modules', reason: malformedFor('[test double]', '(vi.resetModules, target "")') },
  {
    name: 'support-swallows',
    reason: (result) =>
      problemWith('tests/guardrails/_support/lenient.ts', '[support] a catch clause swallows errors')(result) &&
      malformedFor('[support]', 'imports tests/guardrails/_support/lenient.ts')(result),
  },
  { name: 'reviewed-double-stale', reason: problemWith('tools/checks/index/reviewed-test-doubles.json', 'matches no use') },
  // Phase 1, from the round 2 residuals: a stub reached from a child process or a worker thread,
  // where the stub guard cannot count it; a finally block that returns (in a support helper and
  // in a case file); and the reviewed list of modules that may catch the stub's error.
  { name: 'process-child-process', reason: malformedFor('[process]', 'an import of "node:child_process"') },
  { name: 'process-worker-threads', reason: malformedFor('[process]', 'an import of "node:worker_threads"') },
  {
    name: 'support-finally-return',
    reason: (result) =>
      problemWith('tests/guardrails/_support/lenient.ts', '[support] "return" in a finally block replaces whatever the try block threw')(result) &&
      malformedFor('[support]', 'imports tests/guardrails/_support/lenient.ts')(result),
  },
  { name: 'swallow-finally-in-case', reason: malformedFor('[swallow]', '"return" in a finally block') },
  {
    name: 'support-pin-changed',
    reason: (result) =>
      problemWith('tests/guardrails/_support/property.ts', 'its content changed since it was reviewed')(result) &&
      problemWith('tests/guardrails/_support/property.ts', 'a catch clause swallows errors')(result) &&
      malformedFor('[support]', 'imports tests/guardrails/_support/property.ts')(result),
  },
  { name: 'support-pin-stale', reason: problemWith('tools/checks/index/stub-aware-support.json', 'matches no support module') },
  // The eval switch is no longer a hand-set flag: with the runner present, an eval counts only with a current 5-of-5 record.
  { name: 'eval-runner-no-results', reason: evalNotReal('no results record at evals/guardrails/_results/G2-1.json') },
  { name: 'eval-runner-stale-results', reason: evalNotReal('ran against another prompt: prompts/ changed since') },
];

/** The seeded case file G1-2 fails with this kind and text, and is never counted (its id is no automated check yet). */
function malformedFor(kind: string, text: string): (result: CheckResult) => boolean {
  return (result) =>
    result.details.some((line) => line.startsWith('problem: tests/guardrails/G1-2.test.ts:') && line.includes(kind) && line.includes(text)) &&
    result.noAutomatedCheckYet?.includes('G1-2') === true &&
    result.real?.includes('G1-2') !== true;
}

/** The seeded eval G2-1 fails with this text, and counts as pending, never as real. */
function evalNotReal(text: string): (result: CheckResult) => boolean {
  return (result) =>
    problemWith('evals/guardrails/G2-1.yaml', '[eval] no current 5 of 5 result')(result) &&
    result.details.some((line) => line.includes(text)) &&
    result.pending?.includes('G2-1') === true &&
    result.real?.includes('G2-1') !== true;
}

function heldOut(what: string): (result: CheckResult) => boolean {
  return (result) =>
    problemWith('tests/guardrails/G1-2.test.ts', '[held out]')(result) &&
    result.details.some((line) => line.includes(what)) &&
    result.noAutomatedCheckYet?.includes('G1-2') === true;
}

function problemWith(path: string, text: string): (result: CheckResult) => boolean {
  return (result) => result.details.some((line) => line.startsWith(`problem: ${path}:`) && line.includes(text));
}

async function checkControl(): Promise<void> {
  const report = await buildIndexReport(join(SEEDED, 'good'));
  const result = reportToResult(report);
  const expected = {
    ok: true,
    present: 'G1-1 G7-2a GS-1',
    pending: 'G1-2 G1-3 G2-1 G2-2',
    noAutomatedCheckYet: '',
  };
  const actual = {
    ok: result.ok,
    present: report.present.join(' '),
    pending: report.pending.join(' '),
    noAutomatedCheckYet: (result.noAutomatedCheckYet ?? []).join(' '),
  };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `The index check did not pass its control input seeded/good/ as it must.\n` +
        `expected ${JSON.stringify(expected)}\nactual   ${JSON.stringify(actual)}\n${result.details.join('\n')}`,
    );
  }
}

/**
 * The static half: the control input and every seeded bad input under seeded/.
 * The unit test runs this half; the run-time half has its own unit test in
 * tools/vitest/guardrail-run-guard.test.ts.
 */
export async function staticSelfTest(): Promise<CheckResult[]> {
  await checkControl();
  const results: CheckResult[] = [];
  for (const input of BAD_INPUTS) {
    const result = reportToResult(await buildIndexReport(join(SEEDED, input.name)));
    if (!result.ok && !input.reason(result)) {
      throw new Error(
        `seeded/${input.name}/ failed, but not for its seeded reason, so it proves nothing:\n${result.summary}\n` +
          result.details.join('\n'),
      );
    }
    results.push({ ...result, summary: `seeded/${input.name}: ${result.summary}` });
  }
  return results;
}

const selfTest: SelfTest = async () => [...(await staticSelfTest()), ...runTimeResults(), ...(await configSelfTest())];

/**
 * The settings that keep the run-time half in place (tools/vitest/config-integrity.ts):
 * the repository must pass, and each seeded setting under tools/vitest/seeded/config/,
 * laid over the repository, must fail for its seeded reason.
 */
export async function configSelfTest(): Promise<CheckResult[]> {
  const control = await checkConfigIntegrity();
  if (control.length > 0) {
    throw new Error(`The repository's own run settings fail the config-integrity check, so its seeds prove nothing:\n${control.join('\n')}`);
  }
  const results: CheckResult[] = [];
  for (const { name, seeds, problem } of SEEDED_CONFIGS) {
    const problems = await checkConfigIntegrity(undefined, join(SEEDED_CONFIG_DIR, name));
    if (!problems.some((line) => line.includes(problem))) {
      throw new Error(
        `tools/vitest/seeded/config/${name} (${seeds}) must fail the config-integrity check with "${problem}", so it proves nothing:\n` +
          (problems.join('\n') || 'no problem'),
      );
    }
    results.push({ name: 'index', ok: false, summary: `seeded config ${name} (${seeds}): the run would lose a guard`, details: problems });
  }
  return results;
}

/** The run guard on its seeded root: one failing result per seeded bad case file. */
function runTimeResults(): CheckResult[] {
  const run = runSeededGuard();
  const unmet = unmetExpectations(run);
  if (unmet.length > 0) {
    throw new Error(
      `The run guard's seeded run did not end as seeded, so it proves nothing:\n${unmet.join('\n')}\n` +
        `${JSON.stringify(run.report, null, 2)}\n${run.output}`,
    );
  }
  const guardOnly = SEEDED_GUARD_ONLY_ROOTS.map(({ name, root, problem, real }): CheckResult => {
    const alone = runSeededVitest(root, false);
    const guarded = runSeededGuard(root);
    const found =
      guarded.report.problems.length === 1 &&
      guarded.report.problems[0]?.includes(problem) === true &&
      guarded.report.real.join(' ') === real.join(' ');
    if (alone.exitCode !== 0 || guarded.exitCode !== 1 || !found) {
      throw new Error(
        `seeded/${name} must pass under Vitest alone (exit ${String(alone.exitCode)}) and fail under the run guard with ` +
          `"${problem}" (exit ${String(guarded.exitCode)}), so it proves nothing:\n${guarded.output}`,
      );
    }
    return {
      name: 'index',
      ok: false,
      summary: `seeded run ${name}: Vitest alone passes it; the run guard fails the run`,
      details: guarded.report.problems,
    };
  });
  // A guardrail test that asserts nothing (phase 0 review, finding 9): the guardrails
  // project's expect.requireAssertions fails it; the settings from before the fix let it pass.
  const now = runSeededVitest(SEEDED_NO_ASSERTION_ROOT, false);
  const before = runSeededVitest(SEEDED_NO_ASSERTION_ROOT, false, { [NO_ASSERTION_OLD_CONFIG_ENV]: '1' });
  const noAssertionFailure = /G1-3[\s\S]*expected any number of assertion, but got none/.test(now.output);
  if (now.exitCode !== 1 || !noAssertionFailure || before.exitCode !== 0) {
    throw new Error(
      `seeded/no-assertion must fail under the repository's guardrails expect settings (exit ${String(now.exitCode)}) ` +
        `for a missing assertion, and pass under the old settings (exit ${String(before.exitCode)}), so it proves nothing:\n${now.output}`,
    );
  }
  const noAssertion: CheckResult = {
    name: 'index',
    ok: false,
    summary: 'seeded run no-assertion: a guardrail test with no assertion fails the run (the old settings passed it)',
    details: now.output.split('\n').filter((line) => /assertion|G1-3/.test(line)).slice(0, 5),
  };
  const perFile = SEEDED_RUN_EXPECTATIONS.filter((expectation) => !expectation.seeds.startsWith('control')).map(
    (expectation): CheckResult => {
      const file = `tests/guardrails/${expectation.caseId}.test.ts: `;
      const details = run.report.problems.filter((problem) => problem.startsWith(file));
      const how = details.length > 0 ? 'the run guard failed the run' : 'the test failed, so the run failed';
      return { name: 'index', ok: false, summary: `seeded run ${expectation.caseId} (${expectation.seeds}): ${how}`, details };
    },
  );
  return [...guardOnly, noAssertion, ...perFile];
}

export default selfTest;
