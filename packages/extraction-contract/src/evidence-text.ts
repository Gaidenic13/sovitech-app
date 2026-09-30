/**
 * The extracted text that the evidence verifier checks excerpts against (rule 1,
 * "The excerpt occurs at that location in the extracted text"; F-EXTRACT-01),
 * per PDF page and per XLSX cell, keyed by the Evidence.locator that names it.
 *
 * Hidden text is left out: a block or a cell with a hidden reason is reported
 * as a hidden_text finding and gives no values (rule 14; G14-2), so an excerpt
 * found only in hidden text finds no text to match. Nothing is taken from an
 * IFC file: its text is sealed with its values (ifc-values.ts), and under
 * guardrails v1.6 no Evidence.locator can point into it (G1-13).
 *
 * The caller stores these texts keyed by project id and content hash (rule 13),
 * and never logs them.
 */
import type { EvidenceLocator } from './generated/zod';
import type { ExtractionOutputView } from './parse';

export interface EvidenceText {
  readonly locator: EvidenceLocator;
  readonly text: string;
}

/** Page texts (visible blocks, in reading order, one per line) and cell texts (the cached value as stored). */
export function evidenceTexts(output: ExtractionOutputView): readonly EvidenceText[] {
  const texts: EvidenceText[] = [];
  if (output.pdf !== undefined) {
    for (const page of output.pdf.pages) {
      const visible = page.blocks.filter((block) => block.hidden.length === 0).map((block) => block.text);
      texts.push({ locator: { page: page.page }, text: visible.join('\n') });
    }
  }
  if (output.xlsx !== undefined) {
    for (const sheet of output.xlsx.sheets) {
      for (const cell of sheet.cells) {
        if (cell.hidden.length === 0) texts.push({ locator: { sheet: sheet.name, cell: cell.ref }, text: cell.raw });
      }
    }
  }
  return texts;
}
