// Types shared by the engine (docs/04-TRD.md section 9). Type-only imports: nothing here runs.
import type { ErrorType, Item, Level } from '../content/schema.ts';

export type { ErrorType, Item, Level };

export type ExerciseId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10';
export type Box = 1 | 2 | 3 | 4 | 5;
export type Format = 'recognition' | 'production';
export type InputMode = 'choice' | 'typed' | 'spoken' | 'chips';

/** Returns a number in [0, 1). Always passed in, never Math.random. */
export type Rng = () => number;

/** Local calendar date, `YYYY-MM-DD`. */
export type LocalDate = string;

/** One local calendar day: its date string and the timestamp of its local midnight. */
export type LocalDay = { date: LocalDate; startMs: number };

export type ItemStateName = 'new' | 'learning' | 'strong';

export type ItemState = {
  itemId: string;
  box: Box;
  dueAt: number;
  state: ItemStateName;
  correct: number;
  wrong: number;
  lastSeenAt: number | null;
  everProduced: boolean;
  inMistakeBank: boolean;
  bankEnteredAt: number | null;
  bankCorrectDays: LocalDate[];
  bankErrorType?: ErrorType;
};

export type StreakState = {
  current: number;
  best: number;
  freezes: number;
  /** The last date that was counted or covered by a freeze. */
  lastCountedDate: LocalDate | null;
  freezeDays: LocalDate[];
};

export type DayCount = { date: LocalDate; exercisesDone: number };

// Scheduler

export type AnswerInput = {
  correct: boolean;
  format: Format;
  now: number;
  day: LocalDay;
  /** Required when the answer is wrong. */
  errorType: ErrorType | null;
};

export type AnswerResult = {
  state: ItemState;
  bank: 'entered' | 'recovered' | null;
};

export type RetryOutcome = 'fixed_for_now' | 'still_tricky';

// Composer

export type Slot = {
  itemId: string;
  exercise: ExerciseId;
  /** A same-session retry of a wrong answer. */
  retry?: boolean;
  /** The same-session quiz after a new item's Learn card. */
  followUp?: boolean;
};

export type Capabilities = {
  /** Speech recognition is supported and switched on. */
  speech: boolean;
  /** A German voice is available. */
  audio: boolean;
};

export type ComposeSettings = Capabilities & {
  level: Level;
  sessionLength: 5 | 10 | 15;
};

export type ComposeInput = {
  items: readonly Item[];
  states: ReadonlyMap<string, ItemState>;
  now: number;
  day: LocalDay;
  settings: ComposeSettings;
  /** New items already learned on this calendar day. */
  newItemsToday: number;
  rng: Rng;
  /** An Extra round: Learning items seen today may be asked again. Default false. */
  extraRound?: boolean;
  /** Exercise types the app can run. Others fall back by the usual rules. Default: all. */
  enabledExercises?: readonly ExerciseId[];
};

export type ComposedSession = {
  slots: Slot[];
  /** How many of the required speaking exercises could not be placed. */
  speakingShortfall: number;
};

// Checker

export type CheckRequest =
  | {
      exercise: 'E2' | 'E3' | 'E4' | 'E5';
      item: Item;
      chosen: string;
      correctOption: string;
    }
  | {
      exercise: 'E6' | 'E7' | 'E8';
      item: Item;
      input: Exclude<InputMode, 'choice'>;
      /** Up to 3 speech alternatives, or one typed answer. */
      answers: string[];
    }
  | {
      exercise: 'E9';
      item: Item;
      /** The typed digits. */
      answers: string[];
    }
  | {
      exercise: 'E10';
      input: 'typed' | 'spoken';
      answers: string[];
      accepted: string[];
    };

export type CheckResult = {
  /** `undecided` only when `needsAI` is true. */
  verdict: 'correct' | 'wrong' | 'undecided';
  errorType: ErrorType | null;
  needsAI: boolean;
  /** The answer to show the learner. */
  expected: string;
  /** One sentence for a wrong answer, or the rule-based fallback when undecided. */
  feedback: string | null;
};

// Streak

export type StreakUpdate = {
  streak: StreakState;
  /** Dates a freeze covered during this update. */
  freezeUsedOn: LocalDate[];
  todayCounted: boolean;
};
