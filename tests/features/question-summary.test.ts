import { describe, expect, it } from 'vitest';

import {
  buildQuestion,
  slotSeed,
  toCheckRequest,
  wordAudio,
} from '../../src/features/session/question.ts';
import { summarise, type ExerciseResult } from '../../src/features/session/summary.ts';
import { ITEMS, item } from '../domain/fixtures.ts';

const slot = (itemId: string, exercise: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E9' | 'E7') => ({
  itemId,
  exercise,
});

describe('buildQuestion', () => {
  it('E1 is a learn card', () => {
    expect(buildQuestion(slot('t01-kopf', 'E1'), item('t01-kopf'), ITEMS, 1)).toMatchObject({
      kind: 'learn',
    });
  });

  it('E2 offers der, die, das with the article as the right one', () => {
    const q = buildQuestion(slot('t01-kopf', 'E2'), item('t01-kopf'), ITEMS, 1);
    expect(q).toMatchObject({
      kind: 'choice',
      exercise: 'E2',
      options: ['der', 'die', 'das'],
      correctOption: 'der',
      gap: null,
    });
  });

  it('E3 and E4 offer 4 English meanings, E5 offers 4 German words and the gap', () => {
    const e3 = buildQuestion(slot('t01-kopf', 'E3'), item('t01-kopf'), ITEMS, 1);
    expect(e3).toMatchObject({ kind: 'choice', correctOption: 'head' });
    expect(e3.kind === 'choice' && e3.options).toHaveLength(4);
    const e5 = buildQuestion(slot('t01-kopf', 'E5'), item('t01-kopf'), ITEMS, 1);
    expect(e5).toMatchObject({
      correctOption: 'Kopf',
      gap: { before: 'Mein ', after: ' tut weh.', answer: 'Kopf' },
    });
  });

  it('E6 and E9 are typed', () => {
    expect(buildQuestion(slot('t01-kopf', 'E6'), item('t01-kopf'), ITEMS, 1)).toMatchObject({
      kind: 'typed',
      exercise: 'E6',
    });
    expect(buildQuestion(slot('t03-bp-1', 'E9'), item('t03-bp-1'), ITEMS, 1)).toMatchObject({
      kind: 'typed',
      exercise: 'E9',
    });
  });

  it('gives the same options for the same seed, and the seed depends on the session, position and slot', () => {
    const a = buildQuestion(
      slot('t01-kopf', 'E3'),
      item('t01-kopf'),
      ITEMS,
      slotSeed('s1', 3, slot('t01-kopf', 'E3')),
    );
    const b = buildQuestion(
      slot('t01-kopf', 'E3'),
      item('t01-kopf'),
      ITEMS,
      slotSeed('s1', 3, slot('t01-kopf', 'E3')),
    );
    expect(a).toEqual(b);
    expect(slotSeed('s1', 3, slot('t01-kopf', 'E3'))).not.toBe(
      slotSeed('s1', 4, slot('t01-kopf', 'E3')),
    );
    expect(slotSeed('s1', 3, slot('t01-kopf', 'E3'))).not.toBe(
      slotSeed('s2', 3, slot('t01-kopf', 'E3')),
    );
  });

  it('refuses exercises that are not available yet', () => {
    expect(() => buildQuestion(slot('t01-kopf', 'E7'), item('t01-kopf'), ITEMS, 1)).toThrow(
      /not available/,
    );
  });

  it('turns an answer into a check request, and rejects the wrong kind of answer', () => {
    const choice = buildQuestion(slot('t01-kopf', 'E3'), item('t01-kopf'), ITEMS, 1);
    const typed = buildQuestion(slot('t01-kopf', 'E6'), item('t01-kopf'), ITEMS, 1);
    const number = buildQuestion(slot('t03-bp-1', 'E9'), item('t03-bp-1'), ITEMS, 1);
    if (choice.kind !== 'choice' || typed.kind !== 'typed' || number.kind !== 'typed')
      throw new Error('setup');
    expect(toCheckRequest(choice, { kind: 'choice', chosen: 'head' })).toMatchObject({
      exercise: 'E3',
      chosen: 'head',
      correctOption: 'head',
    });
    expect(toCheckRequest(typed, { kind: 'typed', text: 'Kopf' })).toMatchObject({
      exercise: 'E6',
      input: 'typed',
      answers: ['Kopf'],
    });
    expect(toCheckRequest(number, { kind: 'typed', text: '120/80' })).toMatchObject({
      exercise: 'E9',
      answers: ['120/80'],
    });
    expect(() => toCheckRequest(choice, { kind: 'typed', text: 'x' })).toThrow();
    expect(() => toCheckRequest(typed, { kind: 'choice', chosen: 'x' })).toThrow();
  });

  it('reads out the spoken field when there is one, otherwise the German', () => {
    expect(wordAudio(item('t03-bp-1'))).toBe('hundertzwanzig zu achtzig');
    expect(wordAudio(item('t01-kopf'))).toBe('Kopf');
  });
});

describe('summarise', () => {
  const r = (
    itemId: string,
    correct: boolean | null,
    extra: Partial<ExerciseResult> = {},
  ): ExerciseResult => ({
    itemId,
    exercise: 'E3',
    correct,
    retry: false,
    followUp: false,
    ...extra,
  });

  it('counts items answered without a wrong answer as right, and items answered wrong as to revisit', () => {
    expect(summarise([r('a', true), r('b', false), r('c', true)])).toEqual({
      itemsRight: 2,
      itemsToRevisit: 1,
    });
  });

  it('ignores Learn cards and same-session retries', () => {
    expect(
      summarise([r('a', null, { exercise: 'E1' }), r('b', false), r('b', true, { retry: true })]),
    ).toEqual({ itemsRight: 0, itemsToRevisit: 1 });
  });

  it('counts an item once, and as to revisit if any answer was wrong', () => {
    expect(summarise([r('a', true), r('a', false, { followUp: true })])).toEqual({
      itemsRight: 0,
      itemsToRevisit: 1,
    });
    expect(summarise([r('a', true), r('a', true, { followUp: true })])).toEqual({
      itemsRight: 1,
      itemsToRevisit: 0,
    });
    expect(summarise([])).toEqual({ itemsRight: 0, itemsToRevisit: 0 });
  });
});
