/**
 * The proposal's landing (`/projects/:projectId/proposal`; PRD R-109, R-111, R-116 "Until decided"; US-PROPOSAL-02,
 * US-PROPOSAL-04, US-PROPOSAL-05 AC1; UD-01's content, UD-06, UD-07, UD-47; docs/adr/0048 decisions 1 and 9). It sits
 * in the workspace frame (ADR 0043 decision 3), is the sidebar's "Proposal" and is where Generate leads. No separate
 * Overview page is built (R-116): the stored proposal is the landing, with what Overview would show at its head.
 *
 * What it shows, from the page session's generation state (./generation.ts) and what is stored:
 * - **Generating** (UD-07; US-PROPOSAL-02 AC1, AC2, AC5): while the press's `proposals.generate` is on its way: the
 *   title "Preparing your preliminary proposal", an indeterminate progress bar with no number, no figure, no partial
 *   total and no count, and step 8's "Still reading <n> files…" line when the press came while documents were being
 *   read (rule 7; bound). No dialog; a late finding meanwhile changes nothing here (rule 7).
 * - **Failed** (UD-47; US-PROPOSAL-02 AC4): the proposal could not be generated, every answer and upload is kept (the
 *   POST writes none), "Try again" (one new POST per press) and "Back to review" (step 8, where Generate is).
 * - **The latest stored proposal** (UD-06, ./StoredProposalPage.tsx's screen), read again after each generation of
 *   this page session; it opens no wizard step and sends no POST, however it is reached or reloaded (a reload forgets
 *   the generation state and shows what is stored).
 * - **No proposal stored yet** (prompt 3 5.2 "Generate before phase 5", kept for a project that never generated):
 *   phase 3's preview (`proposal.preview`): that no preliminary proposal has been generated yet, each output with what
 *   it still needs (bound; an owner input's "Add" opens step 8 at its inline ask, R-012), "Still reading" while
 *   analysis runs, and "Go to the review", where Generate is (never a dead end, rule 7).
 * - **Loading and load failure** of what is stored: the title and one polite line; what could not be loaded, "Try
 *   again" and "Back to review" (no answer is lost).
 *
 * The project list still opens a project at step 1: whether a project with a stored proposal opens here instead is
 * D-14 and D-02, the owner's to decide in this phase's report (nothing here decides it). The demo line is the frame's
 * footer on every state (rule 10; GS-1).
 */
