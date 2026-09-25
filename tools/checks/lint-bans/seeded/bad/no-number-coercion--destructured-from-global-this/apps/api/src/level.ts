// Seeded bad input (synthetic): Number taken out of globalThis under another name.
const { Number: N } = globalThis;
export const level = (raw: string) => N(raw);
