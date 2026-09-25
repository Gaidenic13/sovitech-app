import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../lib';
import {
  CASE_ID_PATTERN,
  GUARDRAILS_PATH,
  caseFilePath,
  countByType,
  loadGuardrailIndex,
  parseGuardrailIndex,
  splitTableRow,
} from './guardrail-index';

const table = (rows: string[], after = '## 8. Next'): string =>
  [
    '# Seeded',
    '',
    '**Version:** 0.1 (2026-09-25)',
    '',
    '## 6. Before',
    '',
    '| ID | T/E | Situation | Expected |',
    '|----|-----|-----------|----------|',
    '| G0-1 | T | a table outside section 7 | ignored |',
    '',
    '## 7. Test and eval index',
    '',
    'Text above the table.',
    '',
    '| ID | T/E | Situation | Expected |',
    '|----|-----|-----------|----------|',
    ...rows,
    '',
    after,
    '',
    '| G9-1 | T | a row in section 8 | ignored |',
  ].join('\n');

describe('guardrail index: parsing section 7', () => {
  it('reads each row with its id, type, situation, expected result and line', () => {
    const index = parseGuardrailIndex(
      table([
        '| G1-1 | E | Situation one | Outcome one |',
        '| G7-2a | T | Situation `two` | Outcome two |',
        '| GS-1 | T | Situation three | Outcome three |',
      ]),
    );
    expect(index.problems).toEqual([]);
    expect(index.version).toBe('0.1');
    expect(index.versionDate).toBe('2026-09-25');
    expect(index.cases.map((entry) => [entry.id, entry.type])).toEqual([
      ['G1-1', 'E'],
      ['G7-2a', 'T'],
      ['GS-1', 'T'],
    ]);
    expect(index.cases[1]).toMatchObject({ situation: 'Situation `two`', expected: 'Outcome two', line: 18 });
    expect(index.byId.get('GS-1')?.type).toBe('T');
    expect(countByType(index.cases)).toEqual({ total: 3, T: 2, E: 1 });
  });

  it('keeps escaped pipes inside a cell', () => {
    expect(splitTableRow('| G1-1 | T | a \\| b | c |')).toEqual(['G1-1', 'T', 'a | b', 'c']);
    const index = parseGuardrailIndex(table(['| G1-1 | T | a \\|\\| b | c |']));
    expect(index.problems).toEqual([]);
    expect(index.cases[0]?.situation).toBe('a || b');
  });

  it('reports a duplicate id', () => {
    const index = parseGuardrailIndex(table(['| G1-1 | T | a | b |', '| G1-1 | E | c | d |']));
    expect(index.problems).toHaveLength(1);
    expect(index.problems[0]).toMatch(/^docs\/guardrails\.md:18: .*G1-1 .*twice/);
    expect(index.cases).toHaveLength(1);
  });

  it('reports a type other than T or E, and an id that does not match the pattern', () => {
    const index = parseGuardrailIndex(
      table(['| G1-1 | X | a | b |', '| G4-2 v2 | T | a | b |', '| g1-3 | T | a | b |', '| G1-4 | T | a |']),
    );
    expect(index.cases).toEqual([]);
    expect(index.problems).toHaveLength(4);
    expect(index.problems[0]).toContain('T/E cell');
    expect(index.problems[1]).toContain('G4-2 v2');
    expect(index.problems[2]).toContain('g1-3');
    expect(index.problems[3]).toContain('4 cells');
  });

  it('reports an empty situation or expected cell', () => {
    const index = parseGuardrailIndex(table(['| G1-1 | T |  | b |', '| G1-2 | T | a |  |']));
    expect(index.problems).toHaveLength(2);
  });

  it('reports a case row that sits in section 7 but outside the table', () => {
    const index = parseGuardrailIndex(table(['| G1-1 | T | a | b |', '', '| G1-2 | T | c | d |']));
    expect(index.cases.map((entry) => entry.id)).toEqual(['G1-1']);
    expect(index.problems).toHaveLength(1);
    expect(index.problems[0]).toMatch(/:19: .*G1-2.*outside the table/);
  });

  it('reports a missing section 7, a missing table and an empty table', () => {
    expect(parseGuardrailIndex('# Nothing here\n').problems[0]).toContain('section 7');
    const noTable = parseGuardrailIndex('## 7. Test and eval index\n\nNo table.\n\n## 8. Next\n');
    expect(noTable.problems[0]).toContain('header row');
    const empty = parseGuardrailIndex(table([]));
    expect(empty.problems[0]).toContain('no case rows');
  });

  it('reports a header row with no delimiter row under it', () => {
    const index = parseGuardrailIndex(
      '## 7. Test and eval index\n\n| ID | T/E | Situation | Expected |\n| G1-1 | T | a | b |\n',
    );
    expect(index.problems[0]).toContain('delimiter row');
  });

  it('names the case file of each type', () => {
    expect(caseFilePath({ id: 'G1-2', type: 'T' })).toBe('tests/guardrails/G1-2.test.ts');
    expect(caseFilePath({ id: 'G1-1', type: 'E' })).toBe('evals/guardrails/G1-1.yaml');
  });

  it('accepts only the id forms section 7 uses', () => {
    for (const id of ['G1-1', 'G14-3', 'G7-2a', 'G7-2b', 'GS-1', 'G10-12']) expect(CASE_ID_PATTERN.test(id)).toBe(true);
    for (const id of ['G1', 'G01-1', 'G1-01', 'g1-1', 'G1-1 v2', 'GX-1', 'G1-1A', 'US-INTAKE-03']) {
      expect(CASE_ID_PATTERN.test(id)).toBe(false);
    }
  });
});

describe('guardrail index: the repository file', () => {
  const markdown = readFileSync(join(repoRoot, GUARDRAILS_PATH), 'utf8');
  const index = loadGuardrailIndex();

  it('parses docs/guardrails.md section 7 with no problems', () => {
    expect(index.problems).toEqual([]);
    expect(index.source).toBe(GUARDRAILS_PATH);
  });

  it('finds every case row an independent line count finds', () => {
    const section = markdown.slice(markdown.indexOf('\n## 7.'), markdown.indexOf('\n## 8.'));
    const rowLines = section.split('\n').filter((line) => /^\| G[0-9S]+-[0-9]+[a-z]? \| [TE] \|/.test(line));
    expect(index.cases.map((entry) => entry.id)).toEqual(rowLines.map((line) => splitTableRow(line)[0]));
    const counts = countByType(index.cases);
    expect(counts.T).toBe(rowLines.filter((line) => splitTableRow(line)[1] === 'T').length);
    expect(counts.E).toBe(rowLines.filter((line) => splitTableRow(line)[1] === 'E').length);
  });

  it('holds 104 ids (84 T, 20 E) at version 1.5', () => {
    // Pinned for the version prompt 3 and the PRD (R-156) name; later versions add rows.
    if (index.version !== '1.5') return;
    expect(countByType(index.cases)).toEqual({ total: 104, T: 84, E: 20 });
  });
});
