// Good seeded input for the lint-bans self-test: it must pass. A decimal from a number, and a
// literal decimal string, are not text read as a number; a count starts from 0 once.
declare class Decimal {
  constructor(value: unknown);
}
export const exact = (value: number) => new Decimal(value);
export const tenth = new Decimal('0.1');
export function countOf(items: readonly unknown[]): number {
  let n = 0;
  for (const item of items) if (item !== undefined) n += 1;
  return n;
}
