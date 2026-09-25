import { test } from 'vitest';

// A body that runs and asserts nothing: it passes whatever the code under test does.
test('G1-3 · seeded case with a body and no assertion', () => {
  const seen = ['TEST'].map((item) => item.toLowerCase());
  void seen;
});
