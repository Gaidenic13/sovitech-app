/**
 * A wizard step's view (`GET /api/projects/:projectId/steps/:step`; steps.ts `StepResponse`): loads
 * it, tells the wizard which step is on screen (the late-findings poll, the stepper), publishes its
 * envelope to the shell's header, and sets `data-render-ready` once the step has rendered what it
 * asked for (its view, or its load-failure state).
 *
 * Every step component (steps 1 to 8) uses it the same way:
 *
 *   const { state, view, displays, reload } = useStepView(3);
 *   // view: the Step3View once loaded (narrowed by step), displays: value id → DisplayObject
 *
 * and moves with `useWizard()`'s `back`, `continueFrom` or `openProposal`, passing `state`'s
 * `asOf` (the late-findings ledger's time for the step it leaves). A Continue refused because the
 * step's view is out of date reads the view again (quietly) through the reload registered here.
 */
import { useEffect, useMemo } from 'react';
import type { DisplayObject, StepNumber, StepResponse, StepView } from '@sovitech/view-model/browser';
import { request } from '../api/client';
import { useLoad, type LoadState } from '../api/use-load';
import { useRenderReady } from '../shell/render-ready';
import { useWizard } from './WizardProvider';

/** Display objects by value id. */
export type Displays = ReadonlyMap<string, DisplayObject>;

export function indexDisplays(list: readonly DisplayObject[]): Displays {
  return new Map(list.map((display) => [display.valueId, display]));
}

export interface StepViewLoad<S extends StepNumber> {
  readonly state: LoadState<StepResponse>;
  /** The step's view once loaded, narrowed to this step's shape. */
  readonly view: Extract<StepView, { step: S }> | undefined;
  readonly displays: Displays;
  /** The response's `asOf`, once loaded: the ledger's time when the owner leaves this step. */
  readonly asOf: string | undefined;
  readonly reload: (options?: { readonly quiet?: boolean }) => Promise<void>;
}

export function useStepView<S extends StepNumber>(step: S): StepViewLoad<S> {
  const wizard = useWizard();
  const { projectId, enterStep, publishEnvelope, registerReload } = wizard;
  const loaded = useLoad((signal) => request('steps.view', { params: { projectId, step }, signal }), [projectId, step]);
  const { state, reload } = loaded;

  useEffect(() => {
    enterStep(step);
    return () => enterStep(null);
  }, [enterStep, step]);

  // A stale Continue reads this step's view again, keeping what is on screen until it answers.
  useEffect(() => registerReload(() => void reload({ quiet: true })), [registerReload, reload]);

  const data = state.status === 'loading' ? undefined : state.data;
  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);

  useRenderReady(state.status !== 'loading');

  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  const view = data !== undefined && data.view.step === step ? (data.view as Extract<StepView, { step: S }>) : undefined;
  return { state, view, displays, asOf: data?.asOf, reload };
}
