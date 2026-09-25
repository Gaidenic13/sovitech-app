// Seeded bad input (TEST): a render run that holds tests out with test.skip and test.fixme,
// and checks none of the screens of screens.ts. Playwright alone exits 0 on it; the run guard
// (tests/e2e/render/run-guard-reporter.ts) must fail it (phase 0 round 2 review, finding 6(d)).
import { expect, test } from '@playwright/test';

test('TEST passes', () => {
  expect('TEST').toBe('TEST');
});

test.skip('TEST held out with test.skip', () => {
  expect('TEST').toBe('TEST');
});

test.fixme('TEST held out with test.fixme', () => {
  expect('TEST').toBe('TEST');
});
