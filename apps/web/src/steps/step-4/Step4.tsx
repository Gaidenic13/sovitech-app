/**
 * OB-4 Step 4 Systems (PRD R-051; US-SCOPE-01 to US-SCOPE-03; guardrails section 5, step 4 rows
 * §5-4a to §5-4c, rules 3, 7, 11 and 12).
 *
 * - The eight catalogue systems as the approved 4 × 2 grid of cards, each a real checkbox input
 *   (prompt 3 section 11). Each card shows its detection through the Value component with the one
 *   badge the API served: From document, Likely or Possible (an inference is a possibility, never a
 *   fact: rule 3), Please check or SOVITECH will check, From design drawings, Reading documents…, Not
 *   found in documents with "Not found in the analysed documents (<coverage>). You can still include
 *   it." only over what was searched, or Unknown (US-SCOPE-01 AC1 to AC8). No card shows "Detected"
 *   or "Optional" (§5-4a). While no detection field is registered every card reads Unknown
 *   (P-3-DETECTION-FIELDS).
 * - The owner's decision is the tick. A visible preselection shows the decision's served Suggested
 *   badge and its one-line reason; left in place, Continue reports it and the server writes it as the
 *   owner's answer (rule 3; G3-4; US-SCOPE-02 AC1, AC5). A stored decision shows Provided by you. A
 *   card the owner changed on this page shows only its tick until Continue stores it.
 * - Where they show (DR-2): the card's top row, the place the approved screen gives a badge, holds
 *   the kit's status slot: "In your documents" with the detection's Value, and the decision's Value
 *   (a stored choice or a visible suggestion), each in the `compact` layout (text and badge on one
 *   line, any served line under it), each bound to its value id. No "Your choice" row: the decision
 *   shows once, with its badge.
 * - Fire Safety: never preselected and never Suggested, whatever the page is served; its card reads
 *   "monitoring only (read-only); fire logic and fire-mode interlocks remain in the fire system"
 *   (rule 11; §5-4b; US-SCOPE-03 AC1). Access Control and Elevators are not preselected either (R-051
 *   until D-64). Nothing here claims compliance or offers a control of a life-safety system.
 * - "Skip for now" under the grid only while no card is ticked or Suggested (G7-3; US-SCOPE-02 AC3,
 *   AC4), then "You can provide this later." once. Continue is never blocked; it sends the whole
 *   question (./systems.ts `continueBody`), so nothing ticked is recorded as skipped, never as a
 *   decision against every system (rule 7).
 * - One request per press (../../wizard/use-in-flight.ts; the final verification of phase 3, new
 *   problem 1: a double-click on "Skip for now" recorded the eight skips twice): while the skip is on
 *   its way, and until the step has read its view again after it, the link shows aria-busy and a
 *   further press sends nothing; the same for Continue while its request is on its way. Neither is
 *   ever disabled, and each takes presses again once its answer is in (rule 7).
 * - The subtitle "We've detected the following systems in your documents." shows only when a
 *   document names a system (US-SCOPE-01 AC10). The served `subtitle` says which sentence is true,
 *   and the page shows the catalogue's sentence for it (`STEP4_SUBTITLES`). For a project with no
 *   document the sentence is "No documents were uploaded, so no system was read from them." (DR-25),
 *   never a line about what its documents say: the API serves the `no_documents` key there (only the
 *   API knows whether the project holds a document; ADR 0036 decision 11).
 * - While the view loads, the frame stays: the title, the instruction, eight card outlines in the
 *   grid, the banner, and one "Loading your answers" line, so the footer does not jump (DR-12).
 * - Late findings add a dot and one quiet notice and change no tick (rule 7; US-SCOPE-01 AC11): the
 *   page's ticks change only by the owner's hand. While a detection is still being read, the view is
 *   read again every few seconds; the owner's ticks on this page are kept.
 */
