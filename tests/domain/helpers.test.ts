import { describe, expect, it } from 'vitest';

import { addDays, diffDays, fromDayNumber, toDayNumber } from '../../src/domain/dates.ts';
import {
  chipCount,
  gapIndex,
  isNoun,
  isNumberItem,
  isValidExercise,
} from '../../src/domain/eligibility.ts';
import { createRng, pick, shuffle } from '../../src/domain/rng.ts';
import {
  closeLimit,
  isCloseMatch,
  levenshtein,
  normalise,
  normaliseNumber,
  tokens,
} from '../../src/domain/text.ts';
import { item } from './fixtures.ts';

describe('dates', () => {
  it('adds days across month, year and leap day boundaries', () => {
    expect(addDays('2026-10-05', 1)).toBe('2026-10-06');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-05', 0)).toBe('2026-10-05');
    expect(addDays('2026-10-05', 400)).toBe('2027-11-09');
  });

  it('measures the days between two dates', () => {
    expect(diffDays('2026-10-05', '2026-10-08')).toBe(3);
    expect(diffDays('2026-10-08', '2026-10-05')).toBe(-3);
    expect(diffDays('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('round trips day numbers, including dates before 1970', () => {
    expect(toDayNumber('1970-01-01')).toBe(0);
    expect(fromDayNumber(0)).toBe('1970-01-01');
    expect(fromDayNumber(toDayNumber('1969-12-31'))).toBe('1969-12-31');
    expect(fromDayNumber(toDayNumber('2026-10-05'))).toBe('2026-10-05');
  });

  it('rejects anything that is not a real date', () => {
    for (const bad of ['abc', '2026-1-1', '2026-02-30', '2026-13-01', '2026-00-10', '2027-02-29']) {
      expect(() => toDayNumber(bad)).toThrow(RangeError);
    }
  });
});

describe('rng', () => {
  it('gives the same numbers for the same seed, in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const first = Array.from({ length: 50 }, () => a());
    expect(first).toEqual(Array.from({ length: 50 }, () => b()));
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(createRng(43)()).not.toBe(createRng(42)());
  });

  it('shuffles into a permutation, repeatably, without changing the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffle(input, createRng(5));
    expect(shuffled).toEqual(shuffle(input, createRng(5)));
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(shuffle([], createRng(1))).toEqual([]);
  });

  it('picks one element, and refuses an empty list', () => {
    expect(['a', 'b', 'c']).toContain(pick(['a', 'b', 'c'], createRng(9)));
    expect(() => pick([], createRng(1))).toThrow(RangeError);
  });
});

describe('text', () => {
  it('normalises case, spaces, punctuation and umlauts', () => {
    expect(normalise('  Köpfe ')).toBe('koepfe');
    expect(normalise('Fuß')).toBe('fuss');
    expect(normalise('Müde, Übelkeit!')).toBe('muede uebelkeit');
    expect(normalise('Wo   tut es weh?')).toBe('wo tut es weh');
    expect(normalise('Rücken')).toBe('ruecken');
    expect(normalise('120/80')).toBe('120/80');
    expect(normalise('')).toBe('');
  });

  it('splits into tokens, with none for an empty text', () => {
    expect(tokens('Seit wann haben Sie?')).toEqual(['seit', 'wann', 'haben', 'sie']);
    expect(tokens('  ')).toEqual([]);
  });

  it('treats comma and dot as the same decimal mark and keeps other separators', () => {
    expect(normaliseNumber(' 38,5 ')).toBe('38.5');
    expect(normaliseNumber('120   80')).toBe('120 80');
    expect(normaliseNumber('120/80')).toBe('120/80');
    expect(normaliseNumber('120 ZU 80')).toBe('120 zu 80');
  });

  it('measures edit distance', () => {
    expect(levenshtein('fieber', 'fieber')).toBe(0);
    expect(levenshtein('fiber', 'fieber')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('allows 1 edit up to 7 letters and 2 beyond', () => {
    expect(closeLimit('abcdefg')).toBe(1);
    expect(closeLimit('abcdefgh')).toBe(2);
    expect(isCloseMatch('fiber', 'fieber')).toBe(true);
    expect(isCloseMatch('fieber', 'fieber')).toBe(false);
    expect(isCloseMatch('fibr', 'fieber')).toBe(false);
    expect(isCloseMatch('krankenhuas', 'krankenhaus')).toBe(true);
  });
});

describe('eligibility', () => {
  it('treats a word with no pos as a noun', () => {
    expect(isNoun({ kind: 'word', pos: undefined })).toBe(true);
    expect(isNoun({ kind: 'word', pos: 'noun' })).toBe(true);
    expect(isNoun({ kind: 'word', pos: 'adverb' })).toBe(false);
    expect(isNoun({ kind: 'phrase', pos: undefined })).toBe(false);
  });

  it('recognises number dictation items', () => {
    expect(isNumberItem(item('t03-bp-1'))).toBe(true);
    expect(isNumberItem(item('t01-kopf'))).toBe(false);
    expect(isNumberItem({ spoken: 'x', accepted: ['abc'] })).toBe(false);
  });

  it('finds the word to blank in the example sentence, only for words', () => {
    expect(gapIndex(item('t01-kopf'))).toBe(1);
    expect(gapIndex(item('t02-schmerz'))).toBeNull();
    expect(gapIndex(item('t08-seit-wann'))).toBeNull();
  });

  it('counts the chips for a sentence', () => {
    expect(chipCount(item('t08-seit-wann'))).toBe(6);
    expect(chipCount(item('t08-allergien'))).toBe(3);
  });

  it('checks each exercise type against the item and the device', () => {
    const on = { speech: true, audio: true };
    const kopf = item('t01-kopf');
    const sentence = item('t08-seit-wann');
    const number = item('t03-bp-1');
    expect(isValidExercise('E1', number, on)).toBe(true);
    expect(isValidExercise('E3', number, on)).toBe(true);
    expect(isValidExercise('E2', kopf, on)).toBe(true);
    expect(isValidExercise('E2', item('t02-links'), on)).toBe(false);
    expect(isValidExercise('E2', { ...kopf, article: undefined }, on)).toBe(false);
    expect(isValidExercise('E4', kopf, on)).toBe(true);
    expect(isValidExercise('E4', kopf, { ...on, audio: false })).toBe(false);
    expect(isValidExercise('E5', kopf, on)).toBe(true);
    expect(isValidExercise('E6', kopf, on)).toBe(true);
    expect(isValidExercise('E6', number, on)).toBe(false);
    expect(isValidExercise('E7', kopf, on)).toBe(true);
    expect(isValidExercise('E7', kopf, { ...on, speech: false })).toBe(false);
    expect(isValidExercise('E7', number, on)).toBe(false);
    expect(isValidExercise('E8', sentence, on)).toBe(true);
    expect(isValidExercise('E8', sentence, { ...on, speech: false })).toBe(true);
    expect(isValidExercise('E8', kopf, on)).toBe(false);
    expect(isValidExercise('E8', item('t08-allergien'), on)).toBe(false);
    expect(isValidExercise('E8', { ...sentence, level: 'A1' }, on)).toBe(false);
    expect(isValidExercise('E8', { ...sentence, de: 'a b c d e f g h i j' }, on)).toBe(false);
    expect(isValidExercise('E9', number, on)).toBe(true);
    expect(isValidExercise('E9', number, { ...on, audio: false })).toBe(false);
    expect(isValidExercise('E9', kopf, on)).toBe(false);
    expect(isValidExercise('E10', sentence, on)).toBe(false);
  });
});
