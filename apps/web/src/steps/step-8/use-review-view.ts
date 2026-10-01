/**
 * Step 8's view, as ../../wizard/use-step-view.ts loads every step's, with one addition: while the
 * step was opened by an "Add <field>" (the proposal page's, PRD R-012 "Until decided"; ADR 0039), each
 * load names that field in the `add` query, so the API serves that field's inline ask even after
 * Generate skipped it (rule 7: a skipped first-estimate field returns "at step 8"; US-INTAKE-22 AC6:
 * the action opens "at least the step 8 inline ask for that field"). Reloads after a save, a late
 * finding or a poll keep the query, so the ask stays until the owner answers it or leaves the step.
 *
 * An API that serves no ask for the field leaves the step as it is, and Step8 brings the field's card
 * Edit link into view instead (never an empty page).
 */
import { useEffect, useMemo } from 'react';
import type { StepView } from '@sovitech/view-model/browser';
import { request } from '../../api/client';
import { useLoad } from '../../api/use-load';
import { useRenderReady } from '../../shell/render-ready';
import { useWizard } from '../../wizard/WizardProvider';
import { indexDisplays, type StepViewLoad } from '../../wizard/use-step-view';

export function useReviewView(add: string | undefined): StepViewLoad<8> {
  const { projectId, enterStep, publishEnvelope } = useWizard();
  const loaded = useLoad(
    (signal) => request('steps.view', { params: { projectId, step: 8 }, ...(add === undefined ? {} : { query: { add } }), signal }),
    [projectId, add],
  );
  const { state } = loaded;

  useEffect(() => {
    enterStep(8);
    return () => enterStep(null);
  }, [enterStep]);

  const data = state.status === 'loading' ? undefined : state.data;
  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);

  useRenderReady(state.status !== 'loading');

  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  const view = data !== undefined && data.view.step === 8 ? (data.view as Extract<StepView, { step: 8 }>) : undefined;
  return { state, view, displays, asOf: data?.asOf, reload: loaded.reload };
}
