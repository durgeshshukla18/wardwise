// The on-device event log (docs/04-TRD.md section 9). Props are small and hold no free text.
import type { EventRow } from '../data/schema.ts';
import { repositories } from '../data/runtime.ts';
import { now } from './clock.ts';
import { newId } from './ids.ts';

export const EVENT_NAMES = [
  'session_start',
  'session_end',
  'exercise_result',
  'speech_used',
  'speech_unsupported',
  'ai_call',
  'ai_fallback',
  'mistake_bank_enter',
  'mistake_bank_recover',
  'streak_freeze_used',
  'feedback_sent',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];
export type EventProps = Record<string, string | number | boolean | null>;

export function createEventLog(
  repos: { events: { add: (row: EventRow) => PromiseLike<unknown> } },
  clock: () => number = now,
  makeId: () => string = newId,
) {
  return {
    /** Saves one event. A failure to save is reported to the console and never stops the learner. */
    async log(name: EventName, props: EventProps = {}): Promise<void> {
      try {
        await repos.events.add({ id: makeId(), ts: clock(), name, props });
      } catch (error) {
        console.warn('Could not save event', name, error);
      }
    },
  };
}

export const events = createEventLog(repositories);
