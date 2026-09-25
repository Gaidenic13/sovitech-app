// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before the phase 0 review round 2 (adversarial finding 12):
// .cts files had no ESLint configuration, so no ban read this module.
export const floors = (value?: number) => value || 0;
