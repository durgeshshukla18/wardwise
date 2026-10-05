// All reads and writes of learner state. Takes the database so tests can pass their own.
import type { ItemState } from '../domain/types.ts';
import type { WardwiseDb } from './db.ts';
import type { DemoSeed } from './demo-seed.ts';
import {
  EXPORT_FORMAT,
  SCHEMA_VERSION,
  SINGLETON_KEY,
  type ExportFile,
  type AttemptRow,
  type DayRow,
  type EventRow,
  type ProfileRow,
  type SessionRow,
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

  const attempts = {
    add: (row: AttemptRow) => db.attempts.add(row),
    all: (): Promise<AttemptRow[]> => db.attempts.toArray(),
    /** How many items had their first Learn card (E1) since `startMs`. */
    newItemsSince: (startMs: number): Promise<number> =>
      db.attempts
        .where('ts')
        .aboveOrEqual(startMs)
        .filter((attempt) => attempt.exercise === 'E1')
        .count(),
  };

  const sessions = {
    get: (id: string): Promise<SessionRow | undefined> => db.sessions.get(id),
    all: (): Promise<SessionRow[]> => db.sessions.toArray(),
    update: (id: string, changes: Partial<SessionRow>) => db.sessions.update(id, changes),
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

  /** Every table, as one object that can be saved as a JSON file. */
  async function exportAll(exportedAt: number): Promise<ExportFile> {
    const tables: ExportFile['tables'] = {};
    for (const table of db.tables) tables[table.name] = await table.toArray();
    return { format: EXPORT_FORMAT, schemaVersion: SCHEMA_VERSION, exportedAt, tables };
  }

  /** Saves a new session and today's day row together. */
  async function startSession(row: SessionRow, day: DayRow): Promise<void> {
    await db.transaction('rw', db.sessions, db.days, async () => {
      await db.sessions.add(row);
      await db.days.put(day);
    });
  }

  /**
   * Saves one completed exercise in one transaction: the attempt, the item's new state (null when
   * a retry changes nothing), today's day row, and the streak when it changed.
   */
  async function recordExercise(entry: {
    attempt: AttemptRow;
    itemState: ItemState | null;
    day: DayRow;
    streak: StreakRow | null;
  }): Promise<void> {
    await db.transaction('rw', db.attempts, db.itemState, db.days, db.streak, async () => {
      await db.attempts.add(entry.attempt);
      if (entry.itemState) await db.itemState.put(entry.itemState);
      await db.days.put(entry.day);
      if (entry.streak) await db.streak.put(entry.streak);
    });
  }

  return {
    profile,
    itemStates,
    days,
    streak,
    attempts,
    sessions,
    events,
    resetAll,
    loadSeed,
    exportAll,
    startSession,
    recordExercise,
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
