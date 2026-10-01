/**
 * The wizard's stepper for the step on screen: the kit's `Stepper` fed from the page session
 * (docs/adr/0039-wizard-navigation-saving-and-late-findings.md, decision 3): the steps the owner
 * has left in this page session show a check and their title, the step on screen and never-visited
 * steps show their number, and the late-findings route's dots mark left steps (G7-4). Clicking it
 * opens nothing (PRD R-008 "Until decided").
 *
 * Outside a project (a new project's step 1) no step has been left and no dot exists.
 */
import { Stepper } from '@sovitech/ui';
import { STEP_NUMBERS, type StepNumber } from '@sovitech/view-model/browser';
import { copy } from '../copy';
import { useOptionalWizard } from './WizardProvider';

const LABELS = { list: copy.stepper.label, done: copy.stepper.done, newFindings: copy.stepper.newFindings } as const;

export function WizardStepper({ step }: { readonly step: StepNumber }) {
  const wizard = useOptionalWizard();
  const done = STEP_NUMBERS.filter((candidate) => candidate !== step && wizard?.leftSteps.has(candidate) === true);
  // A dot marks a step the owner has left (the ledger names only those).
  const dots = done.filter((candidate) => wizard?.dots.has(candidate) === true);
  return <Stepper current={step} done={done} dots={dots} labels={LABELS} />;
}
