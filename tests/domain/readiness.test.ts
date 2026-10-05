import { describe, expect, it } from 'vitest';

import {
  a2Unlocked,
  computeReadiness,
  placementItems,
  placementLevel,
  weakestTopics,
} from '../../src/domain/readiness.ts';
import { ITEMS, item, state, stateMap } from './fixtures.ts';

const topicItems = (topic: string) => ITEMS.filter((entry) => entry.topic === topic);

describe('readiness', () => {
  it('is the percent of the topic’s items that are Strong, rounded to a whole number', () => {
    const t01 = topicItems('T01');
    const strong = (n: number) =>
      stateMap(...t01.slice(0, n).map((entry) => state(entry.id, { box: 4, state: 'strong' })));
    expect(t01.length).toBeGreaterThan(3);
    expect(computeReadiness('T01', ITEMS, strong(0))).toBe(0);
    expect(computeReadiness('T01', ITEMS, strong(t01.length))).toBe(100);
    expect(computeReadiness('T01', ITEMS, strong(1))).toBe(Math.round(100 / t01.length));
  });

  it('rounds 1 of 3 to 33 and 2 of 3 to 67', () => {
    const three = ITEMS.filter((entry) => entry.topic === 'T03').slice(0, 3);
    const strong = (n: number) =>
      stateMap(...three.slice(0, n).map((entry) => state(entry.id, { box: 5, state: 'strong' })));
    expect(computeReadiness('T03', three, strong(1))).toBe(33);
    expect(computeReadiness('T03', three, strong(2))).toBe(67);
  });

  it('counts unseen and Learning items as not strong', () => {
    const t01 = topicItems('T01');
    const states = stateMap(
      state((t01[0] as { id: string }).id, { box: 3, state: 'learning' }),
      state((t01[1] as { id: string }).id, { box: 1, state: 'new' }),
    );
    expect(computeReadiness('T01', ITEMS, states)).toBe(0);
  });

  it('counts only items in the topic', () => {
    const states = stateMap(state(item('t02-fieber').id, { box: 5, state: 'strong' }));
    expect(computeReadiness('T01', ITEMS, states)).toBe(0);
  });

  it('is 0 for a topic with no items', () => {
    expect(computeReadiness('T06', [item('t01-kopf')], stateMap())).toBe(0);
  });
});

describe('A2 unlock', () => {
  const a1 = ITEMS.filter((entry) => entry.level === 'A1');
  const needed = Math.ceil(a1.length * 0.6);
  const inBox3 = (n: number) =>
    stateMap(...a1.slice(0, n).map((entry) => state(entry.id, { box: 3 })));

  it('opens when 60 percent of A1 items are in box 3 or higher', () => {
    expect(a1.length).toBeGreaterThan(5);
    expect(a2Unlocked(ITEMS, inBox3(needed))).toBe(true);
    expect(a2Unlocked(ITEMS, inBox3(a1.length))).toBe(true);
  });

  it('stays closed one item short', () => {
    expect(a2Unlocked(ITEMS, inBox3(needed - 1))).toBe(false);
    expect(a2Unlocked(ITEMS, stateMap())).toBe(false);
  });

  it('does not count boxes 1 and 2, or New items in box 3', () => {
    const low = stateMap(...a1.map((entry) => state(entry.id, { box: 2 })));
    expect(a2Unlocked(ITEMS, low)).toBe(false);
    const unlearned = stateMap(...a1.map((entry) => state(entry.id, { box: 3, state: 'new' })));
    expect(a2Unlocked(ITEMS, unlearned)).toBe(false);
  });

  it('is exactly 60 percent, not above', () => {
    const five = a1.slice(0, 5);
    const states = (n: number) =>
      stateMap(...five.slice(0, n).map((entry) => state(entry.id, { box: 4 })));
    expect(a2Unlocked(five, states(3))).toBe(true);
    expect(a2Unlocked(five, states(2))).toBe(false);
  });

  it('stays closed when there are no A1 items', () => {
    expect(
      a2Unlocked(
        ITEMS.filter((entry) => entry.level === 'A2'),
        stateMap(),
      ),
    ).toBe(false);
  });
});

