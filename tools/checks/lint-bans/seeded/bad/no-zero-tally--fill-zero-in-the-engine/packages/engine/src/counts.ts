// Seeded bad input (synthetic): a count per asset type started at zero for every type.
export const countsByType = (types: readonly string[]) => new Array(types.length).fill(0);
