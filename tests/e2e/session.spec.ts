// A full demo session, from Try demo to the summary, with no AI, no speech recognition and the
// network blocked after the first load.
import { expect, test } from '@playwright/test';

import { copy } from '../../src/app/copy.ts';
import { answerCurrent, continueAfterFeedback, itemFor, playSession } from './play.ts';
import {
  collectErrors,
  countRows,
  expectNoHorizontalScroll,
  installSpeechStub,
  lastSpoken,
  tryDemo,
} from './helpers.ts';

for (const mode of ['pointer', 'keyboard'] as const) {
  test(`a full demo session runs to the summary offline, ${mode} only`, async ({
    page,
    context,
  }) => {
    const errors = collectErrors(page);
    await installSpeechStub(page);
    await tryDemo(page);
    await page.waitForLoadState('networkidle');
    const dueBefore = Number(
      (await page.getByText(/items? due in the next 24 hours/).innerText()).match(/\d+/)?.[0],
    );
    await context.setOffline(true);

    await page.getByRole('button', { name: copy.today.startSession }).click();
    await expect(page).toHaveURL(/\/session\//);
    await expectNoHorizontalScroll(page);
    await playSession(page, mode, true);

    // S07: items right, items to revisit, next review, two buttons. No "finished" message.
    await expect(page.getByText(/\d+ items? right\./)).toBeVisible();
    await expect(page.getByText(/\d+ items? to revisit\./)).toBeVisible();
    await expect(page.getByText(/next review is in|still due now/)).toBeVisible();
    await expect(page.getByRole('button', { name: copy.summary.backToToday })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.summary.extraRound })).toBeVisible();
    await expect(page.getByText(/finished|all done|complete/i)).toHaveCount(0);
    await expectNoHorizontalScroll(page);

    // Today shows the new streak and a lower due count.
    await page.getByRole('button', { name: copy.summary.backToToday }).click();
    await expect(page).toHaveURL('/today');
    await expect(page.getByText(copy.today.streak(10))).toBeVisible();
    const dueText = await page.getByText(/due in the next 24 hours|Nothing due/).innerText();
    const dueAfter = Number(dueText.match(/^\d+/)?.[0] ?? 0);
    expect(dueAfter).toBeLessThan(dueBefore);

    await context.setOffline(false);
    expect(errors).toEqual([]);
  });
}

test('a session with wrong answers shows feedback, retries the item and still finishes', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await installSpeechStub(page);
  await tryDemo(page);
  await page.getByRole('button', { name: copy.today.startSession }).click();
  await playSession(page, 'pointer', false);
  await expect(page.getByText(/\d+ items? to revisit\./)).toBeVisible();
  expect(errors).toEqual([]);
});

test('leaving after 3 answers keeps those 3 answers', async ({ page }) => {
  await installSpeechStub(page);
  await tryDemo(page);
  const attemptsBefore = await countRows(page, 'attempts');
  await page.getByRole('button', { name: copy.today.startSession }).click();
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-exercise]').first().waitFor();
    const exercise = await answerCurrent(page, 'pointer', true);
    if (exercise !== 'E1') await continueAfterFeedback(page, 'pointer');
  }
  await page.getByRole('button', { name: copy.session.exit }).click();
  await expect(page.getByRole('dialog', { name: copy.session.leaveTitle })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: copy.session.leaveConfirm }).click();
  await expect(page).toHaveURL('/today');

  expect((await countRows(page, 'attempts')) - attemptsBefore).toBe(3);
  const sessions = await page.evaluate(
    () =>
      new Promise<{ completed: boolean; endedAt: number | null }[]>((resolve) => {
        const open = indexedDB.open('wardwise');
        open.onsuccess = () => {
          const all = open.result.transaction('sessions').objectStore('sessions').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({ completed: false });
  expect(sessions[0]?.endedAt).not.toBeNull();
});

test('Keep going closes the leave sheet and the session continues', async ({ page }) => {
  await installSpeechStub(page);
  await tryDemo(page);
  await page.getByRole('button', { name: copy.today.startSession }).click();
  await page.getByRole('button', { name: copy.session.exit }).click();
  await page.getByRole('button', { name: copy.session.leaveCancel }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-exercise]').first()).toBeVisible();
});

test('the browser Back button asks before leaving', async ({ page }) => {
  await installSpeechStub(page);
  await tryDemo(page);
  await page.getByRole('button', { name: copy.today.startSession }).click();
  await page.locator('[data-exercise]').first().waitFor();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: copy.session.leaveTitle })).toBeVisible();
  await expect(page).toHaveURL(/\/session\//);
});