describe('placement', () => {
  it('0 to 2 correct places the learner at A1', () => {
    expect([0, 1, 2].map(placementLevel)).toEqual(['A1', 'A1', 'A1']);
  });

  it('3 to 5 correct offers A2', () => {
    expect([3, 4, 5].map(placementLevel)).toEqual(['offer_A2', 'offer_A2', 'offer_A2']);
  });

  it('rejects scores that are not a whole number from 0 to 5', () => {
    for (const bad of [-1, 6, 2.5, Number.NaN])
      expect(() => placementLevel(bad)).toThrow(RangeError);
  });
});

describe('weakestTopics', () => {
  const strongIn = (topic: string, n: number) =>
    ITEMS.filter((entry) => entry.topic === topic)
      .slice(0, n)
      .map((entry) => state(entry.id, { box: 5, state: 'strong' }));

  it('returns the 3 lowest topics, lowest first, and breaks ties by topic code', () => {
    expect(weakestTopics(ITEMS, stateMap())).toEqual([
      { topic: 'T01', percent: 0 },
      { topic: 'T02', percent: 0 },
      { topic: 'T03', percent: 0 },
    ]);
  });

  it('ranks by readiness, so a topic that is already strong drops out', () => {
    const all = (topic: string) => strongIn(topic, 99);
    const states = stateMap(...all('T01'), ...all('T02'), ...strongIn('T04', 1));
    const result = weakestTopics(ITEMS, states);
    expect(result.map((entry) => entry.topic)).toEqual(['T03', 'T05', 'T06']);
    expect(result.every((entry) => entry.percent === 0)).toBe(true);
  });

  it('sorts by percent before topic code', () => {
    const states = stateMap(...strongIn('T01', 1), ...strongIn('T03', 1));
    const result = weakestTopics(ITEMS, states, 8);
    expect(result.map((entry) => entry.percent)).toEqual(
      [...result.map((entry) => entry.percent)].sort((a, b) => a - b),
    );
    expect(
      result
        .slice(-2)
        .map((entry) => entry.topic)
        .sort(),
    ).toEqual(['T01', 'T03']);
  });

  it('counts only topics that have at least one item', () => {
    const subset = ITEMS.filter((entry) => entry.topic === 'T01' || entry.topic === 'T05');
    expect(weakestTopics(subset, stateMap()).map((entry) => entry.topic)).toEqual(['T01', 'T05']);
    expect(weakestTopics([], stateMap())).toEqual([]);
  });

  it('honours a different count', () => {
    expect(weakestTopics(ITEMS, stateMap(), 1)).toHaveLength(1);
    expect(weakestTopics(ITEMS, stateMap(), 20)).toHaveLength(8);
  });
});

describe('placementItems', () => {
  it('takes the first A1 word with an article, in id order, from each of T01 to T05', () => {
    expect(placementItems(ITEMS).map((entry) => entry.id)).toEqual([
      't01-arm',
      't02-fieber',
      't03-puls',
      't04-aerztin',
      't05-bett',
    ]);
  });

  it('is the same whatever order the items arrive in', () => {
    const reversed = [...ITEMS].reverse();
    expect(placementItems(reversed)).toEqual(placementItems(ITEMS));
  });

  it('skips A2 items, phrases, and words with no article', () => {
    for (const entry of placementItems(ITEMS)) {
      expect(entry).toMatchObject({ level: 'A1', kind: 'word' });
      expect(entry.article).toBeDefined();
    }
  });

  it('returns fewer than 5 when a topic has no suitable item', () => {
    const without = ITEMS.filter((entry) => entry.topic !== 'T03');
    expect(placementItems(without)).toHaveLength(4);
  });
});
