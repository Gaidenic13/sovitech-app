/**
 * The app's entry and shell (replaces phase 0's placeholder smoke test, tests/e2e/scaffold.spec.ts,
 * now that `/` chooses between sign-in and the project list). The brand is the logo only (prompt 3
 * sections 5.1 and 5.2; PRD R-138, R-148, R-149): the header holds the logo image with its alt text
 * "SOVITECH Control", with no typeset wordmark and no tagline. The document title names the page,
 * "<page> – SOVITECH" (WCAG 2.4.2; apps/web/src/routes.tsx, phase 3 part B), never a project's name
 * or a tagline. Nothing of a project shows before sign-in (R-133; rule 13).
 */
import { expect, test } from '@playwright/test';
import { signIn } from './support/wizard';

test('US-ADMIN-01 · US-ADMIN-08 · US-ADMIN-14 · R-133 · R-138 · R-148 · WCAG 2.4.2: signed out, `/` opens sign-in, with the logo and no tagline; signed in, it opens the project list', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/sign-in$/u);
  await expect(page).toHaveTitle('Sign in – SOVITECH');
  await expect(page.getByRole('banner').getByRole('img', { name: 'SOVITECH Control' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await expect(page.getByText(/BUILDING INTELLIGENCE|SUSTAINABLE TOMORROW/iu)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Demo Hotel Bucharest/u })).toHaveCount(0);

  await signIn(page);
  await expect(page).toHaveURL(/\/projects$/u);
  await page.goto('/');
  await expect(page).toHaveURL(/\/projects$/u);
  await expect(page.getByRole('list', { name: 'Your projects' })).toBeVisible();
  await expect(page).toHaveTitle('Your projects – SOVITECH');
});
