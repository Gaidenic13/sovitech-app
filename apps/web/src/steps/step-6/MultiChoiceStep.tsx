/**
 * Steps 6 and 7: one multi-select question, one decision field per card (guardrails 2.6), as the
 * approved OB-6 and OB-7 draw it: the step's title is the question, the cards are real checkbox
 * inputs (prompt 3 section 11), and Back and Continue are never disabled (rule 7).
 *
 * - Nothing is ticked but what the API serves as ticked: the owner's stored decisions, or a visible
 *   suggestion with its Suggested reason (none until D-11 and D-12: PRD R-005, R-006 "Until decided").
 *   The approved screens' preselections are not reproduced (US-INTAKE-09 AC5, US-INTAKE-11 AC1).
 * - A card with a stored decision carries it on the card's top row, through the Value component in one
 *   line, its text and its badge (Provided by you: US-INTAKE-09 AC2, US-INTAKE-10 AC2; 2.8
 *   "Prominence": the badge on the same tile as its figure), while the owner has not changed it on
 *   this page; a card the owner ticked or unticked shows no stored badge until Continue stores it. A
 *   suggested card carries its Suggested value the same way, with its reason under its description
 *   (rule 3).
 * - "Skip for now" under the question while no card is ticked and none is suggested (rule 7;
 *   US-INTAKE-09 AC6, US-INTAKE-10 AC6; G7-3), on the grid's left edge; "You can provide this later."
 *   once after a skip. Skip and Continue each send one request per press: a press while theirs is
 *   on its way is ignored (../../wizard/use-in-flight.ts), never refused.
 * - While the answers load, the step keeps its frame, one outline per card, and says so in one line
 *   (../step-5/LoadingFrame.tsx).
 * - Continue sends the whole question; with nothing ticked the server records a skip, never a
 *   decision against every option (rule 7; US-INTAKE-09 AC3; G7-8).
 * - No "Other" card and no note field (R-007, R-011 "Until decided"; the registry registers no
 *   "Other" goal: it would change no output, rule 6).
 */
import { ChoiceCard, ChoiceGroup, SkipForNow, StatusLine, Value } from '@sovitech/ui';
import type { Question } from '@sovitech/view-model/browser';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { isSignedOut } from '../../api/client';
import { copy } from '../../copy';
import { LoadFailed } from '../../pages/PageState';
import { useFieldWrites } from '../../review/field-writes';
import { useOnSignedOut } from '../../session/SessionProvider';
import { StepHeading, WizardLayout } from '../../shell/WizardLayout';
import { WizardFooter } from '../../wizard/WizardFooter';
import { WizardStepper } from '../../wizard/WizardStepper';
import { EMPTY_CONTINUE, useWizard } from '../../wizard/WizardProvider';
import { useInFlight } from '../../wizard/use-in-flight';
import { useStepView, type Displays } from '../../wizard/use-step-view';
import { multiChoiceContinue, servedTicks } from '../step-5/continue-body';
import { LoadingLine, OptionOutlines, SkipRoom } from '../step-5/LoadingFrame';
import { QUESTION_COPY, continueRefusalMessage } from '../step-5/Step5';

/** A card's words: fixed copy from the catalogue, by the option's last key part (`project.goal.reduce_energy` → `reduce_energy`). */
export interface CardCopy {
  readonly title: string;
  readonly description: string;
}

/** The option's own key: the decision field key's last part. */
export function optionId(optionKey: string): string {
  const parts = optionKey.split('.');
  return parts[parts.length - 1] ?? optionKey;
}

interface MultiQuestionProps {
  readonly question: Question;
  readonly displays: Displays;
  readonly ticked: ReadonlySet<string>;
  readonly onToggle: (optionKey: string, checked: boolean) => void;
  readonly onSkip: (questionId: string) => void;
  /** The skip is on its way: the link shows aria-busy and takes no second press. */
  readonly skipping: boolean;
  readonly cards: Readonly<Record<string, CardCopy | undefined>>;
  readonly icons: Readonly<Record<string, LucideIcon | undefined>>;
  readonly columns: number;
}

