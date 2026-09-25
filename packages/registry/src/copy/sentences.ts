/**
 * Generated sentences the app builds from stored state (docs/guardrails.md 2.8,
 * "Where they are allowed": "badges, status lines and generated sentences that
 * the app builds from stored state, such as 'Confirmed by you', 'Verified by
 * SOVITECH' ...").
 *
 * Phase 1 registers the two example lines of 2.8's badge table that hold a
 * reserved term, the source lines under the badges "Verified by SOVITECH" and
 * "Confirmed by you". Each is 2.8's text; the day and month of 2.8's example
 * ("12 Oct") is the `{date}` slot, filled from the event's own time (ADR 0011).
 * `readsStoredState` names the event each is built from; the view-model (phase 3)
 * builds them, never the AI (rule 11, rule 2).
 *
 * Not here yet: the rule 11 sentence "designed to provide the functions of BAC
 * class B, verified by SOVITECH", whose class letter is a word of 2.8's example,
 * not a slot (ADR 0011 decision 6), so a template for it waits for the approver;
 * phase 5 or 7 lists it when the proposal needs it.
 */

export interface GeneratedSentenceDefinition {
  readonly id: string;
  /** 2.8's text, with `{slot}` where 2.8 writes an example value. */
  readonly template: string;
  /** The stored state it is built from. */
  readonly readsStoredState: readonly string[];
}

export const GENERATED_SENTENCES: readonly GeneratedSentenceDefinition[] = Object.freeze([
  Object.freeze({
    id: 'ai_inference_engineer_verified_line',
    template: 'AI inference, verified by SOVITECH on {date}',
    readsStoredState: Object.freeze(['candidate.source:ai_inference', 'candidate_event:engineer_verified.at']),
  }),
  Object.freeze({
    id: 'ai_inference_user_confirmed_line',
    template: 'AI inference, confirmed by you',
    readsStoredState: Object.freeze(['candidate.source:ai_inference', 'candidate_event:user_confirmed']),
  }),
]);
