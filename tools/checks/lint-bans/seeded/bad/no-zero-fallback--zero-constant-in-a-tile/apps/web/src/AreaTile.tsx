// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before 2026-09-25: the rule read only literal zeros (phase 0 review, finding 22).
const NONE = 0;
export const AreaTile = ({ area }: { area?: number }) => <span>{area ?? NONE}</span>;
