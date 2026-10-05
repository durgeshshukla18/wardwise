// The live session: the queue, where the learner is, and what each answer did.
// `createSessionStore` takes its dependencies so tests can run it against fake ones.
import { create } from 'zustand';

import { useApp } from '../../app/store.ts';
import { items as contentItems } from '../../content/index.ts';
import type { SessionMode } from '../../data/schema.ts';
import { checkAnswer } from '../../domain/checker.ts';
import { scheduleRetry } from '../../domain/composer.ts';
import { createRng, hashSeed } from '../../domain/rng.ts';
import {
  applyAnswer,
  applyRetry,
  completeLearnCard,
  createNewItemState,
  exerciseFormat,
} from '../../domain/scheduler.ts';
import type {
  CheckResult,
  Format,
  Item,
  ItemState,
  LocalDay,
  RetryOutcome,
  Slot,
} from '../../domain/types.ts';
import { now as realNow, localDay as realLocalDay } from '../../services/clock.ts';
import { events } from '../../services/events.ts';
import { newId as realNewId } from '../../services/ids.ts';
import { repositories } from '../../data/runtime.ts';
import { createPersist, type LogFn, type Persist } from './persist.ts';
import { buildQuestion, slotSeed, toCheckRequest, type Answer } from './question.ts';
import type { ExerciseResult } from './summary.ts';

export type Feedback = {
  correct: boolean;
  check: CheckResult;
  /** What the learner chose or typed. */
  answer: string;
  retryOutcome: RetryOutcome | null;
};

export type SessionDeps = {
  items: readonly Item[];
  persist: Persist;
  now: () => number;
  localDay: (ms: number) => LocalDay;
  newId: () => string;
  /** Runs when a session ends, for example to refresh what Today shows. */
  afterEnd: () => Promise<void>;
};

export type BeginInput = {
  sessionId: string;
  mode: SessionMode;
  slots: Slot[];
  states: ReadonlyMap<string, ItemState>;
  audio: boolean;
  audioSpeed: 1 | 0.8;
};

export type SessionState = {
  status: 'idle' | 'running' | 'summary' | 'left';
  sessionId: string | null;
  mode: SessionMode;
  queue: Slot[];
  index: number;
  phase: 'question' | 'feedback';
  /** The learner's item states, updated as the session goes. */
  states: ReadonlyMap<string, ItemState>;
  audio: boolean;
  audioSpeed: 1 | 0.8;
  results: ExerciseResult[];
  feedback: Feedback | null;
  /** Completed exercises over the queue length. It never goes backward when the queue grows. */
  progress: number;
  begin: (input: BeginInput) => void;
  completeLearnCard: () => Promise<void>;
  submit: (answer: Answer) => Promise<void>;
  next: () => Promise<void>;
  leave: () => Promise<void>;
  /** Waits until everything answered so far has been saved. */
  flush: () => Promise<void>;
};

const initial = {
  status: 'idle' as const,
  sessionId: null,
  mode: 'shift_break' as SessionMode,
  queue: [] as Slot[],
  index: 0,
  phase: 'question' as const,
  states: new Map<string, ItemState>(),
  audio: false,
  audioSpeed: 1 as const,
  results: [] as ExerciseResult[],
  feedback: null,
  progress: 0,
};

