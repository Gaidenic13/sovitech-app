// Seeded config-exclusion input: projects inherit the root exclude list.
export default {
  test: {
    exclude: ['**/node_modules/**', 'company/**'],
    projects: [
      { extends: true, test: { name: 'unit', include: ['packages/*/src/**/*.test.ts'] } },
      { extends: true, test: { name: 'all', include: ['**/*.test.ts'] } },
    ],
  },
};
