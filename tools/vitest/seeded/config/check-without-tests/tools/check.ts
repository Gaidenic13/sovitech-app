// Seeded (TEST): a pnpm check whose steps leave out the test script. Read as text only.
const STEPS = [
  { name: 'lint: ESLint', script: 'lint:eslint' },
  { name: 'checks (tools/checks)', script: 'checks' },
];
export default STEPS;