export function createSessionStore(deps: SessionDeps) {
  // Saves go through one chain so they land in order. A failed save never stops the learner.
  let writes: Promise<unknown> = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    writes = writes.then(task).catch((error) => console.warn('Could not save progress', error));
    return writes;
  };

  const itemById = (id: string): Item => {
    const found = deps.items.find((item) => item.id === id);
    if (!found) throw new Error(`Unknown item ${id}`);
    return found;
  };

  return create<SessionState>()((set, get) => {
    const fraction = (done: number, total: number, previous: number) =>
      Math.max(previous, total === 0 ? 0 : done / total);

    async function finish(completed: boolean, status: 'summary' | 'left') {
      const s = get();
      const endedAt = deps.now();
      set({ status, phase: 'question', feedback: null, progress: completed ? 1 : s.progress });
      await enqueue(() =>
        deps.persist.finishSession(s.sessionId as string, endedAt, completed, {
          mode: s.mode,
          exercises: s.results.length,
        }),
      );
      await deps.afterEnd();
    }

    return {
      ...initial,

      begin(input) {
        set({
          ...initial,
          status: 'running',
          sessionId: input.sessionId,
          mode: input.mode,
          queue: input.slots,
          states: input.states,
          audio: input.audio,
          audioSpeed: input.audioSpeed,
        });
      },

      async completeLearnCard() {
        const s = get();
        if (s.status !== 'running' || s.phase !== 'question') return;
        const slot = s.queue[s.index] as Slot;
        const nowMs = deps.now();
        const learned = completeLearnCard(
          s.states.get(slot.itemId) ?? createNewItemState(slot.itemId, nowMs),
          nowMs,
        );
        const results = [
          ...s.results,
          {
            itemId: slot.itemId,
            exercise: slot.exercise,
            correct: null,
            retry: false,
            followUp: false,
          },
        ];
        const last = s.index + 1 >= s.queue.length;
        set({
          states: new Map(s.states).set(slot.itemId, learned),
          results,
          index: last ? s.index : s.index + 1,
          progress: fraction(results.length, s.queue.length, s.progress),
        });
        void enqueue(() =>
          deps.persist.recordExercise({
            attempt: {
              id: deps.newId(),
              sessionId: s.sessionId as string,
              itemId: slot.itemId,
              exercise: 'E1',
              correct: true,
              errorType: null,
              answer: '',
              ts: nowMs,
              aiUsed: false,
            },
            itemState: learned,
            bank: null,
            nowMs,
          }),
        );
        if (last) await finish(true, 'summary');
      },

      async submit(answer) {
        const s = get();
        if (s.status !== 'running' || s.phase !== 'question') return;
        const slot = s.queue[s.index] as Slot;
        const item = itemById(slot.itemId);
        const question = buildQuestion(
          slot,
          item,
          deps.items,
          slotSeed(s.sessionId as string, s.index, slot),
        );
        if (question.kind === 'learn') return;

        const check = checkAnswer(toCheckRequest(question, answer));
        const correct = check.verdict === 'correct';
        const nowMs = deps.now();
        const current = s.states.get(slot.itemId);
        if (!current) throw new Error(`No state for ${slot.itemId}`);

        let nextState = current;
        let bank: 'entered' | 'recovered' | null = null;
        let retryOutcome: RetryOutcome | null = null;
        let queue = s.queue;
        if (slot.retry) {
          retryOutcome = applyRetry(current, correct).outcome;
        } else {
          if (!correct && check.errorType === null) throw new Error('A wrong answer has no type');
          const result = applyAnswer(current, {
            correct,
            format: exerciseFormat(slot.exercise) as Format,
            now: nowMs,
            day: deps.localDay(nowMs),
            errorType: check.errorType,
          });
          nextState = result.state;
          bank = result.bank;
          if (!correct) {
            queue = scheduleRetry(
              queue,
              s.index,
              item,
              createRng(hashSeed(s.sessionId as string, 'retry', s.index)),
              s.audio,
            );
          }
        }

        const text = answer.kind === 'choice' ? answer.chosen : answer.text;
        const results = [
          ...s.results,
          {
            itemId: slot.itemId,
            exercise: slot.exercise,
            correct,
            retry: slot.retry === true,
            followUp: slot.followUp === true,
          },
        ];
        set({
          phase: 'feedback',
          feedback: { correct, check, answer: text, retryOutcome },
          queue,
          states: new Map(s.states).set(slot.itemId, nextState),
          results,
          progress: fraction(results.length, queue.length, s.progress),
        });
        void enqueue(() =>
          deps.persist.recordExercise({
            attempt: {
              id: deps.newId(),
              sessionId: s.sessionId as string,
              itemId: slot.itemId,
              exercise: slot.exercise,
              correct,
              errorType: correct ? null : check.errorType,
              answer: text,
              ts: nowMs,
              aiUsed: false,
            },
            itemState: slot.retry ? null : nextState,
            bank,
            nowMs,
          }),
        );
      },

      async next() {
        const s = get();
        if (s.status !== 'running' || s.phase !== 'feedback') return;
        if (s.index + 1 >= s.queue.length) {
          await finish(true, 'summary');
          return;
        }
        set({ index: s.index + 1, phase: 'question', feedback: null });
      },

      async leave() {
        if (get().status !== 'running') return;
        await finish(false, 'left');
      },

      flush: () => writes.then(() => undefined),
    };
  });
}

const log: LogFn = (name, props) => events.log(name, props);

/** The live session for the whole app. */
export const persist = createPersist(repositories, log);

export const useSession = createSessionStore({
  items: contentItems,
  persist,
  now: realNow,
  localDay: realLocalDay,
  newId: realNewId,
  afterEnd: () => useApp.getState().load(),
});
