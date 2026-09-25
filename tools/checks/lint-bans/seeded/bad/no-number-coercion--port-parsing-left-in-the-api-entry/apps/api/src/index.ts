// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before 2026-09-25, when the whole API entry was allowlisted
// (phase 0 review, finding 22). Only apps/api/src/port.ts is now.
export const floors = (query: { floors: string }) => Number.parseInt(query.floors, 10);
