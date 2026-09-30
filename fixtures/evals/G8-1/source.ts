/**
 * G8-1: '"Sc 2.350 mp, Scd 34.500 mp, Su 27.600 mp" in the memoriu' -> "Three fields with
 * their bases. Sc never feeds a benchmark." The line is the case's own, from guardrails
 * section 7 (prompt 3 section 14 item 3 lets fixtures/evals/<ID>/ use it). Synthetic
 * (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G8_1: EvalCaseFixtures = {
  id: 'G8-1',
  files: [
    documentFile('memoriu.yaml', {
      documentId: 'TEST-G8-1-memoriu',
      name: 'TEST memoriu general.pdf',
      blocks: [
        page(1, [
          'MEMORIU GENERAL',
          'Obiectiv: Hotel Exemplu (fictiv)',
          'Date generale ale construcției:',
          'Sc 2.350 mp, Scd 34.500 mp, Su 27.600 mp',
        ]),
      ],
    }),
  ],
};
