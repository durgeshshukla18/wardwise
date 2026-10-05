import { describe, expect, it } from 'vitest';

import { ARTICLE_OPTIONS, buildGap, buildOptions } from '../../src/domain/options.ts';
import { createRng, hashSeed } from '../../src/domain/rng.ts';
import { normalise } from '../../src/domain/text.ts';
import type { Item } from '../../src/domain/types.ts';
import { ITEMS, item } from './fixtures.ts';

const unique = (options: string[]) => new Set(options.map(normalise)).size === options.length;

describe('buildGap', () => {
  it('takes the item’s word out of its example sentence', () => {
    expect(buildGap(item('t01-kopf'))).toEqual({
      before: 'Mein ',
      after: ' tut weh.',
      answer: 'Kopf',
    });
    expect(buildGap(item('t02-fieber'))).toEqual({
      before: 'Sie haben ',
      after: '.',
      answer: 'Fieber',
    });
    expect(buildGap(item('t04-aerztin'))).toEqual({
      before: 'Die ',
      after: ' kommt gleich.',
      answer: 'Ärztin',
    });
  });

  it('keeps punctuation and handles a word at the start of the sentence', () => {
    const start = { kind: 'word', de: 'Kopf', exampleDe: 'Kopf tut weh.' } as const;
    expect(buildGap(start)).toEqual({ before: '', after: ' tut weh.', answer: 'Kopf' });
    expect(buildGap({ ...start, exampleDe: 'Tut der Kopf weh?' })).toEqual({
      before: 'Tut der ',
      after: ' weh?',
      answer: 'Kopf',
    });
  });

  it('is null when the word is not in the sentence as a whole word, or the item is not a word', () => {
    expect(buildGap(item('t02-schmerz'))).toBeNull();
    expect(buildGap(item('t08-seit-wann'))).toBeNull();
    expect(buildGap(item('t02-wo-tut-es-weh'))).toBeNull();
  });

  it('is available for exactly the items E5 accepts', () => {
    const withGap = ITEMS.filter((entry) => buildGap(entry) !== null);
    expect(withGap.length).toBeGreaterThan(10);
    for (const entry of withGap)
      expect(entry.exampleDe).toContain((buildGap(entry) as { answer: string }).answer);
  });
});

describe('buildOptions: E2', () => {
  it('always offers der, die and das, in that order, with no distractors', () => {
    for (const seed of [1, 2, 3]) {
      const result = buildOptions('E2', item('t01-kopf'), ITEMS, createRng(seed));
      expect(result).toEqual({ options: [...ARTICLE_OPTIONS], correctOption: 'der' });
    }
    expect(buildOptions('E2', item('t01-hand'), ITEMS, createRng(1)).correctOption).toBe('die');
  });

  it('throws for an item with no article', () => {
    expect(() => buildOptions('E2', item('t02-links'), ITEMS, createRng(1))).toThrow(/article/);
  });
});

