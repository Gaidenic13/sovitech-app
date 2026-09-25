// Seeded bad input (synthetic): another component borrows the viewer canvas's entry for a
// canvas of its own, whose drawn numbers the render test would then not read.
export const Chart = () => <canvas data-render-unreadable="test-viewer-canvas" aria-label="TEST chart" />;
