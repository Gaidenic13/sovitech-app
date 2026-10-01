/**
 * The owner's writes on a shown value from steps 5 to 8 (routes.ts: `fields.confirm`,
 * `fields.acknowledge`, `fields.concern`, `fields.resolveConflict`, `fields.skip`): one hook that posts
 * the served action and turns a refusal into an inline sentence. Nothing here decides anything: the
 * action and its candidates are the ones the API served with the value (guardrails rules 3, 4, 5
 * and 7), and the store's guards refuse anything else.
 *
 * - "Yes" on a confirmation (rule 5; US-INTAKE-07 AC5): `user_confirmed`.
 * - "Looks right" (rule 3; G3-3): `owner_acknowledged` only; "Something's wrong" (G3-10): a note to the
 *   engineer queue.
 * - The owner's choice on a conflict routed to them (rule 4; US-REVIEW-11 AC3).
 * - "Skip for now" (rule 7; US-INTAKE-06 AC3).
 *
 * One write at a time (../wizard/use-in-flight.ts): while a write of the screen is on its way, and
 * until the screen has read its view again after it, a further press of any of these actions sends
 * nothing (a double-click on "Skip for now" or "Yes" is one request); the actions take presses again
 * once the answer is in, whatever it is (rule 7: nothing is left blocked).
 *
 * A write that was refused because the page is out of date (the value changed, the conflict closed,
 * the question was answered meanwhile) reads the page again; nothing else is blocked (rule 7). A
 * choice on a conflict that went to the engineer queue meanwhile (`routed_to_engineer`: an engineer
 * field, or a candidate verified by SOVITECH, rule 4 "Routing") reads the page again too, with no
 * sentence of the catalogue: the served value then shows rule 4's own line for it.
 */
import { useCallback, useState } from 'react';
import type { FieldRef, StepNumber } from '@sovitech/view-model/browser';
import { ApiError, isSignedOut, request } from '../api/client';
import { copy } from '../copy';
import { useOnSignedOut } from '../session/SessionProvider';
import { useInFlight } from '../wizard/use-in-flight';

/** Refusals that mean the page showed something that is no longer so: the page reads its view again. */
const STALE = new Set(['shown_value_changed', 'confirmation_not_shown', 'conflict_not_open', 'question_answered', 'routed_to_engineer']);

/**
 * Refusals the page answers by reading its view again with no sentence of its own: the served
 * display says what changed in the guardrails' words (rule 4: "Documents disagree on this. A
 * SOVITECH engineer will check it.").
 */
const SHOWN_BY_THE_VALUE = new Set(['routed_to_engineer']);

/** The inline sentence for a refusal code, or null where the value read again says it. */
export function writeRefusalMessage(code: string): string | null {
  if (SHOWN_BY_THE_VALUE.has(code)) return null;
  if (STALE.has(code)) return copy.edit.changed;
  if (code === 'owner_only') return copy.edit.ownerOnly;
  return copy.review.writeFailed;
}

export interface FieldWrites {
  /** A write is on its way (or the screen is reading its view again after it): presses send nothing. */
  readonly busy: boolean;
  /** The last refusal's sentence, or null. */
  readonly error: string | null;
  readonly clearError: () => void;
  readonly confirm: (candidateId: string) => Promise<boolean>;
  readonly acknowledge: (candidateIds: readonly string[]) => Promise<boolean>;
  readonly concern: (candidateId: string) => Promise<boolean>;
  readonly resolveConflict: (field: FieldRef, chosenCandidateId: string) => Promise<boolean>;
  /** The page names its own step, so the API records the skip only where the question is asked now (G7-10). */
  readonly skip: (questionId: string, step: StepNumber) => Promise<boolean>;
}

/**
 * The writes of one screen. `onChanged` reads the screen's view again after a write, or after a
 * refusal that says the page is out of date; when it returns the reading's promise, the actions stay
 * busy until the view is read again, so a second press never acts on what the first one changed.
 * Each write resolves to whether it was stored (false, sending nothing, for a press while a write is
 * on its way).
 */
export function useFieldWrites(projectId: string, onChanged: () => void | Promise<void>): FieldWrites {
  const onSignedOut = useOnSignedOut();
  const inFlight = useInFlight();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (write: () => Promise<unknown>): Promise<boolean> => {
      const stored = await inFlight.run(async () => {
        setError(null);
        try {
          await write();
        } catch (refusal) {
          if (isSignedOut(refusal)) {
            onSignedOut();
            return false;
          }
          const code = refusal instanceof ApiError ? refusal.code : '';
          setError(writeRefusalMessage(code));
          if (STALE.has(code)) await onChanged();
          return false;
        }
        await onChanged();
        return true;
      });
      return stored ?? false;
    },
    [inFlight, onChanged, onSignedOut],
  );

  const params = { projectId };
  return {
    busy: inFlight.busy,
    error,
    clearError: useCallback(() => setError(null), []),
    confirm: (candidateId) => run(() => request('fields.confirm', { params, body: { candidateId } })),
    acknowledge: (candidateIds) => run(() => request('fields.acknowledge', { params, body: { candidateIds: [...candidateIds] } })),
    concern: (candidateId) => run(() => request('fields.concern', { params, body: { candidateId } })),
    resolveConflict: (field, chosenCandidateId) => run(() => request('fields.resolveConflict', { params, body: { field, chosenCandidateId } })),
    skip: (questionId, step) => run(() => request('fields.skip', { params, body: { questionId, step } })),
  };
}
