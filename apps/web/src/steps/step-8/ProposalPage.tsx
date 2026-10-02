/**
 * The page "Generate Proposal" opens (`/projects/:projectId/proposal`): UD-07's generating state,
 * then phase 3's proposal page (prompt 3 5.2 "Generate before phase 5", read with PRD 10.4 "no
 * separate Overview is built": docs/adr/0039-wizard-navigation-saving-and-late-findings.md; steps.ts
 * `ProposalPreviewResponse`; US-INTAKE-16; PRD R-003, R-012; UD-47).
 *
 * - **Generating** (UD-07): while the page loads, its title and a progress bar with no number and no
 *   figure (rule 2; US-DOCS-03 AC1's reading of progress). Nothing is stored: no proposal snapshot
 *   exists before phase 5's engine, and none is invented.
 * - **The page:** that no investment figure is available yet, and each output with what it still
 *   needs, bound (rule 7, "'Not available yet' never appears alone"): the missing SOVITECH dataset by
 *   name with no owner action (prompt 3 5.3; D-14 interim), a missing owner input with its "Add
 *   <field>", which opens step 8 at that field's inline ask (R-012 "Until decided": never an empty page
 *   or a dead link). "Still reading <n> files…" while analysis runs (rule 7), bound.
 * - **Load failure** (UD-47): what could not be loaded, "Try again", and "Back to review"; no answer is
 *   lost (every answer was stored by its own request).
 * - The demo line comes with the project's layout, on every state (rule 10; GS-1).
 * - **Layout** (DR-7): the page sits in the workspace frame (docs/adr/0043-workspace-navigation-and-shell.md
 *   decision 3), so it takes the workspace page layout: the kit's left-aligned `PageHeader` in the page
 *   column with the frame's own page padding (no padding or width of its own, DR-2), as every other
 *   workspace page. "Back to review" (phase 3's control; R-012 "Until decided" keeps any way back to the
 *   intake out of the menus) is a 40px secondary button at the page's foot, a workspace control, not the
 *   wizard's 190 x 48 footer button.
 */
import { Button, PageHeader, Progress, StatusLine } from '@sovitech/ui';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { request } from '../../api/client';
import { useLoad } from '../../api/use-load';
import { copy } from '../../copy';
import { LoadFailed } from '../../pages/PageState';
import { useRenderReady } from '../../shell/render-ready';
import { stepPath, useWizard } from '../../wizard/WizardProvider';
import { indexDisplays } from '../../wizard/use-step-view';
import type { AddFieldState } from './Step8';
import { OutputList } from './OutputList';

export function ProposalPage() {
  const { projectId, publishEnvelope, goToStep } = useWizard();
  const navigate = useNavigate();
  const { state, reload } = useLoad((signal) => request('proposal.preview', { params: { projectId }, signal }), [projectId]);
  const data = state.status === 'loading' ? undefined : state.data;

  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);

  // The page takes the focus to its main region, so the keyboard and a screen reader start here (WCAG 2.4.3).
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);

  useRenderReady(state.status !== 'loading');
  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  const stillReading = data?.view.stillReading === null || data === undefined ? undefined : displays.get(data.view.stillReading);

  const toReview = () => goToStep(8);
  const onAdd = (fieldKey: string) => {
    const addState: AddFieldState = { add: fieldKey };
    void navigate(stepPath(projectId, 8), { state: addState });
  };

  return (
    <div className="flex flex-col gap-8" data-proposal-page="">
      {state.status === 'loading' ? (
        <div className="flex max-w-[760px] flex-col gap-6">
          <PageHeader title={copy.proposal.generating} />
          <Progress label={copy.proposal.generating} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <PageHeader title={copy.proposal.title} {...(data === undefined ? {} : { subtitle: copy.proposal.intro })} />
          {stillReading === undefined ? null : <StatusLine display={stillReading} />}
        </div>
      )}
      {state.status === 'failed' && data === undefined ? <LoadFailed message={copy.proposal.loadFailed} onRetry={() => void reload()} /> : null}
      {data === undefined ? null : (
        <section aria-labelledby="proposal-outputs" className="flex flex-col gap-4">
          <h2 id="proposal-outputs" className="sov-heading-section">
            {copy.proposal.outputsHeading}
          </h2>
          <OutputList outputs={data.view.outputs} displays={displays} onAdd={onAdd} />
        </section>
      )}
      <div className="border-t border-(--sov-border) pt-6">
        <Button variant="secondary" icon={ArrowLeft} onClick={toReview}>
          {copy.nav.backToReview}
        </Button>
      </div>
    </div>
  );
}
