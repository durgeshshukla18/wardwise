// Gate 1: every route in section 5 renders its placeholder with no console errors.
import { expect, test, type Page } from '@playwright/test';

import { screenRoutes } from '../../src/app/screens.ts';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

for (const screen of screenRoutes) {
  const url = screen.path.replace(':id', 'test-id');

  test(`${screen.id} ${url} renders without console errors`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1, name: screen.name })).toBeVisible();
    await page.waitForLoadState('networkidle');

    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
    expect(errors).toEqual([]);
  });
}

test('unknown URLs redirect to /', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/no-such-page');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Landing' })).toBeVisible();
  expect(errors).toEqual([]);
});
