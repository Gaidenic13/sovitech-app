import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildIndexReport, reportToResult, runIndexCheck } from './index-check';
import { staticSelfTest } from './selftest';

const seeded = (name: string): string => join(dirname(fileURLToPath(import.meta.url)), 'seeded', name);

describe('index check: the good control input', () => {
  it('passes, and sorts ids into real, pending (both evals among them) and none missing', async () => {
    const report = await buildIndexReport(seeded('good'));
    expect(report.problems).toEqual([]);
    expect(report.present).toEqual(['G1-1', 'G7-2a', 'GS-1']);
    expect(report.pending).toEqual(['G1-2', 'G1-3', 'G2-1', 'G2-2']);
    expect(report.stubs).toEqual([]);
    expect(report.malformed).toEqual([]);
    expect(report.missing).toEqual([]);
    const result = reportToResult(report);
    expect(result.ok).toBe(true);
    expect(result.name).toBe('index');
    expect(result.real).toEqual(['G1-1', 'G7-2a', 'GS-1']);
    expect(result.pending).toEqual(['G1-2', 'G1-3', 'G2-1', 'G2-2']);
    expect(result.noAutomatedCheckYet).toEqual([]);
    expect(result.summary).toContain('7 section 7 ids (5 T, 2 E)');
    expect(result.summary).toContain('3 real, 4 pending, 0 no automated check yet');
  });
});

