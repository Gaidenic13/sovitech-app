import { describe, expect, test } from 'vitest';

// A comment may say test.skip( or { skip: true } without holding the case out.
test('G1-1 · seeded real case', () => {
  expect('G1-1 · test.only(').toContain('G1-1');
});

// Forms that run every test: options without a hold-out key, a false one, each, for, concurrent, context.
test('G1-1 · with a timeout option', { timeout: 1000, skip: false }, () => {
  expect(1).toBe(1);
});

describe.concurrent('G1-1 · a suite', () => {
  test.each([1, 2])('G1-1 · each %s', (value) => {
    expect(value).toBeGreaterThan(0);
  });
  test.for([1, 2])('G1-1 · for %s', (value, { expect: local }) => {
    local(value).toBeGreaterThan(0);
  });
});
