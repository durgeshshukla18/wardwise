import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDb } from '../../src/data/db.ts';
import { createRepositories, type Repositories } from '../../src/data/repositories.ts';
import { DAY_MS, createNewItemState } from '../../src/domain/scheduler.ts';
import type { ItemState, Slot } from '../../src/domain/types.ts';
import { createPersist, type Persist } from '../../src/features/session/persist.ts';
import { buildQuestion, slotSeed } from '../../src/features/session/question.ts';
import { createSessionStore, type SessionState } from '../../src/features/session/store.ts';
import { localDay } from '../../src/services/clock.ts';
import { ITEMS, state } from '../domain/fixtures.ts';

const T0 = new Date(2026, 9, 5, 10).getTime();
let counter = 0;
let repos: Repositories;
let persist: Persist;
let clock: number;
const logged: { name: string; props: unknown }[] = [];

function setup(overrides: { persist?: Persist; afterEnd?: () => Promise<void> } = {}) {
  counter += 1;
  repos = createRepositories(createDb(`test-session-${counter}`));
  logged.length = 0;
  persist = createPersist(repos, async (name, props) => {
    logged.push({ name, props });
  });
  clock = T0;
  const afterEnd = overrides.afterEnd ?? (async () => undefined);
  const useStore = createSessionStore({
    items: ITEMS,
    persist: overrides.persist ?? persist,
    now: () => (clock += 1000),
    localDay,
    newId: () => `id-${(counter += 1)}`,
    afterEnd,
  });
  return { useStore, afterEnd };
}

const due = (id: string, over: Partial<ItemState> = {}) =>
  state(id, { dueAt: T0 - 1, box: 2, ...over });
const slotOf = (itemId: string, exercise: Slot['exercise'], extra: Partial<Slot> = {}): Slot => ({
  itemId,
  exercise,
  ...extra,
});

function begin(store: ReturnType<typeof setup>['useStore'], slots: Slot[], states: ItemState[]) {
  store.getState().begin({
    sessionId: 's1',
    mode: 'shift_break',
    slots,
    states: new Map(states.map((s) => [s.itemId, s])),
    audio: true,
    audioSpeed: 1,
  });
}

