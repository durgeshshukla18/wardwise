// The engine must stay pure. This runs ESLint on throwaway code placed in src/domain.
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function messages(code: string, file = 'src/domain/example.ts'): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: file });
  return (result?.messages ?? []).map((message) => `${message.ruleId}: ${message.message}`);
}

describe('src/domain lint rules', () => {
  it('accepts plain pure code', async () => {
    const code =
      "import type { Item } from '../content/schema.ts';\nexport const f = (item: Item, now: number, rng: () => number) => item.id + now + rng();\nexport const g = (now: number, rng: () => number) => now + rng();\n";
    expect(await messages(code)).toEqual([]);
  });

  it('forbids imports from data, services, React and Dexie', async () => {
    for (const source of [
      '../data/db.ts',
      '../data/schema.ts',
      '../services/tts.ts',
      '../app/router.tsx',
      '../components/Button.tsx',
      '../features/session/Session.tsx',
      'react',
      'react-dom/client',
      'react-router',
      'dexie',
    ]) {
      const found = await messages(`import x from '${source}';\nexport const y = x;\n`);
      expect(
        found.some((line) => line.startsWith('no-restricted-imports')),
        source,
      ).toBe(true);
    }
  });

  it('forbids browser globals', async () => {
    for (const code of [
      'export const a = window.innerWidth;',
      'export const a = document.title;',
      'export const a = navigator.language;',
      'export const a = localStorage.getItem("x");',
      'export const a = indexedDB;',
      'export const a = fetch("/x");',
      'export const a = setTimeout(() => 1, 1);',
    ]) {
      const found = await messages(code);
      expect(
        found.some((line) => line.startsWith('no-restricted-globals')),
        code,
      ).toBe(true);
    }
  });

  it('forbids Date.now, new Date and Math.random', async () => {
    expect(await messages('export const a = Date.now();')).not.toEqual([]);
    expect(await messages('export const a = new Date();')).not.toEqual([]);
    const found = await messages('export const a = Math.random();');
    expect(found.some((line) => line.startsWith('no-restricted-properties'))).toBe(true);
  });

  it('does not apply outside src/domain', async () => {
    expect(await messages('export const a = Date.now();', 'src/services/clock.ts')).toEqual([]);
  });
});
