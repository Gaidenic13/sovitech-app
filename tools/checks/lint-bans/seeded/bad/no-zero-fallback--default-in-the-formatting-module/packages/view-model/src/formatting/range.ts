// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// The formatting module may read numbers, but it may not default a missing one to zero.
export const low = ({ value = 0 }: { value?: number }) => value;
