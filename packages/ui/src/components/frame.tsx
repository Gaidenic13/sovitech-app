/**
 * The workspace frame's layout pieces (phase 4; docs/adr/0043-workspace-navigation-and-shell.md, decision
 * 5; dashboards-spec 3.4 "Proposed shell"; App theme "Shell sizes": sidebar 208px, inspector 360px, status
 * footer 48px always present, a 16px gutter and a 12px panel gap; tokens.css holds the sizes).
 *
 * - `WorkspaceFrame`: the sidebar beside the page, and the 48px status footer under both, kept in view.
 * - `InspectorLayout`: a page's content with its right inspector beside it, when one is open.
 * - `PageHeader`: the title slot (a back link where the approved screen draws one, an eyebrow only on
 *   Documents, the title, the subtitle, and the page's controls on the right).
 * - `StatusFooter`: the footer's content, which takes only what R-139 allows.
 *
 * Layout only: no data, no copy of their own (every label is the caller's catalogue copy), no live
 * element (R-139: no "BMS LIVE", "Last sync", timeline or playback bar), no tagline.
 */
import { ArrowLeft, FileText } from 'lucide-react';
import type { DisplayObject, Line } from '@sovitech/view-model/browser';
import type { MouseEvent, ReactNode } from 'react';
import { DemoLine } from './DemoLine';
import { Icon } from './Icon';
import { StatusLine } from './StatusLine';

// ---------------------------------------------------------------------------------------------
// WorkspaceFrame
// ---------------------------------------------------------------------------------------------

export interface WorkspaceFrameProps {
  /** The sidebar: the project switcher, the page list (`SideNav`) and the project card. */
  readonly sidebar: ReactNode;
  /**
   * The sidebar's name, for its complementary landmark (catalogue copy, "Project"). Optional: the
   * frame has one sidebar, and its `nav` and card are named by their own labels and headings.
   */
  readonly sidebarLabel?: string;
  /** The status footer's content (`StatusFooter`), always present. */
  readonly footer: ReactNode;
  /** The page. */
  readonly children: ReactNode;
}

/**
 * The frame under the app's 64px header: a 208px sidebar beside the page, and the 48px status footer
 * across both, sticky at the bottom of the window so the demo line never scrolls away (rule 10, GS-1).
 * Desktop first: below the 1440px canvas the page scrolls rather than reflowing (prompt 3 section 11).
 *
 * Its landmarks (phase 4 part B, DR-3 and V-7; WCAG 2.4.1, 1.3.1, 2.4.3): the sidebar is an `aside`
 * (complementary) holding the page list's `nav` and the project card; the page column is the app's one
 * `main` (`id="main"`, the skip link's target and where a page puts the focus when it opens, so neither
 * lands on the switcher or the sidebar's links); the footer is the page's `footer` (contentinfo). The
 * app's shell therefore draws no `main` of its own around the frame (the Shell's `landmark: 'none'`).
 * The page column takes the one padding of the page (the gutter tokens); a page adds none of its own.
 */
