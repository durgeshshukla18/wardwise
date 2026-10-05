import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_NAME_LENGTH, useApp } from '../../src/app/store.ts';
import { repositories } from '../../src/data/runtime.ts';
import { items } from '../../src/content/index.ts';

const initial = useApp.getState();

beforeEach(async () => {
  await repositories.resetAll();
  useApp.setState({
    ...initial,
    status: 'loading',
    profile: null,
    itemStates: new Map(),
    days: [],
    streak: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('app store', () => {
  it('loads an empty device as ready with no profile', async () => {
    await useApp.getState().load();
    expect(useApp.getState()).toMatchObject({ status: 'ready', profile: null, streak: null });
    expect(useApp.getState().itemStates.size).toBe(0);
  });

  it('start fresh saves a trimmed first name and stays not onboarded', async () => {
    await useApp.getState().startFresh('  Anna  ');
    expect(useApp.getState().profile).toMatchObject({
      name: 'Anna',
      onboardedAt: null,
      level: 'A1',
    });
  });

  it('start fresh keeps a name to a sensible length', async () => {
    await useApp.getState().startFresh('x'.repeat(MAX_NAME_LENGTH + 20));
    expect(useApp.getState().profile?.name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('try demo loads an onboarded profile, 40 known items and a 9 day streak', async () => {
    await useApp.getState().startDemo();
    const state = useApp.getState();
    expect(state.status).toBe('ready');
    expect(state.profile?.onboardedAt).not.toBeNull();
    expect(state.itemStates.size).toBe(40);
    expect(state.streak).toMatchObject({ current: 9, freezes: 1 });
    expect(state.days.length).toBeGreaterThan(15);
  });

  it('try demo replaces earlier progress and survives a second load', async () => {
    await useApp.getState().startFresh('Anna');
    await useApp.getState().startDemo();
    expect(useApp.getState().profile?.name).not.toBe('Anna');
    const before = useApp.getState().streak;
    await useApp.getState().load();
    expect(useApp.getState().streak).toEqual(before);
    expect(items.length).toBeGreaterThan(40);
  });

  it('reports an error state when the device cannot be read, and does not throw', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(repositories.profile, 'get').mockRejectedValue(new Error('private mode'));
    await useApp.getState().load();
    expect(useApp.getState().status).toBe('error');
  });

  it('onboarding saves the answers, the chosen level and the time, and creates no item state', async () => {
    await useApp.getState().startFresh('Anna');
    await useApp.getState().completeOnboarding({
      level: 'A2',
      onboarding: { goal: 'g', dailyTime: '10 minutes', selfLevel: 'some words' },
    });
    const { profile, itemStates } = useApp.getState();
    expect(profile).toMatchObject({
      level: 'A2',
      onboarding: { goal: 'g', dailyTime: '10 minutes', selfLevel: 'some words' },
    });
    expect(profile?.onboardedAt).not.toBeNull();
    expect(itemStates.size).toBe(0);
    expect(await repositories.attempts.all()).toEqual([]);
  });

  it('onboarding does nothing without a profile', async () => {
    await useApp
      .getState()
      .completeOnboarding({ level: 'A1', onboarding: { goal: '', dailyTime: '', selfLevel: '' } });
    expect(useApp.getState().profile).toBeNull();
  });

  it('settings changes are saved and survive a reload', async () => {
    await useApp.getState().startDemo();
    await useApp.getState().updateProfile({
      level: 'A2',
      sessionLength: 5,
      audioSpeed: 0.8,
      hindiHints: true,
      speechOn: false,
    });
    const expected = {
      level: 'A2',
      sessionLength: 5,
      audioSpeed: 0.8,
      hindiHints: true,
      speechOn: false,
    };
    expect(useApp.getState().profile).toMatchObject(expected);
    await useApp.getState().load();
    expect(useApp.getState().profile).toMatchObject(expected);
    expect(useApp.getState().profile?.name).toBe('Anjali');
  });

  it('settings changes do nothing without a profile', async () => {
    await useApp.getState().updateProfile({ level: 'A2' });
    expect(useApp.getState().profile).toBeNull();
  });

  it('reset deletes everything on the device', async () => {
    await useApp.getState().startDemo();
    await useApp.getState().reset();
    expect(useApp.getState()).toMatchObject({ status: 'ready', profile: null, streak: null });
    expect(useApp.getState().itemStates.size).toBe(0);
    expect(await repositories.profile.get()).toBeUndefined();
    expect((await repositories.itemStates.all()).size).toBe(0);
  });
});