test('a refresh in a session goes back to Today', async ({ page }) => {
  await installSpeechStub(page);
  await tryDemo(page);
  await page.getByRole('button', { name: copy.today.startSession }).click();
  await page.locator('[data-exercise]').first().waitFor();
  await page.reload();
  await expect(page).toHaveURL('/today');
});

test('audio: a tap plays the word, a second tap plays it slowly, Space and Shift+Space too', async ({
  page,
}) => {
  await installSpeechStub(page);
  await tryDemo(page);
  await page.getByRole('button', { name: copy.today.startSession }).click();
  // Go on until an exercise with a word to play comes up.
  const play = page.getByRole('button', { name: copy.session.playWord }).first();
  for (let i = 0; i < 12 && !(await play.isVisible()); i++) {
    await page.locator('[data-exercise]').first().waitFor();
    const exercise = await answerCurrent(page, 'pointer', true);
    if (exercise !== 'E1') await continueAfterFeedback(page, 'pointer');
  }
  const item = await itemFor(page);
  await page.getByRole('button', { name: copy.session.playWord }).first().click();
  expect(await lastSpoken(page)).toMatchObject({ text: item.spoken ?? item.de, rate: 1 });
  await page.getByRole('button', { name: copy.session.playWord }).first().click();
  expect(await lastSpoken(page)).toMatchObject({ rate: 0.8 });
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Space');
  expect(await lastSpoken(page)).toMatchObject({ rate: 1 });
  await page.keyboard.press('Shift+Space');
  expect(await lastSpoken(page)).toMatchObject({ rate: 0.8 });
});

test('with no German voice the audio exercises are replaced and a note explains why', async ({
  page,
}) => {
  await installSpeechStub(page, false);
  await tryDemo(page);
  await page.getByRole('button', { name: copy.today.startSession }).click();
  await page.locator('[data-exercise]').first().waitFor();
  const summary = page.getByRole('heading', { name: copy.summary.title });
  for (let i = 0; i < 40; i++) {
    if (await summary.isVisible()) break;
    await page.locator('[data-exercise]').first().waitFor();
    const exercise = await page.locator('[data-exercise]').first().getAttribute('data-exercise');
    expect(['E4', 'E9']).not.toContain(exercise);
    if (exercise === 'E1') {
      await expect(page.getByText(copy.session.noVoice)).toBeVisible();
      await expect(page.getByRole('button', { name: copy.session.playWord })).toHaveCount(0);
    }
    await answerCurrent(page, 'pointer', true);
    if (exercise !== 'E1') await continueAfterFeedback(page, 'pointer');
    await page.waitForTimeout(20);
  }
  await expect(summary).toBeVisible();
});

test('Shift Break reaches the first exercise in under 500 ms, also on a slow phone', async ({
  page,
}) => {
  await installSpeechStub(page);
  await tryDemo(page);
  await page.waitForLoadState('networkidle');

  /** From the tap on Shift Break to the first exercise on screen, read from the app's own marks. */
  async function measure(): Promise<number> {
    await page.getByRole('button', { name: copy.today.startSession }).click();
    await page.locator('[data-exercise]').first().waitFor();
    return page.evaluate(() => {
      const tap = performance.getEntriesByName('shift-break-tap').at(-1)?.startTime ?? 0;
      const first = performance.getEntriesByName('first-exercise').at(-1)?.startTime ?? 0;
      return first - tap;
    });
  }
  async function leave() {
    await page.getByRole('button', { name: copy.session.exit }).click();
    await page.getByRole('dialog').getByRole('button', { name: copy.session.leaveConfirm }).click();
    await expect(page).toHaveURL('/today');
  }

  const normal = await measure();
  await leave();
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const slow = await measure();
  console.log(
    `Shift Break to first exercise: ${Math.round(normal)} ms, ${Math.round(slow)} ms with a 4x CPU slowdown`,
  );
  expect(normal).toBeGreaterThan(0);
  expect(normal).toBeLessThan(500);
  expect(slow).toBeLessThan(500);
});
