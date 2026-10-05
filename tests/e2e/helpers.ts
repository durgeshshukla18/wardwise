import { expect, type Page } from '@playwright/test';

import { copy } from '../../src/app/copy.ts';

/** Collects console errors and uncaught page errors. Check the list is empty at the end. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** From the landing screen: Try demo, then wait for Today. */
export async function tryDemo(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: copy.landing.tryDemo }).click();
  await expect(page).toHaveURL('/today');
  await expect(page.getByRole('heading', { level: 1, name: copy.today.title })).toBeVisible();
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
}

export async function fontsReady(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}
