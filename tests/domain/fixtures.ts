// Shared test data. Items come from the shipped content so no German is written in tests.
import { z } from 'zod';

import itemsJson from '../../src/content/items.json';
import { itemSchema, type Item } from '../../src/content/schema.ts';
import { addDays } from '../../src/domain/dates.ts';
import { DAY_MS, createNewItemState } from '../../src/domain/scheduler.ts';
import type { ItemState, LocalDay } from '../../src/domain/types.ts';

export const ITEMS: Item[] = z.array(itemSchema).parse(itemsJson);

export function item(id: string): Item {
  const found = ITEMS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`fixture item ${id} not found`);
  return found;
}

/** 2026-10-05 12:00, treated as local time. */
export const NOW = Date.UTC(2026, 9, 5, 12, 0, 0);
export const TODAY: LocalDay = { date: '2026-10-05', startMs: Date.UTC(2026, 9, 5) };

/** The calendar day `n` days after TODAY. */
export function dayAfter(n: number): LocalDay {
  return { date: addDays(TODAY.date, n), startMs: TODAY.startMs + n * DAY_MS };
}

/** A time during the calendar day `n` days after TODAY. */
export function nowOnDay(n: number): number {
  return NOW + n * DAY_MS;
}

/** A learning item in box 1, due tomorrow, unless overridden. */
export function state(itemId: string, overrides: Partial<ItemState> = {}): ItemState {
  return {
    ...createNewItemState(itemId, NOW),
    state: 'learning',
    box: 1,
    dueAt: NOW + DAY_MS,
    lastSeenAt: NOW - 3 * DAY_MS,
    ...overrides,
  };
}

export function stateMap(...states: ItemState[]): Map<string, ItemState> {
  return new Map(states.map((entry) => [entry.itemId, entry]));
}
