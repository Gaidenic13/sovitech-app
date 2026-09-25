// Seeded bad input (synthetic): arithmetic that only coerces text into a number.
export const floors = (raw: string) => (raw as unknown as number) - 0;
