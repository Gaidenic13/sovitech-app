/**
 * A stored version of the preliminary proposal (`/projects/:projectId/proposals/:snapshotId`; UD-06 read as generated,
 * US-PROPOSAL-11 AC3; the contract's `proposals.view`; docs/adr/0048, 0049), and the screen the landing
 * (`/projects/:projectId/proposal`, ./ProposalPage.tsx) shows for the latest version: the same component, so one
 * version reads the same wherever it is opened (G2-7).
 *
 * - **The page:** the title "Preliminary proposal" (US-PROPOSAL-04 AC1), "Download PDF" (./DownloadProposal.tsx), the
 *   stored proposal (./StoredProposal.tsx), and "Back to review" at its foot (phase 3's control; R-012 "Until
 *   decided": the way back to Generate runs through step 8, and no menu holds it).
 * - **States:** loading (the title and one polite line, no figure); failed (what could not be loaded, "Try again",
 *   "Back to review": no answer is lost); a snapshot that is not this project's reads as not in this project, inside
 *   the frame, from the API's 404 (rule 13), with the way to the latest. An earlier version says so and links to the
 *   latest (in the stored proposal).
 * - Every "Add <field>" opens step 8 with that field named, where its inline ask is served again (R-012; G7-11).
 * - The page takes the focus to its main region when it opens (WCAG 2.4.3); the demo line is the frame's footer
 *   (rule 10; GS-1).
 */
import { Button, PageHeader } from '@sovitech/ui';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { UUID_PATTERN } from '@sovitech/view-model/browser';
import { ApiError, request } from '../api/client';
import { useLoad } from '../api/use-load';
import { copy } from '../copy';
import { LoadFailed, Loading } from '../pages/PageState';
import { useRenderReady } from '../shell/render-ready';
import type { AddFieldState } from '../steps/step-8/Step8';
import { stepPath, useWizard } from '../wizard/WizardProvider';
import { indexDisplays } from '../wizard/use-step-view';
import { DownloadProposal } from './DownloadProposal';
import { StoredProposal, landingPath } from './StoredProposal';

/** Opens step 8 with a field named, so its inline ask is served again and focused (R-012 "Until decided"; G7-11). */
export function useAddField(): (fieldKey: string) => void {
  const { projectId } = useWizard();
  const navigate = useNavigate();
  return (fieldKey: string) => {
    const state: AddFieldState = { add: fieldKey };
    void navigate(stepPath(projectId, 8), { state });
  };
}

/** "Back to review" at the foot of the proposal's pages: a 40px secondary button, a workspace control (DR-7). */
export function BackToReview({ onBack }: { readonly onBack?: () => void }) {
  const { goToStep } = useWizard();
  return (
    <div className="border-t border-(--sov-border) pt-6">
      <Button
        variant="secondary"
        icon={ArrowLeft}
        onClick={() => {
          onBack?.();
          goToStep(8);
        }}
      >
        {copy.nav.backToReview}
      </Button>
    </div>
  );
}

/** One stored version: loaded from `proposals.view`, with its title, Download PDF, its sections and its states. */
export function StoredProposalScreen({ snapshotId }: { readonly snapshotId: string }) {
  const { projectId, publishEnvelope } = useWizard();
  const onAdd = useAddField();
  const { state, reload } = useLoad((signal) => request('proposals.view', { params: { projectId, snapshotId }, signal }), [projectId, snapshotId]);
  const data = state.status === 'loading' ? undefined : state.data;

  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);

  useRenderReady(state.status !== 'loading');
  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  const notFound = state.status === 'failed' && data === undefined && state.error instanceof ApiError && (state.error.status === 404 || state.error.status === 400);

  return (
    <div className="flex flex-col gap-8" data-proposal-page="" data-proposal-snapshot={snapshotId}>
      {/* The controls at the title's top (DR-16): the title stays where it is while loading, stored or failing to download. */}
      <PageHeader title={copy.proposal.title} actionsAlign="start" {...(data === undefined ? {} : { actions: <DownloadProposal projectId={projectId} snapshotId={snapshotId} /> })} />
      {state.status === 'loading' ? <Loading label={copy.proposal.loading} align="start" /> : null}
      {notFound ? <VersionNotFound /> : null}
      {state.status === 'failed' && data === undefined && !notFound ? <LoadFailed message={copy.proposal.loadFailed} onRetry={() => void reload()} /> : null}
      {data === undefined ? null : <StoredProposal projectId={projectId} view={data.view} displays={displays} onAdd={onAdd} />}
      <BackToReview />
    </div>
  );
}

/** A version this project does not hold (another project's, or none: rule 13 reads both as not found), inside the frame. */
function VersionNotFound() {
  const { projectId } = useWizard();
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="sov-text-body text-(--sov-text-primary)">{copy.proposal.versionNotFound}</p>
      <Link to={landingPath(projectId)} className="sov-button" data-variant="link" data-size="default" data-copy-kind="action-label">
        {copy.proposal.openLatest}
      </Link>
    </div>
  );
}

/** The route `proposals/:snapshotId`: a stored version, or "not in this project" for an id that names none. */
export function StoredProposalPage() {
  const { snapshotId } = useParams();

  // The page takes the focus to its main region, so the keyboard and a screen reader start here (WCAG 2.4.3).
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [snapshotId]);

  if (snapshotId === undefined || !UUID_PATTERN.test(snapshotId)) return <InvalidVersion />;
  return <StoredProposalScreen key={snapshotId} snapshotId={snapshotId} />;
}

/** A path whose version id is no id at all: the same "not in this project" state, with no request sent. */
function InvalidVersion() {
  useRenderReady(true);
  return (
    <div className="flex flex-col gap-8" data-proposal-page="">
      <PageHeader title={copy.proposal.title} />
      <VersionNotFound />
      <BackToReview />
    </div>
  );
}
