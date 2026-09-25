/**
 * The guardrail run guard (tools/vitest/guardrail-run-guard.ts): the audit on
 * hand-built results, the reporter's wiring, and a real Vitest run on the seeded
 * root (tools/vitest/seeded/run/), where every seeded case file must end as its
 * seed says.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestModule } from 'vitest/node';
import { afterAll, describe, expect, it } from 'vitest';
import GuardrailRunGuard, {
  auditGuardrailRun,
  formatGuardReport,
  type GuardedModule,
  type GuardedTest,
} from './guardrail-run-guard';
import {
  NO_ASSERTION_OLD_CONFIG_ENV,
  SEEDED_GUARD_ONLY_ROOTS,
  SEEDED_NO_ASSERTION_ROOT,
  SEEDED_RUN_EXPECTATIONS,
  runSeededGuard,
  runSeededVitest,
  unmetExpectations,
} from './run-seeded';

const NOTE = 'pending: no automated check yet (derive is not implemented; phase 1)';

/** The stub guard's record on a test that reached no stub. */
const NO_STUB = { inTest: {}, outsideTests: {} };

const passing = (fullName: string): GuardedTest => ({
  fullName,
  mode: 'run',
  fails: false,
  state: 'passed',
  note: undefined,
  record: undefined,
  stubGuard: NO_STUB,
});

const wrapperSkip = (fullName: string, caseId: string): GuardedTest => ({
  fullName,
  mode: 'run',
  fails: false,
  state: 'skipped',
  note: NOTE,
  record: { caseId, feature: 'derive', phase: 1 },
  stubGuard: { inTest: { derive: 1 }, outsideTests: {} },
});

const realModule = (caseId: string, tests: GuardedTest[] = [passing(`${caseId} · a case`)]): GuardedModule => ({
  path: `tests/guardrails/${caseId}.test.ts`,
  caseId,
  loadErrors: 0,
  tests,
  marker: undefined,
  importsWrapper: false,
});

const pendingModule = (caseId: string, tests: GuardedTest[] = [wrapperSkip(`${caseId} · a case`, caseId)]): GuardedModule => ({
  ...realModule(caseId, tests),
  marker: { phase: 1, features: ['derive'] },
  importsWrapper: true,
});

const audit = (modules: GuardedModule[], filtered = false) => auditGuardrailRun(modules, { filtered });

