// Use cases that update learner progress. They combine the engine with the repositories.
import type { Repositories } from '../data/repositories.ts';
import { SINGLETON_KEY, type DayRow, type StreakRow } from '../data/schema.ts';
import { createStreak, updateStreak } from '../domain/streak.ts';
import type { EventName, EventProps } from '../services/events.ts';
import { localDay } from '../services/clock.ts';

/**
 * Walks the streak up to today: missed days use a freeze or reset the streak, a counted day
 * extends it. Saves the streak only if it changed, and logs each freeze that was used.
 */
export async function refreshStreak(
  repos: Pick<Repositories, 'streak'>,
  log: (name: EventName, props?: EventProps) => Promise<void>,
  current: StreakRow | undefined,
  days: readonly DayRow[],
  nowMs: number,
): Promise<StreakRow | undefined> {
  const base: StreakRow = current ?? { id: SINGLETON_KEY, ...createStreak() };
  const { streak, freezeUsedOn } = updateStreak(base, days, localDay(nowMs).date);
  const unchanged =
    streak.current === base.current &&
    streak.best === base.best &&
    streak.freezes === base.freezes &&
    streak.lastCountedDate === base.lastCountedDate &&
    streak.freezeDays.length === base.freezeDays.length;
  if (unchanged) return current;

  const next: StreakRow = { id: SINGLETON_KEY, ...streak };
  await repos.streak.put(next);
  for (const date of freezeUsedOn) await log('streak_freeze_used', { date });
  return next;
}
