/**
 * G8-2: '"34.500 mp" with no basis' -> "34500 m², basis unknown, original kept. The
 * confirmation names the basis." The area schedule states an area with no basis (rule 8,
 * "A value with no stated basis ... is stored with basis `unknown`"). The figure is the
 * case's own, from guardrails section 7 (prompt 3 section 14 item 3). Synthetic (rule 13).
 */
import { documentFile, page, type EvalCaseFixtures } from '../format';

export const G8_2: EvalCaseFixtures = {
  id: 'G8-2',
  files: [
    documentFile('tabel-suprafete.yaml', {
      documentId: 'TEST-G8-2-tabel-suprafete',
      name: 'TEST tabel suprafete.pdf',
      blocks: [page(1, ['TABEL DE SUPRAFEȚE', 'Obiectiv: Hotel Exemplu (fictiv)', 'Suprafața clădirii: 34.500 mp'])],
    }),
  ],
};
