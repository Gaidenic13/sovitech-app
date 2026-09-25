/**
 * The exception lists in the loosening snapshot (phase 0 review, round 2).
 * The seeded inputs whose folder names start with exception-list- prove the
 * check on the real lists; these tests pin the comparison, the hashing and the approval path.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseApprovalContext } from '@sovitech/registry/gates';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../lib';
import {
  EXCEPTION_LISTS,
  EXCEPTION_LISTS_BASELINE_PATH,
  compareExceptionLists,
  evaluateExceptionLists,
  figureEntries,
  parseExceptionListSnapshot,
  readCurrentLists,
  sha256,
  type CurrentList,
  type ExceptionListSnapshot,
} from './exception-lists';

function snapshot(lists: ExceptionListSnapshot['lists'], extra: Partial<ExceptionListSnapshot> = {}): ExceptionListSnapshot {
  return { name: 'unapproved baseline v0 (exception lists)', status: 'unapproved', version: 0, recordedOn: '2026-09-25', approvalRef: '', lists, ...extra };
}

function current(direction: 'allow' | 'deny', entries: Record<string, unknown>): Map<string, CurrentList> {
  return new Map([
    ['test.list', { direction, source: 'test', entries: new Map(Object.entries(entries).map(([key, content]) => [key, { sha256: sha256(content), label: key }])) }],
  ]);
}

const recorded = (direction: 'allow' | 'deny', entries: Record<string, unknown>): ExceptionListSnapshot['lists'] => ({
  'test.list': {
    direction,
    source: 'test',
    entries: Object.fromEntries(
      Object.entries(entries).map(([key, content]) => [key, direction === 'allow' ? { sha256: sha256(content), recordedOn: '2026-09-25' } : { recordedOn: '2026-09-25' }]),
    ),
  },
});

describe('compareExceptionLists', () => {
  it('reads an addition to an allow list, and a changed allow entry, as loosenings', () => {
    const differences = compareExceptionLists(snapshot(recorded('allow', { a: 1 })), current('allow', { a: 2, b: 1 }));
    expect(differences.map((item) => item.kind)).toEqual(['loosening', 'loosening']);
    expect(differences.map((item) => item.message).join('\n')).toMatch(/entry changed: a[\s\S]*entry added: b/);
  });

  it('reads a removal from a deny list as a loosening, and an addition to it as a tightening', () => {
    const differences = compareExceptionLists(snapshot(recorded('deny', { a: 'a', b: 'b' })), current('deny', { a: 'a', c: 'c' }));
    expect(differences).toEqual([
      { list: 'test.list', kind: 'tightening', message: 'exception list test.list: entry added to a deny list: c' },
      { list: 'test.list', kind: 'loosening', message: 'exception list test.list: entry removed from a deny list: b' },
    ]);
  });

  it('reads a removal from an allow list as a tightening', () => {
    expect(compareExceptionLists(snapshot(recorded('allow', { a: 1 })), current('allow', {})).map((item) => item.kind)).toEqual(['tightening']);
  });

  it('reads a list no longer read, and a changed direction, as loosenings', () => {
    expect(compareExceptionLists(snapshot(recorded('allow', { a: 1 })), new Map())[0]?.kind).toBe('loosening');
    expect(compareExceptionLists(snapshot(recorded('deny', { a: 'a' })), current('allow', { a: 'a' }))[0]?.message).toContain('direction changed');
  });
});

describe('evaluateExceptionLists', () => {
  const noApprover = parseApprovalContext({ guardrails: readFileSync(join(repoRoot, 'docs/guardrails.md'), 'utf8') });
  const named = parseApprovalContext({
    guardrails: [
      '| Approver | Role | Since |',
      '|---|---|---|',
      '| Ana Test | Product owner | 2026-01-01 |',
      '',
      '| Version | Date | Change | Approved by |',
      '|---|---|---|---|',
      '| 2.0 | 2026-02-01 | Approved exception lists v1 (the render entry test-a). | Ana Test |',
    ].join('\n'),
    today: '2026-09-25',
  });

  it('fails an addition against the unapproved baseline, whatever the approver table says', () => {
    for (const approvals of [noApprover, named]) {
      const report = evaluateExceptionLists({
        current: { lists: current('allow', { a: 1, b: 1 }), problems: [] },
        baseline: snapshot(recorded('allow', { a: 1 })),
        approvedSnapshots: [],
        approvals,
      });
      expect(report.problems.join('\n')).toContain('exception list test.list: entry added: b: a loosening against unapproved baseline v0 (exception lists) with no approval reference');
    }
  });

  it('moves the base to an approved snapshot only when its reference resolves', () => {
    const approved = snapshot(recorded('allow', { a: 1, b: 1 }), { name: 'approved exception lists v1', status: 'approved', version: 1, approvalRef: 'guardrails-changelog:2.0' });
    const inputs = { current: { lists: current('allow', { a: 1, b: 1 }), problems: [] }, baseline: snapshot(recorded('allow', { a: 1 })), approvedSnapshots: [approved] };
    const resolved = evaluateExceptionLists({ ...inputs, approvals: named });
    expect(resolved.problems).toEqual([]);
    expect(resolved.base).toBe('approved exception lists v1');
    const unresolved = evaluateExceptionLists({ ...inputs, approvals: noApprover });
    expect(unresolved.problems.join('\n')).toContain('approved exception lists v1: its approval reference "guardrails-changelog:2.0" does not resolve');
    expect(unresolved.problems.join('\n')).toContain('entry added: b');
  });

  it('fails a missing baseline and a list that cannot be read', () => {
    const missing = evaluateExceptionLists({ current: { lists: new Map(), problems: ['exception list x: cannot be read'] }, baseline: undefined, approvedSnapshots: [], approvals: noApprover });
    expect(missing.problems).toEqual(expect.arrayContaining(['exception list x: cannot be read', expect.stringContaining('unapproved-baseline-v0.json is missing')]));
  });
});

describe('the lists and the snapshot file', () => {
  it('reads every list from the repository, and each is in the snapshot', async () => {
    const lists = await readCurrentLists();
    expect(lists.problems).toEqual([]);
    const baseline = parseExceptionListSnapshot(readFileSync(EXCEPTION_LISTS_BASELINE_PATH, 'utf8'), 'baseline');
    expect(Object.keys(baseline.lists).sort()).toEqual(EXCEPTION_LISTS.map((spec) => spec.id).sort());
    expect(lists.lists.get('render.entries')?.entries.has('max-file-size')).toBe(true);
    expect(lists.lists.get('mockup-figures')?.entries.size).toBeGreaterThan(100);
  });

  it('never stores a figure: figure lists are keyed by hash and labelled by source line', () => {
    const entries = figureEntries('# comment\ntext | TEST Hotel Name | spec.md:1  # note\nnumber | 12,345 | spec.md:2\nnumber | 12,345 | spec.md:3\n', 'test.txt');
    expect(entries.map((entry) => entry.key)).toEqual([expect.stringMatching(/^text:sha256:[0-9a-f]{16}$/), expect.stringMatching(/^number:sha256:[0-9a-f]{16}$/), expect.stringMatching(/^number:sha256:[0-9a-f]{16}#2$/)]);
    const text = JSON.stringify(entries.map((entry) => [entry.key, entry.label]));
    expect(text).not.toContain('TEST Hotel Name');
    expect(text).not.toContain('12,345');
    expect(entries[0]?.label).toBe('text entry, test.txt line 2 (spec.md:1)');
  });

  it('keeps the mockups\' figures and hotel name out of the snapshot file', () => {
    const snapshotText = readFileSync(EXCEPTION_LISTS_BASELINE_PATH, 'utf8');
    for (const line of readFileSync(join(repoRoot, 'tools/checks/mockup-figures.txt'), 'utf8').split('\n')) {
      const fields = line.split('|').map((field) => field.trim());
      if (line.trim().startsWith('#') || fields.length < 3) continue;
      const figure = fields[1] ?? '';
      // Short figures can occur inside a hex digest by chance; a figure with a letter, a separator or 4+ digits cannot.
      if (/^\d{1,3}$/.test(figure)) continue;
      expect(snapshotText.includes(figure), figure.length > 0 ? `a listed figure (${fields[0]}) is in the snapshot` : 'empty').toBe(false);
    }
  });

  it('hashes content in a stable order', () => {
    expect(sha256({ b: 1, a: new Set(['y', 'x']) })).toBe(sha256({ a: new Set(['x', 'y']), b: 1 }));
    expect(sha256({ a: /x/u })).not.toBe(sha256({ a: /x/g }));
  });
});
