import type { ReactNode } from 'react';
import { Logo, NoticeRegion } from '@sovitech/ui';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { copy } from '../copy';
import { HeaderDate } from './HeaderDate';

/**
 * The app shell (F-RENDER-09; US-INTAKE-01 AC1; US-ADMIN-08, US-ADMIN-12; PRD R-138, R-139): the
 * 64px header with the SOVITECH logo (`logo-white.svg` at h-8, no wordmark, no tagline, no CSS
 * filter), and on the right, once a project exists, its stored name (bound to the value id the API
 * served, `project:<id>.name`, and isolated in a `<bdi>`, so a direction control the owner typed
 * reorders nothing around it) over today's date in a `<time>` element in the render allowlist's
 * `D MMM YYYY` form (no time of day: proposal P-3-HEADER-TIME), then the menu (UD-16). Below the
 * header: the demo line on every screen of the demo project (rule 10; GS-1), from the served line,
 * never from this app's copy; the notices region (one quiet, polite live region, never a dialog:
 * rule 7, G7-4); then the page.
 *
 * No live element: no "BMS LIVE" chip, no connection status, no timeline (R-139). Desktop first:
 * below the 1440px canvas the page scrolls rather than reflowing (prompt 3 section 11).
 */
export interface ShellProps {
  /** The project's name, as served (the header shows its text only, bound). */
  readonly projectName?: DisplayObject;
  /** The header menu (UD-16), when signed in. */
  readonly menu?: ReactNode;
  /** Extra header content on the right (kept from the planner's skeleton). */
  readonly headerRight?: ReactNode;
  /** The demo line, on the demo project's screens only. */
  readonly demoLine?: ReactNode;
  /** The notices region's content (one quiet notice at most). */
  readonly notices?: ReactNode;
  readonly children: ReactNode;
}

export function Shell({ projectName, menu, headerRight, demoLine, notices, children }: ShellProps) {
  return (
    <div className="min-h-screen min-w-[1440px] bg-(--sov-bg) text-(--sov-text-primary)">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30 focus:rounded-(--sov-radius-control) focus:bg-(--sov-surface) focus:px-4 focus:py-2 focus:outline-2 focus:outline-(--sov-focus-ring)"
      >
        {copy.app.skipToContent}
      </a>
      <header className="flex h-(--sov-header-height) items-center justify-between border-b border-(--sov-border) px-6">
        {/* The kit's Logo: the render test cannot read an image's pixels, so it carries the reviewed entry `brand-logo` (tests/e2e/render/allowlist.ts). */}
        <Logo />
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-0.5 text-right">
            {projectName === undefined ? null : (
              <p className="text-[13px] font-medium tracking-[0.02em] text-(--sov-text-primary)">
                {/* Isolated: an owner's name that holds a direction control never reorders the header around it. */}
                <span data-value-id={projectName.valueId}>
                  <bdi>{projectName.text}</bdi>
                </span>
              </p>
            )}
            <span className="text-[13px] text-(--sov-text-muted) tabular-nums">
              <HeaderDate />
            </span>
          </div>
          {headerRight}
          {menu}
        </div>
      </header>
      {demoLine}
      <NoticeRegion label={copy.notice.region}>{notices}</NoticeRegion>
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </div>
  );
}
