// The 5 placement questions (docs/02-LEARNING-AND-CONTENT.md, Placement). Pure. Placement answers
// are only checked and counted. They never touch the scheduler, so no item state is created.
import { checkAnswer } from '../../domain/checker.ts';
import { buildOptions } from '../../domain/options.ts';
import { PLACEMENT_QUESTIONS, placementItems } from '../../domain/readiness.ts';
import { createRng, hashSeed } from '../../domain/rng.ts';
import type { Item } from '../../domain/types.ts';

export type PlacementQuestion = {
  item: Item;
  options: string[];
  correctOption: string;
};

/** The same questions, with the same options in the same order, on every run. */
export function buildPlacement(items: readonly Item[]): PlacementQuestion[] {
  // Sorted by id, so the options do not depend on the order the content is listed in.
  const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : 1));
  return placementItems(sorted).map((item) => {
    const { options, correctOption } = buildOptions(
      'E3',
      item,
      sorted,
      createRng(hashSeed('placement', item.id)),
    );
    return { item, options, correctOption };
  });
}

/** How many of the chosen options were right, using the same checker as E3. */
export function scorePlacement(
  questions: readonly PlacementQuestion[],
  chosen: readonly string[],
): number {
  return questions.filter(
    (question, index) =>
      checkAnswer({
        exercise: 'E3',
        item: question.item,
        chosen: chosen[index] ?? '',
        correctOption: question.correctOption,
      }).verdict === 'correct',
  ).length;
}

export const PLACEMENT_TOTAL = PLACEMENT_QUESTIONS;
