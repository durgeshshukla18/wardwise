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

/** Gives the page a German voice and records what it is asked to say in `window.__spoken`. */
export async function installSpeechStub(page: Page, voices = true): Promise<void> {
  await page.addInitScript((hasVoices) => {
    const spoken: { text: string; rate: number; lang: string }[] = [];
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
    const voice = { lang: 'de-DE', name: 'Stub German', default: false, localService: true };
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => (hasVoices ? [voice] : []),
        speak: (utterance: { text: string; rate: number; lang: string }) => {
          spoken.push({ text: utterance.text, rate: utterance.rate, lang: utterance.lang });
        },
        cancel: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string;
      rate = 1;
      lang = '';
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    };
  }, voices);
}

export const lastSpoken = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __spoken: { text: string; rate: number }[] }).__spoken.at(-1) ?? null,
  );

/** Counts rows in a table of the app's IndexedDB, read straight from the browser. */
export function countRows(page: Page, table: string): Promise<number> {
  return page.evaluate(
    (name) =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('wardwise');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const request = open.result.transaction(name).objectStore(name).count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        };
      }),
    table,
  );
}
