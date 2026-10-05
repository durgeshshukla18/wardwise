import { describe, expect, it } from 'vitest';

import type { Item } from '../../src/content/schema.ts';
import { composeSession, scheduleRetry, speakingMinimum } from '../../src/domain/composer.ts';
import { isValidExercise } from '../../src/domain/eligibility.ts';
import { createRng } from '../../src/domain/rng.ts';
import { DAY_MS, createNewItemState } from '../../src/domain/scheduler.ts';
import type {
  ComposeInput,
  ComposeSettings,
  ExerciseId,
  ItemState,
  Slot,
} from '../../src/domain/types.ts';
import { ITEMS, NOW, TODAY, item, state, stateMap } from './fixtures.ts';

const SETTINGS: ComposeSettings = { level: 'A1', sessionLength: 10, speech: true, audio: true };
const SPEAKING: ExerciseId[] = ['E7', 'E8', 'E10'];
const planned = (slots: Slot[]) => slots.filter((slot) => !slot.followUp);
const ids = (slots: Slot[]) => slots.map((slot) => slot.itemId);

// Items that can be asked in any exercise: not number dictation items.
const PLAIN = ITEMS.filter((entry) => entry.spoken === undefined);

type Overrides = Partial<Omit<ComposeInput, 'settings'>> & {
  settings?: Partial<ComposeSettings>;
};

function compose(states: ItemState[], overrides: Overrides = {}, seed = 1) {
  const { settings, ...rest } = overrides;
  return composeSession({
    items: ITEMS,
    states: stateMap(...states),
    now: NOW,
    day: TODAY,
    newItemsToday: 0,
    rng: createRng(seed),
    ...rest,
    settings: { ...SETTINGS, ...settings },
  });
}

const dueBank = (entry: Item, index = 0) =>
  state(entry.id, {
    box: 2,
    dueAt: NOW - 1000 - index,
    inMistakeBank: true,
    bankEnteredAt: NOW - 3 * DAY_MS,
    bankErrorType: 'article',
  });
const due = (entry: Item, index = 0, box: 1 | 2 | 3 | 4 | 5 = 2) =>
  state(entry.id, { box, dueAt: NOW - 1000 - index });

