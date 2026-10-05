// Ward Readiness, placement and the A2 unlock (docs/02-LEARNING-AND-CONTENT.md section 3).
import type { Item, ItemState } from './types.ts';

/** Percent of the topic's items that are Strong. Unseen items count as not strong. */
export function computeReadiness(
  topic: Item['topic'],
  items: readonly Item[],
  states: ReadonlyMap<string, ItemState>,
): number {
  const inTopic = items.filter((item) => item.topic === topic);
  if (inTopic.length === 0) return 0;
  const strong = inTopic.filter((item) => states.get(item.id)?.state === 'strong').length;
  return Math.round((strong / inTopic.length) * 100);
}

/** A2 opens when 60 percent of A1 items are in box 3 or higher. */
export const A2_UNLOCK_PERCENT = 60;

export function a2Unlocked(
  items: readonly Item[],
  states: ReadonlyMap<string, ItemState>,
): boolean {
  const a1 = items.filter((item) => item.level === 'A1');
  if (a1.length === 0) return false;
  const advanced = a1.filter((item) => {
    const state = states.get(item.id);
    return state !== undefined && state.state !== 'new' && state.box >= 3;
  }).length;
  return advanced * 100 >= a1.length * A2_UNLOCK_PERCENT;
}

export const PLACEMENT_QUESTIONS = 5;

/** 0 to 2 correct places the learner at A1. 3 to 5 offers A2, and the learner chooses. */
export function placementLevel(correct: number): 'A1' | 'offer_A2' {
  if (!Number.isInteger(correct) || correct < 0 || correct > PLACEMENT_QUESTIONS) {
    throw new RangeError(`Placement score must be a whole number from 0 to ${PLACEMENT_QUESTIONS}`);
  }
  return correct >= 3 ? 'offer_A2' : 'A1';
}
