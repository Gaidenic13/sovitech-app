import { describe, expect, it } from 'vitest';
import { repoRoot } from '../lib';
import { BAD_CASES, GOOD_CASE, runCase } from './cases';
import { checkVersionSync, headerComment, readCheckedAgainst, readGuardrailsVersion, repositoryLayout } from './sync';

describe('reading version lines', () => {
  it('reads the version at the top of docs/guardrails.md', () => {
    expect(readGuardrailsVersion('# Title\n\n**Version:** 1.5 (2026-09-24)\n')).toBe('1.5');
    expect(readGuardrailsVersion('# Title\n\nNo version here\n')).toBeUndefined();
  });

  it('refuses a version line far below the top', () => {
    const text = `# Title\n${'\n'.repeat(40)}**Version:** 1.5\n`;
    expect(readGuardrailsVersion(text)).toBeUndefined();
  });

  it('reads every "Checked against" line with its line number, and flags lines it cannot read', () => {
    const text = [
      '<!-- Checked against: docs/guardrails.md v1.5 -->',
      'Checked against: `docs/guardrails.md` v1.4.',
      'Checked against: the guardrails, some version',
    ].join('\n');
    expect(readCheckedAgainst(text)).toEqual({
      lines: [
        { line: 1, version: '1.5' },
        { line: 2, version: '1.4' },
      ],
      unreadable: [3],
    });
  });

  it('finds the leading HTML comment, and nothing when the file does not start with one', () => {
    expect(headerComment('\n<!--\nChecked against: docs/guardrails.md v1.5.\n-->\nBody')).toEqual({ firstLine: 2, lastLine: 4 });
    expect(headerComment('Body first\n<!-- later -->')).toBeUndefined();
  });
});

describe('version-sync check', () => {
  it('passes on this repository', async () => {
    const result = await checkVersionSync(repositoryLayout(repoRoot));
    expect(result.details.filter((line) => !line.startsWith('note:'))).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('passes the seeded good input', async () => {
    const result = await runCase(GOOD_CASE);
    expect(result.ok).toBe(true);
  });

  it.each(BAD_CASES.map((badCase) => [badCase.id, badCase] as const))('fails %s', async (_id, badCase) => {
    const result = await runCase(badCase);
    expect(result.ok).toBe(false);
    for (const expected of badCase.expect) expect(result.details.join('\n')).toContain(expected);
  });
});
