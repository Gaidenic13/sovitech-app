// Seeded bad input (synthetic): a zero floor under a shortfall.
export const Remaining = ({ area, used }: { area: number; used: number }) => <b>{Math.max(area - used, 0)}</b>;
