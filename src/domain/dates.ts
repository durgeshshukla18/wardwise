// Calendar date maths on `YYYY-MM-DD` strings. No Date object, so no time zone or DST effects.
import type { LocalDate } from './types.ts';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Days since 1970-01-01 for a civil date (proleptic Gregorian).
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function civilFromDays(days: number): [number, number, number] {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthIndex = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1;
  const month = monthIndex < 10 ? monthIndex + 3 : monthIndex - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return [year, month, day];
}

/** Whole days since 1970-01-01. Throws on anything that is not a real calendar date. */
export function toDayNumber(date: LocalDate): number {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Not a YYYY-MM-DD date: ${date}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])] as const;
  const dayNumber = daysFromCivil(year, month, day);
  const [y, m, d] = civilFromDays(dayNumber);
  if (y !== year || m !== month || d !== day) throw new RangeError(`Not a real date: ${date}`);
  return dayNumber;
}

export function fromDayNumber(dayNumber: number): LocalDate {
  const [year, month, day] = civilFromDays(dayNumber);
  const pad = (value: number, width: number) => String(value).padStart(width, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Days from `from` to `to`. Negative when `to` is earlier. */
export function diffDays(from: LocalDate, to: LocalDate): number {
  return toDayNumber(to) - toDayNumber(from);
}
