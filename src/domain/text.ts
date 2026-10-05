// Text normalisation and edit distance (docs/04-TRD.md section 6, step 1 and 3).

const FOLDS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
const PUNCTUATION = /[.,!?;:"'„“”‚‘’«»…]/g;

/** Lowercase, trim, fold ä ö ü ß to ae oe ue ss, drop punctuation, collapse spaces. */
export function normalise(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[äöüß]/g, (letter) => FOLDS[letter] ?? letter)
    .replace(PUNCTUATION, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(text: string): string[] {
  const normalised = normalise(text);
  return normalised === '' ? [] : normalised.split(' ');
}

/** For E9: comma and dot are the same decimal mark, spaces collapse. Other separators stay. */
export function normaliseNumber(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\s+/g, ' ');
}

export function levenshtein(a: string, b: string): number {
  const left = [...a];
  const right = [...b];
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (previous[j] as number) + 1,
        (current[j - 1] as number) + 1,
        (previous[j - 1] as number) + cost,
      );
    }
    previous = current;
  }
  return previous[right.length] as number;
}

/** Section 6: distance 1 for words up to 7 letters, 2 for longer words. */
export function closeLimit(word: string): number {
  return [...word].length <= 7 ? 1 : 2;
}

/** True when `learner` is a near miss of `expected`: not equal, but within the limit. */
export function isCloseMatch(learner: string, expected: string): boolean {
  const distance = levenshtein(learner, expected);
  return distance >= 1 && distance <= closeLimit(expected);
}
