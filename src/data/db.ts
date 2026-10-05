import { Dexie, type EntityTable } from 'dexie';

import {
  SCHEMA_VERSION,
  STORES,
  type AiCacheRow,
  type AiUsageRow,
  type AttemptRow,
  type DayRow,
  type EventRow,
  type FeedbackRow,
  type ItemStateRow,
  type ProfileRow,
  type SessionRow,
  type StreakRow,
} from './schema.ts';

export type WardwiseDb = Dexie & {
  profile: EntityTable<ProfileRow, 'id'>;
  itemState: EntityTable<ItemStateRow, 'itemId'>;
  attempts: EntityTable<AttemptRow, 'id'>;
  sessions: EntityTable<SessionRow, 'id'>;
  days: EntityTable<DayRow, 'date'>;
  streak: EntityTable<StreakRow, 'id'>;
  aiCache: EntityTable<AiCacheRow, 'key'>;
  aiUsage: EntityTable<AiUsageRow, 'date'>;
  feedback: EntityTable<FeedbackRow, 'id'>;
  events: EntityTable<EventRow, 'id'>;
};

/** Tests pass their own name so each one gets an empty database. */
export function createDb(name = 'wardwise'): WardwiseDb {
  const instance = new Dexie(name) as WardwiseDb;
  instance.version(SCHEMA_VERSION).stores(STORES);
  return instance;
}

export const db = createDb();
