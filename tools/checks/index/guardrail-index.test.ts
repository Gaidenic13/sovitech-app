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

  it('ADR 0003: holds the pinned count of ids for its version: 104 (84 T, 20 E) at 1.5, 143 (123 T, 20 E) at 1.6, 169 (149 T, 20 E) at 1.7', () => {
    // 1.5 is the version prompt 3 and the PRD (R-156) name; 1.6 adds phase 1's cases: prompt 3's
    // G4-20, G10-8 and G13-5, the 20 cases of the phase 1 review round (G1-14, G1-15,
    // G3-9 to G3-11, G4-21 to G4-29, G8-12 to G8-14, G10-9, G13-6, G13-7), and the 14 of its
    // third round (G1-16, G1-17, G2-9, G3-12 to G3-15, G4-31, G7-7, G8-15 to G8-17, G12-7, G13-8),
    // G3-16 of its fourth, and G4-33 of its fifth (G4-32 was taken back in the fifth: its expected
    // result rested on a reading, not on the rules as written). 1.7 adds phase 2's cases: prompt 3's
    // G1-13, G12-5, G12-6 and G14-3, G4-34 (drafted in the phase 1 review's fifth round) and G4-35
    // (NP-A of phase 1's closing verification), and the 16 of the phase 2 review's fix round (G1-18
    // to G1-24, G2-10, G2-11, G3-17, G8-18 to G8-20, G11-7, G12-8 and G12-9), and the 4 of its
    // second fix round (G1-25, G2-12, G3-18 and G11-8).
    // A later version adds its own pin here, so the count is never left unchecked.
    const pinned: Record<string, { total: number; T: number; E: number }> = {
      '1.5': { total: 104, T: 84, E: 20 },
      '1.6': { total: 143, T: 123, E: 20 },
      '1.7': { total: 169, T: 149, E: 20 },
    };
    const version = index.version ?? '(no version)';
    expect(Object.keys(pinned)).toContain(version);
    expect(countByType(index.cases)).toEqual(pinned[version]);
  });
});