function MultiQuestion({ question, displays, ticked, onToggle, onSkip, skipping, cards, icons, columns }: MultiQuestionProps) {
  const served = servedTicks(question);
  const text = QUESTION_COPY[question.questionId];
  return (
    <ChoiceGroup
      legend={<span className="sr-only">{text?.title ?? question.questionId}</span>}
      columns={columns}
      footer={
        question.state === 'skipped' && ticked.size > 0 ? null : (
          <SkipForNow
            question={{
              questionId: question.questionId,
              state: question.state,
              skip: question.skip,
              afterSkip: question.afterSkip,
              options: question.options.map((option) => ({ selected: ticked.has(option.key), suggestion: option.suggestion })),
            }}
            label={copy.actions.skip}
            onSkip={(action) => onSkip(action.questionId)}
            busy={skipping}
          />
        )
      }
    >
      {question.options.map((option) => {
        const id = optionId(option.key);
        const words = cards[id];
        const icon = icons[id];
        const display = option.valueId === undefined ? undefined : displays.get(option.valueId);
        const changed = served.has(option.key) !== ticked.has(option.key);
        // The stored decision shows on the card's top row while the owner has not changed this card; a missing one ("Not
        // provided yet") is the question's state, said once by its Skip link or line, not on every card.
        const stored = display !== undefined && !changed && (display.shape !== 'missing' || option.suggestion !== null) ? display : undefined;
        const status: ReactNode = stored === undefined ? undefined : <Value display={stored} label={null} layout="compact" />;
        const extra: ReactNode = option.suggestion === null || changed ? undefined : <StatusLine line={option.suggestion.reason} as="span" />;
        return (
          <ChoiceCard
            key={option.key}
            type="checkbox"
            name={question.questionId}
            value={option.key}
            checked={ticked.has(option.key)}
            onChange={(checked) => onToggle(option.key, checked)}
            title={words?.title ?? id}
            {...(words === undefined ? {} : { description: words.description })}
            {...(icon === undefined ? {} : { icon })}
            {...(extra === undefined ? {} : { extra })}
            {...(status === undefined ? {} : { status })}
          />
        );
      })}
    </ChoiceGroup>
  );
}

export interface MultiChoiceStepProps {
  readonly step: 6 | 7;
  readonly title: string;
  readonly subtitle: string;
  readonly cards: Readonly<Record<string, CardCopy | undefined>>;
  readonly icons: Readonly<Record<string, LucideIcon | undefined>>;
  readonly columns: number;
  /** The content width (onboarding-spec 2.4, "Content widths": the 4-column card grids' width, or the narrower 3-column grid's; DR-9). */
  readonly maxWidth: 'max-w-[1240px]' | 'max-w-[1070px]';
  /** Content under the cards (step 7's information banner). */
  readonly after?: ReactNode;
}

export function MultiChoiceStep({ step, title, subtitle, cards, icons, columns, maxWidth, after }: MultiChoiceStepProps) {
  const { projectId, back, continueFrom } = useWizard();
  const onSignedOut = useOnSignedOut();
  const { state, view, displays, asOf, reload } = useStepView(step);
  // The owner's ticks on this page, or null while they changed nothing (the served ticks show).
  const [ticks, setTicks] = useState<ReadonlySet<string> | null>(null);
  const continuing = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);
  const refresh = useCallback(() => reload({ quiet: true }), [reload]);
  const writes = useFieldWrites(projectId, refresh);

  const question = view?.question;
  const ticked = ticks ?? (question === undefined ? new Set<string>() : servedTicks(question));

  const onToggle = (optionKey: string, checked: boolean) => {
    const next = new Set(ticked);
    if (checked) next.add(optionKey);
    else next.delete(optionKey);
    setTicks(next);
  };

  const onContinue = () => {
    if (!continuing.claim()) return;
    setFailure(null);
    const body = question === undefined ? EMPTY_CONTINUE : multiChoiceContinue(question, ticked);
    continueFrom(step, asOf, body).catch((error: unknown) => {
      continuing.release();
      if (isSignedOut(error)) {
        onSignedOut();
        return;
      }
      setFailure(continueRefusalMessage(error));
    });
  };

  return (
    <WizardLayout
      stepper={<WizardStepper step={step} />}
      footer={<WizardFooter onBack={() => back(step, asOf)} primaryLabel={copy.nav.continue} onPrimary={onContinue} busy={continuing.busy} error={failure ?? writes.error} />}
    >
      <section aria-labelledby="step-title" className="flex flex-col gap-12">
        <StepHeading title={title} subtitle={subtitle} />
        {state.status === 'failed' && view === undefined ? <LoadFailed onRetry={() => void reload()} /> : null}
        {state.status === 'loading' ? (
          <div className={`mx-auto flex w-full ${maxWidth} flex-col gap-8`}>
            <LoadingLine />
            <div className="flex flex-col gap-3">
              <OptionOutlines count={Object.keys(cards).length} columns={columns} shape="tall" />
              <SkipRoom />
            </div>
            {after}
          </div>
        ) : null}
        {question === undefined ? null : (
          <div className={`mx-auto flex w-full ${maxWidth} flex-col gap-8`}>
            <MultiQuestion
              question={question}
              displays={displays}
              ticked={ticked}
              onToggle={onToggle}
              onSkip={(questionId) => void writes.skip(questionId, step)}
              skipping={writes.busy}
              cards={cards}
              icons={icons}
              columns={columns}
            />
            {after}
          </div>
        )}
      </section>
    </WizardLayout>
  );
}
