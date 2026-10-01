import { Check } from 'lucide-react';
import { useId } from 'react';
import { STEP_NUMBERS, STEP_TITLES, type StepNumber } from '@sovitech/view-model/browser';
import { Icon } from './Icon';

export interface StepperLabels {
  /** The navigation landmark's name ("Intake steps", catalogue `stepper.label`). */
  readonly list: string;
  /** The description of a step the owner has left ("Done"), read by assistive technology in place of the check. */
  readonly done: string;
  /** The description of the late-findings dot ("New findings on this step", catalogue `stepper.newFindings`). */
  readonly newFindings: string;
}

export interface StepperProps {
  /** The step on screen. */
  readonly current: StepNumber;
  /**
   * The steps the owner has left in this page session, shown with a check and no number
   * (US-INTAKE-01 AC2). The current step is never among them.
   */
  readonly done: readonly StepNumber[];
  /**
   * Steps whose fields gained a finding after the owner left them (the late-findings route's
   * `dots`; guardrails rule 7; G7-4). The step on screen never gets one.
   */
  readonly dots?: readonly StepNumber[];
  readonly labels: StepperLabels;
}

type StepState = 'done' | 'current' | 'upcoming';

/**
 * The wizard stepper (onboarding-spec 2.4, 2.5; US-INTAKE-01 AC2, AC7; F-QUESTION-09; G7-4).
 *
 * The render contract (tests/e2e/render/README.md; allowlist entry `wizard-step-number`): one
 * `<ol data-render-stepper="wizard-step-number">` of exactly eight `<li>`, each showing its step
 * number (marked `data-render-allow="wizard-step-number"`, equal to its position) and the step's
 * registered title (STEP_TITLES), and nothing else; a step the owner has left shows a check and its
 * title only. The states' words ("Done", "New findings on this step") are descriptions kept outside
 * the list and tied to each item with `aria-describedby`, so an item's text stays its number and its
 * title.
 *
 * - Current: a mint disc with a dark numeral and a brighter label, `aria-current="step"`.
 * - Done: a ring with a check and no numeral.
 * - Upcoming: a ring with its numeral.
 * - A late finding: a white dot on the step's ring (never amber; its description carries it), and
 *   never a dialog or a move (rule 7, "Late findings never interrupt").
 *
 * No step is a link: clicking the stepper opens nothing (PRD R-008 "Until decided", D-10), so the
 * stepper holds no focus stop and adds nothing to the keyboard path; Back and Continue move the
 * owner. Colour is never the only signal: the check, the numeral, `aria-current` and the
 * descriptions carry each state.
 */
export function Stepper({ current, done, dots = [], labels }: StepperProps) {
  const id = useId();
  const doneId = `${id}-done`;
  const dotId = `${id}-dot`;
  const stateOf = (step: StepNumber): StepState => (step === current ? 'current' : done.includes(step) ? 'done' : 'upcoming');
  return (
    <nav className="sov-stepper" aria-label={labels.list}>
      {/* The list style is inline, not only in ui.css: an ordered list draws numbered markers until a
          stylesheet says otherwise, and a marker is a number the render test reads (G2-1). */}
      <ol className="sov-stepper__list" data-render-stepper="wizard-step-number" style={{ listStyle: 'none' }}>
        {STEP_NUMBERS.map((step, index) => {
          const state = stateOf(step);
          const dot = state !== 'current' && dots.includes(step);
          const described = [state === 'done' ? doneId : null, dot ? dotId : null].filter((part): part is string => part !== null);
          return (
            <li
              key={step}
              className="sov-stepper__item"
              data-state={state}
              data-dot={dot ? 'true' : 'false'}
              aria-current={state === 'current' ? 'step' : undefined}
              aria-describedby={described.length === 0 ? undefined : described.join(' ')}
            >
              {index < STEP_NUMBERS.length - 1 ? <span className="sov-stepper__connector" aria-hidden="true" /> : null}
              <span className="sov-stepper__mark">
                {state === 'done' ? <Icon icon={Check} size="small" /> : <span data-render-allow="wizard-step-number">{step}</span>}
                {dot ? <span className="sov-stepper__dot" aria-hidden="true" /> : null}
              </span>
              <span className="sov-stepper__title">{STEP_TITLES[index]}</span>
            </li>
          );
        })}
      </ol>
      <span id={doneId} hidden>
        {labels.done}
      </span>
      <span id={dotId} hidden>
        {labels.newFindings}
      </span>
    </nav>
  );
}
