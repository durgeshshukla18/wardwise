// Data model from section 9 (docs/04-TRD.md). Pure: no Dexie, no browser APIs.
import type { ErrorType, Level } from '../content/schema.ts';

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

/** Local calendar date, `YYYY-MM-DD`. */
export type LocalDate = string;

export type ExerciseId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10';

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

export type ItemStateRow = {
  itemId: string;
  box: 1 | 2 | 3 | 4 | 5;
  dueAt: number;
  state: 'new' | 'learning' | 'strong';
  correct: number;
  wrong: number;
  lastSeenAt: number | null;
  everProduced: boolean;
  inMistakeBank: boolean;
  bankEnteredAt: number | null;
  bankCorrectDays: LocalDate[];
  bankErrorType?: ErrorType;
};

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

export type SessionRow = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  mode: string;
  itemIds: string[];
  completed: boolean;
};

export type DayRow = {
  date: LocalDate;
  exercisesDone: number;
  sessions: number;
};

export type StreakRow = {
  id: typeof SINGLETON_KEY;
  current: number;
  best: number;
  freezes: number;
  lastCountedDate: LocalDate | null;
  freezeDays: LocalDate[];
};

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
