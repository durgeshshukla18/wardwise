// Saves a session as it happens: after every exercise, not at the end.
import { nextStreak } from '../../app/progress.ts';
import type { Repositories } from '../../data/repositories.ts';
import type { AttemptRow, DayRow, SessionRow } from '../../data/schema.ts';
import type { ItemState } from '../../domain/types.ts';
import { localDay } from '../../services/clock.ts';
import type { EventName, EventProps } from '../../services/events.ts';

export type LogFn = (name: EventName, props?: EventProps) => Promise<void>;

export type RecordInput = {
  attempt: AttemptRow;
  /** The item's new state, or null when nothing about the item changed (a retry). */
  itemState: ItemState | null;
  bank: 'entered' | 'recovered' | null;
  nowMs: number;
};

export function createPersist(repos: Repositories, log: LogFn) {
  return {
    newItemsToday: (startOfDayMs: number): Promise<number> =>
      repos.attempts.newItemsSince(startOfDayMs),

    async startSession(row: SessionRow): Promise<void> {
      const { date } = localDay(row.startedAt);
      const existing = await repos.days.get(date);
      await repos.startSession(row, {
        date,
        exercisesDone: existing?.exercisesDone ?? 0,
        sessions: (existing?.sessions ?? 0) + 1,
      });
      await log('session_start', { mode: row.mode, planned: row.itemIds.length });
    },

    /** One transaction: the attempt, the item, today's count and the streak. */
    async recordExercise({ attempt, itemState, bank, nowMs }: RecordInput): Promise<void> {
      const { date } = localDay(nowMs);
      const existing = await repos.days.get(date);
      const day: DayRow = {
        date,
        exercisesDone: (existing?.exercisesDone ?? 0) + 1,
        sessions: existing?.sessions ?? 1,
      };
      const others = (await repos.days.all()).filter((row) => row.date !== date);
      const { row: streak, freezeUsedOn } = nextStreak(
        await repos.streak.get(),
        [...others, day],
        nowMs,
      );
      await repos.recordExercise({ attempt, itemState, day, streak });

      await log('exercise_result', {
        exercise: attempt.exercise,
        correct: attempt.correct,
        errorType: attempt.errorType,
      });
      if (bank === 'entered') {
        await log('mistake_bank_enter', {
          itemId: attempt.itemId,
          errorType: attempt.errorType,
        });
      }
      if (bank === 'recovered') await log('mistake_bank_recover', { itemId: attempt.itemId });
      for (const freezeDate of freezeUsedOn) {
        await log('streak_freeze_used', { date: freezeDate });
      }
    },

    async finishSession(
      id: string,
      endedAt: number,
      completed: boolean,
      props: EventProps,
    ): Promise<void> {
      await repos.sessions.update(id, { endedAt, completed });
      await log('session_end', { completed, ...props });
    },
  };
}

export type Persist = ReturnType<typeof createPersist>;
