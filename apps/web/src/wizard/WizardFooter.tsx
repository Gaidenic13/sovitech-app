/**
 * The wizard footer (onboarding-spec 2.4, 2.5; US-INTAKE-01 AC3, AC4, AC5): Back at the bottom-left
 * on steps 2 to 8, the primary action at the bottom-right ("Next" on step 1, "Continue" on steps 2 to
 * 7, "Generate Proposal" on step 8). Neither is ever disabled (guardrails rule 7): a press while a
 * save is on its way is ignored and shows `aria-busy`, and a refusal shows inline, above the buttons,
 * with the alert glyph beside its words as the kit's FieldError draws it (never by colour alone),
 * without blocking anything the owner left open.
 */
import { ArrowLeft, ArrowRight, CircleAlert } from 'lucide-react';
import { Button, Icon } from '@sovitech/ui';
import { copy } from '../copy';

export interface WizardFooterProps {
  /** Back, or undefined on step 1 (the approved OB-1 has no Back). */
  readonly onBack?: () => void;
  readonly primaryLabel: string;
  readonly onPrimary: () => void;
  /** A save is on its way (the press is ignored, not refused). */
  readonly busy?: boolean;
  /** A refusal of the last save, shown inline (a sentence from the catalogue or the API's owner message). */
  readonly error?: string | null;
  /** Where the primary button sits: the page's right edge (steps 2 to 8) or the form's (step 1). */
  readonly align?: 'page' | 'form';
}

/** The width of step 1's form, its footer included (onboarding-spec 2.4: form-style steps about 830-900 wide). */
export const FORM_WIDTH = 'w-full max-w-[880px]';

export function WizardFooter({ onBack, primaryLabel, onPrimary, busy = false, error = null, align = 'page' }: WizardFooterProps) {
  return (
    <div className={align === 'form' ? `mx-auto flex ${FORM_WIDTH} flex-col gap-4` : 'flex flex-col gap-4'}>
      {error === null ? null : (
        <p role="alert" className="flex items-start justify-end gap-2 text-right text-[15px] text-(--sov-text-primary)">
          <span className="mt-0.5 shrink-0">
            <Icon icon={CircleAlert} size="small" />
          </span>
          <span>{error}</span>
        </p>
      )}
      <div className="flex items-center justify-between gap-6">
        {onBack === undefined ? (
          <span />
        ) : (
          <Button variant="secondary" size="wizard" icon={ArrowLeft} onClick={onBack}>
            {copy.nav.back}
          </Button>
        )}
        <Button
          variant="primary"
          size="wizard"
          trailingIcon={ArrowRight}
          aria-busy={busy}
          onClick={() => {
            if (!busy) onPrimary();
          }}
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
