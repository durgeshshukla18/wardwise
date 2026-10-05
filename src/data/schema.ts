// Data model from section 9 (docs/04-TRD.md). Pure: no Dexie, no browser APIs.
import type { ErrorType, Level } from '../content/schema.ts';
import type { ExerciseId, ItemState, LocalDate, StreakState } from '../domain/types.ts';

export type { ExerciseId, LocalDate };

export const SCHEMA_VERSION = 1;

// Dexie store definitions: primary key first, then indexes.
export const STORES = {
  profile: 'id',
  itemState: 'itemId, dueAt',
  attempts: 'id, sessionId, itemId, ts',
  sessions: 'id',
  days: 'date',
  streak: 'id',
  aiCache: 'key',
  aiUsage: 'date',
  feedback: 'id',
  events: 'id',
} as const;

export const SINGLETON_KEY = 'me';

/** The file Settings exports. Import (Phase 5) rejects a wrong `format` or a newer version. */
export const EXPORT_FORMAT = 'wardwise-export';

export type ExportFile = {
  format: typeof EXPORT_FORMAT;
  schemaVersion: number;
  exportedAt: number;
  tables: Record<string, unknown[]>;
};

export type ProfileRow = {
  id: typeof SINGLETON_KEY;
  name: string;
  level: Level;
  sessionLength: 5 | 10 | 15;
  hindiHints: boolean;
  speechOn: boolean;
  audioSpeed: 1 | 0.8;
  onboardedAt: number | null;
  onboarding: { goal: string; dailyTime: string; selfLevel: string } | null;
};

export type ItemStateRow = ItemState;

export type AttemptRow = {
  id: string;
  sessionId: string;
  itemId: string;
  exercise: ExerciseId;
  correct: boolean;
  errorType: ErrorType | null;
  answer: string;
  ts: number;
  aiUsed: boolean;
};

/** An Extra round is a `shift_break` session, not a sixth mode. */
export const SESSION_MODES = ['shift_break', 'topic', 'drill', 'scenario', 'daily_case'] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export type SessionRow = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  mode: SessionMode;
  itemIds: string[];
  completed: boolean;
};

export type DayRow = {
  date: LocalDate;
  exercisesDone: number;
  sessions: number;
};

export type StreakRow = StreakState & { id: typeof SINGLETON_KEY };

export type AiCacheRow = {
  key: string;
  response: unknown;
  createdAt: number;
};

export type AiUsageRow = {
  date: LocalDate;
  count: number;
};

export type FeedbackRow = {
  id: string;
  ts: number;
  screen: string;
  text: string;
  rating: number;
};

export type EventRow = {
  id: string;
  ts: number;
  name: string;
  props: Record<string, unknown>;
};
