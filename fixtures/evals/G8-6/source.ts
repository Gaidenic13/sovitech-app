/**
 * G8-6: '"H = 25 mCA"' -> "25 m head, with the original kept and no silent conversion"
 * (rule 8, "Pressure and head"; the unit registry's `m_head`, written "mCA"). The line is
 * the case's own, from guardrails section 7 (prompt 3 section 14 item 3). Synthetic
 * (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G8_6: EvalCaseFixtures = {
  id: 'G8-6',
  files: [
    documentFile('fisa-pompa.yaml', {
      documentId: 'TEST-G8-6-fisa-pompa',
      name: 'TEST fisa tehnica pompa P1.pdf',
      blocks: [
        page(1, [
          'FIȘĂ TEHNICĂ - POMPĂ DE CIRCULAȚIE P1',
          'Producător: Exemplu Pompe SRL (fictiv)',
          'Debit: 40 mc/h',
          'H = 25 mCA',
        ]),
      ],
    }),
  ],
};
