// Seeded bad input (G6-1 shape): the answer changes no declared output. Synthetic.
export default {
  fixture: { id: 'TEST-seed-fixture', values: { 'building.seedChoice': 'alpha' } },
  formulas: {
    'formula:seedFormula@1': () => ({ 'seed.output': 'always the same' }),
  },
};