describe('composer: test plan cases', () => {
  it('#12 4 due bank items, 7 other due items (11 due in total), 20 new available, session of 10: 4 bank, 5 due, 1 new', () => {
    const bank = PLAIN.slice(0, 4);
    const others = PLAIN.slice(4, 11);
    const states = [...bank.map(dueBank), ...others.map((entry, i) => due(entry, i))];
    const { slots } = compose(states);

    expect(planned(slots)).toHaveLength(10);
    const chosen = new Set(ids(planned(slots)));
    expect(bank.filter((entry) => chosen.has(entry.id))).toHaveLength(4);
    // The 5 most overdue of the 7: the last two in the list are the least overdue.
    expect(others.filter((entry) => chosen.has(entry.id))).toEqual(others.slice(2));
    const fresh = planned(slots).filter((slot) => slot.exercise === 'E1');
    expect(fresh).toHaveLength(1);
    expect([...bank, ...others].map((entry) => entry.id)).not.toContain(fresh[0]?.itemId);
  });

  it('#13 12 or more items due: no new items', () => {
    const states = PLAIN.slice(0, 12).map((entry, i) => due(entry, i));
    const { slots } = compose(states);
    expect(slots.some((slot) => slot.exercise === 'E1')).toBe(false);
    expect(planned(slots)).toHaveLength(10);
  });

  it('#14 6 new items already learned today: no new items', () => {
    const { slots } = compose([due(item('t01-kopf')), due(item('t01-hand'))], { newItemsToday: 6 });
    expect(slots.some((slot) => slot.exercise === 'E1')).toBe(false);
  });

  it('#15 speech supported, session of 10: at least 3 of E7, E8, E10', () => {
    const states = PLAIN.slice(0, 12).map((entry, i) => due(entry, i, i % 2 === 0 ? 4 : 5));
    for (let seed = 1; seed <= 25; seed++) {
      const { slots } = compose(states, {}, seed);
      const spoken = planned(slots).filter((slot) => SPEAKING.includes(slot.exercise));
      expect(spoken.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('composer: new items', () => {
  const fewDue = PLAIN.slice(0, 3).map((entry, i) => due(entry, i));

  it('the first exercise for a New item is always E1, and E1 is only used for New items', () => {
    const newIds = new Set(
      ITEMS.filter((entry) => !fewDue.some((s) => s.itemId === entry.id)).map((entry) => entry.id),
    );
    for (let seed = 1; seed <= 30; seed++) {
      const { slots } = compose(fewDue, {}, seed);
      for (const slot of slots) {
        if (slot.exercise === 'E1') expect(newIds.has(slot.itemId)).toBe(true);
      }
      for (const id of ids(slots).filter((slotId) => newIds.has(slotId))) {
        expect(slots.find((slot) => slot.itemId === id)?.exercise).toBe('E1');
      }
    }
  });

  it('treats a stored state with state "new" as New', () => {
    const asNew = createNewItemState('t01-kopf', NOW);
    const { slots } = compose([asNew], { items: [item('t01-kopf')] });
    expect(slots[0]).toEqual({ itemId: 't01-kopf', exercise: 'E1' });
  });

  it('quizzes each new item once more, after 2 other exercises or at the end, as E3 or E4', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { slots } = compose(fewDue, {}, seed);
      for (const slot of slots.filter((s) => s.exercise === 'E1')) {
        const start = slots.indexOf(slot);
        const quizzes = slots.filter((s) => s.itemId === slot.itemId && s.followUp);
        expect(quizzes).toHaveLength(1);
        const quiz = quizzes[0] as Slot;
        expect(['E3', 'E4']).toContain(quiz.exercise);
        const at = slots.indexOf(quiz);
        // After 2 other exercises, or at the end (behind only other quizzes) when it is shorter.
        expect(at >= start + 3 || slots.slice(at + 1).every((later) => later.followUp)).toBe(true);
        expect(at).toBeGreaterThan(start);
      }
    }
  });

  it('adds at most 2 new items, and fewer when today’s limit of 6 is close', () => {
    expect(compose(fewDue).slots.filter((s) => s.exercise === 'E1')).toHaveLength(2);
    expect(
      compose(fewDue, { newItemsToday: 5 }).slots.filter((s) => s.exercise === 'E1'),
    ).toHaveLength(1);
    expect(
      compose(fewDue, { newItemsToday: 4 }).slots.filter((s) => s.exercise === 'E1'),
    ).toHaveLength(2);
  });

  it('takes new items from the learner’s level first, in content order', () => {
    const a1 = compose([], { settings: { level: 'A1' } }).slots.filter((s) => s.exercise === 'E1');
    expect(a1.map((s) => item(s.itemId).level)).toEqual(['A1', 'A1']);
    const a2 = compose([], { settings: { level: 'A2' } }).slots.filter((s) => s.exercise === 'E1');
    expect(a2.map((s) => item(s.itemId).level)).toEqual(['A2', 'A2']);
    expect(a1.map((s) => s.itemId).sort()).toEqual(
      ITEMS.filter((entry) => entry.level === 'A1')
        .slice(0, 2)
        .map((entry) => entry.id)
        .sort(),
    );
  });

  it('falls back to the other level when the learner’s level has no unmet items', () => {
    const a2Only = ITEMS.filter((entry) => entry.level === 'A2');
    const a1Items = ITEMS.filter((entry) => entry.level === 'A1');
    const { slots } = compose(
      a1Items.map((entry) => state(entry.id)),
      { settings: { level: 'A1' } },
    );
    const fresh = slots.filter((slot) => slot.exercise === 'E1');
    expect(fresh.length).toBeGreaterThan(0);
    for (const slot of fresh) expect(a2Only.map((entry) => entry.id)).toContain(slot.itemId);
  });
});

describe('composer: priority order', () => {
  it('puts bank items due or wrong in the last 48 hours first, up to 4', () => {
    const recent = state('t01-kopf', {
      box: 1,
      dueAt: NOW + DAY_MS,
      inMistakeBank: true,
      bankEnteredAt: NOW - DAY_MS,
    });
    const stale = state('t01-hand', {
      box: 1,
      dueAt: NOW + DAY_MS,
      inMistakeBank: true,
      bankEnteredAt: NOW - 3 * DAY_MS,
    });
    const others = PLAIN.filter((e) => e.id !== 't01-kopf' && e.id !== 't01-hand').slice(0, 5);
    const states = [recent, stale, ...others.map((entry, i) => due(entry, i))];
    const { slots } = compose(states, { newItemsToday: 6, settings: { sessionLength: 5 } });
    const picked = ids(planned(slots));
    expect(picked).toContain('t01-kopf');
    expect(picked).not.toContain('t01-hand');
  });

  it('takes at most 4 bank items first, so the least overdue bank items wait behind more overdue ones', () => {
    const bank = PLAIN.slice(0, 6);
    const others = PLAIN.slice(6, 12);
    const states = [
      ...bank.map((entry, i) => dueBank(entry, i)),
      ...others.map((entry, i) => due(entry, 500_000 + i)),
    ];
    const picked = ids(planned(compose(states).slots)).sort();
    // 4 most overdue bank items, then 5 due items, then 1 filler. Bank items 0 and 1 are left out.
    const expected = [...bank.slice(2), ...others].map((entry) => entry.id).sort();
    expect(picked).toEqual(expected);
  });

  it('takes other due items most overdue first', () => {
    const states = PLAIN.slice(0, 8).map((entry, i) => due(entry, 8 - i));
    const picked = ids(planned(compose(states, { newItemsToday: 6 }).slots));
    expect(picked).toHaveLength(8);
    const five = ids(
      planned(compose(states, { newItemsToday: 6, settings: { sessionLength: 5 } }).slots),
    );
    expect(five.sort()).toEqual(
      PLAIN.slice(0, 5)
        .map((entry) => entry.id)
        .sort(),
    );
  });

  it('never repeats an item in the planned exercises', () => {
    const states = PLAIN.slice(0, 20).map((entry, i) =>
      i < 6 ? dueBank(entry, i) : due(entry, i),
    );
    const picked = ids(planned(compose(states).slots));
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('fills with Learning items not seen today, then Strong items', () => {
    const [a, b, c, d] = PLAIN;
    const learningUnseen = state((a as Item).id, { box: 2, dueAt: NOW + DAY_MS });
    const learningSeen = state((b as Item).id, {
      box: 2,
      dueAt: NOW + DAY_MS,
      lastSeenAt: NOW - 1000,
    });
    const strong = state((c as Item).id, { box: 5, state: 'strong', dueAt: NOW + 10 * DAY_MS });
    const strongTwo = state((d as Item).id, { box: 4, state: 'strong', dueAt: NOW + 5 * DAY_MS });
    const { slots } = compose([learningUnseen, learningSeen, strong, strongTwo], {
      newItemsToday: 6,
    });
    expect(ids(slots).sort()).toEqual([a, c, d].map((entry) => (entry as Item).id).sort());
  });

  it('fills Learning items nearest to due first when there is not room for all', () => {
    const states = PLAIN.slice(0, 7).map((entry, i) =>
      state(entry.id, { box: 2, dueAt: NOW + (7 - i) * DAY_MS }),
    );
    const { slots } = compose(states, { newItemsToday: 6, settings: { sessionLength: 5 } });
    expect(ids(slots).sort()).toEqual(
      states
        .slice(2)
        .map((entry) => entry.itemId)
        .sort(),
    );
  });

  it('does not fill beyond what is available', () => {
    const { slots } = compose([], { items: [item('t01-kopf')] });
    expect(planned(slots)).toEqual([{ itemId: 't01-kopf', exercise: 'E1' }]);
    expect(slots).toHaveLength(2);
  });

  it('respects session lengths of 5 and 15', () => {
    const states = PLAIN.slice(0, 20).map((entry, i) => due(entry, i, 4));
    expect(planned(compose(states, { settings: { sessionLength: 5 } }).slots)).toHaveLength(5);
    expect(planned(compose(states, { settings: { sessionLength: 15 } }).slots)).toHaveLength(15);
  });
});

describe('composer: choosing the exercise', () => {
  // Speech is off unless a test turns it on, so the speaking minimum does not rewrite the type.
  const run = (box: 1 | 2 | 3 | 4 | 5, entry: Item, settings: Partial<ComposeSettings> = {}) => {
    const found = new Set<ExerciseId>();
    for (let seed = 1; seed <= 40; seed++) {
      const { slots } = compose(
        [due(entry, 0, box)],
        { items: [entry], newItemsToday: 6, settings: { speech: false, ...settings } },
        seed,
      );
      found.add((slots[0] as Slot).exercise);
    }
    return found;
  };

  it('box 1 uses E3 or E4, never E1', () => {
    expect([...run(1, item('t01-kopf'))].sort()).toEqual(['E3', 'E4']);
  });

  it('box 2 uses E2, E5 or E4', () => {
    expect([...run(2, item('t01-kopf'))].sort()).toEqual(['E2', 'E4', 'E5']);
  });

  it('box 3 uses E6, or E9 for number items', () => {
    expect([...run(3, item('t01-kopf'))]).toEqual(['E6']);
    expect([...run(3, item('t03-puls-1'))]).toEqual(['E9']);
  });

  it('box 4 and 5 use E7 or E8, and E8 only for A2 sentences of 5 to 9 words', () => {
    const speech = { speech: true };
    expect([...run(4, item('t01-kopf'), speech)]).toEqual(['E7']);
    expect([...run(5, item('t08-seit-wann'), speech)].sort()).toEqual(['E7', 'E8']);
    expect([...run(5, item('t08-allergien'), speech)]).toEqual(['E7']);
  });

  it('a number item in box 4 or 5 falls back to E9, then E3', () => {
    expect([...run(4, item('t03-bp-1'), { speech: true })]).toEqual(['E9']);
    expect([...run(5, item('t03-bp-1'), { speech: true, audio: false })]).toEqual(['E3']);
  });

  it('E2 only for nouns with an article, E5 only when the word is in its example sentence', () => {
    expect(run(2, item('t02-links')).has('E2')).toBe(false);
    expect(run(2, item('t02-schmerz')).has('E5')).toBe(false);
    expect(run(2, item('t02-schmerz')).has('E2')).toBe(true);
  });

  it('without audio there is no E4 or E9, and E3 or E6 take their place', () => {
    for (const entry of [item('t01-kopf'), item('t03-puls-1')]) {
      for (const box of [1, 2, 3] as const) {
        const found = run(box, entry, { audio: false });
        expect(found.has('E4')).toBe(false);
        expect(found.has('E9')).toBe(false);
      }
    }
    expect([...run(3, item('t01-kopf'), { audio: false })]).toEqual(['E6']);
    expect([...run(3, item('t03-puls-1'), { audio: false })]).toEqual(['E3']);
  });

  it('without speech E7 becomes E6, while E8 stays available because it is tap based', () => {
    expect([...run(5, item('t08-seit-wann'), { speech: false })]).toEqual(['E8']);
    expect([...run(5, item('t01-kopf'), { speech: false })]).toEqual(['E6']);
    expect([...run(4, item('t08-allergien'), { speech: false })]).toEqual(['E6']);
  });

  it('only ever picks types that are valid for the item', () => {
    const states = ITEMS.map((entry, i) => due(entry, i, ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5));
    for (const speech of [true, false]) {
      for (const audio of [true, false]) {
        for (let seed = 1; seed <= 10; seed++) {
          const { slots } = compose(
            states,
            { settings: { speech, audio, sessionLength: 15 } },
            seed,
          );
          for (const slot of slots) {
            expect(isValidExercise(slot.exercise, item(slot.itemId), { speech, audio })).toBe(true);
          }
        }
      }
    }
  });
});

describe('composer: speaking exercises', () => {
  it('requires 2, 3 and 5 for sessions of 5, 10 and 15', () => {
    expect([5, 10, 15].map(speakingMinimum)).toEqual([2, 3, 5]);
  });

  it('converts lower box items to E7, nearest box first, when box 4 and 5 items are not enough', () => {
    const states = PLAIN.slice(0, 12).map((entry, i) => due(entry, i, 3));
    for (let seed = 1; seed <= 15; seed++) {
      const { slots, speakingShortfall } = compose(states, { newItemsToday: 6 }, seed);
      expect(planned(slots).filter((slot) => SPEAKING.includes(slot.exercise))).toHaveLength(3);
      expect(speakingShortfall).toBe(0);
    }
  });

  it('reports a shortfall instead of failing when nothing can be spoken', () => {
    const numbers = ITEMS.filter((entry) => entry.spoken !== undefined);
    const states = numbers.map((entry, i) => due(entry, i, 3));
    const { slots, speakingShortfall } = compose(states, { newItemsToday: 6 });
    expect(slots.some((slot) => SPEAKING.includes(slot.exercise))).toBe(false);
    expect(speakingShortfall).toBe(Math.min(3, numbers.length));
  });

  it('never uses E7 and never applies the quota when speech is off', () => {
    const states = PLAIN.slice(0, 12).map((entry, i) => due(entry, i, 4));
    const { slots, speakingShortfall } = compose(states, { settings: { speech: false } });
    expect(slots.some((slot) => slot.exercise === 'E7')).toBe(false);
    expect(speakingShortfall).toBe(0);
  });
});

describe('composer: repeatable order', () => {
  const states = PLAIN.slice(0, 14).map((entry, i) =>
    due(entry, i, ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5),
  );

  it('gives the same session for the same seed', () => {
    expect(compose(states, {}, 7)).toEqual(compose(states, {}, 7));
  });

  it('varies with the seed', () => {
    const results = new Set(
      Array.from({ length: 12 }, (_, i) => JSON.stringify(compose(states, {}, i + 1).slots)),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('does not change its inputs', () => {
    const copy = structuredClone([...stateMap(...states)]);
    compose(states);
    expect([...stateMap(...states)]).toEqual(copy);
  });
});

describe('composer: scheduleRetry', () => {
  const queue = (...names: string[]): Slot[] => names.map((itemId) => ({ itemId, exercise: 'E6' }));
  const rng = () => createRng(3);

  it('inserts the retry after 2 other exercises as E3 or E4', () => {
    const result = scheduleRetry(queue('a', 'b', 'c', 'd', 'e', 'f'), 1, { id: 'b' }, rng(), true);
    expect(ids(result)).toEqual(['a', 'b', 'c', 'd', 'b', 'e', 'f']);
    expect(['E3', 'E4']).toContain(result[4]?.exercise);
    expect(result[4]?.retry).toBe(true);
  });

  it('appends the retry when fewer than 2 exercises remain, never beyond the end', () => {
    expect(ids(scheduleRetry(queue('a', 'b', 'c'), 1, { id: 'b' }, rng(), true))).toEqual([
      'a',
      'b',
      'c',
      'b',
    ]);
    expect(ids(scheduleRetry(queue('a', 'b'), 1, { id: 'b' }, rng(), true))).toEqual([
      'a',
      'b',
      'b',
    ]);
    expect(ids(scheduleRetry(queue('a'), 0, { id: 'a' }, rng(), true))).toEqual(['a', 'a']);
    expect(ids(scheduleRetry(queue('a'), 5, { id: 'a' }, rng(), true))).toEqual(['a', 'a']);
  });

  it('never uses E4 without a German voice', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const result = scheduleRetry(
        queue('a', 'b', 'c', 'd'),
        0,
        { id: 'a' },
        createRng(seed),
        false,
      );
      expect(result[3]?.exercise).toBe('E3');
    }
  });

  it('uses both E3 and E4 when a German voice exists', () => {
    const used = new Set(
      Array.from(
        { length: 30 },
        (_, seed) =>
          scheduleRetry(queue('a', 'b', 'c', 'd'), 0, { id: 'a' }, createRng(seed), true)[3]
            ?.exercise,
      ),
    );
    expect([...used].sort()).toEqual(['E3', 'E4']);
  });

  it('does not queue a retry for a retry, or a second retry for the same item', () => {
    const first = scheduleRetry(queue('a', 'b', 'c', 'd', 'e'), 0, { id: 'a' }, rng(), true);
    const retryIndex = first.findIndex((slot) => slot.retry);
    expect(ids(scheduleRetry(first, retryIndex, { id: 'a' }, rng(), true))).toEqual(ids(first));
    expect(ids(scheduleRetry(first, 0, { id: 'a' }, rng(), true))).toEqual(ids(first));
  });

  it('does not change the queue it is given', () => {
    const original = queue('a', 'b', 'c', 'd');
    scheduleRetry(original, 0, { id: 'a' }, rng(), true);
    expect(original).toHaveLength(4);
  });
});
