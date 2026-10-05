import { describe, expect, it } from 'vitest';

import { copy } from '../../src/app/copy.ts';
import { formatUntil, sessionMinutes } from '../../src/app/format.ts';
import { localDay, now } from '../../src/services/clock.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('clock', () => {
  it('reads the current time', () => {
    expect(Math.abs(now() - Date.now())).toBeLessThan(1000);
  });

  it('gives the local calendar day and its local midnight', () => {
    const moment = new Date(2026, 9, 5, 14, 30).getTime();
    const day = localDay(moment);
    expect(day.date).toBe('2026-10-05');
    expect(day.startMs).toBe(new Date(2026, 9, 5).getTime());
    expect(localDay(day.startMs).date).toBe('2026-10-05');
    expect(localDay(day.startMs - 1).date).toBe('2026-10-04');
  });

  it('pads single digit months and days', () => {
    expect(localDay(new Date(2026, 0, 3, 12).getTime()).date).toBe('2026-01-03');
  });
});

describe('formatUntil', () => {
  it('uses minutes, hours or days, rounded', () => {
    expect(formatUntil(10_000)).toBe('in less than a minute');
    expect(formatUntil(MINUTE)).toBe('in 1 minute');
    expect(formatUntil(45 * MINUTE)).toBe('in 45 minutes');
    expect(formatUntil(61 * MINUTE)).toBe('in 1 hour');
    expect(formatUntil(6 * HOUR)).toBe('in 6 hours');
    expect(formatUntil(23 * HOUR + 20 * MINUTE)).toBe('in 23 hours');
    expect(formatUntil(DAY)).toBe('in 1 day');
    expect(formatUntil(2.4 * DAY)).toBe('in 2 days');
  });

  it('gives about 3 minutes for a session of 10', () => {
    expect([5, 10, 15].map(sessionMinutes)).toEqual([2, 3, 5]);
    expect(sessionMinutes(1)).toBe(1);
  });
});

// The copy rules of docs/03-DESIGN.md section 7, applied to every string in copy.ts.
const BANNED = [
  'unlock',
  'supercharge',
  'level up',
  'journey',
  'boost',
  'seamless',
  'empower',
  'dive in',
  'awesome',
  'amazing',
  'oops',
];

function collect(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') found.push(value);
  else if (typeof value === 'function') {
    for (const args of [
      [0],
      [1],
      [2],
      [7],
      ['Anna'],
      [10, 3],
      [1, 1],
      ['T01', 'A1', 3],
      ['der Kopf'],
    ]) {
      try {
        collect((value as (...a: unknown[]) => unknown)(...args), found);
      } catch {
        // an argument shape this function does not take
      }
    }
  } else if (Array.isArray(value)) value.forEach((entry) => collect(entry, found));
  else if (value && typeof value === 'object')
    Object.values(value).forEach((v) => collect(v, found));
  return found;
}

describe('copy', () => {
  const strings = collect(copy);

  it('collects a useful number of strings', () => {
    expect(strings.length).toBeGreaterThan(40);
  });

  it('has no em dashes, no exclamation marks and none of the banned words', () => {
    for (const text of strings) {
      expect(text, text).not.toContain('—');
      expect(text, text).not.toContain('!');
      for (const word of BANNED) expect(text.toLowerCase(), text).not.toContain(word);
    }
  });

  it('holds plain English only: no German or Hindi, which come from content fields', () => {
    for (const text of strings) expect(text, text).toMatch(/^[\x20-\x7E]*$/);
  });

  it('matches the examples in the voice table', () => {
    expect(copy.today.streak(9)).toBe('9 days in a row.');
    expect(copy.today.nothingDueNow('in 6 hours')).toBe(
      'Nothing due now. Your next review is in 6 hours.',
    );
    expect(copy.today.dueWithin24Hours(7)).toBe('7 items due in the next 24 hours.');
    expect(copy.today.shiftBreakMeta(10, 3)).toBe('10 exercises, 3 minutes');
  });
});
