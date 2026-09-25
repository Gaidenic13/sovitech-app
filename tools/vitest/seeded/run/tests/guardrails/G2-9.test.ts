import { expect } from 'vitest';
import { pendingCase } from './_support/pending';

const pending = pendingCase(import.meta.url);

pending('G2-9 · seeded case using the wrapper with no marker on its first line', () => {
  expect(1).toBe(1);
});
