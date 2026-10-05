// The demo profile (F-01, docs/02-LEARNING-AND-CONTENT.md "Demo seed"). Pure: no Dexie, no clock.
// Every item state is built by replaying answers through the engine's own functions, so the
// seeded states are valid by construction. The same inputs always give the same seed.
import type { Item } from '../content/schema.ts';
import { addDays } from '../domain/dates.ts';
import { createRng, pick, shuffle } from '../domain/rng.ts';
import {
  BOX_WAIT_DAYS,
  DAY_MS,
  applyAnswer,
  completeLearnCard,
  createNewItemState,
} from '../domain/scheduler.ts';
import { createStreak, updateStreak } from '../domain/streak.ts';
import type { Box, DayCount, ErrorType, ItemState, LocalDay } from '../domain/types.ts';
import { SINGLETON_KEY, type DayRow, type ProfileRow, type StreakRow } from './schema.ts';

export type DemoSeed = {
  profile: ProfileRow;
  itemStates: ItemState[];
  days: DayRow[];
  streak: StreakRow;
};

export type DemoSeedInput = {
  items: readonly Item[];
  /** The moment the demo is created. Every time in the seed is relative to it. */
  now: number;
  /** The local day that `now` falls in. */
  day: LocalDay;
  seed: number;
  onboarding: NonNullable<ProfileRow['onboarding']>;
};

export const DEMO_NAME = 'Anjali';
export const DEMO_KNOWN_ITEMS = 40;
export const DEMO_DUE_WITHIN_24H = 7;

/** The 6 Mistake Bank items from the seed table in docs/02. */
export const DEMO_BANK: readonly { id: string; errorType: ErrorType }[] = [
  { id: 't01-bauch', errorType: 'article' },
  { id: 't01-hand', errorType: 'article' },
  { id: 't02-fieber', errorType: 'spelling' },
  { id: 't07-tablette', errorType: 'listening' },
  { id: 't03-bp-1', errorType: 'number' },
  { id: 't08-seit-wann', errorType: 'word_order' },
];

const HOUR = 3_600_000;

// Days with a counted day (5 or more exercises) or a partial day, as offsets from today.
// Replaying this from scratch gives a 9 day streak that ends yesterday, with 1 freeze earned
// at day 7 and never used. The run before the gap is only 6 days, so it earns no freeze.
const COUNTED_OFFSETS = [
  ...Array.from({ length: 9 }, (_, i) => -(i + 1)),
  ...Array.from({ length: 6 }, (_, i) => -(i + 11)),
  -18,
  -21,
  -23,
  -26,
];
const PARTIAL_OFFSETS = [-19, -24];
const HISTORY_DAYS = 28;

