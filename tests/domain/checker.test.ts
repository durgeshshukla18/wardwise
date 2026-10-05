import { describe, expect, it } from 'vitest';

import { checkAnswer, feedbackFor } from '../../src/domain/checker.ts';
import type { CheckRequest, CheckResult } from '../../src/domain/types.ts';
import { ITEMS, item } from './fixtures.ts';

const typed = (exercise: 'E6' | 'E7', id: string, answer: string): CheckResult =>
  checkAnswer({ exercise, item: item(id), input: 'typed', answers: [answer] });
const spoken = (id: string, ...answers: string[]): CheckResult =>
  checkAnswer({ exercise: 'E7', item: item(id), input: 'spoken', answers });
const build = (id: string, answer: string, input: 'chips' | 'spoken' = 'chips'): CheckResult =>
  checkAnswer({ exercise: 'E8', item: item(id), input, answers: [answer] });
const dictate = (id: string, answer: string): CheckResult =>
  checkAnswer({ exercise: 'E9', item: item(id), answers: [answer] });

describe('checker: test plan cases', () => {
  it('der Kopf (E6), "der kopf": correct', () => {
    const result = typed('E6', 't01-kopf', 'der kopf');
    expect(result).toMatchObject({ verdict: 'correct', errorType: null, needsAI: false });
  });

  it('der Kopf (E6), "die Kopf": wrong, error type article', () => {
    const result = typed('E6', 't01-kopf', 'die Kopf');
    expect(result).toMatchObject({ verdict: 'wrong', errorType: 'article', needsAI: false });
    expect(result.expected).toBe('der Kopf');
    expect(result.feedback).toBe('Kopf is masculine: der Kopf.');
  });

  it('das Fieber (E6), "Fiber": wrong, error type spelling, correct spelling shown', () => {
    const result = typed('E6', 't02-fieber', 'Fiber');
    expect(result).toMatchObject({ verdict: 'wrong', errorType: 'spelling', needsAI: false });
    expect(result.expected).toBe('das Fieber');
    expect(result.feedback).toBe('Fieber has an e after the i: F-i-e-b-e-r.');
  });

  it('Köpfe, "Koepfe": correct (umlaut folding)', () => {
    const plural = { ...item('t01-kopf'), accepted: ['Köpfe'] };
    const result = checkAnswer({
      exercise: 'E6',
      item: plural,
      input: 'typed',
      answers: ['Koepfe'],
    });
    expect(result.verdict).toBe('correct');
  });

  it('38,5 (E9), "38.5": correct', () => {
    expect(dictate('t03-temp-1', '38.5').verdict).toBe('correct');
    expect(dictate('t03-temp-1', '38,5').verdict).toBe('correct');
  });

  it('120/80 (E9), "120 80": correct', () => {
    expect(dictate('t03-bp-1', '120 80').verdict).toBe('correct');
  });

  it('any E2 to E5, any text: never calls the AI', () => {
    const kopf = item('t01-kopf');
    const requests: CheckRequest[] = (['E2', 'E3', 'E4', 'E5'] as const).flatMap((exercise) =>
      ['der', 'die', 'head', 'Kopf', '', 'Seit wann haben Sie Schmerzen?', '38,5'].map(
        (chosen) => ({ exercise, item: kopf, chosen, correctOption: 'der' }),
      ),
    );
    for (const request of requests) expect(checkAnswer(request).needsAI).toBe(false);
  });
});

describe('checker: choice exercises', () => {
  const kopf = item('t01-kopf');
  const choose = (exercise: 'E2' | 'E3' | 'E4' | 'E5', chosen: string, correctOption: string) =>
    checkAnswer({ exercise, item: kopf, chosen, correctOption });

  it('a right pick is correct with no feedback', () => {
    expect(choose('E3', 'head', 'head')).toEqual({
      verdict: 'correct',
      errorType: null,
      needsAI: false,
      expected: 'head',
      feedback: null,
    });
  });

  it('a wrong E2 pick is article, E3 and E5 are meaning, E4 is listening', () => {
    expect(choose('E2', 'die', 'der')).toMatchObject({ errorType: 'article', expected: 'der' });
    expect(choose('E3', 'hand', 'head').errorType).toBe('meaning');
    expect(choose('E5', 'Hand', 'Kopf').errorType).toBe('meaning');
    expect(choose('E4', 'hand', 'head')).toMatchObject({
      errorType: 'listening',
      feedback: 'You heard Kopf. It means head.',
    });
  });
});

