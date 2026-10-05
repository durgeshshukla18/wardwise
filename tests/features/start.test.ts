import { beforeEach, describe, expect, it } from 'vitest';

import { useApp } from '../../src/app/store.ts';
import { repositories } from '../../src/data/runtime.ts';
import { extraRoundAvailable, startSession } from '../../src/features/session/start.ts';
import { useSession } from '../../src/features/session/store.ts';

beforeEach(async () => {
  await repositories.resetAll();
  useApp.setState({
    status: 'loading',
    profile: null,
    itemStates: new Map(),
    days: [],
    streak: null,
  });
  useSession.setState({ status: 'idle', sessionId: null, queue: [], index: 0, results: [] });
});

describe('startSession', () => {
  it('does nothing without a profile', async () => {
    expect(await startSession()).toBeNull();
    expect(useSession.getState().status).toBe('idle');
  });

  it('starts a Shift Break from the demo: saves a session, begins it, and uses only enabled exercises', async () => {
    await useApp.getState().startDemo();
    const id = await startSession();
    expect(id).not.toBeNull();
    const session = useSession.getState();
    expect(session).toMatchObject({
      status: 'running',
      sessionId: id,
      audio: false,
      mode: 'shift_break',
    });
    const planned = session.queue.filter((slot) => !slot.followUp);
    expect(planned).toHaveLength(10);
    for (const slot of session.queue)
      expect(['E1', 'E2', 'E3', 'E5', 'E6']).toContain(slot.exercise);
    const row = await repositories.sessions.get(id as string);
    expect(row).toMatchObject({ mode: 'shift_break', completed: false, endedAt: null });
    expect(row?.itemIds.length).toBe(new Set(planned.map((slot) => slot.itemId)).size);
    expect((await repositories.days.all()).some((d) => d.sessions >= 1)).toBe(true);
  });

  it('a brand new learner gets Learn cards and at least 5 exercises', async () => {
    await useApp.getState().startFresh('Anna');
    const profile = useApp.getState().profile;
    if (profile === null) throw new Error('setup');
    await repositories.profile.put({ ...profile, onboardedAt: 1 });
    await useApp.getState().load();
    const id = await startSession();
    expect(id).not.toBeNull();
    const queue = useSession.getState().queue;
    expect(queue.filter((slot) => slot.exercise === 'E1').length).toBeGreaterThanOrEqual(2);
    expect(queue.length).toBeGreaterThanOrEqual(5);
  });

  it('says whether an Extra round would have something to ask', async () => {
    await useApp.getState().startDemo();
    expect(await extraRoundAvailable(useApp.getState().itemStates)).toBe(true);
    expect(await extraRoundAvailable(new Map())).toBe(true);
  });
});
