/**
 * The text evidence is checked against leaves hidden text out.
 *
 * Ids: F-EXTRACT-01, F-EXTRACT-04, F-EXTRACT-10, rule 14 (hidden text gives no
 * values; the setup of G14-2), rule 1 (the excerpt occurs at the location).
 */
import { describe, expect, it } from 'vitest';
import { evidenceTexts, parseExtractionOutput } from './index';
import { CORPUS } from './samples/corpus';

function parsed(name: string) {
  const value = CORPUS.cases.find((corpusCase) => corpusCase.name === name)?.value;
  const result = parseExtractionOutput(value);
  if (!result.ok) throw new Error(`${name} is valid`);
  return result.value;
}

describe('F-EXTRACT-01 · F-EXTRACT-10 · rule 14: evidence text', () => {
  it('US-DOCS-10 · F-EXTRACT-01 · F-EXTRACT-10 · rule 14: a PDF page text holds its visible blocks and never a hidden one', () => {
    const texts = evidenceTexts(parsed('pdf-analysed'));
    const pageOne = texts.find((text) => 'page' in text.locator && text.locator.page === 1);
    expect(pageOne?.text).toBe('Memoriu TEST\nAria TEST 7.35 mp');
    expect(texts.map((text) => text.text).join('\n')).not.toContain('Putere TEST');
  });

  it('US-DOCS-10 · F-EXTRACT-01 · F-EXTRACT-10 · rule 14: an XLSX cell in a hidden row or on a hidden sheet gives no evidence text', () => {
    const texts = evidenceTexts(parsed('xlsx-analysed'));
    expect(texts.map((text) => text.locator)).toEqual([
      { sheet: 'Camere', cell: 'A1' },
      { sheet: 'Camere', cell: 'B2' },
    ]);
    expect(texts[1]?.text).toBe('17.25');
  });

  it('G12-5: an IFC output gives no evidence text at all, with or without its sealed section', () => {
    expect(evidenceTexts(parsed('ifc-with-values'))).toEqual([]);
    expect(evidenceTexts(parsed('ifc-gate-closed'))).toEqual([]);
  });
});
