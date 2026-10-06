/**
 * The workspace frame (phase 4; docs/adr/0043-workspace-navigation-and-shell.md; PRD R-049, R-139,
 * R-144, R-145, R-146; US-ADMIN-06, US-ADMIN-12, US-ADMIN-13, US-REVIEW-14): every page of a project
 * after the intake is drawn inside it, by the project's layout (../wizard/ProjectLayout.tsx), for the
 * screens under the workspace group's route (./handle.ts).
 *
 * - **Header:** phase 3's app shell, unchanged (the logo, the project's bound name and today's date, the
 *   menu with account, projects and sign-out only: R-144 "Until decided"). No tabs (R-146 "Until
 *   decided": the tabs, tab order and grouped sidebar of dashboards-spec 2.5 are not adopted while D-02
 *   is open) and no "BMS LIVE" chip (R-139).
 * - **Sidebar** (208px; the kit's `WorkspaceFrame` layout, `SideNav` and `StatusFooter`): the project switcher (UD-32, ./ProjectSwitcher.tsx), the
 *   built pages in the approved project list's order (the served `pages`, the contract's
 *   `WORKSPACE_PAGES` until it answers: no item leads to a page that is not built, US-ADMIN-13 AC1),
 *   each link keeping the shared floor selection where the page reads it, and the project card
 *   (R-049, ./ProjectCard.tsx). The current page is marked `aria-current="page"` with the brand's one
 *   selected style: a 2px mint bar, the mint 8% fill and the label at 600 ("App theme", "Sidebar
 *   selected row").
 * - **The page**, beside the sidebar, with its own 360px inspector where it has one (the kit's `InspectorLayout`).
 * - **The 48px status footer**, after the page and kept in view (sticky at the bottom of the window),
 *   carrying only the demo line on the demo project and rule 7's "Still reading <n> files…" while
 *   analysis runs (R-139: "only 2.8 status lines, rule 7's 'Still reading <n> files…' notice and, on a
 *   project flagged demo, 'Demo data, not an assessment of the real building'"; what else a footer's
 *   data status says is D-90, open). The demo line is the one the wizard's page-session state holds
 *   (the served `project.demoLine` of the newest answer, G10-12's logic: shown while the page loads or
 *   after its requests failed, once any answer of this page session said the project is the demo),
 *   never this app's copy; on workspace pages it sits in the footer, not under the header, so it shows
 *   once (ADR 0043 decision 5). No "BMS Live", "Last sync", tagline, timeline or playback bar.
 * - **Landmarks** (WCAG 2.4.1, 1.3.1, 2.4.3; DR-3, V-7): the kit's frame draws the page column as the page's
 *   one `<main id="main">`, the sidebar beside it in an `aside` and the status footer after it as the
 *   contentinfo; the app shell around it draws no main of its own here (`landmark="none"`), so the skip link
 *   ("Skip to content", `#main`) passes the switcher and the sidebar's links, and a page's focus on mount
 *   lands on its own column.
 * - **Loading and failure:** the frame's request and the page's are separate; the page never waits for
 *   the frame. While the frame loads, the sidebar lists the built pages and the card's place says it is
 *   loading; if it fails, the card's place says so in its own words ("The building facts could not be
 *   loaded. Try again.", never the page's failure sentence beside a page that loaded: DR-9) with "Try
 *   again", and the pages stay reachable (rule 7: nobody is blocked). A page that fails to render shows its
 *   failure state inside this frame (the workspace group's error element, ../routes.tsx), so the sidebar
 *   and the footer with the demo line stay. `data-render-ready` waits for both (../shell/render-ready.ts).
 * - The frame reads `workspace.frame` again every FRAME_POLL_MS while files are being read, so the
 *   footer's line and the card follow the analysis; a page that changes them calls `reload`.
 *
 * Undesigned parts (the footer's content, the card's facts with their badges, the loading and failure
 * states of the sidebar), drawn per the frontend-design skill within the brand: hairlines, no fills but
 * the selected row's, Inter at the brand's weights, the footer a single quiet line.
 */
import { ClipboardList, FileDown, FileText, Layers, LayoutGrid, Network, Server, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button, Notice, SideNav, StatusFooter, WorkspaceFrame as FrameLayout, type SideNavItem } from '@sovitech/ui';
import { WORKSPACE_PAGES, type WorkspacePage } from '@sovitech/view-model/browser';
import { request } from '../api/client';
import { useLoad } from '../api/use-load';
import { copy } from '../copy';
import { Loading } from '../pages/PageState';
import { AppShell } from '../shell/AppShell';
import { useRenderReady } from '../shell/render-ready';
import { useWizard } from '../wizard/WizardProvider';
import { indexDisplays } from '../wizard/use-step-view';
import { levelOfSearch, pageOfPath, pagePath } from './navigation';
import { ProjectCard } from './ProjectCard';
import { ProjectSwitcher } from './ProjectSwitcher';
import { WorkspaceFrameContext, type WorkspaceFrameValue } from './use-workspace';

