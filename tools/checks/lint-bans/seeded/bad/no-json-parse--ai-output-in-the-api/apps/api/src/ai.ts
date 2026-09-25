// Seeded bad input (synthetic): AI output parsed with JSON.parse outside a reviewed reader.
export const readProposal = (text: string): unknown => JSON.parse(text);
