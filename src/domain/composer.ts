// Session composer (docs/02-LEARNING-AND-CONTENT.md section 3). Pure: time and randomness come in.
import { isValidExercise } from './eligibility.ts';
import { DAY_MS } from './scheduler.ts';
import { pick, shuffle } from './rng.ts';
import type {
  Box,
  Capabilities,
  ComposedSession,
  ComposeInput,
  ExerciseId,
  Item,
  ItemState,
  Rng,
  Slot,
} from './types.ts';

export const BANK_CAP = 4;
export const DUE_CAP = 5;
export const NEW_CAP = 2;
export const NEW_PER_DAY = 6;
/** New items are only added while fewer than this many items are waiting as due. */
export const DUE_BACKLOG_LIMIT = 12;
export const BANK_WINDOW_MS = 2 * DAY_MS;
/** A retry or follow-up comes back after 2 other exercises. */
export const RETRY_GAP = 3;

/** Exercise types by box. Section 3. */
const TYPES_BY_BOX: Readonly<Record<Box, readonly ExerciseId[]>> = {
  1: ['E3', 'E4'],
  2: ['E2', 'E5', 'E4'],
  3: ['E6', 'E9'],
  4: ['E7', 'E8', 'E10'],
  5: ['E7', 'E8', 'E10'],
};

const SPEAKING: ReadonlySet<ExerciseId> = new Set(['E7', 'E8', 'E10']);

type Entry = { item: Item; state: ItemState };

/** About 3 in 10 exercises must be spoken: 2, 3 and 5 for sessions of 5, 10 and 15. */
export function speakingMinimum(sessionLength: number): number {
  return Math.floor((sessionLength * 3 + 5) / 10);
}

function byDue(a: Entry, b: Entry): number {
  return a.state.dueAt - b.state.dueAt || (a.item.id < b.item.id ? -1 : 1);
}

/** The exercise for an item that has had its Learn card. Only types valid for the item. */
function chooseExercise(item: Item, box: Box, capabilities: Capabilities, rng: Rng): ExerciseId {
  // Boxes 4 and 5 fall back to the box 3 production types before giving up.
  const tiers = box >= 4 ? [TYPES_BY_BOX[box], TYPES_BY_BOX[3]] : [TYPES_BY_BOX[box]];
  for (const tier of tiers) {
    const valid = tier.filter((exercise) => isValidExercise(exercise, item, capabilities));
    if (valid.length > 0) return pick(valid, rng);
  }
  return 'E3';
}

/** An easier format for a retry or a new item's quiz. E4 only when a German voice exists. */
function easierExercise(audio: boolean, rng: Rng): ExerciseId {
  return audio ? pick<ExerciseId>(['E3', 'E4'], rng) : 'E3';
}

function insertAt(queue: readonly Slot[], position: number, slot: Slot): Slot[] {
  const at = Math.min(Math.max(position, 0), queue.length);
  return [...queue.slice(0, at), slot, ...queue.slice(at)];
}

/**
 * Re-inserts a wrong item after 2 other exercises, in an easier format. When the queue is
 * shorter than that, the retry is appended. A retry is never queued for a retry, and never twice.
 */
export function scheduleRetry(
  queue: readonly Slot[],
  index: number,
  item: Pick<Item, 'id'>,
  rng: Rng,
  audio: boolean,
): Slot[] {
  const current = queue[index];
  const alreadyQueued = queue.some((slot, i) => i > index && slot.itemId === item.id && slot.retry);
  if (current?.retry || alreadyQueued) return [...queue];
  const slot: Slot = { itemId: item.id, exercise: easierExercise(audio, rng), retry: true };
  return insertAt(queue, index + RETRY_GAP, slot);
}

