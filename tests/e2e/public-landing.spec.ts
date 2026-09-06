import { expect, test } from '@playwright/test';

test('public landing page exposes the Daymark title and no browser secret', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Daymark/u);
  await expect(page.getByRole('heading', { name: /Your thoughts/u })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('GEMINI_API_KEY');
});
