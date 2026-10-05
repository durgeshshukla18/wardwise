// All reads and writes of learner state. Takes the database so tests can pass their own.
import type { ItemState } from '../domain/types.ts';
import type { WardwiseDb } from './db.ts';
import type { DemoSeed } from './demo-seed.ts';
import {
  SINGLETON_KEY,
  type DayRow,
  type EventRow,
  type ProfileRow,
  type StreakRow,
} from './schema.ts';

export function createRepositories(db: WardwiseDb) {
  const profile = {
    get: (): Promise<ProfileRow | undefined> => db.profile.get(SINGLETON_KEY),
    put: (row: ProfileRow) => db.profile.put(row),
  };

  const itemStates = {
    async all(): Promise<Map<string, ItemState>> {
      const rows = await db.itemState.toArray();
      return new Map(rows.map((row) => [row.itemId, row]));
    },
    put: (row: ItemState) => db.itemState.put(row),
    putMany: (rows: ItemState[]) => db.itemState.bulkPut(rows),
  };

  const days = {
    all: (): Promise<DayRow[]> => db.days.toArray(),
    get: (date: string): Promise<DayRow | undefined> => db.days.get(date),
    put: (row: DayRow) => db.days.put(row),
  };

  const streak = {
    get: (): Promise<StreakRow | undefined> => db.streak.get(SINGLETON_KEY),
    put: (row: StreakRow) => db.streak.put(row),
  };

  const events = {
    add: (row: EventRow) => db.events.add(row),
    all: (): Promise<EventRow[]> => db.events.toArray(),
  };

  /** Deletes everything this device holds. */
  async function resetAll(): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });
  }

  /** Replaces all progress with a seeded profile, in one transaction. */
  async function loadSeed(seed: DemoSeed): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
      await db.profile.put(seed.profile);
      await db.itemState.bulkPut(seed.itemStates);
      await db.days.bulkPut(seed.days);
      await db.streak.put(seed.streak);
    });
  }

  return { profile, itemStates, days, streak, events, resetAll, loadSeed };
}

export type Repositories = ReturnType<typeof createRepositories>;
