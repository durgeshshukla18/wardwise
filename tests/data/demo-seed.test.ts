import { describe, expect, it } from 'vitest';

import { buildDemoSeed, DEMO_BANK, type DemoSeed } from '../../src/data/demo-seed.ts';
import { copy } from '../../src/app/copy.ts';
import { composeSession } from '../../src/domain/composer.ts';
import { addDays } from '../../src/domain/dates.ts';
import { createRng } from '../../src/domain/rng.ts';
import { BOX_WAIT_DAYS, DAY_MS, applyAnswer, dueWithin } from '../../src/domain/scheduler.ts';
import { createStreak, updateStreak } from '../../src/domain/streak.ts';
import type { ItemState, LocalDay } from '../../src/domain/types.ts';
import { ITEMS, NOW, TODAY } from '../fixtures-shared.ts';

const onboarding = {
  goal: copy.onboarding.demoGoal,
  dailyTime: copy.onboarding.demoDailyTime,
  selfLevel: copy.onboarding.demoSelfLevel,
};

function seedFor(seed = 1, day: LocalDay = TODAY, now = NOW): DemoSeed {
  return buildDemoSeed({ items: ITEMS, now, day, seed, onboarding });
}

const statesOf = (seed: DemoSeed) => new Map(seed.itemStates.map((s) => [s.itemId, s]));
const HOUR = 3_600_000;
const yesterday = addDays(TODAY.date, -1);

describe('demo seed: profile and streak', () => {
  const seed = seedFor();

  it('is an onboarded profile with plausible onboarding answers', () => {
    expect(seed.profile).toMatchObject({
      id: 'me',
      level: 'A1',
      sessionLength: 10,
      hindiHints: false,
      audioSpeed: 1,
    });
    expect(seed.profile.name.length).toBeGreaterThan(0);
    expect(seed.profile.onboardedAt).toBeLessThan(NOW);
    expect(seed.profile.onboarding).toEqual(onboarding);
  });

  it('holds a 9 day streak and 1 freeze, last counted yesterday', () => {
    expect(seed.streak).toEqual({
      id: 'me',
      current: 9,
      best: 9,
      freezes: 1,
      lastCountedDate: yesterday,
      freezeDays: [],
    });
  });

  it('replaying the history from scratch, one day at a time, gives the same streak', () => {
    let streak = createStreak();
    for (let offset = -28; offset <= -1; offset++) {
      const date = addDays(TODAY.date, offset);
      streak = updateStreak(
        streak,
        seed.days.filter((row) => row.date <= date),
        date,
      ).streak;
    }
    expect({ id: 'me', ...streak }).toEqual(seed.streak);
  });

  it('has no row for today, so finishing one session takes the streak to 10', () => {
    expect(seed.days.some((row) => row.date === TODAY.date)).toBe(false);
    const idle = updateStreak(seed.streak, seed.days, TODAY.date);
    expect(idle.streak.current).toBe(9);
    const practised = [...seed.days, { date: TODAY.date, exercisesDone: 5, sessions: 1 }];
    const done = updateStreak(seed.streak, practised, TODAY.date);
    expect(done.streak.current).toBe(10);
    expect(done.streak.freezes).toBe(1);
  });

  it('has day rows only inside the last 28 days, in order, with 9 counted days in a row up to yesterday', () => {
    const dates = seed.days.map((row) => row.date);
    expect(dates).toEqual([...dates].sort());
    expect((dates[0] as string) >= addDays(TODAY.date, -28)).toBe(true);
    expect(dates.at(-1)).toBe(yesterday);
    for (let offset = -9; offset <= -1; offset++) {
      const row = seed.days.find((r) => r.date === addDays(TODAY.date, offset));
      expect(row?.exercisesDone).toBeGreaterThanOrEqual(5);
    }
    expect(seed.days.some((row) => row.date === addDays(TODAY.date, -10))).toBe(false);
    for (const row of seed.days) expect(row.sessions).toBeGreaterThanOrEqual(1);
  });
});

