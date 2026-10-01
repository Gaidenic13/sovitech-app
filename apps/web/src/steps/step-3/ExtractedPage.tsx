/**
 * UD-45 "View all extracted data" (`/projects/:projectId/extracted`; `GET /api/projects/:projectId/
 * extracted`; PRD R-045; US-REVIEW-08): every fact found about the building, each through the Value
 * component with its badge, its source line, its excerpt on demand and Edit, and a confirmation only
 * where the served display carries one, counted in the same budget as step 3's (AC5; the server's
 * `project:<id>.confirmations.extractedFacts` count). No "Confirm all" and no bulk action (AC2). A fact
 * searched and not found reads "Not found in the analysed documents" with its coverage (AC3), a value
 * only an old revision holds reads "From a superseded revision" (AC4): both are the served lines. The
 * demo line comes with the project layout (AC6; GS-1).
 *
 * No approved design (UD-45; dashboards 8.10, D-06). Drawn per the frontend-design skill within the
 * brand as step 3's detail panel given the page's width: the stepper kept at step 3 (this is part of
 * the step), a left-aligned title, one column of the same rows as step 3's panel, and Back to the
 * building. While it loads, the title and intro stay with one "Loading your answers" line over the
 * outlines of the rows to come, so the footer does not jump (DR-12). Reading the page stores nothing
 * (PRD R-009).
 */
import { ArrowLeft, CircleAlert } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Button, StatusLine } from '@sovitech/ui';
import { request } from '../../api/client';
import { useLoad } from '../../api/use-load';
import { copy } from '../../copy';
import { LoadFailed, Loading } from '../../pages/PageState';
import { useRenderReady } from '../../shell/render-ready';
import { WizardLayout } from '../../shell/WizardLayout';
import { WizardStepper } from '../../wizard/WizardStepper';
import { useWizard } from '../../wizard/WizardProvider';
import { indexDisplays } from '../../wizard/use-step-view';
import { FactRows } from './FactRows';
import { factTree } from './facts';

const TITLE_CLASS = 'text-(length:--sov-title-size) leading-tight font-light tracking-(--sov-title-tracking) text-(--sov-text-primary)';

export function ExtractedPage() {
  const { projectId, publishEnvelope, goToStep } = useWizard();
  const loaded = useLoad((signal) => request('extracted.view', { params: { projectId }, signal }), [projectId]);
  const { state, reload } = loaded;
  const data = state.status === 'loading' ? undefined : state.data;

  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);
  useRenderReady(state.status !== 'loading');

  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  const facts = useMemo(() => (data === undefined ? [] : factTree(data.view.facts, displays)), [data, displays]);
  const count = data?.view.confirmationCount === null || data === undefined ? undefined : displays.get(data.view.confirmationCount);

  return (
    <WizardLayout
      stepper={<WizardStepper step={3} />}
      footer={
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="wizard" icon={ArrowLeft} onClick={() => goToStep(3)}>
            {copy.step3.extracted.back}
          </Button>
        </div>
      }
    >
      <section aria-labelledby="extracted-title" className="mx-auto flex w-full max-w-[860px] flex-col gap-8">
        <header className="flex flex-col gap-4">
          <h1 id="extracted-title" className={TITLE_CLASS}>
            {copy.step3.extracted.title}
          </h1>
          <p className="text-[17px] leading-7 font-light text-(--sov-text-tertiary)">{copy.step3.extracted.intro}</p>
          {count === undefined ? null : <StatusLine display={count} icon={CircleAlert} />}
        </header>
        {state.status === 'loading' ? (
          <div className="flex flex-col gap-4">
            <Loading label={copy.step8.loading} align="start" />
            <div aria-hidden="true" className="flex flex-col gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="min-h-[112px] rounded-(--sov-radius-surface) border border-(--sov-border)" />
              ))}
            </div>
          </div>
        ) : null}
        {state.status === 'failed' && data === undefined ? <LoadFailed onRetry={() => void reload()} /> : null}
        {data === undefined ? null : (
          <FactRows projectId={projectId} nodes={facts} place="extracted" onChanged={() => void reload({ quiet: true })} evidenceLabel={copy.review.showExcerpt} />
        )}
      </section>
    </WizardLayout>
  );
}
