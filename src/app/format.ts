import { copy } from './copy.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** "in 6 hours", "in 2 days": how far away a future moment is. */
export function formatUntil(ms: number): string {
  if (ms < MINUTE_MS) return copy.time.lessThanAMinute;
  if (ms < HOUR_MS) return copy.time.minutes(Math.ceil(ms / MINUTE_MS));
  if (ms < DAY_MS) return copy.time.hours(Math.max(1, Math.round(ms / HOUR_MS)));
  return copy.time.days(Math.max(1, Math.round(ms / DAY_MS)));
}

/** About 3 minutes for 10 exercises. */
export function sessionMinutes(exercises: number): number {
  return Math.max(1, Math.floor((exercises * 3 + 5) / 10));
}
