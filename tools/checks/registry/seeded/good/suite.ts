// Seeded control input: a TEST implementation that the answer reaches. Synthetic.
export default {
  fixture: { id: 'TEST-seed-fixture', values: { 'building.seedChoice': 'alpha' } },
  formulas: {
    'formula:seedFormula@1': (inputs) => ({ 'seed.output': inputs['building.seedChoice'] === 'alpha' ? 'first' : 'second' }),
  },
};
