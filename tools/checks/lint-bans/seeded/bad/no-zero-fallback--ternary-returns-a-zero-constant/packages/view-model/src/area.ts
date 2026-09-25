// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before 2026-09-25: the rule read only literal zeros (phase 0 review, finding 22).
const NO_AREA = 0;
export const area = (value: number | undefined) => (value === undefined ? NO_AREA : value);