export function WorkspaceFrame({ sidebar, sidebarLabel, footer, children }: WorkspaceFrameProps) {
  return (
    <div className="sov-workspace">
      <aside className="sov-workspace__sidebar" aria-label={sidebarLabel}>
        {sidebar}
      </aside>
      <main id="main" tabIndex={-1} className="sov-workspace__page">
        {children}
      </main>
      <footer className="sov-workspace__footer">{footer}</footer>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// InspectorLayout
// ---------------------------------------------------------------------------------------------

export interface InspectorLayoutProps {
  /** The register or list. */
  readonly children: ReactNode;
  /** The open inspector (`Inspector`), or null when nothing is selected: the content then takes the width. */
  readonly inspector: ReactNode;
}

/** A page's content with the 360px inspector beside it, 12px apart; with no inspector the content takes the row. */
export function InspectorLayout({ children, inspector }: InspectorLayoutProps) {
  const open = inspector !== null && inspector !== undefined && inspector !== false;
  return (
    <div className="sov-inspector-layout" data-inspector={open ? 'open' : 'closed'}>
      <div className="sov-inspector-layout__content">{children}</div>
      {open ? <div className="sov-inspector-layout__inspector">{inspector}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------------------------

export interface PageBackLink {
  /** "Back to System Scope" (catalogue copy). */
  readonly label: string;
  readonly href: string;
  /** As SideNav's: called on a plain click so the router can take it. */
  readonly onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export interface PageHeaderProps {
  /** The page title (catalogue copy), the page's one `h1`. */
  readonly title: string;
  /** The line under the title (catalogue copy, sentence case). */
  readonly subtitle?: string;
  /** The eyebrow, only where the approved screen draws one (Documents; ADR 0043 decision 7). */
  readonly eyebrow?: string;
  /** "← Back to <parent>", only where the PRD keeps the approved link and its target is built (ADR 0043 decision 4). */
  readonly back?: PageBackLink;
  /** The page's controls on the title's right (Upload Document; filters). One primary button at most (dashboards-spec 3.6). */
  readonly actions?: ReactNode;
  /**
   * Where the controls sit against the title block: `end` (the default) on its last line; `start` at its top, so the
   * title keeps one position whatever the controls' height (the stored proposal's Download PDF, whose status and
   * failure lines show under it; phase 5 DR-16).
   */
  readonly actionsAlign?: 'end' | 'start';
}

/**
 * The title slot of a workspace page (dashboards-spec 2.5 rule 3; the approved screens 15 to 20): the back
 * link above the title, then the title in the page-title role (Inter light, tracked tight: App theme
 * "Page title"), the subtitle in text-tertiary, and the page's controls aligned to the title's right.
 * The eyebrow follows the brand's eyebrow row (mint, 14px, weight 600, a bullet before it); the bullet is
 * a decorative, hidden character, never generated content.
 */
export function PageHeader({ title, subtitle, eyebrow, back, actions, actionsAlign = 'end' }: PageHeaderProps) {
  return (
    <header className="sov-page-header">
      {back === undefined ? null : (
        <a
          className="sov-page-header__back"
          href={back.href}
          onClick={(event) => {
            if (back.onNavigate === undefined) return;
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            back.onNavigate(event);
          }}
        >
          <Icon icon={ArrowLeft} size="small" />
          <span>{back.label}</span>
        </a>
      )}
      <div className="sov-page-header__row" data-actions-align={actionsAlign === 'start' ? 'start' : undefined}>
        <div className="sov-page-header__titles">
          {eyebrow === undefined ? null : (
            <p className="sov-eyebrow">
              <span className="sov-eyebrow__bullet" aria-hidden="true">
                •
              </span>
              {eyebrow}
            </p>
          )}
          <h1 className="sov-page-header__title">{title}</h1>
          {subtitle === undefined ? null : <p className="sov-page-header__subtitle">{subtitle}</p>}
        </div>
        {actions === undefined ? null : <div className="sov-page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------------------------
// StatusFooter
// ---------------------------------------------------------------------------------------------

export interface StatusFooterProps {
  /** A heading for the footer, read by screen readers only ("Project status"). */
  readonly label: string;
  /** The envelope's `project.demoLine`: 2.8's demo line on a project flagged demo, null on every other project. */
  readonly demoLine: Line | null;
  /** Rule 7's "Still reading <n> files…" while any analysis runs: a `line` display object, its count bound; null otherwise. */
  readonly stillReading: DisplayObject | null;
  /** Other 2.8 status lines the footer carries (none in this build: the footer's "data status" is D-90). Kind `status_line` only, with no number. */
  readonly statusLines?: readonly Line[];
}

/**
 * The 48px status footer (PRD R-139: a drawn footer "carries only 2.8 status lines, rule 7's 'Still
 * reading <n> files…' notice and, on a project flagged demo, 'Demo data, not an assessment of the real
 * building'"; ADR 0043 decision 5). Its props take exactly those, so nothing else can be put in it: no
 * live status, no "Last sync", no tagline (App theme "Status footer": "No tagline").
 *
 * The demo line comes first, from the served line through `DemoLine` (it refuses anything but 2.8's demo
 * line), shown in full, never truncated or behind a hover (2.8 "Prominence"). On any other project the
 * footer still stands, empty or with "Still reading", so the frame does not move between projects.
 * The frame's `<footer>` (the page's contentinfo landmark) holds it, so it is a plain box here (a footer
 * inside a footer is not allowed); its visually hidden heading lets a screen reader reach it by heading.
 */
export function StatusFooter({ label, demoLine, stillReading, statusLines = [] }: StatusFooterProps) {
  for (const line of statusLines) {
    if (line.kind !== 'status_line') {
      throw new Error(`StatusFooter: "${line.id}" is a ${line.kind}; the footer carries only 2.8 status lines (R-139).`);
    }
  }
  return (
    <div className="sov-status-footer">
      <h2 className="sov-visually-hidden">{label}</h2>
      <div className="sov-status-footer__demo">
        <DemoLine line={demoLine} />
      </div>
      <div className="sov-status-footer__status">
        {stillReading === null ? null : <StatusLine display={stillReading} icon={FileText} />}
        {statusLines.map((line) => (
          <StatusLine key={line.id} line={line} />
        ))}
      </div>
    </div>
  );
}
