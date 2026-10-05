import { beforeEach, describe, expect, it } from 'vitest';

import { copy } from '../../src/app/copy.ts';
import { createDb } from '../../src/data/db.ts';
import { buildDemoSeed } from '../../src/data/demo-seed.ts';
import { createRepositories, type Repositories } from '../../src/data/repositories.ts';
import type { ProfileRow } from '../../src/data/schema.ts';
import { createNewItemState } from '../../src/domain/scheduler.ts';
import { ITEMS, NOW, TODAY } from '../fixtures-shared.ts';

const profile: ProfileRow = {
  id: 'me',
  name: 'Test',
  level: 'A1',
  sessionLength: 10,
  hindiHints: false,
  speechOn: true,
  audioSpeed: 1,
  onboardedAt: null,
  onboarding: null,
};

let repos: Repositories;
let counter = 0;

beforeEach(() => {
  counter += 1;
  repos = createRepositories(createDb(`test-repositories-${counter}`));
});

const seed = () =>
  buildDemoSeed({
    items: ITEMS,
    now: NOW,
    day: TODAY,
    seed: 1,
    onboarding: {
      goal: copy.onboarding.demoGoal,
      dailyTime: copy.onboarding.demoDailyTime,
      selfLevel: copy.onboarding.demoSelfLevel,
    },
  });

describe('repositories', () => {
  it('starts empty', async () => {
    expect(await repos.profile.get()).toBeUndefined();
    expect((await repos.itemStates.all()).size).toBe(0);
    expect(await repos.days.all()).toEqual([]);
    expect(await repos.streak.get()).toBeUndefined();
  });

  it('keeps one profile under the fixed key', async () => {
    await repos.profile.put(profile);
    await repos.profile.put({ ...profile, name: 'Changed', onboardedAt: 5 });
    expect(await repos.profile.get()).toMatchObject({ id: 'me', name: 'Changed', onboardedAt: 5 });
  });

  it('saves item states and returns them keyed by item id', async () => {
    const a = createNewItemState('t01-kopf', NOW);
    const b = {
      ...createNewItemState('t01-hand', NOW),
      box: 3 as const,
      state: 'learning' as const,
    };
    await repos.itemStates.put(a);
    await repos.itemStates.putMany([b]);
    const all = await repos.itemStates.all();
    expect([...all.keys()].sort()).toEqual(['t01-hand', 't01-kopf']);
    expect(all.get('t01-hand')?.box).toBe(3);
  });

  it('saves days by date and the streak under the fixed key', async () => {
    await repos.days.put({ date: '2026-10-05', exercisesDone: 5, sessions: 1 });
    await repos.days.put({ date: '2026-10-05', exercisesDone: 8, sessions: 1 });
    expect(await repos.days.get('2026-10-05')).toMatchObject({ exercisesDone: 8 });
    expect(await repos.days.all()).toHaveLength(1);
    const streak = {
      id: 'me' as const,
      current: 2,
      best: 4,
      freezes: 1,
      lastCountedDate: null,
      freezeDays: [],
    };
    await repos.streak.put(streak);
    expect(await repos.streak.get()).toEqual(streak);
  });

  it('saves events', async () => {
    await repos.events.add({
      id: 'e1',
      ts: NOW,
      name: 'session_start',
      props: { mode: 'shift_break' },
    });
    expect(await repos.events.all()).toHaveLength(1);
  });

  it('loads a seed in one go', async () => {
    const data = seed();
    await repos.loadSeed(data);
    expect(await repos.profile.get()).toEqual(data.profile);
    expect((await repos.itemStates.all()).size).toBe(40);
    expect(await repos.days.all()).toHaveLength(data.days.length);
    expect(await repos.streak.get()).toEqual(data.streak);
  });

  it('replaces whatever was there when it loads a seed', async () => {
    await repos.profile.put({ ...profile, name: 'Someone else' });
    await repos.itemStates.put(createNewItemState('leftover', NOW));
    await repos.events.add({ id: 'old', ts: NOW, name: 'session_end', props: {} });
    await repos.loadSeed(seed());
    expect((await repos.profile.get())?.name).toBe(seed().profile.name);
    expect((await repos.itemStates.all()).has('leftover')).toBe(false);
    expect(await repos.events.all()).toEqual([]);
  });

  it('resets everything on this device', async () => {
    await repos.loadSeed(seed());
    await repos.events.add({ id: 'e1', ts: NOW, name: 'session_start', props: {} });
    await repos.resetAll();
    expect(await repos.profile.get()).toBeUndefined();
    expect((await repos.itemStates.all()).size).toBe(0);
    expect(await repos.days.all()).toEqual([]);
    expect(await repos.streak.get()).toBeUndefined();
    expect(await repos.events.all()).toEqual([]);
  });

  it('exports every table with the schema version, as plain JSON', async () => {
    const data = seed();
    await repos.loadSeed(data);
    await repos.events.add({ id: 'e1', ts: NOW, name: 'session_start', props: {} });
    const file = await repos.exportAll(NOW);
    expect(file).toMatchObject({ format: 'wardwise-export', schemaVersion: 1, exportedAt: NOW });
    expect(Object.keys(file.tables).sort()).toEqual([
      'aiCache',
      'aiUsage',
      'attempts',
      'days',
      'events',
      'feedback',
      'itemState',
      'profile',
      'sessions',
      'streak',
    ]);
    expect(file.tables.itemState).toHaveLength(40);
    expect(file.tables.profile).toEqual([data.profile]);
    expect(file.tables.events).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(file))).toEqual(file);
  });

  it('exports an empty device as empty tables', async () => {
    const file = await repos.exportAll(1);
    for (const rows of Object.values(file.tables)) expect(rows).toEqual([]);
  });
});
