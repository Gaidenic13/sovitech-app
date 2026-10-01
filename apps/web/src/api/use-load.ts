/**
 * Loading a screen's data (prompt 3 section 11: every data view has its loading, empty, partial and
 * error states). A load that fails keeps the page usable: the page shows its error state with a
 * retry, and nothing the owner answered is lost (every answer is stored by its own request, PRD
 * R-009 "Until decided"). A 401 means the session is gone: sign-in shows (rule 13).
 */
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { useOnSignedOut } from '../session/SessionProvider';
import { ApiError, isAbort, isSignedOut } from './client';

export type LoadState<T> =
  | { readonly status: 'loading'; readonly data?: T }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'failed'; readonly error: ApiError | Error; readonly data?: T };

export interface Loaded<T> {
  readonly state: LoadState<T>;
  /** Loads again. With `quiet`, the data on screen stays while the new answer comes (a refresh, not a new screen). */
  readonly reload: (options?: { readonly quiet?: boolean }) => Promise<void>;
}

/**
 * Runs `load` on mount and whenever `deps` change; the previous request is aborted. `reload`
 * runs it again on demand (after a write, on a retry, on a poll).
 */
export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, deps: DependencyList): Loaded<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const onSignedOut = useOnSignedOut();
  const loadRef = useRef(load);
  loadRef.current = load;
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (quiet: boolean) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      if (!quiet) setState({ status: 'loading' });
      try {
        const data = await loadRef.current(controller.signal);
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      } catch (error) {
        if (isAbort(error) || controller.signal.aborted) return;
        if (isSignedOut(error)) {
          onSignedOut();
          return;
        }
        setState((previous) => ({
          status: 'failed',
          error: error instanceof Error ? error : new Error('load_failed'),
          ...(previous.data === undefined ? {} : { data: previous.data }),
        }));
      }
    },
    [onSignedOut],
  );

  useEffect(() => {
    void run(false);
    return () => controllerRef.current?.abort();
    // The caller's deps decide when the load runs again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback((options?: { readonly quiet?: boolean }) => run(options?.quiet === true), [run]);
  return { state, reload };
}
