import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon, type IconComponent } from './Icon';

export interface BannerProps {
  /** An optional title line (step 8's "Everything ready?" as the design shows it, or its replacement). */
  readonly title?: ReactNode;
  /** The banner's text: fixed copy from the catalogue. A line with a number goes through StatusLine inside it. */
  readonly children: ReactNode;
  /** The leading icon; the info circle by default. */
  readonly icon?: IconComponent;
}

/**
 * An information banner (onboarding-spec 2.5, "Banners", Info; steps 4, 7 and 8). The surface fill, a
 * hairline border and a white icon: "App theme" gives the info banner no hue of its own, and the
 * success and warning banners need colours that are proposals pending the owner's OK (D-19), so the
 * kit has one banner. Static content: no live region, no dismiss (a late finding uses Notice).
 */
export function Banner({ title, children, icon = Info }: BannerProps) {
  return (
    <div className="sov-banner">
      <Icon icon={icon} />
      <div className="sov-banner__body">
        {title === undefined ? null : <p className="sov-banner__title">{title}</p>}
        <div className="sov-banner__text">{children}</div>
      </div>
    </div>
  );
}