export function buildDemoSeed(input: DemoSeedInput): DemoSeed {
  const { items, now, day, seed, onboarding } = input;
  if (items.length < DEMO_KNOWN_ITEMS) {
    throw new Error(`The demo needs at least ${DEMO_KNOWN_ITEMS} items, got ${items.length}`);
  }
  const rng = createRng(seed);
  const jitter = (maxHours: number) => Math.floor(rng() * maxHours * HOUR);

  // The calendar day a timestamp falls in, counting whole days from today.
  const dayOf = (ms: number): LocalDay => {
    const offset = Math.floor((ms - day.startMs) / DAY_MS);
    return { date: addDays(day.date, offset), startMs: day.startMs + offset * DAY_MS };
  };

  // An item that reached `target` with its last answer at `lastAnswerAt`. Earlier answers are
  // placed backwards, each one after the previous box's wait, so every answer was due.
  const climb = (itemId: string, target: Box, lastAnswerAt: number): ItemState => {
    const answers = target - 1;
    const times: number[] = [];
    let at = lastAnswerAt;
    for (let k = answers; k >= 1; k--) {
      times[k] = at;
      at -= BOX_WAIT_DAYS[k as Box] * DAY_MS + jitter(6);
    }
    let current = completeLearnCard(createNewItemState(itemId, at), at);
    for (let k = 1; k <= answers; k++) {
      const when = times[k] as number;
      // Boxes 4 and 5 can only be reached by producing German (the recognition cap).
      const format = k >= 3 || rng() < 0.5 ? 'production' : 'recognition';
      current = applyAnswer(current, {
        correct: true,
        format,
        now: when,
        day: dayOf(when),
        errorType: null,
      }).state;
    }
    return current;
  };

  const byId = new Map(items.map((item) => [item.id, item]));
  for (const { id } of DEMO_BANK) {
    if (!byId.has(id)) throw new Error(`Demo Mistake Bank item ${id} is not in the content`);
  }

  // The 6 Mistake Bank items: climbed, then wrong within the last 29 hours. A wrong answer is due
  // 24 hours later, so all 6 are due within the next 24 hours.
  const bankStates = DEMO_BANK.map(({ id, errorType }, index) => {
    const wrongAt = now - (2 * HOUR + index * 5 * HOUR + jitter(2));
    const reached = pick<Box>([2, 3, 3, 4], rng);
    const before = climb(id, reached, wrongAt - BOX_WAIT_DAYS[reached] * DAY_MS - jitter(6));
    return applyAnswer(before, {
      correct: false,
      format: 'recognition',
      now: wrongAt,
      day: dayOf(wrongAt),
      errorType,
    }).state;
  });

  // The other known items. Exactly one more is due within 24 hours (overdue in box 2). Every
  // other one is due more than 24 hours from now.
  const bankIds = new Set(DEMO_BANK.map((entry) => entry.id));
  const candidates = shuffle(
    items.filter((item) => !bankIds.has(item.id)),
    rng,
  );
  const knownOthers = candidates.slice(0, DEMO_KNOWN_ITEMS - DEMO_BANK.length);
  const [dueExtra, ...rest] = knownOthers as [Item, ...Item[]];
  const boxQuota: [Box, number][] = [
    [2, 8],
    [3, 9],
    [4, 9],
    [5, rest.length - 26],
  ];

  const otherStates: ItemState[] = [climb(dueExtra.id, 2, now - 51 * HOUR)];
  let next = 0;
  for (const [box, quota] of boxQuota) {
    for (const item of rest.slice(next, next + quota)) {
      const waitMs = BOX_WAIT_DAYS[box] * DAY_MS;
      const dueAt = now + 26 * HOUR + Math.floor(rng() * (waitMs - 26 * HOUR));
      otherStates.push(climb(item.id, box, dueAt - waitMs));
    }
    next += quota;
  }

  // 28 days of history ending yesterday. Today has no row.
  const dayRows: DayRow[] = [
    ...COUNTED_OFFSETS.map((offset) => ({ offset, done: 5 + Math.floor(rng() * 10) })),
    ...PARTIAL_OFFSETS.map((offset) => ({ offset, done: 2 + Math.floor(rng() * 3) })),
  ]
    .sort((a, b) => a.offset - b.offset)
    .map(({ offset, done }) => ({
      date: addDays(day.date, offset),
      exercisesDone: done,
      sessions: done >= 10 ? 2 : 1,
    }));

  // Replay the history one day at a time, the way the app would have lived it.
  let streak = createStreak();
  for (let offset = -HISTORY_DAYS; offset <= -1; offset++) {
    const date = addDays(day.date, offset);
    const known: DayCount[] = dayRows.filter((row) => row.date <= date);
    streak = updateStreak(streak, known, date).streak;
  }
  if (
    streak.current !== 9 ||
    streak.freezes !== 1 ||
    streak.lastCountedDate !== addDays(day.date, -1)
  ) {
    throw new Error(
      `The demo history does not give a 9 day streak with 1 freeze: ${JSON.stringify(streak)}`,
    );
  }

  return {
    profile: {
      id: SINGLETON_KEY,
      name: DEMO_NAME,
      level: 'A1',
      sessionLength: 10,
      hindiHints: false,
      speechOn: true,
      audioSpeed: 1,
      onboardedAt: now - HISTORY_DAYS * DAY_MS,
      onboarding,
    },
    itemStates: [...bankStates, ...otherStates],
    days: dayRows,
    streak: { id: SINGLETON_KEY, ...streak },
  };
}
