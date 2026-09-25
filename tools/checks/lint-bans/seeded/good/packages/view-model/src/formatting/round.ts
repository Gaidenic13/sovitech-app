// Good seeded input for the lint-bans self-test: it must pass.
// Allowlisted: the formatting module owns rounding at display.
export const parsed = (text: string) => Number.parseFloat(text);
// Exempt scope of no-rounding-outside-formatting (FORMATTING_MODULE): rounding at display.
export const shown = (value: number) => new Intl.NumberFormat('en-GB').format(Math.round(value));
