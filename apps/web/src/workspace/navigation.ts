/**
 * Where the workspace's pages live and how they link (docs/adr/0043-workspace-navigation-and-shell.md):
 * one path per built page (`WORKSPACE_PAGES`, the contract's list, in the sidebar's order), the shared
 * floor selection kept in the `level` search parameter (ADR 0043 decision 6; prompt 3 phase 4 "Shared
 * floor selection": a view state that writes nothing, PRD R-077), and the targets of the owner actions a
 * view offers beside a "Not available yet" line (the contract's `WorkspaceAction`: each opens a built
 * page, PRD R-012 "Until decided").
 *
 * No path here leads to a page that is not built (R-146 "Until decided"): Overview, Property, Alarms,
 * Reports and Metrics have none.
 */
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { LevelQuerySchema, type WorkspaceAction, type WorkspacePage } from '@sovitech/view-model/browser';

/** Each built page's path segment under `/projects/:projectId/`. */
export const PAGE_SEGMENTS: Readonly<Record<WorkspacePage, string>> = {
  proposal: 'proposal',
  system_scope: 'system-scope',
  topology: 'topology',
  zones: 'zones',
  equipment: 'equipment',
  documents: 'documents',
};

/** The search parameter that holds the shared floor selection (a `LevelOption.key`). */
export const LEVEL_PARAM = 'level';

/** The pages that read the floor selection; the sidebar keeps it on its links to them. */
export const PAGES_WITH_LEVEL: ReadonlySet<WorkspacePage> = new Set<WorkspacePage>(['system_scope', 'topology', 'zones', 'equipment']);

/** A page's path, with the floor selection kept where the page reads it. */
export function pagePath(projectId: string, page: WorkspacePage, level?: string): string {
  const path = `/projects/${projectId}/${PAGE_SEGMENTS[page]}`;
  if (level === undefined || !PAGES_WITH_LEVEL.has(page)) return path;
  return `${path}?${new URLSearchParams({ [LEVEL_PARAM]: level }).toString()}`;
}

/** The built page a project path shows (`/projects/<id>/equipment/<asset>` is Equipment's), or undefined. */
export function pageOfPath(pathname: string): WorkspacePage | undefined {
  const segment = /^\/projects\/[^/]+\/([^/?#]+)/u.exec(pathname)?.[1];
  if (segment === undefined) return undefined;
  const found = (Object.entries(PAGE_SEGMENTS) as Array<[WorkspacePage, string]>).find(([, value]) => value === segment);
  return found?.[0];
}

/** A floor selection read from the URL: a level key of the contract's form, else none (a malformed one is ignored). */
export function levelOfSearch(search: URLSearchParams): string | undefined {
  const raw = search.get(LEVEL_PARAM);
  if (raw === null) return undefined;
  const parsed = LevelQuerySchema.safeParse({ level: raw });
  return parsed.success ? parsed.data.level : undefined;
}

export interface LevelSelection {
  /** The selected level's key, or undefined for "All floors". */
  readonly level: string | undefined;
  /** Selects a level (undefined: all floors). It changes the view only; nothing is written. */
  readonly setLevel: (level: string | undefined) => void;
}

/** The shared floor selection of the page on screen (the `level` search parameter). */
export function useLevelSelection(): LevelSelection {
  const [search, setSearch] = useSearchParams();
  const level = levelOfSearch(search);
  const setLevel = useCallback(
    (next: string | undefined) => {
      setSearch(
        (previous) => {
          const params = new URLSearchParams(previous);
          if (next === undefined) params.delete(LEVEL_PARAM);
          else params.set(LEVEL_PARAM, next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearch],
  );
  return { level, setLevel };
}

/** The search parameter that opens Documents with its upload surface open (UD-21). */
export const UPLOAD_PARAM = 'upload';
export const UPLOAD_OPEN = 'open';

/**
 * Where an owner action beside a "Not available yet" line or an empty register leads (the contract's
 * `WORKSPACE_ACTIONS`): `upload_document` opens Documents with its upload surface open; `enter_floors`
 * opens step 3, where the floors row has Edit (R-077); `choose_systems` opens System Scope (R-071).
 */
export function workspaceActionPath(projectId: string, action: WorkspaceAction): string {
  switch (action) {
    case 'upload_document':
      return `${pagePath(projectId, 'documents')}?${new URLSearchParams({ [UPLOAD_PARAM]: UPLOAD_OPEN }).toString()}`;
    case 'enter_floors':
      return `/projects/${projectId}/steps/3`;
    case 'choose_systems':
      return pagePath(projectId, 'system_scope');
  }
}
