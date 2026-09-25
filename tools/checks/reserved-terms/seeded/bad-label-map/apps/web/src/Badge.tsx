// Seeded bad input (TEST): lower-case labels in a map, shown upper-cased through CSS.
const LABELS = { done: 'final', checked: 'verified', price: 'quote', estimate: 'deviz' } as const;
export const Badge = ({ state }: { state: keyof typeof LABELS }) => <span className="uppercase">{LABELS[state]}</span>;
