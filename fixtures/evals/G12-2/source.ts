/**
 * G12-2: "No AHU in the analysed documents" -> '"Not found in the analysed documents",
 * never "the building has no AHU"' (rule 12, "Absence of evidence is not evidence of
 * absence"). A lighting plan and its legend: nothing about ventilation at all. Synthetic
 * (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G12_2: EvalCaseFixtures = {
  id: 'G12-2',
  files: [
    documentFile('plan-iluminat.yaml', {
      documentId: 'TEST-G12-2-plan-iluminat',
      name: 'TEST plan iluminat etaj.pdf',
      blocks: [
        page(1, [
          'PLAN ETAJ 1 - INSTALAȚII DE ILUMINAT',
          'Obiectiv: Hotel Exemplu (fictiv)',
          'Corpuri de iluminat cu LED în camere și pe hol',
          'Tablou electric de etaj TE-E1',
        ]),
        page(2, ['LEGENDĂ', 'Corp de iluminat aplicat', 'Întrerupător simplu', 'Priză cu contact de protecție']),
      ],
    }),
  ],
};
