// Seeded bad input (TEST): a test marked to fail. Playwright counts its failure as expected
// and exits 0; the run guard must fail the run.
import { expect, test } from '@playwright/test';

test.fail('TEST marked to fail', () => {
  expect('TEST').toBe('not TEST');
});
