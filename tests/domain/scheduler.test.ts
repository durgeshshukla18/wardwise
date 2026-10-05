import { describe, expect, it } from 'vitest';

import { scheduleRetry } from '../../src/domain/composer.ts';
import { createRng } from '../../src/domain/rng.ts';
import {
  BOX_WAIT_DAYS,
  DAY_MS,
  RETRY_LABELS,
  applyAnswer,
  applyRetry,
  completeLearnCard,
  createNewItemState,
  dueWithin,
  nextReviewAt,
  stateForBox,
} from '../../src/domain/scheduler.ts';
import type { AnswerInput, Slot } from '../../src/domain/types.ts';
import { NOW, TODAY, state } from './fixtures.ts';

const right = (format: AnswerInput['format']): AnswerInput => ({
  correct: true,
  format,
  now: NOW,
  day: TODAY,
  errorType: null,
});
const wrong: AnswerInput = {
  correct: false,
  format: 'recognition',
  now: NOW,
  day: TODAY,
  errorType: 'article',
};

describe('scheduler: test plan cases', () => {
  it('#1 new item, Learn card completed: box 1, Learning, due now', () => {
    const fresh = createNewItemState('t01-kopf', NOW - DAY_MS);
    expect(fresh.state).toBe('new');
    const learned = completeLearnCard(fresh, NOW);
    expect(learned).toMatchObject({ box: 1, state: 'learning', dueAt: NOW, lastSeenAt: NOW });
  });

  it('#2 box 1, correct recognition answer: box 2, due in 2 days', () => {
    const { state: next } = applyAnswer(state('t01-kopf', { box: 1 }), right('recognition'));
    expect(next).toMatchObject({ box: 2, state: 'learning', dueAt: NOW + 2 * DAY_MS });
  });

  it('#3 box 3, never produced, correct recognition answer: stays box 3, due in 4 days', () => {
    const { state: next } = applyAnswer(
      state('t01-kopf', { box: 3, everProduced: false }),
      right('recognition'),
    );
    expect(next).toMatchObject({ box: 3, dueAt: NOW + 4 * DAY_MS, everProduced: false });
  });

  it('#4 box 3, correct production answer: box 4, Strong, due in 7 days', () => {
    const { state: next } = applyAnswer(
      state('t01-kopf', { box: 3, everProduced: false }),
      right('production'),
    );
    expect(next).toMatchObject({ box: 4, state: 'strong', dueAt: NOW + 7 * DAY_MS });
  });

  it('#5 box 5, correct answer: stays box 5, due in 14 days', () => {
    const { state: next } = applyAnswer(
      state('t01-kopf', { box: 5, state: 'strong', everProduced: true }),
      right('production'),
    );
    expect(next).toMatchObject({ box: 5, state: 'strong', dueAt: NOW + 14 * DAY_MS });
  });

  it('#6 box 4, wrong answer: box 1, due in 1 day, enters the Mistake Bank with an error type', () => {
    const result = applyAnswer(
      state('t01-kopf', { box: 4, state: 'strong', everProduced: true }),
      wrong,
    );
    expect(result.bank).toBe('entered');
    expect(result.state).toMatchObject({
      box: 1,
      state: 'learning',
      dueAt: NOW + DAY_MS,
      inMistakeBank: true,
      bankErrorType: 'article',
      bankEnteredAt: NOW,
    });
  });

  it('#11 retry after 2 other exercises, answered correctly: box unchanged, "Fixed for now"', () => {
    const afterWrong = applyAnswer(state('t01-kopf', { box: 4, state: 'strong' }), wrong).state;
    const queue: Slot[] = ['t02-fieber', 't01-kopf', 't03-puls', 't01-hand', 't01-arm'].map(
      (itemId) => ({ itemId, exercise: 'E6' }),
    );
    const withRetry = scheduleRetry(queue, 1, { id: 't01-kopf' }, createRng(1), true);
    expect(withRetry[4]).toMatchObject({ itemId: 't01-kopf', retry: true });
    expect(withRetry.slice(2, 4).map((slot) => slot.itemId)).toEqual(['t03-puls', 't01-hand']);

    const { state: afterRetry, outcome } = applyRetry(afterWrong, true);
    expect(afterRetry).toEqual(afterWrong);
    expect(afterRetry.box).toBe(1);
    expect(RETRY_LABELS[outcome]).toBe('Fixed for now');
  });
});

