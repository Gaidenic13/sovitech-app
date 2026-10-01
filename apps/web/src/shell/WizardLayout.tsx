import { useEffect, type ReactNode } from 'react';

/**
 * The frame of every wizard step (US-INTAKE-01; onboarding-spec 2.4 and 2.5 as the brand replaces
 * their colours), on the 1440 canvas: the stepper centred under the header, then the step, then the
 * footer with a 1px divider above Back (bottom-left, steps 2 to 8) and the primary action
 * (bottom-right: step 1 "Next", steps 2 to 7 "Continue", step 8 "Generate Proposal"), never disabled
 * (rule 7). Step 1 keeps its approved frame: no Back and no footer divider (US-INTAKE-01 AC5; the
 * `plainFooter` flag).
 *
 * The stepper (../wizard/WizardStepper.tsx, over the kit's `Stepper`): one `<ol data-render-stepper=
 * "wizard-step-number">` of exactly eight `<li>`; the current step and never-visited steps show
 * their number and title; a step the owner has left in this page session shows a check and its
 * title, and a dot with visually hidden text when the late-findings route names it (G7-4). Clicking
 * a step opens nothing (PRD R-008 "Until decided").
 *
 * No eyebrow "STEP <n> OF 8": its digits would sit outside the stepper, which the render allowlist
 * does not accept (proposal P-3-EYEBROW-STEP-NUMBER). The step's own title block is `StepHeading`.
 */
export interface WizardLayoutProps {
  /** The stepper: `<WizardStepper step={n} />` (../wizard/WizardStepper.tsx), which is its own navigation landmark. */
  readonly stepper: ReactNode;
  readonly footer: ReactNode;
  readonly children: ReactNode;
  /** Step 1's footer: no divider (the approved OB-1). */
  readonly plainFooter?: boolean;
}

export function WizardLayout({ stepper, footer, children, plainFooter = false }: WizardLayoutProps) {
  // A step that opens takes the focus to the page's main region, so the keyboard and a screen reader
  // start at the new step rather than on the button that left the previous one (WCAG 2.4.3).
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col px-12 pb-10">
      <div className="flex justify-center pt-8">{stepper}</div>
      <div className="pt-14">{children}</div>
      <footer className={plainFooter ? 'mt-12' : 'mt-12 border-t border-(--sov-border) pt-6'}>{footer}</footer>
    </div>
  );
}

/** A step's title block (onboarding-spec 2.3 and 2.4): the centred H1 in the one title role and its subtitle. */
export function StepHeading({ title, subtitle, id = 'step-title' }: { readonly title: string; readonly subtitle?: string; readonly id?: string }) {
  return (
    <header className="mx-auto max-w-[900px] text-center">
      <h1 id={id} className="text-(length:--sov-title-size) leading-tight font-light tracking-(--sov-title-tracking) text-(--sov-text-primary)">
        {title}
      </h1>
      {subtitle === undefined ? null : <p className="mt-4 text-[17px] font-light text-(--sov-text-tertiary)">{subtitle}</p>}
    </header>
  );
}
