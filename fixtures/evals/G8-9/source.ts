/**
 * G8-9: '"3S+P+Mz+12E+Er"' -> "Parsed into the floor structure, with the original kept"
 * (rule 8, "Floors": "The regim de înălțime is the first source"). The notation is the
 * case's own, from guardrails section 7 (prompt 3 section 14 item 3). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G8_9: EvalCaseFixtures = {
  id: 'G8-9',
  files: [
    documentFile('memoriu-arhitectura.yaml', {
      documentId: 'TEST-G8-9-memoriu-arhitectura',
      name: 'TEST memoriu arhitectura.pdf',
      blocks: [
        page(1, [
          'MEMORIU DE ARHITECTURĂ',
          'Obiectiv: Hotel Exemplu (fictiv)',
          'Regim de înălțime: 3S+P+Mz+12E+Er',
          'Structura de rezistență: cadre din beton armat.',
        ]),
      ],
    }),
  ],
};
