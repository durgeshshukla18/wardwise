import { describe, expect, it, vi } from 'vitest';

import { refreshStreak } from '../../src/app/progress.ts';
import { createDb } from '../../src/data/db.ts';
import { createRepositories } from '../../src/data/repositories.ts';
import type { StreakRow } from '../../src/data/schema.ts';
import { addDays } from '../../src/domain/dates.ts';
import { localDay } from '../../src/services/clock.ts';

const moment = new Date(2026, 9, 5, 12).getTime();
const today = localDay(moment).date;
const ago = (n: number) => addDays(today, -n);
const streak = (over: Partial<StreakRow>): StreakRow => ({
  id: 'me',
  current: 9,
  best: 9,
  freezes: 1,
  lastCountedDate: ago(1),
  freezeDays: [],
  ...over,
});

let counter = 0;
const setup = () => {
  counter += 1;
  const repos = createRepositories(createDb(`test-progress-${counter}`));
  const log = vi.fn(async () => undefined);
  return { repos, log };
};

describe('refreshStreak', () => {
  it('changes nothing when the streak is already up to date, and saves nothing', async () => {
    const { repos, log } = setup();
    const current = streak({});
    const result = await refreshStreak(repos, log, current, [], moment);
    expect(result).toBe(current);
    expect(await repos.streak.get()).toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });

  it('with no streak and no days, saves nothing', async () => {
    const { repos, log } = setup();
    expect(await refreshStreak(repos, log, undefined, [], moment)).toBeUndefined();
    expect(await repos.streak.get()).toBeUndefined();
  });

  it('uses a freeze for a missed day, saves the streak and logs the event', async () => {
    const { repos, log } = setup();
    const current = streak({ lastCountedDate: ago(2) });
    const result = await refreshStreak(repos, log, current, [], moment);
    expect(result).toMatchObject({
      current: 9,
      freezes: 0,
      freezeDays: [ago(1)],
      lastCountedDate: ago(1),
    });
    expect(await repos.streak.get()).toEqual(result);
    expect(log).toHaveBeenCalledWith('streak_freeze_used', { date: ago(1) });
  });

  it('resets the streak when there is no freeze left', async () => {
    const { repos, log } = setup();
    const result = await refreshStreak(
      repos,
      log,
      streak({ freezes: 0, lastCountedDate: ago(3) }),
      [],
      moment,
    );
    expect(result).toMatchObject({ current: 0, best: 9 });
    expect(log).not.toHaveBeenCalled();
  });

  it('counts today once it has 5 exercises', async () => {
    const { repos, log } = setup();
    const result = await refreshStreak(
      repos,
      log,
      streak({}),
      [{ date: today, exercisesDone: 5, sessions: 1 }],
      moment,
    );
    expect(result).toMatchObject({ current: 10, lastCountedDate: today });
  });

  it('is repeatable: a second refresh changes nothing', async () => {
    const { repos, log } = setup();
    const first = await refreshStreak(repos, log, streak({ lastCountedDate: ago(2) }), [], moment);
    const second = await refreshStreak(repos, log, first, [], moment);
    expect(second).toBe(first);
    expect(log).toHaveBeenCalledTimes(1);
  });
});
