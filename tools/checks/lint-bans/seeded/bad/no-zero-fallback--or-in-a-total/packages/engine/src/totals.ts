// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
export const total = (parts: Array<number | undefined>) => parts.map((part) => part || 0);
