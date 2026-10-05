// What one exercise asks, built from a slot. Pure: the same seed always gives the same options.
import { buildGap, buildOptions, type Gap } from '../../domain/options.ts';
import { createRng, hashSeed } from '../../domain/rng.ts';
import type { CheckRequest, Item, Slot } from '../../domain/types.ts';

export type ChoiceExercise = 'E2' | 'E3' | 'E4' | 'E5';
export type TypedExercise = 'E6' | 'E9';

export type Question =
  | { kind: 'learn'; slot: Slot; item: Item }
  | {
      kind: 'choice';
      exercise: ChoiceExercise;
      slot: Slot;
      item: Item;
      options: string[];
      correctOption: string;
      /** For E5: the example sentence with the word removed. */
      gap: Gap | null;
    }
  | { kind: 'typed'; exercise: TypedExercise; slot: Slot; item: Item };

export type Answer = { kind: 'choice'; chosen: string } | { kind: 'typed'; text: string };

/** A stable seed for one slot, so the options do not change when the screen redraws. */
export function slotSeed(sessionId: string, index: number, slot: Slot): number {
  return hashSeed(sessionId, index, slot.itemId, slot.exercise);
}

export function buildQuestion(
  slot: Slot,
  item: Item,
  items: readonly Item[],
  seed: number,
): Question {
  switch (slot.exercise) {
    case 'E1':
      return { kind: 'learn', slot, item };
    case 'E2':
    case 'E3':
    case 'E4':
    case 'E5': {
      const { options, correctOption } = buildOptions(slot.exercise, item, items, createRng(seed));
      return {
        kind: 'choice',
        exercise: slot.exercise,
        slot,
        item,
        options,
        correctOption,
        gap: slot.exercise === 'E5' ? buildGap(item) : null,
      };
    }
    case 'E6':
    case 'E9':
      return { kind: 'typed', exercise: slot.exercise, slot, item };
    default:
      throw new Error(`Exercise ${slot.exercise} is not available yet`);
  }
}

export function toCheckRequest(
  question: Exclude<Question, { kind: 'learn' }>,
  answer: Answer,
): CheckRequest {
  if (question.kind === 'choice') {
    if (answer.kind !== 'choice') throw new Error('A choice exercise needs a chosen option');
    return {
      exercise: question.exercise,
      item: question.item,
      chosen: answer.chosen,
      correctOption: question.correctOption,
    };
  }
  if (answer.kind !== 'typed') throw new Error('A typed exercise needs text');
  return question.exercise === 'E6'
    ? { exercise: 'E6', item: question.item, input: 'typed', answers: [answer.text] }
    : { exercise: 'E9', item: question.item, answers: [answer.text] };
}

/** The text read out for an item: its `spoken` field when it has one, otherwise the German. */
export function wordAudio(item: Item): string {
  return item.spoken ?? item.de;
}
