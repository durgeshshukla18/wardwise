// Answer options for E2 to E5 (docs/01-PRD.md F-06). Pure: the rng is passed in.
import { shuffle } from './rng.ts';
import { normalise } from './text.ts';
import type { Item, Rng } from './types.ts';

/** The example sentence with one word taken out for E5. */
export type Gap = {
  /** Text before the missing word, including the space. */
  before: string;
  /** Text after the missing word, including punctuation and the space. */
  after: string;
  /** The missing word as it is written in the sentence. */
  answer: string;
};

export type OptionSet = {
  options: string[];
  correctOption: string;
};

export const ARTICLE_OPTIONS = ['der', 'die', 'das'] as const;
export const DEFAULT_OPTION_COUNT = 4;

/** Removes the item's German word from its example sentence. Null if it is not in it. */
export function buildGap(item: Pick<Item, 'kind' | 'de' | 'exampleDe'>): Gap | null {
  if (item.kind !== 'word') return null;
  const target = normalise(item.de);
  for (const match of item.exampleDe.matchAll(/\S+/g)) {
    if (normalise(match[0]) !== target) continue;
    const lead = /^[^\p{L}\p{N}]*/u.exec(match[0])?.[0] ?? '';
    const trail = /[^\p{L}\p{N}]*$/u.exec(match[0])?.[0] ?? '';
    const start = match.index + lead.length;
    const end = match.index + match[0].length - trail.length;
    return {
      before: item.exampleDe.slice(0, start),
      after: item.exampleDe.slice(end),
      answer: item.exampleDe.slice(start, end),
    };
  }
  return null;
}

/**
 * The options for one exercise. The right answer is always there once. E2 has no distractors.
 * E3 and E4 options are English meanings, E5 options are German words. Distractors come from
 * the same topic and kind, then the same level and kind, then any item of the same kind. The
 * order is shuffled with the rng, so the same seed gives the same options in the same order.
 * Fewer than `count` options come back when the content has too few items.
 */
export function buildOptions(
  exercise: 'E2' | 'E3' | 'E4' | 'E5',
  item: Item,
  items: readonly Item[],
  rng: Rng,
  count: number = DEFAULT_OPTION_COUNT,
): OptionSet {
  if (exercise === 'E2') {
    if (item.article === undefined) throw new Error(`${item.id} has no article for E2`);
    return { options: [...ARTICLE_OPTIONS], correctOption: item.article };
  }

  let correctOption: string;
  let textOf: (candidate: Item) => string | null;
  if (exercise === 'E5') {
    const gap = buildGap(item);
    if (gap === null) throw new Error(`${item.id} has no gap for E5`);
    correctOption = gap.answer;
    // German words only, one word each.
    textOf = (candidate) =>
      candidate.kind === 'word' && !/\s/.test(candidate.de.trim()) ? candidate.de : null;
  } else {
    correctOption = item.en;
    textOf = (candidate) => candidate.en;
  }

  const taken = new Set([normalise(correctOption)]);
  const distractors: string[] = [];
  const others = items.filter(
    (candidate) => candidate.id !== item.id && candidate.kind === item.kind,
  );
  const tiers = [
    others.filter((candidate) => candidate.topic === item.topic),
    others.filter((candidate) => candidate.level === item.level),
    others,
  ];

  for (const tier of tiers) {
    for (const candidate of shuffle(tier, rng)) {
      if (distractors.length >= count - 1) break;
      const text = textOf(candidate);
      if (text === null) continue;
      // Never repeat a meaning or a German text, and never copy the item's own German text.
      if (taken.has(normalise(text)) || normalise(candidate.de) === normalise(item.de)) continue;
      taken.add(normalise(text));
      distractors.push(text);
    }
  }

  return { options: shuffle([correctOption, ...distractors], rng), correctOption };
}
