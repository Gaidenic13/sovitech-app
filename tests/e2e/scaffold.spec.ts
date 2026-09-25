import { expect, test } from '@playwright/test';

// Scaffold smoke test: the web app builds, serves and renders its placeholder.
// The brand is the logo only (prompt 3 sections 5.1 and 5.2): the page title is
// the neutral 'SOVITECH', and the heading holds the logo image with its alt text,
// no typeset wordmark and no tagline.
test('the placeholder page renders with the logo', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('SOVITECH');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveAccessibleName('SOVITECH Control');
  await expect(heading.getByRole('img', { name: 'SOVITECH Control' })).toBeVisible();
});
