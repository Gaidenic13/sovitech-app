// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// Passed dependency-cruiser and the lint bans before the phase 0 review round 2 (the second
// verification's probe, verify0b/deps): a computed import path is an edge the boundaries
// cannot see, so this reached the registry's gate issuer with no violation.
const dir = '../../../packages/registry/src/gates/';
export async function issuer() {
  const module = await import(dir + 'source');
  return module.issueTestOverrideSource;
}
