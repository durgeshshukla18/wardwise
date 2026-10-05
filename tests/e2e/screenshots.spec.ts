// Saves the checkpoint screenshots to docs/screenshots. Run with `npm run screenshots`.
import { expect, test } from '@playwright/test';

import { answerCurrent, continueAfterFeedback, playSession } from './play.ts';
import { fontsReady, installSpeechStub, tryDemo } from './helpers.ts';
import { copy } from '../../src/app/copy.ts';

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

// Second checkpoint: the session screens, taken as the phone and desktop see them.
test('S05 S06 S07 session screens', async ({ page }) => {
  await installSpeechStub(page);
  await tryDemo(page);

  // Make sure a number dictation comes up: a number item in box 3 that is the most overdue.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('wardwise');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('itemState', 'readwrite');
          tx.objectStore('itemState').put({
            itemId: 't03-puls-1',
            box: 3,
            dueAt: 1,
            state: 'learning',
            correct: 2,
            wrong: 0,
            lastSeenAt: 1,
            everProduced: true,
            inMistakeBank: false,
            bankEnteredAt: null,
            bankCorrectDays: [],
          });
          tx.oncomplete = () => resolve();
        };
      }),
  );
  await page.reload();
  await page.getByRole('button', { name: copy.today.startSession }).click();

  const shot = async (name: string) => {
    await page.mouse.move(0, 0);
    await page.waitForTimeout(350);
    await fontsReady(page);
    await page.screenshot({ path: `docs/screenshots/${name}-${widthOf(page)}.png` });
  };

  // Take each picture when its exercise comes up. If the session runs out first, start an Extra
  // round and keep going.
  const done = { e3Right: false, e3Wrong: false, e9: false };
  const summary = page.getByRole('heading', { name: copy.summary.title });
  for (let step = 0; step < 80 && !(done.e3Right && done.e3Wrong && done.e9); step++) {
    if (await summary.isVisible()) {
      await page.getByRole('button', { name: copy.summary.extraRound }).click();
    }
    await page.locator('[data-exercise]').first().waitFor();
    const exercise = await page.locator('[data-exercise]').first().getAttribute('data-exercise');

    if (exercise === 'E9' && !done.e9) {
      await shot('s05-e9-question');
      done.e9 = true;
    } else if (exercise === 'E3' && !done.e3Right) {
      await shot('s05-e3-question');
      await answerCurrent(page, 'pointer', true);
      await shot('s06-e3-correct');
      done.e3Right = true;
      await continueAfterFeedback(page, 'pointer');
      continue;
    } else if (exercise === 'E3' && !done.e3Wrong) {
      await answerCurrent(page, 'pointer', false);
      await shot('s06-e3-wrong');
      done.e3Wrong = true;
      await continueAfterFeedback(page, 'pointer');
      continue;
    }
    const answered = await answerCurrent(page, 'pointer', true);
    if (answered !== 'E1') await continueAfterFeedback(page, 'pointer');
  }
  expect(done).toEqual({ e3Right: true, e3Wrong: true, e9: true });

  await playSession(page, 'pointer', true);
  await page.waitForLoadState('networkidle');
  await shot('s07-summary');
});
