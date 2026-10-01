/**
 * OB-5 Step 5 Operations (US-INTAKE-05 to US-INTAKE-08; US-INTAKE-12 and US-INTAKE-14 "Until
 * decided"; PRD R-002, R-006, R-007, R-011; guardrails rules 3, 5, 6 and 7, 2.8 "Prominence", section
 * 4 and section 5 rows §5-5a, §5-5b, §5-57a, §5-57b).
 *
 * - The questions come in the order the API serves them, rule 6's impactRank (building type, then
 *   the schedule, then the occupancy: US-INTAKE-05 AC11; the approved screen's order differs, logged).
 *   Each shows its registered wording and one-line reason (rule 6) from the catalogue, with its icon
 *   in a left gutter, so the title, the helper line, the options and "Skip for now" share one left
 *   edge (onboarding-spec 3, step 5).
 * - Every option is a real radio input inside its card (prompt 3 section 11). Nothing is preselected
 *   except what the API serves as chosen: the owner's stored answer, a found fact (building type,
 *   with its Likely, Possible or Please check badge: rule 3, never Suggested), or a visible
 *   suggestion with its Suggested reason (none until D-11: R-006 "Until decided").
 * - **The value sits on its tile** (2.8 "Prominence": "A badge sits on the same line or tile as its
 *   figure"; DR-2): the tile the served value names carries it in the kit's ChoiceCard status slot,
 *   through the Value component's compact layout (its text and badge together, its source line
 *   below; on a tile or pill the kit places the slot under the title, too narrow beside the icon and
 *   radio); it is not repeated in a box under the tiles. A stored answer shows while the owner has not
 *   changed it on this page; a found fact stays on its tile while the owner picks another, so they see
 *   what their choice corrects. A value no tile names (two values in conflict, rule 4: no value is
 *   active, so no tile is chosen) shows once under the tiles, with its "Two values" badge, its sources
 *   and its line; picking a tile corrects it. The served one-tap confirmation ("Yes, it's a hotel"; section 4; rule 5) shows under the tiles while the found value
 *   is the one chosen. Tapping another tile is the correction: Continue sends it with the candidates
 *   the page showed, which it rejects (rule 4; US-INTAKE-07 AC6). The evidence excerpts of a found
 *   type open from "View all extracted data" (UD-45), where the fact is listed with them.
 * - "Skip for now" under each unanswered question with no answer or visible suggestion on screen
 *   (rule 7; G7-3), "You can provide this later." once after a skip. Continue skips what is left
 *   unanswered and never confirms a fact (rule 3). Back and Continue are never disabled (rule 7).
 * - While the answers load, the step keeps its frame and says so in one line (./LoadingFrame.tsx).
 * - No follow-up input, no "Other" text field and no note field (R-007, R-011 "Until decided";
 *   onboarding Q11).
 */
import { ChoiceCard, ChoiceGroup, Button, SkipForNow, StatusLine, Value } from '@sovitech/ui';
import type { DisplayObject, Question } from '@sovitech/view-model/browser';
import { useCallback, useState, type ReactNode } from 'react';
import { ApiError, isSignedOut } from '../../api/client';
import { copy } from '../../copy';
import { LoadFailed } from '../../pages/PageState';
import { useFieldWrites } from '../../review/field-writes';
import { useOnSignedOut } from '../../session/SessionProvider';
import { StepHeading, WizardLayout } from '../../shell/WizardLayout';
import { optionLabel } from '../../wizard/InlineEditor';
import { WizardFooter } from '../../wizard/WizardFooter';
import { WizardStepper } from '../../wizard/WizardStepper';
import { EMPTY_CONTINUE, useWizard } from '../../wizard/WizardProvider';
import { useInFlight } from '../../wizard/use-in-flight';
import { useStepView, type Displays } from '../../wizard/use-step-view';
import { confirmActionOf, servedChoice, shownChoice, singleChoiceContinue } from './continue-body';
import { OPTION_ICONS, QUESTION_ICONS } from './icons';
import { LoadingLine, OptionOutlines, QUESTION_GRID, QuestionFrame, QuestionGutter } from './LoadingFrame';

