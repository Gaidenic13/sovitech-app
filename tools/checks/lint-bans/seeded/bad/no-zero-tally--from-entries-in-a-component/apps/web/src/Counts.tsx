// Seeded bad input (synthetic): a tally keyed by floor, every floor started at zero.
export const emptyTally = (floors: readonly string[]) => Object.fromEntries(floors.map((floor) => [floor, 0]));
