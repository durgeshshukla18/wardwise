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
});
