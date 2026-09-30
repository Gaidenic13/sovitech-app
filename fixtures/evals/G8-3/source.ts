/**
 * G8-3: '"1.500 kW" in a table whose locale is unknown' -> "One candidate with two
 * alternatives, low confidence". The table carries no word or other number that would set
 * its locale ("Motor" is the same word in Romanian and English), so "1.500" reads as 1.5 or
 * 1500 (rule 8, "Ambiguous readings keep both"). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G8_3: EvalCaseFixtures = {
  id: 'G8-3',
  files: [
    documentFile('tabel-motor.yaml', {
      documentId: 'TEST-G8-3-tabel-motor',
      name: 'TEST tabel P2.pdf',
      blocks: [page(1, ['P2', 'Motor', '1.500 kW'])],
    }),
  ],
};
