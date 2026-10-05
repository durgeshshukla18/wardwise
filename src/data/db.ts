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

export const db = new Dexie('wardwise') as WardwiseDb;

db.version(SCHEMA_VERSION).stores(STORES);
