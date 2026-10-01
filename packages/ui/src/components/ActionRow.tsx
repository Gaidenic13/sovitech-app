import { ChevronRight } from 'lucide-react';
import type { MouseEventHandler, ReactNode } from 'react';
import { Icon, type IconComponent } from './Icon';

export interface ActionRowProps {
  /** The row's label: fixed copy ("View all extracted data"), or a served line with a number in its own bound element. */
  readonly children: ReactNode;
  /** A second line under the label. */
  readonly detail?: ReactNode;
  /** A decorative leading icon (24px). */
  readonly icon?: IconComponent;
  /** A link target: the row renders as a link. */
  readonly href?: string;
  /** Otherwise a button (for the router's navigation). */
  readonly onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
}

/**
 * An outlined row that leads somewhere (onboarding-spec 2.5, "Link row" and "Warning row"): a
 * leading icon, a label and a trailing chevron. A real link or button, reached by Tab, pressed with
 * Enter. Step 3's warning row takes this form without the amber colour ("App theme" status colours
 * are proposals pending the owner's OK) and never says "before we continue" (US-REVIEW-06 AC3).
 */
export function ActionRow({ children, detail, icon, href, onClick }: ActionRowProps) {
  const body = (
    <>
      {icon === undefined ? null : <Icon icon={icon} />}
      <span className="sov-action-row__body">
        <span>{children}</span>
        {detail === undefined ? null : <span className="sov-action-row__detail">{detail}</span>}
      </span>
      <Icon icon={ChevronRight} size="small" />
    </>
  );
  if (href !== undefined) {
    return (
      <a className="sov-action-row" href={href} onClick={onClick}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className="sov-action-row" onClick={onClick}>
      {body}
    </button>
  );
}
