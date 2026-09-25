// Good seeded input for the lint-bans self-test: it must pass.
// Allowlisted: the formatting module owns rounding at display.
export const parsed = (text: string) => Number.parseFloat(text);