describe('scheduler: section 3 rules', () => {
  it('waits 1, 2, 4, 7 and 14 days for boxes 1 to 5', () => {
    expect(BOX_WAIT_DAYS).toEqual({ 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 });
    for (const [from, days] of [
      [1, 2],
      [2, 4],
      [3, 7],
      [4, 14],
    ] as const) {
      const { state: next } = applyAnswer(
        state('t01-kopf', { box: from, everProduced: true }),
        right('production'),
      );
      expect(next.dueAt).toBe(NOW + days * DAY_MS);
    }
  });

  it('shows Learning for boxes 1 to 3 and Strong for boxes 4 and 5', () => {
    expect([1, 2, 3, 4, 5].map((box) => stateForBox(box as 1 | 2 | 3 | 4 | 5))).toEqual([
      'learning',
      'learning',
      'learning',
      'strong',
      'strong',
    ]);
  });

  it('a new item is New, in box 1 and due now until its Learn card', () => {
    expect(createNewItemState('t01-kopf', NOW)).toEqual({
      itemId: 't01-kopf',
      box: 1,
      dueAt: NOW,
      state: 'new',
      correct: 0,
      wrong: 0,
      lastSeenAt: null,
      everProduced: false,
      inMistakeBank: false,
      bankEnteredAt: null,
      bankCorrectDays: [],
    });
  });

  it('a Learn card on an item that is already learning only updates lastSeenAt', () => {
    const existing = state('t01-kopf', { box: 3 });
    expect(completeLearnCard(existing, NOW)).toEqual({ ...existing, lastSeenAt: NOW });
  });

  it('a correct Production answer sets everProduced, a recognition answer does not', () => {
    expect(applyAnswer(state('t01-kopf'), right('production')).state.everProduced).toBe(true);
    expect(applyAnswer(state('t01-kopf'), right('recognition')).state.everProduced).toBe(false);
  });

  it('recognition alone cannot lift an item above box 3, however often it is answered', () => {
    let current = state('t01-kopf', { box: 1 });
    for (let i = 0; i < 6; i++) current = applyAnswer(current, right('recognition')).state;
    expect(current.box).toBe(3);
    expect(current.state).toBe('learning');
  });

  it('the cap lifts after one correct Production answer', () => {
    let current = state('t01-kopf', { box: 3 });
    current = applyAnswer(current, right('production')).state;
    current = applyAnswer(current, right('recognition')).state;
    expect(current.box).toBe(5);
  });

  it('a correct answer never lowers a box, even for an item that was never produced', () => {
    const { state: next } = applyAnswer(
      state('t01-kopf', { box: 4, state: 'strong', everProduced: false }),
      right('recognition'),
    );
    expect(next.box).toBe(4);
  });

  it('counts right and wrong answers and updates lastSeenAt', () => {
    const afterRight = applyAnswer(state('t01-kopf'), right('recognition')).state;
    expect(afterRight).toMatchObject({ correct: 1, wrong: 0, lastSeenAt: NOW });
    const afterWrong = applyAnswer(afterRight, wrong).state;
    expect(afterWrong).toMatchObject({ correct: 1, wrong: 1, lastSeenAt: NOW });
  });

  it('refuses an answer for an item that has no Learn card yet', () => {
    expect(() => applyAnswer(createNewItemState('t01-kopf', NOW), right('recognition'))).toThrow(
      /Learn card/,
    );
  });

  it('refuses a wrong answer with no error type', () => {
    expect(() => applyAnswer(state('t01-kopf'), { ...wrong, errorType: null })).toThrow(
      /error type/,
    );
  });

  it('does not change the stored state object', () => {
    const before = state('t01-kopf', { box: 3 });
    const copy = structuredClone(before);
    applyAnswer(before, wrong);
    applyAnswer(before, right('production'));
    expect(before).toEqual(copy);
  });
});

describe('scheduler: retry', () => {
  it('"Still tricky" when the retry is wrong, and the item is still unchanged', () => {
    const current = state('t01-kopf', { box: 1, inMistakeBank: true });
    const { state: after, outcome } = applyRetry(current, false);
    expect(after).toBe(current);
    expect(RETRY_LABELS[outcome]).toBe('Still tricky');
  });
});

describe('scheduler: G2 every wrong answer comes back within 24 hours', () => {
  it('a wrong answer is due no later than 24 hours later, from any box', () => {
    for (const box of [1, 2, 3, 4, 5] as const) {
      const { state: next } = applyAnswer(state('t01-kopf', { box }), wrong);
      expect(next.dueAt - NOW).toBeLessThanOrEqual(DAY_MS);
    }
  });
});

describe('scheduler: due counts', () => {
  const states = [
    state('a', { dueAt: NOW - 1000 }),
    state('b', { dueAt: NOW + 6 * 3_600_000 }),
    state('c', { dueAt: NOW + 2 * DAY_MS }),
    createNewItemState('d', NOW),
  ];

  it('counts overdue and next-24-hour items, and ignores New items', () => {
    expect(dueWithin(states, NOW)).toBe(2);
    expect(dueWithin(states, NOW, 3 * DAY_MS)).toBe(3);
  });

  it('reports the next review time after now, or null when nothing is waiting', () => {
    expect(nextReviewAt(states, NOW)).toBe(NOW + 6 * 3_600_000);
    expect(nextReviewAt([state('a', { dueAt: NOW - 1000 })], NOW)).toBeNull();
    expect(nextReviewAt([], NOW)).toBeNull();
  });
});
