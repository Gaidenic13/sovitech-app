/**
 * A page's last loaded view, kept on screen while the next one loads (prompt 3 section 11: "Every data view has its
 * loading, empty, partial and error states"; the kit's RegisterTable `busy`: "the rows shown stay until the answer is
 * in"). A filter, a floor or a page changes the view's query, and `useWorkspaceView` then loads afresh; without this,
 * the register would vanish and come back on every press. The kept view is the API's own answer, shown with
 * `aria-busy` while the new one comes; nothing is computed from it. The one copy of this helper: System Scope,
 * Equipment, Zones and Topology read their views through it (part B merged Topology's own `useKeptView` into it).
 */
import { useMemo, useState } from 'react';
import type { DisplayObject } from '@sovitech/view-model/browser';
import { indexDisplays, type Displays } from '../../../wizard/use-step-view';

export interface Kept<T> {
  /** The newest loaded answer, or the previous one while the next loads. */
  readonly data: T | undefined;
  /** Its display objects by value id. */
  readonly displays: Displays;
}

export function useKept<T extends { readonly displayObjects: readonly DisplayObject[] }>(data: T | undefined): Kept<T> {
  const [kept, setKept] = useState<T | undefined>(data);
  // React's pattern for state derived from a prop: set while rendering, so the newest answer shows at once.
  if (data !== undefined && data !== kept) setKept(data);
  const shown = data ?? kept;
  const displays = useMemo(() => indexDisplays(shown?.displayObjects ?? []), [shown]);
  return { data: shown, displays };
}