describe('run guard: the audit', () => {
  it('passes a run of real cases and wrapper-held pending cases, and counts each kind', () => {
    const report = audit([realModule('G2-1'), pendingModule('G4-2')]);
    expect(report.problems).toEqual([]);
    expect(report.real).toEqual(['G2-1']);
    expect(report.pending).toEqual(['G4-2']);
    expect(report.counts).toEqual({ files: 2, passed: 1, failed: 0, pendingSkips: 1 });
    expect(formatGuardReport(report)).toContain('1 ran as real cases, 1 pending (pending: no automated check yet)');
  });

  it.each(['skip', 'todo', 'only'] as const)('fails a test marked %s', (mode) => {
    const report = audit([realModule('G2-1', [{ ...passing('G2-1 · x'), mode, state: 'skipped' }])]);
    expect(report.problems).toHaveLength(1);
    expect(report.problems[0]).toContain(`[held out] "G2-1 · x" is marked ${mode}`);
  });

  it('names a -t filter as the likely cause of skipped tests', () => {
    const report = audit([realModule('G2-1', [{ ...passing('G2-1 · x'), mode: 'skip', state: 'skipped' }])], true);
    expect(report.problems[0]).toContain('-t filter');
  });

  it('fails a test in fails mode, even though Vitest counts it as passed, and lists its file as held out, never real', () => {
    const report = audit([realModule('G2-1', [{ ...passing('G2-1 · x'), fails: true }])]);
    expect(report.problems[0]).toContain('fails mode');
    expect(report.heldOut).toEqual(['G2-1']);
    expect(report.real).toEqual([]);
  });

  it('lists a file with any held-out test under held out, never under real (phase 0 review, round 2)', () => {
    for (const test of [
      { ...passing('G2-1 · x'), mode: 'skip' as const, state: 'skipped' as const },
      { ...passing('G2-1 · x'), state: 'skipped' as const, note: 'TEST', record: undefined },
    ]) {
      const report = audit([realModule('G2-1', [passing('G2-1 · y'), test])]);
      expect(report.heldOut).toEqual(['G2-1']);
      expect(report.real).toEqual([]);
      expect(report.pending).toEqual([]);
    }
    expect(formatGuardReport(audit([realModule('G2-1', [{ ...passing('G2-1 · x'), fails: true }])]))).toContain(
      '0 ran as real cases, 0 pending (pending: no automated check yet), 1 held out other than by the wrapper',
    );
  });

  it('fails a passing test that carries no stub guard record: the stub guard did not run (phase 0 review, round 2)', () => {
    const report = audit([realModule('G2-1', [{ ...passing('G2-1 · x'), stubGuard: undefined }])]);
    expect(report.problems).toHaveLength(1);
    expect(report.problems[0]).toContain('[unguarded] "G2-1 · x" passed without the stub guard\'s record');
    expect(report.problems[0]).toContain('./tools/vitest/guardrail-stub-guard.ts');
    expect(report.real).toEqual([]);
    expect(report.notCounted).toEqual(['G2-1']);
  });

  it('fails a passing test whose stub guard record shows an unbuilt stub, during the test or outside any test', () => {
    for (const stubGuard of [
      { inTest: { derive: 1 }, outsideTests: {} },
      { inTest: {}, outsideTests: { 'verify-proposal': 2 } },
    ]) {
      const report = audit([realModule('G8-4', [{ ...passing('G8-4 · x'), stubGuard }])]);
      expect(report.problems).toHaveLength(1);
      expect(report.problems[0]).toContain('[stub] "G8-4 · x" passed, but the case exercises an unbuilt stub');
      expect(report.real).toEqual([]);
    }
  });

  it('fails a test skipped while running without the wrapper record, marker, import or note', () => {
    const cases: Array<[GuardedModule, string]> = [
      [realModule('G4-2', [{ ...wrapperSkip('G4-2 · x', 'G4-2'), record: undefined }]), 'no pending record'],
      [realModule('G4-2', [wrapperSkip('G4-2 · x', 'G4-2')]), '@pending-until marker'],
      [{ ...pendingModule('G4-2'), importsWrapper: false }, 'does not import the pending wrapper'],
      [pendingModule('G4-2', [wrapperSkip('G4-2 · x', 'G4-9')]), 'does not name this case file'],
      [pendingModule('G4-2', [{ ...wrapperSkip('G4-2 · x', 'G4-2'), record: { caseId: 'G4-2', feature: 'verify-proposal', phase: 1 } }]), 'which the file'],
      [pendingModule('G4-2', [{ ...wrapperSkip('G4-2 · x', 'G4-2'), note: 'pending: no automated check yet' }]), 'note is not'],
      [{ ...pendingModule('G4-2'), marker: { phase: 2, features: ['derive'] } }, 'which the file'],
    ];
    for (const [module, reason] of cases) {
      const report = audit([module]);
      expect(report.problems, reason).toHaveLength(1);
      expect(report.problems[0], reason).toContain('was skipped while running, but not by the pending wrapper');
      expect(report.problems[0], reason).toContain(reason);
      expect(report.pending, reason).toEqual([]);
    }
  });

  it('fails a case file that ran no test, and a test that did not finish', () => {
    expect(audit([realModule('G2-1', [])]).problems[0]).toContain('[no tests]');
    expect(audit([{ ...realModule('G2-1', []), loadErrors: 1 }]).problems[0]).toContain('failed to load');
    expect(audit([realModule('G2-1', [{ ...passing('G2-1 · x'), state: 'pending' }])]).problems[0]).toContain('[not run]');
  });

  it('fails a test whose full name does not name the case id', () => {
    const report = audit([realModule('G1-1', [passing('G1-10 · another case')])]);
    expect(report.problems[0]).toContain('[title]');
  });

  it('fails a case file on disk that an unfiltered run did not collect', () => {
    const report = auditGuardrailRun([realModule('G2-1')], { filtered: false, notCollected: ['tests/guardrails/G2-8.test.ts'] });
    expect(report.problems).toEqual([
      'tests/guardrails/G2-8.test.ts: [not collected] the case file exists, but the run did not collect it (an exclude in the Vitest config, ' +
        'or an include that misses it); a case that never runs is no check',
    ]);
    expect(report.counts.files).toBe(2);
  });

  it('lists a file with a failing test as failed, never as real or pending', () => {
    const report = audit([pendingModule('G4-2', [{ ...passing('G4-2 · x'), state: 'failed' }])]);
    expect(report.failed).toEqual(['G4-2']);
    expect(report.pending).toEqual([]);
    expect(report.real).toEqual([]);
  });

  it('puts each case file in exactly one list', () => {
    const report = audit([
      realModule('G1-1'),
      pendingModule('G1-2'),
      realModule('G1-3', [{ ...passing('G1-3 · x'), fails: true }]),
      realModule('G1-4', []),
      realModule('G1-5', [{ ...passing('G1-5 · x'), state: 'failed' }]),
    ]);
    const lists = [report.real, report.pending, report.heldOut, report.notCounted, report.failed];
    expect(lists).toEqual([['G1-1'], ['G1-2'], ['G1-3'], ['G1-4'], ['G1-5']]);
  });
});

