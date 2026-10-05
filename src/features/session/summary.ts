import type { ExerciseId } from '../../domain/types.ts';

export type ExerciseResult = {
  itemId: string;
  exercise: ExerciseId;
  /** Null for a Learn card, which is not an answer. */
  correct: boolean | null;
  retry: boolean;
  followUp: boolean;
};

/**
 * Items right: items answered with no wrong answer. Items to revisit: items answered wrong at
 * least once. Learn cards and same-session retries do not count either way.
 */
export function summarise(results: readonly ExerciseResult[]): {
  itemsRight: number;
  itemsToRevisit: number;
} {
  const answered = results.filter((result) => result.correct !== null && !result.retry);
  const wrong = new Set(answered.filter((r) => r.correct === false).map((r) => r.itemId));
  const right = new Set(
    answered.filter((r) => r.correct === true && !wrong.has(r.itemId)).map((r) => r.itemId),
  );
  return { itemsRight: right.size, itemsToRevisit: wrong.size };
}
