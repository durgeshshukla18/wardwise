import { describe, expect, it } from 'vitest';

import { applyAnswer } from '../../src/domain/scheduler.ts';
import type { AnswerInput, ErrorType, ItemState } from '../../src/domain/types.ts';
import { dayAfter, nowOnDay, state } from './fixtures.ts';

function wrongOnDay(current: ItemState, n: number, errorType: ErrorType = 'article') {
  return applyAnswer(current, {
    correct: false,
    format: 'recognition',
    now: nowOnDay(n),
    day: dayAfter(n),
    errorType,
  });
}

function rightOnDay(current: ItemState, n: number, format: AnswerInput['format']) {
  return applyAnswer(current, {
    correct: true,
    format,
    now: nowOnDay(n),
    day: dayAfter(n),
    errorType: null,
  });
}

// Day 0 is when the item enters the bank.
const inBank = () => wrongOnDay(state('t01-bauch', { box: 3 }), 0, 'article').state;

describe('mistake bank: test plan cases', () => {
  it('#7 entered the bank on day 1, correct recognition answer on day 2: day recorded, still in the bank', () => {
    const result = rightOnDay(inBank(), 1, 'recognition');
    expect(result.state.inMistakeBank).toBe(true);
    expect(result.state.bankCorrectDays).toEqual([dayAfter(1).date]);
    expect(result.bank).toBeNull();
  });

  it('#8 correct answer on day 2, then a correct production answer on day 3: recovered and leaves the bank', () => {
    const day2 = rightOnDay(inBank(), 1, 'recognition').state;
    const result = rightOnDay(day2, 2, 'production');
    expect(result.bank).toBe('recovered');
    expect(result.state.inMistakeBank).toBe(false);
    expect(result.state.bankCorrectDays).toEqual([]);
    expect(result.state.bankErrorType).toBeUndefined();
  });

  it('#9 correct answer on day 2, another correct answer on day 2: counts once, still in the bank', () => {
    const first = rightOnDay(inBank(), 1, 'recognition').state;
    const second = rightOnDay(first, 1, 'production');
    expect(second.state.inMistakeBank).toBe(true);
    expect(second.state.bankCorrectDays).toEqual([dayAfter(1).date]);
    expect(second.bank).toBeNull();
  });

  it('#10 correct answer on day 2, correct recognition answer on day 3: not recovered, the second must be production', () => {
    const day2 = rightOnDay(inBank(), 1, 'recognition').state;
    const result = rightOnDay(day2, 2, 'recognition');
    expect(result.state.inMistakeBank).toBe(true);
    expect(result.state.bankCorrectDays).toEqual([dayAfter(1).date, dayAfter(2).date]);
  });
});

describe('mistake bank: recovery rules', () => {
  it('a Production answer on a later day recovers an item that already has 2 distinct days (P2-5)', () => {
    let current = inBank();
    current = rightOnDay(current, 1, 'recognition').state;
    current = rightOnDay(current, 2, 'recognition').state;
    const result = rightOnDay(current, 3, 'production');
    expect(result.bank).toBe('recovered');
  });

  it('a Production answer that leaves only one distinct day does not recover', () => {
    const result = rightOnDay(inBank(), 1, 'production');
    expect(result.state.inMistakeBank).toBe(true);
    expect(result.state.bankCorrectDays).toHaveLength(1);
  });

  it('a correct answer on the entry day does not count', () => {
    const result = rightOnDay(inBank(), 0, 'production');
    expect(result.state.bankCorrectDays).toEqual([]);
    expect(result.state.inMistakeBank).toBe(true);
  });

  it('a wrong answer in the bank resets the days, keeps the item in the bank and updates the error type', () => {
    const day2 = rightOnDay(inBank(), 1, 'recognition').state;
    const result = wrongOnDay(day2, 2, 'spelling');
    expect(result.bank).toBeNull();
    expect(result.state).toMatchObject({
      inMistakeBank: true,
      bankCorrectDays: [],
      bankErrorType: 'spelling',
      bankEnteredAt: nowOnDay(2),
    });
  });

  it('after a wrong answer, only days after that answer count', () => {
    const reset = wrongOnDay(rightOnDay(inBank(), 1, 'recognition').state, 2).state;
    const sameDay = rightOnDay(reset, 2, 'production');
    expect(sameDay.state.bankCorrectDays).toEqual([]);
    const nextDay = rightOnDay(reset, 3, 'recognition');
    expect(nextDay.state.bankCorrectDays).toEqual([dayAfter(3).date]);
  });

  it('a recovered item enters the bank again on its next wrong answer', () => {
    const recovered = rightOnDay(rightOnDay(inBank(), 1, 'recognition').state, 2, 'production');
    expect(wrongOnDay(recovered.state, 5).bank).toBe('entered');
  });

  it('an item outside the bank is not touched by correct answers', () => {
    const result = rightOnDay(state('t01-bauch', { box: 2 }), 1, 'production');
    expect(result.state.bankCorrectDays).toEqual([]);
    expect(result.bank).toBeNull();
  });

  it('a bank item with no entry time never counts a day', () => {
    const odd = state('t01-bauch', { box: 2, inMistakeBank: true, bankEnteredAt: null });
    expect(rightOnDay(odd, 1, 'production').state.bankCorrectDays).toEqual([]);
  });
});