/** A registered question's wording and one-line reason (rule 6), from the catalogue. */
export const QUESTION_COPY: Readonly<Record<string, { readonly title: string; readonly helper: string } | undefined>> = copy.questions;

/** The refusals Continue may answer (routes.ts `steps.continue`), as the owner reads them. */
export function continueRefusalMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : '';
  if (code === 'answer_invalid') return copy.edit.answerInvalid;
  if (code === 'owner_only') return copy.edit.ownerOnly;
  return copy.nav.continueFailed;
}

interface SingleQuestionProps {
  readonly question: Question;
  readonly displays: Displays;
  /** The owner's pick on this page, if any. */
  readonly picked: string | undefined;
  readonly onPick: (option: string) => void;
  readonly onSkip: (questionId: string) => void;
  readonly onConfirm: (candidateId: string) => void;
  /** A write of the page (a skip, a Yes) is on its way: its controls show aria-busy and take no second press. */
  readonly busy: boolean;
}

/** What the page shows as the question's value: a found fact always; the owner's stored answer while it is still the one chosen. */
function shownValue(question: Question, display: DisplayObject | undefined, unchanged: boolean): DisplayObject | undefined {
  if (display === undefined) return undefined;
  if (question.state === 'found') return display;
  if (question.state === 'answered' && unchanged) return display;
  return undefined;
}

function SingleQuestion({ question, displays, picked, onPick, onSkip, onConfirm, busy }: SingleQuestionProps) {
  const fieldKey = question.fields[0]?.fieldKey ?? '';
  const served = servedChoice(question);
  const chosen = shownChoice(question, picked);
  const unchanged = chosen === served;
  const found = question.found === null ? undefined : displays.get(question.found);
  const value = shownValue(question, found, unchanged);
  // A shown value that no tile names (two values in conflict: no value is active, so no tile is chosen) sits under
  // the tiles, once, with its "Two values" badge, its sources and rule 4's line; picking a tile is the owner's
  // correction (rule 4, "A correction is a resolution").
  const untiled = value !== undefined && (served === undefined || !question.options.some((option) => option.key === served)) ? value : undefined;
  // The confirmation stands only while the found value is the one chosen: tapping another tile is the correction.
  const confirm = unchanged ? confirmActionOf(found) : undefined;
  const suggestion = question.options.find((option) => option.key === chosen && option.selected && option.suggestion !== null)?.suggestion ?? null;
  const tiles = question.options.length > 4;
  const text = QUESTION_COPY[question.questionId];
  const footer: ReactNode = (
    <>
      {untiled === undefined ? null : (
        <div data-untiled-value="">
          <Value display={untiled} label={null} />
        </div>
      )}
      {confirm === undefined ? null : (
        <div>
          <Button variant="accent" aria-busy={busy} onClick={() => onConfirm(confirm.candidateId)}>
            {confirm.wording.text}
          </Button>
        </div>
      )}
      {suggestion === null ? null : <StatusLine line={suggestion.reason} />}
      {question.state === 'skipped' && picked !== undefined ? null : (
        <SkipForNow
          question={{
            questionId: question.questionId,
            state: question.state,
            skip: question.skip,
            afterSkip: question.afterSkip,
            options: question.options.map((option) => ({ selected: chosen === option.key, suggestion: option.suggestion })),
          }}
          label={copy.actions.skip}
          onSkip={(action) => onSkip(action.questionId)}
          busy={busy}
        />
      )}
    </>
  );
  return (
    <div className={QUESTION_GRID}>
      <QuestionGutter icon={QUESTION_ICONS[question.questionId]} />
      <ChoiceGroup legend={text?.title ?? question.questionId} {...(text === undefined || text.helper === '' ? {} : { hint: text.helper })} columns={tiles ? 6 : 4} footer={footer}>
        {question.options.map((option) => {
          const icon = OPTION_ICONS[fieldKey]?.[option.key];
          // The served value sits on the tile it names, on the tile's top row (2.8 "Prominence").
          const status = value !== undefined && option.key === served ? <Value display={value} label={null} layout="compact" /> : undefined;
          return (
            <ChoiceCard
              key={option.key}
              type="radio"
              name={`step5-${question.questionId}`}
              value={option.key}
              checked={chosen === option.key}
              onChange={(checked) => {
                if (checked) onPick(option.key);
              }}
              title={optionLabel(fieldKey, option.key)}
              {...(icon === undefined ? {} : { icon })}
              shape={tiles ? 'tile' : 'pill'}
              {...(status === undefined ? {} : { status })}
            />
          );
        })}
      </ChoiceGroup>
    </div>
  );
}

