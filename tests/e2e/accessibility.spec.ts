import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public landing page has no automated accessibility violations', async ({ page }) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        apiKey: 'public-test-key',
        authDomain: 'daymark-test.firebaseapp.com',
        projectId: 'daymark-test',
        appId: 'public-test-app'
      })
    })
  );
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