export function composeSession(input: ComposeInput): ComposedSession {
  const { items, states, now, day, settings, newItemsToday, rng } = input;
  const length = settings.sessionLength;
  const capabilities: Capabilities = { speech: settings.speech, audio: settings.audio };

  const known: Entry[] = [];
  const unmet: Item[] = [];
  for (const item of items) {
    const state = states.get(item.id);
    if (state === undefined || state.state === 'new') unmet.push(item);
    else known.push({ item, state });
  }

  const chosen = new Set<string>();
  const picked: Entry[] = [];
  const pickedNew: Item[] = [];
  const room = () => length - picked.length - pickedNew.length;
  const take = (candidates: readonly Entry[], cap: number) => {
    let taken = 0;
    for (const entry of candidates) {
      if (taken >= cap || room() <= 0) break;
      if (chosen.has(entry.item.id)) continue;
      chosen.add(entry.item.id);
      picked.push(entry);
      taken++;
    }
  };

  // 1. Mistake Bank items that are due, or went wrong in the last 48 hours.
  const bank = known
    .filter(
      ({ state }) =>
        state.inMistakeBank &&
        (state.dueAt <= now ||
          (state.bankEnteredAt !== null && now - state.bankEnteredAt <= BANK_WINDOW_MS)),
    )
    .sort(byDue);
  take(bank, BANK_CAP);

  // 2. Other due items, most overdue first.
  const dueEntries = known.filter(({ state }) => state.dueAt <= now).sort(byDue);
  take(dueEntries, DUE_CAP);

  // 3. New items, only while the backlog is small and today's limit is not reached.
  if (dueEntries.length < DUE_BACKLOG_LIMIT && newItemsToday < NEW_PER_DAY) {
    const allowed = Math.min(NEW_CAP, NEW_PER_DAY - newItemsToday);
    const sameLevel = unmet.filter((item) => item.level === settings.level);
    const otherLevel = unmet.filter((item) => item.level !== settings.level);
    for (const item of [...sameLevel, ...otherLevel].slice(0, Math.min(allowed, room()))) {
      pickedNew.push(item);
      chosen.add(item.id);
    }
  }

  // 4. Fill with Learning items not seen today, then random Strong items.
  const unseenToday = ({ state }: Entry) =>
    state.lastSeenAt === null || state.lastSeenAt < day.startMs;
  take(known.filter((e) => e.state.box <= 3 && unseenToday(e)).sort(byDue), room());
  take(
    shuffle(
      known.filter((e) => e.state.box >= 4),
      rng,
    ),
    room(),
  );

  // Pick an exercise for each item. A new item always starts with its Learn card.
  let slots: Slot[] = [
    ...picked.map(({ item, state }) => ({
      itemId: item.id,
      exercise: chooseExercise(item, state.box, capabilities, rng),
    })),
    ...pickedNew.map((item): Slot => ({ itemId: item.id, exercise: 'E1' })),
  ];

  // When speech works, at least about 3 in 10 exercises must be spoken.
  const required = capabilities.speech ? Math.min(speakingMinimum(length), slots.length) : 0;
  const spoken = slots.filter((slot) => SPEAKING.has(slot.exercise)).length;
  let shortfall = Math.max(0, required - spoken);
  if (shortfall > 0) {
    const boxOf = new Map(picked.map(({ item, state }) => [item.id, state.box]));
    const itemOf = new Map(items.map((item) => [item.id, item]));
    const convertible = slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => {
        const item = itemOf.get(slot.itemId);
        return (
          boxOf.has(slot.itemId) &&
          !SPEAKING.has(slot.exercise) &&
          item !== undefined &&
          isValidExercise('E7', item, capabilities)
        );
      })
      .sort(
        (a, b) =>
          (boxOf.get(b.slot.itemId) ?? 0) - (boxOf.get(a.slot.itemId) ?? 0) || a.index - b.index,
      )
      .slice(0, shortfall);
    for (const { index } of convertible)
      slots[index] = { itemId: slots[index]?.itemId ?? '', exercise: 'E7' };
    shortfall -= convertible.length;
  }

  slots = shuffle(slots, rng);

  // Each new item is quizzed once more later in the session. These do not count toward the length.
  for (const item of pickedNew) {
    const at = slots.findIndex((slot) => slot.itemId === item.id);
    const quiz: Slot = {
      itemId: item.id,
      exercise: easierExercise(capabilities.audio, rng),
      followUp: true,
    };
    slots = insertAt(slots, at + RETRY_GAP, quiz);
  }

  return { slots, speakingShortfall: shortfall };
}
