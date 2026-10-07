/**
 * The question engine of the intake wizard (guardrails rules 3, 5, 6 and 7, section 4; F-QUESTION-01
 * to F-QUESTION-10; PRD R-002 to R-004, R-045, R-046, R-051). Pure functions over derived field
 * states and the registry: the API reads the store, calls these, writes what they plan and serves
 * what the resolver makes of the result. Runs in apps/api only.
 *
 * - model.ts: IntakeField, the refusals (IntakeRefusal with the codes routes.ts names), readings of
 *   the derived state (eligible candidates, the owner's own answer, skips since a moment).
 * - confirmations.ts: rule 5's test and budget (passesConfirmationTest, confirmationCandidateOf,
 *   confirmationCandidates, selectConfirmations). G5-2, G5-3.
 * - questions.ts: ask, confirm or show (planQuestion), the defect check (questionsForKnownFields),
 *   step 8's inline asks (inlineAsks) and the one the owner asks for (requestedInlineAsk). G5-1, G7-3, G7-11.
 * - suggestions.ts: Suggested preselections and their guard (suggestionsFor, PRODUCTION_SUGGESTION_RULES,
 *   scopeSuggestionRule). G3-4 (mechanism), G11-9.
 * - continue.ts: what a Continue writes (planContinue) and the records those writes are
 *   (continueRecords). G3-4, G7-8.
 * - owner-values.ts: the owner's typed or chosen value read against its field (parseOwnerAnswer):
 *   the rule 8 parser, the dimension check, `number_ambiguous`. G8-21 (API half).
 * - owner-actions.ts: acknowledge, concern, confirm, resolve a conflict, skip. G3-3.
 * - open-items.ts: "For you" and "SOVITECH will check" (openItems). G7-5.
 * - outputs.ts: which outputs will be ranges or "Not available yet" (outputAvailability,
 *   resolveOutputLine).
 * - late-findings.ts: findings, their steps, dots and the one notice (findingsOf, findingStepOf,
 *   lateFindings). G7-4 (view-model half).
 */
export * from './model';
export * from './confirmations';
export * from './questions';
export * from './suggestions';
export * from './continue';
export * from './owner-values';
export * from './owner-actions';
export * from './open-items';
export * from './outputs';
export * from './late-findings';
export * from './steps';
