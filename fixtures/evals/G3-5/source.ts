/**
 * G3-5: "A document titled 'DALI - Documentație de avizare…'" -> "Classified as a
 * feasibility-stage document. No lighting-protocol candidate." DALI is the Romanian
 * feasibility documentation here, not the lighting protocol (rule 8, "Abbreviations": "DALI
 * means documentație de avizare or the lighting protocol"); the lighting paragraph names no
 * protocol. Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G3_5: EvalCaseFixtures = {
  id: 'G3-5',
  files: [
    documentFile('dali.yaml', {
      documentId: 'TEST-G3-5-dali',
      name: 'TEST documentatie avizare.pdf',
      blocks: [
        page(1, [
          'DALI - Documentație de avizare a lucrărilor de intervenții',
          'Obiectiv: Hotel Exemplu (fictiv) - reabilitarea instalațiilor',
          'Beneficiar: Exemplu Hospitality SRL (fictiv)',
          'Proiectant: Studio Exemplu SRL (fictiv)',
        ]),
        page(2, [
          'SOLUȚII PROPUSE',
          'Instalații electrice: corpurile de iluminat din zonele comune se înlocuiesc cu corpuri de iluminat cu LED, cu comandă locală.',
          'Instalații termice: se modernizează centrala termică și se înlocuiesc pompele de circulație.',
        ]),
      ],
    }),
  ],
};
