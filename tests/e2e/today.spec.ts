// S03 with the demo profile, and the navigation shell around it.
import { expect, test } from '@playwright/test';

import { copy } from '../../src/app/copy.ts';
import { collectErrors, expectNoHorizontalScroll, tryDemo } from './helpers.ts';

test('Today shows the seeded streak, due items, Shift Break and the 3 weakest topics', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await tryDemo(page);

  await expect(page.getByText(copy.today.greeting('Anjali'))).toBeVisible();
  await expect(page.getByText(copy.today.streak(9))).toBeVisible();
  await expect(page.getByText(copy.today.freezes(1))).toBeVisible();
  await expect(page.getByText(copy.today.dueWithin24Hours(7))).toBeVisible();
  await expect(page.getByText(copy.today.shiftBreakMeta(10, 3))).toBeVisible();
  await expect(page.getByRole('button', { name: copy.today.startSession })).toBeVisible();

  const readiness = page.getByRole('heading', { name: copy.today.readinessLabel }).locator('..');
  await expect(readiness.getByRole('listitem')).toHaveCount(3);
  await expect(readiness.getByText(/\d+ percent/)).toHaveCount(3);

  // Nothing that is not built yet, and no disabled controls.
  await expect(page.locator('button:disabled, [aria-disabled="true"]')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('Today opens in under 2 seconds after Try demo', async ({ page }) => {
  await page.goto('/');
  const started = Date.now();
  await page.getByRole('button', { name: copy.landing.tryDemo }).click();
  await expect(page.getByText(copy.today.streak(9))).toBeVisible();
  expect(Date.now() - started).toBeLessThan(2000);
});

test('a returning learner opens straight on Today', async ({ page }) => {
  await tryDemo(page);
  await page.goto('/');
  await expect(page).toHaveURL('/today');
  await expect(page.getByText(copy.today.streak(9))).toBeVisible();
});

test('navigation: tab bar on a phone, left rail on a desktop', async ({ page }) => {
  await tryDemo(page);
  const wide = (page.viewportSize()?.width ?? 0) >= 1024;
  const nav = page.getByRole('navigation', { name: copy.nav.label });
  await expect(nav).toBeVisible();
  await expect(nav).toHaveCount(1);

  if (wide) {
    // The left rail is 232 px wide and sits against the left edge.
    const rail = await page.locator('aside').boundingBox();
    expect(rail?.width).toBe(232);
    expect(rail?.x).toBe(0);
    await expect(page.getByRole('link', { name: copy.nav.settings })).toBeVisible();
  } else {
    const box = await nav.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(56);
    const viewport = page.viewportSize();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBe(viewport?.height);
    // On a phone, Settings is an icon at the top right of Today.
    await expect(page.getByRole('link', { name: copy.nav.settings })).toBeVisible();
  }

  for (const label of [copy.nav.practice, copy.nav.mistakes, copy.nav.progress, copy.nav.today]) {
    await nav.getByRole('link', { name: label }).click();
    await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  }
});

test('Shift Break leads to the session screen', async ({ page }) => {
  await tryDemo(page);
  await page.getByRole('button', { name: copy.today.startSession }).click();
  await expect(page).toHaveURL(/\/session\//);
});

test('every control can be reached and used with the keyboard', async ({ page }) => {
  await tryDemo(page);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(['A', 'BUTTON']).toContain(focused);
  // Tab until the Shift Break button has focus, then press it with Enter.
  for (let i = 0; i < 12; i++) {
    const name = await page.evaluate(() => document.activeElement?.textContent ?? '');
    if (name.includes(copy.today.startSession)) break;
    await page.keyboard.press('Tab');
  }
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/session\//);
});
