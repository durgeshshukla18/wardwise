import { describe, expect, it } from 'vitest';

import { addDays } from '../../src/domain/dates.ts';
import { createStreak, updateStreak } from '../../src/domain/streak.ts';
import type { DayCount, StreakState } from '../../src/domain/types.ts';

const TODAY = '2026-10-05';
const ago = (n: number) => addDays(TODAY, -n);
const did = (date: string, exercisesDone = 5): DayCount => ({ date, exercisesDone });
const streakOf = (over: Partial<StreakState>): StreakState => ({ ...createStreak(), ...over });

describe('streak: test plan cases', () => {
  it('#16 streak of 9, 1 freeze held, one day missed: streak stays 9, freeze used', () => {
    const result = updateStreak(
      streakOf({ current: 9, best: 9, freezes: 1, lastCountedDate: ago(2) }),
      [did(ago(2))],
      TODAY,
    );
    expect(result.streak).toMatchObject({
      current: 9,
      freezes: 0,
      freezeDays: [ago(1)],
      lastCountedDate: ago(1),
    });
    expect(result.freezeUsedOn).toEqual([ago(1)]);
    expect(result.todayCounted).toBe(false);
  });

  it('#17 streak of 9, 1 freeze held, two days missed in a row: streak resets to 0', () => {
    const result = updateStreak(
      streakOf({ current: 9, best: 9, freezes: 1, lastCountedDate: ago(3) }),
      [did(ago(3))],
      TODAY,
    );
    expect(result.streak).toMatchObject({ current: 0, freezes: 0, best: 9 });
    expect(result.freezeUsedOn).toEqual([ago(2)]);
  });

  it('#18 only 4 exercises done today: the day does not count', () => {
    const before = streakOf({ current: 9, best: 9, freezes: 1, lastCountedDate: ago(1) });
    const result = updateStreak(before, [did(ago(1)), did(TODAY, 4)], TODAY);
    expect(result.streak).toEqual(before);
    expect(result.todayCounted).toBe(false);
  });
});

describe('streak: counting days', () => {
  it('counts today at exactly 5 exercises and extends an unbroken streak', () => {
    const before = streakOf({ current: 9, best: 9, lastCountedDate: ago(1) });
    const result = updateStreak(before, [did(TODAY, 5)], TODAY);
    expect(result.streak).toMatchObject({ current: 10, best: 10, lastCountedDate: TODAY });
    expect(result.todayCounted).toBe(true);
  });

  it('starts at 1 on the very first day', () => {
    expect(updateStreak(createStreak(), [did(TODAY, 6)], TODAY).streak).toMatchObject({
      current: 1,
      best: 1,
      lastCountedDate: TODAY,
    });
  });

  it('does nothing on the very first day before 5 exercises', () => {
    expect(updateStreak(createStreak(), [did(TODAY, 2)], TODAY).streak).toEqual(createStreak());
  });

  it('continues after a day that a freeze covered', () => {
    const covered = updateStreak(
      streakOf({ current: 9, best: 9, freezes: 1, lastCountedDate: ago(2) }),
      [did(ago(2))],
      TODAY,
    ).streak;
    const result = updateStreak(covered, [did(ago(2)), did(TODAY)], TODAY);
    expect(result.streak.current).toBe(10);
  });

  it('restarts at 1, not at the old number, after a reset', () => {
    const before = streakOf({ current: 9, best: 9, lastCountedDate: ago(3) });
    const result = updateStreak(before, [did(TODAY)], TODAY);
    expect(result.streak).toMatchObject({ current: 1, best: 9 });
  });

  it('counts missed days from the record when the app was not opened, and uses freezes on the rest', () => {
    const before = streakOf({ current: 3, best: 3, freezes: 1, lastCountedDate: ago(3) });
    const result = updateStreak(before, [did(ago(2)), did(TODAY)], TODAY);
    // ago(2) counted (4), ago(1) missed and covered, today counted (5).
    expect(result.streak.current).toBe(5);
    expect(result.freezeUsedOn).toEqual([ago(1)]);
  });

  it('uses each freeze for one day, then resets', () => {
    const before = streakOf({ current: 20, best: 20, freezes: 2, lastCountedDate: ago(4) });
    const result = updateStreak(before, [], TODAY);
    expect(result.freezeUsedOn).toEqual([ago(3), ago(2)]);
    expect(result.streak).toMatchObject({ current: 0, freezes: 0, lastCountedDate: ago(1) });
  });

  it('walks across month and year ends', () => {
    const before = streakOf({ current: 2, best: 2, freezes: 0, lastCountedDate: '2025-12-31' });
    const result = updateStreak(before, [did('2026-01-01')], '2026-01-01');
    expect(result.streak.current).toBe(3);
  });

  it('is idempotent: the same call twice changes nothing, and no freeze is spent twice', () => {
    const before = streakOf({ current: 9, best: 9, freezes: 1, lastCountedDate: ago(2) });
    const days = [did(ago(2))];
    const once = updateStreak(before, days, TODAY);
    const twice = updateStreak(once.streak, days, TODAY);
    expect(twice.streak).toEqual(once.streak);
    expect(twice.freezeUsedOn).toEqual([]);
  });

  it('more exercises on a day that is already counted change nothing', () => {
    const first = updateStreak(createStreak(), [did(TODAY, 5)], TODAY);
    const later = updateStreak(first.streak, [did(TODAY, 12)], TODAY);
    expect(later.streak).toEqual(first.streak);
    expect(later.todayCounted).toBe(true);
  });

  it('ignores a last counted date in the future', () => {
    const before = streakOf({ current: 4, best: 4, lastCountedDate: addDays(TODAY, 2) });
    expect(updateStreak(before, [], TODAY).streak).toEqual(before);
  });

  it('keeps the best streak after a reset', () => {
    const result = updateStreak(
      streakOf({ current: 12, best: 12, lastCountedDate: ago(5) }),
      [],
      TODAY,
    );
    expect(result.streak).toMatchObject({ current: 0, best: 12 });
  });

  it('does not touch the stored streak object', () => {
    const before = streakOf({ current: 9, best: 9, freezes: 1, lastCountedDate: ago(2) });
    const copy = structuredClone(before);
    updateStreak(before, [], TODAY);
    expect(before).toEqual(copy);
  });
});

