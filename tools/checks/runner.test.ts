import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  compareCaseIds,
  discoverChecks,
  formatReport,
  missingRows,
  runOne,
  selfTestOne,
  shapeProblems,
} from './runner';
import type { CheckResult } from './types';

const failing = (summary: string): CheckResult => ({ name: 'x', ok: false, summary, details: [] });
const passing = (summary: string): CheckResult => ({ name: 'x', ok: true, summary, details: [] });

describe('checks runner', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'sovitech-checks-'));
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it('discovers tools/checks/<name>/check.ts and notes selftest.ts', () => {
    mkdirSync(join(scratch, 'alpha'));
    writeFileSync(join(scratch, 'alpha', 'check.ts'), '');
    writeFileSync(join(scratch, 'alpha', 'selftest.ts'), '');
    mkdirSync(join(scratch, 'beta'));
    writeFileSync(join(scratch, 'beta', 'check.ts'), '');
    mkdirSync(join(scratch, '_support'));
    writeFileSync(join(scratch, '_support', 'check.ts'), '');
    mkdirSync(join(scratch, 'no-check'));
    writeFileSync(join(scratch, 'lib.ts'), '');

    const entries = discoverChecks(scratch);
    expect(entries.map((entry) => entry.name)).toEqual(['alpha', 'beta']);
    expect(entries[0]?.selfTestPath).toBeDefined();
    expect(entries[1]?.selfTestPath).toBeUndefined();
  });

  it('fails an expected check that does not exist', () => {
    const rows = missingRows(['index'], ['index', 'licences']);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ok).toBe(false);
    expect(rows[0]?.name).toBe('licences');
  });

  it('turns a throwing check into a failing row', async () => {
    const row = await runOne('boom', async () => {
      throw new Error('broken');
    });
    expect(row.ok).toBe(false);
    expect(row.summary).toBe('the check threw');
  });

  it('turns a malformed result into a failing row', async () => {
    const row = await runOne('odd', async () => ({ ok: true }));
    expect(row.ok).toBe(false);
    expect(shapeProblems({ ok: true }).length).toBeGreaterThan(0);
  });

  it('keeps the index lists of a result', async () => {
    const row = await runOne('index', async () => ({
      ...failing('ids with no case file'),
      noAutomatedCheckYet: ['G1-10', 'G1-2'],
      pending: ['G1-4'],
    }));
    expect(row.noAutomatedCheckYet).toEqual(['G1-10', 'G1-2']);
    const report = formatReport([row], { verbose: false, title: 't' });
    expect(report).toContain('No automated check yet');
    expect(report).toContain('Pending: no automated check yet');
    expect(report.indexOf('G1-2 ')).toBeLessThan(report.indexOf('G1-10'));
  });

  it('never passes a result that lists ids with no automated check yet', async () => {
    const row = await runOne('index', async () => ({ ...passing('looks fine'), noAutomatedCheckYet: ['G1-1'] }));
    expect(row.ok).toBe(false);
    const pendingOnly = await runOne('index', async () => ({ ...passing('present'), pending: ['G1-4'] }));
    expect(pendingOnly.ok).toBe(true);
    expect(pendingOnly.pending).toEqual(['G1-4']);
  });

  it('passes a self-test only when every seeded input fails', async () => {
    expect((await selfTestOne('a', async () => [failing('one'), failing('two')])).ok).toBe(true);
    expect((await selfTestOne('b', async () => [failing('one'), passing('two')])).ok).toBe(false);
    expect((await selfTestOne('c', async () => [])).ok).toBe(false);
    expect((await selfTestOne('d', 'not a function')).ok).toBe(false);
  });

  it('orders case ids numerically', () => {
    const ids = ['GS-1', 'G7-2b', 'G1-10', 'G7-2a', 'G1-2', 'G10-1', 'G2-1'];
    expect([...ids].sort(compareCaseIds)).toEqual(['G1-2', 'G1-10', 'G2-1', 'G7-2a', 'G7-2b', 'G10-1', 'GS-1']);
  });
});
