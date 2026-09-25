// Seeded config-exclusion input: the project does not extend the root, so the root exclude list does not apply.
export default { test: { exclude: ['company/**'], projects: [{ test: { name: 'unit', include: ['**/*.test.ts'] } }] } };
