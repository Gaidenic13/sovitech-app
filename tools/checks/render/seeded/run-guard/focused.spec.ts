// Seeded bad input (TEST): a focused test. With forbidOnly set only in CI, a local run would
// check this test alone and exit 0; playwright.config.ts sets forbidOnly always.
import { expect, test } from '@playwright/test';

test.only('TEST focused with test.only', () => {
  expect('TEST').toBe('TEST');
});

test('TEST left out by the focus', () => {
  expect('TEST').toBe('TEST');
});
