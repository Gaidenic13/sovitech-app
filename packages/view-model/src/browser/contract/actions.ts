/**
 * The owner's writes in the wizard (guardrails 2.1, 2.4, rules 3, 4, 5 and 7; F-VALUE-05,
 * F-VALUE-06, F-QUESTION-04, F-QUESTION-06; PRD R-002, R-003, R-045, R-046, R-051). Every one is a
 * state-changing route: session and CSRF (prompt 3 section 11). Every one appends candidates or
 * events and changes none (2.4): an answer is a new `user` candidate; the owner's own entry on a
 * field whose `confirmBy` is owner or either gets `user_confirmed` at once (2.1), and stays
 * unverified on an engineer field.
 *
 * When writes happen (PRD R-009 "Until decided", stricter than prompt 3 5.2's "stored when made";
 * docs/adr/0039-wizard-navigation-saving-and-late-findings.md): an answer is stored by Next or Continue,
 * an inline Edit save, a confirmation, an inline ask, "Skip for now"; input not yet saved is not
 * stored. A visible suggestion is accepted only on Continue, never on another save (rule 3).
 *
 * Every response carries the display objects the write changed (the web may refetch the step).
 */
import { z } from 'zod';
import { StepNumberSchema } from './common';
import { DisplayObjectsSchema, FieldRefSchema, UuidSchema } from './display';

/**
 * An owner's value for one field, as typed or chosen. A quantity is raw text the server parses
 * with the rule 8 parser and checks against the field's unit dimension (rule 8; US-REVIEW-07
 * AC6); an entry that reads two ways ("1.500") is refused `number_ambiguous`, never stored as one
 * reading; a field that requires a qualifier takes one of its registered qualifiers.
 */
export const AnswerValueSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('choice'), choice: z.string().min(1) }),
  z.strictObject({ kind: z.literal('text'), text: z.string().min(1).max(500) }),
  z.strictObject({ kind: z.literal('quantity'), raw: z.string().min(1).max(40), qualifier: z.string().min(1).optional() }),
]);
export type AnswerValue = z.infer<typeof AnswerValueSchema>;

/**
 * A single-choice or text answer on a step. `corrects`: the candidates the screen showed as the
 * field's value when the owner chose another (a found building type, an earlier answer), which the
 * correction rejects in the owner's name (rule 4, "A correction is a resolution"; G4-5), or, when
 * one is engineer_verified, leaves in place while the field goes into conflict for the engineer
 * (G4-19). Empty when nothing was shown.
 */
export const AnswerSchema = z.strictObject({
  field: FieldRefSchema,
  value: AnswerValueSchema,
  corrects: z.array(UuidSchema),
});
export type Answer = z.infer<typeof AnswerSchema>;

/**
 * A multi-select (systems in scope, goals, automation areas: one decision field per option, 2.6)
 * as the owner left it: the option fields ticked. The server applies the reading of the whole
 * question (PRD R-051, "Proposed (PRD interim, reversible) until D-64"; US-INTAKE-09 AC3,
 * US-SCOPE-02 AC4 and AC6): with at least one option ticked or visibly suggested, each option is
 * recorded (include or exclude; selected or not selected) where it differs from the stored
 * decision (nothing new when unchanged, US-SCOPE-02 AC9); with none, the question is recorded as
 * skipped, never as a decision against every option.
 */
export const MultiAnswerSchema = z.strictObject({ questionId: z.string().min(1), ticked: z.array(z.string().min(1)) });
export type MultiAnswer = z.infer<typeof MultiAnswerSchema>;

/** A suggestion the page showed and the owner left in place: the option (a decision field key, or a field and option key). */
export const VisibleSuggestionSchema = z.strictObject({ field: FieldRefSchema, choice: z.string().min(1) });