describe('run guard: the reporter', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'sovitech-guard-'));
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  /** A test module as Vitest hands it to reporters, reduced to what the guard reads. */
  function fakeModule(moduleId: string, tests: Array<{ name: string; mode: 'run' | 'skip'; state: 'passed' | 'skipped' }>): TestModule {
    return {
      moduleId,
      errors: () => [],
      children: {
        *allTests() {
          for (const test of tests) {
            yield {
              fullName: test.name,
              options: { mode: test.mode, fails: undefined },
              result: () => (test.state === 'skipped' ? { state: 'skipped', note: undefined, errors: undefined } : { state: 'passed', errors: undefined }),
              meta: () => ({ sovitechStubGuard: { inTest: {}, outsideTests: {} } }),
            };
          }
        },
      },
    } as unknown as TestModule;
  }

  it('fails the run and writes the findings when a guardrail case is held out', () => {
    let failed = 0;
    const written: string[] = [];
    const outputFile = join(scratch, 'report.json');
    const guard = new GuardrailRunGuard({ outputFile, fail: () => (failed += 1), write: (text) => written.push(text) });
    guard.onInit({ config: { root: '/repo' }, projects: [] } as never);
    guard.onTestRunEnd(
      [
        fakeModule('/repo/tests/guardrails/G2-1.test.ts', [{ name: 'G2-1 · x', mode: 'skip', state: 'skipped' }]),
        fakeModule('/repo/tools/checks/index/case-files.test.ts', [{ name: 'unit', mode: 'skip', state: 'skipped' }]),
      ],
    );
    expect(failed).toBe(1);
    expect(written.join('')).toContain('Guardrail run guard FAILED the run');
    const report = JSON.parse(readFileSync(outputFile, 'utf8')) as { problems: string[]; counts: { files: number } };
    expect(report.counts.files).toBe(1);
    expect(report.problems[0]).toContain('tests/guardrails/G2-1.test.ts: [held out]');
  });

  it('stays quiet on a run with no guardrail case file, and passes a clean one', () => {
    let failed = 0;
    const written: string[] = [];
    const guard = new GuardrailRunGuard({ fail: () => (failed += 1), write: (text) => written.push(text) });
    guard.onInit({ config: { root: '/repo' }, projects: [] } as never);
    guard.onTestRunEnd([fakeModule('/repo/packages/domain/src/model.test.ts', [])]);
    expect(written).toEqual([]);
    guard.onTestRunEnd([fakeModule('/repo/tests/guardrails/G2-1.test.ts', [{ name: 'G2-1 · x', mode: 'run', state: 'passed' }])]);
    expect(failed).toBe(0);
    expect(written.join('')).toContain('1 ran as real cases');
  });
});

describe('run guard: a real Vitest run on the seeded root', () => {
  it('ends every seeded case file as its seed says, and fails the run', { timeout: 120_000 }, () => {
    const run = runSeededGuard();
    expect(unmetExpectations(run), `${JSON.stringify(run.report, null, 2)}\n${run.output}`).toEqual([]);
    expect(SEEDED_RUN_EXPECTATIONS.length).toBeGreaterThanOrEqual(26);
  });

  it.each(SEEDED_GUARD_ONLY_ROOTS)(
    'fails a run that Vitest alone passes: seeded/$name',
    { timeout: 120_000 },
    ({ root, problem, real }) => {
      const alone = runSeededVitest(root, false);
      expect(alone.exitCode, alone.output).toBe(0);
      const guarded = runSeededGuard(root);
      expect(guarded.exitCode, guarded.output).toBe(1);
      expect(guarded.report.real).toEqual(real);
      expect(guarded.report.problems).toHaveLength(1);
      expect(guarded.report.problems[0]).toContain(problem);
      expect(guarded.output).toContain('Guardrail run guard FAILED the run');
    },
  );

  // Phase 0 review, finding 9: a guardrail test with no assertion passed. The
  // guardrails project now sets expect.requireAssertions; the seeded root reads
  // that setting from the repository's vitest.config.ts.
  it('fails a guardrail test that asserts nothing, which the settings before the fix passed', { timeout: 120_000 }, () => {
    const now = runSeededVitest(SEEDED_NO_ASSERTION_ROOT, false);
    expect(now.exitCode, now.output).toBe(1);
    expect(now.output).toContain('expected any number of assertion, but got none');
    const before = runSeededVitest(SEEDED_NO_ASSERTION_ROOT, false, { [NO_ASSERTION_OLD_CONFIG_ENV]: '1' });
    expect(before.exitCode, before.output).toBe(0);
  });
});
