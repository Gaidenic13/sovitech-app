// Good seeded input for the lint-bans self-test: it must pass.
// Allowlisted: the rule 8 number parser is where text becomes a number.
export const plain = (digits: string) => Number(digits);
