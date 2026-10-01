import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconComponent } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'link' | 'quiet';
export type ButtonSize = 'wizard' | 'default';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'className' | 'style' | 'children'> {
  /**
   * - `primary`: white at rest, mint on hover, a label in the raised surface colour (the brand's button on dark; no
   *   button is mint at rest, US-INTAKE-01 AC6). One per page: Next, Continue, Generate Proposal.
   * - `secondary`: a hairline outline with a white 50% label that turns white on hover (Back).
   * - `accent`: a mint outline and mint label (Browse files).
   * - `link`: mint text, white on hover (Edit, Add <field>, Yes); underlined when it has no icon, so it
   *   never reads as static text (DR-24).
   * - `quiet`: underlined muted text (Skip for now, Dismiss, Generate without it).
   */
  readonly variant?: ButtonVariant;
  /** `wizard`: part 1's 190 x 48 footer button; `default`: 40px. Links and quiet buttons ignore it. */
  readonly size?: ButtonSize;
  /** An icon before the label (Back's arrow, Edit's pencil). */
  readonly icon?: IconComponent;
  /** An icon after the label (the primary button's arrow). */
  readonly trailingIcon?: IconComponent;
  /** The label: fixed interface copy from the app's catalogue, or an action label the API served ("Add <field>"). */
  readonly children: ReactNode;
}

/**
 * A button (onboarding-spec 2.5; "App theme", Primary and Secondary button). A real `<button>`,
 * `type="button"` unless stated, reachable by Tab and pressed with Enter or Space.
 *
 * It has no `disabled` state: Continue and Generate are never disabled, and nobody is blocked
 * except by step 1's four required fields, which show inline errors while Next stays enabled
 * (guardrails rule 7; G7-6). A button that is working says so with `aria-busy`.
 *
 * Its label is an action label, the place 2.8 allows a reserved term such as "Confirm"
 * (`data-copy-kind="action-label"`).
 */
export function Button({ variant = 'secondary', size = 'default', icon, trailingIcon, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className="sov-button"
      data-variant={variant}
      data-size={size}
      data-icon={icon === undefined && trailingIcon === undefined ? 'false' : 'true'}
      data-copy-kind="action-label"
    >
      {icon === undefined ? null : <Icon icon={icon} size={variant === 'link' || variant === 'quiet' ? 'small' : 'default'} />}
      <span>{children}</span>
      {trailingIcon === undefined ? null : <Icon icon={trailingIcon} />}
    </button>
  );
}
