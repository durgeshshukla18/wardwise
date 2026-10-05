// Every route renders without console errors at 390 px and 1280 px, and the guards send each
// visitor to the right screen.
import { expect, test } from '@playwright/test';

import { copy } from '../../src/app/copy.ts';
import { screenRoutes } from '../../src/app/screens.ts';
import { collectErrors, expectNoHorizontalScroll, tryDemo } from './helpers.ts';

// S01, S02 and S03 are real screens with their own headings.
const headingFor = (id: string, name: string) => (id === 'S03' ? copy.today.title : name);

test.describe('without a profile', () => {
  test('S01 / shows the landing screen', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: copy.appName })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.landing.tryDemo })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.landing.startFresh })).toBeVisible();
    await expect(page.getByText(copy.landing.storageNote)).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });

  for (const path of [
    '/today',
    '/start',
    '/practice',
    '/session/abc',
    '/settings',
    '/no-such-page',
  ]) {
    test(`${path} goes to /`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { level: 1, name: copy.appName })).toBeVisible();
    });
  }

  test('Start fresh asks for a first name, then goes to /start', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: copy.landing.startFresh }).click();
    await page.getByRole('button', { name: copy.landing.nameContinue }).click();
    await expect(page.getByRole('alert')).toHaveText(copy.landing.nameRequired);
    await page.getByLabel(copy.landing.nameLabel).fill('Anna');
    await page.getByRole('button', { name: copy.landing.nameContinue }).click();
    await expect(page).toHaveURL('/start');

    // Not onboarded: every other route goes to /start, and so does /.
    await page.goto('/today');
    await expect(page).toHaveURL('/start');
    await page.goto('/');
    await expect(page).toHaveURL('/start');
    expect(errors).toEqual([]);
  });

  test('Start fresh can go back to the two choices', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: copy.landing.startFresh }).click();
    await page.getByRole('button', { name: copy.landing.nameBack }).click();
    await expect(page.getByRole('button', { name: copy.landing.tryDemo })).toBeVisible();
  });
});

test.describe('with the demo profile', () => {
  test('the landing and onboarding routes go to /today', async ({ page }) => {
    await tryDemo(page);
    await page.goto('/');
    await expect(page).toHaveURL('/today');
    await page.goto('/start');
    await expect(page).toHaveURL('/today');
  });

  for (const screen of screenRoutes.filter((entry) => !['S01', 'S02'].includes(entry.id))) {
    const url = screen.path.replace(':id', 'test-id');

    // A live session only exists in memory, so a visit with no session goes to Today.
    if (screen.id === 'S05') {
      test('S05 /session/test-id goes to /today when there is no live session', async ({
        page,
      }) => {
        await tryDemo(page);
        await page.goto(url);
        await expect(page).toHaveURL('/today');
      });
      continue;
    }

    test(`${screen.id} ${url} renders without console errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await tryDemo(page);
      await page.goto(url);
      await expect(
        page.getByRole('heading', { level: 1, name: headingFor(screen.id, screen.name) }),
      ).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalScroll(page);
      expect(errors).toEqual([]);
    });
  }

  test('an unknown URL goes to /today', async ({ page }) => {
    await tryDemo(page);
    await page.goto('/no-such-page');
    await expect(page).toHaveURL('/today');
  });
});
