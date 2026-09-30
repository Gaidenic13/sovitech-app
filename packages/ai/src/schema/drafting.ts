/**
 * The structured output of a drafting request (F-PROPOSAL-03): one paragraph per slot
 * the request names, written with value, calculation and product tokens only
 * (rule 2 "Numbers in prose are references, not text"; rule 9 "Arithmetic lives in
 * code"), and notes for the engineer or the SOVITECH team.
 */
import { z } from 'zod';
import { NoteSchema } from './common';

export const DraftingOutputSchema = z.strictObject({
  paragraphs: z.array(
    z.strictObject({
      slot: z.string().describe('A slot id from the request'),
      text: z.string().describe('Prose in plain words; every figure only through a token from the request'),
    }),
  ),
  notes: z.array(NoteSchema),
});

export type DraftingOutput = z.infer<typeof DraftingOutputSchema>;
