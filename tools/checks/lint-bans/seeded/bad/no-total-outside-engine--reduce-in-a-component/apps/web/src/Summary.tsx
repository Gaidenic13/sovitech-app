// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before the phase 0 review round 2 (adversarial finding 7): a total
// made in a screen, outside the engine and its unknownPolicy.
export const Summary = ({ parts, start }: { parts: number[]; start: number }) => (
  <span>{parts.reduce((sum, part) => sum + part, start)}</span>
);
