/**
 * The workspace frame's data for the pages inside it, and the one way a workspace page reads its view
 * (docs/adr/0043-workspace-navigation-and-shell.md; docs/adr/0044-workspace-api-contract.md).
 *
 * - `useWorkspaceFrame()`: what `GET /api/projects/:projectId/workspace` served (the built pages, the
 *   project card, the footer's "Still reading" line and the level register, with their display
 *   objects), its load state and `reload`. The frame (./WorkspaceFrame.tsx) loads it once per project
 *   and reads it again while files are being read; a page that changes what the frame shows (an
 *   upload, a delete) calls `reload({ quiet: true })`.
 * - `useWorkspaceView(route, { params, query })`: loads a workspace route of the contract for the
 *   project on screen (its 2xx body parsed with the route's schema by the client), publishes its
 *   envelope to the header, and sets `data-render-ready` once the page has rendered what it asked for
 *   (its view, or its load-failure state). `displays` maps value ids to the display objects it served.
 *   Pages render every value through the kit's Value, StatusLine or NotAvailableYet with them.
 */
import { createContext, useContext, useEffect, useMemo } from 'react';
import type { LevelRegister, WorkspaceFrameResponse, WorkspacePage } from '@sovitech/view-model/browser';
import { request, type ResponseOf } from '../api/client';
import { useLoad, type LoadState } from '../api/use-load';
import { useRenderReady } from '../shell/render-ready';
import { useWizard, type ScreenEnvelope } from '../wizard/WizardProvider';
import { indexDisplays, type Displays } from '../wizard/use-step-view';

export interface WorkspaceFrameValue {
  readonly state: LoadState<WorkspaceFrameResponse>;
  /** The frame's display objects by value id (the project card, the footer line, the level labels). */
  readonly displays: Displays;
  /** The built pages, in the sidebar's order: the served list once loaded. */
  readonly pages: readonly WorkspacePage[];
  /** The level register (the floor lists and filters of every page, PRD R-077), once loaded. */
  readonly levels: LevelRegister | undefined;
  readonly reload: (options?: { readonly quiet?: boolean }) => Promise<void>;
}

export const WorkspaceFrameContext = createContext<WorkspaceFrameValue | null>(null);

/** The workspace frame of the page on screen. */
export function useWorkspaceFrame(): WorkspaceFrameValue {
  const value = useContext(WorkspaceFrameContext);
  if (value === null) throw new Error('useWorkspaceFrame is used outside the workspace frame');
  return value;
}

/** The workspace frame, or null on a screen outside it. */
export function useOptionalWorkspaceFrame(): WorkspaceFrameValue | null {
  return useContext(WorkspaceFrameContext);
}

/** The contract's workspace views a page reads (each answers the envelope plus its view). */
export type WorkspaceViewRoute = 'workspace.documents' | 'workspace.systemScope' | 'workspace.equipment' | 'workspace.asset' | 'workspace.zones' | 'workspace.topology';

export interface WorkspaceViewOptions {
  /** Route parameters beyond `projectId` (`assetId` for the asset detail). */
  readonly params?: Readonly<Record<string, string>>;
  /** The view's query (filters, the floor selection, the page); undefined entries are not sent. */
  readonly query?: Readonly<Record<string, string | undefined>>;
}

export interface WorkspaceViewLoad<Id extends WorkspaceViewRoute> {
  readonly state: LoadState<ResponseOf<Id>>;
  /** The loaded response, kept while a quiet reload runs and after a reload fails. */
  readonly data: ResponseOf<Id> | undefined;
  readonly displays: Displays;
  readonly reload: (options?: { readonly quiet?: boolean }) => Promise<void>;
}

function keyOf(options: WorkspaceViewOptions): string {
  const sorted = (record: Readonly<Record<string, string | undefined>> | undefined) =>
    Object.entries(record ?? {})
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([sorted(options.params), sorted(options.query)]);
}

export function useWorkspaceView<Id extends WorkspaceViewRoute>(route: Id, options: WorkspaceViewOptions = {}): WorkspaceViewLoad<Id> {
  const { projectId, publishEnvelope } = useWizard();
  const key = keyOf(options);
  const loaded = useLoad(
    (signal) =>
      request(route, {
        params: { projectId, ...options.params },
        ...(options.query === undefined ? {} : { query: options.query }),
        signal,
      }) as Promise<ResponseOf<Id>>,
    [projectId, route, key],
  );
  const { state, reload } = loaded;
  const data = state.data;
  // Every workspace view is the contract's screen envelope plus its view (common.ts `screenEnvelope`).
  const envelope = data as unknown as ScreenEnvelope | undefined;
  useEffect(() => {
    if (envelope !== undefined) publishEnvelope(envelope);
  }, [envelope, publishEnvelope]);
  useRenderReady(state.status !== 'loading');
  const displays = useMemo(() => indexDisplays(envelope?.displayObjects ?? []), [envelope]);
  return { state, data, displays, reload };
}
