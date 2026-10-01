/**
 * One owner write at a time from a control (guardrails rule 7, "Nobody is blocked"; section 8, the
 * events are counted once; the final verification of phase 3, new problem 1: a double-click on step
 * 4's "Skip for now" sent two skips).
 *
 * A control that writes (Next, Continue, Generate, Skip for now, Save, Yes, Choose this value, an
 * inline ask's Save) claims the control before it sends: while its request is on its way, every
 * further press is ignored, and the control says so with `aria-busy` (the kit's buttons have no
 * disabled state: rule 7). The guard is a ref, so a second press that arrives before React renders
 * again (a double-click, Enter held down, Enter then a click) is ignored too, not only one that
 * arrives after the busy state shows.
 *
 * The control takes presses again once the answer is in: `release` after a refusal, or `run`, which
 * releases whatever the answer. A write whose answer moves the owner to another page (Continue,
 * Generate, a new project's Next) keeps the claim on success: the control leaves with its page, and
 * a press in the moment before the page changes is not sent twice.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

export interface InFlight {
  /** A write from this control is on its way (`aria-busy`; presses are ignored, never refused). */
  readonly busy: boolean;
  /** Claims the control for one write: true when the caller may send, false while a write is on its way. */
  readonly claim: () => boolean;
  /** The answer is in: the control takes presses again. */
  readonly release: () => void;
  /**
   * Claims the control, runs `write` and releases the control whatever the answer. A press while a
   * write is on its way runs nothing and resolves to undefined.
   */
  readonly run: <T>(write: () => Promise<T>) => Promise<T | undefined>;
}

export function useInFlight(): InFlight {
  const flying = useRef(false);
  const [busy, setBusy] = useState(false);

  const claim = useCallback(() => {
    if (flying.current) return false;
    flying.current = true;
    setBusy(true);
    return true;
  }, []);

  const release = useCallback(() => {
    flying.current = false;
    setBusy(false);
  }, []);

  const run = useCallback(
    async <T>(write: () => Promise<T>): Promise<T | undefined> => {
      if (!claim()) return undefined;
      try {
        return await write();
      } finally {
        release();
      }
    },
    [claim, release],
  );

  return useMemo(() => ({ busy, claim, release, run }), [busy, claim, release, run]);
}
