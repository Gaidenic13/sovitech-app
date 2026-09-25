import { expect, test } from 'vitest';
import { helper } from './does-not-exist-seeded-helper';

test('G2-10 · seeded case whose import fails', () => {
  expect(helper).toBeDefined();
});
