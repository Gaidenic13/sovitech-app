/**
 * G3-8: "A tag 'VCV-1.12' in an equipment list, where the reference glossary defines VCV as
 * fan coil" -> "`ai_inference`, high, with the tag as evidence. The badge reads Likely, not
 * Possible." The list gives tags and places only, so the type can come only from the
 * glossary; the case sends the TEST glossary fixtures/datasets/TEST-glossary.json (prompt 3
 * section 10, phase 2: "G3-8 (with a TEST glossary in fixtures/datasets/)"). Synthetic
 * (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G3_8: EvalCaseFixtures = {
  id: 'G3-8',
  files: [
    documentFile('lista-echipamente.yaml', {
      documentId: 'TEST-G3-8-lista-echipamente',
      name: 'TEST lista echipamente etaj.pdf',
      blocks: [
        page(1, [
          'LISTA ECHIPAMENTELOR - ETAJ 1',
          'Obiectiv: Hotel Exemplu (fictiv)',
          'Cod | Amplasare',
          'VCV-1.12 | Etaj 1, camera 112',
          'VCV-1.13 | Etaj 1, camera 113',
        ]),
      ],
    }),
  ],
};
