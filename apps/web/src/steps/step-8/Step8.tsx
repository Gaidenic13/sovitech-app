/**
 * OB-8 Step 8 Review, with UD-35's states (US-INTAKE-15 to US-INTAKE-18; US-REVIEW-11, US-REVIEW-12,
 * US-REVIEW-13; US-INTAKE-19; PRD R-003, R-004, R-046, R-048; guardrails rules 4, 5, 7 and 10, 2.3,
 * section 5, step 8; prompt 3 5.2 "Generate before phase 5").
 *
 * The page, top to bottom and in tab order: the seven summary cards and the Proposal card
 * (./SummaryCards.tsx); "For you" and "SOVITECH will check" (../../review/), then "What your proposal
 * will show": the inline asks for missing first-estimate fields (./InlineAsk.tsx) and which outputs
 * will be ranges or "Not available yet", naming what each needs (./OutputList.tsx); the revision
 * notices; the approved banner; Back and "Generate Proposal".
 *
 * - **Generate is never disabled** (rule 7; US-INTAKE-16 AC5, US-INTAKE-18 AC4): whatever is open,
 *   loading, still being read or failed, it skips the inline asks left unanswered (rule 7: pressing
 *   Continue on an unanswered question skips it; "Generate without it" is the same press), sends the
 *   step's Continue and opens the proposal page, which shows the generating state (UD-07). Nothing
 *   is stored as a proposal before phase 5's engine (ADR 0039).
 * - **UD-35 states:** loading shows the card titles and no figure (AC1); a load failure keeps Back and
 *   Generate, shows no value it could not load, offers "Try again" and hides the "Everything ready?"
 *   banner, which would read as untrue there (AC3); incomplete data shows the asks and the list of
 *   unavailable outputs (AC4); "Still reading <n> files…" shows, bound, while analysis runs, and the
 *   page reads its view again until it ends (AC2).
 * - **Late findings** (rule 7; G7-4): a notice that arrives while the owner is here reads the page
 *   again, so the findings join the lists in place; nothing opens a dialog or moves the owner, and an
 *   answer being typed in an inline ask is kept.
 * - **"Add <field>"** on an output, on a "For you" item, or arriving from the proposal page (PRD R-012
 *   "Until decided"; US-INTAKE-22 AC6): the field's inline ask is brought into view and focused. From
 *   the proposal page the step's view is read with the field named (./use-review-view.ts), so the ask
 *   Generate skipped is served again; a field with no ask served brings its card's Edit link into view
 *   instead, so the action always leads to a built page.
 * - **The Proposal card's stage** (rule 10's table: stage 1 "when first-estimate data is missing";
 *   rule 7's `first_estimate` row: "If it is still missing, the output falls back to a stage 1
 *   Indicative range where the registry allows one, or else 'Not available yet' with the missing item
 *   and an action to add it"; 2.8 "Status lines and stage labels"; the final verification of phase 3,
 *   new problem 3): the card names a stage label only while an investment figure at that stage can be
 *   produced, as served: the investment output that carries the served stage label is served as a
 *   range, or the API serves `proposal.stage` (non-null only while a figure can be produced). While
 *   that output is served "Not available yet", the card shows its served line instead, which names
 *   what is missing (the SOVITECH datasets, and every missing first-estimate input with its "Add
 *   <field>", the same action the outputs carry: the view-model's `outputAvailability` has the stage 2
 *   output wait for the whole first-estimate set), bound, and names no stage; with no stage served,
 *   the card names none. The web derives no stage of its own.
 * - **One request per press** (../../wizard/use-in-flight.ts): Generate, and "Generate without it"
 *   (the same press), while the skips and the Continue are on their way, and each inline ask's Save
 *   and each "For you" write while its own request is, ignore a further press and show aria-busy;
 *   none is ever disabled, and each takes presses again once its answer is in (rule 7).
 * - **A changed value under an inline ask** (rule 4; A-1): a Save refused because the field changed
 *   since the page showed it (409 `shown_value_changed`) reads the view again; when the view no
 *   longer serves that ask, the step says so where the asks are ("This value changed since the page
 *   showed it…", the catalogue's `edit.changed`, as step 3's inline editor says it), until the owner
 *   leaves the step or the ask is served again.
 * - A failure (Generate, an inline ask's refusal) says so beside the alert icon, as the kit's field
 *   errors do, never by colour alone.
 */
