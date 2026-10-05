// Streak, freezes and the daily goal (docs/02-LEARNING-AND-CONTENT.md, retention loop).
import { addDays, diffDays } from './dates.ts';
import type { DayCount, LocalDate, StreakState, StreakUpdate } from './types.ts';

/** A day counts when the learner completes at least this many exercises. */
export const DAILY_GOAL = 5;
/** One freeze is earned each time the streak reaches a multiple of this. */
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;

export function createStreak(): StreakState {
  return { current: 0, best: 0, freezes: 0, lastCountedDate: null, freezeDays: [] };
}

/**
 * Walks the local dates after `lastCountedDate` up to `today`.
 * A day with enough exercises extends the streak. A missed day uses a freeze, or resets the
 * streak to 0 when none is left. Today is never counted as missed. Calling it again with the
 * same inputs changes nothing.
 */
export function updateStreak(
  streak: StreakState,
  days: readonly DayCount[],
  today: LocalDate,
): StreakUpdate {
  const counted = new Set(days.filter((d) => d.exercisesDone >= DAILY_GOAL).map((d) => d.date));
  let { current, best, freezes, lastCountedDate } = streak;
  const freezeDays = [...streak.freezeDays];
  const freezeUsedOn: LocalDate[] = [];

  const first = lastCountedDate === null ? today : addDays(lastCountedDate, 1);
  const span = diffDays(first, today);

  for (let offset = 0; offset <= span; offset++) {
    const date = addDays(first, offset);
    if (counted.has(date)) {
      current += 1;
      best = Math.max(best, current);
      if (current % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
      lastCountedDate = date;
    } else if (date !== today) {
      if (freezes > 0) {
        freezes -= 1;
        freezeDays.push(date);
        freezeUsedOn.push(date);
      } else {
        current = 0;
      }
      lastCountedDate = date;
    }
  }

  return {
    streak: { current, best, freezes, lastCountedDate, freezeDays },
    freezeUsedOn,
    todayCounted: lastCountedDate === today,
  };
}