import { ArrowUpDown, Cctv, DoorClosedLocked, Droplet, Fan, Flame, Lightbulb, Zap, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Banner, ChoiceCard, SkipForNow, Value } from '@sovitech/ui';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { ApiError, isSignedOut, request } from '../../api/client';
import { copy } from '../../copy';
import { LoadFailed, Loading } from '../../pages/PageState';
import { useOnSignedOut } from '../../session/SessionProvider';
import { StepHeading, WizardLayout } from '../../shell/WizardLayout';
import { WizardFooter } from '../../wizard/WizardFooter';
import { WizardStepper } from '../../wizard/WizardStepper';
import { continueRefusalMessage, useWizard } from '../../wizard/WizardProvider';
import { useInFlight } from '../../wizard/use-in-flight';
import { useStepView, type Displays } from '../../wizard/use-step-view';
import { continueBody, decisionFieldOf, isOwnerDecision, mayPreselect, suggestionShown, tickOf, type Step4View, type SystemCard, type Ticks } from './systems';

/** How often step 4 reads its view again while a detection is still being read. */
export const STEP4_READING_POLL_MS = 5_000;

/** The approved icons, redrawn from Lucide at the kit's sizes (onboarding-spec 2.5; 6.2 "Icon glitches"). */
const SYSTEM_ICONS: Readonly<Record<string, LucideIcon>> = {
  hvac: Fan,
  lighting: Lightbulb,
  energy: Zap,
  access_control: DoorClosedLocked,
  fire_safety: Flame,
  water: Droplet,
  elevators: ArrowUpDown,
  cctv: Cctv,
};

const SYSTEM_COPY: Readonly<Record<string, { readonly title: string; readonly description: string } | undefined>> = copy.systems;

/**
 * Step 4's subtitle for each key the API may serve (US-SCOPE-01 AC10; DR-25): every key of the
 * contract's `Step4ViewSchema.subtitle`, and `no_documents`, the key the API serves for a project
 * with no document once the contract carries it.
 */
export const STEP4_SUBTITLES: Readonly<Record<Step4View['subtitle'], string>> = copy.step4.subtitle;

interface CardProps {
  readonly card: SystemCard;
  readonly detection: DisplayObject | undefined;
  readonly decision: DisplayObject | undefined;
  readonly ticks: Ticks;
  readonly onTick: (fieldKey: string, ticked: boolean) => void;
}

function SystemChoice({ card, detection, decision, ticks, onTick }: CardProps) {
  const field = decisionFieldOf(decision);
  const words = SYSTEM_COPY[card.systemId];
  const touched = field !== undefined && ticks.has(field.fieldKey);
  // The decision's own display shows once there is something to say (Provided by you, or a visible
  // Suggested with its reason), and not on a card the owner changed on this page (its tick is the truth).
  const showDecision =
    decision !== undefined && !touched && (isOwnerDecision(decision) || (mayPreselect(card) && suggestionShown(card, decision, ticks)));
  const icon = SYSTEM_ICONS[card.systemId];
  return (
    <ChoiceCard
      type="checkbox"
      name="systems-in-scope"
      value={field?.fieldKey ?? card.systemId}
      checked={tickOf(card, decision, ticks)}
      onChange={(checked) => {
        if (field !== undefined) onTick(field.fieldKey, checked);
      }}
      title={words?.title ?? card.systemId}
      {...(words === undefined ? {} : { description: words.description })}
      {...(icon === undefined ? {} : { icon })}
      status={
        detection === undefined && !showDecision ? undefined : (
          <span className="flex min-w-0 flex-col gap-1.5">
            {detection === undefined ? null : <Value display={detection} label={copy.step4.detection} layout="compact" />}
            {showDecision ? <Value display={decision} label={null} layout="compact" /> : null}
          </span>
        )
      }
    />
  );
}

function Systems({ view, displays, ticks, onTick, onSkip, skipping, skipError }: { readonly view: Step4View; readonly displays: Displays; readonly ticks: Ticks; readonly onTick: (fieldKey: string, ticked: boolean) => void; readonly onSkip: () => void; readonly skipping: boolean; readonly skipError: string | null }) {
  const options = view.systems.map((card) => {
    const decision = displays.get(card.decision);
    return { selected: tickOf(card, decision, ticks), suggestion: suggestionShown(card, decision, ticks) ? card.suggestion : null };
  });
  const question = copy.questions['q.project.systemsInScope'];
  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-8">
      <fieldset aria-describedby="step4-instruction">
        <legend className="sr-only">{question.title}</legend>
        <div className="grid grid-cols-4 gap-5">
          {view.systems.map((card) => (
            <SystemChoice
              key={card.systemId}
              card={card}
              detection={displays.get(card.detection)}
              decision={displays.get(card.decision)}
              ticks={ticks}
              onTick={onTick}
            />
          ))}
        </div>
        <SkipForNow
          question={{ questionId: view.question.questionId, state: view.question.state, skip: view.question.skip, afterSkip: view.question.afterSkip, options }}
          label={copy.actions.skip}
          onSkip={onSkip}
          busy={skipping}
        />
        {skipError === null ? null : (
          <p role="alert" className="mt-2 text-[13px] text-(--sov-text-primary)">
            {skipError}
          </p>
        )}
      </fieldset>
      <Banner>{copy.step4.banner}</Banner>
    </div>
  );
}

