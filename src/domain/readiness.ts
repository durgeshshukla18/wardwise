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

/** The topics with the lowest readiness. Only topics that have items. Ties break by topic code. */
export function weakestTopics(
  items: readonly Item[],
  states: ReadonlyMap<string, ItemState>,
  count = 3,
): { topic: Item['topic']; percent: number }[] {
  const topics = [...new Set(items.map((item) => item.topic))].sort();
  return topics
    .map((topic) => ({ topic, percent: computeReadiness(topic, items, states) }))
    .sort((a, b) => a.percent - b.percent || (a.topic < b.topic ? -1 : 1))
    .slice(0, count);
}

const PLACEMENT_TOPICS: readonly Item['topic'][] = ['T01', 'T02', 'T03', 'T04', 'T05'];

/**
 * The 5 placement questions: from each of T01 to T05, the first A1 word with an article, in id
 * order. The same items every time.
 */
export function placementItems(items: readonly Item[]): Item[] {
  const byId = [...items].sort((a, b) => (a.id < b.id ? -1 : 1));
  return PLACEMENT_TOPICS.flatMap((topic) => {
    const found = byId.find(
      (item) =>
        item.topic === topic &&
        item.level === 'A1' &&
        item.kind === 'word' &&
        item.article !== undefined,
    );
    return found ? [found] : [];
  });
}