describe('checker: errors on nouns', () => {
  it('accepts a noun with or without its article', () => {
    expect(typed('E6', 't01-kopf', 'Kopf').verdict).toBe('correct');
    expect(typed('E6', 't01-kopf', 'der Kopf').verdict).toBe('correct');
  });

  it('accepts a bare noun even when the accepted list only has the article form', () => {
    const strict = { ...item('t01-kopf'), accepted: ['der Kopf'] };
    const result = checkAnswer({ exercise: 'E6', item: strict, input: 'typed', answers: ['Kopf'] });
    expect(result.verdict).toBe('correct');
  });

  it('a right noun with the right article but a form that is not accepted is article', () => {
    const result = typed('E6', 't02-schmerz', 'der Schmerzen');
    expect(result.errorType).toBe('article');
  });

  it('allows 1 edit up to 7 letters and 2 edits beyond', () => {
    expect(typed('E6', 't02-fieber', 'Fibr').errorType).toBe('meaning');
    expect(typed('E6', 't05-krankenhaus', 'Krankenhuas').errorType).toBe('spelling');
    expect(typed('E6', 't05-krankenhaus', 'Krankenhaeuser').errorType).toBe('meaning');
  });

  it('anything that is not a near miss is meaning', () => {
    const result = typed('E6', 't01-kopf', 'Hand');
    expect(result).toMatchObject({ verdict: 'wrong', errorType: 'meaning', needsAI: false });
    expect(result.feedback).toBe('Kopf means head.');
  });

  it('an empty answer is wrong with meaning, never a crash', () => {
    expect(typed('E6', 't01-kopf', '').errorType).toBe('meaning');
    expect(
      checkAnswer({ exercise: 'E6', item: item('t01-kopf'), input: 'typed', answers: [] }).verdict,
    ).toBe('wrong');
  });
});

describe('checker: sentence answers (E8, E10, A2 sentences)', () => {
  it('a. an exact match after normalisation is correct', () => {
    expect(build('t08-seit-wann', 'seit wann haben sie schmerzen').verdict).toBe('correct');
    expect(build('t08-seit-wann', '  Seit wann haben Sie die Schmerzen?  ').verdict).toBe(
      'correct',
    );
  });

  it('b. the same words in a different order is word_order', () => {
    const chips = build('t08-seit-wann', 'Seit wann Sie haben Schmerzen?');
    expect(chips).toMatchObject({ verdict: 'wrong', errorType: 'word_order', needsAI: false });
    expect(chips.feedback).toBe('In a question the verb comes second: haben Sie.');
  });

  it('b. spoken, the same words in a different order is undecided for the AI, with the rule guess', () => {
    const result = build('t08-seit-wann', 'Seit wann Sie haben Schmerzen?', 'spoken');
    expect(result).toMatchObject({ verdict: 'undecided', errorType: 'word_order', needsAI: true });
  });

  it('c. one token within the limit is spelling, close, and needs no AI', () => {
    const result = build('t08-seit-wann', 'Seit wann haben Sie Schmerzn?', 'spoken');
    expect(result).toMatchObject({ verdict: 'wrong', errorType: 'spelling', needsAI: false });
  });

  it('c. two tokens off is not spelling', () => {
    const result = build('t08-seit-wann', 'Seit wan haben Sie Schmerzn?');
    expect(result.errorType).toBe('meaning');
  });

  it('c. one token off by more than the limit is not spelling', () => {
    // "Sie" has 3 letters, so only 1 edit is allowed.
    expect(build('t08-seit-wann', 'Seit wann haben Se Schmerzen?').errorType).toBe('spelling');
    expect(build('t08-seit-wann', 'Seit wann haben Xx Schmerzen?').errorType).toBe('meaning');
  });

  it('d. anything else is meaning', () => {
    const chips = build('t08-seit-wann', 'Wie lange haben Sie Schmerzen?');
    expect(chips).toMatchObject({ verdict: 'wrong', errorType: 'meaning', needsAI: false });
    const heard = build('t08-seit-wann', 'Wie lange haben Sie Schmerzen?', 'spoken');
    expect(heard).toMatchObject({ verdict: 'undecided', errorType: 'meaning', needsAI: true });
  });

  it('prefers word_order over spelling when both could match', () => {
    const result = build('t08-seit-wann', 'Seit wann Sie haben Schmerzen?');
    expect(result.errorType).toBe('word_order');
  });

  it('E10 uses the turn’s accepted replies, never an item', () => {
    const accepted = ['Haben Sie Schmerzen?'];
    const reply = (answer: string) =>
      checkAnswer({ exercise: 'E10', input: 'typed', answers: [answer], accepted });
    expect(reply('Haben Sie Schmerzen')).toMatchObject({
      verdict: 'correct',
      expected: accepted[0],
    });
    expect(reply('Sie haben Schmerzen')).toEqual({
      verdict: 'undecided',
      errorType: 'word_order',
      needsAI: true,
      expected: 'Haben Sie Schmerzen?',
      feedback: null,
    });
    expect(reply('Haben Sie Schmerz')).toMatchObject({ verdict: 'wrong', needsAI: false });
  });
});

