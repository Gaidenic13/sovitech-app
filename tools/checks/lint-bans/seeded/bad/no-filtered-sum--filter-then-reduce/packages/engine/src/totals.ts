// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before 2026-09-25: no rule read totals that drop unknowns (phase 0 review, finding 22).
export const total = (parts: Array<number | undefined>) =>
  parts.filter((part): part is number => part !== undefined).reduce((sum, part) => sum + part, 0);
