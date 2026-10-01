import { useId, type ReactNode } from 'react';
import { Icon, type IconComponent } from './Icon';

export interface CardProps {
  /** The card's title (fixed copy from the catalogue), shown as a heading. */
  readonly title?: ReactNode;
  /** The heading level of the title: 2 on a step page, 3 inside a titled section. */
  readonly headingLevel?: 2 | 3 | 4;
  /** A decorative icon before the title (24px). */
  readonly icon?: IconComponent;
  /** A control at the end of the header: step 8's Edit link, step 3's count. */
  readonly headerAction?: ReactNode;
  /** `plain`: a hairline on the page (cards). `raised`: the surface fill (panels such as "Extracted details"). */
  readonly tone?: 'plain' | 'raised';
  readonly children?: ReactNode;
}

/**
 * A card or panel (onboarding-spec 2.5, "Summary card", "Panel"; "App theme": unselected cards equal
 * the page with a hairline border; raised panels on the surface; 2px radius; no shadow). A `section`
 * named by its title, so a screen reader can move between the step 8 cards.
 */
export function Card({ title, headingLevel = 3, icon, headerAction, tone = 'plain', children }: CardProps) {
  const titleId = useId();
  const Heading = `h${String(headingLevel)}` as 'h2' | 'h3' | 'h4';
  const hasHeader = title !== undefined || icon !== undefined || headerAction !== undefined;
  return (
    <section className="sov-card" data-tone={tone} aria-labelledby={title === undefined ? undefined : titleId}>
      {hasHeader ? (
        <div className="sov-card__header">
          {icon === undefined ? null : <Icon icon={icon} />}
          {title === undefined ? null : (
            <Heading className="sov-card__title" id={titleId}>
              {title}
            </Heading>
          )}
          {headerAction}
        </div>
      ) : null}
      {children}
    </section>
  );
}
