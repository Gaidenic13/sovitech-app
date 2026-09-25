// Good seeded input for the lint-bans self-test: it must pass.
// A filter on a flag, a reduce with no filter, and zeros that are not fallbacks.
const FIRST_INDEX = 0;
export const inScopePoints = (items: Array<{ inScope: boolean; points: number }>, start: number) =>
  items.filter((item) => item.inScope).reduce((sum, item) => sum + item.points, start);
export const first = <T,>(list: readonly T[]) => list[FIRST_INDEX];
export const offset = (hasHeader: boolean) => (hasHeader ? 1 : 0);
export const byId = (rows: Array<{ id: string } | undefined>) =>
  rows.filter((row) => row !== undefined).reduce((map, row) => map.set(row.id, row), new Map<string, { id: string }>());
