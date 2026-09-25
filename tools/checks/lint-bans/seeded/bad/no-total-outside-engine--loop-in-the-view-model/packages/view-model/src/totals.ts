// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed the lint bans before the phase 0 review round 2 (adversarial finding 7): a running
// total in the view-model, outside the engine and its unknownPolicy.
export function totalArea(rows: Array<{ area: number }>, start: number) {
  let total = start;
  for (const row of rows) total += row.area;
  return total;
}