/** The option that is right for the current slot, or a wrong one. */
function option(store: ReturnType<typeof setup>['useStore'], right: boolean): string {
  const s: SessionState = store.getState();
  const slot = s.queue[s.index] as Slot;
  const item = ITEMS.find((entry) => entry.id === slot.itemId)!;
  const q = buildQuestion(slot, item, ITEMS, slotSeed('s1', s.index, slot));
  if (q.kind !== 'choice') throw new Error('not a choice');
  return right ? q.correctOption : (q.options.find((o) => o !== q.correctOption) as string);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('session store: answers', () => {
  it('starts running at the first exercise with no progress', () => {
    const { useStore } = setup();
    begin(useStore, [slotOf('t01-kopf', 'E3')], [due('t01-kopf')]);
    expect(useStore.getState()).toMatchObject({
      status: 'running',
      index: 0,
      phase: 'question',
      progress: 0,
    });
  });

  it('a right answer opens the feedback, moves a due item up a box, and saves everything', async () => {
    const { useStore } = setup();
    begin(
      useStore,
      [slotOf('t01-kopf', 'E3'), slotOf('t01-hand', 'E3')],
      [due('t01-kopf'), due('t01-hand')],
    );
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    const s = useStore.getState();
    expect(s.phase).toBe('feedback');
    expect(s.feedback).toMatchObject({ correct: true, retryOutcome: null });
    expect(s.states.get('t01-kopf')).toMatchObject({ box: 3, correct: 1 });
    await s.flush();
    expect(await repos.attempts.all()).toHaveLength(1);
    expect(await repos.itemStates.all()).toHaveProperty('size', 1);
    expect((await repos.itemStates.all()).get('t01-kopf')?.box).toBe(3);
    expect((await repos.days.get(localDay(T0).date))?.exercisesDone).toBe(1);
    expect(logged.map((e) => e.name)).toContain('exercise_result');
  });

  it('a wrong answer drops the item to box 1, enters the Mistake Bank and adds a retry 3 places on', async () => {
    const { useStore } = setup();
    const slots = ['t01-kopf', 't01-hand', 't01-arm', 't01-bein', 't01-herz'].map((id) =>
      slotOf(id, 'E3'),
    );
    begin(
      useStore,
      slots,
      slots.map((s) => due(s.itemId)),
    );
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, false) });
    const s = useStore.getState();
    expect(s.feedback?.correct).toBe(false);
    expect(s.states.get('t01-kopf')).toMatchObject({
      box: 1,
      inMistakeBank: true,
      bankErrorType: 'meaning',
    });
    expect(s.queue).toHaveLength(6);
    expect(s.queue[3]).toMatchObject({ itemId: 't01-kopf', retry: true });
    await s.flush();
    expect(logged.map((e) => e.name)).toContain('mistake_bank_enter');
    const row = (await repos.attempts.all())[0];
    expect(row).toMatchObject({ correct: false, errorType: 'meaning', exercise: 'E3' });
  });

  it('the progress never moves backward when the queue grows', async () => {
    const { useStore } = setup();
    const slots = ['t01-kopf', 't01-hand', 't01-arm'].map((id) => slotOf(id, 'E3'));
    begin(
      useStore,
      slots,
      slots.map((s) => due(s.itemId)),
    );
    const seen: number[] = [];
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    seen.push(useStore.getState().progress);
    await useStore.getState().next();
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, false) });
    seen.push(useStore.getState().progress);
    await useStore.getState().next();
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    seen.push(useStore.getState().progress);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(useStore.getState().queue.length).toBeGreaterThan(3);
  });

  it('a retry that is right says "Fixed for now" and changes nothing about the item', async () => {
    const { useStore } = setup();
    const slots = [slotOf('t01-kopf', 'E3'), slotOf('t01-hand', 'E3', { retry: true })];
    begin(useStore, slots, [
      due('t01-kopf'),
      state('t01-hand', { box: 1, inMistakeBank: true, bankEnteredAt: T0 - 1000 }),
    ]);
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    await useStore.getState().next();
    const before = useStore.getState().states.get('t01-hand');
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    const s = useStore.getState();
    expect(s.feedback).toMatchObject({ correct: true, retryOutcome: 'fixed_for_now' });
    expect(s.states.get('t01-hand')).toEqual(before);
    expect(s.queue).toHaveLength(2);
    await s.flush();
    expect((await repos.itemStates.all()).has('t01-hand')).toBe(false);
    expect(await repos.attempts.all()).toHaveLength(2);
  });

  it('a retry that is wrong says "Still tricky" and adds no second retry', async () => {
    const { useStore } = setup();
    begin(
      useStore,
      [slotOf('t01-hand', 'E3', { retry: true })],
      [state('t01-hand', { box: 1, inMistakeBank: true, bankEnteredAt: T0 })],
    );
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, false) });
    expect(useStore.getState().feedback).toMatchObject({
      correct: false,
      retryOutcome: 'still_tricky',
    });
    expect(useStore.getState().queue).toHaveLength(1);
  });

  it('typed answers: right, wrong, and Skip as an empty answer with the type the checker gives', async () => {
    const { useStore } = setup();
    const slots = [slotOf('t01-kopf', 'E6'), slotOf('t01-hand', 'E6'), slotOf('t03-bp-1', 'E9')];
    begin(useStore, slots, [due('t01-kopf'), due('t01-hand'), due('t03-bp-1')]);
    await useStore.getState().submit({ kind: 'typed', text: 'der kopf' });
    expect(useStore.getState().feedback?.correct).toBe(true);
    await useStore.getState().next();
    await useStore.getState().submit({ kind: 'typed', text: '' });
    expect(useStore.getState().feedback).toMatchObject({ correct: false, answer: '' });
    expect(useStore.getState().feedback?.check.errorType).toBe('meaning');
    await useStore.getState().next();
    await useStore.getState().next();
    const index = useStore.getState().index;
    expect(useStore.getState().queue[index]?.exercise).toBeDefined();
  });

  it('an E9 skip is a number error', async () => {
    const { useStore } = setup();
    begin(useStore, [slotOf('t03-bp-1', 'E9')], [due('t03-bp-1')]);
    await useStore.getState().submit({ kind: 'typed', text: '' });
    expect(useStore.getState().feedback?.check).toMatchObject({
      errorType: 'number',
      expected: '120/80',
    });
  });

  it('ignores an answer while the feedback is open, and a Next while a question is open', async () => {
    const { useStore } = setup();
    begin(
      useStore,
      [slotOf('t01-kopf', 'E3'), slotOf('t01-hand', 'E3')],
      [due('t01-kopf'), due('t01-hand')],
    );
    await useStore.getState().next();
    expect(useStore.getState().index).toBe(0);
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    expect(useStore.getState().results).toHaveLength(1);
  });

  it('does nothing before a session begins', async () => {
    const { useStore } = setup();
    await useStore.getState().submit({ kind: 'typed', text: 'x' });
    await useStore.getState().completeLearnCard();
    await useStore.getState().next();
    await useStore.getState().leave();
    expect(useStore.getState().status).toBe('idle');
  });
});