describe('checker: needsAI', () => {
  it('is true only for E10, E8 spoken and an A2 sentence in E7, and only without an exact or close match', () => {
    const sentence = 't08-seit-wann';
    expect(spoken(sentence, 'Wie lange haben Sie Schmerzen?').needsAI).toBe(true);
    expect(build(sentence, 'Wie lange haben Sie Schmerzen?', 'spoken').needsAI).toBe(true);
    expect(build(sentence, 'Wie lange haben Sie Schmerzen?', 'chips').needsAI).toBe(false);
    expect(typed('E6', sentence, 'Wie lange haben Sie Schmerzen?').needsAI).toBe(false);
    expect(spoken('t02-wo-tut-es-weh', 'Wie geht es').needsAI).toBe(false);
    expect(spoken('t01-kopf', 'Hand').needsAI).toBe(false);
    expect(spoken(sentence, 'Seit wann haben Sie Schmerzen').needsAI).toBe(false);
  });

  it('never marks a verdict undecided without needsAI', () => {
    for (const entry of ITEMS) {
      for (const answer of ['', 'x', entry.de, entry.accepted[0] ?? '']) {
        const result = checkAnswer({
          exercise: 'E7',
          item: entry,
          input: 'spoken',
          answers: [answer],
        });
        expect(result.verdict === 'undecided').toBe(result.needsAI);
      }
    }
  });
});

describe('checker: spoken answers', () => {
  it('is correct if any of the alternatives passes', () => {
    expect(spoken('t01-kopf', 'der Kopp', 'Kopf', 'die Kopf').verdict).toBe('correct');
  });

  it('keeps the most useful miss when no alternative passes', () => {
    expect(spoken('t01-kopf', 'Hand', 'die Kopf').errorType).toBe('article');
    expect(spoken('t01-kopf', 'Hand', 'Kopt').errorType).toBe('speech_mismatch');
  });

  it('a right noun with the wrong article stays article, other noun misses are speech_mismatch', () => {
    expect(spoken('t01-kopf', 'die Kopf').errorType).toBe('article');
    expect(spoken('t01-kopf', 'Kopt')).toMatchObject({
      errorType: 'speech_mismatch',
      needsAI: false,
    });
    expect(spoken('t01-kopf', 'Hand').errorType).toBe('speech_mismatch');
  });

  it('a single spoken word that is not a noun misses as speech_mismatch', () => {
    expect(spoken('t02-links', 'rechts').errorType).toBe('speech_mismatch');
    expect(spoken('t02-links', 'lings')).toMatchObject({
      errorType: 'speech_mismatch',
      needsAI: false,
    });
  });

  it('a typed single word that is not a noun is spelling or meaning', () => {
    const typedWord = (answer: string) => typed('E6', 't02-links', answer).errorType;
    expect(typedWord('lings')).toBe('spelling');
    expect(typedWord('rechts')).toBe('meaning');
  });
});

describe('checker: E9 numbers', () => {
  it('accepts comma or dot for decimals and ignores extra spaces', () => {
    expect(dictate('t03-temp-1', ' 38.5 ').verdict).toBe('correct');
    expect(dictate('t03-bp-1', '120   80').verdict).toBe('correct');
    expect(dictate('t03-puls-1', '72').verdict).toBe('correct');
  });

  it('a wrong number is `number`, shown with the answer, and never needs the AI', () => {
    const result = dictate('t03-bp-1', '120/90');
    expect(result).toMatchObject({
      verdict: 'wrong',
      errorType: 'number',
      needsAI: false,
      expected: '120/80',
      feedback: 'The answer is 120/80.',
    });
  });

  it('does not let the slash collapse into other digits', () => {
    expect(dictate('t03-bp-1', '12080').verdict).toBe('wrong');
  });
});

describe('checker: feedback sentences', () => {
  it('uses the item’s own note first', () => {
    expect(feedbackFor(item('t01-kopf'), 'article')).toBe('Kopf is masculine: der Kopf.');
  });

  it('builds the fixed templates from content fields when a note is missing', () => {
    const blut = item('t03-blutdruck');
    expect(feedbackFor(blut, 'article')).toBe('Blutdruck takes der: der Blutdruck.');
    expect(feedbackFor(blut, 'meaning')).toBe('Blutdruck means blood pressure.');
    expect(feedbackFor(blut, 'spelling')).toBe('Check the spelling: Blutdruck.');
    expect(feedbackFor(blut, 'listening')).toBe('You heard Blutdruck. It means blood pressure.');
    expect(feedbackFor(blut, 'number')).toBe('The answer is der Blutdruck.');
    expect(feedbackFor(blut, 'word_order')).toBe('Correct order: der Blutdruck.');
    expect(feedbackFor(blut, 'grammar')).toBe('Correct form: der Blutdruck.');
    expect(feedbackFor(blut, 'speech_mismatch')).toBe(
      'Heard something different. Try: der Blutdruck.',
    );
  });

  it('returns null when the template needs a field the item does not have', () => {
    const links = item('t02-links');
    expect(feedbackFor(links, 'article')).toBeNull();
    const empty = { ...links, accepted: [] };
    for (const type of ['number', 'word_order', 'grammar', 'speech_mismatch'] as const) {
      expect(feedbackFor(empty, type)).toBeNull();
    }
  });

  it('explains a wrong word order with the template when the item has no note', () => {
    const swapped = typed('E6', 't06-trinken', 'Sie Möchten etwas trinken?');
    expect(swapped).toMatchObject({
      errorType: 'word_order',
      feedback: 'Correct order: Möchten Sie etwas trinken?',
    });
  });
});
