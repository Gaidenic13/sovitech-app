import { describe, expect, test } from 'vitest';

describe('G1-2 · seeded suite held out by a describe-level option', { todo: true }, () => {
  test('G1-2 · a test inside it', () => {
    expect(true).toBe(true);
  });
});