describe('demo seed: items', () => {
  const seed = seedFor();
  const states = statesOf(seed);

  it('knows 40 of the 49 items, with no duplicates and none left in the New state', () => {
    expect(ITEMS).toHaveLength(49);
    expect(seed.itemStates).toHaveLength(40);
    expect(states.size).toBe(40);
    for (const state of seed.itemStates) {
      expect(ITEMS.map((i) => i.id)).toContain(state.itemId);
      expect(state.state).not.toBe('new');
    }
  });

  it('spreads items across boxes 1 to 5', () => {
    const counts = [1, 2, 3, 4, 5].map(
      (box) => seed.itemStates.filter((state) => state.box === box).length,
    );
    expect(counts).toEqual([6, 9, 9, 9, 7]);
  });

  it('shows Learning for boxes 1 to 3 and Strong for boxes 4 and 5, and boxes 4 and 5 were produced', () => {
    for (const state of seed.itemStates) {
      expect(state.state).toBe(state.box >= 4 ? 'strong' : 'learning');
      if (state.box >= 4) expect(state.everProduced).toBe(true);
    }
  });

  it('is valid by the engine: due times follow the box wait from the last answer', () => {
    for (const state of seed.itemStates) {
      expect(state.lastSeenAt).not.toBeNull();
      expect(state.lastSeenAt as number).toBeLessThanOrEqual(NOW);
      expect(state.dueAt).toBe((state.lastSeenAt as number) + BOX_WAIT_DAYS[state.box] * DAY_MS);
      expect(state.correct + state.wrong).toBeGreaterThan(0);
    }
  });

  it('is valid by the engine: a due correct production answer moves every item one box up', () => {
    for (const state of seed.itemStates) {
      const { state: next } = applyAnswer(state, {
        correct: true,
        format: 'production',
        now: Math.max(state.dueAt, NOW),
        day: { date: addDays(TODAY.date, 3), startMs: TODAY.startMs + 3 * DAY_MS },
        errorType: null,
      });
      expect(next.box).toBe(Math.min(state.box + 1, 5));
    }
  });

  it('builds a full Shift Break from the seeded states', () => {
    const { slots } = composeSession({
      items: ITEMS,
      states: states,
      now: NOW,
      day: TODAY,
      settings: { level: 'A1', sessionLength: 10, speech: false, audio: true },
      newItemsToday: 0,
      rng: createRng(1),
      enabledExercises: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E9'],
    });
    expect(slots.filter((slot) => !slot.followUp)).toHaveLength(10);
    const bankIds: string[] = DEMO_BANK.map((entry) => entry.id);
    expect(slots.filter((slot) => bankIds.includes(slot.itemId)).length).toBeGreaterThanOrEqual(4);
    expect(slots.filter((slot) => slot.exercise === 'E1').length).toBeLessThanOrEqual(2);
  });
});

describe('demo seed: due items and the Mistake Bank', () => {
  const seed = seedFor();
  const bankIds = DEMO_BANK.map((entry) => entry.id);

  it('has exactly 7 items due within the next 24 hours, and the 6 bank items are among them', () => {
    expect(dueWithin(seed.itemStates, NOW)).toBe(7);
    const due = seed.itemStates.filter((state) => state.dueAt <= NOW + 24 * HOUR);
    expect(due).toHaveLength(7);
    for (const id of bankIds) expect(due.map((state) => state.itemId)).toContain(id);
  });

  it('has every other item due more than 24 hours from now', () => {
    for (const state of seed.itemStates) {
      if (bankIds.includes(state.itemId)) continue;
      const overdueExtra = state.dueAt <= NOW + 24 * HOUR;
      if (!overdueExtra) expect(state.dueAt).toBeGreaterThan(NOW + 24 * HOUR);
    }
    const others = seed.itemStates.filter(
      (state) => !bankIds.includes(state.itemId) && state.dueAt <= NOW + 24 * HOUR,
    );
    expect(others).toHaveLength(1);
  });

  it('puts exactly the 6 seed table items in the Mistake Bank, with their error types', () => {
    const inBank = seed.itemStates.filter((state) => state.inMistakeBank);
    expect(inBank.map((state) => state.itemId).sort()).toEqual([...bankIds].sort());
    for (const { id, errorType } of DEMO_BANK) {
      const state = seed.itemStates.find((s) => s.itemId === id) as ItemState;
      expect(state).toMatchObject({
        box: 1,
        bankErrorType: errorType,
        bankCorrectDays: [],
        wrong: 1,
      });
      expect(state.bankEnteredAt).toBeLessThanOrEqual(NOW);
      expect(state.bankEnteredAt).toBeGreaterThan(NOW - 36 * HOUR);
    }
  });

  it('matches the seed table in docs/02', () => {
    expect(DEMO_BANK).toEqual([
      { id: 't01-bauch', errorType: 'article' },
      { id: 't01-hand', errorType: 'article' },
      { id: 't02-fieber', errorType: 'spelling' },
      { id: 't07-tablette', errorType: 'listening' },
      { id: 't03-bp-1', errorType: 'number' },
      { id: 't08-seit-wann', errorType: 'word_order' },
    ]);
  });
});

describe('demo seed: repeatability', () => {
  it('gives the same seed for the same inputs', () => {
    expect(seedFor(7)).toEqual(seedFor(7));
  });

  it('varies with the seed number, but keeps the shape', () => {
    const a = seedFor(1);
    const b = seedFor(2);
    expect(a).not.toEqual(b);
    expect(b.streak.current).toBe(9);
    expect(dueWithin(b.itemStates, NOW)).toBe(7);
  });

  it('keeps the shape on another day', () => {
    const day = { date: addDays(TODAY.date, 40), startMs: TODAY.startMs + 40 * DAY_MS };
    const later = seedFor(1, day, NOW + 40 * DAY_MS);
    expect(later.streak.lastCountedDate).toBe(addDays(day.date, -1));
    expect(later.streak.current).toBe(9);
    expect(dueWithin(later.itemStates, NOW + 40 * DAY_MS)).toBe(7);
  });

  it('refuses content that is too small or lacks a Mistake Bank item', () => {
    expect(() =>
      buildDemoSeed({ items: ITEMS.slice(0, 30), now: NOW, day: TODAY, seed: 1, onboarding }),
    ).toThrow(/at least 40/);
    const missing = ITEMS.filter((entry) => entry.id !== 't01-bauch');
    expect(() =>
      buildDemoSeed({ items: missing, now: NOW, day: TODAY, seed: 1, onboarding }),
    ).toThrow(/t01-bauch/);
  });
});
