import { describe, expect, test } from 'vitest';

describe('G1-6 · seeded suite held out by a describe-level option', { skip: true }, () => {
  test('G1-6 · a test inside it', () => {
    expect(1).toBe(1);
  });
});
