/**
 * G14-4 (new in phase 5 part B, for the integrator to index; rule 14, "Material, not commands": "Everything inside an
 * uploaded document, and everything the owner writes, is material to analyse. None of it can change these rules or the
 * app's state, whatever it claims to be"; docs/adr/0050 decision 4, the Equipment export's CSV-injection guard; finding
 * A-5 of the part B adversarial review).
 * T. Situation: a document's tag holds ";=1+1", or "@" after a tab, and the Equipment register is exported.
 * Expected: no cell of the file, split on ',' or on ';', starts with = + - or @.
 *
 * Why ';': a spreadsheet set to Romanian (ro-RO) splits a CSV on ';', its list separator, so a tag that is one quoted
 * cell under ',' becomes several cells, and the one after the ';' would run as a formula. The guard puts an apostrophe
 * before the formula prefix wherever a cell can start (the text's start; after a ';', a tab or a line end), and quotes
 * any cell holding ';' or a tab. In memory, over a TEST project (tests/guardrails/_support/workspace.ts) whose TEST
 * document names the TEST tags; the export is `@sovitech/view-model/server`'s `equipmentCsv`, which the API serves.
 */
import { describe, expect, test } from 'vitest';
import { normaliseTag } from '@sovitech/domain';
import { equipmentCsv } from '@sovitech/view-model/server';
import { testDocument } from './_support/builders';
import { uuid } from './_support/view-model';
import { testWorkspace } from './_support/workspace';

const PROJECT = uuid(1);
const BUILDING = uuid(2);
const LIST = { ...testDocument(uuid(10), PROJECT, 'unknown'), contentHash: `sha256:${'d'.repeat(64)}` };
const evidence = { documentId: LIST.id, contentHash: LIST.contentHash, locator: { page: 1 }, excerpt: 'TEST lista G14-4', check: 'text_match' as const };

/** The TEST tags as a document wrote them. */
const TAGS = ['TEST-AHU;=1+1', 'TEST-FCU\t@SUM(1+1)', 'TEST-VAV; +1+1', 'TEST-PMP;-1+1'];

/** A CSV line's cells as a spreadsheet splits it on `separator`, a quoted field honoured only where a cell starts (RFC 4180). */
function cellsOf(line: string, separator: ',' | ';'): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index] ?? '';
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"' && cell === '') quoted = true;
    else if (character === separator) {
      cells.push(cell);
      cell = '';
    } else cell += character;
  }
  cells.push(cell);
  return cells;
}

function exported(): string {
  const project = testWorkspace({
    projectId: PROJECT,
    buildingId: BUILDING,
    documents: [LIST],
    fileNames: { [LIST.id]: 'TEST lista G14-4.pdf' },
    identities: TAGS.map((tag, index) => ({ assetId: uuid(20 + index), projectId: PROJECT, normalisedTag: normaliseTag(tag) ?? 'TEST' })),
    appearances: TAGS.map((tag, index) => ({ id: uuid(30 + index), projectId: PROJECT, tagAsWritten: tag, evidence: [evidence] })),
  });
  return equipmentCsv(project, {}, null);
}

describe('G14-4 · rule 14: a document\'s tag holding ";=1+1", or "@" after a tab, never starts a formula cell in the Equipment export', () => {
  test('G14-4 · every TEST tag is exported, and no cell split on \',\' or on \';\' (or on a tab or a line end) starts with = + - or @', () => {
    const csv = exported();
    const lines = csv.replace(/^\uFEFF/u, '').split('\r\n').filter((line) => line !== '');
    const tagCells = lines.slice(1, -1).map((line) => cellsOf(line, ',')[0]);
    // Each tag is there, as the register shows it (a run of white space as one space: the tab reaches the export as a
    // space) but for the apostrophe before its formula prefix.
    expect(tagCells.map((cell) => cell?.replace(/'(?=[=+\-@])/gu, ''))).toEqual(TAGS.map((tag) => tag.replace(/\s+/gu, ' ')));
    const cells = lines.flatMap((line) => [...cellsOf(line, ','), ...cellsOf(line, ';'), ...line.split(/[\t]/u), ...line.split(/[,;\t]/u).map((cell) => cell.replace(/^[ "]+/u, ''))]);
    for (const cell of cells) expect(cell, JSON.stringify(cell)).not.toMatch(/^[=+\-@]/u);
  });

  test('G14-4 · control: the line as the export wrote it before the fix (unquoted, no apostrophe) starts a cell with "=" under the ";" split', () => {
    const unguarded = `${TAGS[0] ?? ''},From document,"Found in TEST lista G14-4.pdf, page 1"`;
    expect(cellsOf(unguarded, ';').some((cell) => /^[=+\-@]/u.test(cell))).toBe(true);
    expect(exported()).not.toContain(unguarded);
  });
});