import { Button, Icon, PageHeader, Progress, StatusLine } from '@sovitech/ui';
import { CircleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { request } from '../api/client';
import { useLoad } from '../api/use-load';
import { copy } from '../copy';
import { LoadFailed, Loading } from '../pages/PageState';
import { useOnSignedOut } from '../session/SessionProvider';
import { useRenderReady } from '../shell/render-ready';
import { OutputList } from '../steps/step-8/OutputList';
import { useWizard } from '../wizard/WizardProvider';
import { indexDisplays } from '../wizard/use-step-view';
import { dismissFailure, useGeneration } from './generation';
import { BackToReview, StoredProposalScreen, useAddField } from './StoredProposalPage';

/** UD-07: the press's POST is on its way. Its content is fixed copy and step 8's served line, so the screen is ready. */
function Generating({ stillReading }: { readonly stillReading: DisplayObject | null }) {
  useRenderReady(true);
  return (
    <div className="flex flex-col gap-8" data-proposal-page="" data-generating="">
      <div className="flex max-w-[760px] flex-col gap-6">
        <PageHeader title={copy.proposal.generating} subtitle={copy.proposal.generatingIntro} />
        <Progress label={copy.proposal.generating} labelDisplay="hidden" />
        {stillReading === null ? null : <StatusLine display={stillReading} />}
      </div>
    </div>
  );
}

/** UD-47: the POST was refused or never reached the API. */
function GenerationFailed({ onTryAgain }: { readonly onTryAgain: () => void }) {
  const { projectId } = useWizard();
  useRenderReady(true);
  return (
    <div className="flex flex-col gap-8" data-proposal-page="" data-generation-failed="">
      <PageHeader title={copy.proposal.title} />
      <div role="alert" className="flex max-w-[640px] flex-col items-start gap-5">
        <p className="flex items-start gap-2 text-[15px] leading-6 text-(--sov-text-primary)">
          <span className="mt-1 shrink-0">
            <Icon icon={CircleAlert} size="small" />
          </span>
          <span>{copy.proposal.generateFailed}</span>
        </p>
        <Button variant="primary" onClick={onTryAgain}>
          {copy.proposal.tryAgain}
        </Button>
      </div>
      {/* "Back to review" reads the failure as seen: the landing shows what is stored the next time it opens. */}
      <BackToReview onBack={() => dismissFailure(projectId)} />
    </div>
  );
}

/** No proposal stored yet: phase 3's preview of what each output still needs, and the way to Generate. */
function NotGenerated() {
  const { projectId, publishEnvelope, goToStep } = useWizard();
  const onAdd = useAddField();
  const { state, reload } = useLoad((signal) => request('proposal.preview', { params: { projectId }, signal }), [projectId]);
  const data = state.status === 'loading' ? undefined : state.data;
  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);
  useRenderReady(state.status !== 'loading');
  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  const stillReading = data === undefined || data.view.stillReading === null ? undefined : displays.get(data.view.stillReading);
  return (
    <div className="flex flex-col gap-8" data-proposal-page="" data-not-generated="">
      <div className="flex flex-col gap-4">
        <PageHeader
          title={copy.proposal.title}
          subtitle={copy.proposal.notGenerated}
          actions={
            <Button variant="primary" onClick={() => goToStep(8)}>
              {copy.proposal.notGeneratedAction}
            </Button>
          }
        />
        {stillReading === undefined ? null : <StatusLine display={stillReading} />}
      </div>
      {state.status === 'loading' ? <Loading label={copy.proposal.loading} align="start" /> : null}
      {state.status === 'failed' && data === undefined ? <LoadFailed message={copy.proposal.loadFailed} onRetry={() => void reload()} /> : null}
      {data === undefined ? null : (
        <section aria-labelledby="proposal-outputs" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 id="proposal-outputs" className="sov-heading-section">
              {copy.proposal.outputsHeading}
            </h2>
            <p className="sov-text-body">{copy.proposal.intro}</p>
          </div>
          <OutputList outputs={data.view.outputs} displays={displays} onAdd={onAdd} />
        </section>
      )}
    </div>
  );
}

/** What is stored: the latest version, or the preview while none is. Read again after each generation (`done`). */
function Latest({ done }: { readonly done: number }) {
  const { projectId, publishEnvelope } = useWizard();
  const { state, reload } = useLoad((signal) => request('proposals.list', { params: { projectId }, signal }), [projectId, done]);
  const data = state.status === 'loading' ? undefined : state.data;
  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);
  useRenderReady(state.status !== 'loading');

  const latest = data?.view.versions[0];
  if (data !== undefined && state.status !== 'loading') {
    if (latest === undefined) return <NotGenerated />;
    return <StoredProposalScreen key={latest.snapshotId} snapshotId={latest.snapshotId} />;
  }
  return (
    <div className="flex flex-col gap-8" data-proposal-page="">
      <PageHeader title={copy.proposal.title} />
      {state.status === 'failed' ? <LoadFailed message={copy.proposal.loadFailed} onRetry={() => void reload()} /> : <Loading label={copy.proposal.loading} align="start" />}
      <BackToReview />
    </div>
  );
}

export function ProposalPage() {
  const { projectId } = useWizard();
  const onSignedOut = useOnSignedOut();
  const { state: generation, tryAgain } = useGeneration(projectId, onSignedOut);

  // The page takes the focus to its main region when it opens, and again when a generation ends, so the keyboard and
  // a screen reader start at the result's title (WCAG 2.4.3, 4.1.3).
  const status = useRef(generation.status);
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (status.current === generation.status) return;
    status.current = generation.status;
    if (generation.status !== 'generating') document.getElementById('main')?.focus({ preventScroll: true });
  }, [generation.status]);

  if (generation.status === 'generating') return <Generating stillReading={generation.stillReading} />;
  if (generation.status === 'failed') return <GenerationFailed onTryAgain={tryAgain} />;
  return <Latest done={generation.done} />;
}
