/**
 * The structured output of an extraction request (F-EXTRACT-03): candidates with
 * evidence, "not found" answers with what was searched, the keys of fields the AI
 * could not fill (it writes no question: rule 6), findings (rule 14), and notes for
 * the engineer or the SOVITECH team. There is no field for a verification, a stage
 * label, a price or a question: state is set by code (rule 14; guardrails section 6).
 */
import { z } from 'zod';
import { CandidateSchema, FindingSchema, NoteSchema, NotFoundSchema } from './common';

export const ExtractionOutputSchema = z.strictObject({
  candidates: z.array(CandidateSchema),
  notFound: z.array(NotFoundSchema).describe('The not_found answers'),
  missingFieldKeys: z.array(z.string()).describe('Keys of requested fields the documents could not answer'),
  findings: z.array(FindingSchema),
  notes: z.array(NoteSchema),
});

export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;
export type AiCandidate = ExtractionOutput['candidates'][number];
export type AiNotFound = ExtractionOutput['notFound'][number];
export type AiFinding = ExtractionOutput['findings'][number];
export type AiNote = ExtractionOutput['notes'][number];
