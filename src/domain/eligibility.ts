// Which exercise types an item can be asked in. Used by the composer and the checker.
import { normalise, tokens } from './text.ts';
import type { Capabilities, ExerciseId, Item } from './types.ts';

/** A word item with no `pos` is treated as a noun. */
export function isNoun(item: Pick<Item, 'kind' | 'pos'>): boolean {
  return item.pos === 'noun' || (item.pos === undefined && item.kind === 'word');
}

/** Number dictation items carry the spoken words in `spoken` and digits in `accepted`. */
export function isNumberItem(item: Pick<Item, 'spoken' | 'accepted'>): boolean {
  return item.spoken !== undefined && /\d/.test(item.accepted[0] ?? '');
}

/** Index of the word in `exampleDe` that E5 blanks out, or null when `de` is not in it. */
export function gapIndex(item: Pick<Item, 'kind' | 'de' | 'exampleDe'>): number | null {
  if (item.kind !== 'word') return null;
  const target = normalise(item.de);
  const index = tokens(item.exampleDe).indexOf(target);
  return index === -1 ? null : index;
}

/** E8 shows 5 to 9 word chips (F-12). */
export function chipCount(item: Pick<Item, 'de'>): number {
  return tokens(item.de).length;
}

export function isValidExercise(
  exercise: ExerciseId,
  item: Item,
  capabilities: Capabilities,
): boolean {
  const hasSpoken = item.spoken !== undefined;
  switch (exercise) {
    case 'E1':
    case 'E3':
      return true;
    case 'E2':
      return isNoun(item) && item.article !== undefined;
    case 'E4':
      return capabilities.audio;
    case 'E5':
      return gapIndex(item) !== null;
    case 'E6':
      return !hasSpoken;
    case 'E7':
      return capabilities.speech && !hasSpoken;
    case 'E8': {
      const chips = chipCount(item);
      return (
        capabilities.speech &&
        !hasSpoken &&
        item.level === 'A2' &&
        item.kind === 'sentence' &&
        chips >= 5 &&
        chips <= 9
      );
    }
    case 'E9':
      return capabilities.audio && isNumberItem(item);
    case 'E10':
      // Scenario turns arrive in Phase 4. No item links to a turn yet.
      return false;
  }
}