import { Banner, Button, Card, FieldError, NotAvailableYet, StatusLine } from '@sovitech/ui';
import { LATE_FINDINGS_POLL_MS, type DisplayObject, type Line, type StepView } from '@sovitech/view-model/browser';
import { ClipboardList } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { isSignedOut, request } from '../../api/client';
import { copy } from '../../copy';
import { LoadFailed } from '../../pages/PageState';
import { ForYouList } from '../../review/ForYouList';
import { RevisionNotices, SovitechWillCheck } from '../../review/SovitechWillCheck';
import { useOnSignedOut } from '../../session/SessionProvider';
import { StepHeading, WizardLayout } from '../../shell/WizardLayout';
import { WizardFooter } from '../../wizard/WizardFooter';
import { WizardStepper } from '../../wizard/WizardStepper';
import { EMPTY_CONTINUE, useWizard } from '../../wizard/WizardProvider';
import { useInFlight } from '../../wizard/use-in-flight';
import type { Displays } from '../../wizard/use-step-view';
import { QUESTION_COPY } from '../step-5/Step5';
import { InlineAsk } from './InlineAsk';
import { OutputList } from './OutputList';
import { SummaryCards } from './SummaryCards';
import { useReviewView } from './use-review-view';

/** What the proposal page passes when its "Add <field>" opens this step. */
export interface AddFieldState {
  readonly add: string;
}

function addFieldOf(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('add' in state)) return undefined;
  const add = (state as { add: unknown }).add;
  return typeof add === 'string' && add !== '' ? add : undefined;
}

type Step8View = Extract<StepView, { step: 8 }>;

/** The rule 10 stage a served stage label names: its stage-label line's id (`indicative_range`, `preliminary_investment_estimate`). */
function stageIdOf(display: DisplayObject | undefined): string | undefined {
  return display?.lines?.find((line) => line.kind === 'stage_label')?.id;
}

/**
 * What the Proposal card says about its investment figure, from what the API serves (rules 7 and 10;
 * see the header): the stage label while a figure at that stage can be produced; else the served
 * "Not available yet" line of the investment output that carries that stage; else nothing.
 */
export type ProposalStage =
  | { readonly kind: 'stage'; readonly display: DisplayObject }
  | { readonly kind: 'stage_line'; readonly line: Line }
  | { readonly kind: 'not_available'; readonly display: DisplayObject }
  | { readonly kind: 'none' };

export function proposalStageOf(proposal: Step8View['proposal'], displays: Displays): ProposalStage {
  const label = proposal.stageLabel === undefined ? undefined : displays.get(proposal.stageLabel);
  const stageId = stageIdOf(label) ?? proposal.stage?.id;
  const output = stageId === undefined ? undefined : proposal.outputs.find((entry) => entry.label !== undefined && stageIdOf(displays.get(entry.label)) === stageId);
  // The API says a figure can be produced: `proposal.stage` is non-null only then, or the stage's output is a range.
  if (proposal.stage !== null || output?.availability === 'range') {
    if (label !== undefined) return { kind: 'stage', display: label };
    if (proposal.stage !== null) return { kind: 'stage_line', line: proposal.stage };
  }
  const line = output === undefined ? undefined : displays.get(output.line);
  if (output?.availability === 'not_available_yet' && line !== undefined && (line.missing === 'not_available_yet' || line.badge?.id === 'not_available_yet')) {
    return { kind: 'not_available', display: line };
  }
  return { kind: 'none' };
}

/** Brings an element into view and gives it the focus (no scrolling animation: reduced motion and G2-8). */
function focusElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  element.scrollIntoView?.({ block: 'center' });
  element.focus({ preventScroll: true });
  return true;
}

