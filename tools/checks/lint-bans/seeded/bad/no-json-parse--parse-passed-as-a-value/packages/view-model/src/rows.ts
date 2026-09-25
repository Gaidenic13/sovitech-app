// Seeded bad input (synthetic): JSON.parse passed as a callback.
export const rowsOf = (lines: string[]): unknown[] => lines.map(JSON.parse);
