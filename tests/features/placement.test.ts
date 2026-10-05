import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { placementLevel } from '../../src/domain/readiness.ts';
import { buildPlacement, scorePlacement } from '../../src/features/onboarding/placement.ts';
import { ITEMS } from '../domain/fixtures.ts';

describe('placement', () => {
  const questions = buildPlacement(ITEMS);

  it('asks 5 A1 words, one from each of T01 to T05, with 4 options each and the right one included', () => {
    expect(questions.map((q) => q.item.id)).toEqual([
      't01-arm',
      't02-fieber',
      't03-puls',
      't04-aerztin',
      't05-bett',
    ]);
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o === q.item.en)).toHaveLength(1);
      expect(q.correctOption).toBe(q.item.en);
    }
  });

  it('is identical on every run, in questions, options and order', () => {
    expect(buildPlacement(ITEMS)).toEqual(questions);
    expect(buildPlacement([...ITEMS].reverse())).toEqual(questions);
  });

  it('scores with the E3 checker', () => {
    const right = questions.map((q) => q.correctOption);
    expect(scorePlacement(questions, right)).toBe(5);
    expect(scorePlacement(questions, [])).toBe(0);
    const three = right.map((option, i) => (i < 3 ? option : 'nothing'));
    expect(scorePlacement(questions, three)).toBe(3);
  });

  it('places 0 to 2 correct at A1 and 3 to 5 as an offer of A2', () => {
    const right = questions.map((q) => q.correctOption);
    const levelFor = (n: number) =>
      placementLevel(
        scorePlacement(
          questions,
          right.map((o, i) => (i < n ? o : 'x')),
        ),
      );
    expect([0, 1, 2].map(levelFor)).toEqual(['A1', 'A1', 'A1']);
    expect([3, 4, 5].map(levelFor)).toEqual(['offer_A2', 'offer_A2', 'offer_A2']);
  });

  it('never touches the scheduler: no onboarding source mentions it', () => {
    const dir = 'src/features/onboarding';
    for (const file of readdirSync(dir)) {
      const text = readFileSync(join(dir, file), 'utf8');
      expect(text, file).not.toMatch(
        /applyAnswer|completeLearnCard|createNewItemState|domain\/scheduler/,
      );
    }
  });
});
