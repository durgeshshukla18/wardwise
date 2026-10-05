// Saves the checkpoint screenshots to docs/screenshots. Run with `npm run screenshots`.
import { test } from '@playwright/test';

import { fontsReady, tryDemo } from './helpers.ts';

test.skip(!process.env.SCREENSHOTS, 'Only runs through npm run screenshots');

const widthOf = (page: { viewportSize(): { width: number } | null }) => page.viewportSize()?.width;

test('S01 landing', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await fontsReady(page);
  await page.screenshot({
    path: `docs/screenshots/s01-landing-${widthOf(page)}.png`,
    fullPage: true,
  });
});

test('S03 today', async ({ page }) => {
  await tryDemo(page);
  await page.waitForLoadState('networkidle');
  await fontsReady(page);
  await page.screenshot({
    path: `docs/screenshots/s03-today-${widthOf(page)}.png`,
    fullPage: true,
  });
});
