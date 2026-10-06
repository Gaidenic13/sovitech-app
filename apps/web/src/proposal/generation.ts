/**
 * Generate, from the press to the stored proposal (PRD R-109, R-110; US-PROPOSAL-01, US-PROPOSAL-02; UD-07, UD-47;
 * docs/adr/0048-stored-proposal-and-price-stage.md decision 1; guardrails rule 7, rule 3).
 *
 * One `proposals.generate` POST per press, sent from the press itself and never from a page's effect, so a reload of
 * the landing, a remount (React's StrictMode runs every effect twice in development) or the landing opened from the
 * sidebar never sends one: a POST stores a new version (2.4; G4-45), and only the owner's press may ask for one
 * (US-PROPOSAL-11 AC1). The state lives here, by project, for the page session (module state, like the render-ready
 * holders): the landing (`/projects/:projectId/proposal`, ./ProposalLanding.tsx) reads it and shows
 * - the generating state (UD-07) while the request is on its way: its title, a progress bar with no number and no
 *   figure, and step 8's "Still reading <n> files…" line when the press came while documents were being read
 *   (rule 7, "Analysis still running never blocks Generate"; the same display object step 8 was served, G2-7);
 * - the failed state (UD-47) when it was refused or never reached the API: what failed, that every answer and upload
 *   is kept (the POST writes no answer, ADR 0048 decision 1), "Try again" (a new press: one POST) and "Back to review";
 * - otherwise the latest stored proposal, read again once a generation finished (`done`).
 * A reload forgets the state, never re-sends anything, and the landing then shows what is stored.
 *
 * Nothing here is ever disabled (rule 7): a press while a generation is on its way is ignored, never refused, and the
 * control that started it says so with `aria-busy` (../wizard/use-in-flight.ts).
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { isSignedOut, request } from '../api/client';

export type GenerationStatus = 'idle' | 'generating' | 'failed';

export interface GenerationState {
  readonly status: GenerationStatus;
  /** Generations that finished in this page session: the landing reads its versions again after each. */
  readonly done: number;
  /** The snapshot the last finished generation stored (the landing shows it as the latest it knows of). */
  readonly snapshotId: string | null;
  /** Step 8's "Still reading <n> files…" display when Generate was pressed while documents were being read, else null. */
  readonly stillReading: DisplayObject | null;
}

const IDLE: GenerationState = { status: 'idle', done: 0, snapshotId: null, stillReading: null };

const states = new Map<string, GenerationState>();
const listeners = new Set<() => void>();

function set(projectId: string, next: GenerationState): void {
  states.set(projectId, next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The project's generation state in this page session. */
export function generationOf(projectId: string): GenerationState {
  return states.get(projectId) ?? IDLE;
}

/**
 * A press of "Generate Proposal" (step 8) or "Try again" (UD-47) begins a generation: the landing shows the
 * generating state from now on. Returns false, and changes nothing, while one is already on its way.
 */
export function beginGeneration(projectId: string, stillReading: DisplayObject | null): boolean {
  const current = generationOf(projectId);
  if (current.status === 'generating') return false;
  set(projectId, { ...current, status: 'generating', stillReading });
  return true;
}

/** Step 8's own Continue was refused before the POST: no generation was sent, and step 8 says why. */
export function abandonGeneration(projectId: string): void {
  const current = generationOf(projectId);
  if (current.status === 'generating') set(projectId, { ...current, status: 'idle', stillReading: null });
}

/**
 * Sends the one POST of the press that began the generation. A signed-out session shows sign-in (rule 13); any other
 * refusal or a request that never reached the API is the failed state (UD-47). Never retried by itself.
 */
export async function sendGeneration(projectId: string, onSignedOut: () => void): Promise<void> {
  try {
    const answer = await request('proposals.generate', { params: { projectId }, body: {} });
    const current = generationOf(projectId);
    set(projectId, { status: 'idle', done: current.done + 1, snapshotId: answer.snapshotId, stillReading: null });
  } catch (error) {
    const current = generationOf(projectId);
    if (isSignedOut(error)) {
      set(projectId, { ...current, status: 'idle', stillReading: null });
      onSignedOut();
      return;
    }
    set(projectId, { ...current, status: 'failed' });
  }
}

/** "Back to review" from the failed state: the failure has been read; the landing shows what is stored again. */
export function dismissFailure(projectId: string): void {
  const current = generationOf(projectId);
  if (current.status === 'failed') set(projectId, { ...current, status: 'idle', stillReading: null });
}

/** The project's generation state, and "Try again" (UD-47): one POST per press, ignored while one is on its way. */
export function useGeneration(projectId: string, onSignedOut: () => void): { readonly state: GenerationState; readonly tryAgain: () => void } {
  const state = useSyncExternalStore(
    subscribe,
    () => generationOf(projectId),
    () => generationOf(projectId),
  );
  const tryAgain = useCallback(() => {
    if (!beginGeneration(projectId, generationOf(projectId).stillReading)) return;
    void sendGeneration(projectId, onSignedOut);
  }, [projectId, onSignedOut]);
  return { state, tryAgain };
}

/** Tests only: forgets every project's state (a new page session). */
export function resetGenerations(): void {
  states.clear();
  for (const listener of listeners) listener();
}
