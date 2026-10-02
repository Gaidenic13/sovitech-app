import type { MouseEvent } from 'react';
import { Icon, type IconComponent } from './Icon';

export interface SideNavItem {
  /** The page's key (`WorkspacePage`), stable across renders. */
  readonly id: string;
  /** Fixed copy from the catalogue (`workspace.pages.*`); never a number. */
  readonly label: string;
  /** The page's address (with the shared `level` parameter kept, ADR 0043 decision 6). */
  readonly href: string;
  /** A decorative icon before the label (16px): the label carries the meaning. */
  readonly icon?: IconComponent;
  /** The page on screen (`aria-current="page"`). */
  readonly current: boolean;
}

export interface SideNavProps {
  /** The navigation's name ("Project pages"). */
  readonly label: string;
  /** The built pages, in the order the approved project list draws them (ADR 0043 decision 2). */
  readonly items: readonly SideNavItem[];
  /**
   * Called on a plain click (no modifier key, the main button) so the app's router can take it:
   * call `event.preventDefault()` and navigate. A click with a modifier opens the link the browser's
   * way (a new tab or window), and the keyboard's Enter is a click.
   */
  readonly onNavigate?: (item: SideNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * The project sidebar's page list (phase 4; dashboards-spec 3.4 "Sidebar"; App theme "Sidebar selected
 * row": a 2px mint bar, a mint 8% fill and the label at weight 600, at the 32px row pitch of "Shell
 * sizes").
 *
 * One flat list of real links, in a `nav` landmark: PRD R-146 "Until decided" ("The tabs, tab order,
 * grouped sidebar … of dashboards-spec 2.5 are not adopted", D-02) keeps the list ungrouped, so the kit
 * draws no group heading; every item leads to a built page (US-ADMIN-13 AC1), which the caller's list
 * guarantees. The current page is marked with `aria-current="page"`, and its look changes in three ways
 * (bar, fill, weight), never colour alone. Tab moves through the links; Enter follows one.
 */
export function SideNav({ label, items, onNavigate }: SideNavProps) {
  return (
    <nav aria-label={label} className="sov-side-nav">
      <ul className="sov-side-nav__list">
        {items.map((item) => (
          <li key={item.id}>
            <a
              className="sov-side-nav__link"
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              data-page={item.id}
              onClick={(event) => {
                if (onNavigate === undefined) return;
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                onNavigate(item, event);
              }}
            >
              {item.icon === undefined ? null : <Icon icon={item.icon} size="small" />}
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
