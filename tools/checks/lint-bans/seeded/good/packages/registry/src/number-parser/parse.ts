// Good seeded input for the lint-bans self-test: it must pass.
// Allowlisted: the rule 8 number parser is where text becomes a number.
export const plain = (digits: string) => Number(digits);
// Exempt scope of no-decimal-from-text (NUMBER_PARSER): the parser builds decimals from text.
declare class Decimal {
  constructor(value: unknown);
}
export const decimalOf = (whole: string, fraction: string) => new Decimal(`${whole}.${fraction}`);