describe('index check: seeded bad inputs', () => {
  it('fails on an id with no case file, and lists it as no automated check yet', async () => {
    const result = await runIndexCheck(seeded('missing-id'));
    expect(result.ok).toBe(false);
    expect(result.noAutomatedCheckYet).toEqual(['G1-2']);
    expect(result.details.filter((line) => line.startsWith('problem'))).toEqual([]);
  });

  it('fails on a case file whose id is not in the table', async () => {
    const report = await buildIndexReport(seeded('extra-id'));
    expect(report.missing).toEqual([]);
    expect(report.problems).toHaveLength(1);
    expect(report.problems[0]).toMatch(/^tests\/guardrails\/G9-9\.test\.ts:1: \[unindexed\]/);
    expect(reportToResult(report).ok).toBe(false);
  });

  it('fails on an E id in the T folder: the file is unindexed there and the id stays missing', async () => {
    const report = await buildIndexReport(seeded('wrong-type-test'));
    expect(report.problems).toHaveLength(1);
    expect(report.problems[0]).toContain('[wrong type]');
    expect(report.problems[0]).toContain('evals/guardrails/G2-1.yaml');
    expect(report.missing).toEqual(['G2-1']);
  });

  it('fails on a T id in the E folder, even when the T file exists', async () => {
    const report = await buildIndexReport(seeded('wrong-type-eval'));
    expect(report.present).toEqual(['G1-1']);
    expect(report.pending).toEqual(['G2-1']);
    expect(report.missing).toEqual([]);
    expect(report.problems).toHaveLength(1);
    expect(report.problems[0]).toMatch(/^evals\/guardrails\/G1-1\.yaml:1: \[wrong type\]/);
  });

  it('never counts a stub as a case: its id stays no automated check yet', async () => {
    const result = await runIndexCheck(seeded('stub-not-counted'));
    expect(result.ok).toBe(false);
    expect(result.noAutomatedCheckYet).toEqual(['G1-1', 'G2-1']);
    expect(result.details.some((line) => line.startsWith('Stubs (2)'))).toBe(true);
  });

  it.each([
    ['duplicate-id', '[table]'],
    ['row-outside-table', 'outside the table'],
    ['bad-row', 'T/E cell'],
    ['no-section-7', 'section 7'],
    ['held-out-test', '[held out]'],
    ['id-not-named', '[title]'],
    ['eval-id-mismatch', '[eval]'],
    ['eval-unknown-status', '[eval]'],
    ['eval-malformed-yaml', '[eval]'],
    ['nested-case-file', '[layout]'],
    ['unrecognised-file-name', '[layout]'],
    ['pending-without-marker', '[pending]'],
    ['marker-without-wrapper', '[pending]'],
    ['malformed-marker', '[pending]'],
    ['held-out-options', '[held out]'],
    ['held-out-describe-option', '[held out]'],
    ['held-out-fails-option', '[held out]'],
    ['held-out-computed', '[held out]'],
    ['held-out-destructured', '[held out]'],
    ['empty-test', '[empty]'],
    ['pending-self-thrown', '[pending] names NotImplementedError'],
    ['eval-id-only', 'not a full eval case'],
    ['eval-pending-id-only', 'not a full eval case'],
    ['eval-missing-fixture', 'does not exist'],
    ['eval-samples-not-5', '"samples" is 3'],
    ['empty-table', '[scope]'],
    ['no-tests-folder', '[scope]'],
  ])('fails on seeded/%s, naming the fault (%s)', async (name, reason) => {
    const result = await runIndexCheck(seeded(name));
    expect(result.ok).toBe(false);
    expect(result.details.some((line) => line.startsWith('problem') && line.includes(reason))).toBe(true);
  });

  it.each(['held-out-options', 'held-out-computed', 'empty-test', 'pending-self-thrown'])(
    'never counts the case file of seeded/%s, as real or as pending: its id is no automated check yet',
    async (name) => {
      const report = await buildIndexReport(seeded(name));
      expect(report.present).toEqual(['G1-1']);
      expect(report.pending).toEqual([]);
      expect(report.malformed).toEqual(['G1-2']);
      expect(reportToResult(report).noAutomatedCheckYet).toEqual(['G1-2']);
    },
  );

  it.each(['eval-id-only', 'eval-pending-id-only', 'eval-missing-fixture', 'eval-samples-not-5'])(
    'never counts the eval of seeded/%s: its id is no automated check yet',
    async (name) => {
      const report = await buildIndexReport(seeded(name));
      expect(report.present).toEqual(['G1-1', 'G1-2']);
      expect(report.pending).toEqual([]);
      expect(reportToResult(report).noAutomatedCheckYet).toEqual(['G2-1']);
    },
  );

  it('fails on an empty scope: no id in section 7, or no tests/guardrails/ folder', async () => {
    const empty = await runIndexCheck(seeded('empty-table'));
    expect(empty.ok).toBe(false);
    expect(empty.details).toContain(
      'problem: docs/guardrails.md:1: [scope] section 7 lists no case id, so the index check has nothing to hold the repository to',
    );
    const noFolder = await buildIndexReport(seeded('no-tests-folder'));
    expect(noFolder.pending).toEqual(['G2-1']);
    expect(noFolder.problems).toEqual(['tests/guardrails/:1: [scope] the folder of the code-test cases does not exist']);
    expect(reportToResult(noFolder).ok).toBe(false);
  });
});

describe('index check: report shape', () => {
  it('puts other problems before the lists, so a new fault is not hidden behind missing ids', async () => {
    const result = await runIndexCheck(seeded('wrong-type-test'));
    expect(result.details[0]).toMatch(/^Other problems \(1\)/);
    expect(result.details[1]).toMatch(/^problem: /);
    expect(result.summary).toMatch(/1 other problem\b/);
  });

  it('fails when the guardrails file is missing', async () => {
    const result = await runIndexCheck(seeded('does-not-exist'));
    expect(result.ok).toBe(false);
    expect(result.summary).toContain('docs/guardrails.md');
  });
});

describe('index check: self-test', () => {
  it('fails every seeded bad input, for its seeded reason (the static half; the run-time half is tested with the run guard)', async () => {
    const results = await staticSelfTest();
    expect(results.length).toBeGreaterThanOrEqual(32);
    for (const result of results) expect(result.ok).toBe(false);
  });
});