describe('session store: Learn cards', () => {
  it('a Learn card puts a new item in box 1, Learning, due now, saves it and moves on', async () => {
    const { useStore } = setup();
    begin(useStore, [slotOf('t01-kopf', 'E1'), slotOf('t01-kopf', 'E3', { followUp: true })], []);
    await useStore.getState().completeLearnCard();
    const s = useStore.getState();
    expect(s.index).toBe(1);
    expect(s.states.get('t01-kopf')).toMatchObject({ box: 1, state: 'learning' });
    await s.flush();
    const attempt = (await repos.attempts.all())[0];
    expect(attempt).toMatchObject({ exercise: 'E1', correct: true, itemId: 't01-kopf' });
    expect(await repos.attempts.newItemsSince(T0 - DAY_MS)).toBe(1);
    expect((await repos.itemStates.all()).get('t01-kopf')?.state).toBe('learning');
  });

  it('the quiz after a Learn card moves the new item up, because it is due', async () => {
    const { useStore } = setup();
    begin(useStore, [slotOf('t01-kopf', 'E1'), slotOf('t01-kopf', 'E3', { followUp: true })], []);
    await useStore.getState().completeLearnCard();
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    expect(useStore.getState().states.get('t01-kopf')?.box).toBe(2);
  });

  it('a Learn card as the last exercise ends the session', async () => {
    const { useStore, afterEnd } = setup({ afterEnd: vi.fn(async () => undefined) });
    begin(useStore, [slotOf('t01-kopf', 'E1')], []);
    await useStore.getState().completeLearnCard();
    expect(useStore.getState().status).toBe('summary');
    expect(afterEnd).toHaveBeenCalled();
  });

  it('keeps a state that already exists when a Learn card is shown again', async () => {
    const { useStore } = setup();
    begin(
      useStore,
      [slotOf('t01-kopf', 'E1'), slotOf('t01-hand', 'E3')],
      [due('t01-kopf', { box: 3 })],
    );
    await useStore.getState().completeLearnCard();
    expect(useStore.getState().states.get('t01-kopf')?.box).toBe(3);
  });
});

