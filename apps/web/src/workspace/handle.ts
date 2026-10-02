/**
 * Which project screens sit in the workspace frame (docs/adr/0043-workspace-navigation-and-shell.md):
 * the route of the workspace group (../routes.tsx) carries this handle, and the project's layout
 * (../wizard/ProjectLayout.tsx) draws the frame (sidebar and status footer) for every screen below it.
 * The wizard's steps and UD-45 keep phase 3's shell.
 */
import { useMatches } from 'react-router';

export interface WorkspaceFrameHandle {
  readonly workspaceFrame: true;
}

export const WORKSPACE_FRAME_HANDLE: WorkspaceFrameHandle = { workspaceFrame: true };

export function isWorkspaceFrameHandle(handle: unknown): handle is WorkspaceFrameHandle {
  return typeof handle === 'object' && handle !== null && (handle as { workspaceFrame?: unknown }).workspaceFrame === true;
}

/** Whether the screen on display is a workspace page (it sits under the workspace group's route). */
export function useInWorkspace(): boolean {
  return useMatches().some((match) => isWorkspaceFrameHandle(match.handle));
}
