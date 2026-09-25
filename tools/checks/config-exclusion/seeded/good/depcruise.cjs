// Seeded config-exclusion input.
module.exports = {
  forbidden: [{ name: 'no-company-imports', severity: 'error', from: {}, to: { path: '^company/' } }],
  options: {},
};
