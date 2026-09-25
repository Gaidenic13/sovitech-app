// Seeded config-exclusion input.
export default {
  testDir: '.',
  testIgnore: ['**/company/**'],
  projects: [{ name: 'e2e', testDir: 'tests/e2e' }, { name: 'root' }],
};
