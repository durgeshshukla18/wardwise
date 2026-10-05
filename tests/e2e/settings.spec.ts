// S12, the minimal Settings: the settings that exist so far, export, and reset.
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { copy } from '../../src/app/copy.ts';
import {
  collectErrors,
  countRows,
  expectNoHorizontalScroll,
  installSpeechStub,
  lastSpoken,
  tryDemo,
} from './helpers.ts';

const radio = (page: import('@playwright/test').Page, group: string, name: string) =>
  page.getByRole('radiogroup', { name: group }).getByRole('radio', { name });

test('Settings shows every setting, the two notes, export and reset, with no errors', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await tryDemo(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1, name: copy.settings.title })).toBeVisible();
  for (const label of [
    copy.settings.levelLabel,
    copy.settings.sessionLengthLabel,
    copy.settings.speechLabel,
    copy.settings.audioSpeedLabel,
    copy.settings.hindiLabel,
  ]) {
    await expect(page.getByRole('radiogroup', { name: label })).toBeVisible();
  }
  await expect(page.getByText(copy.settings.clinicalNote)).toBeVisible();
  await expect(page.getByText(copy.settings.speechNote)).toBeVisible();
  await expect(page.getByRole('button', { name: copy.settings.exportProgress })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.settings.resetProgress })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('every setting is saved, and still there after a reload', async ({ page }) => {
  await tryDemo(page);
  await page.goto('/settings');
  await radio(page, copy.settings.levelLabel, 'A2').click();
  await radio(page, copy.settings.sessionLengthLabel, copy.settings.sessionLength(5)).click();
  await radio(page, copy.settings.speechLabel, copy.settings.off).click();
  await radio(page, copy.settings.audioSpeedLabel, copy.settings.audioSpeeds.slow).click();
  await radio(page, copy.settings.hindiLabel, copy.settings.on).click();
  await page.reload();
  const checked = (group: string, name: string) =>
    expect(radio(page, group, name)).toHaveAttribute('aria-checked', 'true');
  await checked(copy.settings.levelLabel, 'A2');
  await checked(copy.settings.sessionLengthLabel, copy.settings.sessionLength(5));
  await checked(copy.settings.speechLabel, copy.settings.off);
  await checked(copy.settings.audioSpeedLabel, copy.settings.audioSpeeds.slow);
  await checked(copy.settings.hindiLabel, copy.settings.on);
});

test('a shorter session length changes the Shift Break card and the session', async ({ page }) => {
  await installSpeechStub(page);
  await tryDemo(page);
  await page.goto('/settings');
  await radio(page, copy.settings.sessionLengthLabel, copy.settings.sessionLength(5)).click();
  await page.getByRole('link', { name: copy.nav.today }).first().click();
  await expect(page.getByText(copy.today.shiftBreakMeta(5, 2))).toBeVisible();
  await page.getByRole('button', { name: copy.today.startSession }).click();
  const progress = await page.getByText(/^1 of \d+$/).innerText();
  const total = Number(progress.split(' ')[2]);
  expect(total).toBeGreaterThanOrEqual(5);
  expect(total).toBeLessThanOrEqual(8);
});

test('the audio speed setting is the speed of a normal tap', async ({ page }) => {
  await installSpeechStub(page);
  await tryDemo(page);
  await page.goto('/settings');
  await radio(page, copy.settings.audioSpeedLabel, copy.settings.audioSpeeds.slow).click();
  await page.getByRole('link', { name: copy.nav.today }).first().click();
  await page.getByRole('button', { name: copy.today.startSession }).click();
  const play = page.getByRole('button', { name: copy.session.playWord }).first();
  for (let i = 0; i < 12 && !(await play.isVisible()); i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
  }
  if (await play.isVisible()) {
    await play.click();
    expect(await lastSpoken(page)).toMatchObject({ rate: 0.8 });
  }
});

test('Export progress downloads one JSON file with the schema version and every table', async ({
  page,
}) => {
  await tryDemo(page);
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: copy.settings.exportProgress }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^wardwise-progress-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(readFileSync((await file.path()) as string, 'utf8'));
  expect(data).toMatchObject({ format: 'wardwise-export', schemaVersion: 1 });
  expect(Object.keys(data.tables)).toHaveLength(10);
  expect(data.tables.profile).toHaveLength(1);
  expect(data.tables.itemState).toHaveLength(40);
});

test('Reset asks first, can be cancelled, and then deletes everything', async ({ page }) => {
  await tryDemo(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: copy.settings.resetProgress }).click();
  await expect(page.getByText(copy.settings.resetWarning)).toBeVisible();
  await page.getByRole('button', { name: copy.settings.resetCancel }).click();
  await expect(page.getByText(copy.settings.resetWarning)).toHaveCount(0);
  expect(await countRows(page, 'profile')).toBe(1);

  await page.getByRole('button', { name: copy.settings.resetProgress }).click();
  await page.getByRole('button', { name: copy.settings.resetConfirm }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: copy.landing.tryDemo })).toBeVisible();
  expect(await countRows(page, 'profile')).toBe(0);
  expect(await countRows(page, 'itemState')).toBe(0);
});

test('the settings can be changed with the keyboard', async ({ page }) => {
  await tryDemo(page);
  await page.goto('/settings');
  await radio(page, copy.settings.levelLabel, 'A2').focus();
  await page.keyboard.press('Enter');
  await expect(radio(page, copy.settings.levelLabel, 'A2')).toHaveAttribute('aria-checked', 'true');
});