describe('streak: freezes', () => {
  function simulate(start: StreakState, from: string, count: number): StreakState {
    let current = start;
    for (let i = 0; i < count; i++) {
      const date = addDays(from, i);
      current = updateStreak(current, [did(date)], date).streak;
    }
    return current;
  }

  it('earns a freeze at 7 days and another at 14, holding 2 on day 14', () => {
    const day7 = simulate(createStreak(), '2026-09-01', 7);
    expect(day7).toMatchObject({ current: 7, freezes: 1 });
    const day14 = simulate(createStreak(), '2026-09-01', 14);
    expect(day14).toMatchObject({ current: 14, freezes: 2 });
  });

  it('reaches a 14 day streak holding 0 freezes and ends with 1 when it was 13 with none', () => {
    const before = streakOf({ current: 13, best: 13, freezes: 0, lastCountedDate: ago(1) });
    const result = updateStreak(before, [did(TODAY)], TODAY);
    expect(result.streak).toMatchObject({ current: 14, freezes: 1 });
  });

  it('is already holding 2 freezes: reaching 7 or 14 days stays at 2', () => {
    const at6 = streakOf({ current: 6, best: 6, freezes: 2, lastCountedDate: ago(1) });
    expect(updateStreak(at6, [did(TODAY)], TODAY).streak).toMatchObject({ current: 7, freezes: 2 });
    const at13 = streakOf({ current: 13, best: 13, freezes: 2, lastCountedDate: ago(1) });
    expect(updateStreak(at13, [did(TODAY)], TODAY).streak).toMatchObject({
      current: 14,
      freezes: 2,
    });
  });

  it('earns no freeze on a day a freeze covers', () => {
    const before = streakOf({ current: 7, best: 7, freezes: 0, lastCountedDate: ago(1) });
    const noFreeze = updateStreak(before, [], TODAY).streak;
    expect(noFreeze.freezes).toBe(0);
    const covered = updateStreak({ ...before, freezes: 1, lastCountedDate: ago(2) }, [], TODAY);
    expect(covered.streak.freezes).toBe(0);
    expect(covered.streak.current).toBe(7);
  });
});
