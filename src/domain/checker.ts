// Rule-based answer checking (docs/04-TRD.md section 6). Rules first, AI last: this file only
// decides whether the AI is needed. It never calls it.
import { isNoun } from './eligibility.ts';
import { isCloseMatch, normalise, normaliseNumber, tokens } from './text.ts';
import type { CheckRequest, CheckResult, ErrorType, Item } from './types.ts';

const ARTICLES = new Set(['der', 'die', 'das']);

type Judgement = { exact: true } | { exact: false; errorType: ErrorType; close: boolean };

const exact: Judgement = { exact: true };
const miss = (errorType: ErrorType, close: boolean): Judgement => ({
  exact: false,
  errorType,
  close,
});

export function checkAnswer(request: CheckRequest): CheckResult {
  switch (request.exercise) {
    case 'E2':
    case 'E3':
    case 'E4':
    case 'E5':
      return checkChoice(request);
    case 'E9':
      return checkNumber(request);
    case 'E10':
      return checkText(request.answers, null, request.accepted, request.exercise, request.input);
    default:
      return checkText(
        request.answers,
        request.item,
        request.item.accepted,
        request.exercise,
        request.input,
      );
  }
}

// E2 to E5: a tapped option. Compared exactly, never sent to the AI.
function checkChoice(request: Extract<CheckRequest, { chosen: string }>): CheckResult {
  const { item, exercise, correctOption } = request;
  if (normalise(request.chosen) === normalise(correctOption)) {
    return {
      verdict: 'correct',
      errorType: null,
      needsAI: false,
      expected: correctOption,
      feedback: null,
    };
  }
  const errorType: ErrorType =
    exercise === 'E2' ? 'article' : exercise === 'E4' ? 'listening' : 'meaning';
  return {
    verdict: 'wrong',
    errorType,
    needsAI: false,
    expected: correctOption,
    feedback: feedbackFor(item, errorType),
  };
}

// E9: digits. Comma and dot are the same decimal mark. Anything wrong is `number`.
function checkNumber(request: Extract<CheckRequest, { exercise: 'E9' }>): CheckResult {
  const { item } = request;
  const accepted = new Set(item.accepted.map(normaliseNumber));
  const expected = item.accepted[0] ?? '';
  if (request.answers.some((answer) => accepted.has(normaliseNumber(answer)))) {
    return { verdict: 'correct', errorType: null, needsAI: false, expected, feedback: null };
  }
  return {
    verdict: 'wrong',
    errorType: 'number',
    needsAI: false,
    expected,
    feedback: feedbackFor(item, 'number'),
  };
}

// E6, E7, E8, E10: typed, spoken or tapped German.
function checkText(
  answers: string[],
  item: Item | null,
  accepted: string[],
  exercise: 'E6' | 'E7' | 'E8' | 'E10',
  input: 'typed' | 'spoken' | 'chips',
): CheckResult {
  const expected = item === null ? (accepted[0] ?? '') : expectedText(item);
  const judgement = judgeAll(answers, item, accepted, input === 'spoken');
  if (judgement.exact) {
    return { verdict: 'correct', errorType: null, needsAI: false, expected, feedback: null };
  }

  // Decision 6: the AI is only needed when no exact or close match was found.
  const mayUseAI =
    exercise === 'E10' ||
    (exercise === 'E8' && input === 'spoken') ||
    (exercise === 'E7' && item?.level === 'A2' && item.kind === 'sentence');
  const needsAI = mayUseAI && !judgement.close;

  return {
    verdict: needsAI ? 'undecided' : 'wrong',
    errorType: judgement.errorType,
    needsAI,
    expected,
    feedback: item === null ? null : feedbackFor(item, judgement.errorType),
  };
}

function expectedText(item: Item): string {
  return isNoun(item) && item.article !== undefined ? `${item.article} ${item.de}` : item.de;
}

// Spoken answers arrive as up to 3 alternatives. Any exact match wins, otherwise keep the
// most informative miss.
function judgeAll(
  answers: string[],
  item: Item | null,
  accepted: string[],
  spoken: boolean,
): Judgement {
  const acceptedNorm = accepted.map(normalise);
  const judged = (answers.length > 0 ? answers : ['']).map((answer) =>
    judgeOne(normalise(answer), item, acceptedNorm, spoken),
  );
  const match = judged.find((judgement) => judgement.exact);
  if (match) return match;
  return judged.reduce((best, next) => (rank(next) < rank(best) ? next : best));
}