/** Step 4 while its view loads (DR-12): the grid's eight card outlines, the banner and one line; no card, tick or badge until the view answers. */
function LoadingGrid() {
  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-8">
      <Loading label={copy.step8.loading} align="start" />
      <div aria-hidden="true" className="grid grid-cols-4 gap-5">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="min-h-[168px] rounded-(--sov-radius-surface) border border-(--sov-border)" />
        ))}
      </div>
      <Banner>{copy.step4.banner}</Banner>
    </div>
  );
}

export function Step4() {
  const { projectId, back, continueFrom } = useWizard();
  const onSignedOut = useOnSignedOut();
  const { state, view, displays, asOf, reload } = useStepView(4);
  const [ticks, setTicks] = useState<Ticks>(new Map());
  const continuing = useInFlight();
  const skipping = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);
  const [skipError, setSkipError] = useState<string | null>(null);

  // While a detection is being read, the cards' badges fill in place; the owner's ticks stay.
  const reading = view?.systems.some((card) => displays.get(card.detection)?.missing === 'reading_documents') ?? false;
  useEffect(() => {
    if (!reading) return;
    const timer = window.setInterval(() => void reload({ quiet: true }), STEP4_READING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [reading, reload]);

  const onTick = (fieldKey: string, ticked: boolean) =>
    setTicks((previous) => {
      const next = new Map(previous);
      next.set(fieldKey, ticked);
      return next;
    });

  // One skip per press: the link stays busy until the answer is in and the view is read again after it.
  const onSkip = () => {
    if (view === undefined) return;
    const questionId = view.question.questionId;
    void skipping.run(async () => {
      setSkipError(null);
      try {
        await request('fields.skip', { params: { projectId }, body: { questionId, step: 4 } });
      } catch (refusal) {
        if (isSignedOut(refusal)) {
          onSignedOut();
          return;
        }
        // Answered meanwhile (409 question_answered): the page reads its view again, which shows the answer.
        if (refusal instanceof ApiError && refusal.code === 'question_answered') await reload({ quiet: true });
        else setSkipError(copy.step4.skipFailed);
        return;
      }
      await reload({ quiet: true });
    });
  };

  const onContinue = () => {
    if (!continuing.claim()) return;
    setFailure(null);
    const decisions = new Map<string, DisplayObject>();
    for (const card of view?.systems ?? []) {
      const decision = displays.get(card.decision);
      if (decision !== undefined) decisions.set(card.decision, decision);
    }
    const body =
      view === undefined
        ? { answers: [], multi: [], visibleSuggestions: [], shown: { questions: [], confirmations: [] } }
        : continueBody(view, decisions, ticks);
    continueFrom(4, asOf, body).catch((error: unknown) => {
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
      stepper={<WizardStepper step={4} />}
      footer={<WizardFooter onBack={() => back(4, asOf)} primaryLabel={copy.nav.continue} onPrimary={onContinue} busy={continuing.busy} error={failure} />}
    >
      <section aria-labelledby="step-title" className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <StepHeading title={copy.step4.title} {...(view === undefined ? {} : { subtitle: STEP4_SUBTITLES[view.subtitle] })} />
          <p id="step4-instruction" className="text-center text-[15px] text-(--sov-text-tertiary)">
            {copy.step4.instruction}
          </p>
        </div>
        {view !== undefined ? (
          <Systems view={view} displays={displays} ticks={ticks} onTick={onTick} onSkip={onSkip} skipping={skipping.busy} skipError={skipError} />
        ) : state.status === 'failed' ? (
          <LoadFailed onRetry={() => void reload()} />
        ) : (
          <LoadingGrid />
        )}
      </section>
    </WizardLayout>
  );
}
