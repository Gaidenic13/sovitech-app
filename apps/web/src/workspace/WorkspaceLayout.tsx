/**
 * The route element of the workspace group (phase 4; docs/adr/0043-workspace-navigation-and-shell.md):
 * the proposal page (the landing after Generate, ADR 0043 decision 3), System Scope, Topology, Zones,
 * Equipment with the asset detail, and Documents. The route carries `WORKSPACE_FRAME_HANDLE` (./handle.ts),
 * and the project's layout (../wizard/ProjectLayout.tsx) draws the workspace frame (./WorkspaceFrame.tsx:
 * the sidebar with the project switcher, the pages and the project card; the 48px status footer with the
 * demo line) around every screen below it, so the frame stays mounted while the owner moves between pages
 * and remounts only with another project. This element renders the page.
 *
 * A page reads its view with `useWorkspaceView` and the frame's data (the level register) with
 * `useWorkspaceFrame` (./use-workspace.ts); the shared floor selection is `useLevelSelection`
 * (./navigation.ts).
 *
 * `WorkspacePageFailed` is the group's error element (A-1; rule 7, "Not available yet never appears
 * alone" and nobody is blocked; rule 10, "Labelled everywhere"): a page that throws while it renders is
 * replaced by the page's failure state ("This page could not be loaded. Nothing you entered is lost." with
 * "Try again"), inside the frame the project's layout keeps drawing, so the sidebar's pages stay reachable
 * and the footer keeps the demo line on the demo. Without it, React Router's default boundary replaced the
 * whole app, frame, sidebar and footer with its demo line.
 */
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { copy } from '../copy';
import { LoadFailed } from '../pages/PageState';
import { useRenderReady } from '../shell/render-ready';

export function WorkspaceLayout() {
  return <Outlet />;
}

/**
 * A workspace page that failed to render: its failure state in the page column, with "Try again", which
 * opens the same address again (React Router's boundary resets on a navigation, and the page mounts anew).
 * Nothing is written, and nothing the owner entered is lost: every answer was stored by its own request.
 */
export function WorkspacePageFailed() {
  const location = useLocation();
  const navigate = useNavigate();
  // The failure state is what this screen rendered: the render test may read it (tests/e2e/render/README.md).
  useRenderReady(true);
  // As every page does on mount (WCAG 2.4.3): the keyboard and a screen reader start in the page column.
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, []);
  const retry = () => {
    void navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true, state: location.state as unknown });
  };
  return <LoadFailed message={copy.workspace.frame.loadFailed} onRetry={retry} />;
}
