/**
 * `data-render-ready` on `<body>` (tests/e2e/render/README.md; contract.ts READY_ATTRIBUTE): set
 * once the screen has rendered the data it asked for, and removed while a screen is loading, so the
 * render test never reads a screen before its values arrived. Every page calls `useRenderReady`
 * with whether what it asked for has rendered (its data, or its load-failure state).
 *
 * A screen may have more than one part that asks for data (phase 4: the workspace frame's sidebar
 * and the page inside it, docs/adr/0043-workspace-navigation-and-shell.md). Each caller holds one
 * entry, and the attribute is set only while at least one caller is mounted and every mounted
 * caller is ready. With one caller this is the phase 3 behaviour exactly: the attribute follows its
 * `ready`.
 *
 * The attribute belongs to the parts on screen: a part that unmounts drops its entry, and the next
 * page sets the attribute again when its own data has rendered.
 */
import { useId, useLayoutEffect } from 'react';

export const RENDER_READY_ATTRIBUTE = 'data-render-ready';

/** Every mounted caller and whether it is ready (module state: one page, one body). */
const holders = new Map<string, boolean>();

function apply(): void {
  const body = document.body;
  const ready = holders.size > 0 && [...holders.values()].every(Boolean);
  if (ready) body.setAttribute(RENDER_READY_ATTRIBUTE, '');
  else body.removeAttribute(RENDER_READY_ATTRIBUTE);
}

export function useRenderReady(ready: boolean): void {
  const id = useId();
  useLayoutEffect(() => {
    holders.set(id, ready);
    apply();
    return () => {
      holders.delete(id);
      apply();
    };
  }, [id, ready]);
}
