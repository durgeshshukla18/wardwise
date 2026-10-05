// Starting a session: compose the exercises, save the session, and hand it to the live store.
import { useApp } from '../../app/store.ts';
import { items } from '../../content/index.ts';
import { composeSession } from '../../domain/composer.ts';
import { createRng, hashSeed } from '../../domain/rng.ts';
import type { ItemState } from '../../domain/types.ts';
import { localDay, now } from '../../services/clock.ts';
import { newId } from '../../services/ids.ts';
import { germanVoiceAvailable } from '../../services/tts.ts';
import { ENABLED_EXERCISES } from './config.ts';
import { persist, useSession } from './store.ts';

type Options = {
  /** An Extra round after a session. */
  extraRound?: boolean;
  /** Item states to compose from. Defaults to the saved ones. */
  states?: ReadonlyMap<string, ItemState>;
};

async function compose(options: Options, sessionId: string) {
  const { profile, itemStates } = useApp.getState();
  if (profile === null) return null;
  const moment = now();
  const day = localDay(moment);
  const audio = await germanVoiceAvailable();
  const { slots } = composeSession({
    items,
    states: options.states ?? itemStates,
    now: moment,
    day,
    settings: {
      level: profile.level,
      sessionLength: profile.sessionLength,
      speech: false,
      audio,
    },
    newItemsToday: await persist.newItemsToday(day.startMs),
    rng: createRng(hashSeed(sessionId)),
    extraRound: options.extraRound === true,
    enabledExercises: ENABLED_EXERCISES,
  });
  return { profile, slots, audio, moment, itemStates: options.states ?? itemStates };
}

/** True when an Extra round would have something to ask. */
export async function extraRoundAvailable(
  states: ReadonlyMap<string, ItemState>,
): Promise<boolean> {
  await useSession.getState().flush();
  const composed = await compose({ extraRound: true, states }, newId());
  return composed !== null && composed.slots.length > 0;
}

/** Starts a Shift Break and returns its id, or null when there is nothing to ask. */
export async function startSession(options: Options = {}): Promise<string | null> {
  await useSession.getState().flush();
  const sessionId = newId();
  const composed = await compose(options, sessionId);
  if (composed === null || composed.slots.length === 0) return null;

  const planned = [
    ...new Set(composed.slots.filter((slot) => !slot.followUp).map((s) => s.itemId)),
  ];
  await persist.startSession({
    id: sessionId,
    startedAt: composed.moment,
    endedAt: null,
    mode: 'shift_break',
    itemIds: planned,
    completed: false,
  });
  useSession.getState().begin({
    sessionId,
    mode: 'shift_break',
    slots: composed.slots,
    states: composed.itemStates,
    audio: composed.audio,
    audioSpeed: composed.profile.audioSpeed,
  });
  return sessionId;
}
