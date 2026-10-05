import { describe, expect, it, vi } from 'vitest';

import { createDb } from '../../src/data/db.ts';
import { createRepositories } from '../../src/data/repositories.ts';
import { EVENT_NAMES, createEventLog } from '../../src/services/events.ts';
import { readRepoFile } from '../docs.ts';

describe('event log', () => {
  it('saves an event with a time, an id, a name and small props', async () => {
    const repos = createRepositories(createDb('test-events-1'));
    const log = createEventLog(
      repos,
      () => 1234,
      () => 'id-1',
    );
    await log.log('exercise_result', { exercise: 'E3', correct: true, errorType: null });
    expect(await repos.events.all()).toEqual([
      {
        id: 'id-1',
        ts: 1234,
        name: 'exercise_result',
        props: { exercise: 'E3', correct: true, errorType: null },
      },
    ]);
  });

  it('defaults to empty props', async () => {
    const repos = createRepositories(createDb('test-events-2'));
    await createEventLog(
      repos,
      () => 1,
      () => 'x',
    ).log('session_start');
    expect((await repos.events.all())[0]?.props).toEqual({});
  });

  it('never stops the learner when saving fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const broken = {
      events: { add: () => Promise.reject(new Error('disk full')), all: async () => [] },
    };
    await expect(createEventLog(broken).log('session_end')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('logs exactly the events listed in docs/04-TRD.md section 9', () => {
    const trd = readRepoFile('docs/04-TRD.md');
    const line = trd.split('\n').find((text) => text.startsWith('`session_start`')) ?? '';
    const listed = [...line.matchAll(/`(\w+)`/g)].map((match) => match[1]);
    expect(listed).toEqual([...EVENT_NAMES]);
  });
});
