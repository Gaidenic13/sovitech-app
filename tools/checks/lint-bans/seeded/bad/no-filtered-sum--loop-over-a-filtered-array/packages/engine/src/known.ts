// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before the phase 0 review round 2 (adversarial finding 7): the
// filter drops unknown items, then a loop adds up what is left.
export function total(parts: Array<number | undefined>, start: number) {
  const known = parts.filter((part): part is number => part !== undefined);
  let sum = start;
  for (const part of known) sum += part;
  return sum;
}