describe('buildOptions: E3, E4 and E5', () => {
  it('includes the right answer exactly once, with 4 options and no repeats', () => {
    for (const entry of ITEMS) {
      for (const exercise of ['E3', 'E4'] as const) {
        const { options, correctOption } = buildOptions(exercise, entry, ITEMS, createRng(5));
        expect(correctOption).toBe(entry.en);
        expect(options.filter((option) => option === entry.en)).toHaveLength(1);
        expect(options).toHaveLength(4);
        expect(unique(options)).toBe(true);
      }
    }
  });

  it('E3 and E4 options are English meanings, E5 options are single German words', () => {
    const e3 = buildOptions('E3', item('t01-kopf'), ITEMS, createRng(1));
    const meanings = ITEMS.map((entry) => entry.en);
    for (const option of e3.options) expect(meanings).toContain(option);

    const e5 = buildOptions('E5', item('t01-kopf'), ITEMS, createRng(1));
    expect(e5.correctOption).toBe('Kopf');
    const words = ITEMS.filter((entry) => entry.kind === 'word').map((entry) => entry.de);
    for (const option of e5.options) {
      expect(words).toContain(option);
      expect(option).not.toMatch(/\s/);
    }
    expect(e5.options).toHaveLength(4);
    expect(unique(e5.options)).toBe(true);
  });

  it('takes distractors from the same topic and kind first', () => {
    const t01Words = ITEMS.filter((entry) => entry.topic === 'T01' && entry.kind === 'word');
    expect(t01Words.length).toBeGreaterThan(5);
    for (let seed = 1; seed <= 10; seed++) {
      const { options } = buildOptions('E3', item('t01-kopf'), ITEMS, createRng(seed));
      for (const option of options) expect(t01Words.map((entry) => entry.en)).toContain(option);
    }
  });

  it('then the same level and kind, then any item of the same kind', () => {
    const base = item('t01-kopf');
    const make = (id: string, over: Partial<Item>): Item => ({
      ...base,
      id,
      de: id,
      en: `meaning of ${id}`,
      ...over,
    });
    const pool = [
      base,
      make('same-topic', {}),
      make('same-level', { topic: 'T05' }),
      make('other-level', { topic: 'T05', level: 'A2' }),
      make('other-kind', { kind: 'phrase' }),
    ];
    const two = buildOptions('E3', base, pool, createRng(1), 2).options.sort();
    expect(two).toEqual([base.en, 'meaning of same-topic'].sort());
    const three = buildOptions('E3', base, pool, createRng(1), 3).options.sort();
    expect(three).toEqual([base.en, 'meaning of same-level', 'meaning of same-topic'].sort());
    const four = buildOptions('E3', base, pool, createRng(1), 4).options.sort();
    expect(four).toEqual(
      [base.en, 'meaning of other-level', 'meaning of same-level', 'meaning of same-topic'].sort(),
    );
  });

  it('T08 has only 3 sentences, so it takes the 2 others and fills from the same level', () => {
    const t08 = ITEMS.filter((entry) => entry.topic === 'T08');
    expect(t08).toHaveLength(3);
    const target = item('t08-allergien');
    const others = t08.filter((entry) => entry.id !== target.id).map((entry) => entry.en);
    for (let seed = 1; seed <= 10; seed++) {
      const { options } = buildOptions('E3', target, ITEMS, createRng(seed));
      expect(options).toHaveLength(4);
      expect(unique(options)).toBe(true);
      for (const meaning of others) expect(options).toContain(meaning);
      const fourth = options.find((option) => option !== target.en && !others.includes(option));
      const owner = ITEMS.find((entry) => entry.en === fourth);
      expect(owner?.kind).toBe('sentence');
      expect(owner?.level).toBe('A2');
    }
  });

  it('never repeats an English meaning or the item’s own German text', () => {
    const base = item('t01-kopf');
    const dupes = [
      base,
      { ...base, id: 'dup-meaning', de: 'A', en: 'HEAD ' },
      { ...base, id: 'dup-german', de: 'Kopf', en: 'something else' },
      { ...base, id: 'fine', de: 'B', en: 'fine' },
      { ...base, id: 'fine-again', de: 'C', en: 'Fine.' },
    ];
    const { options } = buildOptions('E3', base, dupes, createRng(1));
    expect(options.map(normalise).sort()).toEqual(['fine', 'head']);
  });

  it('returns fewer options when the content has too few items', () => {
    const base = item('t01-kopf');
    expect(buildOptions('E3', base, [base], createRng(1)).options).toEqual(['head']);
  });

  it('honours a different count', () => {
    expect(buildOptions('E3', item('t01-kopf'), ITEMS, createRng(1), 3).options).toHaveLength(3);
    expect(buildOptions('E5', item('t01-kopf'), ITEMS, createRng(1), 6).options).toHaveLength(6);
  });

  it('E5 throws for an item with no gap', () => {
    expect(() => buildOptions('E5', item('t02-schmerz'), ITEMS, createRng(1))).toThrow(/gap/);
  });

  it('gives the same options in the same order for the same seed', () => {
    for (const exercise of ['E3', 'E4', 'E5'] as const) {
      const a = buildOptions(exercise, item('t01-kopf'), ITEMS, createRng(9));
      const b = buildOptions(exercise, item('t01-kopf'), ITEMS, createRng(9));
      expect(a).toEqual(b);
    }
  });

  it('changes with the seed, and the right answer is not always in the same position', () => {
    const positions = new Set<number>();
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const { options, correctOption } = buildOptions(
        'E3',
        item('t01-kopf'),
        ITEMS,
        createRng(seed),
      );
      positions.add(options.indexOf(correctOption));
      orders.add(options.join('|'));
    }
    expect(positions.size).toBe(4);
    expect(orders.size).toBeGreaterThan(5);
  });

  it('does not change the item list it is given', () => {
    const copy = ITEMS.map((entry) => entry.id);
    buildOptions('E3', item('t01-kopf'), ITEMS, createRng(1));
    expect(ITEMS.map((entry) => entry.id)).toEqual(copy);
  });
});

describe('hashSeed', () => {
  it('is stable, depends on every part, and is a non-negative whole number', () => {
    expect(hashSeed('session-1', 3)).toBe(hashSeed('session-1', 3));
    expect(hashSeed('session-1', 3)).not.toBe(hashSeed('session-1', 4));
    expect(hashSeed('session-1', 3)).not.toBe(hashSeed('session-2', 3));
    const value = hashSeed('x');
    expect(Number.isInteger(value) && value >= 0).toBe(true);
  });
});
