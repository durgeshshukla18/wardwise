// What the whole app shares: whether the data has loaded, and the learner's saved progress.
import { create } from 'zustand';

import { items } from '../content/index.ts';
import { buildDemoSeed } from '../data/demo-seed.ts';
import { repositories } from '../data/runtime.ts';
import { SINGLETON_KEY, type DayRow, type ProfileRow, type StreakRow } from '../data/schema.ts';
import type { ItemState } from '../domain/types.ts';
import { localDay, now } from '../services/clock.ts';
import { events } from '../services/events.ts';
import { copy } from './copy.ts';
import { refreshStreak } from './progress.ts';

export const DEMO_SEED = 1;
export const MAX_NAME_LENGTH = 40;

type AppState = {
  status: 'loading' | 'ready' | 'error';
  profile: ProfileRow | null;
  itemStates: ReadonlyMap<string, ItemState>;
  days: DayRow[];
  streak: StreakRow | null;
  /** Reads everything from the device. Also brings the streak up to today. */
  load: () => Promise<void>;
  /** Replaces any progress with the seeded demo profile. */
  startDemo: () => Promise<void>;
  /** Creates a profile with a first name. Onboarding comes next. */
  startFresh: (name: string) => Promise<void>;
  /** Saves the onboarding answers and the level the learner chose, and marks onboarding done. */
  completeOnboarding: (input: {
    level: ProfileRow['level'];
    onboarding: NonNullable<ProfileRow['onboarding']>;
  }) => Promise<void>;
  /** Saves a change to a setting. */
  updateProfile: (
    changes: Partial<
      Pick<ProfileRow, 'level' | 'sessionLength' | 'hindiHints' | 'speechOn' | 'audioSpeed'>
    >,
  ) => Promise<void>;
  /** Deletes all progress on this device. */
  reset: () => Promise<void>;
};

const empty = {
  profile: null,
  itemStates: new Map<string, ItemState>(),
  days: [] as DayRow[],
  streak: null,
};

export const useApp = create<AppState>()((set, get) => ({
  status: 'loading',
  ...empty,

  async load() {
    try {
      const [profile, itemStates, days, savedStreak] = await Promise.all([
        repositories.profile.get(),
        repositories.itemStates.all(),
        repositories.days.all(),
        repositories.streak.get(),
      ]);
      const streak = profile?.onboardedAt
        ? await refreshStreak(repositories, events.log, savedStreak, days, now())
        : savedStreak;
      set({
        status: 'ready',
        profile: profile ?? null,
        itemStates,
        days,
        streak: streak ?? null,
      });
    } catch (error) {
      console.warn('Could not load progress', error);
      set({ status: 'error', ...empty });
    }
  },

  async startDemo() {
    const moment = now();
    const seed = buildDemoSeed({
      items,
      now: moment,
      day: localDay(moment),
      seed: DEMO_SEED,
      onboarding: {
        goal: copy.onboarding.demoGoal,
        dailyTime: copy.onboarding.demoDailyTime,
        selfLevel: copy.onboarding.demoSelfLevel,
      },
    });
    await repositories.loadSeed(seed);
    await get().load();
  },

  async startFresh(name) {
    await repositories.profile.put({
      id: SINGLETON_KEY,
      name: name.trim().slice(0, MAX_NAME_LENGTH),
      level: 'A1',
      sessionLength: 10,
      hindiHints: false,
      speechOn: true,
      audioSpeed: 1,
      onboardedAt: null,
      onboarding: null,
    });
    await get().load();
  },

  async completeOnboarding({ level, onboarding }) {
    const profile = get().profile;
    if (profile === null) return;
    await repositories.profile.put({ ...profile, level, onboarding, onboardedAt: now() });
    await get().load();
  },

  async updateProfile(changes) {
    const profile = get().profile;
    if (profile === null) return;
    const next = { ...profile, ...changes };
    await repositories.profile.put(next);
    set({ profile: next });
  },

  async reset() {
    await repositories.resetAll();
    set({ status: 'ready', ...empty });
  },
}));