function rank(judgement: Judgement): number {
  if (judgement.exact) return 0;
  if (judgement.close) return 1;
  return judgement.errorType === 'article' || judgement.errorType === 'word_order' ? 2 : 3;
}

function judgeOne(
  answer: string,
  item: Item | null,
  acceptedNorm: string[],
  spoken: boolean,
): Judgement {
  if (answer !== '' && acceptedNorm.includes(answer)) return exact;
  return item !== null && isNoun(item)
    ? judgeNoun(answer, acceptedNorm, spoken)
    : judgeTokens(answer, acceptedNorm, spoken);
}

function splitArticle(text: string): { article: string | null; rest: string } {
  const [first, ...others] = tokens(text);
  if (first !== undefined && ARTICLES.has(first) && others.length > 0) {
    return { article: first, rest: others.join(' ') };
  }
  return { article: null, rest: tokens(text).join(' ') };
}

// Nouns: the article is optional, a wrong article is `article`, a near miss is `spelling`.
function judgeNoun(answer: string, acceptedNorm: string[], spoken: boolean): Judgement {
  const { article, rest } = splitArticle(answer);
  const nouns = acceptedNorm.map((text) => splitArticle(text).rest);

  if (nouns.includes(rest)) return article === null ? exact : miss('article', false);
  if (nouns.some((noun) => isCloseMatch(rest, noun))) {
    return miss(spoken ? 'speech_mismatch' : 'spelling', true);
  }
  return miss(spoken ? 'speech_mismatch' : 'meaning', false);
}

// Everything else, in this order: word_order, spelling, meaning.
function judgeTokens(answer: string, acceptedNorm: string[], spoken: boolean): Judgement {
  const learner = tokens(answer);
  const candidates = acceptedNorm.map(tokens);
  // A single spoken word that misses is more likely a recognition problem than a knowledge gap.
  const singleWord = spoken && candidates.every((words) => words.length === 1);

  if (candidates.some((words) => isReordering(learner, words))) {
    return miss('word_order', false);
  }

  const oneWordOff = candidates.some((words) => {
    if (words.length !== learner.length) return false;
    const differing = words.flatMap((word, i) => (word === learner[i] ? [] : [i]));
    const [only] = differing;
    return (
      differing.length === 1 &&
      only !== undefined &&
      isCloseMatch(learner[only] ?? '', words[only] ?? '')
    );
  });
  if (oneWordOff) return miss(singleWord ? 'speech_mismatch' : 'spelling', true);

  return miss(singleWord ? 'speech_mismatch' : 'meaning', false);
}

// Same words, different order.
function isReordering(learner: string[], accepted: string[]): boolean {
  if (learner.length !== accepted.length || learner.length < 2) return false;
  if (learner.every((word, i) => word === accepted[i])) return false;
  return [...learner].sort().join(' ') === [...accepted].sort().join(' ');
}

// Decision 7: fixed sentences built only from content fields. A field that already ends in
// . ? or ! does not get a second full stop.
const end = (text: string): string => (/[.!?]$/.test(text) ? text : `${text}.`);

const TEMPLATES: Record<ErrorType, (item: Item) => string | null> = {
  article: (item) =>
    item.article === undefined
      ? null
      : end(`${item.de} takes ${item.article}: ${item.article} ${item.de}`),
  meaning: (item) => end(`${item.de} means ${item.en}`),
  spelling: (item) => end(`Check the spelling: ${item.de}`),
  listening: (item) => `You heard ${end(item.de)} It means ${end(item.en)}`,
  number: (item) =>
    item.accepted[0] === undefined ? null : end(`The answer is ${item.accepted[0]}`),
  word_order: (item) =>
    item.accepted[0] === undefined ? null : end(`Correct order: ${item.accepted[0]}`),
  grammar: (item) =>
    item.accepted[0] === undefined ? null : end(`Correct form: ${item.accepted[0]}`),
  speech_mismatch: (item) =>
    item.accepted[0] === undefined
      ? null
      : end(`Heard something different. Try: ${item.accepted[0]}`),
};

/** The item's own note for this error type, or a fixed template built from its fields. */
export function feedbackFor(item: Item, errorType: ErrorType): string | null {
  return item.mistakeNotes?.[errorType] ?? TEMPLATES[errorType](item);
}
