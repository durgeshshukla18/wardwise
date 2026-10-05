// S02: three questions, five placement words, a result. Then the first session for a new learner.
import { expect, test, type Page } from '@playwright/test';

import { copy } from '../../src/app/copy.ts';
import { buildPlacement } from '../../src/features/onboarding/placement.ts';
import { items } from './content.ts';
import { playSession } from './play.ts';
import {
  collectErrors,
  countRows,
  expectNoHorizontalScroll,
  installSpeechStub,
} from './helpers.ts';

const questions = buildPlacement(items);

async function startFresh(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: copy.landing.startFresh }).click();
  await page.getByLabel(copy.landing.nameLabel).fill('Anna');
  await page.getByRole('button', { name: copy.landing.nameContinue }).click();
  await expect(page).toHaveURL('/start');
}

async function answerQuestions(page: Page) {
  await page.getByRole('heading', { name: copy.onboarding.goalQuestion }).waitFor();
  await page.locator('[data-option]').first().click();
  await page.getByRole('heading', { name: copy.onboarding.timeQuestion }).waitFor();
  await page.locator('[data-option]').nth(1).click();
  await page.getByLabel(copy.onboarding.levelLabel).fill('I know a few words');
  await page.getByRole('button', { name: copy.onboarding.next }).click();
}

/** Answers the 5 placement words. `right` of them are correct, the rest wrong. */
async function placement(page: Page, right: number) {
  for (const [index, question] of questions.entries()) {
    await expect(page.getByText(copy.onboarding.placementStep(index + 1, 5))).toBeVisible();
    const wrong = question.options.find((option) => option !== question.correctOption) as string;
    const choice = index < right ? question.correctOption : wrong;
    await page.locator(`[data-option="${choice.replace(/"/g, '\\"')}"]`).click();
  }
}

test('a high score offers A2, and the choice is saved with no item state created', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await startFresh(page);
  await expectNoHorizontalScroll(page);
  await answerQuestions(page);
  await placement(page, 4);
  await expect(page.getByText(copy.onboarding.resultScore(4, 5))).toBeVisible();
  await expect(page.getByText(copy.onboarding.resultOfferA2)).toBeVisible();
  await page.getByRole('button', { name: copy.onboarding.startA2 }).click();
  await expect(page).toHaveURL('/today');
  await expect(page.getByText(copy.today.nothingDueYet)).toBeVisible();
  expect(await countRows(page, 'itemState')).toBe(0);
  expect(await countRows(page, 'attempts')).toBe(0);

  await page.goto('/settings');
  await expect(page.getByRole('radio', { name: copy.settings.levels.A2 })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(errors).toEqual([]);
});

test('Stay at A1 keeps A1', async ({ page }) => {
  await startFresh(page);
  await answerQuestions(page);
  await placement(page, 5);
  await page.getByRole('button', { name: copy.onboarding.stayA1 }).click();
  await expect(page).toHaveURL('/today');
  await page.goto('/settings');
  await expect(page.getByRole('radio', { name: copy.settings.levels.A1 })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('a low score places the learner at A1 with no offer', async ({ page }) => {
  await startFresh(page);
  await answerQuestions(page);
  await placement(page, 2);
  await expect(page.getByText(copy.onboarding.resultScore(2, 5))).toBeVisible();
  await expect(page.getByText(copy.onboarding.resultStartA1)).toBeVisible();
  await expect(page.getByRole('button', { name: copy.onboarding.startA2 })).toHaveCount(0);
  await page.getByRole('button', { name: copy.onboarding.next }).click();
  await expect(page).toHaveURL('/today');
});

test('the whole of onboarding can be done with the keyboard, in under 90 seconds', async ({
  page,
}) => {
  const started = Date.now();
  await startFresh(page);
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  await page.getByLabel(copy.onboarding.levelLabel).fill('a few words');
  await page.getByLabel(copy.onboarding.levelLabel).press('Enter');
  for (let i = 0; i < 5; i++) {
    await expect(page.getByText(copy.onboarding.placementStep(i + 1, 5))).toBeVisible();
    await page.keyboard.press('1');
  }
  await expect(page.getByText(/\d of 5 correct\./)).toBeVisible();
  expect(Date.now() - started).toBeLessThan(90_000);
});

test('the placement questions are the same every time', async ({ browser }) => {
  const seen: string[][] = [];
  for (let run = 0; run < 2; run++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await startFresh(page);
    await answerQuestions(page);
    const options: string[] = [];
    for (let i = 0; i < 5; i++) {
      await expect(page.getByText(copy.onboarding.placementStep(i + 1, 5))).toBeVisible();
      options.push(
        (
          await page
            .locator('[data-option]')
            .evaluateAll((n) => n.map((x) => x.getAttribute('data-option')))
        ).join('|'),
      );
      await page.keyboard.press('1');
    }
    seen.push(options);
    await context.close();
  }
  expect(seen[0]).toEqual(seen[1]);
});

test('a brand new learner who finishes the first Shift Break earns a streak day', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await installSpeechStub(page);
  await startFresh(page);
  await answerQuestions(page);
  await placement(page, 0);
  await page.getByRole('button', { name: copy.onboarding.next }).click();
  await expect(page.getByText(copy.today.streak(0))).toBeVisible();

  await page.getByRole('button', { name: copy.today.startSession }).click();
  await expect(page).toHaveURL(/\/session\//);
  await playSession(page, 'pointer', true);
  await page.getByRole('button', { name: copy.summary.backToToday }).click();
  await expect(page.getByText(copy.today.streak(1))).toBeVisible();
  expect(await countRows(page, 'itemState')).toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});
