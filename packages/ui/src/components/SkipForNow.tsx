import type { Action, Line, Question } from '@sovitech/view-model/browser';
import { Button } from './Button';
import { StatusLine } from './StatusLine';

type SkipAction = Extract<Action, { kind: 'skip' }>;

/**
 * What the link needs from a served question: its state, the skip action the API offers (null on a
 * required field, an answered question, a found fact or a question with a visible suggestion), the
 * "You can provide this later." line after a skip, and, where the question has options on screen,
 * whether one shows as chosen or suggested (step 4 passes its system cards' `selected` and
 * `suggestion`).
 */
export interface SkippableQuestion {
  readonly questionId: string;
  readonly state: Question['state'];
  readonly skip: Action | null;
  readonly afterSkip: Line | null;
  readonly options?: ReadonlyArray<{ readonly selected: boolean; readonly suggestion: { readonly reason: Line } | null }>;
}

export interface SkipForNowProps {
  readonly question: SkippableQuestion;
  /** "Skip for now", from the catalogue (`actions.skip`). */
  readonly label: string;
  /** Called with the served skip action; the web posts it to `fields/skip`. */
  readonly onSkip: (action: SkipAction) => void;
  /**
   * The skip is on its way: the link says so with `aria-busy` and a press sends nothing more (one
   * skip per press, however fast the presses come). Never a disabled state (rule 7): the link takes
   * presses again as soon as the caller clears it.
   */
  readonly busy?: boolean;
}

/**
 * "Skip for now" (guardrails rule 7, "Skip for now"; G7-3; F-QUESTION-04; US-INTAKE-05 AC3).
 *
 * A text link under an unanswered non-required question. It never shows on a question that already
 * has an answer or a visible suggestion, where it would read as "clear my answer": the component
 * checks that itself, whatever the served question says, so a question with a chosen or suggested
 * option never gets the link (G7-3, component half; the question engine is the other half). After a
 * skip, the served line "You can provide this later." shows once, inline, in its place. While the
 * caller's skip is on its way (`busy`), a further press is ignored.
 */
export function SkipForNow({ question, label, onSkip, busy = false }: SkipForNowProps) {
  if (question.state === 'skipped') {
    return question.afterSkip === null ? null : (
      <div className="sov-skip">
        <StatusLine line={question.afterSkip} />
      </div>
    );
  }
  const skip = question.skip;
  const shownChosen = (question.options ?? []).some((option) => option.selected || option.suggestion !== null);
  if (question.state !== 'unanswered' || skip === null || skip.kind !== 'skip' || shownChosen) return null;
  return (
    <div className="sov-skip">
      <Button
        variant="quiet"
        aria-busy={busy}
        onClick={() => {
          if (!busy) onSkip(skip);
        }}
      >
        {label}
      </Button>
    </div>
  );
}
