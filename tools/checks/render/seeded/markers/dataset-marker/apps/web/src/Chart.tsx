// Seeded bad input (synthetic): the marker set through the DOM dataset, outside the scan's literal forms.
import { useEffect, useRef } from 'react';

export function Chart() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current !== null) canvas.current.dataset.renderUnreadable = 'test-viewer-canvas';
  }, []);
  return <canvas ref={canvas} aria-label="TEST chart" />;
}