/** How often the frame is read again while any file is being read (the footer's "Still reading" line). */
export const FRAME_POLL_MS = 5_000;

const PAGE_ICONS: Readonly<Record<WorkspacePage, LucideIcon>> = {
  proposal: ClipboardList,
  system_scope: Layers,
  topology: Network,
  zones: LayoutGrid,
  equipment: Server,
  documents: FileText,
  reports: FileDown,
};

export function ProjectWorkspaceFrame({ children }: { readonly children: ReactNode }) {
  const { projectId, header, demoLine, notice, dismissNotice, publishEnvelope } = useWizard();
  const loaded = useLoad((signal) => request('workspace.frame', { params: { projectId }, signal }), [projectId]);
  const { state, reload } = loaded;
  const data = state.data;

  useEffect(() => {
    if (data !== undefined) publishEnvelope(data);
  }, [data, publishEnvelope]);

  const reading = data !== undefined && data.view.footer.stillReading !== null;
  useEffect(() => {
    if (!reading) return;
    const timer = window.setInterval(() => void reload({ quiet: true }), FRAME_POLL_MS);
    return () => window.clearInterval(timer);
  }, [reading, reload]);

  useRenderReady(state.status !== 'loading');

  const displays = useMemo(() => indexDisplays(data?.displayObjects ?? []), [data]);
  const pages = data?.view.pages ?? WORKSPACE_PAGES;
  const value = useMemo<WorkspaceFrameValue>(() => ({ state, displays, pages, levels: data?.view.levels, reload }), [state, displays, pages, data, reload]);

  const name = header.status === 'ready' ? header.value.name : undefined;
  const stillReading = data?.view.footer.stillReading ?? null;
  const reads = stillReading === null ? undefined : displays.get(stillReading);
  return (
    <WorkspaceFrameContext.Provider value={value}>
      <AppShell
        {...(name === undefined ? {} : { projectName: name })}
        notices={notice === null ? undefined : <Notice display={notice.display} onDismiss={dismissNotice} dismissLabel={copy.notice.dismiss} />}
        landmark="none"
      >
        <FrameLayout
          sidebar={<ProjectSidebar projectId={projectId} frame={value} />}
          sidebarLabel={copy.workspace.frame.projectLabel}
          footer={<StatusFooter label={copy.workspace.frame.footer} demoLine={demoLine} stillReading={reads ?? null} />}
        >
          {children}
        </FrameLayout>
      </AppShell>
    </WorkspaceFrameContext.Provider>
  );
}

function ProjectSidebar({ projectId, frame }: { readonly projectId: string; readonly frame: WorkspaceFrameValue }) {
  const { header } = useWizard();
  const location = useLocation();
  const navigate = useNavigate();
  const current = pageOfPath(location.pathname) ?? 'proposal';
  const level = levelOfSearch(new URLSearchParams(location.search));
  const cardHeadingId = useId();
  const name = header.status === 'ready' ? header.value.name : undefined;
  const { state } = frame;
  const card = state.data?.view.projectCard;
  const items: SideNavItem[] = frame.pages.map((page) => ({
    id: page,
    label: copy.workspace.pages[page],
    href: pagePath(projectId, page, level),
    icon: PAGE_ICONS[page],
    current: page === current,
  }));

  return (
    <div className="flex flex-col gap-8">
      <ProjectSwitcher projectId={projectId} name={name} page={current} />
      <SideNav
        label={copy.workspace.frame.navigation}
        items={items}
        onNavigate={(item, event) => {
          event.preventDefault();
          void navigate(item.href);
        }}
      />
      <div className="border-t border-(--sov-border) pt-6">
        {card !== undefined ? (
          <ProjectCard card={card} displays={frame.displays} headingId={cardHeadingId} heading={copy.workspace.frame.cardHeading} />
        ) : state.status === 'failed' ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p className="text-[13px] text-(--sov-text-primary)">{copy.workspace.frame.cardLoadFailed}</p>
            <Button variant="link" onClick={() => void frame.reload()}>
              {copy.app.retry}
            </Button>
          </div>
        ) : (
          <Loading label={copy.app.loading} align="start" />
        )}
      </div>
    </div>
  );
}
