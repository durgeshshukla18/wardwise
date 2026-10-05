// Leitner boxes and the Mistake Bank (docs/02-LEARNING-AND-CONTENT.md section 3). Pure functions.
import type {
  AnswerInput,
  AnswerResult,
  Box,
  ExerciseId,
  Format,
  ItemState,
  ItemStateName,
  RetryOutcome,
} from './types.ts';

/** Due times are multiples of 24 hours in milliseconds. */
export const DAY_MS = 86_400_000;

/** Days to wait after moving into each box. */
export const BOX_WAIT_DAYS: Readonly<Record<Box, number>> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };

/** Recognition-only answers cannot lift an item above this box. */
export const RECOGNITION_CAP: Box = 3;

export const RETRY_LABELS: Readonly<Record<RetryOutcome, string>> = {
  fixed_for_now: 'Fixed for now',
  still_tricky: 'Still tricky',
};

/** E2 to E5 are recognition. E6 to E10 make the learner produce German. E1 is not an answer. */
export function exerciseFormat(exercise: ExerciseId): Format | null {
  if (exercise === 'E1') return null;
  return ['E2', 'E3', 'E4', 'E5'].includes(exercise) ? 'recognition' : 'production';
}

/** Learning for boxes 1 to 3, Strong for boxes 4 and 5. */
export function stateForBox(box: Box): Exclude<ItemStateName, 'new'> {
  return box >= 4 ? 'strong' : 'learning';
}

/** An item the learner has not met yet. It becomes Learning after its first Learn card. */
export function createNewItemState(itemId: string, now: number): ItemState {
  return {
    itemId,
    box: 1,
    dueAt: now,
    state: 'new',
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    everProduced: false,
    inMistakeBank: false,
    bankEnteredAt: null,
    bankCorrectDays: [],
  };
}

/** E1 is not an answer. It moves a New item into box 1, due now. */
export function completeLearnCard(state: ItemState, now: number): ItemState {
  if (state.state !== 'new') return { ...state, lastSeenAt: now };
  return { ...state, box: 1, dueAt: now, state: 'learning', lastSeenAt: now };
}

export function applyAnswer(state: ItemState, input: AnswerInput): AnswerResult {
  if (state.state === 'new') {
    throw new Error(`Item ${state.itemId} has no Learn card yet. Complete E1 first.`);
  }
  return input.correct ? applyCorrect(state, input) : applyWrong(state, input);
}

function applyCorrect(state: ItemState, input: AnswerInput): AnswerResult {
  const everProduced = state.everProduced || input.format === 'production';
  // Only a review that was due moves the item. Extra rounds and drills before the due time
  // still count the answer, but the box and due time stay as they are.
  const wasDue = state.dueAt <= input.now;
  const raised = Math.min(state.box + 1, 5) as Box;
  const capped = everProduced ? raised : (Math.min(raised, RECOGNITION_CAP) as Box);
  // A correct answer never lowers the box.
  const box = wasDue ? (Math.max(capped, state.box) as Box) : state.box;

  const next: ItemState = {
    ...state,
    box,
    dueAt: wasDue ? input.now + BOX_WAIT_DAYS[box] * DAY_MS : state.dueAt,
    state: wasDue ? stateForBox(box) : state.state,
    correct: state.correct + 1,
    lastSeenAt: input.now,
    everProduced,
  };

  if (!state.inMistakeBank) return { state: next, bank: null };

  // Only answers on a later calendar day than the entry day count, and each day counts once.
  const afterEntry = state.bankEnteredAt !== null && state.bankEnteredAt < input.day.startMs;
  if (!afterEntry) return { state: next, bank: null };

  const days = state.bankCorrectDays.includes(input.day.date)
    ? state.bankCorrectDays
    : [...state.bankCorrectDays, input.day.date];

  if (input.format === 'production' && days.length >= 2) {
    const recovered: ItemState = { ...next, inMistakeBank: false, bankCorrectDays: [] };
    delete recovered.bankErrorType;
    return { state: recovered, bank: 'recovered' };
  }
  return { state: { ...next, bankCorrectDays: days }, bank: null };
}

function applyWrong(state: ItemState, input: AnswerInput): AnswerResult {
  if (input.errorType === null) throw new Error('A wrong answer needs an error type.');
  return {
    state: {
      ...state,
      box: 1,
      dueAt: input.now + BOX_WAIT_DAYS[1] * DAY_MS,
      state: 'learning',
      wrong: state.wrong + 1,
      lastSeenAt: input.now,
      inMistakeBank: true,
      bankEnteredAt: input.now,
      bankCorrectDays: [],
      bankErrorType: input.errorType,
    },
    bank: state.inMistakeBank ? null : 'entered',
  };
}

/** A same-session retry never changes the item. It only reports how it went. */
export function applyRetry(
  state: ItemState,
  correct: boolean,
): { state: ItemState; outcome: RetryOutcome } {
  return { state, outcome: correct ? 'fixed_for_now' : 'still_tricky' };
}

/** Items that have had a Learn card and are due now or within the window. */
export function dueWithin(
  states: Iterable<ItemState>,
  now: number,
  windowMs: number = DAY_MS,
): number {
  let count = 0;
  for (const state of states) {
    if (state.state !== 'new' && state.dueAt <= now + windowMs) count++;
  }
  return count;
}

/** The earliest due time after `now`, or null when nothing is waiting. */
export function nextReviewAt(states: Iterable<ItemState>, now: number): number | null {
  let earliest: number | null = null;
  for (const state of states) {
    if (state.state === 'new' || state.dueAt <= now) continue;
    if (earliest === null || state.dueAt < earliest) earliest = state.dueAt;
  }
  return earliest;
}
