// Seeded bad input (synthetic): the marker's value computed from code, so any entry's id could stand here.
const MARKER = ['test', 'viewer', 'canvas'].join('-');
export const Chart = () => <canvas data-render-unreadable={MARKER} aria-label="TEST chart" />;
