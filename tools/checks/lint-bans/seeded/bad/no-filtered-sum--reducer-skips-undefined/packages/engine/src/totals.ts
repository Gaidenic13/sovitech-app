// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before the phase 0 review round 2 (adversarial finding 7): a reduce
// that skips unknown items with a conditional, with no filter before it.
export const total = (parts: Array<number | undefined>, start: number) =>
  parts.reduce<number>((sum, part) => (part === undefined ? sum : sum + part), start);
