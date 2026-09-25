// Seeded input for the lint-bans self-test (tools/checks/lint-bans/selftest.ts). Wrong on purpose.
// eslint-disable-next-line sovitech/no-zero-fallback -- the check ignores inline configuration
export const Suppressed = ({ rooms }: { rooms?: number }) => <span>{rooms ?? 0}</span>;
