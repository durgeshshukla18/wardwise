// Helpers that play a session through the real screens.
import { expect, type Page } from '@playwright/test';

import { copy } from '../../src/app/copy.ts';
import { items } from './content.ts';

export type Mode = 'pointer' | 'keyboard';

const find = (predicate: (item: (typeof items)[number]) => boolean) => {
  const found = items.find(predicate);
  if (!found) throw new Error('Content item not found for the current exercise');
  return found;
};
export const itemFor = (page: Page) =>
  page
    .locator('[data-item-id]')
    .first()
    .getAttribute('data-item-id')
    .then((id) => find((entry) => entry.id === id));

/** The option text that is right for this exercise, from the content. */
export async function correctOption(page: Page, exercise: string) {
  const item = await itemFor(page);
  if (exercise === 'E2') return item.article as string;
  if (exercise === 'E3' || exercise === 'E4') return item.en;
  return item.de; // E5: the word that belongs in the gap
}

/**
 * Answers the current exercise. `right` picks the correct answer, otherwise a wrong one.
 * Returns the exercise code.
 */
export async function answerCurrent(page: Page, mode: Mode, right: boolean): Promise<string> {
  const exercise = (await page
    .locator('[data-exercise]')
    .first()
    .getAttribute('data-exercise')) as string;
  if (exercise === 'E1') {
    if (mode === 'keyboard') await page.keyboard.press('Enter');
    else await page.getByRole('button', { name: copy.session.gotIt }).click();
    return exercise;
  }
  const item = await itemFor(page);
  if (exercise === 'E6' || exercise === 'E9') {
    const field = page.getByLabel(copy.session.typeLabel);
    await field.fill(right ? (item.accepted[0] as string) : 'zzz');
    if (mode === 'keyboard') await field.press('Enter');
    else await page.getByRole('button', { name: copy.session.submit }).click();
    return exercise;
  }
  const answer = await correctOption(page, exercise);
  const values = await page
    .locator('[data-option]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-option')));
  const target = values.indexOf(answer);
  const index = right ? target : target === 0 ? 1 : 0;
  expect(index, `option for ${exercise} ${answer}`).toBeGreaterThanOrEqual(0);
  if (mode === 'keyboard') await page.keyboard.press(String(index + 1));
  else await page.locator('[data-option]').nth(index).click();
  return exercise;
}

export async function continueAfterFeedback(page: Page, mode: Mode) {
  const next = page.getByRole('button', { name: copy.session.next });
  await expect(next).toBeVisible();
  if (mode === 'keyboard') await page.keyboard.press('Enter');
  else await next.click();
}

/** Plays the whole session. Every third answer is wrong, so feedback and retries run too. */
export async function playSession(page: Page, mode: Mode, allRight = false) {
  const summary = page.getByRole('heading', { level: 1, name: copy.summary.title });
  let answered = 0;
  for (let step = 0; step < 60; step++) {
    if (await summary.isVisible()) return;
    await page.locator('[data-exercise]').first().waitFor();
    const wrong = !allRight && answered % 3 === 2;
    const exercise = await answerCurrent(page, mode, !wrong);
    answered += 1;
    if (exercise !== 'E1') {
      await expect(page.getByRole('status')).toBeVisible();
      await continueAfterFeedback(page, mode);
    }
    await page.waitForTimeout(20);
  }
  await expect(summary).toBeVisible();
}
