// The only place the app reads the time. The engine in src/domain always gets it as an argument.
import type { LocalDay } from '../domain/types.ts';

export function now(): number {
  return Date.now();
}

const pad = (value: number) => String(value).padStart(2, '0');

/** The device's local calendar day for a timestamp: its date string and its local midnight. */
export function localDay(timestamp: number): LocalDay {
  const moment = new Date(timestamp);
  const year = moment.getFullYear();
  const month = moment.getMonth();
  const day = moment.getDate();
  return {
    date: `${String(year).padStart(4, '0')}-${pad(month + 1)}-${pad(day)}`,
    startMs: new Date(year, month, day).getTime(),
  };
}
