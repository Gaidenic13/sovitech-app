// Good seeded input for the lint-bans self-test: it must pass.
// Allowlisted: the one port function reads its port from the environment.
export function readPort(raw: string | undefined): number {
  if (raw === undefined || raw === '') return 3000;
  return Number.parseInt(raw, 10);
}