/**
 * `POST /api/projects/:projectId/steps/:step/continue` (Next on step 1 of an existing project,
 * Continue on steps 2 to 7; step 8 has Generate instead). The server:
 * 1. writes `answers` and `multi` (above);
 * 2. accepts each visible suggestion the page reports that the server also suggests now, as a new
 *    `user` candidate with `user_confirmed` and `accepted_suggestion` events whose reason names
 *    what suggested it (rule 3; G3-4); a reported suggestion it does not suggest now is ignored
 *    and logged (never trusted);
 * 3. records `skipped` (by the owner) for each shown question left unanswered and each shown
 *    confirmation left unanswered (rule 7: "Continue counts as skipping"; a declined confirmation
 *    is not prompted again during the intake and joins "For you" at step 8);
 * 4. answers the next step: always the next in order (PRD R-008 "Until decided": after an Edit
 *    from step 8, Continue also moves to the next step in order).
 * Continue never confirms a fact (rule 3) and is never refused for anything the owner left open.
 */
export const ContinueRequestSchema = z.strictObject({
  answers: z.array(AnswerSchema),
  multi: z.array(MultiAnswerSchema),
  visibleSuggestions: z.array(VisibleSuggestionSchema),
  /** The questions and confirmations the page showed, by question id or confirmation candidate id. */
  shown: z.strictObject({ questions: z.array(z.string().min(1)), confirmations: z.array(UuidSchema) }),
});
export type ContinueRequest = z.infer<typeof ContinueRequestSchema>;

export const ContinueResponseSchema = z.strictObject({ nextStep: z.union([StepNumberSchema, z.literal('proposal')]), displayObjects: DisplayObjectsSchema });
export type ContinueResponse = z.infer<typeof ContinueResponseSchema>;

/** `POST /api/projects/:projectId/fields/edit`: an inline Edit save or a step 8 inline ask answer. */
export const EditRequestSchema = z.strictObject({ field: FieldRefSchema, value: AnswerValueSchema, corrects: z.array(UuidSchema) });
export type EditRequest = z.infer<typeof EditRequestSchema>;

/** `POST /api/projects/:projectId/fields/confirm`: "Yes" on a confirmation the page showed (rule 5; US-REVIEW-05 AC4, US-INTAKE-07 AC5). */
export const ConfirmRequestSchema = z.strictObject({ candidateId: UuidSchema });

/** `POST /api/projects/:projectId/fields/acknowledge`: "Looks right" on engineer items (rule 3; G3-3): `owner_acknowledged` only; an item the owner already acknowledged records nothing again (200). */
export const AcknowledgeRequestSchema = z.strictObject({ candidateIds: z.array(UuidSchema).min(1) });

/** `POST /api/projects/:projectId/fields/concern`: "Something's wrong" on an engineer item: the owner's rejection with no value of their own, for the engineer queue (rule 3; G3-10); on a value the owner already rejected it records nothing again (200). */
export const ConcernRequestSchema = z.strictObject({ candidateId: UuidSchema });

/** `POST /api/projects/:projectId/fields/resolve-conflict`: the owner's choice on a conflict routed to the owner (rule 4; US-REVIEW-11 AC3): a `conflict_resolved` event naming the chosen candidate, who, when and why. */
export const ResolveConflictRequestSchema = z.strictObject({ field: FieldRefSchema, chosenCandidateId: UuidSchema });

/**
 * `POST /api/projects/:projectId/fields/skip`: "Skip for now" or "Generate without it" (rule 7): `skipped` by the
 * owner on the question's fields, only where the question is asked now (G7-10). `step`: the step of the page that
 * sent it: 8 for step 8's "Generate without it" and Generate's skips of the asks left open, else the step whose
 * "Skip for now" was pressed. A skip counts only where that step asks the question now (an early skip of step 8's
 * ask is refused `answer_invalid`); a repeat writes nothing and answers 200. Added optional in part B and made
 * required by the integrator once every page sent it (ADR 0036 decision 11): a request that names no step is refused
 * 400 `request_invalid`, so no skip from no page can drop step 8's ask.
 */
export const SkipRequestSchema = z.strictObject({ questionId: z.string().min(1), step: StepNumberSchema });

/** What every field write answers. */
export const FieldWriteResponseSchema = z.strictObject({ displayObjects: DisplayObjectsSchema });
export type FieldWriteResponse = z.infer<typeof FieldWriteResponseSchema>;
