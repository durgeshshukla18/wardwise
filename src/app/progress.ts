// Use cases that update learner progress. They combine the engine with the repositories.
import type { Repositories } from '../data/repositories.ts';
import { SINGLETON_KEY, type DayRow, type StreakRow } from '../data/schema.ts';
import { createStreak, updateStreak } from '../domain/streak.ts';
import type { EventName, EventProps } from '../services/events.ts';
import { localDay } from '../services/clock.ts';

/**
 * Walks the streak up to today: missed days use a freeze or reset the streak, a counted day
 * extends it. `row` is null when nothing changed, so there is nothing to save.
 */
export function nextStreak(
  current: StreakRow | undefined,
  days: readonly DayRow[],
  nowMs: number,
): { row: StreakRow | null; freezeUsedOn: string[] } {
  const base: StreakRow = current ?? { id: SINGLETON_KEY, ...createStreak() };
  const { streak, freezeUsedOn } = updateStreak(base, days, localDay(nowMs).date);
  const unchanged =
    streak.current === base.current &&
    streak.best === base.best &&
    streak.freezes === base.freezes &&
    streak.lastCountedDate === base.lastCountedDate &&
    streak.freezeDays.length === base.freezeDays.length;
  return unchanged
    ? { row: null, freezeUsedOn }
    : { row: { id: SINGLETON_KEY, ...streak }, freezeUsedOn };
}

/** Brings the streak up to today, saves it only if it changed, and logs each freeze used. */
export async function refreshStreak(
  repos: Pick<Repositories, 'streak'>,
  log: (name: EventName, props?: EventProps) => Promise<void>,
  current: StreakRow | undefined,
  days: readonly DayRow[],
  nowMs: number,
): Promise<StreakRow | undefined> {
  const { row, freezeUsedOn } = nextStreak(current, days, nowMs);
  if (row === null) return current;
  await repos.streak.put(row);
  for (const date of freezeUsedOn) await log('streak_freeze_used', { date });
  return row;
}
