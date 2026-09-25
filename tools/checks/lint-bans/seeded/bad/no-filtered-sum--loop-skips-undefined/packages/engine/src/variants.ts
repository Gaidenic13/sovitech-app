// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before the phase 0 review round 2 (the second verification's probe,
// packages/engine/src/variants.ts line 11, and adversarial finding 7): loops that skip
// unknown items while they add up.
export function total(parts: Array<number | undefined>, start: number) {
  let sum = start;
  for (const part of parts) if (part !== undefined) sum += part;
  return sum;
}
export function totalSkipping(parts: Array<number | undefined>, start: number) {
  let sum = start;
  for (const part of parts) {
    if (part === undefined) continue;
    sum += part;
  }
  return sum;
}