/** The step 5 questions in their registered impactRank order, for the loading frame (the served order once loaded). */
const FRAME_QUESTIONS: ReadonlyArray<{ readonly questionId: string; readonly fieldKey: string }> = [
  { questionId: 'q.building.type', fieldKey: 'building.type' },
  { questionId: 'q.project.operatingSchedule', fieldKey: 'project.operatingSchedule' },
  { questionId: 'q.project.occupancy', fieldKey: 'project.occupancy' },
];

const OPTION_COPY: Readonly<Record<string, Readonly<Record<string, string>> | undefined>> = copy.options;

/** Step 5 while its answers load: the questions' titles and helper lines, and one empty outline per option. */
function Step5Frame() {
  return (
    <>
      <LoadingLine />
      {FRAME_QUESTIONS.map(({ questionId, fieldKey }) => {
        const count = Object.keys(OPTION_COPY[fieldKey] ?? {}).length;
        const tiles = count > 4;
        const text = QUESTION_COPY[questionId];
        return (
          <QuestionFrame key={questionId} title={text?.title ?? questionId} {...(text === undefined ? {} : { helper: text.helper })} icon={QUESTION_ICONS[questionId]}>
            <OptionOutlines count={count} columns={tiles ? 6 : 4} shape={tiles ? 'tile' : 'pill'} />
          </QuestionFrame>
        );
      })}
    </>
  );
}

export function Step5() {
  const { projectId, back, continueFrom } = useWizard();
  const onSignedOut = useOnSignedOut();
  const { state, view, displays, asOf, reload } = useStepView(5);
  const [picked, setPicked] = useState<Readonly<Record<string, string | undefined>>>({});
  // One Continue at a time; the skip and Yes writes are one at a time through useFieldWrites (a double press sends one request).
  const continuing = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);
  const refresh = useCallback(() => reload({ quiet: true }), [reload]);
  const writes = useFieldWrites(projectId, refresh);

  const forget = (questionId: string) => setPicked((previous) => ({ ...previous, [questionId]: undefined }));

  const onContinue = () => {
    if (!continuing.claim()) return;
    setFailure(null);
    const body = view === undefined ? EMPTY_CONTINUE : singleChoiceContinue(view.questions, picked, displays);
    continueFrom(5, asOf, body).catch((error: unknown) => {
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
      stepper={<WizardStepper step={5} />}
      footer={<WizardFooter onBack={() => back(5, asOf)} primaryLabel={copy.nav.continue} onPrimary={onContinue} busy={continuing.busy} error={failure ?? writes.error} />}
    >
      <section aria-labelledby="step-title" className="flex flex-col gap-12">
        <StepHeading title={copy.step5.title} subtitle={copy.step5.subtitle} />
        {state.status === 'failed' && view === undefined ? <LoadFailed onRetry={() => void reload()} /> : null}
        {state.status === 'loading' ? (
          <div className="mx-auto flex w-full max-w-[904px] flex-col gap-14">
            <Step5Frame />
          </div>
        ) : null}
        {view === undefined ? null : (
          <div className="mx-auto flex w-full max-w-[904px] flex-col gap-14">
            {view.questions.map((question) => (
              <SingleQuestion
                key={question.questionId}
                question={question}
                displays={displays}
                picked={picked[question.questionId]}
                onPick={(option) => setPicked((previous) => ({ ...previous, [question.questionId]: option }))}
                onSkip={(questionId) => {
                  void writes.skip(questionId, 5).then((stored) => {
                    if (stored) forget(questionId);
                  });
                }}
                onConfirm={(candidateId) => {
                  void writes.confirm(candidateId).then((stored) => {
                    if (stored) forget(question.questionId);
                  });
                }}
                busy={writes.busy}
              />
            ))}
          </div>
        )}
      </section>
    </WizardLayout>
  );
}
