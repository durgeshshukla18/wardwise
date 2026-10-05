import { describe, expect, it } from 'vitest';

import { a2Unlocked, computeReadiness, placementLevel } from '../../src/domain/readiness.ts';
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