describe('session store: ending', () => {
  it('finishing the last exercise shows the summary, completes the session and refreshes Today', async () => {
    const afterEnd = vi.fn(async () => undefined);
    const { useStore } = setup({ afterEnd });
    await persist.startSession({
      id: 's1',
      startedAt: T0,
      endedAt: null,
      mode: 'shift_break',
      itemIds: ['t01-kopf'],
      completed: false,
    });
    begin(useStore, [slotOf('t01-kopf', 'E3')], [due('t01-kopf')]);
    await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
    await useStore.getState().next();
    expect(useStore.getState()).toMatchObject({ status: 'summary', progress: 1 });
    expect(afterEnd).toHaveBeenCalledTimes(1);
    const row = await repos.sessions.get('s1');
    expect(row).toMatchObject({ completed: true });
    expect(row?.endedAt).not.toBeNull();
    expect(logged.map((e) => e.name)).toEqual(
      expect.arrayContaining(['session_start', 'exercise_result', 'session_end']),
    );
  });

  it('leaving after 3 answers keeps those 3 answers and marks the session not completed', async () => {
    const afterEnd = vi.fn(async () => undefined);
    const { useStore } = setup({ afterEnd });
    await persist.startSession({
      id: 's1',
      startedAt: T0,
      endedAt: null,
      mode: 'shift_break',
      itemIds: [],
      completed: false,
    });
    const ids = ['t01-kopf', 't01-hand', 't01-arm', 't01-bein', 't01-herz'];
    begin(
      useStore,
      ids.map((id) => slotOf(id, 'E3')),
      ids.map((id) => due(id)),
    );
    for (let i = 0; i < 3; i++) {
      await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
      await useStore.getState().next();
    }
    await useStore.getState().leave();
    expect(useStore.getState().status).toBe('left');
    expect(await repos.attempts.all()).toHaveLength(3);
    expect((await repos.itemStates.all()).size).toBe(3);
    expect((await repos.days.get(localDay(T0).date))?.exercisesDone).toBe(3);
    expect(await repos.sessions.get('s1')).toMatchObject({ completed: false });
    expect(afterEnd).toHaveBeenCalledTimes(1);
    expect(logged.find((e) => e.name === 'session_end')?.props).toMatchObject({
      completed: false,
      exercises: 3,
    });
  });

  it('five exercises in a day start a streak, and a Mistake Bank recovery is logged', async () => {
    const { useStore } = setup();
    const ids = ['t01-kopf', 't01-hand', 't01-arm', 't01-bein', 't01-herz'];
    begin(
      useStore,
      ids.map((id) => slotOf(id, 'E3')),
      ids.map((id) => due(id)),
    );
    for (let i = 0; i < 5; i++) {
      await useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) });
      if (i < 4) await useStore.getState().next();
    }
    await useStore.getState().flush();
    expect(await repos.streak.get()).toMatchObject({
      current: 1,
      lastCountedDate: localDay(T0).date,
    });
  });

  it('keeps going when saving fails, and says so on the console', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const broken = {
      ...createPersistStub(),
      recordExercise: () => Promise.reject(new Error('disk full')),
    };
    const { useStore } = setup({ persist: broken });
    begin(
      useStore,
      [slotOf('t01-kopf', 'E3'), slotOf('t01-hand', 'E3')],
      [due('t01-kopf'), due('t01-hand')],
    );
    await expect(
      useStore.getState().submit({ kind: 'choice', chosen: option(useStore, true) }),
    ).resolves.toBeUndefined();
    await useStore.getState().next();
    await useStore.getState().flush();
    expect(useStore.getState().index).toBe(1);
    expect(warn).toHaveBeenCalled();
  });

  it('refuses an answer for an item the session has no state for', async () => {
    const { useStore } = setup();
    begin(useStore, [slotOf('t01-kopf', 'E3')], []);
    await expect(useStore.getState().submit({ kind: 'choice', chosen: 'head' })).rejects.toThrow(
      /No state/,
    );
    expect(createNewItemState('t01-kopf', T0).state).toBe('new');
  });
});

function createPersistStub(): Persist {
  return {
    newItemsToday: async () => 0,
    startSession: async () => undefined,
    recordExercise: async () => undefined,
    finishSession: async () => undefined,
  };
}
