/**
 * `data-render-ready` on `<body>` (tests/e2e/render/README.md; contract.ts READY_ATTRIBUTE): set
 * once the screen has rendered the data it asked for, and removed while a screen is loading, so the
 * render test never reads a screen before its values arrived. Every page calls `useRenderReady`
 * with whether what it asked for has rendered (its data, or its load-failure state).
 *
 * The attribute belongs to the page on screen: a page that unmounts removes it, and the next page
 * sets it again when its own data has rendered.
 */
import { useLayoutEffect } from 'react';

export const RENDER_READY_ATTRIBUTE = 'data-render-ready';

export function useRenderReady(ready: boolean): void {
  useLayoutEffect(() => {
    const body = document.body;
    if (ready) body.setAttribute(RENDER_READY_ATTRIBUTE, '');
    else body.removeAttribute(RENDER_READY_ATTRIBUTE);
    return () => body.removeAttribute(RENDER_READY_ATTRIBUTE);
  }, [ready]);
}