export function Step8() {
  const { projectId, back, continueFrom, goToStep, notice } = useWizard();
  const location = useLocation();
  const onSignedOut = useOnSignedOut();
  const addField = addFieldOf(location.state);
  const { state, view, displays, asOf, reload } = useReviewView(addField);
  const generating = useInFlight();
  const [failure, setFailure] = useState<string | null>(null);
  const failureId = useId();
  const changedId = useId();
  const page = useRef<HTMLDivElement>(null);
  const refresh = useCallback(() => void reload({ quiet: true }), [reload]);
  /** Reads the view again after a write; the write's control stays busy until it is read. */
  const reread = useCallback(() => reload({ quiet: true }), [reload]);
  /** The inline asks whose Save was refused because the field changed since the page showed it. */
  const [changedAsks, setChangedAsks] = useState<ReadonlySet<string>>(new Set());
  const onValueChanged = useCallback((questionId: string) => setChangedAsks((previous) => (previous.has(questionId) ? previous : new Set([...previous, questionId]))), []);

  // A late finding while the owner is on this step: the lists read their state again, in place.
  useEffect(() => {
    if (notice !== null) refresh();
  }, [notice, refresh]);

  // While documents are still being read, the page reads its view again until they finish (rule 7).
  const reading = view !== undefined && view.stillReading !== null;
  useEffect(() => {
    if (!reading) return;
    const timer = window.setInterval(refresh, LATE_FINDINGS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [reading, refresh]);

  /** Takes the owner to the way to add a field: its inline ask, else its card's Edit link. */
  const showField = useCallback(
    (fieldKey: string) => {
      const root = page.current;
      if (root === null || view === undefined) return;
      const ask = view.proposal.inlineAsks.find((entry) => entry.fields.some((field) => field.fieldKey === fieldKey));
      if (ask !== undefined) {
        const box = [...root.querySelectorAll('[data-inline-ask]')].find((element) => element.getAttribute('data-inline-ask') === ask.questionId);
        if (focusElement(box?.querySelector('input, select') ?? null)) return;
      }
      const card = view.cards.find((entry) => entry.rows.some((valueId) => displays.get(valueId)?.field?.fieldKey === fieldKey));
      if (card !== undefined) focusElement(root.querySelector(`[data-edit-card="${card.cardId}"]`));
    },
    [displays, view],
  );

  // "Add <field>" from the proposal page: once the view is here, show that field's way in.
  const shownAdd = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (addField === undefined || view === undefined || shownAdd.current === addField) return;
    shownAdd.current = addField;
    showField(addField);
  }, [addField, view, showField]);

  const generate = () => {
    // One Generate per press, "Generate without it" included: a press while it is on its way is ignored.
    if (!generating.claim()) return;
    setFailure(null);
    const asks = view?.proposal.inlineAsks ?? [];
    void (async () => {
      // The asks left unanswered are skipped once (rule 7); a skip that is refused never holds Generate back.
      for (const ask of asks) {
        try {
          await request('fields.skip', { params: { projectId }, body: { questionId: ask.questionId, step: 8 } });
        } catch (error) {
          if (isSignedOut(error)) {
            onSignedOut();
            return;
          }
        }
      }
      try {
        await continueFrom(8, asOf, EMPTY_CONTINUE);
      } catch (error) {
        generating.release();
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        setFailure(copy.step8.generateFailed);
      }
    })();
  };

  const stillReading = view === undefined || view.stillReading === null ? undefined : displays.get(view.stillReading);
  const labelOfAsk = (fieldKey: string): string | undefined => {
    const ask = view?.proposal.inlineAsks.find((entry) => entry.fields.length > 1 && entry.fields.some((field) => field.fieldKey === fieldKey));
    return ask === undefined ? undefined : QUESTION_COPY[ask.questionId]?.title;
  };

  // The investment figure's stage, as served (rules 7 and 10): its label while a figure at that stage can be
  // produced, else the served "Not available yet" line naming what is missing, bound to its value id.
  const proposalStage = view === undefined ? ({ kind: 'none' } as const) : proposalStageOf(view.proposal, displays);
  const stage =
    proposalStage.kind === 'stage' ? (
      <StatusLine display={proposalStage.display} />
    ) : proposalStage.kind === 'stage_line' ? (
      <StatusLine line={proposalStage.line} />
    ) : proposalStage.kind === 'not_available' ? (
      <NotAvailableYet display={proposalStage.display} onAdd={(action) => showField(action.field.fieldKey)} />
    ) : null;
  // A Save refused because the field changed, whose ask the view no longer serves: said once where the asks are.
  const changedGone = view !== undefined && [...changedAsks].some((questionId) => !view.proposal.inlineAsks.some((ask) => ask.questionId === questionId));

  const proposalCard = (
    <Card title={copy.step8.cards.proposal} headingLevel={2} icon={ClipboardList}>
      <div className="flex flex-col gap-3">
        <p className="text-[15px] leading-6 text-(--sov-text-tertiary)">{copy.step8.proposalBody}</p>
        {stage}
        {stillReading === undefined ? null : <StatusLine display={stillReading} />}
        {view === undefined ? null : (
          <div>
            <Button variant="link" onClick={() => focusElement(document.getElementById('step8-outputs'))}>
              {copy.step8.proposalLink}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );

  const failed = state.status === 'failed' && view === undefined;
  const footer = (
    <div className="flex flex-col gap-4">
      {failure === null ? null : (
        <div role="alert" className="flex justify-end">
          <FieldError id={failureId} message={failure} />
        </div>
      )}
      <WizardFooter onBack={() => back(8, asOf)} primaryLabel={copy.nav.generate} onPrimary={generate} busy={generating.busy} />
    </div>
  );

  return (
    <WizardLayout stepper={<WizardStepper step={8} />} footer={footer}>
      <section aria-labelledby="step-title" className="flex flex-col gap-12">
        <StepHeading title={copy.step8.title} subtitle={copy.step8.subtitle} />
        <div ref={page} className="mx-auto flex w-full max-w-[1240px] flex-col gap-14">
          {/* While the summary loads, each card says so; the status is announced once. */}
          {state.status === 'loading' ? (
            <p role="status" aria-live="polite" className="sr-only">
              {copy.step8.loading}
            </p>
          ) : null}
          {failed ? (
            <LoadFailed message={copy.step8.loadFailed} onRetry={() => void reload()} />
          ) : (
            <SummaryCards cards={view?.cards} displays={displays} onEdit={(card) => goToStep(card.editStep, { step: 8, asOf })} proposal={proposalCard} />
          )}
          {view === undefined ? null : (
            <>
              {/* "For you" first, in reading and tab order, beside what the proposal will show (the page's two lists side by side). */}
              <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-12">
                <div className="flex flex-col gap-12">
                  <ForYouList projectId={projectId} forYou={view.forYou} displays={displays} onChanged={reread} onAnswer={showField} labelFor={labelOfAsk} />
                  <SovitechWillCheck lines={view.sovitechWillCheck} displays={displays} />
                </div>
                <section id="step8-outputs" tabIndex={-1} aria-labelledby="step8-outputs-title" className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <h2 id="step8-outputs-title" className="sov-heading-section">
                      {copy.step8.outputsHeading}
                    </h2>
                    <p className="text-[15px] leading-6 text-(--sov-text-tertiary)">{copy.step8.outputsIntro}</p>
                  </div>
                  {changedGone ? (
                    <div role="alert" data-changed-ask="">
                      <FieldError id={changedId} message={copy.edit.changed} />
                    </div>
                  ) : null}
                  {view.proposal.inlineAsks.length === 0 ? null : (
                    <div className="flex flex-col gap-4">
                      {view.proposal.inlineAsks.map((ask) => (
                        <InlineAsk key={ask.questionId} projectId={projectId} ask={ask} displays={displays} onRefresh={reread} onValueChanged={onValueChanged} onGenerateWithout={generate} />
                      ))}
                    </div>
                  )}
                  <OutputList outputs={view.proposal.outputs} displays={displays} onAdd={showField} />
                </section>
              </div>
              <RevisionNotices notices={view.revisionNotices} displays={displays} />
            </>
          )}
          {failed ? null : <Banner title={copy.step8.bannerTitle}>{copy.step8.bannerBody}</Banner>}
        </div>
      </section>
    </WizardLayout>
  );
}
